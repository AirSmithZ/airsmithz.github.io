"""
CAD 图纸结构墙识别（PNG 格式）

逻辑：灰度化后以最深的颜色作为墙体颜色 → 所有与墙体颜色相同的连通域均为墙体。
"""

import cv2
import numpy as np
from pathlib import Path
from typing import Any, Sequence

from backend.skills.wall_pattern_config import WALL_PATTERN_CONFIG

_cfg = WALL_PATTERN_CONFIG


def _get_wall_color(gray: np.ndarray) -> int:
    """灰度化后最深的颜色作为墙体颜色。在深色区找直方图峰值。"""
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    max_val = _cfg["wall_color_max"]
    peak_idx = int(np.argmax(hist[: max_val + 1].flatten()))
    return peak_idx


def _build_wall_mask(
    gray: np.ndarray,
    img_bgr: np.ndarray,
    wall_colors: set[int] | None = None,
) -> np.ndarray:
    """以墙体颜色生成二值掩码。wall_colors 为 None 时用直方图峰值。"""
    if wall_colors:
        lo, hi = min(wall_colors), max(wall_colors)
        pad = _cfg.get("wall_color_backtrack_tolerance", 3)
        if pad > 0:
            lo = max(0, lo - pad)
            hi = min(255, hi + pad)
    else:
        peak = _get_wall_color(gray)
        tol = _cfg["wall_color_tolerance"]
        lo = max(0, peak - tol)
        hi = min(255, peak + tol)

    mask = ((gray >= lo) & (gray <= hi)).astype(np.uint8) * 255
    b, g, r = img_bgr[:, :, 0], img_bgr[:, :, 1], img_bgr[:, :, 2]
    is_red = (r >= _cfg["red_min"]) & (r > g + _cfg["red_over_g"]) & (r > b + _cfg["red_over_b"])
    mask[is_red] = 0
    return mask


def _collect_wall_colors(gray: np.ndarray, contours: list, valid_indices: list[int]) -> set[int]:
    """从已识别墙体轮廓内收集灰度值，供回溯筛选。"""
    all_vals: list[int] = []
    h, w = gray.shape[:2]
    max_val = _cfg["wall_color_max"]
    for i in valid_indices:
        cnt = contours[i]
        m = np.zeros((h, w), dtype=np.uint8)
        cv2.drawContours(m, [cnt], -1, 255, -1)
        vals = gray[m > 0]
        for v in vals.flatten().tolist():
            vi = int(v)
            if vi <= max_val:
                all_vals.append(vi)

    if not all_vals:
        return set()
    arr = np.array(all_vals)
    p5, p95 = np.percentile(arr, [5, 95])
    return set(int(v) for v in arr if p5 <= v <= p95)


def _exclude_interference(mask: np.ndarray) -> np.ndarray:
    """去除水印、标注、尺寸：小连通域、极细线。"""
    out = mask.copy()
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(out, connectivity=8)
    min_area = _cfg["noise_min_component_area"]
    thin_max_area = _cfg["noise_thin_line_max_area"]
    thin_min_ratio = _cfg["noise_thin_line_min_ratio"]

    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area < min_area:
            out[labels == i] = 0
            continue
        if area < thin_max_area:
            m = (labels == i).astype(np.uint8)
            cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                per = cv2.arcLength(cnts[0], True)
                if per > 1e-6 and (per * per) / area > thin_min_ratio:
                    out[labels == i] = 0
    return out


def _is_wall_region(contour: np.ndarray, total_px: int) -> bool:
    """面积、细长比基本约束。"""
    area = cv2.contourArea(contour)
    if area < 1e-6:
        return False
    min_area = max(_cfg["min_contour_area"], int(total_px * _cfg["min_contour_area_ratio"]))
    if area < min_area:
        return False
    per = cv2.arcLength(contour, True)
    if per < 1e-6:
        return False
    if (per * per) / area > _cfg["max_thin_ratio"]:
        return False
    return True


def _contour_to_normalized_polygon(contour: np.ndarray, w: int, h: int) -> list[list[float]]:
    """轮廓转为归一化 [0..1] 多边形。"""
    if contour is None or len(contour) < 2:
        return []
    pts = contour.reshape(-1, 2)
    return [[float(x) / w, float(y) / h] for x, y in pts]


def _run_detection(
    gray: np.ndarray,
    img: np.ndarray,
    total_px: int,
    w: int,
    h: int,
    wall_colors: set[int] | None,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None,
) -> tuple[list[list[list[float]]], list, list[int]]:
    """单轮检测：返回 (walls, contours, valid_indices)。"""
    wall_mask = _build_wall_mask(gray, img, wall_colors)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    wall_mask = cv2.morphologyEx(wall_mask, cv2.MORPH_CLOSE, k)
    wall_mask = _exclude_interference(wall_mask)

    if annotation_boxes_px:
        expand = max(3, min(w, h) // 200)
        for (x1, y1, x2, y2) in annotation_boxes_px:
            x1, y1 = max(0, x1 - expand), max(0, y1 - expand)
            x2, y2 = min(w, x2 + expand), min(h, y2 + expand)
            wall_mask[y1:y2, x1:x2] = 0

    contours, _ = cv2.findContours(wall_mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    walls: list[list[list[float]]] = []
    valid_indices: list[int] = []
    for i, cnt in enumerate(contours):
        if not _is_wall_region(cnt, total_px):
            continue
        poly = _contour_to_normalized_polygon(cnt, w, h)
        if len(poly) >= 2:
            walls.append(poly)
            valid_indices.append(i)

    return walls, contours, valid_indices


def classify_floor_plan_elements_pattern(
    image_input: str | Path | np.ndarray,
    annotation_boxes_px: Sequence[tuple[int, int, int, int]] | None = None,
) -> dict[str, Any]:
    """
    灰度化 → 最深的颜色作为墙体颜色 → 首轮检测 → 收集墙体颜色 → 回溯筛选补全。
    """
    if isinstance(image_input, np.ndarray):
        img = image_input
    else:
        img = cv2.imread(str(image_input))
    if img is None:
        raise ValueError("图片加载失败")

    h, w = img.shape[:2]
    total_px = w * h
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    walls1, contours, valid_indices = _run_detection(
        gray, img, total_px, w, h, wall_colors=None, annotation_boxes_px=annotation_boxes_px
    )

    wall_colors = _collect_wall_colors(gray, contours, valid_indices) if valid_indices else set()

    walls2: list[list[list[float]]] = []
    if wall_colors:
        walls2, _, _ = _run_detection(
            gray, img, total_px, w, h, wall_colors=wall_colors, annotation_boxes_px=annotation_boxes_px
        )

    def _centroid(poly: list[list[float]]) -> tuple[float, float]:
        n = len(poly)
        if n == 0:
            return 0.0, 0.0
        return sum(p[0] for p in poly) / n, sum(p[1] for p in poly) / n

    walls = list(walls1)
    thresh = 0.03
    for p2 in walls2:
        c2 = _centroid(p2)
        if not any(
            abs(c2[0] - _centroid(p1)[0]) < thresh and abs(c2[1] - _centroid(p1)[1]) < thresh
            for p1 in walls
        ):
            walls.append(p2)

    return {
        "walls": walls,
        "doors": [],
        "windows": [],
        "stairs": [],
        "columns": [],
        "furniture": [],
        "zones": [],
        "annotations": [],
        "image_size": [w, h],
    }
