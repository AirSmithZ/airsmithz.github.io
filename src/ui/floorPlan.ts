/** 2D 平面图元素（opencv/pattern API 返回） */
export type FloorPlanElements = {
  walls: number[][][];
  doors?: number[][][];
  windows?: number[][][];
  stairs?: number[][][];
  columns?: number[][][];
  furniture: number[][][];
  zones: number[][][];
  annotations: number[][][];
  image_size: [number, number];
};

export type AxisAlignedWall = {
  id: string;
  // normalized coords [0..1]
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number; // normalized relative thickness
  height: number; // meters
};

export type Opening = {
  id: string;
  wallId: string;
  kind: 'door' | 'window';
  // normalized along wall length [0..1]
  t: number;
  width: number; // meters
  height: number; // meters
  sillHeight?: number; // meters (for window)
};

export type FurnitureCube = {
  id: string;
  // normalized coords [0..1]
  nx: number;
  ny: number;
  size: readonly [number, number, number]; // meters (x,y,z)
};

export type FloorPlan = {
  bounds: { w: number; h: number }; // meters, world size of the floor plane
  walls: AxisAlignedWall[];
  openings: Opening[];
  furniture: FurnitureCube[];
  /** 来自 elements 转换时对 x 做了 1-x 修正，设备/选点也需同样变换 */
  flippedX?: boolean;
};

// For demo: we use a simple axis-aligned plan that "feels" like the provided png,
// without trying to OCR/parse the image.
export function generateFloorPlan(_floor: number): FloorPlan {
  const bounds = { w: 12, h: 10 };

  const T = 0.02; // thicker than before: closer to grey bold walls
  const H = 3.0;

  const walls: AxisAlignedWall[] = [
    // ---- 主区域（左侧大区域）外轮廓：左上有斜边 ----
    // 左上斜墙
    { id: 'w_outer_chamfer', x1: 0.06, y1: 0.18, x2: 0.14, y2: 0.11, thickness: T, height: H },
    // 顶墙：中间留出一截作为“窗”
    { id: 'w_outer_top_left', x1: 0.14, y1: 0.11, x2: 0.32, y2: 0.11, thickness: T, height: H },
    { id: 'w_outer_top_right', x1: 0.46, y1: 0.11, x2: 0.76, y2: 0.11, thickness: T, height: H },
    // 左墙：中间留一段作为“窗”
    { id: 'w_outer_left_top', x1: 0.06, y1: 0.18, x2: 0.06, y2: 0.32, thickness: T, height: H },
    { id: 'w_outer_left_bottom', x1: 0.06, y1: 0.46, x2: 0.06, y2: 0.90, thickness: T, height: H },
    // 底墙：中间留出门洞
    { id: 'w_outer_bottom_left', x1: 0.06, y1: 0.90, x2: 0.34, y2: 0.90, thickness: T, height: H },
    { id: 'w_outer_bottom_right', x1: 0.48, y1: 0.90, x2: 0.76, y2: 0.90, thickness: T, height: H },
    { id: 'w_outer_right', x1: 0.76, y1: 0.11, x2: 0.76, y2: 0.90, thickness: T, height: H },

    // ---- 右侧：PASS LIFT 框（图中右侧大矩形）----
    { id: 'w_lift_top', x1: 0.80, y1: 0.41, x2: 0.95, y2: 0.41, thickness: T, height: H },
    { id: 'w_lift_right', x1: 0.95, y1: 0.41, x2: 0.95, y2: 0.80, thickness: T, height: H },
    { id: 'w_lift_bottom', x1: 0.80, y1: 0.80, x2: 0.95, y2: 0.80, thickness: T, height: H },
    // lift 左墙：中间打断留门
    { id: 'w_lift_left_top', x1: 0.80, y1: 0.41, x2: 0.80, y2: 0.52, thickness: T, height: H },
    { id: 'w_lift_left_bottom', x1: 0.80, y1: 0.66, x2: 0.80, y2: 0.80, thickness: T, height: H },

    // ---- 右上：SERVER ROOM 框（图中小房间）----
    { id: 'w_srv_top', x1: 0.82, y1: 0.14, x2: 0.95, y2: 0.14, thickness: T, height: H },
    { id: 'w_srv_right', x1: 0.95, y1: 0.14, x2: 0.95, y2: 0.34, thickness: T, height: H },
    { id: 'w_srv_bottom', x1: 0.82, y1: 0.34, x2: 0.95, y2: 0.34, thickness: T, height: H },
    // server room 左墙：中间打断留门
    { id: 'w_srv_left_top', x1: 0.82, y1: 0.14, x2: 0.82, y2: 0.23, thickness: T, height: H },
    { id: 'w_srv_left_bottom', x1: 0.82, y1: 0.29, x2: 0.82, y2: 0.34, thickness: T, height: H },

    // ---- 右侧连接/过道外墙：与主区域相邻的那条“粗灰墙” ----
    // 这条墙在图里是主区域右侧 + 右侧空间之间的边界（大概在 lift 左侧区域）
    { id: 'w_corridor_top', x1: 0.76, y1: 0.11, x2: 0.82, y2: 0.11, thickness: T, height: H },
    { id: 'w_corridor_mid', x1: 0.76, y1: 0.34, x2: 0.82, y2: 0.34, thickness: T, height: H },
    { id: 'w_corridor_v', x1: 0.82, y1: 0.34, x2: 0.82, y2: 0.41, thickness: T, height: H },
  ];

  return {
    bounds,
    walls,
    openings: [], // 当前不单独渲染门窗，只通过“打断墙段”留出空隙
    furniture: [], // 只要粗墙框架，不生成家具
  };
}

const DEFAULT_WALL_THICKNESS = 0.02;
const DEFAULT_WALL_HEIGHT = 3.0;
const DEFAULT_BOUNDS_W = 12;

const EPS = 1e-6;

/** 判断两段墙是否共线（水平或垂直）且可合并 */
function areCollinear(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): boolean {
  const isHorz1 = Math.abs(y2 - y1) < EPS;
  const isVert1 = Math.abs(x2 - x1) < EPS;
  const isHorz2 = Math.abs(y4 - y3) < EPS;
  const isVert2 = Math.abs(x4 - x3) < EPS;
  if (isHorz1 && isHorz2) return Math.abs(y1 - y3) < EPS;
  if (isVert1 && isVert2) return Math.abs(x1 - x3) < EPS;
  return false;
}

/** 合并共线墙段，减少冗余矩形墙数据 */
function mergeCollinearWalls(walls: AxisAlignedWall[]): AxisAlignedWall[] {
  if (walls.length <= 1) return walls;
  const merged: AxisAlignedWall[] = [];
  const used = new Set<number>();

  for (let i = 0; i < walls.length; i++) {
    if (used.has(i)) continue;
    let w = walls[i];
    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < walls.length; j++) {
        if (used.has(j) || i === j) continue;
        const o = walls[j];
        const connectsA = Math.abs(w.x1 - o.x2) < EPS && Math.abs(w.y1 - o.y2) < EPS;
        const connectsB = Math.abs(w.x2 - o.x1) < EPS && Math.abs(w.y2 - o.y1) < EPS;
        const connectsC = Math.abs(w.x1 - o.x1) < EPS && Math.abs(w.y1 - o.y1) < EPS;
        const connectsD = Math.abs(w.x2 - o.x2) < EPS && Math.abs(w.y2 - o.y2) < EPS;
        const collinear = areCollinear(w.x1, w.y1, w.x2, w.y2, o.x1, o.y1, o.x2, o.y2);
        if (!collinear) continue;
        if (connectsA) {
          w = { ...w, x1: o.x1, y1: o.y1 };
          used.add(j);
          changed = true;
          break;
        }
        if (connectsB) {
          w = { ...w, x2: o.x2, y2: o.y2 };
          used.add(j);
          changed = true;
          break;
        }
        if (connectsC) {
          w = { ...w, x1: o.x2, y1: o.y2 };
          used.add(j);
          changed = true;
          break;
        }
        if (connectsD) {
          w = { ...w, x2: o.x1, y2: o.y1 };
          used.add(j);
          changed = true;
          break;
        }
      }
    }
    merged.push(w);
    used.add(i);
  }
  return merged.map((w, idx) => ({ ...w, id: `w_${idx}` }));
}

/**
 * 将 2D 勾勒的墙体多边形转为 3D FloorPlan。
 * - 修正 Y 轴对称：图像坐标系与 3D 左右镜像，对 x 做 1-x 变换
 * - 每个多边形的每条边转为一段 AxisAlignedWall，去重重叠边
 * - 合并共线墙段，优化矩形墙体数据
 */
export function elementsToFloorPlan(elements: FloorPlanElements): FloorPlan {
  const [iw, ih] = elements.image_size;
  const aspect = ih > 0 ? ih / iw : 1;
  const bounds = { w: DEFAULT_BOUNDS_W, h: DEFAULT_BOUNDS_W * aspect };

  const seen = new Set<string>();
  const rawWalls: AxisAlignedWall[] = [];
  let idSeq = 0;

  function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = Math.min(x1, x2);
    const ay = Math.min(y1, y2);
    const bx = Math.max(x1, x2);
    const by = Math.max(y1, y2);
    return `${ax.toFixed(6)},${ay.toFixed(6)},${bx.toFixed(6)},${by.toFixed(6)}`;
  }

  /** 2D 图像坐标转 3D 一致：修正 Y 轴对称（左右镜像） */
  function flipX(x: number): number {
    return 1 - x;
  }

  for (const poly of elements.walls ?? []) {
    if (poly.length < 2) continue;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const [x1, y1] = a;
      const [x2, y2] = b;
      const x1f = flipX(x1);
      const x2f = flipX(x2);
      const key = edgeKey(x1f, y1, x2f, y2);
      if (seen.has(key)) continue;
      seen.add(key);
      rawWalls.push({
        id: `w_${idSeq++}`,
        x1: x1f,
        y1,
        x2: x2f,
        y2,
        thickness: DEFAULT_WALL_THICKNESS,
        height: DEFAULT_WALL_HEIGHT,
      });
    }
  }

  const walls = mergeCollinearWalls(rawWalls);

  return {
    bounds,
    walls,
    openings: [],
    furniture: [],
    flippedX: true,
  };
}

