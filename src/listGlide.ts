/**
 * 手机当天列表的上下滑：跟手、惯性、顶和底的回弹。
 *
 * 橡胶带用 Apple 的公式（constant 0.55），和 fastred/CustomScrollView、
 * Designing Fluid Interfaces 里的一致。越出边，位移越小。
 * 松手后的滑行用 UIScrollView 的 normal 衰减 0.998（每毫秒）。
 * 冲出边缘后交给临界阻尼弹簧拉回，只过冲一次，不再来回晃。
 */

const RUBBER = 0.55;
const DECAY = 0.998;
const STIFFNESS = 240;
const DAMPING = 32;
const TRACK_MS = 240;

export const TRACK_EASE = `transform ${TRACK_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;

export function rubberBand(overshoot: number, dimension: number, constant = RUBBER): number {
  const limit = Math.max(1, dimension);
  const distance = Math.abs(overshoot);
  const resisted = (distance * limit * constant) / (limit + constant * distance);
  return Math.sign(overshoot) * resisted;
}

/** 横向翻到第一天或最后一天时，边缘跟手变沉，不再按固定比例硬缩。 */
export function edgeRubber(dx: number, index: number, count: number, span: number): number {
  const atStart = dx > 0 && index <= 0;
  const atEnd = dx < 0 && index >= count - 1;
  if (!atStart && !atEnd) return dx;
  return rubberBand(dx, Math.max(1, span));
}

export function fingerVelocity(samples: ReadonlyArray<{ t: number; p: number }>): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let first = samples[0];
  for (let i = samples.length - 1; i >= 0; i -= 1) {
    if (last.t - samples[i].t <= 90) first = samples[i];
    else break;
  }
  const dt = last.t - first.t;
  if (dt < 8) return 0;
  return (last.p - first.p) / dt;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function rubberClamp(value: number, min: number, max: number, dimension: number): number {
  if (value < min) return min - rubberBand(min - value, dimension);
  if (value > max) return max + rubberBand(value - max, dimension);
  return value;
}

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readTranslateY(el: HTMLElement): number {
  const matched = /translate3d\(\s*0px\s*,\s*(-?[\d.]+)px/.exec(el.style.transform);
  return matched ? Number(matched[1]) : 0;
}

/**
 * 一根手指控制一页列表。范围里改 scrollTop；拉出顶或底时，内层 sheet 用 translate 露出空隙，松手弹回。
 * position：0 在顶，max 在底；小于 0 是下拉过头，大于 max 是上拉过头。
 */
export class ListGlide {
  private page: HTMLElement | null = null;
  private sheet: HTMLElement | null = null;
  private position = 0;
  private anchor = 0;
  private dragOrigin = 0;
  private fingerY = 0;
  private velocity = 0;
  private pinned = 0;
  private max = 0;
  private height = 1;
  private frame = 0;
  private lastT = 0;
  private spring: -1 | 0 | 1 = 0;
  private held = false;
  private armed = false;
  private reduce = false;
  private samples: { t: number; p: number }[] = [];

  hold(page: HTMLElement | null) {
    this.cancel();
    this.held = true;
    this.armed = false;
    this.spring = 0;
    this.samples = [];
    if (!page) {
      this.page = null;
      this.sheet = null;
      return;
    }
    const same = this.page === page;
    this.page = page;
    this.sheet = page.querySelector<HTMLElement>(':scope > .day-pager__sheet');
    this.reduce = prefersReduced();
    this.measure();
    if (!same) {
      this.position = this.readVisual();
      this.pinned = clamp(page.scrollTop, 0, this.max);
    }
    this.anchor = this.pinned;
    this.dragOrigin = this.position;
  }

  /** 竖向锁定后从当前手指位置重新跟手，锁定前的那一小段不算进滚动，避免列表突然跳一下。 */
  arm(clientY: number) {
    if (!this.page) return;
    this.measure();
    this.dragOrigin = this.position;
    this.fingerY = clientY;
    this.armed = true;
    this.samples = [{ t: performance.now(), p: clientY }];
  }

  dragTo(clientY: number) {
    if (!this.armed || !this.page) return;
    const now = performance.now();
    this.samples.push({ t: now, p: clientY });
    const cutoff = now - 120;
    while (this.samples.length > 3 && this.samples[0].t < cutoff) this.samples.shift();
    this.measure();
    const raw = this.dragOrigin - (clientY - this.fingerY);
    this.position = this.reduce ? clamp(raw, 0, this.max) : rubberClamp(raw, 0, this.max, this.height);
    this.paint();
  }

  /** 改判成左右切日期时，竖向拉过的距离收回按下时的位置。 */
  drop() {
    this.cancel();
    this.held = false;
    this.armed = false;
    this.spring = 0;
    this.velocity = 0;
    if (!this.page) return;
    this.position = this.anchor;
    this.settle();
    this.page = null;
    this.sheet = null;
  }

  release() {
    if (!this.page) return;
    this.held = false;
    this.armed = false;
    this.measure();
    const fingerVy = fingerVelocity(this.samples);
    this.samples = [];
    let velocity = -fingerVy;
    if (this.reduce) {
      this.position = clamp(this.position, 0, this.max);
      this.velocity = 0;
      this.spring = 0;
      this.finish();
      return;
    }
    if (this.position < -0.5) this.spring = -1;
    else if (this.position > this.max + 0.5) this.spring = 1;
    else {
      this.position = clamp(this.position, 0, this.max);
      this.spring = 0;
    }
    this.velocity = velocity;
    if (this.spring === 0 && Math.abs(velocity) < 0.04) {
      this.finish();
      return;
    }
    this.lastT = performance.now();
    this.cancel();
    this.frame = requestAnimationFrame(this.step);
  }

  dispose() {
    this.cancel();
    if (this.page) {
      this.position = clamp(this.position, 0, this.max);
      this.spring = 0;
      this.settle();
    }
    this.page = null;
    this.sheet = null;
    this.held = false;
    this.armed = false;
  }

  private measure() {
    const page = this.page;
    if (!page) return;
    this.max = Math.max(0, page.scrollHeight - page.clientHeight);
    this.height = Math.max(1, page.clientHeight);
  }

  private readVisual(): number {
    this.measure();
    const shift = this.sheet ? readTranslateY(this.sheet) : 0;
    return (this.page?.scrollTop ?? 0) - shift;
  }

  /** 滑动过程只移动内层，scrollTop 钉住，避免每一帧都把整页重新排版。 */
  private paint() {
    const page = this.page;
    const sheet = this.sheet;
    if (!page || !sheet) return;
    page.style.overflowY = 'hidden';
    if (Math.abs(page.scrollTop - this.pinned) > 0.4) page.scrollTop = this.pinned;
    const shift = this.pinned - this.position;
    if (Math.abs(shift) < 0.3) {
      if (sheet.style.transform) sheet.style.transform = '';
    } else {
      sheet.style.transform = `translate3d(0px, ${shift}px, 0px)`;
    }
  }

  /** 手势结束，把视觉位置写回 scrollTop，清掉位移。 */
  private settle() {
    const page = this.page;
    const sheet = this.sheet;
    if (!page) return;
    const next = clamp(this.position, 0, this.max);
    this.position = next;
    this.pinned = next;
    page.style.overflowY = '';
    if (sheet?.style.transform) sheet.style.transform = '';
    if (Math.abs(page.scrollTop - next) > 0.4) page.scrollTop = next;
  }

  private finish() {
    this.frame = 0;
    this.spring = 0;
    this.velocity = 0;
    this.settle();
    this.page = null;
    this.sheet = null;
  }

  private cancel() {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private step = (now: number) => {
    const page = this.page;
    if (!page || !page.isConnected || this.held) {
      this.frame = 0;
      return;
    }
    const dt = Math.min(34, now - this.lastT);
    this.lastT = now;
    if (dt <= 0) {
      this.frame = requestAnimationFrame(this.step);
      return;
    }
    this.measure();
    const min = 0;
    const max = this.max;

    if (this.spring !== 0) {
      const target = this.spring < 0 ? min : max;
      const dtSec = dt / 1000;
      let speed = this.velocity * 1000;
      const offset = this.position - target;
      const accel = -STIFFNESS * offset - DAMPING * speed;
      speed += accel * dtSec;
      this.position += speed * dtSec;
      const cap = this.height * 0.42;
      if (this.position < target - cap) {
        this.position = target - cap;
        if (speed < 0) speed = 0;
      } else if (this.position > target + cap) {
        this.position = target + cap;
        if (speed > 0) speed = 0;
      }
      this.velocity = speed / 1000;
      if (Math.abs(this.position - target) < 1.5 && Math.abs(speed) < 80) {
        this.position = target;
        this.finish();
        return;
      }
      this.paint();
      this.frame = requestAnimationFrame(this.step);
      return;
    }

    const next = this.position + this.velocity * dt;
    if (next < min || next > max) {
      this.position = next < min ? min : max;
      this.spring = next < min ? -1 : 1;
      this.paint();
      this.frame = requestAnimationFrame(this.step);
      return;
    }

    this.position = next;
    this.velocity *= DECAY ** dt;
    this.paint();
    if (Math.abs(this.velocity) < 0.012) {
      this.finish();
      return;
    }
    this.frame = requestAnimationFrame(this.step);
  };
}
