import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties } from 'react';
import type { DayPlan, TripEdge, TripNode } from '../types';
import { categoryMeta } from '../types';
import { edgeModeWord } from '../trip';
import { capturePointer } from '../compat';

const SWIPE_SLOP = 10;
const SWIPE_DISTANCE = 56;

interface FlowBoardProps {
  days: DayPlan[];
  scope: 'day' | 'all';
  dayIndex: number;
  crossEdges: TripEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPickDay: (index: number) => void;
  /** 手机壳的单日流程图才打开左右滑切日期。 */
  swipeDays?: boolean;
  swipeLocked?: boolean;
  onSwipeDay?: (index: number) => void;
}

function incomingOf(day: DayPlan, crossEdges: TripEdge[], nodeId: string): TripEdge | null {
  return (
    day.edges.find((edge) => edge.to === nodeId) ??
    crossEdges.find((edge) => edge.to === nodeId) ??
    null
  );
}

export function NodeCard({
  node,
  selected,
  compact,
  variant,
  onSelect,
  shouldSelect,
  onOpenMap,
}: {
  node: TripNode;
  selected: boolean;
  compact?: boolean;
  variant?: 'flow' | 'compact' | 'matrix';
  onSelect: (id: string) => void;
  shouldSelect?: () => boolean;
  onOpenMap?: (id: string) => void;
}) {
  const kind = variant ?? (compact ? 'compact' : 'flow');
  const meta = categoryMeta(node.category);
  const time =
    kind === 'compact' ? node.start_time : [node.start_time, node.end_time].filter(Boolean).join(' – ');
  const tone = {
    '--node-color': meta.color,
    '--node-glow': meta.glow,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={`trip-node${kind === 'flow' ? ' trip-node--flow' : ' trip-node--compact'}${kind === 'matrix' ? ' trip-node--matrix' : ''}${selected ? ' trip-node--selected' : ''}${node.is_optional ? ' trip-node--optional' : ''}`}
      style={tone}
      data-node-id={node.id}
      aria-pressed={selected}
      onClick={() => {
        if (shouldSelect && !shouldSelect()) return;
        onSelect(node.id);
      }}
      onDoubleClick={(event) => {
        if (!onOpenMap) return;
        event.preventDefault();
        onOpenMap(node.id);
      }}
    >
      <span className="trip-node__header">
        <span className="trip-node__icon" aria-hidden>
          {meta.icon}
        </span>
        <span className="trip-node__category">
          {meta.label}
          {node.is_optional ? ' · 可选' : ''}
        </span>
        {node.floor ? <span className="trip-node__floor">{node.floor}</span> : null}
      </span>
      <span className="trip-node__name">{node.name}</span>
      {time ? <span className="trip-node__time">{time}</span> : null}
      {kind !== 'compact' && node.cost_label ? <span className="trip-node__cost">{node.cost_label}</span> : null}
    </button>
  );
}

export function FlowBoard({
  days,
  scope,
  dayIndex,
  crossEdges,
  selectedId,
  onSelect,
  onPickDay,
  swipeDays = false,
  swipeLocked = false,
  onSwipeDay,
}: FlowBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState<'next' | 'prev' | null>(null);
  const seenDay = useRef(dayIndex);
  const live = useRef({ locked: swipeLocked, dayIndex, dayCount: days.length, onSwipeDay });
  live.current = { locked: swipeLocked, dayIndex, dayCount: days.length, onSwipeDay };
  const daySwipe = swipeDays && scope === 'day';

  useEffect(() => {
    if (!slide) return;
    const timer = window.setTimeout(() => setSlide(null), 240);
    return () => window.clearTimeout(timer);
  }, [slide, dayIndex]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el || !daySwipe) return;

    const pointers = new Set<number>();
    let tracking: { id: number; x: number; y: number; axis: 'x' | 'y' | null } | null = null;
    let suppressClick = false;

    const stopWindow = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || live.current.locked) return;
      if (pointers.size === 0) suppressClick = false;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        tracking = null;
        return;
      }
      tracking = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: null };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    const onMove = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== tracking.id) return;
      const dx = event.clientX - tracking.x;
      const dy = event.clientY - tracking.y;
      if (tracking.axis) return;
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        tracking.axis = 'x';
        suppressClick = true;
        capturePointer(el, event.pointerId);
      } else {
        tracking.axis = 'y';
      }
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (!tracking || event.pointerId !== tracking.id) {
        if (pointers.size === 0) stopWindow();
        return;
      }
      const dx = event.clientX - tracking.x;
      const dy = event.clientY - tracking.y;
      let horizontal = tracking.axis === 'x';
      if (!tracking.axis && (Math.abs(dx) >= SWIPE_SLOP || Math.abs(dy) >= SWIPE_SLOP)) {
        horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
      }
      tracking = null;
      if (pointers.size === 0) stopWindow();
      if (horizontal) suppressClick = true;
      if (!horizontal) return;
      const { locked, dayIndex: index, dayCount, onSwipeDay: swipe } = live.current;
      if (locked || !swipe || Math.abs(dx) < SWIPE_DISTANCE) return;
      const next = index + (dx < 0 ? 1 : -1);
      if (next < 0 || next >= dayCount) return;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setSlide(dx < 0 ? 'next' : 'prev');
      }
      el.scrollTop = 0;
      swipe(next);
    };

    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (tracking && event.pointerId === tracking.id) {
        if (tracking.axis === 'x') suppressClick = true;
        tracking = null;
      }
      if (pointers.size === 0) stopWindow();
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('click', onClick, true);
      stopWindow();
    };
  }, [daySwipe]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const dayChanged = seenDay.current !== dayIndex;
    seenDay.current = dayIndex;
    const canFind = Boolean(selectedId) && typeof CSS !== 'undefined' && Boolean(CSS.escape);
    const el = canFind
      ? board.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(selectedId as string)}"]`)
      : null;
    if (!el) {
      if (dayChanged && scope === 'day') board.scrollTop = 0;
      return;
    }
    const elRect = el.getBoundingClientRect();
    const boxRect = board.getBoundingClientRect();
    const needY = elRect.top < boxRect.top || elRect.bottom > boxRect.bottom;
    const needX = elRect.left < boxRect.left || elRect.right > boxRect.right;
    if (!needY && !needX) return;
    board.scrollTo({
      top: needY ? Math.max(0, board.scrollTop + (elRect.top - boxRect.top) - 12) : board.scrollTop,
      left: needX ? Math.max(0, board.scrollLeft + (elRect.left - boxRect.left) - 12) : board.scrollLeft,
      behavior: 'smooth',
    });
  }, [selectedId, scope, dayIndex]);

  function clearSlide(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.animationName !== 'day-slide-next' && event.animationName !== 'day-slide-prev') return;
    setSlide(null);
  }

  if (scope === 'day') {
    const day = days[dayIndex];
    if (!day) return <p className="empty-note">这一天还没有行程。</p>;
    return (
      <div
        ref={boardRef}
        className={`board-scroll${daySwipe ? ' board-scroll--day' : ''}`}
        data-testid={daySwipe ? 'day-flow' : undefined}
      >
        <div
          key={day.date}
          className={slide ? `day-slide is-slide-${slide}` : undefined}
          onAnimationEnd={clearSlide}
        >
          <header className="day-banner">
            <strong>
              D{day.day_index} {day.weekday} {day.date.slice(5)} {day.region}
            </strong>
            <p>{day.label}</p>
          </header>
          <ol className="day-flow">
            {day.nodes.map((node, index) => {
              const edge = incomingOf(day, crossEdges, node.id);
              const selected = node.id === selectedId;
              return (
                <li key={node.id}>
                  {edge ? (
                    <p className="hop">
                      {edgeModeWord(edge)}
                      {edge.duration_minutes ? ` · ${edge.duration_minutes} 分钟` : ''}
                      {edge.label ? ` · ${edge.label}` : ''}
                    </p>
                  ) : index > 0 ? (
                    <p className="hop hop--quiet">接着</p>
                  ) : null}
                  <NodeCard node={node} selected={selected} onSelect={onSelect} />
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div ref={boardRef} className="board-scroll board-scroll--columns">
      <div className="columns">
        {days.map((day, index) => (
          <section key={day.date} className={`col${index === dayIndex ? ' is-target' : ''}`} data-day-col={day.day_index}>
            <button type="button" className="col-head" onClick={() => onPickDay(index)}>
              <b>
                D{day.day_index} {day.region}
              </b>
              <span>
                {day.date.slice(5)} {day.weekday} · {day.nodes.length} 站
              </span>
              {index === dayIndex ? <em>当前这一天</em> : null}
            </button>
            {day.nodes.map((node) => {
              const selected = node.id === selectedId;
              return (
                <NodeCard key={node.id} node={node} selected={selected} compact onSelect={onSelect} />
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
