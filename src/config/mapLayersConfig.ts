/**
 * 地图图层配色配置
 * 用于自定义图层（水系、陆地、路网、建筑、植被等）的填充色与描边色
 * 基于 OpenMapTiles 矢量瓦片 schema，通过 source-layer + class 与配置对应
 */
export interface MapLayerStyle {
  id: string;
  label: string;
  fillColor: string;
  strokeColor: string;
}

/**
 * 矢量瓦片图层属性映射（OpenMapTiles schema）
 * 定义 MAP_LAYERS_CONFIG 与 source-layer、class 的对应关系
 */
export interface MapLayerAttributeMapping {
  configId: MapLayerStyle['id'];
  sourceLayer: string;
  /** transportation.class: motorway|trunk|primary|secondary|tertiary|minor|service|track|path 等 */
  class?: string | string[];
}

export const MAP_LAYER_ATTRIBUTES: MapLayerAttributeMapping[] = [
  { configId: 'water-system', sourceLayer: 'water', class: undefined },
  { configId: 'water-system', sourceLayer: 'waterway', class: undefined },
  { configId: 'land', sourceLayer: 'landuse', class: 'residential' },
  { configId: 'land', sourceLayer: 'transportation', class: 'pier' },
  { configId: 'primary-road', sourceLayer: 'transportation', class: ['motorway', 'trunk', 'primary'] },
  { configId: 'secondary-road', sourceLayer: 'transportation', class: 'secondary' },
  { configId: 'tertiary-road', sourceLayer: 'transportation', class: ['tertiary', 'minor', 'service', 'track', 'path'] },
  { configId: 'buildings', sourceLayer: 'building', class: undefined },
  { configId: 'vegetation', sourceLayer: 'park', class: undefined },
  { configId: 'vegetation', sourceLayer: 'landcover', class: ['wood', 'grass'] },
];

/** 自定义配色1：原彩色方案（水系蓝、植被绿） */
export const MAP_LAYERS_CONFIG: MapLayerStyle[] = [
  { id: 'water-system', label: '水系', fillColor: '#B0E6FD', strokeColor: '#B0E6FD' },
  { id: 'land', label: '陆地', fillColor: '#FEFEF4', strokeColor: '#FEFEF4' },
  { id: 'primary-road', label: '一级路网', fillColor: '#D5D5D3', strokeColor: '#C1C1BB' },
  { id: 'secondary-road', label: '二级路网', fillColor: '#DADAD2', strokeColor: '#DADAD2' },
  { id: 'tertiary-road', label: '三级路网', fillColor: '#E5E4DE', strokeColor: '#E5E4DE' },
  { id: 'buildings', label: '建筑', fillColor: '#EDEAE4', strokeColor: '#EDEAE4' },
  { id: 'vegetation', label: '植被', fillColor: '#D4E9C1', strokeColor: '#D4E9C1' },
];

/** 自定义配色2：灰度方案（图片配色） */
export const MAP_LAYERS_CONFIG_2: MapLayerStyle[] = [
  { id: 'water-system', label: '水系', fillColor: '#D7D7D7', strokeColor: '#D7D7D7' },
  { id: 'land', label: '陆地', fillColor: '#F5F5F5', strokeColor: '#F5F5F5' },
  { id: 'primary-road', label: '一级路网', fillColor: '#D3D3D3', strokeColor: '#C8C8C8' },
  { id: 'secondary-road', label: '二级路网', fillColor: '#F0F0F0', strokeColor: '#CBCBCB' },
  { id: 'tertiary-road', label: '三级路网', fillColor: '#F0F0F0', strokeColor: '#CBCBCB' },
  { id: 'buildings', label: '建筑', fillColor: '#EDEDED', strokeColor: '#EDEDED' },
  { id: 'vegetation', label: '植被', fillColor: '#CECECE', strokeColor: '#CECECE' },
];

/** 自定义配色3：图片配色（水系蓝、陆地米白、路网橙黄、建筑米褐、植被浅绿） */
export const MAP_LAYERS_CONFIG_3: MapLayerStyle[] = [
  { id: 'water-system', label: '水系', fillColor: '#B1D8F6', strokeColor: '#B1D8F6' },
  { id: 'land', label: '陆地', fillColor: '#F7F1EA', strokeColor: '#F7F1EA' },
  { id: 'primary-road', label: '一级路网', fillColor: '#FBC474', strokeColor: '#E39B64' },
  { id: 'secondary-road', label: '二级路网', fillColor: '#FCED92', strokeColor: '#E39B64' },
  { id: 'tertiary-road', label: '三级路网', fillColor: '#FCED92', strokeColor: '#E39B64' },
  { id: 'buildings', label: '建筑', fillColor: '#EFE5DB', strokeColor: '#EFE5DB' },
  { id: 'vegetation', label: '植被', fillColor: '#E2ECC6', strokeColor: '#E2ECC6' },
];

/** 自定义配色4：图片配色（水系蓝、陆地米白、路网橙黄、建筑米褐、植被浅绿） */
export const MAP_LAYERS_CONFIG_4: MapLayerStyle[] = [
  { id: 'water-system', label: '水系', fillColor: '#B1D8F6', strokeColor: '#B1D8F6' },
  { id: 'land', label: '陆地', fillColor: '#F7F1EA', strokeColor: '#F7F1EA' },
  { id: 'primary-road', label: '一级路网', fillColor: '#FBC474', strokeColor: '#E39B64' },
  { id: 'secondary-road', label: '二级路网', fillColor: '#FCED92', strokeColor: '#E39B64' },
  { id: 'tertiary-road', label: '三级路网', fillColor: '#FCED92', strokeColor: '#E39B64' },
  { id: 'buildings', label: '建筑', fillColor: '#EFE5DB', strokeColor: '#EFE5DB' },
  { id: 'vegetation', label: '植被', fillColor: '#E2ECC6', strokeColor: '#E2ECC6' },
];

export type CustomStylePresetId = 'custom-style' | 'custom-style-2' | 'custom-style-3' | 'custom-style-4';

/** 自定义配色预设列表 */
export const CUSTOM_STYLE_PRESETS: { id: CustomStylePresetId; label: string; config: MapLayerStyle[] }[] = [
  { id: 'custom-style', label: '自定义配色1', config: MAP_LAYERS_CONFIG },
  { id: 'custom-style-2', label: '自定义配色2', config: MAP_LAYERS_CONFIG_2 },
  { id: 'custom-style-3', label: '自定义配色3', config: MAP_LAYERS_CONFIG_3 },
  { id: 'custom-style-4', label: '自定义配色4', config: MAP_LAYERS_CONFIG_4 },
];

/** 自定义配色通用配置 */
export const CUSTOM_STYLE_LAYER = {
  vectorSourceUrl: 'https://tiles.openfreemap.org/planet',
  available: true,
} as const;

/** 根据 id 从指定配置获取图层样式 */
export function getMapLayerStyle(id: MapLayerStyle['id'], config = MAP_LAYERS_CONFIG): MapLayerStyle | undefined {
  return config.find((ly) => ly.id === id);
}

/** 根据预设 id 获取配色配置 */
export function getConfigByPresetId(presetId: CustomStylePresetId): MapLayerStyle[] {
  return CUSTOM_STYLE_PRESETS.find((p) => p.id === presetId)?.config ?? MAP_LAYERS_CONFIG;
}

/** 生成应用指定配置的自定义 MapLibre 样式 */
export function getCustomMapStyle(presetId: CustomStylePresetId = 'custom-style') {
  const config = getConfigByPresetId(presetId);
  const water = getMapLayerStyle('water-system', config)!;
  const land = getMapLayerStyle('land', config)!;
  const primary = getMapLayerStyle('primary-road', config)!;
  const secondary = getMapLayerStyle('secondary-road', config)!;
  const tertiary = getMapLayerStyle('tertiary-road', config)!;
  const building = getMapLayerStyle('buildings', config)!;
  const vegetation = getMapLayerStyle('vegetation', config)!;

  return {
    version: 8,
    sources: {
      openmaptiles: {
        type: 'vector',
        url: CUSTOM_STYLE_LAYER.vectorSourceUrl,
      },
    },
    sprite: 'https://tiles.openfreemap.org/sprites/ofm_f384/ofm',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': land.fillColor } },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false],
        paint: { 'fill-color': vegetation.fillColor, 'fill-antialias': true },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: { 'fill-color': water.fillColor, 'fill-antialias': true },
      },
      {
        id: 'landcover_vegetation',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['match', ['get', 'class'], ['wood', 'grass'], true, false]],
        paint: { 'fill-color': vegetation.fillColor, 'fill-antialias': true },
      },
      {
        id: 'landuse_residential',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['all', ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], ['==', ['get', 'class'], 'residential']],
        paint: { 'fill-color': land.fillColor, 'fill-opacity': 0.8 },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        filter: ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': water.strokeColor, 'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 10, 1, 20, 4] },
      },
      {
        id: 'road_tertiary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['match', ['get', 'class'], ['tertiary', 'minor', 'service', 'track', 'path'], true, false]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': tertiary.fillColor,
          'line-width': ['interpolate', ['exponential', 1.2], ['zoom'], 13, 1, 20, 10],
        },
      },
      {
        id: 'road_secondary_casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['==', ['get', 'class'], 'secondary']],
        layout: { 'line-cap': 'butt', 'line-join': 'miter' },
        paint: {
          'line-color': secondary.strokeColor,
          'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 10, 3, 20, 23],
        },
      },
      {
        id: 'road_secondary_inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['==', ['get', 'class'], 'secondary']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': secondary.fillColor,
          'line-width': ['interpolate', ['exponential', 1.3], ['zoom'], 10, 2, 20, 20],
        },
      },
      {
        id: 'road_primary_casing',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false]],
        layout: { 'line-cap': 'butt', 'line-join': 'miter' },
        paint: {
          'line-color': primary.strokeColor,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 6, 3, 20, 40],
        },
      },
      {
        id: 'road_primary_inner',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['all', ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false], ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': primary.fillColor,
          'line-width': ['interpolate', ['exponential', 1.4], ['zoom'], 4, 2, 20, 30],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 12,
        paint: {
          'fill-color': building.fillColor,
          'fill-outline-color': building.strokeColor,
          'fill-antialias': true,
        },
      },
    ],
  };
}
