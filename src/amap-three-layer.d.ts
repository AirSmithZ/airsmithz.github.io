/**
 * 类型声明：@amap/three-layer 包
 */
declare module '@amap/three-layer' {
  import type { WebGLRenderer, Scene, Camera } from 'three';

  export interface ThreeLayerOptions {
    zIndex?: number;
    visible?: boolean;
    zooms?: number[];
    opacity?: number;
    alpha?: boolean;
    antialias?: boolean;
    customCoordsCenter?: number[];
    onInit?: (render: WebGLRenderer, scene: Scene, camera: Camera) => void;
    onRender?: (render: WebGLRenderer, scene: Scene, camera: Camera) => void;
  }

  export class ThreeLayer {
    constructor(map: unknown, options?: ThreeLayerOptions);
    on(type: string, callback: (e?: unknown) => void): void;
    add(object: unknown): void;
    remove(object: unknown): void;
    update(): void;
    destroy(): void;
  }

  export interface GltfOptions {
    url: string;
    position: number[];
    height?: number;
    rotation?: { x?: number; y?: number; z?: number };
    scale?: number | { x: number; y: number; z: number };
    angle?: number;
    onLoaded?: (gltf: unknown, animations: unknown[]) => void;
  }

  export class ThreeGltf {
    constructor(layer: ThreeLayer, options: GltfOptions);
    destroy(): void;
  }
}
