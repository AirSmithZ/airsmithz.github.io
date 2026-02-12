"""
墙体识别可调参数：抽离为固定配置，便于针对当前平面图调参与展示。

使用方式：
- 调参：直接修改下方 WALL_DETECTION_CONFIG 的数值，generate_2d_map 与 generate_2d_opencv 均会读取。
- 固定展示：可将本配置导出为 JSON 供前端或文档展示当前识别条件。
"""

from typing import Any


# 当前针对 docs/map.png 的定制化参数（可整体替换为其他预设）
WALL_DETECTION_CONFIG: dict[str, Any] = {
    # ---------- 颜色：灰色墙体 ----------
    "grey_wall_lo": 0,
    "grey_wall_hi": 248,
    "grey_channel_diff_max": 60,
    # ---------- 红色排除（楼梯、红框） ----------
    "red_min": 90,
    "red_over_g": 35,
    "red_over_b": 35,
    # ---------- 线厚：粗线=墙 ----------
    "wall_max_thin_ratio": 420,
    "wall_min_thickness_px": 2.0,
    # ---------- 最小墙面积：max(绝对值, 相对 total_px 比例) ----------
    "min_wall_area_abs": 150,
    "min_wall_area_ratio": 0.0006,
    # ---------- 二值化回退：灰点少时用灰度+低饱和度 ----------
    "grey_white_ratio_use_fallback": 0.02,
    "low_sat_channel_diff": 70,
    "grey_white_ratio_use_otsu": 0.005,
    # ---------- 形态学 ----------
    "morph_open_size": 2,
    "morph_close_size_min": 3,
    "morph_close_size_max": 7,
    "kernel_size_divisor": 150,
    # ---------- 无墙时兜底 ----------
    "fallback_min_area_abs": 80,
    "fallback_min_area_ratio": 0.0003,
    "fallback_max_thin_ratio": 500,
    "fallback_min_thickness_px": 1.5,
    # ---------- 灰图不足时的阈值（_get_wall_contours_from_img） ----------
    "grey_ratio_secondary": 0.01,
}
