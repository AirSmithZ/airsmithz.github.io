import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Indoor2D } from './Indoor2D';
import { Indoor3D } from './Indoor3D';
import { OutdoorMap } from './OutdoorMap';
import { DevicePalette, type DeviceKind } from './DevicePalette';
import { Segmented } from './Segmented';
import type { Building, DevicePlacement, ViewMode } from './types';
import type { FloorPlan, FloorPlanElements } from './floorPlan';
import { elementsToFloorPlan } from './floorPlan';
import { clamp01 } from './utils/clamp';

const DEFAULT_BUILDING: Building = {
  id: 'building-a',
  name: 'Building A',
  center: [31.2304, 121.4737], // mock: Shanghai-ish
};

function getPointFromPointerEvent(e: unknown): { x: number; y: number } | null {
  // dnd-kit gives MouseEvent | TouchEvent | PointerEvent | KeyboardEvent
  if (e && typeof e === 'object' && 'clientX' in e && 'clientY' in e) {
    const anyE = e as { clientX: number; clientY: number };
    return { x: anyE.clientX, y: anyE.clientY };
  }
  return null;
}

function toNormalizedPoint(container: HTMLElement, client: { x: number; y: number }) {
  const rect = container.getBoundingClientRect();
  const nx = clamp01((client.x - rect.left) / rect.width);
  const ny = clamp01((client.y - rect.top) / rect.height);
  return { nx, ny };
}

export function App() {
  const [mode, setMode] = useState<ViewMode>('outdoor');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [floor, setFloor] = useState<number>(1);
  const [selectedIndoorPoint, setSelectedIndoorPoint] = useState<{ nx: number; ny: number } | null>(null);
  const [devices, setDevices] = useState<DevicePlacement[]>([]);
  const [floorPlanByFloor, setFloorPlanByFloor] = useState<Record<number, FloorPlan | null>>({});
  const [elementsByFloor, setElementsByFloor] = useState<Record<number, FloorPlanElements | null>>({});
  const [currentImageByFloor, setCurrentImageByFloor] = useState<Record<number, string>>({});
  const [floorPlanLoading, setFloorPlanLoading] = useState(false);
  const [floorPlanError, setFloorPlanError] = useState<string | null>(null);
  const [floorPlanPipeline, setFloorPlanPipeline] = useState<Record<string, unknown> | null>(null);

  const dropRef = useRef<HTMLDivElement | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const dropMapperRef = useRef<((client: { x: number; y: number }) => { nx: number; ny: number }) | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingKind, setDraggingKind] = useState<DeviceKind | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const viewModes = useMemo(
    () =>
      [
        { value: 'outdoor' as const, label: '室外' },
        { value: 'indoor2d' as const, label: '室内 2D' },
        { value: 'indoor3d' as const, label: '室内 3D' },
      ] satisfies Array<{ value: ViewMode; label: string }>,
    [],
  );

  const ensureIndoor = useCallback(() => {
    setSelectedBuilding((b) => b ?? DEFAULT_BUILDING);
    setMode('indoor2d');
  }, []);

  const handleEnter3D = useCallback(() => {
    const elements = elementsByFloor[floor];
    if (elements?.walls?.length) {
      const plan = elementsToFloorPlan(elements);
      setFloorPlanByFloor((p) => ({ ...p, [floor]: plan }));
    }
    setMode('indoor3d');
  }, [floor, elementsByFloor]);

  const handleBuildingClick = useCallback((b: Building) => {
    setSelectedBuilding(b);
    setMode('indoor2d');
  }, []);

  const handleGenerate3D = useCallback(
    async (floorNum: number) => {
      setFloorPlanError(null);
      setFloorPlanPipeline(null);
      setFloorPlanLoading(true);
      try {
        const res = await fetch('/map.png');
        const blob = await res.blob();
        const form = new FormData();
        form.append('file', blob, 'map.png');
        form.append('buildingId', selectedBuilding?.id ?? 'default');
        form.append('floorId', String(floorNum));
        const apiRes = await fetch('/api/floor-plan/from-image', {
          method: 'POST',
          body: form,
        });
        const data = await apiRes.json().catch(() => null);
        setFloorPlanPipeline(data?.pipeline ?? null);

        if (!apiRes.ok) {
          const err = data ?? { error: apiRes.statusText };
          throw new Error(err.error ?? err.detail ?? '生成失败');
        }
        const plan = data.floorPlan ?? data;
        setFloorPlanByFloor((prev) => ({ ...prev, [floorNum]: plan }));
        setMode('indoor3d');
      } catch (e) {
        setFloorPlanError(e instanceof Error ? e.message : '生成 3D 失败');
        setFloorPlanPipeline(null);
      } finally {
        setFloorPlanLoading(false);
      }
    },
    [selectedBuilding?.id],
  );

  const placeDeviceAt = useCallback(
    (kind: DeviceKind, nx: number, ny: number, placedIn3D?: boolean) => {
      setDevices((prev) => [
        ...prev,
        {
          id: `dev_${kind}_${Math.random().toString(16).slice(2)}`,
          kind,
          floor,
          nx,
          ny,
          placedIn3D,
        },
      ]);
    },
    [floor],
  );

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
    };
  }, [isDragging]);

  const onDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true);
    setDraggingKind((event.active.data.current?.kind as DeviceKind | undefined) ?? null);
    const pt = getPointFromPointerEvent(event.activatorEvent);
    if (pt) lastPointerRef.current = pt;
  }, []);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      setIsDragging(false);
      setDraggingKind(null);
      const kind = event.active.data.current?.kind as DeviceKind | undefined;
      if (!kind) return;

      // Use the last known pointer position while dragging, so releasing outside
      // the canvas still places the device back into the layer (clamped to edges).
      const pt = lastPointerRef.current ?? getPointFromPointerEvent(event.activatorEvent);
      if (!pt) return;

      const mapper = dropMapperRef.current;
      const container = dropRef.current;
      const { nx, ny } = mapper ? mapper(pt) : container ? toNormalizedPoint(container, pt) : { nx: 0.5, ny: 0.5 };
      placeDeviceAt(kind, nx, ny, mode === 'indoor3d');
    },
    [placeDeviceAt, mode],
  );

  const title = useMemo(() => {
    if (mode === 'outdoor') return '室外地图';
    if (mode === 'indoor2d') return `室内布局（楼层 ${floor}F）`;
    return `室内 3D（楼层 ${floor}F）`;
  }, [floor, mode]);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="wm-root">
        <header className="wm-topbar">
          <div className="wm-brand" onClick={() => setMode('outdoor')} role="button" tabIndex={0}>
            <div className="wm-brand-mark" aria-hidden />
            <div className="wm-brand-text">
              <div className="wm-brand-title">Map Demo</div>
              <div className="wm-brand-sub">高德地图 × Three.js × DnD</div>
            </div>
          </div>

          <div className="wm-topbar-center">
            <Segmented items={viewModes} value={mode} onChange={(v) => setMode(v as ViewMode)} />
          </div>

          <div className="wm-topbar-right">
            <button className="wm-btn wm-btn-ghost" onClick={() => setDevices([])}>
              清空设备
            </button>
          </div>
        </header>

        <div className="wm-body">
          <aside className="wm-sidebar">
            <div className="wm-card">
              <div className="wm-card-title">当前</div>
              <div className="wm-kv">
                <div className="wm-k">视图</div>
                <div className="wm-v">{title}</div>
              </div>
              <div className="wm-kv">
                <div className="wm-k">建筑</div>
                <div className="wm-v">{selectedBuilding?.name ?? '—'}</div>
              </div>
              <div className="wm-kv">
                <div className="wm-k">楼层</div>
                <div className="wm-v">
                  <div className="wm-floor">
                    {[1, 2, 3].map((f) => (
                      <button
                        key={f}
                        className={f === floor ? 'wm-chip wm-chip-active' : 'wm-chip'}
                        onClick={() => setFloor(f)}
                        disabled={mode === 'outdoor'}
                      >
                        {f}F
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="wm-kv">
                <div className="wm-k">设备数</div>
                <div className="wm-v">{devices.filter((d) => d.floor === floor).length}</div>
              </div>

              <div className="wm-divider" />

              <div className="wm-hint">
                {mode === 'outdoor' ? (
                  <div>
                    放大到能看见建筑后点击建筑进入室内。
                    <button className="wm-btn wm-btn-primary wm-btn-inline" onClick={ensureIndoor}>
                      直接进入室内（mock）
                    </button>
                  </div>
                ) : (
                  <div>
                    从下方拖拽设备到画布中放置；在室内 2D 点击位置可同步到 3D 选中。
                  </div>
                )}
              </div>
            </div>

            <div className="wm-card">
              <div className="wm-card-title">设备面板（拖拽添加）</div>
              <DevicePalette />
            </div>
          </aside>

          <main className="wm-stage">
            <div className="wm-stage-surface" ref={dropRef}>
              {mode === 'outdoor' && <OutdoorMap onBuildingClick={handleBuildingClick} />}
              {mode === 'indoor2d' && (
                <Indoor2D
                  building={selectedBuilding ?? DEFAULT_BUILDING}
                  floor={floor}
                  devices={devices}
                  onPickPoint={(p) => setSelectedIndoorPoint(p)}
                  onEnter3D={handleEnter3D}
                  onGenerate3D={handleGenerate3D}
                  generate3DLoading={floorPlanLoading}
                  generate3DError={floorPlanError}
                  pipeline={floorPlanPipeline}
                  elements={elementsByFloor[floor] ?? null}
                  currentImage={currentImageByFloor[floor] ?? undefined}
                  onElementsChange={(elements) => setElementsByFloor((p) => ({ ...p, [floor]: elements }))}
                  onCurrentImageChange={(image) => setCurrentImageByFloor((p) => ({ ...p, [floor]: image }))}
                  registerDropMapper={(fn) => {
                    dropMapperRef.current = fn;
                  }}
                />
              )}
              {mode === 'indoor3d' && (
                <Indoor3D
                  building={selectedBuilding ?? DEFAULT_BUILDING}
                  floor={floor}
                  devices={devices}
                  plan={floorPlanByFloor[floor] ?? null}
                  selectedPoint={selectedIndoorPoint}
                  onBackTo2D={() => setMode('indoor2d')}
                  registerDropMapper={(fn) => {
                    dropMapperRef.current = fn;
                  }}
                />
              )}
            </div>
          </main>
        </div>
      </div>
      <DragOverlay>
        {draggingKind ? (
          <div className="wm-drag-ghost">
            <div className="wm-drag-ghost-icon" aria-hidden>
              {draggingKind === 'camera' ? '⦿' : draggingKind === 'sensor' ? '◎' : '⌁'}
            </div>
            <div className="wm-drag-ghost-text">{draggingKind === 'camera' ? '摄像头' : draggingKind === 'sensor' ? '传感器' : 'AP'}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

