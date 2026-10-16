import { guideById, type GuideId } from '../guides';
import type { PrepMode } from './PrepBoard';

export function GuideBoard({ id, mode, onClose }: { id: GuideId; mode: PrepMode; onClose: () => void }) {
  const guide = guideById(id);
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
    </section>
  );
}
