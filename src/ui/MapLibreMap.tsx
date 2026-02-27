/**
 * 室外地图 - MapLibre + react-map-gl 实现
 * 与 OutdoorMap（高德）功能对等：建筑多边形、点击进入室内
 */
import { useCallback, useMemo } from 'react';
import Map, { Layer, Source } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2290, 121.4737],
};

/** [lat, lng] -> GeoJSON [lng, lat] */
function toGeoJsonRing([lat, lng]: LatLng, dLat: number, dLng: number): [number, number][] {
  return [
    [lng - dLng, lat - dLat],
    [lng - dLng, lat + dLat],
    [lng + dLng, lat + dLat],
    [lng + dLng, lat - dLat],
    [lng - dLng, lat - dLat],
  ];
}

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export function MapLibreMap(props: { onBuildingClick: (b: Building) => void }) {
  const [lat, lng] = MOCK_BUILDING.center;
  const dLat = 0.0012;
  const dLng = 0.0016;

  const geojson = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [toGeoJsonRing([lat, lng], dLat, dLng)],
      },
    }),
    [lat, lng],
  );

  const initialViewState = useMemo(
    () => ({
      longitude: lng,
      latitude: lat,
      zoom: 15,
    }),
    [lat, lng],
  );

  const onPolygonClick = useCallback(
    (e: { features?: unknown[] }) => {
      if (e.features?.length) props.onBuildingClick(MOCK_BUILDING);
    },
    [props],
  );

  return (
    <div className="wm-map">
      <Map
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        onClick={onPolygonClick}
        interactiveLayerIds={['building-polygon']}
      >
        <Source id="building-source" type="geojson" data={geojson}>
          <Layer
            id="building-polygon"
            type="fill"
            paint={{
              'fill-color': '#0ea5e9',
              'fill-opacity': 0.32,
            }}
          />
          <Layer
            id="building-outline"
            type="line"
            paint={{
              'line-color': '#7cf2b1',
              'line-width': 3,
            }}
          />
        </Source>
      </Map>
      <div className="wm-map-hint">
        <div className="wm-map-hint-title">室外地图（MapLibre）</div>
        <div className="wm-map-hint-sub">点击建筑多边形进入室内。</div>
      </div>
    </div>
  );
}
