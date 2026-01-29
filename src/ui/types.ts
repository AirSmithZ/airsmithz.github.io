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
};

