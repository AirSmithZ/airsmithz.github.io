import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CostQuote, Doc, EditorSession, NodeCategory, TransportMode, TripEdge, TripNode } from '../types';
import { CATEGORIES, TRANSPORTS, nodeFace } from '../types';
import { formatMoney } from '../money';
import { blankNode, edgeModeWord, incomingEdge, previousInDay, uid } from '../trip';
import { actions } from '../store';
import { Check } from './Check';
import { SkeletonImage } from './Skeleton';

interface FormState {
  name: string;
  category: NodeCategory;
  start: string;
  end: string;
  optional: boolean;
  address: string;
  lat: string;
  lng: string;
  tips: string;
  costLabel: string;
  region: string;
  quotes: CostQuote[];
  linkPrev: boolean;
  edgeId: string | null;
  transport: TransportMode;
  minutes: string;
  edgeLabel: string;
}

interface NodePanelProps {
  doc: Doc;
  editor: EditorSession | null;
  selectedId: string | null;
  dayIndex: number;
  variant: 'side' | 'modal';
  onClose?: () => void;
  /** 文案里的设备。逻辑相同，只区分「这台手机 / 这台电脑」。 */
  host?: 'phone' | 'desk';
}

function toTime(value?: string): string {
  if (!value) return '';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function parseCoord(value: string): number | null {
  const text = value.trim().replace(/,/g, '.');
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function emptyQuote(): CostQuote {
  return { item: '', currency: 'CNY', per_person: null, party: null, in_total: true };
}

function buildForm(doc: Doc, editor: EditorSession): FormState | null {
  const day = doc.itinerary.days[editor.dayIndex];
  if (!day) return null;
  const existing = editor.mode === 'edit' ? day.nodes.find((node) => node.id === editor.nodeId) : null;
  const base = existing ?? blankNode(day, editor.nodeId);
  const edge = editor.mode === 'edit' ? incomingEdge(doc, editor.nodeId) : null;
  const prev = previousInDay(day, editor.mode === 'create' ? null : editor.nodeId);
  return {
    name: base.name,
    category: base.category,
    start: toTime(base.start_time),
    end: toTime(base.end_time),
    optional: base.is_optional,
    address: base.address ?? '',
    lat: base.lat === 0 && base.lng === 0 ? '' : String(base.lat),
    lng: base.lat === 0 && base.lng === 0 ? '' : String(base.lng),
    tips: (base.tips ?? []).join('\n'),
    costLabel: base.cost_label ?? '',
    region: base.region ?? day.region ?? '',
    quotes: (base.cost_quotes ?? []).map((quote) => ({ ...quote })),
    linkPrev: editor.mode === 'create' ? Boolean(prev) : false,
    edgeId: edge?.id ?? null,
    transport: edge?.transport_mode ?? 'walk',
    minutes: edge ? String(edge.duration_minutes) : '',
    edgeLabel: edge?.label ?? '',
  };
}

export function NodePanel({ doc, editor, selectedId, dayIndex, variant, onClose, host = 'phone' }: NodePanelProps) {
  const place = host === 'desk' ? '电脑' : '手机';
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [photoAt, setPhotoAt] = useState<number | null>(null);

  useEffect(() => {
    setPhotoAt(null);
  }, [selectedId]);

  useEffect(() => {
    setError('');
    setAskDelete(false);
    setForm(editor ? buildForm(doc, editor) : null);
    // 编辑过程中如果只是别的字段写入了文档，不要把正在填的表清掉。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const found = selectedId
    ? doc.itinerary.days
        .map((day, index) => ({ day, dayIndex: index, node: day.nodes.find((node) => node.id === selectedId) }))
        .find((item) => item.node)
    : null;

  const day =
    (editor ? doc.itinerary.days[editor.dayIndex] : found?.day) ?? doc.itinerary.days[dayIndex];
  const node = found?.node ?? null;
  const viewingEdge = node ? incomingEdge(doc, node.id) : null;

  function patch(partial: Partial<FormState>) {
    setForm((current) => (current ? { ...current, ...partial } : current));
  }

  function patchQuote(index: number, partial: Partial<CostQuote>) {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        quotes: current.quotes.map((quote, quoteIndex) => (quoteIndex === index ? { ...quote, ...partial } : quote)),
      };
    });
  }

  function save() {
    if (!editor || !form || !day) return;
    if (!form.name.trim()) {
      setError('先写名称。');
      return;
    }
    const latEmpty = form.lat.trim() === '';
    const lngEmpty = form.lng.trim() === '';
    let lat = 0;
    let lng = 0;
    if (!latEmpty || !lngEmpty) {
      const latN = parseCoord(form.lat);
      const lngN = parseCoord(form.lng);
      if (latN == null || lngN == null || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
        setError('纬度和经度要成对填写。纬度 -90 到 90，经度 -180 到 180。都留空则不出现在地图上。');
        return;
      }
      lat = latN;
      lng = lngN;
    }
    const existing = editor.mode === 'edit' ? day.nodes.find((item) => item.id === editor.nodeId) : null;
    const base: TripNode = existing ?? blankNode(day, editor.nodeId);
    const nextNode: TripNode = {
      ...base,
      id: editor.nodeId,
      name: form.name.trim(),
      category: form.category,
      start_time: form.start || undefined,
      end_time: form.end || undefined,
      is_optional: form.optional,
      address: form.address.trim() || undefined,
      lat,
      lng,
      tips: form.tips.split('\n').map((line) => line.trim()).filter(Boolean),
      cost_label: form.costLabel.trim() || undefined,
      region: form.region.trim() || day.region,
      cost_quotes: form.quotes,
    };
    const prev = previousInDay(day, editor.mode === 'create' ? null : editor.nodeId);
    let edge: TripEdge | null = null;
    if (form.edgeId) {
      const current = incomingEdge(doc, editor.nodeId);
      if (current) {
        edge = {
          ...current,
          transport_mode: form.transport,
          duration_minutes: Number(form.minutes) || 0,
          label: form.edgeLabel.trim() || undefined,
        };
      }
    } else if (form.linkPrev && prev) {
      edge = {
        id: uid('e'),
        from: prev.id,
        to: editor.nodeId,
        type: 'primary',
        transport_mode: form.transport,
        duration_minutes: Number(form.minutes) || 0,
        label: form.edgeLabel.trim() || undefined,
        route_source: 'user_hint',
      };
    }
    actions.saveNode({ mode: editor.mode, dayIndex: editor.dayIndex, node: nextNode, edge });
  }

  const prevName = day ? previousInDay(day, editor?.mode === 'create' ? null : editor?.nodeId ?? null)?.name : null;

  const dayLine = day ? `D${day.day_index} ${day.date.slice(5)} ${day.region ?? ''}`.trim() : '行程';

  return (
    <section
      className={`node-panel node-panel--${variant}${editor ? ' is-editing' : ''}`}
      aria-label={editor ? '编辑站点' : '站点详情'}
      data-testid="node-panel"
    >
      {editor && form && day ? (
        <form
          className="node-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <header className="panel-head">
            <div>
              <p className="eyebrow">{editor.mode === 'create' ? '新站点' : '编辑站点'}</p>
              <h2>{dayLine}</h2>
            </div>
            <button type="button" className="text-btn" onClick={() => actions.cancelEditor()}>
              取消
            </button>
          </header>
          <p className="fine">
            {host === 'desk'
              ? '只改这一天里的节点。已有日期不能改，总览末尾可以再加一天。'
              : '只改这一天里的节点。天数和日期不能动。'}
          </p>
          <label className="field">
            <span>名称</span>
            <input value={form.name} onChange={(event) => patch({ name: event.target.value })} autoComplete="off" required />
          </label>
          <div className="row2">
            <label className="field">
              <span>类别</span>
              <select
                value={form.category}
                onChange={(event) => patch({ category: event.target.value as NodeCategory })}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <Check className="field field--check" checked={form.optional} onChange={(optional) => patch({ optional })}>
              可选，不去也行
            </Check>
          </div>
          <div className="row2">
            <label className="field">
              <span>开始</span>
              <input type="time" value={form.start} onChange={(event) => patch({ start: event.target.value })} />
            </label>
            <label className="field">
              <span>结束</span>
              <input type="time" value={form.end} onChange={(event) => patch({ end: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>地址</span>
            <input value={form.address} onChange={(event) => patch({ address: event.target.value })} autoComplete="off" />
          </label>
          <div className="row2">
            <label className="field">
              <span>纬度</span>
              <input
                inputMode="decimal"
                value={form.lat}
                onChange={(event) => patch({ lat: event.target.value })}
                placeholder="留空则不上地图"
              />
            </label>
            <label className="field">
              <span>经度</span>
              <input inputMode="decimal" value={form.lng} onChange={(event) => patch({ lng: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>站点地区</span>
            <input value={form.region} onChange={(event) => patch({ region: event.target.value })} />
          </label>
          <label className="field">
            <span>备注，一行一条</span>
            <textarea rows={3} value={form.tips} onChange={(event) => patch({ tips: event.target.value })} />
          </label>
          <label className="field">
            <span>费用短句</span>
            <input value={form.costLabel} onChange={(event) => patch({ costLabel: event.target.value })} />
          </label>
          <div className="quote-block">
            <div className="block-head">
              <h3>开销</h3>
              <button type="button" className="text-btn" onClick={() => patch({ quotes: [...form.quotes, emptyQuote()] })}>
                加一笔
              </button>
            </div>
            {form.quotes.map((quote, index) => (
              <div className="quote" key={`${editor.token}-${index}`}>
                <label className="field">
                  <span>项目</span>
                  <input value={quote.item} onChange={(event) => patchQuote(index, { item: event.target.value })} />
                </label>
                <div className="row2">
                  <label className="field">
                    <span>货币</span>
                    <select
                      value={quote.currency}
                      onChange={(event) =>
                        patchQuote(index, { currency: event.target.value as CostQuote['currency'] })
                      }
                    >
                      <option value="CNY">人民币</option>
                      <option value="AUD">澳元</option>
                      <option value="NZD">纽元</option>
                    </select>
                  </label>
                  <Check
                    className="field field--check"
                    checked={quote.in_total}
                    onChange={(inTotal) => patchQuote(index, { in_total: inTotal })}
                  >
                    计入合计
                  </Check>
                </div>
                <div className="row2">
                  <label className="field">
                    <span>人均</span>
                    <input
                      inputMode="decimal"
                      value={quote.per_person ?? ''}
                      onChange={(event) => {
                        const text = event.target.value.trim();
                        patchQuote(index, { per_person: text === '' ? null : Number(text.replace(/,/g, '.')) });
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>同行总价</span>
                    <input
                      inputMode="decimal"
                      value={quote.party ?? ''}
                      onChange={(event) => {
                        const text = event.target.value.trim();
                        patchQuote(index, { party: text === '' ? null : Number(text.replace(/,/g, '.')) });
                      }}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>说明</span>
                  <input value={quote.note ?? ''} onChange={(event) => patchQuote(index, { note: event.target.value })} />
                </label>
                <button
                  type="button"
                  className="text-btn text-btn--danger"
                  onClick={() => patch({ quotes: form.quotes.filter((_, quoteIndex) => quoteIndex !== index) })}
                >
                  删除这笔
                </button>
              </div>
            ))}
          </div>
          <div className="quote-block">
            <h3>和上一站的连线</h3>
            {form.edgeId ? (
              <p className="fine">改的是已经连到这一站的那条线。</p>
            ) : prevName ? (
              <Check className="field field--check" checked={form.linkPrev} onChange={(linkPrev) => patch({ linkPrev })}>
                连到上一站：{prevName}
              </Check>
            ) : (
              <p className="fine">这一天还没有上一站。</p>
            )}
            {(form.edgeId || form.linkPrev) && (
              <>
                <div className="row2">
                  <label className="field">
                    <span>方式</span>
                    <select
                      value={form.transport}
                      onChange={(event) => patch({ transport: event.target.value as TransportMode })}
                    >
                      {TRANSPORTS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>分钟</span>
                    <input
                      inputMode="numeric"
                      value={form.minutes}
                      onChange={(event) => patch({ minutes: event.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>线路说明</span>
                  <input value={form.edgeLabel} onChange={(event) => patch({ edgeLabel: event.target.value })} />
                </label>
              </>
            )}
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" data-testid="save-node">
              保存到这台{place}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="panel-tools">
            <div className="panel-tools-copy">
              <p className="eyebrow">节点</p>
              <strong>{dayLine}</strong>
            </div>
            <button type="button" className="btn btn-primary" data-testid="add-node" onClick={() => actions.beginCreate()}>
              添加节点
            </button>
            {variant === 'modal' && onClose ? (
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                关闭
              </button>
            ) : null}
          </div>
          {node && day ? (
        <div className="node-detail">
          <header className="detail-title">
            <h2>{node.name}</h2>
            {(node.photos ?? []).length === 0 ? (
              <span className="photo-alert" title="还没有参考图">
                <span aria-hidden>!</span>
                <span className="sr-only">还没有参考图</span>
              </span>
            ) : null}
          </header>
          <p className="card-kicker" style={{ color: nodeFace(node).color }}>
            {nodeFace(node).icon} {nodeFace(node).label}
            {node.is_optional ? ' · 可选' : ''} · D{day.day_index} {day.date.slice(5)} {day.region}
          </p>
          {(node.start_time || node.end_time) && (
            <p className="detail-line">
              {[node.start_time, node.end_time].filter(Boolean).join(' – ')}
            </p>
          )}
          {node.address ? <p className="detail-line">{node.address}</p> : null}
          {node.lat !== 0 || node.lng !== 0 ? (
            <p className="fine">
              {node.lat.toFixed(5)}, {node.lng.toFixed(5)}
            </p>
          ) : (
            <p className="fine">没有坐标，地图上不显示。</p>
          )}
          {viewingEdge ? (
            <p className="detail-line">
              上一程 {edgeModeWord(viewingEdge)}
              {viewingEdge.duration_minutes ? ` · ${viewingEdge.duration_minutes} 分钟` : ''}
              {viewingEdge.label ? ` · ${viewingEdge.label}` : ''}
            </p>
          ) : null}
          {node.cost_label ? <p className="detail-line">{node.cost_label}</p> : null}
          {(node.cost_quotes ?? []).length > 0 && (
            <ul className="quote-read">
              {(node.cost_quotes ?? []).map((quote, index) => (
                <li key={`${quote.item}-${index}`}>
                  <strong>{quote.item}</strong>
                  <span>
                    人均 {formatMoney(quote.per_person, quote.currency)} · 同行 {formatMoney(quote.party, quote.currency)}
                    {quote.in_total ? '' : ' · 不计入合计'}
                  </span>
                  {quote.note ? <small>{quote.note}</small> : null}
                </li>
              ))}
            </ul>
          )}
          {(node.tips ?? []).length > 0 && (
            <ul className="tips">
              {(node.tips ?? []).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          {(node.photos ?? []).length > 0 ? (
            <NodePhotos photos={node.photos ?? []} open={photoAt} onOpen={setPhotoAt} />
          ) : null}
          <div className="btn-row">
            <button type="button" className="btn btn-primary" onClick={() => actions.beginEdit(node.id)}>
              编辑
            </button>
            {askDelete ? (
              <>
                <button type="button" className="btn btn-danger" data-testid="confirm-delete" onClick={() => actions.deleteNode(node.id)}>
                  确认删除
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAskDelete(false)}>
                  留下
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={() => setAskDelete(true)}>
                删除
              </button>
            )}
          </div>
          {askDelete ? <p className="fine">连到这一站的线会一起去掉。只影响这台{place}。天数不会变。</p> : null}
        </div>
          ) : (
            <div className="node-detail">
              <p>点流程或地图上的一站，这里显示时间、地址和费用。</p>
              <p className="fine">
                {host === 'desk'
                  ? '已有日期不能改。总览末尾可以再加一天，也可以增删改某一天里的节点。'
                  : '天数和日期是固定的，只能增删改这一天里面的节点。'}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const TOUR_CREDIT = '图来自飞猪商品页，2026-10-22。';

function photoCredit(photo: { credit?: string }): string {
  const credit = photo.credit?.trim();
  return credit || TOUR_CREDIT;
}

function NodePhotos({
  photos,
  open,
  onOpen,
}: {
  photos: NonNullable<TripNode['photos']>;
  open: number | null;
  onOpen: (index: number | null) => void;
}) {
  const close = useCallback(() => onOpen(null), [onOpen]);
  const shift = useCallback(
    (delta: number) => {
      onOpen(open == null || photos.length < 2 ? open : (open + delta + photos.length) % photos.length);
    },
    [onOpen, open, photos.length],
  );
  const credits = photos.map(photoCredit);
  const shared = credits.every((item) => item === credits[0]) ? credits[0] : null;
  return (
    <div className="node-photos">
      {photos.map((photo, index) => (
        <figure key={photo.src} className="guide-photo">
          <button
            type="button"
            className="guide-photo__open"
            aria-label={`放大：${photo.alt}`}
            onClick={() => onOpen(index)}
          >
            <SkeletonImage
              src={`${import.meta.env.BASE_URL}${photo.src}`}
              alt={photo.alt}
              ratio="4 / 3"
            />
          </button>
          <figcaption>{photo.alt}</figcaption>
          {shared ? null : <p className="fine">{credits[index]}</p>}
        </figure>
      ))}
      {shared ? <p className="fine">{shared}</p> : null}
      {open != null && photos[open] ? (
        <PhotoZoom
          photo={photos[open]}
          index={open}
          total={photos.length}
          onShift={shift}
          onClose={close}
        />
      ) : null}
    </div>
  );
}

function PhotoZoom({
  photo,
  index,
  total,
  onShift,
  onClose,
}: {
  photo: NonNullable<TripNode['photos']>[number];
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
      aria-label={photo.alt}
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
          src={`${import.meta.env.BASE_URL}${photo.src}`}
          alt={photo.alt}
          fit="frame"
          retry
        />
      </div>
      <p>
        {total > 1 ? `${index + 1} / ${total} · ` : ''}
        {photo.alt}
      </p>
    </dialog>,
    document.body,
  );
}
