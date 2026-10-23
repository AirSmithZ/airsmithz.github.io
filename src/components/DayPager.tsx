import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type TransitionEvent } from 'react';
import { capturePointer } from '../compat';
import { edgeRubber, fingerVelocity, ListGlide, TRACK_EASE } from '../listGlide';

const SWIPE_MIN = 56;
const SWIPE_RATIO = 0.33;
const FLICK_SPEED = 0.45;
const FLICK_MIN = 24;

/**
 * 与流程当天页同一套分轴：左右切日期优先于刚按下时的上下抖动。
 * 竖向先扣掉一小段拇指噪声；没分出胜负前页面先不动。
 * 锁上竖向之后从锁定点重新跟手，不把这段噪声一次性跳进列表。
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
  if (ay >= 18 && ay > ax * 1.15) return 'y';
  return null;
}

function pagerLayout(index: number, count: number, width: number) {
  const start = Math.max(0, index - 1);
  const end = Math.min(count - 1, index + 1);
  const slot = index - start;
  return { start, end, slot, base: -slot * width };
}

interface DayPagerProps {
  index: number;
  count: number;
  locked?: boolean;
  onChange: (index: number) => void;
  pageKey: (index: number) => string;
  renderPage: (index: number) => ReactNode;
  testId?: string;
}

export function DayPager({
  index,
  count,
  locked = false,
  onChange,
  pageKey,
  renderPage,
  testId,
}: DayPagerProps) {
  const pagerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ x: number; animate: boolean } | null>(null);
  const seenDay = useRef(index);
  const phase = useRef<'idle' | 'drag' | 'anim'>('idle');
  const settleRef = useRef<(() => void) | null>(null);
  const live = useRef({ locked, index, count, onChange, width });
  live.current = { locked, index, count, onChange, width };

  useLayoutEffect(() => {
    const el = pagerRef.current;
    if (!el) return;
    const apply = () => {
      const next = el.clientWidth;
      setWidth((prev) => (prev === next ? prev : next));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = pagerRef.current;
    if (!el) return;

    const pointers = new Set<number>();
    const glide = new ListGlide();
    let tracking: {
      id: number;
      x: number;
      y: number;
      axis: 'x' | 'y' | null;
      xSamples: { t: number; p: number }[];
      page: HTMLElement | null;
      scrollTop: number;
    } | null = null;
    let suppressClick = false;

    const stopWindow = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };

    const settle = (next: number | null) => {
      if (settleRef.current == null) return;
      const finish = settleRef.current;
      settleRef.current = null;
      finish();
      if (next != null) live.current.onChange(next);
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
        glide.release();
        return;
      }
      const node = event.target instanceof Element ? event.target : null;
      const page = node?.closest<HTMLElement>('.day-pager__page') ?? null;
      glide.hold(page);
      tracking = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        axis: null,
        xSamples: [{ t: performance.now(), p: event.clientX }],
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
        glide.drop();
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
        glide.hold(tracking.page);
        glide.arm(event.clientY);
      }
      if (!tracking.axis) return;
      if (tracking.axis === 'y') {
        glide.dragTo(event.clientY);
        return;
      }
      const now = performance.now();
      tracking.xSamples.push({ t: now, p: event.clientX });
      const cutoff = now - 120;
      while (tracking.xSamples.length > 3 && tracking.xSamples[0].t < cutoff) tracking.xSamples.shift();
      const { index: pageIndex, count: pageCount, width: pageWidth } = live.current;
      setDrag({ x: edgeRubber(dx, pageIndex, pageCount, pageWidth), animate: false });
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (!tracking || event.pointerId !== tracking.id) {
        if (pointers.size === 0) stopWindow();
        return;
      }
      const dx = event.clientX - tracking.x;
      const dy = event.clientY - tracking.y;
      tracking.xSamples.push({ t: performance.now(), p: event.clientX });
      const velocity = fingerVelocity(tracking.xSamples);
      const page = tracking.page;
      const savedTop = tracking.scrollTop;
      const axis = daySwipeAxis(dx, dy, tracking.axis);
      tracking = null;
      if (pointers.size === 0) stopWindow();
      if (axis === 'y') {
        suppressClick = true;
        glide.dragTo(event.clientY);
        glide.release();
        phase.current = 'idle';
        return;
      }
      if (page) {
        page.scrollTop = savedTop;
        page.scrollLeft = 0;
      }
      if (axis !== 'x') {
        glide.release();
        phase.current = 'idle';
        return;
      }
      suppressClick = true;
      const { locked: pageLocked, index: pageIndex, count: pageCount, width: pageWidth } = live.current;
      const threshold = Math.max(SWIPE_MIN, pageWidth * SWIPE_RATIO);
      const flick = Math.abs(velocity) > FLICK_SPEED && Math.abs(dx) > FLICK_MIN;
      let dir = 0;
      if (dx < 0 && (dx <= -threshold || (flick && velocity < 0))) dir = 1;
      if (dx > 0 && (dx >= threshold || (flick && velocity > 0))) dir = -1;
      const next = pageIndex + dir;
      const canGo = dir !== 0 && !pageLocked && next >= 0 && next < pageCount && pageWidth > 0;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (canGo && reduce) {
        live.current.onChange(next);
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
      const timer = window.setTimeout(() => settle(canGo ? next : null), 360);
      settleRef.current = () => window.clearTimeout(timer);
      setDrag({ x: canGo ? (dir > 0 ? -pageWidth : pageWidth) : 0, animate: true });
    };

    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (tracking && event.pointerId === tracking.id) {
        const horizontal = tracking.axis === 'x';
        if (horizontal) suppressClick = true;
        tracking = null;
        if (horizontal) {
          glide.drop();
          setDrag({ x: 0, animate: true });
        } else glide.release();
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
      glide.dispose();
      settleRef.current?.();
      settleRef.current = null;
    };
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const changed = seenDay.current !== index;
    seenDay.current = index;
    if (changed && page) {
      const sheet = page.querySelector(':scope > .day-pager__sheet');
      if (sheet instanceof HTMLElement) sheet.style.transform = '';
      page.scrollTop = 0;
    }
  }, [index]);

  function onTrackEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
    if (phase.current !== 'anim') return;
    const { index: pageIndex, count: pageCount, width: pageWidth } = live.current;
    const layout = pagerLayout(pageIndex, pageCount, pageWidth);
    const shown = layout.base + (drag?.x ?? 0);
    const dir = (drag?.x ?? 0) < 0 ? 1 : -1;
    const next = pageIndex + dir;
    const moved = Math.abs(shown - layout.base) > pageWidth * 0.5;
    if (moved && next >= 0 && next < pageCount) {
      const finish = settleRef.current;
      settleRef.current = null;
      finish?.();
      live.current.onChange(next);
    } else {
      settleRef.current?.();
      settleRef.current = null;
    }
    setDrag(null);
    phase.current = 'idle';
  }

  const layout = pagerLayout(index, count, width);
  const x = layout.base + (drag?.x ?? 0);
  const pages: number[] = [];
  for (let pageIndex = layout.start; pageIndex <= layout.end; pageIndex += 1) pages.push(pageIndex);

  return (
    <div
      ref={pagerRef}
      className={`day-pager${locked ? '' : ' day-pager--gesture'}`}
      data-testid={testId}
      style={{ '--pager-w': `${width}px` } as CSSProperties}
    >
      <div
        className="day-pager__track"
        style={{
          transform: `translate3d(${x}px, 0, 0)`,
          transition: drag?.animate ? TRACK_EASE : 'none',
        }}
        onTransitionEnd={onTrackEnd}
      >
        {pages.map((pageIndex) => (
          <div
            key={pageKey(pageIndex)}
            className="day-pager__page"
            ref={pageIndex === index ? pageRef : undefined}
            aria-hidden={pageIndex !== index}
            inert={pageIndex !== index}
          >
            <div className="day-pager__sheet">{renderPage(pageIndex)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
