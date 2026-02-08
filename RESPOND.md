# 接口与后端打印分析

## 1. 数据流结论（当前一次请求）

| 阶段 | 数据 | 说明 |
|------|------|------|
| **Skill-A** | image_size=(634,645), has_skimage=**True**, after_local **walls_px=41** | 本地 scikit-image 检测到 41 条墙线 |
| **LLM-Vision** | **status=400**，glm_raw=None | 智谱视觉仍报「参数有误」，未用到 GLM 结果 |
| **Skill-A 输出** | walls_px=41, glm_bounds=None | 仅用本地 41 条墙；bounds 未从 GLM 来 |
| **Skill-C** | default_wall_height=3.0, default_wall_thickness=**0.2** | 语义默认值；**0.2 与前端“归一化相对厚度”0.02 不一致** |
| **Skill-D** | walls_normalized=41, bounds_m=(8.0, 6.45) | 41 条墙通过，bounds 由 634/645 与默认比例算出 |
| **Skill-E** | plan.walls=41 | 最终接口返回 41 面墙 |

结论：**墙线来源正常**（scikit-image 生效），**GLM 视觉仍失败**，**厚度与轴对齐需与前端约定一致**。

---

## 2. 问题拆解

### 2.1 LLM-Vision 仍 400（未修复或环境未更新）

- 现象：`[LLM-Vision] 请求失败 status=400 body={"error":{"code":"1210","message":"API 调用参数有误，请检查文档。"}}`
- 可能原因：请求体与智谱文档不一致，例如：
  - 模型名需为 `glm-4v-plus` / `glm-4v-flash`，不能为 `glm-4v`
  - 图片：`image_url.url` 为**纯 base64 字符串**，不要 `data:image/png;base64,` 前缀
- 建议：确认已部署「模型名 + 纯 base64」的修改并重启；若仍 400，抓包或打印完整请求 body 与智谱文档逐项对照。

### 2.2 墙厚度 0.2 与前端不一致

- 前端 `floorPlan.ts` 使用 **T = 0.02**（归一化相对厚度），Indoor3D 计算：`thickness * min(bounds.w, bounds.h)`，且 `≥ 0.06`。
- 当前接口返回 **thickness: 0.2**，会得到约 0.2×6.45≈1.3m 厚墙，过厚。
- 解决：后端**默认墙厚**应使用 **0.02**（与前端一致），在 Skill-C 的默认值与 prompt 中改为 0.02，并在 Skill-E 对 thickness 做上限/兜底（见下）。

### 2.3 部分墙非轴对齐（AxisAlignedWall）

- 类型名为 **AxisAlignedWall**，即应为水平或竖直墙段。
- 当前返回里存在明显斜墙，例如：
  - w_25: (0.22,0)→(0.94,1) 斜线
  - w_29、w_34、w_35、w_37、w_40 等为斜段
- 斜墙在 three.js 中按两点拉 box 会变成斜向几何，与「轴对齐」语义不符，易导致渲染异常。
- 解决：在 **Skill-E** 对线段做**轴对齐规整**（见下）：近水平 → 统一 y；近竖直 → 统一 x；明显斜线可丢弃或拆成两段轴对齐（当前可先丢弃或只保留轴对齐段）。

---

## 3. 已做/建议的代码修改

- **Skill-C**：`default_wall_thickness` 改为 **0.02**（prompt 与 fallback 一致）。
- **Skill-E**：
  - 使用 `default_wall_thickness` 时做兜底：若来自 LLM 为 0.2，则改为 0.02。
  - 对每条墙做**轴对齐规整**：  
    - 若 `|Δy| ≪ |Δx|` 视为水平，令 `y1 = y2 = (y1+y2)/2`；  
    - 若 `|Δx| ≪ |Δy|` 视为竖直，令 `x1 = x2 = (x1+x2)/2`；  
    - 其余视为斜线，可不输出或按需再处理。

按上述修改后，接口在「厚度」和「轴对齐」上与前端约定一致，且便于后续替换或增加 GLM 视觉结果时复用同一套逻辑。
