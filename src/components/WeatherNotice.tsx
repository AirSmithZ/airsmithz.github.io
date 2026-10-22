import { useEffect, useId, useRef, useState } from 'react';
import skies from '../data/dayWeather.json';

const mock = Boolean((skies as { mock?: boolean }).mock);
const note = String((skies as { note?: string }).note || '').trim();

export function weatherIsMock(): boolean {
  return mock && note.length > 0;
}

/** 电脑端一条说明。手机端一个告警，点开才看到同一句话。 */
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
        aria-label="天气是示意"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">!</span>
      </button>
      {open ? (
        <p id={noteId} className="wx-alert__note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
