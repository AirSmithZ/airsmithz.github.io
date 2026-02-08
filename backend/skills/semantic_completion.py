"""
语义补全（Semantic Completion）：房间名、墙高/墙厚默认值、假设说明

根据图像解析阶段的墙线/OCR/尺寸，用 LLM 补全房间列表与默认参数，输出 assumptions。
"""

import json
import os
from typing import Any

from langchain_openai import ChatOpenAI


def _get_glm_client() -> ChatOpenAI:
    api_key = os.getenv("GLM_API_KEY") or os.getenv("OPENAPI_API_KEY")
    base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    if not api_key:
        raise ValueError("Set GLM_API_KEY or OPENAPI_API_KEY in environment")
    return ChatOpenAI(
        model="glm-4",
        openai_api_key=api_key,
        openai_api_base=base_url,
        temperature=0.1,
    )


def run_semantic_completion(extract_output: dict[str, Any]) -> dict[str, Any]:
    """
    语义补全：房间名、墙高/厚默认值、assumptions。

    Returns:
        extract_output 基础上增加:
        - rooms: list[{ name, usage, bbox? }]
        - default_wall_height: float
        - default_wall_thickness: float
        - assumptions: list[str]
    """
    walls_count = len(extract_output.get("walls_px", []))
    print(f"[SemanticCompletion] input walls_px=len({walls_count}) ocr_texts=len({len(extract_output.get('ocr_texts', []))}) dimensions_mm=len({len(extract_output.get('dimensions_mm', []))})")
    llm = _get_glm_client()
    ocr_texts = extract_output.get("ocr_texts", [])
    dims = extract_output.get("dimensions_mm", [])
    rooms_text = []
    for t in ocr_texts:
        txt = t.get("text", "")
        if any(kw in txt.upper() for kw in ["ROOM", "AREA", "ZONE", "LIFT", "室", "区", "厅"]):
            rooms_text.append(f"{txt} @ ({t.get('center_nx', 0):.2f},{t.get('center_ny', 0):.2f})")

    has_ocr = len(rooms_text) > 0 or len(dims) > 0
    if has_ocr:
        prompt = f"""你是一个建筑平面图分析助手。根据以下 OCR 提取的文本和区域，补全房间/区域信息。

OCR 文本（含位置）: {json.dumps(rooms_text[:30], ensure_ascii=False)}
尺寸标注（mm）: {dims[:5]}

请输出 JSON：{{ "rooms": [{{ "name": "房间名", "usage": "用途" }}], "default_wall_height": 3.0, "default_wall_thickness": 0.02, "assumptions": ["假设1"] }}
只输出 JSON。"""
    else:
        prompt = """你是一个建筑平面图分析助手。当前没有本地 OCR 文本和尺寸标注，请根据常见建筑平面图给出默认值。

请输出 JSON（不要省略任何字段）：
{
  "rooms": [{"name": "主区域", "usage": "通用"}],
  "default_wall_height": 3.0,
  "default_wall_thickness": 0.02,
  "assumptions": ["无本地OCR，采用默认墙高3m、墙厚0.02归一化"]
}

只输出 JSON，不要其他内容。"""

    try:
        resp = llm.invoke(prompt)
        text = resp.content if hasattr(resp, "content") else str(resp)
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])
            extract_output["rooms"] = data.get("rooms", [])
            extract_output["default_wall_height"] = float(data.get("default_wall_height", 3.0))
            extract_output["default_wall_thickness"] = float(data.get("default_wall_thickness", 0.02))
            extract_output["assumptions"] = data.get("assumptions", [])
            print(f"[SemanticCompletion] output rooms=len({len(extract_output['rooms'])}) default_wall_height={extract_output['default_wall_height']} assumptions={extract_output['assumptions']}")
        else:
            extract_output.setdefault("assumptions", []).append("SemanticCompletion: 无法解析 LLM 输出")
            print(f"[SemanticCompletion] 无法解析 LLM 输出 text_len={len(text)}")
    except Exception as e:
        extract_output.setdefault("assumptions", []).append(f"SemanticCompletion: {str(e)}")
        extract_output["rooms"] = []
        extract_output["default_wall_height"] = 3.0
        extract_output["default_wall_thickness"] = 0.02
        print(f"[SemanticCompletion] exception {e!r}")

    return extract_output
