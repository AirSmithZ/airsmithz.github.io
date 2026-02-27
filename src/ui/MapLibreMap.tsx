/**
 * 室外地图 - MapLibre + react-map-gl 实现
 * 与 OutdoorMap（高德）功能对等：建筑多边形、点击进入室内、3D 模型
 * 模型使用 MapLibre MercatorCoordinate 与地图坐标系统一（WGS84 -> Web 墨卡托）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2290, 121.4737],
};

const PITCH_3D = 55;
const MODEL_URL = '/futuristic_building/scene.gltf';
const MODEL_SCALE = 10;

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
const BUILDING_TEXTURE_ID = 'building-texture';
const BUILDING_TOP_IMAGE = '/top.png';

function ZoomHint(props: { zoom: number }) {
  const canPick = props.zoom >= 17;
  return (
    <div className="wm-map-hint">
      <div className="wm-map-hint-title">室外地图（MapLibre）</div>
      <div className="wm-map-hint-sub">
        {canPick ? '现在可以点击建筑多边形进入室内。' : '请继续放大到街区/建筑级别（≥ 17）以启用点击。'}
      </div>
    </div>
  );
}

/** 创建 3D 模型自定义图层，坐标系：地图 [lng, lat] -> MercatorCoordinate */
function createModelLayer(modelOrigin: [number, number]): maplibregl.CustomLayerInterface {
  const modelAltitude = 0;
  const modelRotate: [number, number, number] = [Math.PI / 2, 0, 0];

  const modelAsMercator = maplibregl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);
  const modelTransform = {
    translateX: modelAsMercator.x,
    translateY: modelAsMercator.y,
    translateZ: modelAsMercator.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    scale: modelAsMercator.meterInMercatorCoordinateUnits() * MODEL_SCALE,
  };

  let camera: THREE.Camera;
  let scene: THREE.Scene;
  let renderer: THREE.WebGLRenderer;
  let mapInstance: maplibregl.Map;

  return {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd(map, gl) {
      camera = new THREE.Camera();
      scene = new THREE.Scene();
      mapInstance = map;

      const dirLight1 = new THREE.DirectionalLight(0xffffff);
      dirLight1.position.set(0, -70, 100).normalize();
      scene.add(dirLight1);

      const dirLight2 = new THREE.DirectionalLight(0xffffff);
      dirLight2.position.set(0, 70, 100).normalize();
      scene.add(dirLight2);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambient);

      const loader = new GLTFLoader();
      loader.load(MODEL_URL, (gltf) => {
        scene.add(gltf.scene);
      });

      renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true,
      });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (mapInstance.getZoom() < 17) return;

      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX,
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY,
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ,
      );

      const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ,
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale,
          ),
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);

      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      mapInstance.triggerRepaint();
    },
  };
}

export function MapLibreMap(props: { onBuildingClick: (b: Building) => void }) {
  const mapRef = useRef<MapRef>(null);
  const [lat, lng] = MOCK_BUILDING.center;
  const dLat = 0.0012;
  const dLng = 0.0016;
  const [zoom, setZoom] = useState(15);

  const modelOrigin: [number, number] = useMemo(() => [lng, lat], [lng, lat]);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (!map.hasImage(BUILDING_TEXTURE_ID)) {
      const img = new Image();
      img.crossOrigin = '';
      img.onload = () => {
        if (map.hasImage(BUILDING_TEXTURE_ID)) return;
        map.addImage(BUILDING_TEXTURE_ID, img);
      };
      img.src = BUILDING_TOP_IMAGE;
    }
    if (!map.getLayer('3d-model')) {
      const layer = createModelLayer(modelOrigin);
      map.addLayer(layer);
    }
  }, [modelOrigin]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const pitch = zoom >= 17 ? PITCH_3D : 0;
    map.easeTo({ pitch, duration: 400 });
  }, [zoom]);

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
      pitch: 0,
    }),
    [lat, lng],
  );

  const onPolygonClick = useCallback(
    (e: { features?: unknown[] }) => {
      if (e.features?.length && zoom >= 17) props.onBuildingClick(MOCK_BUILDING);
    },
    [props, zoom],
  );

  const onMove = useCallback(
    (evt: { viewState?: { zoom?: number } }) => {
      const vs = evt.viewState;
      if (vs?.zoom != null) setZoom(vs.zoom);
    },
    [],
  );

  const is3D = zoom >= 17;

  return (
    <div className="wm-map">
      <Map
        ref={mapRef}
        initialViewState={initialViewState}
        mapStyle={MAP_STYLE}
        style={{ width: '100%', height: '100%' }}
        onClick={onPolygonClick}
        onMove={onMove}
        onLoad={onMapLoad}
        interactiveLayerIds={['building-polygon']}
        canvasContextAttributes={{ antialias: true }}
      >
        <Source id="building-source" type="geojson" data={geojson}>
          <Layer
            id="building-polygon"
            type="fill"
            paint={
              is3D
                ? {
                    'fill-color': '#0ea5e9',
                    'fill-opacity': 0.32,
                  }
                : {
                    'fill-pattern': BUILDING_TEXTURE_ID,
                    'fill-opacity': 0.85,
                  }
            }
          />
          <Layer
            id="building-outline"
            type="line"
            paint={{
              'line-color': is3D ? '#7cf2b1' : '#64748b',
              'line-width': 3,
            }}
          />
        </Source>
        <NavigationControl position="top-right" showCompass showZoom visualizePitch />
      </Map>
      <ZoomHint zoom={zoom} />
    </div>
  );
}
