import { DIGEST_STOPS } from '../digest';

export function DigestBoard() {
  return (
    <section className="digest digest--stage" aria-label="概览" data-testid="digest-board">
      <div className="digest__sheet">
        <header className="digest__head">
          <p className="digest__kicker">
            <span>21 天</span>
            <span aria-hidden="true">·</span>
            <span>9 段</span>
          </p>
          <div className="digest__mast">
            <h2>概览</h2>
            <p className="digest__lede">
              <span>2 月 8 日 – 2 月 28 日。3 月 1 日 05:00 落到天府。</span>
              <span>按当晚住下的地方分段。</span>
            </p>
          </div>
        </header>
        <ol className="digest__stops">
          {DIGEST_STOPS.map((stop, index) => (
            <li key={stop.region} className={stop.region === '成都' ? 'is-quiet' : undefined} style={{ animationDelay: `${index * 40}ms` }}>
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
                    <li key={item.text}>
                      <span className="digest__icon" aria-hidden>
                        {item.icon}
                      </span>
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
