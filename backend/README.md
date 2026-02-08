# Floor Plan Backend

PNG 建筑平面图 → FloorPlan JSON（与前端 `floorPlan.ts` / Indoor3D 兼容）

## 技术栈

| 组件 | 用途 |
|------|------|
| **FastAPI** | API 服务 |
| **OpenCV** | 墙线检测主方案（Canny + HoughLinesP），保证几何数据准确 |
| **Pillow + numpy** | 读图兜底、数组处理 |
| **LangChain + GLM** | 语义补全（房间名、墙高/厚默认值）；GLM 视觉可选补充尺寸/bounds |

## 安装

```bash
cd backend
python3.12 -m venv venv   # 建议 3.11/3.12，OpenCV 有预编译 wheel，安装快
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**若 OpenCV 卡在 Building wheel**：当前 Python 无预编译包时会从源码编译，很慢。请用 **Python 3.11 或 3.12** 新建 venv（如 `python3.12 -m venv venv`），再执行上述 `pip install`。

**加速下载**（可选）：使用国内镜像  
`pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`

管线四步：**图像解析**（OpenCV 墙线）→ **语义补全**（LLM）→ **几何归一化** → **FloorPlan 导出**。

### 墙体 vs 其他物体（当前策略）

| 图纸要素 | 当前处理 | 说明 |
|----------|----------|------|
| **粗实线（结构墙）** | 作为 `walls[]` 输出 | 图像解析阶段按**线宽**过滤，只保留粗线，细线丢弃 |
| 尺寸标注、延伸线 | 不进入 walls | 细线，被线宽过滤掉 |
| 虚线（ZONE/分区） | 不进入 walls | 细/断线，不参与墙体重建 |
| 门、窗、楼梯、家具家电 | 未单独识别 | `openings=[]`、`furniture=[]`，后续可加检测或 GLM 视觉 |

先区分墙体再归纳：图像解析只输出「墙线」几何；门洞/家具等需后续步骤（符号检测或 LLM）再写入 openings/furniture。

## 配置

```bash
cp .env.example .env
# 编辑 .env，填入 GLM_API_KEY（智谱开放平台 https://open.bigmodel.cn）
```

## 运行

在 **backend 目录下**先激活 venv 再启动（未激活会报 `No module named 'numpy'`）：

```bash
cd backend
source venv/bin/activate     # 看到 (venv)
uvicorn main:app --reload --port 3001
```

前端 Vite 已配置 `/api` 代理到 `http://localhost:3001`。

## API

- `POST /api/floor-plan/from-image` — 上传 PNG，返回 FloorPlan JSON
- `GET /api/floor-plan?buildingId=&floorId=` — 查询已存储的 FloorPlan
- `GET /api/health` — 健康检查
