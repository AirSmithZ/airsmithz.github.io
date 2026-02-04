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
    }
    interface PolygonOptions {
      path: [number, number][] | Array<[number, number][]>;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeWeight?: number;
    }
    class Map {
      constructor(container: string | HTMLElement, options?: MapOptions);
      add(overlay: Polygon): void;
      getZoom(): number;
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
  function load(options: LoaderOptions): Promise<typeof AMap>;
  export default load;
}

export {};
