/**
 * Minimal type declarations for 高德地图 JS API 2.0 and @amap/amap-jsapi-loader.
 * For full types consider @types/amap-js-api or amap-jsapi-types.
 */
declare global {
  namespace AMap {
    interface MapOptions {
      center?: [number, number];
      zoom?: number;
      viewMode?: '2D' | '3D';
      scrollWheelZoom?: boolean;
      pitch?: number;
      rotation?: number;
      showBuildingBlock?: boolean;
      layers?: unknown[];
    }
    interface PolygonOptions {
      path: [number, number][] | Array<[number, number][]>;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    interface BuildingsOptions {
      zooms?: [number, number];
      zIndex?: number;
      heightFactor?: number;
    }
    class Buildings {
      constructor(options?: BuildingsOptions);
    }
    interface LngLat {
      constructor(lng: number, lat: number);
      toJSON(): [number, number];
    }
    class Map {
      constructor(container: string | HTMLElement, options?: MapOptions);
      add(overlay: Polygon | Buildings): void;
      remove(overlay: unknown): void;
      getZoom(): number;
      getCenter(): LngLat;
      /** 设置俯仰角，immediately=false 时带动画，duration 为动画时长(ms) */
      setPitch(pitch: number, immediately?: boolean, duration?: number): void;
      on(type: string, callback: () => void): void;
      destroy(): void;
    }
    class Polygon {
      constructor(options: PolygonOptions);
      setOptions(opts: Partial<PolygonOptions>): void;
      on(type: string, callback: () => void): void;
    }
  }
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}

declare module '@amap/amap-jsapi-loader' {
  interface LoaderOptions {
    key: string;
    version?: string;
    plugins?: string[];
  }
  const loader: {
    load(options: LoaderOptions): Promise<typeof AMap>;
    reset(): void;
  };
  export default loader;
}

export {};
