/**
 * 室外地图 - Cesium 3D 实现，底图使用天地图
 * 天地图 Web 墨卡托投影 (EPSG:3857) 与 Cesium 地理坐标系 (WGS84) 自动转换
 * 与 OutdoorMap（高德）功能对等：建筑多边形、点击进入室内、zoom 控制、俯仰角度
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Viewer,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  Cartesian3,
  Color,
  PolygonGeometry,
  PolygonHierarchy,
  GeometryInstance,
  Primitive,
  PerInstanceColorAppearance,
  ColorGeometryInstanceAttribute,
  defined,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Cartesian2,
  Math as CesiumMath,
  SceneMode,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

import type { Building, LatLng } from './types';

const MOCK_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2290, 121.4737],
};

const PITCH_3D = 55;
const TIANDITU_TOKEN = import.meta.env.VITE_TIANDITU_TOKEN ?? '';

/** 天地图 Web 墨卡托瓦片 URL（_w 后缀 = EPSG:3857，与 Cesium WebMercatorTilingScheme 一致） */
const TIANDITU_IMG_W = `https://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${TIANDITU_TOKEN}`;
const TIANDITU_VEC_W = `https://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${TIANDITU_TOKEN}`;
const TIANDITU_CVA_W = `https://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${TIANDITU_TOKEN}`;
const TIANDITU_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

/** [lat, lng] -> Cesium 经纬度环 [lng, lat]（经度在前） */
function toCesiumRing([lat, lng]: LatLng, dLat: number, dLng: number): number[][] {
  return [
    [lng - dLng, lat - dLat],
    [lng - dLng, lat + dLat],
    [lng + dLng, lat + dLat],
    [lng + dLng, lat - dLat],
    [lng - dLng, lat - dLat],
  ];
}

function ZoomHint(props: { zoom: number; is3D: boolean; hasToken: boolean }) {
  const canPick = props.zoom >= 17;
  return (
    <div className="wm-map-hint">
      <div className="wm-map-hint-title">室外地图（Cesium + 天地图）</div>
      <div className="wm-map-hint-sub">
        {!props.hasToken
          ? '请设置 VITE_TIANDITU_TOKEN 环境变量以加载天地图瓦片。'
          : props.is3D
            ? canPick
              ? '现在可以点击建筑多边形进入室内。拖拽调整俯仰/旋转。'
              : '请继续放大到街区/建筑级别（≥ 17）以启用点击。'
            : '2D 模式：拖拽旋转。切换 3D 可启用俯仰视角。'}
      </div>
    </div>
  );
}

function createTiandituProvider(url: string, layerType: string) {
  if (!TIANDITU_TOKEN) return null;
  return new UrlTemplateImageryProvider({
    url,
    subdomains: TIANDITU_SUBDOMAINS,
    tilingScheme: new WebMercatorTilingScheme(),
    maximumLevel: 18,
    credit: `天地图 ${layerType}`,
  });
}

export function OpenLayersMap(props: { onBuildingClick: (b: Building) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const primitiveRef = useRef<Primitive | null>(null);
  const onBuildingClickRef = useRef(props.onBuildingClick);
  onBuildingClickRef.current = props.onBuildingClick;

  const [lat, lng] = MOCK_BUILDING.center;
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [zoom, setZoom] = useState(15);
  const [bearing, setBearing] = useState(0);
  const [longitude, setLongitude] = useState(lng);
  const [latitude, setLatitude] = useState(lat);

  const dLat = 0.0012;
  const dLng = 0.0016;

  const centerCartesian = useMemo(
    () => Cartesian3.fromDegrees(lng, lat, 100),
    [lng, lat],
  );

  const polygonPositions = useMemo(() => {
    const ring = toCesiumRing([lat, lng], dLat, dLng);
    return ring.map(([lon, lat]) => Cartesian3.fromDegrees(lon, lat, 0));
  }, [lat, lng]);

  const is3D = viewMode === '3d' && zoom >= 17;
  const effectivePitch = is3D ? CesiumMath.toRadians(PITCH_3D) : 0;

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer(containerRef.current, {
      terrainProvider: undefined,
      useDefaultRenderLoop: true,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
    });

    viewerRef.current = viewer;

    const scene = viewer.scene;
    const camera = viewer.camera;

    if (TIANDITU_TOKEN) {
      viewer.imageryLayers.removeAll();
      const imgProvider = createTiandituProvider(TIANDITU_IMG_W, '影像');
      const vecProvider = createTiandituProvider(TIANDITU_VEC_W, '矢量');
      const cvaProvider = createTiandituProvider(TIANDITU_CVA_W, '注记');
      if (imgProvider) viewer.imageryLayers.addImageryProvider(imgProvider);
      if (vecProvider) viewer.imageryLayers.addImageryProvider(vecProvider);
      if (cvaProvider) viewer.imageryLayers.addImageryProvider(cvaProvider);
    }

    camera.setView({
      destination: centerCartesian,
      orientation: {
        heading: bearing,
        pitch: effectivePitch,
        roll: 0,
      },
    });

    const hierarchy = new PolygonHierarchy(polygonPositions);
    const geometry = new PolygonGeometry({
      polygonHierarchy: hierarchy,
      height: 0,
      extrudedHeight: is3D ? 50 : 0,
      vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
    });

    const instance = new GeometryInstance({
      geometry,
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(
          is3D ? Color.fromCssColorString('rgba(14, 165, 233, 0.32)') : Color.fromCssColorString('rgba(51, 65, 85, 0.18)'),
        ),
      },
    });

    const primitive = new Primitive({
      geometryInstances: instance,
      appearance: new PerInstanceColorAppearance({
        flat: true,
        translucent: true,
        closed: false,
      }),
      asynchronous: false,
    });

    scene.primitives.add(primitive);
    primitiveRef.current = primitive;

    const handler = new ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((movement: { position: Cartesian2 }) => {
      const hit = scene.pick(movement.position);
      if (defined(hit) && hit.object === primitiveRef.current) {
        const z = camera.getMagnitude();
        const zoomLevel = Math.round(14.5 - Math.log2(z / 100));
        if (zoomLevel >= 17) onBuildingClickRef.current(MOCK_BUILDING);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    const onMoveEnd = () => {
      const pos = camera.positionCartographic;
      if (pos) {
        setLongitude(CesiumMath.toDegrees(pos.longitude));
        setLatitude(CesiumMath.toDegrees(pos.latitude));
        setBearing(camera.heading);
        const z = camera.getMagnitude();
        setZoom(Math.round(14.5 - Math.log2(z / 100)));
      }
    };

    viewer.camera.moveEnd.addEventListener(onMoveEnd);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
      primitiveRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const scene = viewer.scene;
    const camera = viewer.camera;

    scene.mode = viewMode === '2d' ? SceneMode.SCENE2D : SceneMode.SCENE3D;

    const dest = Cartesian3.fromDegrees(longitude, latitude, 100);
    camera.setView({
      destination: dest,
      orientation: {
        heading: bearing,
        pitch: effectivePitch,
        roll: 0,
      },
    });
  }, [viewMode, longitude, latitude, bearing, effectivePitch]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const primitive = primitiveRef.current;
    if (!viewer || !primitive) return;

    const scene = viewer.scene;
    scene.primitives.remove(primitive);

    const hierarchy = new PolygonHierarchy(polygonPositions);
    const geometry = new PolygonGeometry({
      polygonHierarchy: hierarchy,
      height: 0,
      extrudedHeight: is3D ? 50 : 0,
      vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
    });

    const instance = new GeometryInstance({
      geometry,
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(
          is3D ? Color.fromCssColorString('rgba(14, 165, 233, 0.32)') : Color.fromCssColorString('rgba(51, 65, 85, 0.18)'),
        ),
      },
    });

    const newPrimitive = new Primitive({
      geometryInstances: instance,
      appearance: new PerInstanceColorAppearance({
        flat: true,
        translucent: true,
        closed: false,
      }),
      asynchronous: false,
    });

    scene.primitives.add(newPrimitive);
    primitiveRef.current = newPrimitive;
  }, [polygonPositions, is3D]);

  return (
    <div className="wm-map">
      <div ref={containerRef} className="wm-map-canvas" style={{ width: '100%', height: '100%' }} />
      <div className="wm-map-3d-toggle">
        <button
          type="button"
          className={viewMode === '2d' ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => setViewMode('2d')}
        >
          2D
        </button>
        <button
          type="button"
          className={viewMode === '3d' ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => setViewMode('3d')}
        >
          3D
        </button>
      </div>
      <ZoomHint zoom={zoom} is3D={viewMode === '3d'} hasToken={!!TIANDITU_TOKEN} />
    </div>
  );
}
