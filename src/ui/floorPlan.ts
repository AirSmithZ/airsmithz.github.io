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
};

// For demo: we use a simple axis-aligned plan that "feels" like the provided png,
// without trying to OCR/parse the image.
export function generateFloorPlan(_floor: number): FloorPlan {
  const bounds = { w: 12, h: 10 };

  // 目标：只生成 `map.png` 中“加粗的灰色墙体”作为 3D 框架。
  // - 不再渲染标注用的细线或分区线
  // - 门、窗位置通过“打断墙段”来保留空隙（不再额外生成门窗几何）
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

