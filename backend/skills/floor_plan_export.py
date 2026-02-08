"""
FloorPlan 导出（Floor Plan Export）：转为与 floorPlan.ts 完全兼容的 JSON

归一化坐标 [0..1]、轴对齐墙段、openings、furniture。
"""

import math
from typing import Any

from ..schemas.floor_plan import AxisAlignedWall, FloorPlan

# 与前端 floorPlan.ts / Indoor3D 一致：归一化厚度、米制高度
DEFAULT_THICKNESS = 0.02
DEFAULT_HEIGHT = 3.0
# 前端 planeGeometry 用 bounds.w/h 为米，超过 100 视为 mm
BOUNDS_MAX_M = 100.0
BOUNDS_MIN_M = 2.0


def _bounds_to_meters(bounds: dict[str, float]) -> dict[str, float]:
    """确保 bounds 为米，避免 mm 当 m 导致渲染巨大。"""
    w = float(bounds.get("w", 12.0))
    h = float(bounds.get("h", 10.0))
    if w > BOUNDS_MAX_M or h > BOUNDS_MAX_M:
        w = w / 1000.0 if w > BOUNDS_MAX_M else w
        h = h / 1000.0 if h > BOUNDS_MAX_M else h
    w = max(BOUNDS_MIN_M, min(BOUNDS_MAX_M, w))
    h = max(BOUNDS_MIN_M, min(BOUNDS_MAX_M, h))
    return {"w": w, "h": h}


def _snap_to_axis_aligned(x1: float, y1: float, x2: float, y2: float) -> tuple[float, float, float, float] | None:
    """近水平/竖直时规整为严格轴对齐，斜线返回 None（调用方保留原坐标）。"""
    dx, dy = x2 - x1, y2 - y1
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return None
    if abs(dy) <= 0.02 * max(abs(dx), 1e-6):
        y_mid = (y1 + y2) / 2
        return (min(x1, x2), y_mid, max(x1, x2), y_mid)
    if abs(dx) <= 0.02 * max(abs(dy), 1e-6):
        x_mid = (x1 + x2) / 2
        return (x_mid, min(y1, y2), x_mid, max(y1, y2))
    return None


def export_floor_plan(normalize_output: dict[str, Any]) -> tuple[FloorPlan, list[str]]:
    """
    将几何归一化输出转为前端兼容的 FloorPlan。
    水平/竖直墙规整为轴对齐；斜墙保留原 (x1,y1,x2,y2)，前端 Indoor3D 已支持斜墙渲染。
    """
    walls_norm = normalize_output.get("walls_normalized", [])
    print(f"[FloorPlanExport] input walls_normalized=len({len(walls_norm)}) bounds_m={normalize_output.get('bounds_m')}")
    bounds = _bounds_to_meters(normalize_output.get("bounds_m", {"w": 12.0, "h": 10.0}))
    default_height = float(normalize_output.get("default_wall_height", DEFAULT_HEIGHT))
    raw_thickness = float(normalize_output.get("default_wall_thickness", DEFAULT_THICKNESS))
    default_thickness = raw_thickness if 0 < raw_thickness <= 0.1 else DEFAULT_THICKNESS
    assumptions = normalize_output.get("assumptions", [])

    walls: list[AxisAlignedWall] = []
    for i, w in enumerate(walls_norm):
        x1, y1 = w.get("x1", 0), w.get("y1", 0)
        x2, y2 = w.get("x2", 0), w.get("y2", 0)
        x1, x2 = max(0, min(1, x1)), max(0, min(1, x2))
        y1, y2 = max(0, min(1, y1)), max(0, min(1, y2))
        length = math.hypot(x2 - x1, y2 - y1)
        if length < 0.01:
            continue
        snapped = _snap_to_axis_aligned(x1, y1, x2, y2)
        if snapped is not None:
            x1, y1, x2, y2 = snapped
        walls.append(
            AxisAlignedWall(
                id=f"w_{len(walls)}",
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
                thickness=default_thickness,
                height=default_height,
            )
        )

    plan = FloorPlan(
        bounds=bounds,
        walls=walls,
        openings=[],
        furniture=[],
    )
    print(f"[FloorPlanExport] output plan.walls=len({len(plan.walls)}) bounds={plan.bounds}")
    return plan, assumptions
