import { useEffect, useMemo, useRef, useState } from 'react';
import type { CostQuote, Doc, QuoteCurrency } from '../types';
import {
  currencyName,
  equivalentCny,
  formatMoney,
  FX_NOTE,
  quotePart,
  rollupQuotes,
  spendBars,
  spendColumns,
  type MoneyTotal,
} from '../money';
import { collectQuotes, type QuoteRow } from '../trip';
import { actions } from '../store';

interface ExpenseBoardProps {
  doc: Doc;
  scope: 'day' | 'all';
  dayIndex: number;
  onOpenNode?: (nodeId: string) => void;
}

type Included = 'in' | 'out' | 'all';

function includedOk(row: QuoteRow, included: Included): boolean {
  if (included === 'all') return true;
  return included === 'in' ? row.quote.in_total : !row.quote.in_total;
}

function currencyOk(row: QuoteRow, currency: QuoteCurrency | 'all'): boolean {
  return currency === 'all' || row.quote.currency === currency;
}

function dayId(row: QuoteRow): string {
  return row.day == null ? 'extra' : String(row.day);
}

const CURRENCY_ORDER: QuoteCurrency[] = ['CNY', 'AUD', 'NZD'];
const DEPTH_MAX = 7;
const RISE_RATIO = 0.45;
const STAGE_PX = 96;

function columnDepth(
  index: number,
  count: number,
  total: number,
  maxDay: number,
  topShare: number,
) {
  if (total <= 0 || maxDay <= 0) return { depth: 0, rise: 0, side: 'flat' as const };
  const solo = count <= 1;
  const center = (count - 1) / 2;
  const offset = solo || center === 0 ? -1 : (index - center) / center;
  const barPx = (total / maxDay) * STAGE_PX;
  const depth = Math.min(1, Math.abs(offset)) * Math.min(DEPTH_MAX, barPx);
  const rise = Math.min(depth * RISE_RATIO, Math.max(0, barPx * topShare - 1));
  if (depth < 0.5 || rise < 0.4) return { depth: 0, rise: 0, side: 'flat' as const };
  return {
    depth: Math.round(depth * 10) / 10,
    rise: Math.round(rise * 10) / 10,
    side: offset > 0 ? 'left' as const : 'right' as const,
  };
}

interface MosaicTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  row?: boolean;
}

function mosaicTiles(bars: { id: string; perPerson: number }[]): MosaicTile[] {
  if (bars.length === 0) return [];
  if (bars.length === 1) return [{ id: bars[0].id, x: 0, y: 0, w: 100, h: 100 }];

  const total = bars.reduce((sum, bar) => sum + bar.perPerson, 0);
  if (total <= 0) return [];
  const [head, ...tail] = bars;
  const left = Math.min(44, Math.max(42, (head.perPerson / total) * 100));
  const tiles: MosaicTile[] = [{ id: head.id, x: 0, y: 0, w: left, h: 100 }];

  const posters: typeof tail = [];
  const rows: typeof tail = [];
  for (const bar of tail) {
    if (posters.length < 2 && bar.perPerson / total >= 0.08) posters.push(bar);
    else rows.push(bar);
  }
  if (posters.length === 0 && rows.length > 0) posters.push(rows.shift()!);

  const rowBudget = Math.min(rows.length * 13, 42);
  const rowH = rows.length === 0 ? 0 : rowBudget / rows.length;
  const posterBudget = 100 - rowBudget;
  const posterSum = posters.reduce((sum, bar) => sum + bar.perPerson, 0) || 1;
  let y = 0;
  for (const bar of posters) {
    const h = (bar.perPerson / posterSum) * posterBudget;
    tiles.push({ id: bar.id, x: left, y, w: 100 - left, h });
    y += h;
  }
  for (const bar of rows) {
    tiles.push({ id: bar.id, x: left, y, w: 100 - left, h: rowH, row: true });
    y += rowH;
  }
  return tiles;
}

function PartGlyph({ id }: { id: string }) {
  const pen = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (id === 'flight') {
    return (
      <svg {...pen}>
        <path d="M3 12h5l2.5-6 1.6.6L11 12h7.2l1.6-2.4H22L20.2 13 22 16.4h-2.2L18.2 14H11l1.1 5.4-1.6.6L8 14H3l1-2-1-2z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (id === 'stay') {
    return (
      <svg {...pen}>
        <path d="M4 18V9M4 14h16v4M8 14v-3h5v3M20 18V9" />
        <path d="M6 18v1.5M18 18v1.5" />
      </svg>
    );
  }
  if (id === 'activity') {
    return (
      <svg {...pen}>
        <path d="M4 7.5h16v3.2a2.2 2.2 0 0 0 0 4.1v3.2H4v-3.2a2.2 2.2 0 0 0 0-4.1V7.5z" />
        <path d="M12 8v9" strokeDasharray="1.6 2.2" />
      </svg>
    );
  }
  if (id === 'car') {
    return (
      <svg {...pen}>
        <path d="M4.5 15.5 6.2 9.5h11.6l1.7 6" />
        <path d="M4 15.5h16v3H4z" />
        <circle cx="8" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="16" cy="18.5" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (id === 'ground') {
    return (
      <svg {...pen}>
        <rect x="4" y="6" width="16" height="11" rx="2" />
        <path d="M8 6v11M4 12h16M7 19.5h2M15 19.5h2" />
      </svg>
    );
  }
  if (id === 'fuel') {
    return (
      <svg {...pen}>
        <rect x="5" y="4" width="9" height="16" rx="1.5" />
        <path d="M14 8h2.2a2 2 0 0 1 2 2v5.2a1.6 1.6 0 1 0 3.2 0V9l-2-2" />
        <path d="M7.5 8h4" />
      </svg>
    );
  }
  return (
    <svg {...pen}>
      <path d="M5 5.5h5.2A2.8 2.8 0 0 1 13 8.3V19H8.2A3.2 3.2 0 0 0 5 22.2V5.5z" />
      <path d="M13 8.3h5.2A2.8 2.8 0 0 1 21 11v8.2A3.2 3.2 0 0 0 17.8 16H13" />
    </svg>
  );
}

function countedOf(quotes: CostQuote[]): MoneyTotal[] {
  return rollupQuotes(quotes)
    .sort((a, b) => CURRENCY_ORDER.indexOf(a.currency) - CURRENCY_ORDER.indexOf(b.currency));
}

function fxOf(totals: MoneyTotal[], currency: QuoteCurrency | 'all') {
  if (currency !== 'all' || !totals.some((total) => total.currency !== 'CNY')) return null;
  return equivalentCny(totals);
}

function DayTally({
  kicker,
  date,
  place,
  totals,
  fx,
  travelers,
  aside,
  empty,
}: {
  kicker: string;
  date: string;
  place: string | null;
  totals: MoneyTotal[];
  fx: { perPerson: number; party: number } | null;
  travelers: number;
  aside: boolean;
  empty: string;
}) {
  const hero = fx
    ? { name: '折合人民币', perPerson: fx.perPerson, party: fx.party, currency: 'CNY' as const }
    : totals[0]
      ? {
          name: currencyName(totals[0].currency),
          perPerson: totals[0].perPerson,
          party: totals[0].party,
          currency: totals[0].currency,
        }
      : null;
  return (
    <section className="day-tally" aria-label={`${kicker} ${date}合计`}>
      <p className="day-tally__kicker">{kicker}</p>
      <h3 className="day-tally__date">{date}</h3>
      {place ? <p className="day-tally__place">{place}</p> : null}
      {hero ? (
        <div className="day-tally__hero">
          <span>{travelers} 人 · {hero.name}</span>
          <strong>{formatMoney(hero.party, hero.currency)}</strong>
          <small>人均 {formatMoney(hero.perPerson, hero.currency)}</small>
        </div>
      ) : (
        <p className="fine">{empty}</p>
      )}
      {fx && totals.length > 0 ? (
        <p className="day-tally__split">
          {totals.map((total) => (
            <span key={total.currency}>
              {currencyName(total.currency)} {formatMoney(total.party, total.currency)}
            </span>
          ))}
        </p>
      ) : null}
      {fx ? <p className="day-tally__note">{FX_NOTE}</p> : null}
      {aside && hero ? <p className="day-tally__note">未计入合计的行不在这个数里。</p> : null}
    </section>
  );
}

export function ExpenseBoard({ doc, scope, dayIndex, onOpenNode }: ExpenseBoardProps) {
  const day = doc.itinerary.days[dayIndex];
  const rows = useMemo(() => collectQuotes(doc, scope === 'day' ? dayIndex : null), [doc, scope, dayIndex]);
  const totals = useMemo(() => rollupQuotes(rows.map((row) => row.quote)), [rows]);
  const [currency, setCurrency] = useState<QuoteCurrency | 'all'>('all');
  const [included, setIncluded] = useState<Included>('in');
  const [dayFocus, setDayFocus] = useState<string | null>(null);
  const [partFocus, setPartFocus] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hoverEl = useRef<HTMLElement | null>(null);
  const tipDismissed = useRef(false);
  const tipAnchor = useRef<{ top: number; left: number } | null>(null);
  const anchorFrame = useRef(0);
  const pointerKind = useRef<string>('mouse');
  const hoverBlockedUntil = useRef(0);
  const gestureSlid = useRef(false);

  useEffect(() => {
    setDayFocus(null);
    setPartFocus(null);
    hoverEl.current = null;
    tipDismissed.current = true;
  }, [scope, dayIndex, currency, included]);

  const currencies = useMemo(() => {
    const seen = new Set<QuoteCurrency>();
    for (const row of rows) seen.add(row.quote.currency);
    return (['CNY', 'AUD', 'NZD'] as const).filter((item) => seen.has(item));
  }, [rows]);

  const chartRows = useMemo(
    () => rows.filter((row) => includedOk(row, included)),
    [rows, included],
  );

  const slots = useMemo(() => {
    const source = scope === 'day' && day ? [day] : doc.itinerary.days;
    const list = source.map((item) => ({
      id: String(item.day_index),
      label: `${Number(item.date.slice(5, 7))}/${Number(item.date.slice(8))}`,
      title: `${item.date.slice(5)} ${item.weekday} ${item.region ?? ''}`.trim(),
    }));
    const hasExtra = chartRows.some((row) => (
      row.day == null
      && row.quote.per_person != null
      && row.quote.per_person !== 0
      && currencyOk(row, currency)
    ));
    if (hasExtra) list.push({ id: 'extra', label: '全程', title: '不记在某一天' });
    return list;
  }, [doc.itinerary.days, scope, day, chartRows, currency]);

  const route = useMemo(() => spendColumns(chartRows, slots, currency), [chartRows, slots, currency]);
  const parts = useMemo(() => spendBars(chartRows, 'part', currency), [chartRows, currency]);
  const maxDay = route.columns.reduce((max, column) => Math.max(max, column.total), 0);
  const solo = route.columns.length === 1;
  const unpricedStay = rows.some((row) => (
    row.quote.per_person == null
    && /公寓|旅馆|酒店|住宿|Lylo|松木|奥兰|交会|Alpine|Pinewood/.test(`${row.name} ${row.quote.item}`)
  ));

  const visible = useMemo(
    () => rows.filter((row) => {
      if (!includedOk(row, included) || !currencyOk(row, currency)) return false;
      if (dayFocus && dayId(row) !== dayFocus) return false;
      if (partFocus && quotePart(row.quote).id !== partFocus) return false;
      return true;
    }),
    [rows, included, currency, dayFocus, partFocus],
  );

  const unitLabel = route.equivalent ? '折合人民币' : currencyName(route.currency);
  const partLabel = parts.bars.find((bar) => bar.id === partFocus)?.label ?? null;
  const dayLabel = slots.find((slot) => slot.id === dayFocus)?.title ?? null;
  const focusLabel = [dayLabel, partLabel].filter(Boolean).join('，');
  const dayRows = useMemo(() => {
    if (!dayFocus) return [];
    return rows.filter((row) => includedOk(row, included) && currencyOk(row, currency) && dayId(row) === dayFocus);
  }, [rows, included, currency, dayFocus]);
  const dayCounted = useMemo(() => countedOf(dayRows.map((row) => row.quote)), [dayRows]);
  const dayFx = fxOf(dayCounted, currency);
  const focusedDay = dayFocus && dayFocus !== 'extra'
    ? doc.itinerary.days.find((item) => String(item.day_index) === dayFocus) ?? null
    : null;
  const dayOnly = Boolean(dayFocus) && !partFocus;
  const paintTip = (columnEl: HTMLElement | null) => {
    const tip = tipRef.current;
    const board = boardRef.current;
    if (!tip || !board) return;
    if (tipDismissed.current || !columnEl) {
      tip.classList.remove('is-on');
      return;
    }
    const target = columnEl;
    const column = target
      ? route.columns.find((item) => item.id === target.dataset.col) ?? null
      : null;
    const title = tip.querySelector('.route-tip__title');
    const list = tip.querySelector<HTMLElement>('ul');
    const empty = tip.querySelector<HTMLElement>('.fine');
    if (!target || !column || !title || !list || !empty) {
      tip.classList.remove('is-on');
      return;
    }
    title.textContent = column.label;
    list.replaceChildren();
    if (column.segments.length === 0) {
      list.hidden = true;
      empty.hidden = false;
    } else {
      empty.hidden = true;
      list.hidden = false;
      for (const segment of [...column.segments].reverse()) {
        const row = document.createElement('li');
        const dot = document.createElement('i');
        dot.dataset.part = segment.id;
        const name = document.createElement('span');
        name.textContent = segment.label;
        const amount = document.createElement('b');
        amount.textContent = formatMoney(segment.perPerson, route.currency);
        row.append(dot, name, amount);
        list.append(row);
      }
    }
    const plot = target.querySelector('.route-chart__plot');
    const boardBox = board.getBoundingClientRect();
    const box = (plot ?? target).getBoundingClientRect();
    const tipWidth = 208;
    const raw = box.left - boardBox.left + box.width / 2;
    const left = Math.max(tipWidth / 2 + 8, Math.min(raw, boardBox.width - tipWidth / 2 - 8));
    tip.style.left = `${left}px`;
    tip.style.top = `${box.top - boardBox.top + 6}px`;
    if (!tip.classList.contains('is-on')) {
      tipAnchor.current = null;
      cancelAnimationFrame(anchorFrame.current);
      anchorFrame.current = requestAnimationFrame(() => {
        anchorFrame.current = requestAnimationFrame(() => {
          if (tipDismissed.current) return;
          tipAnchor.current = {
            top: rootRef.current?.scrollTop ?? 0,
            left: chartRef.current?.scrollLeft ?? 0,
          };
        });
      });
    }
    tip.classList.add('is-on');
  };

  useEffect(() => {
    paintTip(hoverEl.current);
  }, [route, dayFocus]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let origin: { x: number; y: number } | null = null;

    const hide = () => {
      tipDismissed.current = true;
      hoverEl.current = null;
      tipAnchor.current = null;
      hoverBlockedUntil.current = performance.now() + 360;
      tipRef.current?.classList.remove('is-on');
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node) || !root.contains(target)) return;
      hoverBlockedUntil.current = performance.now() + 360;
      if (tipDismissed.current) return;
      const anchor = tipAnchor.current;
      if (!anchor) return;
      const top = root.scrollTop;
      const left = chartRef.current?.scrollLeft ?? anchor.left;
      if (Math.abs(top - anchor.top) < 2 && Math.abs(left - anchor.left) < 2) return;
      hide();
    };
    const onWheel = (event: WheelEvent) => {
      if (tipDismissed.current || Math.abs(event.deltaX) + Math.abs(event.deltaY) < 1) return;
      hide();
    };
    const onDown = (event: PointerEvent) => {
      pointerKind.current = event.pointerType;
      gestureSlid.current = false;
      if (event.pointerType === 'mouse') {
        origin = null;
        return;
      }
      origin = { x: event.clientX, y: event.clientY };
    };
    const onSlide = (event: PointerEvent) => {
      if (!origin || event.pointerType === 'mouse') return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (dx * dx + dy * dy < 16 * 16) return;
      origin = null;
      gestureSlid.current = true;
      hide();
    };
    const onUp = () => {
      origin = null;
    };

    window.addEventListener('scroll', onScroll, true);
    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('pointerdown', onDown, true);
    root.addEventListener('pointermove', onSlide, true);
    root.addEventListener('pointerup', onUp, true);
    root.addEventListener('pointercancel', onUp, true);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onDown, true);
      root.removeEventListener('pointermove', onSlide, true);
      root.removeEventListener('pointerup', onUp, true);
      root.removeEventListener('pointercancel', onUp, true);
      cancelAnimationFrame(anchorFrame.current);
    };
  }, []);

  return (
    <div ref={rootRef} className="expense">
      <header className="expense-head">
        <div>
          <h2>开销</h2>
          <p className="fine">
            {scope === 'day' && day
              ? `${day.date.slice(5)} ${day.weekday} ${day.region ?? ''}`.trim()
              : `${doc.itinerary.days.length} 天`}
            ，同行 {doc.travelers} 人。点一根柱只看这一天的合计。点一段颜色，明细只留这一类。
          </p>
        </div>
      </header>

      {totals.length > 0 ? (
        <p className="spend-sums">
          {totals.map((total) => (
            <span key={total.currency}>
              {currencyName(total.currency)}人均 {formatMoney(total.perPerson, total.currency)}
              <small>{doc.travelers} 人 {formatMoney(total.party, total.currency)}</small>
            </span>
          ))}
        </p>
      ) : (
        <p className="fine">这一范围里还没有计入合计的数字。</p>
      )}

      <div className="spend-filters" role="group" aria-label="开销筛选">
        <button type="button" className={currency === 'all' ? 'is-on' : ''} aria-pressed={currency === 'all'} onClick={() => setCurrency('all')}>
          全部币种
        </button>
        {currencies.map((item) => (
          <button key={item} type="button" className={currency === item ? 'is-on' : ''} aria-pressed={currency === item} onClick={() => setCurrency(item)}>
            {currencyName(item)}
          </button>
        ))}
        {([
          ['in', '计入合计'],
          ['out', '未计入'],
          ['all', '全部记录'],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" className={included === id ? 'is-on' : ''} aria-pressed={included === id} onClick={() => setIncluded(id)}>
            {label}
          </button>
        ))}
      </div>

      <section ref={boardRef} className="spend-board" aria-label="开销看板">
        <h3 className="spend-board__title">每一天的人均，{unitLabel}</h3>
        <div
          ref={chartRef}
          className={`route-chart${solo ? ' route-chart--solo' : ''}${dayFocus ? ' is-focused' : ''}`}
          onMouseLeave={() => {
            hoverEl.current = null;
            tipDismissed.current = true;
            tipRef.current?.classList.remove('is-on');
          }}
        >
          {route.columns.map((column, index) => {
            const on = dayFocus === column.id;
            const amount = column.total === 0 ? '0' : formatMoney(column.total, route.currency);
            const top = column.segments[0];
            const face = columnDepth(
              index,
              route.columns.length,
              column.total,
              maxDay,
              top && column.total > 0 ? top.perPerson / column.total : 1,
            );
            const floor = column.segments[column.segments.length - 1];
            return (
              <button
                key={column.id}
                type="button"
                data-col={column.id}
                className={`route-chart__col${on ? ' is-on' : ''}`}
                aria-pressed={on}
                title={`${slots.find((slot) => slot.id === column.id)?.title ?? column.label} ${amount}`}
                onClick={(event) => {
                  const slid = gestureSlid.current;
                  gestureSlid.current = false;
                  setDayFocus(on ? null : column.id);
                  setPartFocus(null);
                  if (slid) {
                    tipDismissed.current = true;
                    hoverEl.current = null;
                    hoverBlockedUntil.current = performance.now() + 360;
                    tipRef.current?.classList.remove('is-on');
                    return;
                  }
                  tipDismissed.current = false;
                  hoverBlockedUntil.current = 0;
                  hoverEl.current = event.currentTarget;
                  paintTip(event.currentTarget);
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'mouse' || performance.now() < hoverBlockedUntil.current) return;
                  tipDismissed.current = false;
                  hoverEl.current = event.currentTarget;
                  paintTip(event.currentTarget);
                }}
                onPointerMove={(event) => {
                  if (event.pointerType !== 'mouse' || performance.now() < hoverBlockedUntil.current) return;
                  if (!tipDismissed.current && hoverEl.current === event.currentTarget && tipRef.current?.classList.contains('is-on')) return;
                  tipDismissed.current = false;
                  hoverEl.current = event.currentTarget;
                  paintTip(event.currentTarget);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType !== 'mouse') return;
                  if (hoverEl.current === event.currentTarget) hoverEl.current = null;
                  paintTip(null);
                }}
                onFocus={(event) => {
                  if (pointerKind.current === 'touch' || performance.now() < hoverBlockedUntil.current) return;
                  tipDismissed.current = false;
                  hoverEl.current = event.currentTarget;
                  paintTip(event.currentTarget);
                }}
                onBlur={() => {
                  if (hoverEl.current?.dataset.col === column.id) hoverEl.current = null;
                  paintTip(hoverEl.current);
                }}
              >
                <span className="route-chart__plot">
                  <span className="route-chart__well">
                    <span className="route-chart__stage">
                      <span
                        className="route-chart__stack"
                        data-side={face.side}
                        style={{
                          height: maxDay > 0 ? `${(column.total / maxDay) * 100}%` : '0%',
                          animationDelay: `${Math.min(index, 16) * 26}ms`,
                          ['--depth' as string]: `${face.depth}px`,
                          ['--rise' as string]: `${face.rise}px`,
                          ['--floor' as string]: floor ? `var(--part-${floor.id})` : 'transparent',
                        }}
                      >
                        {column.segments.map((segment) => (
                          <span
                            key={segment.id}
                            className="route-chart__seg"
                            data-part={segment.id}
                            style={{ flexGrow: segment.perPerson }}
                          />
                        ))}
                        {column.segments.length > 0 ? <span className="route-chart__floor" /> : null}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="route-chart__tick">{column.label}</span>
                {solo ? <small className="route-chart__sum">{amount}</small> : null}
              </button>
            );
          })}
        </div>
        <div ref={tipRef} className="route-tip" role="tooltip">
          <p className="route-tip__title" />
          <ul />
          <p className="fine" hidden>这一天没有计入合计的数字。</p>
        </div>

        <h3 className="spend-board__title">花在哪，人均{unitLabel}</h3>
        {parts.bars.length === 0 ? (
          <>
            <div className="share-mosaic" aria-hidden="true">
              <span className="share-mosaic__empty" />
            </div>
            <p className="fine">这个筛选下没有金额。免费项不画进图。</p>
          </>
        ) : (
          <div className={`share-mosaic${partFocus ? ' is-focused' : ''}`}>
            {mosaicTiles(parts.bars).map((tile) => {
              const bar = parts.bars.find((item) => item.id === tile.id);
              if (!bar) return null;
              const on = partFocus === bar.id;
              return (
                <button
                  key={bar.id}
                  type="button"
                  data-part={bar.id}
                  className={`share-tile${tile.row ? ' is-row' : ''}${on ? ' is-on' : ''}`}
                  style={{
                    left: `calc(${tile.x}% + 3px)`,
                    top: `calc(${tile.y}% + 3px)`,
                    width: `calc(${tile.w}% - 6px)`,
                    height: `calc(${tile.h}% - 6px)`,
                  }}
                  aria-pressed={on}
                  title={`${bar.label} ${formatMoney(bar.perPerson, parts.currency)}`}
                  onClick={() => {
                    setPartFocus(on ? null : bar.id);
                    setDayFocus(null);
                    tipDismissed.current = true;
                    hoverEl.current = null;
                    tipAnchor.current = null;
                    tipRef.current?.classList.remove('is-on');
                  }}
                >
                  <span className="share-tile__swatch" />
                  <span className="share-tile__mark">
                    <PartGlyph id={bar.id} />
                  </span>
                  <span className="share-tile__name">
                    {bar.label}
                    <i aria-hidden="true">›</i>
                  </span>
                  <b>{formatMoney(bar.perPerson, parts.currency)}</b>
                </button>
              );
            })}
          </div>
        )}
        <p className="fine">
          没有花钱的日子留着空柱。免费项不画进图。再点一次已选的柱或颜色就取消。
          {route.equivalent ? ` ${FX_NOTE}` : ' 这一档用原币种，不折算。'}
          {unpricedStay ? ' 这一范围里有旅馆，但报价对不上入住日，没有数字，不画进住宿。' : ''}
        </p>
      </section>

      {dayFocus ? (
        <DayTally
          kicker={focusedDay ? `D${focusedDay.day_index}` : '全程'}
          date={focusedDay ? `${focusedDay.date.slice(5)} ${focusedDay.weekday}` : '不记在某一天'}
          place={focusedDay?.region ?? null}
          totals={dayCounted}
          fx={dayFx}
          travelers={doc.travelers}
          aside={included !== 'in'}
          empty="这一天没有计入合计的数字。"
        />
      ) : null}

      {dayOnly ? null : <h3 className="ledger-title">明细{focusLabel ? ` · ${focusLabel}` : ''}</h3>}
      {dayOnly || visible.length > 0 ? null : <p className="fine">没有写入数字的费用。</p>}
      {dayOnly ? null : <ul className="cost-list">
        {visible.map((row) => {
          const body = (
            <>
              <span className="cost-day">{row.day == null ? '全程' : `D${row.day}`}</span>
              <span className="cost-name">
                <b>{row.name}</b>
                {row.quote.item !== row.name ? <small>{row.quote.item}</small> : null}
                {row.quote.note ? <small>{row.quote.note}</small> : null}
                {row.quote.in_total ? null : <small>不计入合计</small>}
              </span>
              <span className="cost-amt">
                <b>{formatMoney(row.quote.per_person, row.quote.currency)}</b>
                <small>{formatMoney(row.quote.party, row.quote.currency)}</small>
              </span>
            </>
          );
          return (
            <li key={row.key} className={row.quote.in_total ? '' : 'is-aside'}>
              {row.nodeId ? (
                <button
                  type="button"
                  onClick={() => {
                    actions.selectNode(row.nodeId);
                    actions.setScope('day');
                    actions.setPanel('graph');
                    onOpenNode?.(row.nodeId!);
                  }}
                >
                  {body}
                </button>
              ) : (
                <div className="cost-static">{body}</div>
              )}
            </li>
          );
        })}
      </ul>}
    </div>
  );
}
