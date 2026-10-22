import { useEffect, useId, useRef, useState } from 'react';
import skies from '../data/dayWeather.json';

const mock = Boolean((skies as { mock?: boolean }).mock);
const note = String((skies as { note?: string }).note || '').trim();

export function weatherIsMock(): boolean {
  return mock && note.length > 0;
}

function splitSkyNote(text: string): { lead: string; rest: string } {
  const cut = text.indexOf('。');
  if (cut < 0) return { lead: text, rest: '' };
  return { lead: text.slice(0, cut + 1), rest: text.slice(cut + 1).trim() };
}

function SkyBody({ text }: { text: string }) {
  const cut = text.indexOf('，');
  if (cut < 0 || cut > 28) return text;
  return (
    <>
      {text.slice(0, cut + 1)}
      <br />
      {text.slice(cut + 1).trim()}
    </>
  );
}

function SkyStamp() {
  return (
    <svg className="wx-alert__mark" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="2.15" fill="currentColor" />
      <circle
        cx="9"
        cy="9"
        r="6.15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeDasharray="2.15 2.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 电脑端一条说明。手机端一枚示意章，点开才看到同一句话。 */
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

  const sky = splitSkyNote(note);

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
        <SkyStamp />
        <span className="wx-alert__label">注意</span>
      </button>
      {open ? (
        <div id={noteId} className="wx-alert__note" role="status">
          <p className="wx-alert__kicker">天气 · 注意</p>
          <p className="wx-alert__lead">{sky.lead}</p>
          {sky.rest ? (
            <p className="wx-alert__body">
              <SkyBody text={sky.rest} />
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
