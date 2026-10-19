import { useEffect, useMemo, useState } from 'react';
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

function chartAmount(total: number): string {
  if (total <= 0) return '';
  if (total >= 10000) {
    const wan = total / 10000;
    const text = wan >= 10 ? String(Math.round(wan)) : wan.toFixed(1).replace(/\.0$/, '');
    return `${text}万`;
  }
  return String(Math.round(total));
}

const CURRENCY_ORDER: QuoteCurrency[] = ['CNY', 'AUD', 'NZD'];

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

  useEffect(() => {
    setDayFocus(null);
    setPartFocus(null);
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
  const partTotal = parts.bars.reduce((sum, bar) => sum + bar.perPerson, 0);
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

  return (
    <div className="expense">
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

      <section className="spend-board" aria-label="开销看板">
        <h3 className="spend-board__title">每一天的人均，{unitLabel}</h3>
        <div className={`route-chart${solo ? ' route-chart--solo' : ''}${dayFocus ? ' is-focused' : ''}`}>
          {route.columns.map((column, index) => {
            const on = dayFocus === column.id;
            const amount = column.total === 0 ? '0' : formatMoney(column.total, route.currency);
            const compact = chartAmount(column.total);
            return (
              <button
                key={column.id}
                type="button"
                className={`route-chart__col${on ? ' is-on' : ''}`}
                aria-pressed={on}
                title={`${slots.find((slot) => slot.id === column.id)?.title ?? column.label} ${amount}`}
                onClick={() => setDayFocus(on ? null : column.id)}
              >
                <span className="route-chart__plot">
                  {compact ? <span className="route-chart__amt">{compact}</span> : null}
                  <span className="route-chart__well">
                    <span
                      className="route-chart__stack"
                      style={{
                        height: maxDay > 0 ? `${(column.total / maxDay) * 100}%` : '0%',
                        animationDelay: `${Math.min(index, 16) * 26}ms`,
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
                    </span>
                  </span>
                </span>
                <span className="route-chart__tick">
                  {column.label}
                  {solo ? <small>{amount}</small> : null}
                </span>
              </button>
            );
          })}
        </div>

        <h3 className="spend-board__title">花在哪，人均{unitLabel}</h3>
        {parts.bars.length === 0 ? (
          <>
            <div className="share-strip" aria-hidden="true">
              <span className="share-strip__empty" />
            </div>
            <p className="fine">这个筛选下没有金额。免费项不画进图。</p>
          </>
        ) : (
          <>
            <div className={`share-strip${partFocus ? ' is-focused' : ''}`}>
              {parts.bars.map((bar) => {
                const on = partFocus === bar.id;
                return (
                  <button
                    key={bar.id}
                    type="button"
                    data-part={bar.id}
                    className={on ? 'is-on' : ''}
                    style={{ flexGrow: partTotal > 0 ? bar.perPerson : 1 }}
                    aria-pressed={on}
                    title={`${bar.label} ${formatMoney(bar.perPerson, parts.currency)}`}
                    onClick={() => setPartFocus(on ? null : bar.id)}
                  />
                );
              })}
            </div>
            <div className="share-key">
              {parts.bars.map((bar) => {
                const on = partFocus === bar.id;
                return (
                  <button
                    key={bar.id}
                    type="button"
                    data-part={bar.id}
                    className={on ? 'is-on' : ''}
                    aria-pressed={on}
                    onClick={() => setPartFocus(on ? null : bar.id)}
                  >
                    <i data-part={bar.id} />
                    <span>{bar.label}</span>
                    <b>{formatMoney(bar.perPerson, parts.currency)}</b>
                  </button>
                );
              })}
            </div>
          </>
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
