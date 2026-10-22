import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { guideById, type GuideFigure, type GuideId } from '../guides';
import type { PrepMode } from './PrepBoard';
import { SkeletonImage } from './Skeleton';

export function GuideBoard({ id, mode, onClose }: { id: GuideId; mode: PrepMode; onClose: () => void }) {
  const guide = guideById(id);
  const figures = useMemo(() => guide.steps.flatMap((step) => step.figures ?? []), [guide]);
  const [open, setOpen] = useState<number | null>(null);
  const closeZoom = useCallback(() => setOpen(null), []);
  const shift = useCallback(
    (delta: number) => {
      setOpen((current) => {
        if (current == null || figures.length < 2) return current;
        return (current + delta + figures.length) % figures.length;
      });
    },
    [figures.length],
  );

  useEffect(() => {
    setOpen(null);
  }, [id]);

  return (
    <section className={`prep prep--${mode} guide`} aria-label={guide.title} data-testid={`guide-${id}`}>
      <header className="prep__head">
        <div>
          <p className="eyebrow">{guide.eyebrow}</p>
          <h2>{guide.title}</h2>
          <p className="fine">{guide.lede}</p>
        </div>
        <button type="button" className="text-btn prep__close" onClick={onClose}>
          关闭
        </button>
      </header>
      <ol className="guide__steps">
        {guide.steps.map((step, index) => (
          <li key={step.title} className="guide__step" style={{ animationDelay: `${index * 40}ms` }}>
            <span className="guide__index" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="guide__copy">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {step.href ? (
                <a href={step.href} target="_blank" rel="noreferrer">
                  {step.hrefLabel ?? step.href}
                </a>
              ) : null}
              {step.figures?.map((figure) => (
                <figure key={figure.src} className="guide-photo">
                  <button
                    type="button"
                    className="guide-photo__open"
                    aria-label={`放大：${figure.alt}`}
                    onClick={() => {
                      const at = figures.findIndex((item) => item.src === figure.src);
                      setOpen(at >= 0 ? at : 0);
                    }}
                  >
                    <SkeletonImage
                      src={`${import.meta.env.BASE_URL}${figure.src}`}
                      alt={figure.alt}
                      ratio="3 / 4"
                    />
                  </button>
                  <figcaption>{figure.caption}</figcaption>
                </figure>
              ))}
              {step.screen ? (
                <figure className="guide-screen">
                  <div className="guide-screen__bar">
                    <span />
                    <span />
                    <span />
                    <b>{step.screen.window}</b>
                  </div>
                  <ol>
                    {step.screen.fields.map((field) => (
                      <li key={field.label}>
                        <small>{field.label}</small>
                        <strong>{field.value}</strong>
                      </li>
                    ))}
                  </ol>
                  <figcaption>{step.screen.caption}</figcaption>
                </figure>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {open != null && figures[open] ? (
        <PhotoZoom figure={figures[open]} index={open} total={figures.length} onShift={shift} onClose={closeZoom} />
      ) : null}
    </section>
  );
}

function PhotoZoom({
  figure,
  index,
  total,
  onShift,
  onClose,
}: {
  figure: GuideFigure;
  index: number;
  total: number;
  onShift: (delta: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const pin = () => {
      if (document.activeElement !== dialog) dialog.focus({ preventScroll: true });
    };
    pin();
    const frame = requestAnimationFrame(pin);
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      cancelAnimationFrame(frame);
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  return createPortal(
    <dialog
      ref={ref}
      className="photo-zoom"
      aria-label={figure.alt}
      data-testid="photo-zoom"
      tabIndex={-1}
      autoFocus
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, img, p')) return;
        onClose();
      }}
      onKeyDown={(event) => {
        if (total < 2) return;
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onShift(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          onShift(1);
        }
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('button')) {
          startX.current = null;
          return;
        }
        startX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (startX.current == null || total < 2) return;
        const delta = event.clientX - startX.current;
        startX.current = null;
        if (Math.abs(delta) < 48) return;
        onShift(delta < 0 ? 1 : -1);
      }}
    >
      <div className="photo-zoom__bar">
        {total > 1 ? (
          <div className="photo-zoom__nav">
            <button type="button" className="text-btn" onClick={() => onShift(-1)}>
              上一张
            </button>
            <button type="button" className="text-btn" onClick={() => onShift(1)}>
              下一张
            </button>
          </div>
        ) : (
          <span />
        )}
        <button type="button" className="text-btn" onClick={onClose}>
          关闭
        </button>
      </div>
      <div className="photo-zoom__frame">
        <SkeletonImage
          src={`${import.meta.env.BASE_URL}${figure.src}`}
          alt={figure.alt}
          fit="frame"
          retry
        />
      </div>
      <p>
        {total > 1 ? `${index + 1} / ${total} · ` : ''}
        {figure.caption}
      </p>
    </dialog>,
    document.body,
  );
}
