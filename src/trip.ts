import rawTrip from './data/anzTrip.json';
import {
  transportLabel,
  type CostQuote,
  type DayPlan,
  type Doc,
  type Itinerary,
  type QuoteCurrency,
  type SaveNodeInput,
  type TransportMode,
  type TripEdge,
  type TripNode,
} from './types';

const CURRENCIES = new Set<QuoteCurrency>(['CNY', 'AUD', 'NZD']);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asCurrency(value: unknown): QuoteCurrency {
  return typeof value === 'string' && CURRENCIES.has(value as QuoteCurrency)
    ? (value as QuoteCurrency)
    : 'CNY';
}

function cleanQuote(quote: CostQuote): CostQuote {
  return {
    ...quote,
    item: quote.item.trim(),
    currency: asCurrency(quote.currency),
    per_person: quote.per_person,
    party: quote.party,
    in_total: Boolean(quote.in_total),
    note: quote.note?.trim() || undefined,
  };
}

export function hasCoords(node: Pick<TripNode, 'lat' | 'lng'>): boolean {
  return Number.isFinite(node.lat) && Number.isFinite(node.lng) && !(node.lat === 0 && node.lng === 0);
}

export function seedDoc(): Doc {
  const itinerary = clone((rawTrip as { itinerary: Itinerary }).itinerary);
  return {
    origin: 'seed',
    savedAt: '',
    travelers: 4,
    itinerary,
  };
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function clampDayIndex(doc: Doc, dayIndex: number): number {
  if (doc.itinerary.days.length === 0) return 0;
  return Math.min(Math.max(dayIndex, 0), doc.itinerary.days.length - 1);
}

export function findNode(doc: Doc, nodeId: string): { dayIndex: number; day: DayPlan; node: TripNode } | null {
  for (let dayIndex = 0; dayIndex < doc.itinerary.days.length; dayIndex += 1) {
    const day = doc.itinerary.days[dayIndex];
    const node = day.nodes.find((item) => item.id === nodeId);
    if (node) return { dayIndex, day, node };
  }
  return null;
}

export function previousInDay(day: DayPlan, nodeId: string | null): TripNode | null {
  if (!nodeId) return day.nodes[day.nodes.length - 1] ?? null;
  const index = day.nodes.findIndex((node) => node.id === nodeId);
  if (index <= 0) return null;
  return day.nodes[index - 1] ?? null;
}

export function incomingEdge(doc: Doc, nodeId: string): TripEdge | null {
  for (const day of doc.itinerary.days) {
    const edge = day.edges.find((item) => item.to === nodeId);
    if (edge) return edge;
  }
  return doc.itinerary.cross_day_edges?.find((item) => item.to === nodeId) ?? null;
}

export function blankNode(day: DayPlan, id: string): TripNode {
  const prev = [...day.nodes].reverse().find((node) => hasCoords(node));
  return {
    id,
    name: '',
    category: 'attraction',
    lat: prev ? Math.round((prev.lat + 0.002) * 1e6) / 1e6 : 0,
    lng: prev ? Math.round((prev.lng + 0.002) * 1e6) / 1e6 : 0,
    is_optional: false,
    tips: [],
    cost_quotes: [],
    region: day.region,
    coord_confidence: prev ? 'manual' : 'none',
    coord_source: '手机端',
  };
}

function touch(doc: Doc): Doc {
  doc.origin = 'local';
  doc.savedAt = new Date().toISOString();
  return doc;
}

export function applySave(doc: Doc, input: SaveNodeInput): Doc {
  const next = touch(clone(doc));
  const day = next.itinerary.days[input.dayIndex];
  if (!day) return next;
  const node: TripNode = {
    ...input.node,
    name: input.node.name.trim(),
    cost_quotes: (input.node.cost_quotes ?? []).map(cleanQuote).filter((quote) => quote.item),
    tips: (input.node.tips ?? []).map((tip) => tip.trim()).filter(Boolean),
  };
  if (input.mode === 'create') {
    day.nodes.push(node);
  } else {
    const index = day.nodes.findIndex((item) => item.id === node.id);
    if (index >= 0) {
      const previous = day.nodes[index];
      if (previous.lat !== node.lat || previous.lng !== node.lng) {
        node.coord_confidence = 'manual';
        node.coord_source = '手机端手动';
      }
      day.nodes[index] = { ...previous, ...node, id: previous.id };
    }
  }
  if (input.edge) {
    const edge = input.edge;
    const inDay = day.edges.findIndex((item) => item.id === edge.id);
    if (inDay >= 0) {
      day.edges[inDay] = edge;
    } else {
      const cross = next.itinerary.cross_day_edges ?? [];
      const inCross = cross.findIndex((item) => item.id === edge.id);
      if (inCross >= 0) {
        cross[inCross] = edge;
        next.itinerary.cross_day_edges = cross;
      } else {
        day.edges.push(edge);
      }
    }
  }
  return next;
}

export function applyPlaceNode(
  doc: Doc,
  dayIndex: number,
  nodeId: string,
  patch: { region?: string; overview_offset?: { x: number; y: number } | null },
): Doc {
  const next = touch(clone(doc));
  const node = next.itinerary.days[dayIndex]?.nodes.find((item) => item.id === nodeId);
  if (!node) return next;
  if (patch.region?.trim()) node.region = patch.region.trim();
  if (patch.overview_offset === null) delete node.overview_offset;
  else if (patch.overview_offset) {
    node.overview_offset = {
      x: Math.round(patch.overview_offset.x),
      y: Math.round(patch.overview_offset.y),
    };
  }
  return next;
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function monthDay(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

/** 顶栏跨度。最后一天若有节点跨过午夜，结束日算到次日（回程落到天府）。 */
export function formatTripSpan(days: DayPlan[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '没有日期';
  let end = last.date;
  let latest = -1;
  for (const node of last.nodes) {
    if (!node.start_time) continue;
    const [hour, minute] = node.start_time.split(':').map((part) => Number.parseInt(part, 10));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;
    const clock = hour * 60 + minute;
    if (latest >= 0 && clock + 6 * 60 < latest) {
      end = nextCalendarDay(last.date).date;
      break;
    }
    if (clock > latest) latest = clock;
  }
  const startLabel = monthDay(first.date);
  const endLabel = monthDay(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function nextCalendarDay(iso: string): { date: string; weekday: string } {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  const stamp = new Date(Date.UTC(year, month - 1, day));
  stamp.setUTCDate(stamp.getUTCDate() + 1);
  const date = stamp.toISOString().slice(0, 10);
  return { date, weekday: WEEKDAYS[stamp.getUTCDay()] ?? '周一' };
}

export function applyAddDay(doc: Doc): Doc {
  const next = touch(clone(doc));
  const days = next.itinerary.days;
  const last = days[days.length - 1];
  if (!last) return next;
  const { date, weekday } = nextCalendarDay(last.date);
  days.push({
    day_index: days.length + 1,
    date,
    weekday,
    label: '新的一天',
    region: last.region,
    nodes: [],
    edges: [],
  });
  return next;
}

export function applySetDayRegion(doc: Doc, dayIndex: number, name: string): Doc {
  const trimmed = name.trim();
  const next = touch(clone(doc));
  const day = next.itinerary.days[dayIndex];
  if (!day || !trimmed) return next;
  day.region = trimmed;
  return next;
}

export function applyAddRegion(doc: Doc, name: string): Doc {
  const trimmed = name.trim();
  if (!trimmed) return doc;
  const next = touch(clone(doc));
  const list = next.itinerary.extra_regions ?? [];
  if (list.includes(trimmed)) return doc;
  next.itinerary.extra_regions = [...list, trimmed];
  return next;
}

export function applyDelete(doc: Doc, nodeId: string): Doc {
  const next = touch(clone(doc));
  for (const day of next.itinerary.days) {
    day.nodes = day.nodes.filter((node) => node.id !== nodeId);
    day.edges = day.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
  }
  if (next.itinerary.cross_day_edges) {
    next.itinerary.cross_day_edges = next.itinerary.cross_day_edges.filter(
      (edge) => edge.from !== nodeId && edge.to !== nodeId,
    );
  }
  return next;
}

export function applyTravelers(doc: Doc, travelers: number): Doc {
  const next = touch(clone(doc));
  next.travelers = Math.min(12, Math.max(1, Math.round(travelers)));
  return next;
}

export function applyExtras(doc: Doc, extras: CostQuote[]): Doc {
  const next = touch(clone(doc));
  next.itinerary.meta = {
    ...next.itinerary.meta,
    expense_extras: extras.map(cleanQuote).filter((quote) => quote.item),
  };
  return next;
}

export interface QuoteRow {
  key: string;
  day: number | null;
  nodeId: string | null;
  name: string;
  quote: CostQuote;
}

export function collectQuotes(doc: Doc, dayIndex: number | null): QuoteRow[] {
  const rows: QuoteRow[] = [];
  const days = dayIndex == null ? doc.itinerary.days : doc.itinerary.days.filter((_, index) => index === dayIndex);
  for (const day of days) {
    for (const node of day.nodes) {
      for (const [index, quote] of (node.cost_quotes ?? []).entries()) {
        rows.push({
          key: `${node.id}-${index}`,
          day: day.day_index,
          nodeId: node.id,
          name: node.name,
          quote,
        });
      }
    }
  }
  if (dayIndex == null) {
    for (const [index, quote] of (doc.itinerary.meta.expense_extras ?? []).entries()) {
      rows.push({
        key: `extra-${index}`,
        day: null,
        nodeId: null,
        name: quote.item,
        quote,
      });
    }
  }
  return rows;
}

export interface MapPoint {
  id: string;
  name: string;
  lng: number;
  lat: number;
  color: string;
  optional: boolean;
}

type GeoProps = Record<string, string | number | null>;

interface GeoFeature {
  type: 'Feature';
  properties: GeoProps;
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'LineString'; coordinates: [number, number][] }
    | { type: 'Polygon'; coordinates: [number, number][][] };
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export interface MapModel {
  points: FeatureCollection;
  lines: FeatureCollection;
  located: MapPoint[];
}

const LEG_INK: Record<TransportMode, string> = {
  walk: '#d6dde6',
  subway: '#818cf8',
  bus: '#4a9eff',
  taxi: '#f59e0b',
  flight: '#f472b6',
  ferry: '#2dd4bf',
};

function legLead(edge: TripEdge): { word: string; drive: boolean } {
  const head = (edge.label ?? '').split(/[，。]/)[0]?.trim() ?? '';
  const drive = /开车|自驾/.test(head);
  const named = head.match(/^(开车|自驾|团车|步行|船回|船|飞机|出租车|缆车|火车|公交\s*\d+\s*路|公交|免费接驳|SkyBus(?:\s+\S+){0,2}|Metro\s*\d+)/);
  if (named) return { word: named[1].replace(/\s+/g, ' '), drive };
  return { word: transportLabel(edge.transport_mode), drive };
}

/** 开车、自驾在数据里仍用出租车这一档，页面上写开车或自驾。 */
export function edgeModeWord(edge: TripEdge): string {
  return legLead(edge).word;
}

/** 流程图两站之间那一行。地图弹层用同一句。 */
export function flowHopText(edge: TripEdge): string {
  const parts = [edgeModeWord(edge)];
  if (edge.duration_minutes) parts.push(`${edge.duration_minutes} 分钟`);
  if (edge.label) parts.push(edge.label);
  return parts.join(' · ');
}

/** 这一处要待多久。没有分钟、或不估的，返回空。 */
export function stayParts(node: TripNode): { kicker: string; value: string; guess: boolean } | null {
  const minutes = node.duration_minutes;
  if (!minutes || node.dwell_basis === 'skip') return null;
  const guess = node.dwell_basis === 'usual';
  return { kicker: guess ? '预估' : '停留', value: formatStay(minutes), guess };
}

export function stayLabel(node: TripNode): string | null {
  const parts = stayParts(node);
  return parts ? `${parts.kicker} ${parts.value}` : null;
}

function formatStay(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours}小时`;
  return `${hours}小时${rest}分`;
}

function legDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    const text = km >= 100 ? String(Math.round(km)) : km >= 10 ? km.toFixed(1) : km.toFixed(2);
    return `${text}km`;
  }
  return `${Math.round(meters)}m`;
}

function legDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}小时${rest}分` : `${hours}小时`;
  }
  return `${minutes}分`;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 6371000;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 地图连线中间的短标注：方式、直线或路网距离、已写明的用时。 */
export function mapLegCaption(edge: TripEdge): string {
  const { word } = legLead(edge);
  const parts = [word];
  const meters = edge.distance_meters;
  if (meters != null && meters > 0) parts.push(legDistance(meters));
  const minutes = edge.duration_minutes;
  if (minutes != null && minutes > 0) parts.push(legDuration(minutes));
  return parts.join(' · ');
}

const LABEL_ANCHORS = ['bottom', 'top', 'right', 'left', 'bottom-right', 'bottom-left', 'top-right', 'top-left'];

function placeKey(node: Pick<TripNode, 'lat' | 'lng'>): string {
  return `${node.lat.toFixed(4)},${node.lng.toFixed(4)}`;
}

function isFuel(node: TripNode): boolean {
  return (node.tags ?? []).includes('加油站') || (node.scene_group ?? '').includes('加油站');
}

/** 同一坐标的信息点共用一颗钉，标签绕开，不再把路线拧成一小圈。 */
function fanOf(nodes: TripNode[]): Map<string, number> {
  const groups = new Map<string, string[]>();
  for (const node of nodes) {
    if (!hasCoords(node)) continue;
    const list = groups.get(placeKey(node)) ?? [];
    list.push(node.id);
    groups.set(placeKey(node), list);
  }
  const fan = new Map<string, number>();
  for (const ids of groups.values()) ids.forEach((id, index) => fan.set(id, index));
  return fan;
}

function pointLabel(node: TripNode): string {
  const time = [node.start_time, node.end_time].filter(Boolean).join('–');
  const stay = stayLabel(node);
  const sub = [time, stay].filter(Boolean).join(' · ');
  return sub ? `${node.name}\n${sub}` : node.name;
}

/** 流程图上前后相接、却没有线的必经站，补到地图上。加油站和可选参考点不补。 */
function bridgeFlowGaps(days: DayPlan[], edges: TripEdge[]): TripEdge[] {
  const linked = new Set(edges.map((edge) => `${edge.from}|${edge.to}`));
  const incoming = new Set(edges.map((edge) => edge.to));
  const extra: TripEdge[] = [];
  for (const day of days) {
    const seq = day.nodes.filter((node) => hasCoords(node) && !node.is_optional && !isFuel(node));
    for (let index = 1; index < seq.length; index += 1) {
      const from = seq[index - 1];
      const to = seq[index];
      const key = `${from.id}|${to.id}`;
      if (linked.has(key) || incoming.has(to.id)) continue;
      linked.add(key);
      const back = /^回到/.test(to.name);
      extra.push({
        id: `map-bridge-${from.id}-${to.id}`,
        from: from.id,
        to: to.id,
        type: 'primary',
        transport_mode: back ? 'taxi' : 'walk',
        duration_minutes: 0,
        label: back ? '开车回去' : '接着',
        route_source: 'estimate',
      });
    }
  }
  return extra;
}

export function buildMapModel(
  days: DayPlan[],
  crossEdges: TripEdge[],
  includeCross: boolean,
  selectedId: string | null,
  colorOf: (node: TripNode) => string,
  catalog: DayPlan[] = days,
): MapModel {
  const nodes = days.flatMap((day) => day.nodes);
  const fan = fanOf(nodes);
  const located: MapPoint[] = [];
  const pointFeatures: GeoFeature[] = [];
  for (const node of nodes) {
    if (!hasCoords(node)) continue;
    const color = colorOf(node);
    const slot = fan.get(node.id) ?? 0;
    located.push({ id: node.id, name: node.name, lng: node.lng, lat: node.lat, color, optional: node.is_optional });
    pointFeatures.push({
      type: 'Feature',
      properties: {
        id: node.id,
        name: node.name,
        label: pointLabel(node),
        anchor: LABEL_ANCHORS[slot % LABEL_ANCHORS.length] ?? 'bottom',
        fan: slot,
        color,
        optional: node.is_optional ? 1 : 0,
        selected: node.id === selectedId ? 1 : 0,
      },
      geometry: { type: 'Point', coordinates: [node.lng, node.lat] },
    });
  }
  pointFeatures.sort((a, b) => Number(a.properties.selected) - Number(b.properties.selected));
  const byId = new Map(catalog.flatMap((day) => day.nodes).map((node) => [node.id, node]));
  const visible = new Set(nodes.map((node) => node.id));
  const edges = [...days.flatMap((day) => day.edges), ...bridgeFlowGaps(days, days.flatMap((day) => day.edges))];
  const seen = new Set(edges.map((edge) => edge.id));
  for (const edge of crossEdges) {
    if (seen.has(edge.id)) continue;
    const touches = visible.has(edge.from) || visible.has(edge.to);
    if (!includeCross && !touches) continue;
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    edges.push(edge);
    seen.add(edge.id);
  }
  const lineFeatures: GeoFeature[] = [];
  for (const edge of edges) {
    const fromNode = byId.get(edge.from);
    const toNode = byId.get(edge.to);
    if (!fromNode || !toNode || !hasCoords(fromNode) || !hasCoords(toNode) || edge.from === edge.to) continue;
    if (placeKey(fromNode) === placeKey(toNode)) continue;
    const from = { lng: fromNode.lng, lat: fromNode.lat };
    const to = { lng: toNode.lng, lat: toNode.lat };
    const stored = edge.distance_meters ?? 0;
    const geometric = Math.round(haversineMeters(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng));
    const meters = stored > 0 ? stored : geometric;
    const captionEdge = stored > 0 ? edge : { ...edge, distance_meters: meters };
    const lead = legLead(edge);
    const detail = flowHopText(edge);
    lineFeatures.push({
      type: 'Feature',
      properties: {
        id: edge.id,
        alt: edge.type === 'alternative' ? 1 : 0,
        caption: mapLegCaption(captionEdge),
        detail,
        fromName: fromNode.name,
        toName: toNode.name,
        meters,
        minutes: edge.duration_minutes ?? 0,
        kind: lead.drive ? 'taxi' : edge.transport_mode,
        ink: lead.drive ? LEG_INK.taxi : LEG_INK[edge.transport_mode],
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
    });
  }
  return {
    located,
    points: { type: 'FeatureCollection', features: pointFeatures },
    lines: { type: 'FeatureCollection', features: lineFeatures },
  };
}

/** 精度圈，半径单位是米。 */
export function accuracyRing(lng: number, lat: number, radiusM: number): FeatureCollection {
  const steps = 48;
  const earth = 6378137;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * Math.PI * 2;
    const dx = radiusM * Math.cos(bearing);
    const dy = radiusM * Math.sin(bearing);
    const dLat = (dy / earth) * (180 / Math.PI);
    const dLng = (dx / (earth * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    ring.push([lng + dLng, lat + dLat]);
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [ring] },
      },
    ],
  };
}

export function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}
