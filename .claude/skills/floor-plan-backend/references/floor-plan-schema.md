# FloorPlan JSON Schema (aligned with floorPlan.ts / Indoor3D)

Backend and LLM output must conform to this schema so the frontend can consume it without changes.

## Types (TypeScript)

```ts
type FloorPlan = {
  bounds: { w: number; h: number };  // meters, xOz plane
  walls: AxisAlignedWall[];
  openings: Opening[];
  furniture: FurnitureCube[];
};

type AxisAlignedWall = {
  id: string;
  x1: number; y1: number;   // normalized [0..1], xOz projection
  x2: number; y2: number;
  thickness: number;        // normalized relative (e.g. 0.02)
  height: number;           // meters
};

type Opening = {
  id: string;
  wallId: string;
  kind: 'door' | 'window';
  t: number;                // along wall [0..1]
  width: number;            // meters
  height: number;
  sillHeight?: number;     // meters (window)
};

type FurnitureCube = {
  id: string;
  nx: number; ny: number;   // normalized [0..1]
  size: readonly [number, number, number];  // meters (x,y,z)
};
```

## Alignment table

| Field | Unit / convention | Indoor3D usage |
|-------|------------------|---------------|
| `bounds.w`, `bounds.h` | meters, xOz | `planeGeometry(args={[bounds.w, bounds.h]})` |
| `walls[].x1,y1,x2,y2` | normalized [0..1] | `nToWorld(bounds, x1, y1)` → world x,z |
| `walls[].thickness` | normalized | `t = max(0.06, thickness * min(bounds.w, bounds.h))` |
| `walls[].height` | meters | boxGeometry length (y) |
| `openings[].wallId` | must match `walls[].id` | door/window on wall |
| `openings[].t` | [0..1] along wall | opening center position |
| `furniture[].nx,ny` | [0..1] | same as DevicePlacement for 2D/3D |

## Coordinate conversion (LLM → normalized)

If the LLM returns pixel or meter coordinates:

- **Pixel** → use dimension annotations (mm) on the drawing to get scale (px/m), then convert to meters and divide by `bounds.w` / `bounds.h` and shift to [0..1] (e.g. center at 0.5).
- **Meters** (world x,z) → `nx = x / bounds.w + 0.5`, `ny = 0.5 - z / bounds.h`, clamp to [0..1].
