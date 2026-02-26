# CAD 图纸结构墙识别（PNG 格式）

实现文件：`generate_2d_opencv_pattern.py`  
配置：`wall_pattern_config.py`

## 核心逻辑

灰度化后以**最深的颜色**作为墙体颜色 → 所有与墙体颜色相同的连通域均为墙体。

---

## 一、墙体色值识别

- **灰度化**：BGR 转灰度，消除色彩干扰
- **墙体色值**：在深色区 [0, wall_color_max] 内取直方图峰值
- **色值范围**：峰值 ± wall_color_tolerance，或回溯时用已识别墙体的 5–95 分位灰度
- **红色排除**：R 明显高于 G、B 的像素置零（排除楼梯等）

## 二、墙体掩码构建

1. 二值掩码：灰度 ∈ [lo, hi] 的像素为 255，其余为 0  
2. **形态学闭运算**：椭圆核补全小缺口（wall_morph_close_size）  
3. **干扰排除**（_exclude_interference）：
   - 小连通域：面积 < noise_min_component_area 剔除
   - 极细线：面积 < thin_max_area 且 周长²/面积 > thin_min_ratio 剔除（标尺、水印、尺寸线等）
4. **标注框**（可选）：若提供 annotation_boxes_px，仅当区域色值与墙体不一致时过滤

## 三、轮廓提取与墙体筛选

- **轮廓**：findContours(RETR_TREE) 从掩码提取
- **墙体判定**（_is_wall_region）：
  - 最小面积：max(min_contour_area, total_px × min_contour_area_ratio)
  - 细长比：周长²/面积 ≤ max_thin_ratio
  - **最小墙厚**：2×面积/周长 ≥ wall_min_width_px

## 四、边缘后处理

1. **去锯齿**：approxPolyDP 简化轮廓（epsilon = 周长 × wall_approx_epsilon_ratio）
2. **正交化**：_orthogonalize_polygon 将边吸附到水平/垂直（角度容差 wall_orthogonal_angle_thresh）
3. **归一化**：坐标除以图像宽高，输出 [0, 1] 多边形

## 五、两轮检测与合并

1. **首轮**：wall_colors=None，用直方图峰值
2. **收集墙体色值**：从有效轮廓内取 5–95 分位灰度
3. **二轮**：用收集的色值重新检测
4. **合并**：按质心去重（阈值 0.03），补全首轮遗漏墙体

## 六、输出

```json
{
  "walls": [[[x,y], ...], ...],
  "doors": [],
  "windows": [],
  "stairs": [],
  "columns": [],
  "furniture": [],
  "zones": [],
  "annotations": [],
  "image_size": [w, h]
}
```

墙体为归一化多边形顶点列表，横平竖直、已去锯齿。
