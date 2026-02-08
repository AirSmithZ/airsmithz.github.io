"""
Floor Plan Backend - PNG → FloorPlan JSON

管线：OpenCV 墙线检测 + 语义补全 + 几何归一化 + FloorPlan 导出
"""

import os
import sys
import tempfile
from pathlib import Path

_BACKEND = Path(__file__).resolve().parent
# 保证 backend 包可被找到（从 backend/ 目录执行 uvicorn main:app 时需项目根在 path 中）
if str(_BACKEND.parent) not in sys.path:
    sys.path.insert(0, str(_BACKEND.parent))

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(_BACKEND / ".env")

from backend.schemas.floor_plan import FloorPlan
from backend.services.orchestrator import run_pipeline

# 内存存储（可改为 Redis/DB）
_plans: dict[str, FloorPlan] = {}
_jobs: dict[str, dict] = {}

app = FastAPI(
    title="Floor Plan API",
    description="PNG 建筑平面图 → FloorPlan JSON（与 floorPlan.ts 兼容）",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/floor-plan/from-image")
async def from_image(
    file: UploadFile = File(...),
    building_id: str | None = None,
    floor_id: str | None = None,
    use_glm_vision: bool = True,
    use_layoutparser: bool = False,
) -> dict:
    """
    上传 PNG 平面图，返回 FloorPlan JSON。
    """
    if not file.filename or not file.filename.lower().endswith((".png", ".jpg", ".jpeg")):
        raise HTTPException(400, "只支持 PNG/JPG 图片")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        plan, assumptions = run_pipeline(
            tmp_path,
            use_glm_vision=use_glm_vision,
            use_layoutparser=use_layoutparser,
        )
        result = plan.to_frontend_dict()
        result["assumptions"] = assumptions

        if building_id and floor_id:
            key = f"{building_id}:{floor_id}"
            _plans[key] = plan

        return result
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@app.get("/api/floor-plan")
async def get_floor_plan(
    building_id: str = Query(...),
    floor_id: str = Query(...),
) -> dict:
    """按建筑/楼层查询已生成的 FloorPlan。"""
    key = f"{building_id}:{floor_id}"
    if key not in _plans:
        raise HTTPException(404, "FloorPlan not found")
    plan = _plans[key]
    return plan.to_frontend_dict()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)
