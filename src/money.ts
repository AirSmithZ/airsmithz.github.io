import type { CostQuote, QuoteCurrency } from './types';

/**
 * 占比折算沿用行程项目里记下的 2026-10-13 frankfurter.dev 汇率。
 * 油费那一行已经按 3.7575 折成人民币，这里再乘一次就会重复。
 * 三种货币的合计仍然分开，汇率只用来画占比。
 */
export const FX_TO_CNY: Record<QuoteCurrency, number> = {
  CNY: 1,
  AUD: 4.671,
  NZD: 3.7575,
};

export const FX_NOTE = '占比按 2026-10-13 汇率折成人民币，合计仍按人民币、澳元、纽元分开。';

const UNITS: Record<QuoteCurrency, string> = {
  CNY: '元',
  AUD: '澳元',
  NZD: '纽元',
};

const CURRENCY_NAME: Record<QuoteCurrency, string> = {
  CNY: '人民币',
  AUD: '澳元',
  NZD: '纽元',
};

export function currencyName(currency: QuoteCurrency): string {
  return CURRENCY_NAME[currency];
}

export function formatMoney(amount: number | null, currency: QuoteCurrency): string {
  if (amount == null) return '—';
  if (amount === 0) return '免费';
  const text = Number.isInteger(amount)
    ? String(amount)
    : (Math.round(amount * 1e6) / 1e6).toFixed(6).replace(/\.?0+$/, '');
  return `${text} ${UNITS[currency]}`;
}

export interface MoneyTotal {
  currency: QuoteCurrency;
  perPerson: number;
  party: number;
}

/** 只加 in_total 且两边都有数字的行。不同货币不相加。 */
export function rollupQuotes(quotes: CostQuote[]): MoneyTotal[] {
  const buckets = new Map<QuoteCurrency, { perPerson: number; party: number }>();
  for (const quote of quotes) {
    if (!quote.in_total || quote.per_person == null || quote.party == null) continue;
    const prev = buckets.get(quote.currency) ?? { perPerson: 0, party: 0 };
    prev.perPerson += quote.per_person;
    prev.party += quote.party;
    buckets.set(quote.currency, prev);
  }
  return [...buckets.entries()].map(([currency, sums]) => ({
    currency,
    perPerson: Math.round(sums.perPerson * 1e6) / 1e6,
    party: Math.round(sums.party * 1e6) / 1e6,
  }));
}

/** 各类合计在「全部币种」下的对照数。汇率只用于这一行，不并进各币种合计。 */
export function equivalentCny(totals: MoneyTotal[]): { perPerson: number; party: number } {
  let perPerson = 0;
  let party = 0;
  for (const total of totals) {
    const rate = FX_TO_CNY[total.currency];
    perPerson += total.perPerson * rate;
    party += total.party * rate;
  }
  return {
    perPerson: Math.round(perPerson * 100) / 100,
    party: Math.round(party * 100) / 100,
  };
}

const PARTS = [
  { id: 'flight', label: '机票' },
  { id: 'stay', label: '住宿' },
  { id: 'activity', label: '活动' },
  { id: 'car', label: '租车' },
  { id: 'ground', label: '地面交通' },
  { id: 'fuel', label: '油费' },
  { id: 'other', label: '其他' },
] as const;

export interface ShareSlice {
  id: string;
  label: string;
  percent: number;
  cnyPerPerson: number;
}

export function quotePart(quote: CostQuote): { id: string; label: string } {
  const id = partId(quote);
  const part = PARTS.find((item) => item.id === id) ?? PARTS[PARTS.length - 1];
  return { id: part.id, label: part.label };
}

export type SpendGroup = 'part' | 'day';

export interface SpendBar {
  id: string;
  label: string;
  perPerson: number;
  party: number;
  count: number;
}

export interface SpendChart {
  bars: SpendBar[];
  currency: QuoteCurrency;
  equivalent: boolean;
}

/** 图用人均。全部币种时按 FX_TO_CNY 折成人民币，只用于条的长度，不改各币种合计。免费和空数字不进图。 */
export function spendBars(
  rows: { day: number | null; quote: CostQuote }[],
  group: SpendGroup,
  currency: QuoteCurrency | 'all',
): SpendChart {
  const equivalent = currency === 'all';
  const buckets = new Map<string, { id: string; label: string; per: number; party: number; count: number; order: number }>();
  for (const row of rows) {
    const quote = row.quote;
    if (quote.per_person == null || quote.per_person === 0) continue;
    if (!equivalent && quote.currency !== currency) continue;
    const rate = equivalent ? FX_TO_CNY[quote.currency] : 1;
    const id = group === 'day'
      ? (row.day == null ? 'extra' : String(row.day))
      : quotePart(quote).id;
    const label = group === 'day'
      ? (row.day == null ? '全程' : `D${row.day}`)
      : quotePart(quote).label;
    const order = group === 'day'
      ? (row.day ?? 999)
      : PARTS.findIndex((item) => item.id === id);
    const prev = buckets.get(id) ?? { id, label, per: 0, party: 0, count: 0, order };
    prev.per += quote.per_person * rate;
    prev.party += (quote.party ?? 0) * rate;
    prev.count += 1;
    buckets.set(id, prev);
  }
  const round = equivalent
    ? (value: number) => Math.round(value * 100) / 100
    : (value: number) => Math.round(value * 1e6) / 1e6;
  const bars = [...buckets.values()]
    .sort((a, b) => (group === 'day' ? a.order - b.order : b.per - a.per || a.order - b.order))
    .map((bar) => ({
      id: bar.id,
      label: bar.label,
      perPerson: round(bar.per),
      party: round(bar.party),
      count: bar.count,
    }));
  return { bars, currency: equivalent ? 'CNY' : currency, equivalent };
}

export interface SpendSegment {
  id: string;
  label: string;
  perPerson: number;
}

export interface SpendColumn {
  id: string;
  label: string;
  total: number;
  segments: SpendSegment[];
}

/** 每一天一根柱。slots 的顺序就是柱的顺序，没有金额的天也留着。 */
export function spendColumns(
  rows: { day: number | null; quote: CostQuote }[],
  slots: { id: string; label: string }[],
  currency: QuoteCurrency | 'all',
): { columns: SpendColumn[]; currency: QuoteCurrency; equivalent: boolean } {
  const equivalent = currency === 'all';
  const round = equivalent
    ? (value: number) => Math.round(value * 100) / 100
    : (value: number) => Math.round(value * 1e6) / 1e6;
  const buckets = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const quote = row.quote;
    if (quote.per_person == null || quote.per_person === 0) continue;
    if (!equivalent && quote.currency !== currency) continue;
    const slot = row.day == null ? 'extra' : String(row.day);
    const rate = equivalent ? FX_TO_CNY[quote.currency] : 1;
    const part = quotePart(quote).id;
    const slotMap = buckets.get(slot) ?? new Map<string, number>();
    slotMap.set(part, (slotMap.get(part) ?? 0) + quote.per_person * rate);
    buckets.set(slot, slotMap);
  }
  const columns = slots.map((slot) => {
    const parts = buckets.get(slot.id) ?? new Map<string, number>();
    const segments = PARTS.flatMap((part) => {
      const amount = parts.get(part.id);
      if (!amount) return [];
      return [{ id: part.id, label: part.label, perPerson: round(amount) }];
    });
    const total = round([...parts.values()].reduce((sum, value) => sum + value, 0));
    return { id: slot.id, label: slot.label, total, segments };
  });
  return { columns, currency: equivalent ? 'CNY' : currency, equivalent };
}

function partId(quote: CostQuote): (typeof PARTS)[number]['id'] {
  const item = quote.item;
  if (quote.currency === 'AUD') return 'ground';
  if (/机票|直飞|中转|航空|→/.test(item)) return 'flight';
  if (/油费/.test(item)) return 'fuel';
  if (/租车/.test(item)) return 'car';
  if (/公寓|旅馆|酒店|住宿|\d+\s*晚|Lylo|松木|奥兰|交会/.test(item)) return 'stay';
  if (/公交|巴士|火车|SkyBus|接驳/.test(item)) return 'ground';
  if (/团|套餐|礁|古堡|博物馆|门票|米尔福德|方案|射击|跳伞|快艇|缆车|滑板|巡航/.test(item)) return 'activity';
  return 'other';
}

export function buildShare(quotes: CostQuote[]): ShareSlice[] {
  const buckets = new Map<string, number>();
  for (const quote of quotes) {
    if (!quote.in_total || quote.per_person == null || quote.per_person === 0) continue;
    const rate = FX_TO_CNY[quote.currency] ?? 1;
    const id = partId(quote);
    buckets.set(id, (buckets.get(id) ?? 0) + quote.per_person * rate);
  }
  const total = [...buckets.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  return PARTS.flatMap((part) => {
    const amount = buckets.get(part.id);
    if (!amount) return [];
    return [
      {
        id: part.id,
        label: part.label,
        percent: (amount / total) * 100,
        cnyPerPerson: Math.round(amount * 100) / 100,
      },
    ];
  });
}
