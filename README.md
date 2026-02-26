## Web Map Demo - 仅凭 PNG 建筑图纸生成 3D 室内图

本项目是前端 demo：React + `@react-three/fiber`，室内 2D 平面（`/map.png`）+ 3D 场景 + 设备拖拽。后端将 **PNG 平面图** 转为与 **floorPlan.ts / Indoor3D** 兼容的 FloorPlan JSON，由 three.js 绘制 3D。

---

## 1. 方案概述

- **输入**：一张建筑平面图 PNG（可含尺寸标注、房间名、设备符号）。
- **输出**：与 `generateFloorPlan` / `Indoor3D` 兼容的 **FloorPlan JSON**；前端用 three.js 绘制地面、墙体、门洞、设备占位。
- **不依赖**：无 GLB、无 CAD、无外部房间表；墙高/厚度等由管线按规范补全。
- **管线**：PNG → **图像解析**（OpenCV 墙线）→ **语义补全**（LLM）→ **几何归一化** → **FloorPlan 导出** → 前端 three.js。

墙线以 **OpenCV（Canny + HoughLinesP）** 为主，保证几何数据准确；LLM 仅作语义与尺寸的**可选补充**。

---

## 2. 图纸要素与数据对应（以 map.png 为例）

| 图纸要素 | 提取目标 | 用途 |
|---------|----------|------|
| 实线墙体（粗灰线） | `walls[]` | three.js `WallMesh`（boxGeometry） |
| 虚线（分区线） | 仅作 `rooms[]`/区域边界，不生成墙 | ZONE 1–4、EQUIPMENT AREA 等 |
| 房间/区域文字 | `rooms[].name`、`rooms[].usage` | SERVER ROOM、STAFF ROOM 等 |
| 尺寸标注（mm） | 像素→真实尺寸，得到 `bounds.w/h` | 3D 比例 |
| 门洞/双开门 | `openings[]`（kind: door） | 墙上门洞 |
| 窗/幕墙 | `openings[]`（kind: window）或墙体属性 | 开口/玻璃 |
| 设备符号（蓝 X、绿 ACP、红块） | `furniture[]` 或扩展 `equipments` | 3D 占位 |
| 电梯/竖井（PASS. LIFT） | `rooms[].usage` | 语义区域 |

---

## 3. 管线（仅 PNG 输入）

| 步骤 | 职责 | 实现 |
|------|------|------|
| **图像解析** | 墙线、尺寸等 | OpenCV 读图 + 二值化 + Canny + HoughLinesP；可选 GLM 视觉补充尺寸/bounds |
| **语义补全** | 房间名、墙高/厚默认值 | LangChain + GLM-4 |
| **几何归一化** | 合并共线墙、去碎线、像素→米 | 纯 Python |
| **FloorPlan 导出** | 归一化 [0..1]、轴对齐墙、openings/furniture | 输出与 floorPlan.ts 一致的 JSON |

编排器依次调用上述四步，返回 FloorPlan + assumptions。

---

## 4. 与 floorPlan.ts / Indoor3D 的接口

### 4.1 类型（与 src/ui/floorPlan.ts 对齐）

```ts
type FloorPlan = {
  bounds: { w: number; h: number };  // 米，xOz 平面
  walls: AxisAlignedWall[];
  openings: Opening[];
  furniture: FurnitureCube[];
};

type AxisAlignedWall = {
  id: string;
  x1: number; y1: number;   // 归一化 [0..1]
  x2: number; y2: number;
  thickness: number;        // 归一化相对厚度（如 0.02）
  height: number;           // 米
};

type Opening = {
  id: string;
  wallId: string;
  kind: 'door' | 'window';
  t: number;                // 沿墙长 [0..1]
  width: number;
  height: number;
  sillHeight?: number;
};

type FurnitureCube = {
  id: string;
  nx: number; ny: number;
  size: readonly [number, number, number];  // 米 (x,y,z)
};
```

### 4.2 Indoor3D 使用方式

- **地面**：`<FloorPlane bounds={plan.bounds} />`，y=0。
- **墙体**：对 `plan.walls` 每项 `<WallMesh bounds={plan.bounds} wall={w} />`，端点用 `nToWorld(bounds, wall.x1, wall.y1)` 等转世界坐标；厚度 `t = max(0.06, wall.thickness * min(bounds.w, bounds.h))`。
- **坐标**：`x = (nx - 0.5) * bounds.w`，`z = (0.5 - ny) * bounds.h`，y 向上。
- **openings / furniture**：若 JSON 中带数据，可扩展 Indoor3D 在墙上挖洞或放置占位。

### 4.3 后端输出对齐要点

| 后端输出 | 前端 | 说明 |
|----------|------|------|
| `bounds.w`, `bounds.h` | 米，xOz | 与 three.js 世界尺寸一致 |
| `walls[].x1,y1,x2,y2` | 归一化 [0..1] | Indoor3D 用 nToWorld 转世界坐标 |
| `walls[].thickness` | 归一化相对值 | 实际厚度 ≥ 0.06 |
| `openings[].wallId` | 对应 `walls[].id` | 门/窗依附墙 |
| `furniture[].nx,ny` | 与 DevicePlacement 一致 | 2D/3D 共用 |

像素或米制坐标在 **FloorPlan 导出** 阶段统一转为归一化 [0..1]。

---

## 5. 后端 API

- **POST** `/api/floor-plan/from-image`  
  - `multipart/form-data`，字段 `file`：PNG（可选 `buildingId`、`floorId`、`use_glm_vision`）。  
  - **Response**：`200` + FloorPlan JSON + `assumptions: string[]`。

- **GET** `/api/floor-plan?buildingId=:id&floorId=:f`  
  - **Response**：`200` + FloorPlan；缺失时 `404`。前端可替代 `generateFloorPlan(floor)`。

- **GET** `/api/health`  
  - 健康检查。

（可选扩展：异步 `202` + jobId、**POST** `/api/floor-plan/:buildingId/:floorId/refine` 自然语言修正。）

---

## 6. 数据流与后端实现

```
PNG → 图像解析（OpenCV 墙线）→ 语义补全（LLM）→ 几何归一化 → FloorPlan 导出 → floor-plan.json → 前端 fetch → Indoor3D
```

**后端**（`backend/`）：Python，FastAPI。墙线以 **OpenCV**（opencv-python-headless）为主；语义补全用 LangChain + GLM。

```bash
cd backend
python3.12 -m venv venv   # 建议 3.11/3.12，否则 OpenCV 可能从源码编译很慢
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# 可选国内镜像加速: pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
cp .env.example .env      # 填入 GLM_API_KEY
uvicorn main:app --reload --port 3001
```

在 `backend/` 下用 `main:app` 启动（不要用 `backend.main:app`）。前端 Vite 已配置 `/api` → `http://localhost:3001`。

---

## 7. 可选扩展

- **GLB**：管线入口可将 GLB 转为与 §4.1 一致的 FloorPlan，或与 PNG 结果融合。
- **CAD/矢量**：可增加与「图像解析」同级的输入解析，输出同一中间格式，再由语义补全/几何归一化/导出统一处理。
- 前端只消费 **FloorPlan JSON**，不关心来源（PNG、GLB 或 CAD）。



1.离线部署
2.是否支持3d地图转换