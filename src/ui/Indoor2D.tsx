import { useEffect, useMemo, useRef, useState } from 'react';

import type { Building, DevicePlacement } from './types';

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

function pointsToStyle(nx: number, ny: number) {
  return {
    left: `${nx * 100}%`,
    top: `${ny * 100}%`,
  } as const;
}

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
  registerDropMapper: (fn: ((client: { x: number; y: number }) => { nx: number; ny: number }) | null) => void;
}) {
  const [showPipeline, setShowPipeline] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const floorLabel = `${props.floor}F`;
  const devicesOnFloor = useMemo(() => props.devices.filter((d) => d.floor === props.floor), [props.devices, props.floor]);

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
          <button
            className="wm-btn wm-btn-primary"
            onClick={() => props.onGenerate3D(props.floor)}
            disabled={props.generate3DLoading}
            title="调用后端接口根据当前平面图生成 3D 建模"
          >
            {props.generate3DLoading ? '生成中…' : '生成3D建模'}
          </button>
          <button className="wm-btn wm-btn-ghost" onClick={props.onEnter3D} title="进入已生成的 3D 视图">
            进入 3D
          </button>
        </div>
      </div>

      {props.generate3DError ? (
        <div className="wm-indoor2d-error" role="alert">
          {props.generate3DError}
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
        <img ref={imgRef} className="wm-indoor2d-img" src="/map.png" alt="Indoor layout" draggable={false} />

        <div className="wm-indoor2d-overlay">
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
  );
}

