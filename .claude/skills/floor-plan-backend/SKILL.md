---
name: floor-plan-backend
description: Develop the backend service that converts PNG floor-plan images to 3D-ready FloorPlan JSON using LLM (GLM-4.7). Use when building API routes for POST /api/floor-plan/from-image, GET /api/floor-plan, or the Skill pipeline (Skill-A/C/D/E) that produces FloorPlan JSON compatible with floorPlan.ts and Indoor3D. Includes GLM-4.7 API config (baseUrl, model; apiKey from env) and schema alignment with the repo README.
---

# Floor Plan Backend (PNG → FloorPlan JSON)

Develop the backend that accepts a building floor-plan PNG, runs the LLM/Skill pipeline (Skill-A → C → D → E), and returns **FloorPlan JSON** compatible with `src/ui/floorPlan.ts` and `Indoor3D.tsx`. The only supported LLM in this skill is **GLM-4.7** (Zhipu).

## API and LLM Config

- **LLM**: GLM-4.7. Base URL and model names are fixed; **API key must come from environment** (e.g. `GLM_API_KEY`). Never hardcode the key in code or in this skill.
- **Reference**: [GLM API config and usage](./reference/glm-api.md) — `baseUrl`, `modelNames`, request/response shape, and how to pass the image (base64 or URL) for vision.
- **Contract**: Backend responses must conform to [FloorPlan schema](./reference/floor-plan-schema.md) so the frontend can drop-in replace `generateFloorPlan(floor)`.

## Workflow (README-aligned)

1. **POST /api/floor-plan/from-image** — Accept `multipart/form-data` with `file` (PNG). Optionally `buildingId`, `floorId`, `options`.
2. **Call LLM (GLM-4.7)** — Send image + prompt for Skill-A (extract walls, rooms, doors/windows, dimensions, equipment). Use vision API; see [glm-api.md](./reference/glm-api.md).
3. **Pipeline** — Run Skill-C (semantic completion), Skill-D (geometry validation), Skill-E (3D params). Output must be **normalized [0..1]** for `walls[].x1,y1,x2,y2` and `furniture[].nx,ny`; see [floor-plan-schema.md](./reference/floor-plan-schema.md).
4. **Response** — Return JSON body as **FloorPlan** (§4.1 in README) plus optional `assumptions: string[]`. For async, return `202` + `jobId` and expose **GET /api/floor-plan/jobs/:jobId**.
5. **GET /api/floor-plan?buildingId=&floorId=** — Return stored FloorPlan for that building/floor; `404` if missing.

## Key Constraints

- **Coordinate system**: Walls and furniture use **normalized coordinates [0..1]** (same as `floorPlan.ts`). Convert pixel or meter output from the LLM to normalized in Skill-E or backend.
- **Bounds**: `bounds.w`, `bounds.h` in **meters** (xOz plane). Use dimension annotations (mm) on the drawing to establish scale.
- **Openings**: `openings[].wallId` must reference `walls[].id`; `t` is position along wall [0..1].

## Optional Script

- [scripts/call_glm_vision.example.mjs](./scripts/call_glm_vision.example.mjs) — Minimal example of calling GLM-4.7 vision with an image (reads `GLM_API_KEY` from env). Use as reference when implementing the from-image route.
