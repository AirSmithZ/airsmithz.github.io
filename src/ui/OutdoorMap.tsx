/// <reference path="../amap.d.ts" />
import { useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- types from src/amap.d.ts when pkg not installed
import AMapLoader from '@amap/amap-jsapi-loader';

import type { Building, LatLng } from './types';

const AMAP_KEY = '31d12ccab5b38ae944d01977a0d37cc1';
const AMAP_SECURITY_CODE = '28c7a106d5debb23bf94f58056466abb';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2304, 121.4737],
};

/** [lat, lng] -> [lng, lat] for 高德 */
function toLngLat([lat, lng]: LatLng): [number, number] {
  return [lng, lat];
}

function ZoomHint(props: { zoom: number }) {
  const canPick = props.zoom >= 17;
  return (
    <div className="wm-map-hint">
      <div className="wm-map-hint-title">室外地图（高德地图）</div>
      <div className="wm-map-hint-sub">
        {canPick ? '现在可以点击建筑多边形进入室内。' : '请继续放大到街区/建筑级别（≥ 17）以启用点击。'}
      </div>
    </div>
  );
}

const PITCH_3D = 55;

export function OutdoorMap(props: { onBuildingClick: (b: Building) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const polygonRef = useRef<AMap.Polygon | null>(null);
  const onBuildingClickRef = useRef(props.onBuildingClick);
  onBuildingClickRef.current = props.onBuildingClick;
  const [zoom, setZoom] = useState(15);

  const amapCenter = useMemo(() => toLngLat(MOCK_BUILDING.center), []);
  const polygonPath = useMemo(() => {
    const [lat, lng] = MOCK_BUILDING.center;
    const dLat = 0.0012;
    const dLng = 0.0016;
    return [
      [lng - dLng, lat - dLat],
      [lng - dLng, lat + dLat],
      [lng + dLng, lat + dLat],
      [lng + dLng, lat - dLat],
    ] as [number, number][];
  }, []);

  const TRANSITION_MS = 600;

  useEffect(() => {
    if (!containerRef.current) return;

    (window as unknown as { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = {
      securityJsCode: AMAP_SECURITY_CODE,
    };

    AMapLoader.load({
      key: AMAP_KEY,
      version: '2.0',
    })
      .then((AMap: typeof globalThis.AMap) => {
        const is3D = zoom >= 17;
        const map = new AMap.Map(containerRef.current!, {
          center: amapCenter,
          zoom,
          viewMode: '3D',
          scrollWheelZoom: true,
          showBuildingBlock: false,
          pitch: is3D ? PITCH_3D : 0,
        });
        mapRef.current = map;

        try {
          if (AMap.Lights?.AmbientLight) {
            map.AmbientLight = new AMap.Lights.AmbientLight([1, 1, 1], 0.6);
            map.DirectionLight = new AMap.Lights.DirectionLight([0, 0, 1], [1, 1, 1], 1);
          }
          const prismPath = polygonPath.map(([lng, lat]) => new AMap.LngLat(lng, lat));
          const object3DLayer = new AMap.Object3DLayer();
          const prism = new AMap.Object3D.Prism({
            path: prismPath,
            height: 60,
            color: 'rgba(14, 165, 233, 0.5)',
          });
          prism.transparent = true;
          object3DLayer.add(prism);
          map.add(object3DLayer);
        } catch (e) {
          console.warn('AMap 3D Prism:', e);
        }

        const polygon = new AMap.Polygon({
          path: polygonPath,
          fillColor: is3D ? '#0ea5e9' : '#334155',
          fillOpacity: is3D ? 0.32 : 0.18,
          strokeColor: is3D ? '#7cf2b1' : '#64748b',
          strokeWeight: 3,
        });
        polygon.on('click', () => {
          if (map.getZoom() >= 17) onBuildingClickRef.current(MOCK_BUILDING);
        });
        map.add(polygon);
        polygonRef.current = polygon;

        let buildingsLayer: AMap.Buildings | null = null;
        if (is3D) {
          buildingsLayer = new AMap.Buildings({
            zooms: [17, 20],
            zIndex: 10,
            heightFactor: 2,
          });
          map.add(buildingsLayer);
        }

        map.on('zoomend', () => {
          const newZ = map.getZoom();
          setZoom(newZ);
          const newIs3D = newZ >= 17;
          if (polygonRef.current) {
            polygonRef.current.setOptions({
              fillColor: newIs3D ? '#0ea5e9' : '#334155',
              fillOpacity: newIs3D ? 0.32 : 0.18,
              strokeColor: newIs3D ? '#7cf2b1' : '#64748b',
            });
          }
          map.setPitch(newIs3D ? PITCH_3D : 0, false, TRANSITION_MS);
          if (newIs3D && !buildingsLayer) {
            buildingsLayer = new AMap.Buildings({
              zooms: [17, 20],
              zIndex: 10,
              heightFactor: 2,
            });
            map.add(buildingsLayer);
          } else if (!newIs3D && buildingsLayer) {
            map.remove(buildingsLayer);
            buildingsLayer = null;
          }
        });
      })
      .catch((e: unknown) => console.error('AMap load error:', e));

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
      polygonRef.current = null;
    };
  }, [amapCenter, polygonPath]);

  return (
    <div className="wm-map">
      <div ref={containerRef} className="wm-map-canvas" style={{ height: '100%', width: '100%' }} />
      <ZoomHint zoom={zoom} />
    </div>
  );
}
