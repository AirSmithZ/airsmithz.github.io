/**
 * 室外地图 - OpenLayers 实现
 * 与 OutdoorMap（高德）、MapLibreMap 功能对等：建筑多边形、点击进入室内
 */
import { useEffect, useMemo, useRef } from 'react';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import Polygon from 'ol/geom/Polygon.js';
import Feature from 'ol/Feature.js';
import { Style, Fill, Stroke } from 'ol/style.js';
import Rotate from 'ol/control/Rotate.js';

import 'ol/ol.css';

import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2290, 121.4737],
};

/** [lat, lng] -> ring [lng, lat] */
function toLngLatRing([lat, lng]: LatLng, dLat: number, dLng: number): number[][] {
  return [
    [lng - dLng, lat - dLat],
    [lng - dLng, lat + dLat],
    [lng + dLng, lat + dLat],
    [lng + dLng, lat - dLat],
    [lng - dLng, lat - dLat],
  ];
}

export function OpenLayersMap(props: { onBuildingClick: (b: Building) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onBuildingClickRef = useRef(props.onBuildingClick);
  onBuildingClickRef.current = props.onBuildingClick;

  const [lat, lng] = MOCK_BUILDING.center;
  const dLat = 0.0012;
  const dLng = 0.0016;

  const center3857 = useMemo(() => fromLonLat([lng, lat]), [lat, lng]);
  const polygonCoords = useMemo(
    () => toLngLatRing([lat, lng], dLat, dLng).map((c) => fromLonLat(c as [number, number])),
    [lat, lng],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const polygon = new Polygon([polygonCoords]);
    const feature = new Feature({ geometry: polygon });
    const vectorSource = new VectorSource({ features: [feature] });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({ color: 'rgba(14, 165, 233, 0.32)' }),
        stroke: new Stroke({ color: '#7cf2b1', width: 3 }),
      }),
    });

    const map = new Map({
      target: containerRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({
        center: center3857,
        zoom: 17,
        minZoom: 12,
        maxZoom: 20,
      }),
    });

    map.addControl(
      new Rotate({
        autoHide: false,
        tipLabel: '重置北向',
      }),
    );

    map.on('click', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel);
      if (hit) onBuildingClickRef.current(MOCK_BUILDING);
    });

    return () => {
      map.setTarget('');
    };
  }, [center3857, polygonCoords]);

  return (
    <div className="wm-map">
      <div ref={containerRef} className="wm-map-canvas" style={{ width: '100%', height: '100%' }} />
      <div className="wm-map-hint">
        <div className="wm-map-hint-title">室外地图（OpenLayers）</div>
        <div className="wm-map-hint-sub">点击建筑多边形进入室内。Alt+Shift+拖拽旋转。</div>
      </div>
    </div>
  );
}
