/**
 * Edge（Chromium）在 Windows 上的三件具体事：
 * 滚动条占布局、视口高度跟着地址栏/侧栏变、滚轮按“行”而不是像素。
 * 不看 UA。同一套行为在别的桌面浏览器上同样成立。
 */

let stopViewport: (() => void) | null = null;

export function readViewportBox(): { height: number; offsetTop: number } {
  const layoutHeight = window.innerHeight;
  const viewport = window.visualViewport;
  if (!viewport) return { height: layoutHeight, offsetTop: 0 };
  const offsetTop = Math.max(0, Math.round(viewport.offsetTop));
  const visible = Math.round(viewport.height);
  return {
    height: Math.max(0, Math.min(layoutHeight, visible)),
    offsetTop,
  };
}

/** 把可见视口写成 --app-h / --vv-top。重复调用会先卸掉上一轮监听，方便热更新。 */
export function bindViewportBox(): void {
  stopViewport?.();
  const root = document.documentElement;
  let height = '';
  let top = '';
  const apply = () => {
    const box = readViewportBox();
    const nextHeight = `${box.height}px`;
    const nextTop = `${box.offsetTop}px`;
    if (nextHeight !== height) {
      height = nextHeight;
      root.style.setProperty('--app-h', nextHeight);
    }
    if (nextTop !== top) {
      top = nextTop;
      root.style.setProperty('--vv-top', nextTop);
    }
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', apply);
  viewport?.addEventListener('scroll', apply);
  stopViewport = () => {
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', apply);
    viewport?.removeEventListener('resize', apply);
    viewport?.removeEventListener('scroll', apply);
    stopViewport = null;
  };
}

const canMixColor =
  typeof CSS !== 'undefined' && CSS.supports('color', 'color-mix(in srgb, red, blue)');

/** color-mix 不可用时退回底色，避免背景声明整段失效。 */
export function mixColor(color: string, percent: number, onto: string): string {
  if (canMixColor) return `color-mix(in srgb, ${color} ${percent}%, ${onto})`;
  return onto === 'transparent' ? color : onto;
}

/** deltaMode 为行/页时换成像素。Shift 仍表示横向滚。 */
export function wheelPixels(event: {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  shiftKey: boolean;
}): { x: number; y: number } {
  const page = typeof window === 'undefined' ? 800 : window.innerHeight;
  const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? page : 1;
  const dx = event.deltaX * scale;
  const dy = event.deltaY * scale;
  if (event.shiftKey) return { x: dy || dx, y: 0 };
  return { x: dx, y: dy };
}

/** 指针滑出窗口后 Edge 会停发 pointerup，除非抓住这根指针。 */
export function capturePointer(target: EventTarget | null, pointerId: number): void {
  if (!(target instanceof Element) || typeof target.setPointerCapture !== 'function') return;
  try {
    target.setPointerCapture(pointerId);
  } catch {
    /* 指针已经松开时 Edge 会抛 InvalidStateError */
  }
}
