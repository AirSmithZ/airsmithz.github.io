/**
 * 室外地图切换器：高德地图 / MapLibre / OpenLayers
 * 提供切换按钮，根据选择渲染对应地图组件
 */
import { useState } from 'react';

import { OutdoorMap } from './OutdoorMap';
import { MapLibreMap } from './MapLibreMap';
import { OpenLayersMap } from './OpenLayersMap';
import type { Building } from './types';

export type MapProvider = 'amap' | 'maplibre' | 'openlayers';

export function OutdoorMapSwitcher(props: { onBuildingClick: (b: Building) => void }) {
  const [provider, setProvider] = useState<MapProvider>('amap');

  return (
    <div className="wm-map-switcher">
      <div className="wm-map-switcher-toggle">
        <button
          type="button"
          className={provider === 'amap' ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => setProvider('amap')}
        >
          高德地图
        </button>
        <button
          type="button"
          className={provider === 'maplibre' ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => setProvider('maplibre')}
        >
          MapLibre
        </button>
        <button
          type="button"
          className={provider === 'openlayers' ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => setProvider('openlayers')}
        >
          OpenLayers
        </button>
      </div>
      <div className="wm-map-switcher-content">
        {provider === 'amap' && <OutdoorMap onBuildingClick={props.onBuildingClick} />}
        {provider === 'maplibre' && <MapLibreMap onBuildingClick={props.onBuildingClick} />}
        {provider === 'openlayers' && <OpenLayersMap onBuildingClick={props.onBuildingClick} />}
      </div>
    </div>
  );
}
