import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Building, DevicePlacement } from './types';
import type { FloorPlanElements } from './floorPlan';

type PipelineStage = {
  status: string;
  rawContent?: string | null;
  raw?: { bounds?: object; wallsCount?: number } | null;
  error?: string | null;
  assumptions?: string[];
};

type Pipeline = {
  skillA?: PipelineStage;
  skillC?: PipelineStage;
  skillD?: PipelineStage;
  skillE?: PipelineStage;
};

/** public/CADimages 下可切换的平面图 */
const CAD_IMAGES = [
  { value: '/CADimages/water.png', label: 'water' },
  { value: '/CADimages/water2.png', label: 'water2' },
  { value: '/CADimages/water3.png', label: 'water3' },
  { value: '/CADimages/water4.png', label: 'water4' },
  { value: '/map.png', label: 'map' },
];

function pointsToStyle(nx: number, ny: number) {
  return {
    left: `${nx * 100}%`,
    top: `${ny * 100}%`,
  } as const;
}

const DEFAULT_CAD_IMAGE = CAD_IMAGES[0].value;

export function Indoor2D(props: {
  building: Building;
  floor: number;
  devices: DevicePlacement[];
  onPickPoint: (p: { nx: number; ny: number }) => void;
  onEnter3D: () => void;
  onGenerate3D: (floor: number) => void;
  generate3DLoading?: boolean;
  generate3DError?: string | null;
  pipeline?: Pipeline | null;
  elements?: FloorPlanElements | null;
  currentImage?: string;
  onElementsChange?: (elements: FloorPlanElements | null) => void;
  onCurrentImageChange?: (image: string) => void;
  registerDropMapper: (fn: ((client: { x: number; y: number }) => { nx: number; ny: number }) | null) => void;
}) {
  const [showPipeline, setShowPipeline] = useState(false);
  const currentImage = props.currentImage ?? DEFAULT_CAD_IMAGE;
  const elements = props.elements ?? null;
  const [elementsLoading, setElementsLoading] = useState(false);
  const [elementsError, setElementsError] = useState<string | null>(null);
  const [imgAspect, setImgAspect] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /** 图片加载后更新宽高比，用于 overlay 与 object-fit:contain 的显示区域对齐 */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImgAspect(img.naturalWidth / img.naturalHeight);
      }
    };
    if (img.complete) onLoad();
    else img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [currentImage]);

  /** 使用当前选中的平面图 + generate_2d_opencv 逻辑渲染墙体（颜色+线宽，不调 LLM） */
  const handleRenderOpencv = useCallback(async () => {
    setElementsError(null);
    setElementsLoading(true);
    try {
      const res = await fetch(currentImage);
      const blob = await res.blob();
      const filename = currentImage.split('/').pop() ?? 'map.png';
      const form = new FormData();
      form.append('file', blob, filename);
      const apiRes = await fetch('/api/floor-plan/elements?engine=opencv', { method: 'POST', body: form });
      const data = await apiRes.json().catch(() => null);
      if (!apiRes.ok) {
        throw new Error(data?.detail ?? data?.error ?? 'opencv渲染');
      }
      props.onElementsChange?.(data);
    } catch (e) {
      setElementsError(e instanceof Error ? e.message : 'opencv渲染失败');
      props.onElementsChange?.(null);
    } finally {
      setElementsLoading(false);
    }
  }, [currentImage, props.onElementsChange]);

  /** 基于 wall.md 像素级分析：预处理→图案特征(ANSI31/AR-CONC/SOLID)→几何验证 */
  const handleRenderPattern = useCallback(async () => {
    setElementsError(null);
    setElementsLoading(true);
    try {
      const res = await fetch(currentImage);
      const blob = await res.blob();
      const filename = currentImage.split('/').pop() ?? 'map.png';
      const form = new FormData();
      form.append('file', blob, filename);
      const apiRes = await fetch('/api/floor-plan/elements?engine=pattern', { method: 'POST', body: form });
      const data = await apiRes.json().catch(() => null);
      if (!apiRes.ok) {
        throw new Error(data?.detail ?? data?.error ?? '像素分析');
      }
      props.onElementsChange?.(data);
    } catch (e) {
      setElementsError(e instanceof Error ? e.message : '像素分析失败');
      props.onElementsChange?.(null);
    } finally {
      setElementsLoading(false);
    }
  }, [currentImage, props.onElementsChange]);

  const floorLabel = `${props.floor}F`;
  const devicesOnFloor = useMemo(() => props.devices.filter((d) => d.floor === props.floor), [props.devices, props.floor]);

  /** 优先用后端 image_size（与坐标归一化一致），否则用图片 natural 尺寸 */
  const displayAspect = useMemo(() => {
    if (elements?.image_size && elements.image_size[0] > 0 && elements.image_size[1] > 0) {
      return elements.image_size[0] / elements.image_size[1];
    }
    return imgAspect;
  }, [elements?.image_size, imgAspect]);

  useEffect(() => {
    props.registerDropMapper((client) => {
      const img = imgRef.current;
      const host = ref.current;
      if (!img || !host) return { nx: 0.5, ny: 0.5 };
      const r = img.getBoundingClientRect();
      // If image isn't laid out yet, fall back to host rect.
      const rect = r.width > 0 && r.height > 0 ? r : host.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (client.x - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (client.y - rect.top) / rect.height));
      return { nx, ny };
    });
    return () => props.registerDropMapper(null);
  }, [props]);

  return (
    <div className="wm-indoor2d">
      <div className="wm-indoor2d-top">
        <div>
          <div className="wm-indoor2d-title">{props.building.name}</div>
          <div className="wm-indoor2d-sub">室内平面图（点击选点，拖拽设备到画布放置）</div>
        </div>
        <div className="wm-indoor2d-actions">
          <div className="wm-badge">{floorLabel}</div>
          <div className="wm-indoor2d-image-switch" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--wm-muted, #64748b)' }}>平面图:</span>
            {CAD_IMAGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`wm-btn wm-btn-ghost ${currentImage === value ? 'wm-btn-primary' : ''}`}
                style={{ fontSize: 12, padding: '4px 8px' }}
                onClick={() => {
                  props.onCurrentImageChange?.(value);
                  props.onElementsChange?.(null);
                }}
                title={value}
              >
                {label}
              </button>
            ))}
          </div>
          {/* <button
            className="wm-btn wm-btn-primary"
            onClick={() => props.onGenerate3D(props.floor)}
            disabled={props.generate3DLoading}
            title="调用后端接口根据当前平面图生成 3D 建模"
          >
            {props.generate3DLoading ? '生成中…' : '生成3D建模'}
          </button> */}
          <button className="wm-btn wm-btn-ghost" onClick={props.onEnter3D} title="进入已生成的 3D 视图">
            进入 3D
          </button>
          <button
            className="wm-btn wm-btn-ghost"
            onClick={handleRenderOpencv}
            disabled={elementsLoading}
            title="颜色+线宽区分墙体（generate_2d_opencv）"
          >
            opencv渲染
          </button>
          <button
            className="wm-btn wm-btn-ghost"
            onClick={handleRenderPattern}
            disabled={elementsLoading}
            title="像素级图案分析：预处理→ANSI31/AR-CONC/SOLID→几何验证（wall.md）"
          >
            {elementsLoading ? '分析中…' : '像素分析'}
          </button>
        </div>
      </div>

      {props.generate3DError ? (
        <div className="wm-indoor2d-error" role="alert">
          {props.generate3DError}
        </div>
      ) : null}
      {elementsError ? (
        <div className="wm-indoor2d-error" role="alert">
          {elementsError}
        </div>
      ) : null}
      {props.pipeline ? (
        <div className="wm-indoor2d-pipeline">
          <button
            type="button"
            className="wm-btn wm-btn-ghost"
            onClick={() => setShowPipeline((s) => !s)}
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            {showPipeline ? '收起' : '展开'} 管线详情
          </button>
          {showPipeline && (
            <div className="wm-pipeline-detail" style={{ marginTop: 8, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 12 }}>
              {['skillA', 'skillC', 'skillD', 'skillE'].map((key) => {
                const s = props.pipeline?.[key as keyof Pipeline];
                if (!s) return null;
                return (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <strong>{key}</strong>: {s.status}
                    {s.error ? <span style={{ color: '#f87171' }}> — {s.error}</span> : null}
                    {s.raw?.wallsCount != null ? <span> (墙段: {s.raw.wallsCount})</span> : null}
                    {s.rawContent && s.status === 'parse_failed' ? (
                      <pre style={{ marginTop: 4, overflow: 'auto', maxHeight: 120, fontSize: 11 }}>{s.rawContent}</pre>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      <div
        className="wm-indoor2d-canvas"
        ref={ref}
        onClick={(e) => {
          const el = ref.current;
          if (!el) return;
          const img = imgRef.current;
          const rect = img?.getBoundingClientRect().width ? img.getBoundingClientRect() : el.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width;
          const ny = (e.clientY - rect.top) / rect.height;
          props.onPickPoint({ nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) });
        }}
      >
        <div
          className="wm-indoor2d-inner"
          style={
            displayAspect != null
              ? { aspectRatio: `${displayAspect}` }
              : undefined
          }
        >
          <img ref={imgRef} className="wm-indoor2d-img" src={currentImage} alt="Indoor layout" draggable={false} />

          <div className="wm-indoor2d-overlay">
            {elements ? (
              <svg
                className="wm-indoor2d-elements-svg"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
              {(elements.zones ?? []).map((poly, i) => (
                <polygon
                  key={`z-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(96, 165, 250, 0.12)"
                  stroke="rgba(96, 165, 250, 0.5)"
                  strokeWidth={0.002}
                />
              ))}
              {(elements.columns ?? []).map((poly, i) => (
                <polygon
                  key={`c-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(107, 114, 128, 0.4)"
                  stroke="rgba(107, 114, 128, 0.9)"
                  strokeWidth={0.003}
                />
              ))}
              {(elements.stairs ?? []).map((poly, i) => (
                <polygon
                  key={`s-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(168, 85, 247, 0.2)"
                  stroke="rgba(168, 85, 247, 0.9)"
                  strokeWidth={0.003}
                />
              ))}
              {(elements.furniture ?? []).map((poly, i) => (
                <polygon
                  key={`f-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(34, 197, 94, 0.2)"
                  stroke="rgba(34, 197, 94, 0.8)"
                  strokeWidth={0.003}
                />
              ))}
              {(elements.walls ?? []).map((poly, i) => (
                <polygon
                  key={`w-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(59, 130, 246, 0.25)"
                  stroke="rgba(59, 130, 246, 0.95)"
                  strokeWidth={0.004}
                />
              ))}
              {(elements.windows ?? []).map((poly, i) => (
                <polygon
                  key={`win-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(6, 182, 212, 0.15)"
                  stroke="rgba(6, 182, 212, 0.9)"
                  strokeWidth={0.003}
                />
              ))}
              {(elements.doors ?? []).map((poly, i) => (
                <polygon
                  key={`d-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(245, 158, 11, 0.2)"
                  stroke="rgba(245, 158, 11, 0.95)"
                  strokeWidth={0.003}
                />
              ))}
              {(elements.annotations ?? []).map((poly, i) => (
                <polygon
                  key={`a-${i}`}
                  points={poly.map(([x, y]) => `${x},${y}`).join(' ')}
                  fill="rgba(148, 163, 184, 0.2)"
                  stroke="rgb(244, 23, 11)"
                  strokeWidth={0.002}
                />
              ))}
              </svg>
            ) : null}
            {devicesOnFloor.map((d) => (
              <div
                key={d.id}
                className={`wm-dot wm-dot-${d.kind}`}
                style={pointsToStyle(d.nx, d.ny)}
                title={`${d.kind} @ ${Math.round(d.nx * 100)}%, ${Math.round(d.ny * 100)}%`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

