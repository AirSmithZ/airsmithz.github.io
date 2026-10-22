import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from 'react';

type Variant = 'block' | 'text' | 'circle';
type Phase = 'loading' | 'ready' | 'error';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Skeleton({
  variant = 'block',
  width,
  height,
  label,
  className,
  style,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  width?: number | string;
  height?: number | string;
  /** 需要单独朗读时才传。图片槽不传，避免和 alt 重复。 */
  label?: string;
}) {
  const size: CSSProperties = {
    ...style,
    width: width == null ? style?.width : typeof width === 'number' ? `${width}px` : width,
    height: height == null ? style?.height : typeof height === 'number' ? `${height}px` : height,
  };
  return (
    <span
      {...rest}
      className={cx('skel', `skel--${variant}`, className)}
      style={size}
      aria-hidden={label ? undefined : true}
      role={label ? 'status' : undefined}
      aria-label={label}
    />
  );
}

export function SkeletonImage({
  src,
  alt = '',
  ratio = '3 / 4',
  fit = 'inline',
  retry = false,
  className,
  onLoad,
  onError,
  loading,
  decoding,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, 'children'> & {
  /** 加载完成前占位的宽高比，例如 `3 / 4`。放大查看时忽略。 */
  ratio?: string;
  fit?: 'inline' | 'frame';
  /** 失败时给出「再试一次」。不要放进另一个按钮里。 */
  retry?: boolean;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [seen, setSeen] = useState(src);
  const [phase, setPhase] = useState<Phase>(src ? 'loading' : 'error');
  const [attempt, setAttempt] = useState(0);
  const frame = fit === 'frame';

  if (src !== seen) {
    setSeen(src);
    setPhase(src ? 'loading' : 'error');
  }

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !src) return;
    if (img.complete && img.naturalWidth > 0) setPhase('ready');
    else if (img.complete && img.naturalWidth === 0) setPhase('error');
  }, [src, attempt]);

  function markReady(event: SyntheticEvent<HTMLImageElement>) {
    setPhase('ready');
    onLoad?.(event);
  }

  function markError(event: SyntheticEvent<HTMLImageElement>) {
    setPhase('error');
    onError?.(event);
  }

  return (
    <span
      className={cx('skel-img', frame && 'skel-img--frame', className)}
      data-phase={phase}
      style={frame ? undefined : ({ '--skel-ratio': ratio } as CSSProperties)}
      aria-busy={phase === 'loading' || undefined}
    >
      {phase === 'loading' ? <Skeleton className="skel-img__plate" /> : null}
      {phase === 'error' ? (
        <span className="skel-img__miss">
          <span>这张图没载出来</span>
          {retry ? (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setPhase('loading');
                setAttempt((n) => n + 1);
              }}
            >
              再试一次
            </button>
          ) : null}
        </span>
      ) : null}
      {src ? (
        <img
          {...rest}
          ref={imgRef}
          key={attempt}
          src={src}
          alt={phase === 'error' ? '' : alt}
          aria-hidden={phase === 'error' || undefined}
          loading={loading ?? (frame ? 'eager' : 'lazy')}
          decoding={decoding ?? 'async'}
          onLoad={markReady}
          onError={markError}
        />
      ) : null}
    </span>
  );
}
