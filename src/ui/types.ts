export type ViewMode = 'outdoor' | 'indoor2d' | 'indoor3d';

export type LatLng = [number, number];

export type Building = {
  id: string;
  name: string;
  center: LatLng;
};

export type DevicePlacement = {
  id: string;
  kind: 'camera' | 'sensor' | 'ap';
  floor: number;
  // normalized in indoor layout [0..1]
  nx: number;
  ny: number;
  /** 在 3D 画布拖放放置时设为 true，坐标已与墙体一致，渲染时不再做 flippedX 变换 */
  placedIn3D?: boolean;
};

