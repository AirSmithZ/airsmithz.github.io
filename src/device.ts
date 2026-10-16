/**
 * 电脑：有精细指针、能悬停、视口够宽。手机和平板留在手机壳。调用方只在进入页面时判一次。
 * Edge 触屏电脑的主指针经常是手指，`pointer` / `hover` 会把宽屏判成手机壳，所以看 any-*。
 */
export function isPhoneClient(): boolean {
  if (typeof window === 'undefined') return true;
  const fine = window.matchMedia('(any-pointer: fine)').matches;
  const hover = window.matchMedia('(any-hover: hover)').matches;
  const wide = window.matchMedia('(min-width: 960px)').matches;
  return !(fine && hover && wide);
}
