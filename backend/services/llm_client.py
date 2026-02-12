"""GLM-4.7 视觉 API 调用（OpenAI 兼容）。"""

import json
import os
from typing import Any

# 使用 httpx 或 requests - FastAPI 已有 httpx 依赖
try:
    import httpx
except ImportError:
    httpx = None


def call_glm_vision(
    base64_image: str,
    walls_px: list[dict],
    ocr_texts: list[dict],
    dimensions_mm: list,
) -> str | None:
    """
    调用 GLM-4.7 视觉 API，融合 OpenCV/OCR 结果，输出结构化 JSON。

    Args:
        base64_image: PNG base64
        walls_px: OpenCV 检测的墙线
        ocr_texts: 文本列表（可为空，由 GLM 从图识别）
        dimensions_mm: 解析出的尺寸

    Returns:
        GLM 返回的 JSON 字符串，或 None
    """
    api_key = os.getenv("GLM_API_KEY") or os.getenv("OPENAPI_API_KEY")
    base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    if not api_key:
        print("[LLM-Vision] 未设置 GLM_API_KEY/OPENAPI_API_KEY，跳过视觉调用")
        return None

    has_local = len(walls_px) > 0 or len(ocr_texts) > 0 or len(dimensions_mm) > 0
    summary = {
        "walls_count": len(walls_px),
        "ocr_texts_sample": [t.get("text", "") for t in ocr_texts[:15]],
        "dimensions_mm": [d[0] for d in dimensions_mm[:5]],
    }

    if has_local:
        prompt = f"""你是一个建筑平面图分析专家。已有提取结果：墙线数 {summary['walls_count']}，OCR: {json.dumps(summary['ocr_texts_sample'], ensure_ascii=False)}，尺寸(mm): {summary['dimensions_mm']}。请结合图片补充或修正，输出 JSON，包含: walls（数组，每条 {{"x1","y1","x2","y2"}} 归一化 0~1）, openings, rooms, furniture（可选）, bounds（可选 {{"w","h"}} 米）。只输出 JSON。"""
    else:
        prompt = """你是一个建筑平面图分析专家。请**直接根据这张平面图图片**识别并输出 JSON，不要省略 walls。

必须包含：
1. "walls": 数组，每条墙为 {"x1", "y1", "x2", "y2"}，坐标为归一化比例 0~1（相对图片宽高，左上为 0,0，x 向右、y 向下）。至少输出外墙轮廓的主要墙段。
2. "bounds": {"w": 数字, "h": 数字}，平面图对应的真实尺寸（米），可根据图中尺寸标注或常见比例估算。
3. 可选: "rooms", "openings", "furniture"。

示例格式：
{"walls": [{"x1":0.1,"y1":0.1,"x2":0.9,"y2":0.1}], "bounds": {"w": 12, "h": 10}}

只输出一行 JSON，不要 markdown 包裹，不要其他文字。"""

    # 智谱 v4：视觉模型用 glm-4.5v（文档）；图片 content 首位；url 用纯 base64（与官方 Base64 示例一致）
    b64 = base64_image.strip().replace("\n", "").replace("\r", "")
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[-1]
    use_data_uri = os.getenv("GLM_IMAGE_DATA_URI", "0") == "1"
    image_url = f"data:image/png;base64,{b64}" if use_data_uri else b64
    model = os.getenv("GLM_VISION_MODEL", "glm-4.5v")
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        "max_tokens": 4096,
    }
    url = f"{base_url.rstrip('/')}/chat/completions"
    if httpx:
        with httpx.Client(timeout=90.0) as client:
            r = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
    else:
        import urllib.request
        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read().decode())

    if httpx:
        if not r.is_success:
            err_body = r.text[:500]
            print(f"[LLM-Vision] 请求失败 status={r.status_code} body={err_body}")
            if r.status_code == 400 and "1210" in err_body:
                print("[LLM-Vision] 1210 可试: GLM_VISION_MODEL=glm-4.5v 或 glm-4v-plus；或 GLM_IMAGE_DATA_URI=1 改用 data: 前缀")
            return None
        data = r.json()

    msg = data.get("choices", [{}])[0].get("message", {})
    content = msg.get("content")
    if isinstance(content, list):
        text_parts = [p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"]
        content = text_parts[0] if text_parts else None
    if content is None:
        print("[LLM-Vision] 响应无 content", data.get("error") or list(data.keys())[:5])
    elif isinstance(content, str):
        print(f"[LLM-Vision] 响应长度={len(content)} 前200字={content[:200]!r}")
    return content if isinstance(content, str) else None


# 墙体识别配置的 schema 键（与 wall_detection_config.WALL_DETECTION_CONFIG 一致）
WALL_CONFIG_KEYS = [
    "grey_wall_lo", "grey_wall_hi", "grey_channel_diff_max",
    "red_min", "red_over_g", "red_over_b",
    "wall_max_thin_ratio", "wall_min_thickness_px",
    "min_wall_area_abs", "min_wall_area_ratio",
    "grey_white_ratio_use_fallback", "low_sat_channel_diff", "grey_white_ratio_use_otsu",
    "morph_open_size", "morph_close_size_min", "morph_close_size_max", "kernel_size_divisor",
    "fallback_min_area_abs", "fallback_min_area_ratio", "fallback_max_thin_ratio", "fallback_min_thickness_px",
    "grey_ratio_secondary",
]


def _default_wall_config_json() -> str:
    """与 wall_detection_config.WALL_DETECTION_CONFIG 内容一致的默认 JSON，用于提示词模板。"""
    from backend.skills.wall_detection_config import WALL_DETECTION_CONFIG
    return json.dumps(WALL_DETECTION_CONFIG, ensure_ascii=False)


def call_glm_vision_wall_config(base64_image: str) -> dict | None:
    """
    用视觉模型分析平面图，输出墙体识别参数（与 wall_detection_config 格式一致）。
    仅返回可用的配置 dict；解析失败或未配置 API 时返回 None。
    """
    api_key = os.getenv("GLM_API_KEY") or os.getenv("OPENAPI_API_KEY")
    base_url = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    if not api_key:
        print("[LLM-WallConfig] 未设置 GLM_API_KEY/OPENAPI_API_KEY，跳过")
        return None

    default_json = _default_wall_config_json()
    prompt = f"""你正在为「建筑平面图墙体线自动识别」算法调参。流程：灰/黑二值化 → 排除红色（楼梯、红框）→ 形态学 → 轮廓 → 按面积与线厚筛出墙体。

请观察本图后，输出**完整**的墙体识别配置 JSON：必须包含下面默认配置中的**全部键**，且键名、键数量完全一致；仅根据本图需要调整的项修改数值，其余保持默认值。不得只输出部分键。

默认配置（你需要在输出中保留全部键，只改需要调整的值）：
{default_json}

调参建议：墙线偏细→提高 wall_max_thin_ratio 或降低 wall_min_thickness_px；图中有明显红标注/楼梯→提高 red_min；墙线断点多→略增 morph_close_size_min/max。

只输出一行完整 JSON 对象，不要 markdown、不要 ```、不要任何前后文字。"""

    b64 = base64_image.strip().replace("\n", "").replace("\r", "")
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[-1]
    use_data_uri = os.getenv("GLM_IMAGE_DATA_URI", "0") == "1"
    image_url = f"data:image/png;base64,{b64}" if use_data_uri else b64
    model = os.getenv("GLM_VISION_MODEL", "glm-4.5v")
    body = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_url}},
                    {"type": "text", "text": prompt},
                ],
            }
        ],
        "max_tokens": 2048,
    }
    url = f"{base_url.rstrip('/')}/chat/completions"
    if httpx:
        try:
            with httpx.Client(timeout=60.0) as client:
                r = client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=body,
                )
        except Exception as e:
            print(f"[LLM-WallConfig] 请求异常: {e}")
            return None
        if not r.is_success:
            print(f"[LLM-WallConfig] 请求失败 status={r.status_code} body={r.text[:300]}")
            return None
        data = r.json()
    else:
        try:
            import urllib.request
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode(),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode())
        except Exception as e:
            print(f"[LLM-WallConfig] 请求异常: {e}")
            return None

    msg = data.get("choices", [{}])[0].get("message", {})
    content = msg.get("content")
    if isinstance(content, list):
        text_parts = [p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"]
        content = text_parts[0] if text_parts else None
    if not content or not isinstance(content, str):
        return None
    text = content.strip()
    print(f"[LLM-WallConfig] 原始输出（长度={len(text)}）:\n{text[:1500]}{'...' if len(text) > 1500 else ''}")

    # 允许被 ```json ... ``` 包裹
    if "```" in text:
        for part in text.split("```"):
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                text = part
                break
    try:
        parsed = json.loads(text)
        if not isinstance(parsed, dict):
            return None
        from backend.skills.wall_detection_config import WALL_DETECTION_CONFIG
        # 合法键且为数字的用 LLM 值，缺键用默认，保证输出与 wall_detection_config 结构一致
        out = {}
        for k in WALL_CONFIG_KEYS:
            if k in parsed and isinstance(parsed[k], (int, float)):
                out[k] = float(parsed[k]) if isinstance(parsed[k], float) else int(parsed[k])
            else:
                out[k] = WALL_DETECTION_CONFIG[k]
        if out:
            print(f"[LLM-WallConfig] 解析到完整配置（共 {len(out)} 项）: {json.dumps(out, ensure_ascii=False, indent=2)}")
            return out
    except json.JSONDecodeError:
        print(f"[LLM-WallConfig] JSON 解析失败 前200字={text[:200]!r}")
    return None
