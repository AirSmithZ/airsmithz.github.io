import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react';
import type { DayPlan, TripEdge, TripNode } from '../types';
import { nodeFace } from '../types';
import { edgeModeWord } from '../trip';
import { capturePointer } from '../compat';

const SWIPE_MIN = 56;
const SWIPE_RATIO = 0.33;
const FLICK_SPEED = 0.45;
const FLICK_MIN = 24;
const RUBBER = 0.35;

/**
 * 左右切日期优先于刚按下时的上下抖动。
 * 竖向先扣掉一小段拇指噪声；没分出胜负前页面先不动，避免浏览器把左右滑吃成滚动。
 * 锁错了也还能改：横滑还短、后来明显向下，就改回滚动；竖滑还没走远、横滑赶上来，就改切日期。
 */
function daySwipeAxis(dx: number, dy: number, current: 'x' | 'y' | null): 'x' | 'y' | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const ayIntent = Math.max(0, ay - 8);
  if (current === 'x') {
    if (ax < 48 && ay > 36 && ay > ax * 1.35) return 'y';
    return 'x';
  }
  if (current === 'y') {
    if (ay < 72 && ax >= 20 && ax > ay * 0.8) return 'x';
    return 'y';
  }
  if (ax < 10 && ay < 10) return null;
  if (ax >= 16 && ax > ayIntent) return 'x';
  if (ay >= 32 && ay > ax * 1.15) return 'y';
  return null;
}

function pagerLayout(index: number, count: number, width: number) {
  const start = Math.max(0, index - 1);
  const end = Math.min(count - 1, index + 1);
  const slot = index - start;
  return { start, end, slot, base: -slot * width };
}

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

const DayFlow = memo(function DayFlow({
  day,
  crossEdges,
  selectedId,
  onSelect,
}: {
  day: DayPlan;
  crossEdges: TripEdge[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <>
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
    </>
  );
});

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
  const meta = nodeFace(node);
  const missingPhoto = (node.photos ?? []).length === 0;
  const time =
    kind === 'compact' ? node.start_time : [node.start_time, node.end_time].filter(Boolean).join(' – ');
  const tone = {
    '--node-color': meta.color,
    '--node-glow': meta.glow,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={`trip-node${kind === 'flow' ? ' trip-node--flow' : ' trip-node--compact'}${kind === 'matrix' ? ' trip-node--matrix' : ''}${selected ? ' trip-node--selected' : ''}${node.is_optional ? ' trip-node--optional' : ''}${missingPhoto ? ' trip-node--missing' : ''}`}
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
      {missingPhoto ? (
        <span className="photo-alert" title="还没有参考图">
          <span aria-hidden>!</span>
          <span className="sr-only">还没有参考图</span>
        </span>
      ) : null}
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
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ x: number; animate: boolean } | null>(null);
  const seenDay = useRef(dayIndex);
  const phase = useRef<'idle' | 'drag' | 'anim'>('idle');
  const settleRef = useRef<(() => void) | null>(null);
  const live = useRef({ locked: swipeLocked, dayIndex, dayCount: days.length, onSwipeDay, width });
  live.current = { locked: swipeLocked, dayIndex, dayCount: days.length, onSwipeDay, width };
  const daySwipe = swipeDays && scope === 'day';

  useLayoutEffect(() => {
    const el = pagerRef.current;
    if (!el || !daySwipe) return;
    const apply = () => {
      const next = el.clientWidth;
      setWidth((prev) => (prev === next ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [daySwipe]);

  useEffect(() => {
    const el = pagerRef.current;
    if (!el || !daySwipe) return;

    const pointers = new Set<number>();
    let tracking: {
      id: number;
      x: number;
      y: number;
      axis: 'x' | 'y' | null;
      lastX: number;
      lastY: number;
      lastT: number;
      velocity: number;
      velocityY: number;
      page: HTMLElement | null;
      scrollTop: number;
    } | null = null;
    let suppressClick = false;
    let coast = 0;

    const stopCoast = () => {
      if (!coast) return;
      cancelAnimationFrame(coast);
      coast = 0;
    };

    const coastScroll = (page: HTMLElement, velocity: number) => {
      stopCoast();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || Math.abs(velocity) < 0.12) return;
      let speed = velocity;
      let last = performance.now();
      const step = (now: number) => {
        if (!page.isConnected) {
          coast = 0;
          return;
        }
        const dt = Math.min(34, now - last);
        last = now;
        const max = Math.max(0, page.scrollHeight - page.clientHeight);
        const next = Math.min(max, Math.max(0, page.scrollTop - speed * dt));
        page.scrollTop = next;
        speed *= 0.92 ** (dt / 16);
        if (Math.abs(speed) < 0.02 || next <= 0 || next >= max) {
          coast = 0;
          return;
        }
        coast = requestAnimationFrame(step);
      };
      coast = requestAnimationFrame(step);
    };

    const stopWindow = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const shownDx = (dx: number, index: number, count: number) => {
      if (dx > 0 && index <= 0) return dx * RUBBER;
      if (dx < 0 && index >= count - 1) return dx * RUBBER;
      return dx;
    };

    const settle = (next: number | null) => {
      if (settleRef.current == null) return;
      const finish = settleRef.current;
      settleRef.current = null;
      finish();
      if (next != null) live.current.onSwipeDay?.(next);
      setDrag(null);
      phase.current = 'idle';
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || live.current.locked || phase.current === 'anim') return;
      if (pointers.size === 0) suppressClick = false;
      pointers.add(event.pointerId);
      if (pointers.size > 1) {
        tracking = null;
        phase.current = 'idle';
        setDrag({ x: 0, animate: true });
        return;
      }
      stopCoast();
      const node = event.target instanceof Element ? event.target : null;
      const page = node?.closest<HTMLElement>('.day-pager__page') ?? null;
      tracking = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        axis: null,
        lastX: event.clientX,
        lastY: event.clientY,
        lastT: performance.now(),
        velocity: 0,
        velocityY: 0,
        page,
        scrollTop: page?.scrollTop ?? 0,
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };

    const onMove = (event: PointerEvent) => {
      if (!tracking || event.pointerId !== tracking.id) return;
      const dx = event.clientX - tracking.x;
      const dy = event.clientY - tracking.y;
      const nextAxis = daySwipeAxis(dx, dy, tracking.axis);
      if (nextAxis === 'x' && tracking.axis !== 'x') {
        if (tracking.page) tracking.page.scrollTop = tracking.scrollTop;
        tracking.axis = 'x';
        suppressClick = true;
        phase.current = 'drag';
        capturePointer(el, event.pointerId);
      } else if (nextAxis === 'y' && tracking.axis !== 'y') {
        const fromX = tracking.axis === 'x';
        tracking.axis = 'y';
        suppressClick = true;
        capturePointer(el, event.pointerId);
        if (fromX) {
          phase.current = 'idle';
          setDrag({ x: 0, animate: false });
        }
      }
      if (!tracking.axis) return;
      const now = performance.now();
      const dt = now - tracking.lastT;
      if (dt > 0) {
        tracking.velocity = (event.clientX - tracking.lastX) / dt;
        tracking.velocityY = (event.clientY - tracking.lastY) / dt;
      }
      tracking.lastX = event.clientX;
      tracking.lastY = event.clientY;
      tracking.lastT = now;
      if (tracking.axis === 'y') {
        if (tracking.page) tracking.page.scrollTop = tracking.scrollTop - dy;
        return;
      }
      const { dayIndex: index, dayCount } = live.current;
      setDrag({ x: shownDx(dx, index, dayCount), animate: false });
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (!tracking || event.pointerId !== tracking.id) {
        if (pointers.size === 0) stopWindow();
        return;
      }
      const dx = event.clientX - tracking.x;
      const dy = event.clientY - tracking.y;
      const velocity = tracking.velocity;
      const velocityY = tracking.velocityY;
      const page = tracking.page;
      const savedTop = tracking.scrollTop;
      const axis = daySwipeAxis(dx, dy, tracking.axis);
      tracking = null;
      if (pointers.size === 0) stopWindow();
      if (axis === 'y') {
        suppressClick = true;
        if (page) coastScroll(page, velocityY);
        phase.current = 'idle';
        return;
      }
      if (page) page.scrollTop = savedTop;
      if (axis !== 'x') {
        phase.current = 'idle';
        return;
      }
      suppressClick = true;
      const { locked, dayIndex: index, dayCount, width: pageWidth } = live.current;
      const threshold = Math.max(SWIPE_MIN, pageWidth * SWIPE_RATIO);
      const flick = Math.abs(velocity) > FLICK_SPEED && Math.abs(dx) > FLICK_MIN;
      let dir = 0;
      if (dx < 0 && (dx <= -threshold || (flick && velocity < 0))) dir = 1;
      if (dx > 0 && (dx >= threshold || (flick && velocity > 0))) dir = -1;
      const next = index + dir;
      const canGo = dir !== 0 && !locked && next >= 0 && next < dayCount && pageWidth > 0;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (canGo && reduce) {
        live.current.onSwipeDay?.(next);
        setDrag(null);
        phase.current = 'idle';
        return;
      }
      if (!canGo && (reduce || Math.abs(dx) < 1)) {
        setDrag(null);
        phase.current = 'idle';
        return;
      }
      phase.current = 'anim';
      const timer = window.setTimeout(() => settle(canGo ? next : null), 260);
      settleRef.current = () => window.clearTimeout(timer);
      setDrag({ x: canGo ? (dir > 0 ? -pageWidth : pageWidth) : 0, animate: true });
    };

    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (tracking && event.pointerId === tracking.id) {
        const horizontal = tracking.axis === 'x';
        if (horizontal) suppressClick = true;
        tracking = null;
        if (horizontal) setDrag({ x: 0, animate: true });
      }
      if (pointers.size === 0) {
        stopWindow();
        if (phase.current === 'drag') phase.current = 'idle';
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking || event.touches.length !== 1 || !event.cancelable) return;
      event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('touchmove', onTouchMove, true);
      el.removeEventListener('click', onClick, true);
      stopWindow();
      stopCoast();
      settleRef.current?.();
      settleRef.current = null;
    };
  }, [daySwipe]);

  useEffect(() => {
    const board = daySwipe ? pageRef.current : boardRef.current;
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
  }, [selectedId, scope, dayIndex, daySwipe]);

  function onTrackEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    if (phase.current !== 'anim') return;
    const { dayIndex: index, dayCount, width: pageWidth } = live.current;
    const layout = pagerLayout(index, dayCount, pageWidth);
    const shown = layout.base + (drag?.x ?? 0);
    const dir = (drag?.x ?? 0) < 0 ? 1 : -1;
    const next = index + dir;
    const moved = Math.abs(shown - layout.base) > pageWidth * 0.5;
    if (moved && next >= 0 && next < dayCount) {
      const finish = settleRef.current;
      settleRef.current = null;
      finish?.();
      live.current.onSwipeDay?.(next);
    } else {
      settleRef.current?.();
      settleRef.current = null;
    }
    setDrag(null);
    phase.current = 'idle';
  }

  if (scope === 'day') {
    const day = days[dayIndex];
    if (!day) return <p className="empty-note">这一天还没有行程。</p>;
    if (daySwipe) {
      const layout = pagerLayout(dayIndex, days.length, width);
      const x = layout.base + (drag?.x ?? 0);
      const pages = [];
      for (let index = layout.start; index <= layout.end; index += 1) {
        const item = days[index];
        if (item) pages.push(item);
      }
      return (
        <div
          ref={pagerRef}
          className={`day-pager${swipeLocked ? '' : ' day-pager--gesture'}`}
          data-testid="day-flow"
          style={{ '--pager-w': `${width}px` } as CSSProperties}
        >
          <div
            className="day-pager__track"
            style={{
              transform: `translate3d(${x}px, 0, 0)`,
              transition: drag?.animate ? 'transform 180ms ease' : 'none',
            }}
            onTransitionEnd={onTrackEnd}
          >
            {pages.map((item) => (
              <div
                key={item.date}
                className="day-pager__page"
                ref={item.date === day.date ? pageRef : undefined}
                aria-hidden={item.date !== day.date}
              >
                <DayFlow day={item} crossEdges={crossEdges} selectedId={selectedId} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div ref={boardRef} className="board-scroll">
        <DayFlow day={day} crossEdges={crossEdges} selectedId={selectedId} onSelect={onSelect} />
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
