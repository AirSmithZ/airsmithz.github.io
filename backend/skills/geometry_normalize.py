"""
几何归一化（Geometry Normalize）：合并共线墙、去碎线、估算尺度

纯几何逻辑，不依赖 LLM。输出 walls_normalized 与 bounds_m（米）。
"""

import math
from typing import Any


def _merge_collinear(
    segments: list[dict],
    angle_tol: float = 5.0,
    dist_tol: float = 0.02,
) -> list[dict]:
    """
    合并共线线段。以线段方向为基准取两端极值点，避免斜线被错成外接矩形。
    """
    if len(segments) < 2:
        return segments
    merged = []
    used = [False] * len(segments)

    def angle(s: dict) -> float:
        dx = s["x2"] - s["x1"]
        dy = s["y2"] - s["y1"]
        return math.atan2(dy, dx)

    def dist_to_line(px: float, py: float, s: dict) -> float:
        x1, y1, x2, y2 = s["x1"], s["y1"], s["x2"], s["y2"]
        num = abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1)
        den = math.hypot(y2 - y1, x2 - x1) or 1e-8
        return num / den

    for i, si in enumerate(segments):
        if used[i]:
            continue
        a_i = angle(si)
        group = [si]
        used[i] = True
        for j, sj in enumerate(segments):
            if used[j]:
                continue
            a_j = angle(sj)
            da = abs(a_i - a_j) * 180 / math.pi
            if da > 180:
                da = 360 - da
            if da < angle_tol:
                d1 = dist_to_line(sj["x1"], sj["y1"], si)
                d2 = dist_to_line(sj["x2"], sj["y2"], si)
                if d1 < dist_tol and d2 < dist_tol:
                    group.append(sj)
                    used[j] = True
        if group:
            points = [(s["x1"], s["y1"]) for s in group] + [(s["x2"], s["y2"]) for s in group]
            x1, y1 = si["x1"], si["y1"]
            x2, y2 = si["x2"], si["y2"]
            dx = x2 - x1
            dy = y2 - y1
            length = math.hypot(dx, dy) or 1e-8
            ux, uy = dx / length, dy / length
            # 沿方向投影，取最小/最大对应的端点
            best_lo, best_hi = (x1, y1), (x2, y2)
            t_lo = x1 * ux + y1 * uy
            t_hi = x2 * ux + y2 * uy
            if t_lo > t_hi:
                t_lo, t_hi = t_hi, t_lo
                best_lo, best_hi = best_hi, best_lo
            for (px, py) in points:
                t = px * ux + py * uy
                if t < t_lo:
                    t_lo, best_lo = t, (px, py)
                if t > t_hi:
                    t_hi, best_hi = t, (px, py)
            merged.append({
                "x1": best_lo[0],
                "y1": best_lo[1],
                "x2": best_hi[0],
                "y2": best_hi[1],
                "length_px": sum(s.get("length_px", 0) for s in group),
            })
    return merged


def _filter_short(segments: list[dict], min_length: float = 0.012) -> list[dict]:
    """去掉过短线段；0.012 保留短墙/柱子（墙体一部分）。"""
    return [s for s in segments if math.hypot(s["x2"] - s["x1"], s["y2"] - s["y1"]) >= min_length]


def normalize_geometry(completion_output: dict[str, Any]) -> dict[str, Any]:
    """
    几何归一化：合并共线墙、去碎线，输出 walls_normalized 与 bounds_m（米）。
    """
    walls = completion_output.get("walls_px", [])
    print(f"[GeometryNormalize] input walls_px=len({len(walls)}) image_size={completion_output.get('image_size')} glm_bounds={completion_output.get('glm_bounds')}")
    dims = completion_output.get("dimensions_mm", [])
    img_w, img_h = completion_output.get("image_size", (1000, 1000))
    glm_bounds = completion_output.get("glm_bounds")

    # bounds 必须为米（前端 planeGeometry 直接用 bounds.w / bounds.h），>100 视为 mm 转 m
    def to_meters(val: float) -> float:
        v = float(val)
        if v > 100:
            v = v / 1000.0
        return max(2.0, min(100.0, v))

    if isinstance(glm_bounds, dict) and "w" in glm_bounds and "h" in glm_bounds:
        bounds_w = to_meters(glm_bounds["w"])
        bounds_h = to_meters(glm_bounds["h"])
        scale_px_per_m = min(img_w / bounds_w, img_h / bounds_h) if bounds_w and bounds_h else 100.0
    else:
        scale_px_per_m = 100.0
        if dims:
            max_mm = max(d[0] for d in dims)
            avg_len_px = sum(d[3] for d in dims) / len(dims) * img_w
            if avg_len_px > 0:
                scale_px_per_m = avg_len_px / (max_mm / 1000.0)
        bounds_w = img_w / scale_px_per_m
        bounds_h = img_h / scale_px_per_m
        if dims:
            total_mm = max(d[0] for d in dims) * 1.5
            bounds_w = max(bounds_w, total_mm / 1000.0)
            bounds_h = max(bounds_h, total_mm / 1000.0)
        bounds_w = to_meters(bounds_w)
        bounds_h = to_meters(bounds_h)
        bounds_w = max(bounds_w, 6.0)
        bounds_h = max(bounds_h, 6.0)

    merged = _merge_collinear(walls)
    filtered = _filter_short(merged)
    print(f"[GeometryNormalize] output walls_normalized=len({len(filtered)}) bounds_m={bounds_w!r},{bounds_h!r}")

    completion_output["walls_normalized"] = filtered
    completion_output["bounds_m"] = {"w": bounds_w, "h": bounds_h}
    completion_output["scale_px_per_m"] = scale_px_per_m
    return completion_output
