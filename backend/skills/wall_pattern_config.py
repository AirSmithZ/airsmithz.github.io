"""
CAD 结构墙像素级分析配置。

使用方式：调参直接修改下方 WALL_PATTERN_CONFIG。
"""

from typing import Any

WALL_PATTERN_CONFIG: dict[str, Any] = {
    "wall_color_max": 128,
    "wall_color_tolerance": 25,
    "wall_color_backtrack_tolerance": 3,
    "min_contour_area": 150,
    "min_contour_area_ratio": 0.0005,
    "max_thin_ratio": 1500,
    "noise_min_component_area": 80,
    "noise_thin_line_max_area": 150,
    "noise_thin_line_min_ratio": 400,
    "red_min": 90,
    "red_over_g": 35,
    "red_over_b": 35,
}
