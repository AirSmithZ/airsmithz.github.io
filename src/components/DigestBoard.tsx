import { DIGEST_STOPS } from '../digest';

interface DigestBoardProps {
  /** land：左栏窄列。port：竖屏弹层，卡片拉开。 */
  mode: 'land' | 'port';
  onClose: () => void;
}

export function DigestBoard({ mode, onClose }: DigestBoardProps) {
  return (
    <section className={`digest digest--${mode}`} aria-label="行程汇总" data-testid="digest-board">
      <header className="digest__head">
        <div>
          <p className="eyebrow">21 天 · 9 段</p>
          <h2>行程汇总</h2>
          <p className="fine">2 月 9 日 – 3 月 1 日。按当晚住下的地方分段。</p>
        </div>
        <button type="button" className="text-btn digest__close" onClick={onClose}>
          关闭
        </button>
      </header>
      <ol className="digest__stops">
        {DIGEST_STOPS.map((stop, index) => (
          <li key={stop.region} className={stop.region === '成都' ? 'is-quiet' : undefined}>
            <span className="digest__index" aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="digest__body">
              <div className="digest__title">
                <strong>{stop.region}</strong>
                <span>{stop.country}</span>
              </div>
              <p className="digest__when">{stop.when}</p>
              <ul>
                {stop.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
