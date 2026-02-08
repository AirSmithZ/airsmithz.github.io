"""管线编排：图像解析 → 语义补全 → 几何归一化 → FloorPlan 导出。"""

from pathlib import Path
from typing import Any

from ..schemas.floor_plan import FloorPlan
from ..skills.image_extract import extract_from_image
from ..skills.semantic_completion import run_semantic_completion
from ..skills.geometry_normalize import normalize_geometry
from ..skills.floor_plan_export import export_floor_plan
from .llm_client import call_glm_vision


def run_pipeline(
    image_path: str | Path,
    *,
    use_glm_vision: bool = True,
    use_layoutparser: bool = False,
) -> tuple[FloorPlan, list[str]]:
    """
    运行完整管线：PNG → FloorPlan JSON。
    墙线以 OpenCV 检测为主，LLM 仅作可选补充（尺寸/房间名等）。
    """
    path = Path(image_path)
    _ = use_layoutparser  # 预留，当前未使用

    def _glm_fn(b64, walls, ocr, dims):
        if use_glm_vision:
            return call_glm_vision(b64, walls, ocr, dims)
        return None

    data = extract_from_image(path, call_glm_vision=_glm_fn)
    data = run_semantic_completion(data)
    data = normalize_geometry(data)
    plan, assumptions = export_floor_plan(data)

    return plan, assumptions
