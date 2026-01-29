import 'leaflet/dist/leaflet.css';

import { useMemo, useState } from 'react';
import { MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet';

import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2304, 121.4737],
};

function ZoomHint(props: { zoom: number }) {
  const canPick = props.zoom >= 17;
  return (
    <div className="wm-map-hint">
      <div className="wm-map-hint-title">室外地图（OpenStreetMap）</div>
      <div className="wm-map-hint-sub">
        {canPick ? '现在可以点击建筑多边形进入室内。' : '请继续放大到街区/建筑级别（≥ 17）以启用点击。'}
      </div>
    </div>
  );
}

function ZoomWatcher(props: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend(e) {
      props.onZoom(e.target.getZoom());
    },
  });
  return null;
}

export function OutdoorMap(props: { onBuildingClick: (b: Building) => void }) {
  const [zoom, setZoom] = useState(15);

  // Mock building polygon around center (a small rectangle)
  const polygon = useMemo(() => {
    const [lat, lng] = MOCK_BUILDING.center;
    const dLat = 0.0012;
    const dLng = 0.0016;
    return [
      [lat - dLat, lng - dLng],
      [lat - dLat, lng + dLng],
      [lat + dLat, lng + dLng],
      [lat + dLat, lng - dLng],
    ] satisfies LatLng[];
  }, []);

  const canPick = zoom >= 17;

  return (
    <div className="wm-map">
      <MapContainer center={MOCK_BUILDING.center} zoom={zoom} className="wm-map-canvas" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ZoomWatcher onZoom={(z) => setZoom(z)} />

        <Polygon
          positions={polygon}
          pathOptions={{
            color: canPick ? '#7cf2b1' : '#64748b',
            weight: 3,
            fillColor: canPick ? '#0ea5e9' : '#334155',
            fillOpacity: canPick ? 0.32 : 0.18,
          }}
          eventHandlers={{
            click: () => {
              if (!canPick) return;
              props.onBuildingClick(MOCK_BUILDING);
            },
          }}
        />
      </MapContainer>

      <ZoomHint zoom={zoom} />
    </div>
  );
}

