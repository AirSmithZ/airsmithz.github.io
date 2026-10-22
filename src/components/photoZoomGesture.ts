import { useRef, type MouseEvent, type PointerEvent } from 'react';

const SWIPE_PX = 48;
const TAP_PX = 12;

function finger() {
  return window.matchMedia('(pointer: coarse)').matches;
}

/** 点在照片内容、按钮或说明上时不关闭。object-fit 留出的空白算毛玻璃。 */
function blocksDismiss(target: EventTarget | null, x: number, y: number) {
  if (!(target instanceof Element)) return true;
  if (target.closest('button, p, .photo-zoom__bar, .skel, .skel-img__miss')) return true;
  const img = target instanceof HTMLImageElement ? target : target.closest('img');
  if (!(img instanceof HTMLImageElement)) return false;
  const box = img.getBoundingClientRect();
  const { naturalWidth: nw, naturalHeight: nh } = img;
  if (!nw || !nh) return true;
  const scale = Math.min(box.width / nw, box.height / nh);
  const width = nw * scale;
  const height = nh * scale;
  const left = box.left + (box.width - width) / 2;
  const top = box.top + (box.height - height) / 2;
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
  onShift: (delta: number) => void,
  onClose: () => void,
) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (event: PointerEvent<HTMLDialogElement>) => {
    moved.current = false;
    if (event.target instanceof Element && event.target.closest('button')) {
      start.current = null;
      return;
    }
    start.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDialogElement>) => {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (total > 1 && Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      moved.current = true;
      onShift(dx < 0 ? 1 : -1);
      return;
    }
    if (!finger() || Math.hypot(dx, dy) > TAP_PX) return;
    if (blocksDismiss(event.target, event.clientX, event.clientY)) return;
    moved.current = true;
    swallowFollowingClick();
    onClose();
  };

  const onClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (moved.current) {
      moved.current = false;
      return;
    }
    // 触摸关闭走 pointerup，避免滑动结束时补发的 click 把看图关掉。
    if (finger()) return;
    if (blocksDismiss(event.target, event.clientX, event.clientY)) return;
    onClose();
  };

  return { onPointerDown, onPointerUp, onClick };
}
