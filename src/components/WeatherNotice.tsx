import { useEffect, useId, useRef, useState } from 'react';
import skies from '../data/dayWeather.json';

const file = skies as { mock?: unknown; note?: unknown };
const mock = file.mock === true;
const note = typeof file.note === 'string' ? file.note.trim() : '';

/** 只有示意天气才提示。真预报没有 mock，按钮和说明都不出现。 */
export function weatherIsMock(): boolean {
  return mock && note.length > 0;
}

/** 电脑端一条说明。手机端和顶部功能按钮同一排，一枚告警图标，点开才看到同一句话。不是示意天气时两者都不出现。 */
export function WeatherNotice({ variant }: { variant: 'desk' | 'phone' }) {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== 'phone' || !open) return;
    const root = rootRef.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    const onSwipe = (event: TouchEvent) => {
      if (root && event.target instanceof Node && root.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('touchmove', onSwipe, { capture: true, passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('touchmove', onSwipe, true);
    };
  }, [open, variant]);

  if (!weatherIsMock()) return null;

  if (variant === 'desk') {
    return (
      <p className="wx-banner" role="note">
        <span className="wx-banner__mark" aria-hidden="true">
          !
        </span>
        {note}
      </p>
    );
  }

  return (
    <div className="wx-alert" ref={rootRef}>
      <button
        type="button"
        className={`wx-alert__btn${open ? ' is-on' : ''}`}
        aria-expanded={open}
        aria-controls={noteId}
        aria-label="天气提醒"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.4 21.6 20.2H2.4L12 3.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M12 9.1v5.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="17.15" r="0.95" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <p id={noteId} className="wx-alert__note" role="status">
          <span className="wx-alert__flag" aria-hidden="true">
            注意
          </span>
          {note}
        </p>
      ) : null}
    </div>
  );
}
