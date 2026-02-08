import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import type { Building, DevicePlacement } from './types';
import type { FloorPlan } from './floorPlan';

const WALL_COLOR = '#2a3a63';
const FLOOR_COLOR = '#0b1225';

function nToWorld(bounds: { w: number; h: number }, nx: number, ny: number) {
  const x = (nx - 0.5) * bounds.w;
  const z = (0.5 - ny) * bounds.h;
  return { x, z };
}

function FloorPlane(props: { bounds: { w: number; h: number } }) {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[props.bounds.w, props.bounds.h]} />
      <meshStandardMaterial color={FLOOR_COLOR} roughness={0.95} metalness={0.0} />
    </mesh>
  );
}

function WallMesh(props: { bounds: { w: number; h: number }; wall: FloorPlan['walls'][number] }) {
  const { wall, bounds } = props;
  const a = nToWorld(bounds, wall.x1, wall.y1);
  const b = nToWorld(bounds, wall.x2, wall.y2);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const t = Math.max(0.06, wall.thickness * Math.min(bounds.w, bounds.h));
  const height = wall.height;
  const cx = (a.x + b.x) / 2;
  const cz = (a.z + b.z) / 2;

  return (
    <mesh position={[cx, height / 2, cz]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[len, height, t]} />
      <meshStandardMaterial color={WALL_COLOR} roughness={0.92} metalness={0.0} emissive={'#0a1022'} emissiveIntensity={0.35} />
    </mesh>
  );
}

function DragDropMapper(props: {
  bounds: { w: number; h: number };
  registerDropMapper: (fn: ((client: { x: number; y: number }) => { nx: number; ny: number }) | null) => void;
}) {
  const { camera, gl } = useThree();

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0
    const hit = new THREE.Vector3();

    props.registerDropMapper((client) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((client.x - rect.left) / rect.width) * 2 - 1;
      const y = -(((client.y - rect.top) / rect.height) * 2 - 1);

      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const ok = raycaster.ray.intersectPlane(plane, hit);
      if (!ok) return { nx: 0.5, ny: 0.5 };

      const nx = Math.max(0, Math.min(1, hit.x / props.bounds.w + 0.5));
      const ny = Math.max(0, Math.min(1, 0.5 - hit.z / props.bounds.h));
      return { nx, ny };
    });

    return () => props.registerDropMapper(null);
  }, [camera, gl, props]);

  return null;
}

function DeviceMesh(props: { bounds: { w: number; h: number }; d: DevicePlacement }) {
  const x = (props.d.nx - 0.5) * props.bounds.w;
  const z = (0.5 - props.d.ny) * props.bounds.h;

  const color = props.d.kind === 'camera' ? '#22c55e' : props.d.kind === 'sensor' ? '#60a5fa' : '#f59e0b';

  return (
    <group position={[x, 0.2, z]}>
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {props.d.kind === 'camera' ? (
        <mesh position={[0, 0.12, 0.18]} rotation-x={Math.PI * 0.12} castShadow>
          <coneGeometry args={[0.12, 0.24, 16]} />
          <meshStandardMaterial color="#16a34a" />
        </mesh>
      ) : null}
    </group>
  );
}

function SelectedMarker(props: { bounds: { w: number; h: number }; p: { nx: number; ny: number } }) {
  const x = (props.p.nx - 0.5) * props.bounds.w;
  const z = (0.5 - props.p.ny) * props.bounds.h;
  return (
    <group position={[x, 0.01, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.15, 0.22, 32]} />
        <meshBasicMaterial color="#e2e8f0" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

const EMPTY_PLAN: FloorPlan = {
  bounds: { w: 12, h: 10 },
  walls: [],
  openings: [],
  furniture: [],
};

export function Indoor3D(props: {
  building: Building;
  floor: number;
  devices: DevicePlacement[];
  plan: FloorPlan | null;
  selectedPoint: { nx: number; ny: number } | null;
  onBackTo2D: () => void;
  registerDropMapper: (fn: ((client: { x: number; y: number }) => { nx: number; ny: number }) | null) => void;
}) {
  const devicesOnFloor = useMemo(() => props.devices.filter((d) => d.floor === props.floor), [props.devices, props.floor]);
  const plan = props.plan ?? EMPTY_PLAN;

  return (
    <div className="wm-indoor3d">
      <div className="wm-indoor3d-top">
        <div>
          <div className="wm-indoor2d-title">{props.building.name}</div>
          <div className="wm-indoor2d-sub">室内 3D（由 2D 平面数据生成：墙/门/窗 + 家具立方体；拖拽设备到画布放置）</div>
        </div>
        <div className="wm-indoor2d-actions">
          <div className="wm-badge">{props.floor}F</div>
          <button className="wm-btn wm-btn-ghost" onClick={props.onBackTo2D}>
            返回 2D
          </button>
        </div>
      </div>

      <div className="wm-indoor3d-canvas">
        <Canvas
          shadows
          camera={{ position: [0, 7.6, 8.8], fov: 45, near: 0.1, far: 100 }}
          dpr={[1, 1.5]}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.65;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <color attach="background" args={['#111a38']} />
          <ambientLight intensity={1.35} />
          <hemisphereLight intensity={0.85} color={'#e0e7ff'} groundColor={'#0b1020'} />
          <directionalLight position={[6, 10, 4]} intensity={2.0} castShadow shadow-mapSize={[2048, 2048]} />

          <FloorPlane bounds={plan.bounds} />
          <DragDropMapper bounds={plan.bounds} registerDropMapper={props.registerDropMapper} />

          {plan.walls.map((w) => (
            <WallMesh key={w.id} bounds={plan.bounds} wall={w} />
          ))}

          {devicesOnFloor.map((d) => (
            <DeviceMesh key={d.id} bounds={plan.bounds} d={d} />
          ))}

          {props.selectedPoint ? <SelectedMarker bounds={plan.bounds} p={props.selectedPoint} /> : null}

          <gridHelper args={[plan.bounds.w, plan.bounds.w, '#22314f', '#121a2c']} position={[0, 0.001, 0]} />
          <OrbitControls makeDefault minDistance={5} maxDistance={18} maxPolarAngle={Math.PI * 0.49} />
        </Canvas>
      </div>
    </div>
  );
}

