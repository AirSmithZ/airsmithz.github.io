import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DayPlan, TripEdge, TripNode } from '../types';
import { useMatrixDrag } from '../overview/drag';
import {
  bezierOf,
  bridgeTouches,
  cellKey,
  edgeCaption,
  layoutOverview,
  MIN_COLUMN_WIDTH,
  seedColumnRange,
  visibleColumnRange,
  type LaidEdge,
  type OverviewCell,
  type OverviewLayout,
} from '../overview/layout';
import { NodeCard } from './FlowBoard';
import './overview.css';

const COL_KEY = 'anz-overview-cols';

interface OverviewMatrixProps {
  days: DayPlan[];
  crossEdges: TripEdge[];
  extraRegions?: string[];
  selectedId: string | null;
  dayIndex: number;
  locked?: boolean;
  onSelect: (id: string) => void;
  onPickDay: (index: number) => void;
  onOpenMap: (id: string) => void;
  onAddDay: () => void;
  onAddRegion: (name: string) => boolean;
  spread?: boolean;
  onPlace: (
    dayIndex: number,
    nodeId: string,
    patch: { region?: string; overview_offset?: { x: number; y: number } | null },
  ) => void;
}

function readColumnMins(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(COL_KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((value) => (typeof value === 'number' && value > 0 ? value : 0));
  } catch {
    return [];
  }
}

const TINTS = ['var(--region-tint-a)', 'var(--region-tint-b)', 'var(--region-tint-c)'];

function formatHeaderDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${parseInt(month, 10)}月${parseInt(day, 10)}日`;
}

function EdgeMarks({ edges, spread, className }: { edges: LaidEdge[]; spread?: boolean; className?: string }) {
  if (edges.length === 0) return null;
  return (
    <>
      <svg className={className ?? 'ov-edges'} aria-hidden>
        {edges.map((edge) => {
          const path = bezierOf(edge);
          return (
            <path
              key={edge.edge.id}
              d={path.d}
              className={edge.alt ? 'ov-edge ov-edge--alt' : 'ov-edge'}
            />
          );
        })}
      </svg>
      {edges.map((edge) => {
        const path = bezierOf(edge);
        return (
          <span
            key={`${edge.edge.id}-label`}
            className={`ov-edge-label${edge.alt ? ' ov-edge-label--alt' : ''}`}
            style={{ left: path.lx, top: path.ly }}
          >
            {edgeCaption(edge.edge, spread)}
          </span>
        );
      })}
    </>
  );
}

const MatrixCell = memo(function MatrixCell({
  cell,
  left,
  top,
  width,
  height,
  focused,
  drop,
  draggingId,
  selectedId,
  matrixLayout,
  onSelect,
  shouldSelect,
  onOpenMap,
  onPointerDown,
  spread,
}: {
  cell: OverviewCell;
  left: number;
  top: number;
  width: number;
  height: number;
  focused: boolean;
  drop: boolean;
  draggingId: string | null;
  selectedId: string | null;
  matrixLayout: OverviewLayout;
  onSelect: (id: string) => void;
  shouldSelect: () => boolean;
  onOpenMap: (id: string) => void;
  onPointerDown: (
    event: React.PointerEvent,
    nodeId: string,
    dayIndex: number,
    region: string,
    place: { x: number; y: number; width: number; height: number },
    columnLeft: number,
    regionTop: number,
    originOffset: { x: number; y: number },
    layout: OverviewLayout,
  ) => void;
  spread?: boolean;
}) {
  const { layout, nodes } = cell;
  return (
    <div
      className={`ov-cell${focused ? ' is-focus' : ''}${drop ? ' is-drop' : ''}`}
      style={{ left, top, width, height }}
    >
      {nodes.length > 0 ? (
        <div className="ov-chain" style={{ width: layout.width, height: layout.height }}>
          {layout.groups.map((group, groupIndex) => (
            <div
              key={`${group.label}-${groupIndex}`}
              className="ov-group"
              style={{ left: group.left, top: group.top, width: group.width, height: group.height }}
            >
              <span>{group.label}</span>
            </div>
          ))}
          <EdgeMarks edges={layout.edges} spread={spread} />
          {nodes.map((node) => {
            const place = layout.placements.get(node.id);
            if (!place) return null;
            return (
              <div
                key={node.id}
                className={`ov-node${draggingId === node.id ? ' is-dragging' : ''}`}
                style={{ left: place.x, top: place.y, width: place.width }}
                onPointerDown={(event) =>
                  onPointerDown(
                    event,
                    node.id,
                    cell.dayIndex,
                    cell.region,
                    place,
                    left,
                    top,
                    node.overview_offset ?? { x: 0, y: 0 },
                    matrixLayout,
                  )
                }
              >
                <NodeCard
                  node={node}
                  selected={node.id === selectedId}
                  variant="matrix"
                  onSelect={onSelect}
                  shouldSelect={shouldSelect}
                  onOpenMap={onOpenMap}
                />
              </div>
            );
          })}
          {layout.note ? (
            <p className="ov-note" title={layout.note}>
              {layout.note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export function OverviewMatrix({
  days,
  crossEdges,
  extraRegions,
  selectedId,
  dayIndex,
  locked,
  onSelect,
  onPickDay,
  onOpenMap,
  onAddDay,
  onAddRegion,
  spread = false,
  onPlace,
}: OverviewMatrixProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const matrixRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const headerTrackRef = useRef<HTMLDivElement>(null);
  const railTrackRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ dayIndex: number; startX: number; startWidth: number; pointerId: number } | null>(null);
  const [columnMins, setColumnMins] = useState(readColumnMins);
  const layout = useMemo(
    () => layoutOverview(days, crossEdges, { columnMins, extraRegions, spread }),
    [columnMins, crossEdges, days, extraRegions, spread],
  );
  const { preview, onPointerDown, shouldSelect } = useMatrixDrag(matrixRef, days, !locked, spread, onPlace);
  const [range, setRange] = useState(() => seedColumnRange(dayIndex, days.length));

  const applyScrollChrome = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (headerTrackRef.current) {
      headerTrackRef.current.style.transform = `translate3d(${-body.scrollLeft}px, 0, 0)`;
    }
    if (railTrackRef.current) {
      railTrackRef.current.style.transform = `translate3d(0, ${-body.scrollTop}px, 0)`;
    }
  }, []);

  const syncRange = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;
    const next = visibleColumnRange(
      body.scrollLeft,
      body.clientWidth,
      layout.columnOffsets,
      layout.columnWidths,
      days.length,
    );
    setRange((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, [days.length, layout.columnOffsets, layout.columnWidths]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let pendingReveal = true;
    const tryReveal = () => {
      if (!pendingReveal || body.clientWidth <= 0) return;
      const left = layout.columnOffsets[dayIndex] ?? 0;
      const width = layout.columnWidths[dayIndex] ?? 0;
      const viewRight = body.scrollLeft + body.clientWidth;
      if (left < body.scrollLeft || left + Math.min(width, 48) > viewRight) {
        body.scrollLeft = Math.max(0, left - 16);
      }
      pendingReveal = false;
    };
    const onWheel = (event: globalThis.WheelEvent) => {
      const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
      const deltaY = event.shiftKey ? 0 : event.deltaY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) body.scrollLeft += deltaX;
      else body.scrollTop += deltaY;
      event.preventDefault();
    };
    tryReveal();
    applyScrollChrome();
    syncRange();
    const observer = new ResizeObserver(() => {
      tryReveal();
      applyScrollChrome();
      syncRange();
    });
    observer.observe(body);
    headerRef.current?.addEventListener('wheel', onWheel, { passive: false });
    railRef.current?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      headerRef.current?.removeEventListener('wheel', onWheel);
      railRef.current?.removeEventListener('wheel', onWheel);
    };
  }, [applyScrollChrome, dayIndex, layout.columnOffsets, layout.columnWidths, syncRange]);

  const onBodyScroll = () => {
    applyScrollChrome();
    syncRange();
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const session = resizeRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      const next = Math.max(MIN_COLUMN_WIDTH, session.startWidth + (event.clientX - session.startX));
      setColumnMins((prev) => {
        const copy = prev.slice();
        copy[session.dayIndex] = next;
        return copy;
      });
    };
    const onUp = (event: PointerEvent) => {
      if (resizeRef.current?.pointerId !== event.pointerId) return;
      resizeRef.current = null;
      setColumnMins((prev) => {
        try {
          localStorage.setItem(COL_KEY, JSON.stringify(prev));
        } catch {
          /* 列宽记不住也不影响排版 */
        }
        return prev;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const onResizeDown = (event: React.PointerEvent, index: number, width: number) => {
    if (locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      dayIndex: index,
      startX: event.clientX,
      startWidth: width,
      pointerId: event.pointerId,
    };
  };

  const askRegion = () => {
    const name = window.prompt('新建区域名称');
    if (!name?.trim()) return;
    if (layout.regions.includes(name.trim())) return;
    onAddRegion(name.trim());
  };

  const ghostNode: TripNode | null = preview
    ? days[preview.dayIndex]?.nodes.find((node) => node.id === preview.nodeId) ?? null
    : null;

  const dayIndices: number[] = [];
  for (let index = range.start; index < range.end; index += 1) dayIndices.push(index);

  const bridges = layout.bridges.filter((edge) => bridgeTouches(edge, range.start, range.end));

  return (
    <div
      className={`ov${spread ? ' ov--spread' : ''}`}
      style={{
        gridTemplateColumns: `${layout.railWidth}px minmax(0, 1fr)`,
        gridTemplateRows: `${layout.headerHeight}px minmax(0, 1fr) auto`,
      }}
    >
      <div className="ov-corner">区域</div>
      <div ref={headerRef} className="ov-header">
        <div ref={headerTrackRef} className="ov-header__track" style={{ width: layout.matrixWidth + 40 }}>
          {dayIndices.map((index) => {
            const day = days[index];
            if (!day) return null;
            const focused = index === dayIndex;
            return (
              <div
                key={day.date}
                className="ov-head-wrap"
                style={{ left: layout.columnOffsets[index], width: layout.columnWidths[index] }}
              >
                <button
                  type="button"
                  className={`ov-head${focused ? ' is-on' : ''}`}
                  onClick={() => onPickDay(index)}
                >
                  <span className="ov-head__primary">
                    <span className="ov-head__day">D{day.day_index}</span>
                    <span>{formatHeaderDate(day.date)}</span>
                    <span>{day.weekday}</span>
                  </span>
                  {day.label ? <span className="ov-head__label">{day.label}</span> : null}
                </button>
                <div
                  className="ov-resize"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`调整 D${day.day_index} 列宽`}
                  onPointerDown={(event) => onResizeDown(event, index, layout.columnWidths[index] ?? MIN_COLUMN_WIDTH)}
                />
              </div>
            );
          })}
          <button
            type="button"
            className="ov-add"
            style={{ left: layout.matrixWidth }}
            aria-label="加一天"
            disabled={locked}
            onClick={onAddDay}
          >
            ＋
          </button>
        </div>
      </div>
      <div ref={railRef} className="ov-rail">
        <div ref={railTrackRef} className="ov-rail__track" style={{ height: layout.matrixHeight + 36 }}>
          {layout.regions.map((region, index) => (
            <div
              key={region}
              className="ov-rail__label"
              style={{
                top: layout.regionTops.get(region) ?? 0,
                height: layout.regionHeights.get(region) ?? 0,
                background: `color-mix(in srgb, ${TINTS[index % TINTS.length]} 100%, transparent)`,
              }}
              title={region}
            >
              <span>{region}</span>
            </div>
          ))}
          <button
            type="button"
            className="ov-add ov-add--region"
            style={{ top: layout.matrixHeight + 4 }}
            disabled={locked}
            onClick={askRegion}
          >
            ＋ 区域
          </button>
        </div>
      </div>
      <div ref={bodyRef} className="ov-body" onScroll={onBodyScroll}>
        <div
          ref={matrixRef}
          className="ov-matrix"
          style={{ width: layout.matrixWidth, height: layout.matrixHeight }}
        >
          <div className="ov-bgs" aria-hidden>
            {layout.regions.map((region, regionIndex) =>
              dayIndices.map((index) => (
                <div
                  key={`bg-${cellKey(index, region)}`}
                  className={`ov-bg${index === dayIndex ? ' is-focus' : ''}`}
                  style={{
                    left: layout.columnOffsets[index],
                    top: layout.regionTops.get(region) ?? 0,
                    width: layout.columnWidths[index],
                    height: layout.regionHeights.get(region) ?? 0,
                    background: `color-mix(in srgb, ${TINTS[regionIndex % TINTS.length]} 10%, var(--bg-base))`,
                  }}
                />
              )),
            )}
          </div>
          <EdgeMarks edges={bridges} spread={spread} className="ov-edges ov-edges--bridge" />
          {ghostNode && preview ? (
            <div className="ov-ghost" style={{ left: preview.left, top: preview.top, width: preview.width }}>
              <NodeCard node={ghostNode} selected={false} variant="matrix" onSelect={() => undefined} />
            </div>
          ) : null}
          {layout.regions.map((region) =>
            dayIndices.map((index) => {
              const cell = layout.cells.get(cellKey(index, region));
              if (!cell) return null;
              const drop =
                preview != null &&
                preview.dayIndex === index &&
                preview.targetRegion === region &&
                preview.targetRegion !== preview.sourceRegion;
              return (
                <MatrixCell
                  key={cellKey(index, region)}
                  cell={cell}
                  left={layout.columnOffsets[index] ?? 0}
                  top={layout.regionTops.get(region) ?? 0}
                  width={layout.columnWidths[index] ?? 0}
                  height={layout.regionHeights.get(region) ?? 0}
                  focused={index === dayIndex}
                  drop={drop}
                  draggingId={preview?.nodeId ?? null}
                  selectedId={selectedId}
                  matrixLayout={layout}
                  onSelect={onSelect}
                  shouldSelect={shouldSelect}
                  onOpenMap={onOpenMap}
                  onPointerDown={onPointerDown}
                  spread={spread}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="ov-legend">
        <i className="ov-legend__line" /> 主路线
        <i className="ov-legend__line ov-legend__line--alt" /> 备选
        <i className="ov-legend__line ov-legend__line--bridge" /> 跨区 / 跨天
        <span className="ov-legend__hint">拖拽调位或换区 · 拖日期列右边线调整列宽 · 双击打开地图</span>
      </div>
    </div>
  );
}
