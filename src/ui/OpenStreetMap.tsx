/**
 * 室外地图 - OpenStreetMap 系列（Leaflet + react-leaflet）
 * 支持多种默认图层切换，以及自定义瓦片 URL
 * 「自定义配色」使用 MapLibre + 矢量瓦片，按 MAP_LAYERS_CONFIG 映射图层属性并应用配色
 * 与 OutdoorMap 功能对等：建筑多边形、点击进入室内
 */
import { useCallback, useMemo, useState } from 'react';
import { MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet';
import type { LeafletEvent, Map as LeafletMap } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Map from 'react-map-gl/maplibre';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import {
  CUSTOM_STYLE_PRESETS,
  getConfigByPresetId,
  getCustomMapStyle,
  getMapLayerStyle,
} from '../config/mapLayersConfig';
import type { CustomStylePresetId } from '../config/mapLayersConfig';
import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2290, 121.4737],
};

/** [lat, lng] -> GeoJSON ring [lng, lat] */
function toGeoJsonRing([lat, lng]: LatLng, dLat: number, dLng: number): [number, number][] {
  return [
    [lng - dLng, lat - dLat],
    [lng - dLng, lat + dLat],
    [lng + dLng, lat + dLat],
    [lng + dLng, lat - dLat],
    [lng - dLng, lat - dLat],
  ];
}

const THUNDERFOREST_API_KEY = import.meta.env.VITE_THUNDERFOREST_API_KEY as string | undefined;

export type OsmLayerType =
  | 'osm'
  | 'osm-hot'
  | 'opentopomap'
  | 'carto-light'
  | 'carto-positron'
  | 'carto-dark'
  | 'cyclosm'
  | 'stadia-alidade'
  | 'stadia-osm-bright'
  | 'cycle'
  | 'custom'
  | CustomStylePresetId;

const DEFAULT_LAYERS: { id: Exclude<OsmLayerType, 'custom' | CustomStylePresetId>; label: string; url: string; available: boolean }[] = [
  { id: 'osm', label: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', available: true },
  { id: 'osm-hot', label: 'HOT (Humanitarian)', url: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', available: true },
  { id: 'opentopomap', label: 'OpenTopoMap', url: 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png', available: true },
  { id: 'carto-light', label: 'Carto Light', url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', available: true },
  { id: 'carto-positron', label: 'Carto Positron', url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', available: true },
  { id: 'carto-dark', label: 'Carto Dark', url: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', available: true },
  { id: 'cyclosm', label: 'CyclOSM', url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', available: true },
  { id: 'stadia-alidade', label: 'Stadia Alidade', url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', available: true },
  { id: 'stadia-osm-bright', label: 'Stadia OSM Bright', url: 'https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png', available: true },
  {
    id: 'cycle',
    label: 'Cycle (Thunderforest)',
    url: THUNDERFOREST_API_KEY
      ? `https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_API_KEY}`
      : '',
    available: !!THUNDERFOREST_API_KEY,
  },
];

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

function LayerSwitcher(props: {
  value: OsmLayerType;
  onChange: (v: OsmLayerType) => void;
  customTileUrl?: string;
}) {
  return (
    <div className="wm-map-layer-switcher">
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as OsmLayerType)}
        title="切换底图图层"
      >
        {DEFAULT_LAYERS.map((ly) => (
          <option key={ly.id} value={ly.id} disabled={!ly.available}>
            {ly.label}
            {!ly.available && ' (需 API Key)'}
          </option>
        ))}
        {CUSTOM_STYLE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
        <option value="custom" disabled={!props.customTileUrl}>
          自定义 {props.customTileUrl ? '' : '(需配置 customTileUrl)'}
        </option>
      </select>
    </div>
  );
}

/** 捕获 zoom 变化以更新提示与样式 */
function MapEventHandler(props: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e: LeafletEvent) => {
      props.onZoom((e.target as LeafletMap).getZoom());
    },
  });
  return null;
}

export function OpenStreetMap(props: {
  onBuildingClick: (b: Building) => void;
  /** 自定义瓦片 URL 模板，占位符 {z} {x} {y}，如 https://example.com/{z}/{x}/{y}.png */
  customTileUrl?: string;
}) {
  const [layerType, setLayerType] = useState<OsmLayerType>('osm');
  const [zoom, setZoom] = useState(15);

  const [lat, lng] = MOCK_BUILDING.center;
  const dLat = 0.0012;
  const dLng = 0.0016;

  const positions = useMemo(
    (): LatLngExpression[] => [
      [lat - dLat, lng - dLng],
      [lat - dLat, lng + dLng],
      [lat + dLat, lng + dLng],
      [lat + dLat, lng - dLng],
    ],
    [lat, lng],
  );

  const isCustomStyle = (v: OsmLayerType): v is CustomStylePresetId =>
    ['custom-style', 'custom-style-2', 'custom-style-3', 'custom-style-4'].includes(v);

  const tileUrl = useMemo(() => {
    if (layerType === 'custom' && props.customTileUrl) return props.customTileUrl;
    if (isCustomStyle(layerType)) return DEFAULT_LAYERS[0].url;
    const ly = DEFAULT_LAYERS.find((l) => l.id === layerType && l.available);
    return ly?.url ?? DEFAULT_LAYERS[0].url;
  }, [layerType, props.customTileUrl]);

  const onPolygonClick = useCallback(() => {
    if (zoom >= 17) props.onBuildingClick(MOCK_BUILDING);
  }, [props, zoom]);

  const onZoom = useCallback((z: number) => setZoom(z), []);

  const customStyle = isCustomStyle(layerType)
    ? getMapLayerStyle('buildings', getConfigByPresetId(layerType))
    : null;
  const polygonOptions = useMemo(() => {
    if (customStyle) {
      return {
        fillColor: customStyle.fillColor,
        fillOpacity: 0.9,
        color: customStyle.strokeColor,
        weight: 2,
      };
    }
    return {
      fillColor: zoom >= 17 ? '#0ea5e9' : '#334155',
      fillOpacity: zoom >= 17 ? 0.32 : 0.18,
      color: zoom >= 17 ? '#7cf2b1' : '#64748b',
      weight: 3,
    };
  }, [customStyle, zoom]);

  const mapStyle = useMemo(
    () => (isCustomStyle(layerType) ? getCustomMapStyle(layerType) : getCustomMapStyle('custom-style')),
    [layerType],
  );
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
    () => ({ longitude: lng, latitude: lat, zoom: 15 }),
    [lat, lng],
  );
  const onMapLibreClick = useCallback(
    (e: { features?: unknown[] }) => {
      if (e.features?.length && zoom >= 17) props.onBuildingClick(MOCK_BUILDING);
    },
    [props, zoom],
  );
  const onMapLibreMove = useCallback((evt: { viewState?: { zoom?: number } }) => {
    if (evt.viewState?.zoom != null) setZoom(evt.viewState.zoom);
  }, []);

  if (isCustomStyle(layerType)) {
    return (
      <div className="wm-map">
        <Map
          initialViewState={initialViewState}
          mapStyle={mapStyle as StyleSpecification}
          style={{ width: '100%', height: '100%' }}
          onClick={onMapLibreClick}
          onMove={onMapLibreMove}
          interactiveLayerIds={['building-polygon']}
        >
          <Source id="building-source" type="geojson" data={geojson}>
            <Layer
              id="building-polygon"
              type="fill"
              paint={{
                'fill-color': customStyle!.fillColor,
                'fill-opacity': 0.9,
              }}
            />
            <Layer
              id="building-outline"
              type="line"
              paint={{
                'line-color': customStyle!.strokeColor,
                'line-width': 2,
              }}
            />
          </Source>
        </Map>
        <LayerSwitcher
          value={layerType}
          onChange={setLayerType}
          customTileUrl={props.customTileUrl}
        />
        <ZoomHint zoom={zoom} />
      </div>
    );
  }

  return (
    <div className="wm-map">
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url={tileUrl} />
        <Polygon
          positions={positions}
          pathOptions={polygonOptions}
          eventHandlers={{ click: onPolygonClick }}
        />
        <MapEventHandler onZoom={onZoom} />
      </MapContainer>
      <LayerSwitcher
        value={layerType}
        onChange={setLayerType}
        customTileUrl={props.customTileUrl}
      />
      <ZoomHint zoom={zoom} />
    </div>
  );
}
