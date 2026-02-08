"""FloorPlan schema aligned with frontend floorPlan.ts / Indoor3D."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AxisAlignedWall(BaseModel):
    """Wall segment with normalized coordinates [0..1]."""

    id: str
    x1: float = Field(..., ge=0, le=1)
    y1: float = Field(..., ge=0, le=1)
    x2: float = Field(..., ge=0, le=1)
    y2: float = Field(..., ge=0, le=1)
    thickness: float = Field(default=0.02, gt=0)
    height: float = Field(default=3.0, gt=0)


class Opening(BaseModel):
    """Door or window on a wall."""

    id: str
    wall_id: str = Field(alias="wallId")
    kind: Literal["door", "window"]
    t: float = Field(..., ge=0, le=1)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    sill_height: float | None = Field(default=None, alias="sillHeight")

    model_config = ConfigDict(populate_by_name=True)


class FurnitureCube(BaseModel):
    """Equipment/furniture placeholder."""

    id: str
    nx: float = Field(..., ge=0, le=1)
    ny: float = Field(..., ge=0, le=1)
    size: tuple[float, float, float] = Field(default=(0.5, 1.0, 0.5))


class FloorPlan(BaseModel):
    """Complete floor plan compatible with Indoor3D."""

    bounds: dict[str, float] = Field(default_factory=lambda: {"w": 12.0, "h": 10.0})
    walls: list[AxisAlignedWall] = Field(default_factory=list)
    openings: list[Opening] = Field(default_factory=list)
    furniture: list[FurnitureCube] = Field(default_factory=list)

    def to_frontend_dict(self) -> dict:
        """Convert to camelCase for frontend (wallId, sillHeight)."""
        return self.model_dump(by_alias=True, exclude_none=True)
