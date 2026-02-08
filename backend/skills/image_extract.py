"""
图像解析（Image Extract）：从平面图 PNG 提取墙线、尺寸等

管线思路：先区分「墙体」与「非墙体」，再对墙体做数据归纳。
- 墙体：图中「灰色且粗」的线（结构墙、外墙、隔墙、柱子等），柱子视为墙体一部分。
- 非墙体：纯黑细线（尺寸标注、延伸线）、虚线、门弧线、窗/家具符号等。

实现：优先用「灰色区间」二值化（只保留灰像素，排除纯黑/纯白）→ Canny + HoughLinesP → 线宽过滤保留粗线；
  若灰色通道检出过少则回退到 Otsu。短粗段（如柱子）保留。
"""

from pathlib import Path
from typing import Any, Callable

import numpy as np
import cv2


def _log(stage: str, **kwargs: Any) -> None:
    parts = [f"[ImageExtract] {stage}"]
    for k, v in kwargs.items():
        if isinstance(v, (list, dict)):
            parts.append(f"{k}=len({len(v)})")
        elif isinstance(v, str):
            parts.append(f"{k}=({len(v)} chars)" if len(v) > 60 else f"{k}={v!r}")
        else:
            parts.append(f"{k}={v!r}")
    print(" ".join(parts))


def _load_image(path: Path) -> tuple[np.ndarray, int, int]:
    """OpenCV 读图，返回 (BGR 数组, width, height)。"""
    img = cv2.imread(str(path))
    if img is None:
        from PIL import Image
        pil_img = Image.open(path).convert("RGB")
        img = np.array(pil_img)[:, :, ::-1].copy()  # RGB -> BGR
    h, w = img.shape[:2]
    return img, w, h


def _stroke_width_half(binary: np.ndarray, px: int, py: int, perp_x: float, perp_y: float, max_radius: int = 15) -> float:
    """沿法线方向测量线宽一半（到最近背景像素的距离）。binary 上 255=线，0=背景。"""
    h, w = binary.shape[:2]
    half = 0.0
    for sign in (1, -1):
        step = 0
        for k in range(1, max_radius + 1):
            nx = int(px + sign * perp_x * k)
            ny = int(py + sign * perp_y * k)
            if 0 <= nx < w and 0 <= ny < h and binary[ny, nx] > 127:
                step = k
            else:
                break
        half += step
    return half * 0.5


def _filter_by_stroke_width(
    segments: list[dict],
    binary: np.ndarray,
    w: int,
    h: int,
    min_stroke_px: float = 2.0,
    num_samples: int = 5,
) -> list[dict]:
    """
    只保留「粗线」线段，过滤掉尺寸线、细虚线等非墙体。
    沿线段采样，测量法向线宽，中位数线宽 >= min_stroke_px 的视为墙。
    """
    out: list[dict] = []
    for s in segments:
        x1 = s["x1"] * w
        y1 = s["y1"] * h
        x2 = s["x2"] * w
        y2 = s["y2"] * h
        dx = x2 - x1
        dy = y2 - y1
        length = np.hypot(dx, dy)
        if length < 1e-6:
            continue
        ux = dx / length
        uy = dy / length
        perp_x = -uy
        perp_y = ux
        half_widths: list[float] = []
        for i in range(num_samples):
            t = (i + 1) / (num_samples + 1)
            px = int(x1 + t * dx)
            py = int(y1 + t * dy)
            if 0 <= px < w and 0 <= py < h:
                hw = _stroke_width_half(binary, px, py, perp_x, perp_y)
                half_widths.append(hw)
        if not half_widths:
            continue
        median_hw = float(np.median(half_widths))
        if median_hw >= min_stroke_px:
            out.append(s)
    return out


# 平面图约定：灰色且粗=墙体（含柱子）；纯黑细线=尺寸/标注，不当作墙
GREY_WALL_LO = 45
GREY_WALL_HI = 210


def _binary_grey_walls(gray: np.ndarray) -> np.ndarray:
    """只保留灰色像素（墙体），纯黑（尺寸/文字）和纯白（背景）置 0。"""
    return np.where((gray >= GREY_WALL_LO) & (gray <= GREY_WALL_HI), 255, 0).astype(np.uint8)


def _binary_otsu_inverted(gray: np.ndarray) -> np.ndarray:
    """Otsu 二值化，白底黑线图则反相使线=白。"""
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(binary) > 127:
        binary = 255 - binary
    return binary


def _detect_walls_opencv(image: np.ndarray, w: int, h: int) -> list[dict]:
    """
    1) 优先用「灰色区间」二值化：只保留灰像素（墙），排除纯黑（尺寸线）和纯白（背景）
    2) Canny + HoughLinesP 得线段
    3) 线宽过滤保留粗线；短粗段（柱子）也保留
    若灰色通道检出过少则回退 Otsu。
    返回归一化 [0..1] 墙线列表。
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary_grey = _binary_grey_walls(gray)
    binary_otsu = _binary_otsu_inverted(gray)
    # 优先在灰色图上检测，避免尺寸线（纯黑）被当成墙
    for name, binary in [("grey", binary_grey), ("otsu", binary_otsu)]:
        blur = cv2.GaussianBlur(binary, (3, 3), 0.5)
        edges = cv2.Canny(blur, 50, 150)
        min_len = max(15, min(w, h) * 0.015)
        max_gap = max(8, min(w, h) * 0.008)
        lines = cv2.HoughLinesP(
            edges,
            rho=1,
            theta=np.pi / 180,
            threshold=max(25, int(min(w, h) * 0.018)),
            minLineLength=min_len,
            maxLineGap=max_gap,
        )
        segments: list[dict] = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                length = np.hypot(x2 - x1, y2 - y1)
                if length < min_len:
                    continue
                segments.append({
                    "x1": x1 / w,
                    "y1": y1 / h,
                    "x2": x2 / w,
                    "y2": y2 / h,
                    "length_px": length,
                })
        min_stroke = max(1.0, min(w, h) / 400.0)
        segments = _filter_by_stroke_width(segments, binary, w, h, min_stroke_px=min_stroke)
        if len(segments) >= 8 or name == "otsu":
            if name == "grey" and segments:
                print(f"[ImageExtract] 使用灰色通道 (grey {GREY_WALL_LO}-{GREY_WALL_HI}) 检出墙线")
            break
    return segments


def _ocr_texts_from_image(_image: np.ndarray) -> list[dict]:
    """文字/尺寸可由后续 OCR 或 LLM 补充，此处返回空。"""
    return []


def _extract_dimensions_mm(texts: list[dict]) -> list[tuple[float, float, float, float]]:
    """从 OCR 文本解析尺寸 (mm)。"""
    import re
    dims = []
    for t in texts:
        txt = t.get("text", "")
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:mm|m|CM)?\s*$", txt, re.I) or re.search(r"^(\d+(?:\.\d+)?)\s*(?:mm|m)?", txt, re.I)
        if m:
            val = float(m.group(1))
            if "m" in txt.lower() and "mm" not in txt.lower():
                val *= 1000
            w = (t.get("x2", 0) - t.get("x1", 0)) * 100
            dims.append((val, t.get("center_nx", 0.5), t.get("center_ny", 0.5), w))
    return dims


def _parse_glm_raw(glm_raw: str | None, img_w: int, img_h: int) -> tuple[list[dict], list[tuple], dict | None]:
    """
    解析 GLM 视觉返回的 JSON，仅用于补充 dimensions_mm、bounds 等；
    墙线以 OpenCV 输出为准，此处解析的 walls 可与本地结果合并（可选）。
    """
    if not glm_raw or not glm_raw.strip():
        return [], [], None
    import json
    import re
    text = glm_raw.strip()
    if "```" in text:
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if m:
            text = m.group(1)
    start, end = text.find("{"), text.rfind("}") + 1
    if start < 0 or end <= start:
        return [], [], None
    try:
        data = json.loads(text[start:end])
    except json.JSONDecodeError:
        return [], [], None

    walls_out: list[dict] = []
    dims_out: list[tuple] = []
    bounds_out: dict | None = None

    raw_walls = data.get("walls") or data.get("wall_lines") or data.get("wall") or []
    if not isinstance(raw_walls, list):
        raw_walls = []
    for raw in raw_walls:
        if isinstance(raw, (list, tuple)) and len(raw) >= 4:
            x1, y1, x2, y2 = float(raw[0]), float(raw[1]), float(raw[2]), float(raw[3])
        elif isinstance(raw, dict):
            x1 = raw.get("x1", raw.get("x1_px"))
            y1 = raw.get("y1", raw.get("y1_px"))
            x2 = raw.get("x2", raw.get("x2_px"))
            y2 = raw.get("y2", raw.get("y2_px"))
            if x1 is None or y1 is None or x2 is None or y2 is None:
                continue
            x1, y1, x2, y2 = float(x1), float(y1), float(x2), float(y2)
        else:
            continue
        if x1 > 1 or x2 > 1 or y1 > 1 or y2 > 1:
            x1, x2 = x1 / img_w, x2 / img_w
            y1, y2 = y1 / img_h, y2 / img_h
        x1, x2 = max(0, min(1, x1)), max(0, min(1, x2))
        y1, y2 = max(0, min(1, y1)), max(0, min(1, y2))
        length = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
        if length < 0.01:
            continue
        walls_out.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "length_px": length * min(img_w, img_h)})

    for d in data.get("dimensions_mm", []) if isinstance(data.get("dimensions_mm"), list) else []:
        if isinstance(d, (int, float)):
            dims_out.append((float(d), 0.5, 0.5, 10.0))
        elif isinstance(d, dict) and "value_mm" in d:
            dims_out.append((float(d["value_mm"]), float(d.get("nx", 0.5)), float(d.get("ny", 0.5)), 10.0))

    b = data.get("bounds")
    if isinstance(b, dict) and "w" in b and "h" in b:
        bounds_out = {"w": float(b["w"]), "h": float(b["h"])}

    return walls_out, dims_out, bounds_out


def extract_from_image(
    image_path: str | Path,
    *,
    call_glm_vision: Callable | None = None,
) -> dict[str, Any]:
    """
    从 PNG 平面图提取墙线与元数据。以 OpenCV（Canny + HoughLinesP）为主输出墙线；
    LLM 视觉可选，仅用于补充尺寸、bounds、房间名等，不依赖其几何。
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    image, w, h = _load_image(path)
    _log("input", image_size=(w, h), call_glm=call_glm_vision is not None)

    walls_px = _detect_walls_opencv(image, w, h)
    ocr_texts = _ocr_texts_from_image(image)
    dimensions_mm = _extract_dimensions_mm(ocr_texts)
    _log("after_opencv", walls_px=walls_px, ocr_texts=ocr_texts, dimensions_mm=dimensions_mm)

    glm_raw = None
    if call_glm_vision:
        try:
            import base64
            b64 = base64.b64encode(path.read_bytes()).decode()
            glm_raw = call_glm_vision(b64, walls_px, ocr_texts, dimensions_mm)
        except Exception as e:
            _log("glm_vision_error", error=str(e))
    if glm_raw:
        print(f"[ImageExtract] glm_raw 前300字符: {glm_raw[:300]!r}")
    else:
        _log("glm_response", glm_raw=None)

    glm_bounds = None
    if glm_raw:
        glm_walls, glm_dims, glm_bounds = _parse_glm_raw(glm_raw, w, h)
        _log("glm_parsed", glm_walls=glm_walls, glm_dims=glm_dims, glm_bounds=glm_bounds)
        if glm_walls and len(walls_px) < 5:
            walls_px = walls_px + glm_walls
        if glm_dims:
            dimensions_mm = dimensions_mm + glm_dims
        if glm_bounds and not dimensions_mm:
            dimensions_mm = [(glm_bounds["w"] * 1000, 0.5, 0.5, 10.0)]

    _log("output", walls_px=walls_px, dimensions_mm=dimensions_mm, glm_bounds=glm_bounds)
    return {
        "walls_px": walls_px,
        "ocr_texts": ocr_texts,
        "dimensions_mm": dimensions_mm,
        "glm_raw": glm_raw,
        "image_size": (w, h),
        "glm_bounds": glm_bounds,
    }
