import { useEffect, useRef, type RefObject } from 'react';

/** 系统返回手势只认屏幕最左边这一条。再宽就会挡住日期条的点按。 */
const EDGE = 24;
const TAP = 8;

/**
 * 竖滑优先，锁上就不再改口。
 * 向左、或竖移不比横移小，都留给原来的滚动。只有明显向右才关掉面板。
 */
function dismissAxis(dx: number, dy: number, current: 'x' | 'y' | null): 'x' | 'y' | null {
  if (current) return current;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 10 && ay < 10) return null;
  if (dx < 0) return ax >= 12 || ay >= 8 ? 'y' : null;
  if (ay >= 8 && ay >= ax * 0.75) return 'y';
  if (dx >= 14 && ax > ay * 1.5) return 'x';
  if (ay >= 16) return 'y';
  return null;
}

/** 左缘这条不关面板，只分清该滚哪一边，避免把上下滑吃掉。 */
function edgeAxis(dx: number, dy: number, current: 'x' | 'y' | null): 'x' | 'y' | null {
  if (current) return current;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 8 && ay < 8) return null;
  if (ax >= 8 && ax > ay * 1.15) return 'x';
  if (ay >= 8 && ay > ax) return 'y';
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function canScroll(el: HTMLElement, axis: 'x' | 'y'): boolean {
  const style = getComputedStyle(el);
  const overflow = axis === 'y' ? style.overflowY : style.overflowX;
  if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') return false;
  const room = axis === 'y' ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  return room > 1;
}

function scrollableOf(node: EventTarget | null, axis: 'x' | 'y'): HTMLElement | null {
  let el = node instanceof Element ? node : null;
  while (el && el !== document.documentElement) {
    if (el instanceof HTMLElement && canScroll(el, axis)) return el;
    el = el.parentElement;
  }
  return null;
}

function ignoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('input, textarea, select, option, [contenteditable="true"]');
}

/** 这些区域自己分轴。左缘只取消浏览器默认，不再改它们的 scrollTop。 */
function ownsGesture(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest('.day-pager, .maplibregl-map, .phone-layer, dialog.photo-zoom')
  );
}

/**
 * 竖屏左缘右滑会把整页带回上一个网页。
 * 按下时就取消这次触摸的默认行为；上下滑改由原来的滚动容器跟手。
 * 日期翻页、地图、已打开的面板自己处理，这里不抢。
 */
export function usePortraitEdgeGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    let track: {
      x: number;
      y: number;
      axis: 'x' | 'y' | null;
      owned: boolean;
      blocked: boolean;
      scrollY: HTMLElement | null;
      scrollX: HTMLElement | null;
      top: number;
      left: number;
    } | null = null;
    let allowSynth = false;
    let blockGhost = false;
    let ghostTimer = 0;

    const armGhost = () => {
      blockGhost = true;
      window.clearTimeout(ghostTimer);
      ghostTimer = window.setTimeout(() => {
        blockGhost = false;
      }, 400);
    };

    const onClick = (event: MouseEvent) => {
      if (allowSynth) {
        allowSynth = false;
        return;
      }
      if (!blockGhost || event.clientX <= 0 || event.clientX > EDGE + 12) return;
      blockGhost = false;
      window.clearTimeout(ghostTimer);
      event.preventDefault();
      event.stopPropagation();
    };

    const stopFollow = () => {
      document.removeEventListener('touchmove', onMove, true);
      document.removeEventListener('touchend', onEnd, true);
      document.removeEventListener('touchcancel', onCancel, true);
    };

    const onMove = (event: TouchEvent) => {
      if (!track || event.touches.length !== 1) return;
      if (event.cancelable) event.preventDefault();
      const touch = event.touches[0];
      const dx = touch.clientX - track.x;
      const dy = touch.clientY - track.y;
      track.axis = edgeAxis(dx, dy, track.axis);
      if (track.owned) return;
      if (track.axis === 'y' && track.scrollY) {
        const max = track.scrollY.scrollHeight - track.scrollY.clientHeight;
        track.scrollY.scrollTop = clamp(track.top - dy, 0, max);
      } else if (track.axis === 'x' && track.scrollX) {
        const max = track.scrollX.scrollWidth - track.scrollX.clientWidth;
        track.scrollX.scrollLeft = clamp(track.left - dx, 0, max);
      }
    };

    const onEnd = (event: TouchEvent) => {
      const current = track;
      track = null;
      stopFollow();
      if (!current) return;
      const touch = event.changedTouches[0];
      const dx = (touch?.clientX ?? current.x) - current.x;
      const dy = (touch?.clientY ?? current.y) - current.y;
      const moved = current.axis != null || Math.hypot(dx, dy) > TAP;
      if (moved || !current.blocked || !(event.target instanceof HTMLElement)) {
        if (moved) armGhost();
        return;
      }
      allowSynth = true;
      armGhost();
      event.target.click();
    };

    const onCancel = () => {
      track = null;
      stopFollow();
      armGhost();
    };

    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      if (touch.clientX > EDGE) return;
      const blocked = event.cancelable;
      if (blocked) event.preventDefault();
      const owned = ownsGesture(event.target);
      const scrollY = owned ? null : scrollableOf(event.target, 'y');
      const scrollX = owned ? null : scrollableOf(event.target, 'x');
      stopFollow();
      track = {
        x: touch.clientX,
        y: touch.clientY,
        axis: null,
        owned,
        blocked,
        scrollY,
        scrollX,
        top: scrollY?.scrollTop ?? 0,
        left: scrollX?.scrollLeft ?? 0,
      };
      document.addEventListener('touchmove', onMove, { capture: true, passive: false });
      document.addEventListener('touchend', onEnd, true);
      document.addEventListener('touchcancel', onCancel, true);
    };

    document.addEventListener('touchstart', onStart, { capture: true, passive: false });
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('touchstart', onStart, true);
      document.removeEventListener('click', onClick, true);
      stopFollow();
      window.clearTimeout(ghostTimer);
      track = null;
    };
  }, [enabled]);
}

/**
 * 竖屏详情层：向右滑跟手，过了线就关上。竖滑不 preventDefault，滚动仍是原来的那一份。
 * 从左缘按下时，系统返回已经被取消，竖向就改由面板里的滚动容器跟手。
 */
export function usePanelSwipe(layerRef: RefObject<HTMLElement | null>, enabled: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const layer = layerRef.current;
    if (!enabled || !layer) return;
    const panel = layer.querySelector<HTMLElement>('.phone-layer__panel');
    if (!panel) return;

    let track: {
      x: number;
      y: number;
      axis: 'x' | 'y' | null;
      edge: boolean;
      scrollY: HTMLElement | null;
      top: number;
      lastX: number;
      lastT: number;
      velocity: number;
    } | null = null;
    let dragging = false;
    let suppressClick = false;
    let closing = false;
    let sent = false;
    let timer = 0;
    let onDone: ((event: TransitionEvent) => void) | null = null;

    const clearPaint = () => {
      layer.classList.remove('is-swipe', 'is-dragging');
      layer.style.removeProperty('--swipe-fade');
      layer.style.pointerEvents = '';
      panel.style.transition = '';
      panel.style.transform = '';
    };

    const dropAnim = () => {
      window.clearTimeout(timer);
      if (onDone) panel.removeEventListener('transitionend', onDone);
      onDone = null;
    };

    const paint = (x: number, animate: boolean) => {
      const width = panel.getBoundingClientRect().width || 1;
      const shift = Math.max(0, x);
      const fade = Math.max(0, 1 - Math.min(1, shift / width));
      layer.classList.add('is-swipe');
      layer.classList.toggle('is-dragging', !animate);
      layer.style.setProperty('--swipe-fade', fade.toFixed(3));
      panel.style.transition = animate ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
      panel.style.transform = shift ? `translate3d(${shift}px, 0, 0)` : 'translate3d(0, 0, 0)';
    };

    const afterMotion = (done: () => void) => {
      dropAnim();
      onDone = (event: TransitionEvent) => {
        if (event.target !== panel || event.propertyName !== 'transform') return;
        dropAnim();
        done();
      };
      panel.addEventListener('transitionend', onDone);
      timer = window.setTimeout(() => {
        dropAnim();
        done();
      }, 320);
    };

    const settle = (close: boolean) => {
      track = null;
      dragging = false;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!close) {
        if (reduce || !layer.classList.contains('is-swipe')) {
          dropAnim();
          clearPaint();
          return;
        }
        paint(0, true);
        afterMotion(() => {
          if (!closing) clearPaint();
        });
        return;
      }
      closing = true;
      suppressClick = true;
      layer.style.pointerEvents = 'none';
      if (reduce) {
        if (!sent) {
          sent = true;
          onCloseRef.current();
        }
        return;
      }
      const width = panel.getBoundingClientRect().width || window.innerWidth;
      paint(width + 36, true);
      afterMotion(() => {
        if (sent) return;
        sent = true;
        onCloseRef.current();
      });
    };

    const onStart = (event: TouchEvent) => {
      if (closing || event.touches.length !== 1) {
        if (event.touches.length > 1 && track?.axis === 'x') settle(false);
        track = null;
        return;
      }
      if (ignoredTarget(event.target)) return;
      if (document.querySelector('dialog.photo-zoom[open]')) return;
      const scrollX = scrollableOf(event.target, 'x');
      if (scrollX && scrollX.scrollLeft > 2) return;
      dropAnim();
      const touch = event.touches[0];
      const edge = touch.clientX <= EDGE;
      if (edge && event.cancelable) event.preventDefault();
      const scrollY = scrollableOf(event.target, 'y');
      track = {
        x: touch.clientX,
        y: touch.clientY,
        axis: null,
        edge,
        scrollY,
        top: scrollY?.scrollTop ?? 0,
        lastX: touch.clientX,
        lastT: performance.now(),
        velocity: 0,
      };
    };

    const onMove = (event: TouchEvent) => {
      if (!track || closing || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - track.x;
      const dy = touch.clientY - track.y;
      const now = performance.now();
      const dt = now - track.lastT;
      if (dt > 0 && dt < 80) track.velocity = (touch.clientX - track.lastX) / dt;
      track.lastX = touch.clientX;
      track.lastT = now;

      let axis = dismissAxis(dx, dy, track.axis);
      if (axis === 'x' && !track.axis && !track.edge && !event.cancelable) axis = 'y';
      if (axis === 'y') {
        track.axis = 'y';
        if (dragging) {
          dragging = false;
          paint(0, false);
          clearPaint();
        }
        if (track.edge && track.scrollY) {
          if (event.cancelable) event.preventDefault();
          const max = Math.max(0, track.scrollY.scrollHeight - track.scrollY.clientHeight);
          track.scrollY.scrollTop = clamp(track.top - dy, 0, max);
        }
        return;
      }
      if (axis !== 'x') {
        if (track.edge && event.cancelable) event.preventDefault();
        return;
      }
      track.axis = 'x';
      if (track.scrollY) track.scrollY.scrollTop = track.top;
      if (event.cancelable) event.preventDefault();
      dragging = true;
      suppressClick = true;
      paint(dx, false);
    };

    const onEnd = (event: TouchEvent) => {
      if (!track || closing) return;
      const dx = (event.changedTouches[0]?.clientX ?? track.x) - track.x;
      const velocity = track.velocity;
      const axis = track.axis;
      const width = panel.getBoundingClientRect().width || window.innerWidth;
      if (axis !== 'x') {
        const wasDragging = dragging;
        track = null;
        if (wasDragging) settle(false);
        return;
      }
      const flung = velocity > 0.5 && dx > 40;
      const far = dx > Math.min(96, width * 0.34);
      settle(flung || far);
    };

    const onCancel = () => {
      if (!track || closing) return;
      const wasX = track.axis === 'x';
      track = null;
      if (wasX) settle(false);
    };

    const onClick = (event: MouseEvent) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };

    layer.addEventListener('touchstart', onStart, { capture: true, passive: false });
    layer.addEventListener('touchmove', onMove, { capture: true, passive: false });
    layer.addEventListener('touchend', onEnd);
    layer.addEventListener('touchcancel', onCancel);
    layer.addEventListener('click', onClick, true);
    return () => {
      layer.removeEventListener('touchstart', onStart, true);
      layer.removeEventListener('touchmove', onMove, true);
      layer.removeEventListener('touchend', onEnd);
      layer.removeEventListener('touchcancel', onCancel);
      layer.removeEventListener('click', onClick, true);
      dropAnim();
      clearPaint();
    };
  }, [enabled, layerRef]);
}
