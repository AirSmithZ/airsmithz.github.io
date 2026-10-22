import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

const SWIPE_PX = 48;
const TAP_PX = 12;
const DOUBLE_TAP_MS = 280;
const DOUBLE_TAP_PX = 24;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_SCALE = 2;

type View = { scale: number; x: number; y: number };

const FIT: View = { scale: 1, x: 0, y: 0 };

function finger() {
  return window.matchMedia('(pointer: coarse)').matches;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isChrome(target: EventTarget | null) {
  return target instanceof Element && !!target.closest('button, p, .photo-zoom__bar, .skel, .skel-img__miss');
}

function frameImage(frame: HTMLElement) {
  const img = frame.querySelector('img');
  return img instanceof HTMLImageElement ? img : null;
}

function clampView(frame: DOMRect, img: HTMLImageElement, next: View): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
  const { naturalWidth: nw, naturalHeight: nh } = img;
  if (!nw || !nh || scale <= MIN_SCALE) return FIT;
  const fit = Math.min(frame.width / nw, frame.height / nh);
  const limitX = Math.max(0, (nw * fit * scale - frame.width) / 2);
  const limitY = Math.max(0, (nh * fit * scale - frame.height) / 2);
  return {
    scale,
    x: Math.min(limitX, Math.max(-limitX, next.x)),
    y: Math.min(limitY, Math.max(-limitY, next.y)),
  };
}

/** 把某一点保持在手指或光标下面，再夹到画面内。 */
function zoomAt(frame: DOMRect, img: HTMLImageElement, view: View, scale: number, clientX: number, clientY: number) {
  const cx = frame.left + frame.width / 2;
  const cy = frame.top + frame.height / 2;
  const k = scale / view.scale;
  return clampView(frame, img, {
    scale,
    x: clientX - cx - (clientX - cx - view.x) * k,
    y: clientY - cy - (clientY - cy - view.y) * k,
  });
}

function hitsPhoto(frame: HTMLElement, x: number, y: number, view: View) {
  const img = frameImage(frame);
  if (!img) return false;
  const box = frame.getBoundingClientRect();
  const { naturalWidth: nw, naturalHeight: nh } = img;
  if (!nw || !nh) return false;
  const fit = Math.min(box.width / nw, box.height / nh);
  const width = nw * fit * view.scale;
  const height = nh * fit * view.scale;
  const left = box.left + (box.width - width) / 2 + view.x;
  const top = box.top + (box.height - height) / 2 + view.y;
  return x >= left && x <= left + width && y >= top && y <= top + height;
}

function swallowFollowingClick() {
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    window.removeEventListener('click', stop, true);
  };
  window.addEventListener('click', stop, true);
  window.setTimeout(() => window.removeEventListener('click', stop, true), 400);
}

export function usePhotoZoomGesture(
  total: number,
  index: number,
  onShift: (delta: number) => void,
  onClose: () => void,
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>(FIT);
  const [paint, setPaint] = useState<View>(FIT);
  const [snapping, setSnapping] = useState(false);
  const [forIndex, setForIndex] = useState(index);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const start = useRef<{ x: number; y: number } | null>(null);
  const snapshot = useRef<View>(FIT);
  const pinch = useRef<{ dist: number; scale: number; x: number; y: number; midX: number; midY: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  if (forIndex !== index) {
    setForIndex(index);
    view.current = FIT;
    setPaint(FIT);
    setSnapping(false);
  }

  function commit(next: View, snap: boolean) {
    view.current = next;
    setSnapping(snap && !reducedMotion());
    setPaint(next);
  }

  function measure() {
    const frame = frameRef.current;
    const img = frame ? frameImage(frame) : null;
    if (!frame || !img) return null;
    return { frame, img, box: frame.getBoundingClientRect() };
  }

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const blockGesture = (event: Event) => {
      event.preventDefault();
    };
    const blockPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const onWheel = (event: WheelEvent) => {
      const dialog = frame.closest('dialog');
      if (!dialog?.contains(event.target as Node)) return;
      event.preventDefault();
      if (event.target instanceof Element && event.target.closest('button, p, .photo-zoom__bar')) return;
      const current = measure();
      if (!current) return;
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= current.box.height;
      const scale = view.current.scale * Math.exp(-delta * 0.0016);
      commit(zoomAt(current.box, current.img, view.current, scale, event.clientX, event.clientY), false);
    };
    document.addEventListener('gesturestart', blockGesture, { capture: true, passive: false });
    document.addEventListener('gesturechange', blockGesture, { capture: true, passive: false });
    document.addEventListener('touchmove', blockPinch, { capture: true, passive: false });
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => {
      document.removeEventListener('gesturestart', blockGesture, true);
      document.removeEventListener('gesturechange', blockGesture, true);
      document.removeEventListener('touchmove', blockPinch, true);
      document.removeEventListener('wheel', onWheel, true);
    };
  }, []);

  const reset = () => commit(FIT, true);

  const onPointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    if (event.target instanceof Element && event.target.closest('button')) {
      start.current = null;
      return;
    }
    moved.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: view.current.scale,
        x: view.current.x,
        y: view.current.y,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
      };
      start.current = null;
      return;
    }
    snapshot.current = view.current;
    start.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: PointerEvent<HTMLDialogElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = measure();
    if (!current) return;
    const pinchStart = pinch.current;
    if (pointers.current.size >= 2 && pinchStart) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const scale = pinchStart.scale * (dist / pinchStart.dist);
      const cx = current.box.left + current.box.width / 2;
      const cy = current.box.top + current.box.height / 2;
      const k = scale / pinchStart.scale;
      moved.current = true;
      commit(
        clampView(current.box, current.img, {
          scale,
          x: midX - cx - (pinchStart.midX - cx - pinchStart.x) * k,
          y: midY - cy - (pinchStart.midY - cy - pinchStart.y) * k,
        }),
        false,
      );
      return;
    }
    const origin = start.current;
    if (!origin || view.current.scale <= MIN_SCALE) return;
    commit(
      clampView(current.box, current.img, {
        scale: snapshot.current.scale,
        x: snapshot.current.x + (event.clientX - origin.x),
        y: snapshot.current.y + (event.clientY - origin.y),
      }),
      false,
    );
  };

  const finishPointer = (event: PointerEvent<HTMLDialogElement>) => {
    pointers.current.delete(event.pointerId);
    if (pinch.current && pointers.current.size < 2) {
      pinch.current = null;
      moved.current = true;
      start.current = null;
      return;
    }
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= TAP_PX) {
      commit(snapshot.current, false);
      tap(event);
      return;
    }
    moved.current = true;
    if (view.current.scale > MIN_SCALE) return;
    if (total > 1 && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) onShift(dx < 0 ? 1 : -1);
  };

  function tap(event: PointerEvent<HTMLDialogElement>) {
    const frame = frameRef.current;
    if (!frame) return;
    const onPhoto = hitsPhoto(frame, event.clientX, event.clientY, view.current);
    const now = performance.now();
    const prev = lastTap.current;
    if (
      prev &&
      now - prev.t < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - prev.x, event.clientY - prev.y) < DOUBLE_TAP_PX &&
      onPhoto
    ) {
      lastTap.current = null;
      moved.current = true;
      const current = measure();
      if (!current) return;
      if (view.current.scale > MIN_SCALE) commit(FIT, true);
      else commit(zoomAt(current.box, current.img, view.current, DOUBLE_SCALE, event.clientX, event.clientY), true);
      return;
    }
    lastTap.current = { t: now, x: event.clientX, y: event.clientY };
    if (!finger() || isChrome(event.target) || onPhoto) return;
    moved.current = true;
    swallowFollowingClick();
    onClose();
  }

  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (finger()) return;
    const frame = frameRef.current;
    if (isChrome(event.target) || (frame && hitsPhoto(frame, event.clientX, event.clientY, view.current))) return;
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (total < 2) return;
      event.preventDefault();
      onShift(event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    const current = measure();
    if (!current) return;
    const cx = current.box.left + current.box.width / 2;
    const cy = current.box.top + current.box.height / 2;
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      commit(zoomAt(current.box, current.img, view.current, view.current.scale * 1.25, cx, cy), true);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      commit(zoomAt(current.box, current.img, view.current, view.current.scale / 1.25, cx, cy), true);
    } else if (event.key === '0') {
      event.preventDefault();
      reset();
    }
  };

  const style: CSSProperties = {
    transform: `translate(${paint.x}px, ${paint.y}px) scale(${paint.scale})`,
  };

  return {
    frameRef,
    scale: paint.scale,
    snapping,
    style,
    reset,
    onPointerDown,
    onPointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onClick,
    onKeyDown,
  };
}
