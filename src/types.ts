export type NodeCategory =
  | 'airport'
  | 'hotel'
  | 'restaurant'
  | 'snack'
  | 'attraction'
  | 'landmark'
  | 'transit';

export type TransportMode = 'walk' | 'subway' | 'bus' | 'taxi' | 'flight' | 'ferry';

export type QuoteCurrency = 'CNY' | 'AUD' | 'NZD';

export interface CostQuote {
  item: string;
  currency: QuoteCurrency;
  per_person: number | null;
  party: number | null;
  in_total: boolean;
  note?: string;
}

export interface TripNode {
  id: string;
  name: string;
  name_en?: string;
  category: NodeCategory;
  lat: number;
  lng: number;
  address?: string;
  floor?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  is_optional: boolean;
  tips?: string[];
  /** 详情里跟在说明后面的图。src 相对站点根目录，不含开头的斜杠。 */
  photos?: { src: string; alt: string; credit?: string }[];
  tags?: string[];
  cost_label?: string;
  cost_quotes?: CostQuote[];
  region?: string;
  /** 总览里相对自动排位的微调，换区后清掉。 */
  overview_offset?: { x: number; y: number };
  coord_confidence?: string;
  coord_source?: string;
  scene_group?: string;
  place_id?: string;
  evidence_refs?: unknown[];
}

export interface TripEdge {
  id: string;
  from: string;
  to: string;
  type: 'primary' | 'alternative';
  transport_mode: TransportMode;
  duration_minutes: number;
  distance_meters?: number;
  label?: string;
  route_source?: string;
  depart_time?: string;
  arrive_time?: string;
}

export interface DayPlan {
  day_index: number;
  date: string;
  weekday: string;
  label: string;
  region?: string;
  weather?: {
    temp_min?: number;
    temp_max?: number;
    icon?: string;
    description?: string;
  };
  nodes: TripNode[];
  edges: TripEdge[];
}

export interface Itinerary {
  id: string;
  title: string;
  destination: string;
  timezone: string;
  days: DayPlan[];
  cross_day_edges?: TripEdge[];
  /** 总览里新建、但还没有站点的区域行。 */
  extra_regions?: string[];
  meta: {
    generated_at?: string;
    model?: string;
    locale?: string;
    warnings?: string[];
    expense_extras?: CostQuote[];
  };
}

/** 包在行程外面的本机文档。行程正文来自 anzTrip，改动只写 localStorage。 */
export interface Doc {
  origin: 'seed' | 'local';
  savedAt: string;
  travelers: number;
  itinerary: Itinerary;
}

export type Scope = 'day' | 'all';
export type PanelId = 'graph' | 'map' | 'cost';
export type LayoutLock = 'auto' | 'portrait' | 'landscape';

export interface EditorSession {
  token: number;
  mode: 'create' | 'edit';
  dayIndex: number;
  nodeId: string;
}

export interface UiState {
  scope: Scope;
  dayIndex: number;
  panel: PanelId;
  selectedId: string | null;
  layoutLock: LayoutLock;
  editor: EditorSession | null;
}

export interface SaveNodeInput {
  mode: 'create' | 'edit';
  dayIndex: number;
  node: TripNode;
  /** 有 id 且已存在则改那条线；否则作为新线加进当天。null 表示不动线。 */
  edge: TripEdge | null;
}

export const CATEGORIES: { id: NodeCategory; label: string; color: string; glow: string; icon: string }[] = [
  { id: 'airport', label: '机场', color: '#2d8f6f', glow: 'rgba(45,143,111,0.45)', icon: '✈' },
  { id: 'hotel', label: '酒店', color: '#6b7280', glow: 'rgba(107,114,128,0.35)', icon: '🛏' },
  { id: 'restaurant', label: '餐厅', color: '#b83240', glow: 'rgba(184,50,64,0.4)', icon: '🍽' },
  { id: 'snack', label: '小吃', color: '#d97706', glow: 'rgba(217,119,6,0.4)', icon: '🍜' },
  { id: 'attraction', label: '游玩', color: '#ca9a04', glow: 'rgba(202,154,4,0.4)', icon: '📷' },
  { id: 'landmark', label: '地标', color: '#6366d4', glow: 'rgba(99,102,212,0.4)', icon: '📍' },
  { id: 'transit', label: '交通', color: '#0891b2', glow: 'rgba(8,145,178,0.4)', icon: '↔' },
];

export const TRANSPORTS: { id: TransportMode; label: string }[] = [
  { id: 'walk', label: '步行' },
  { id: 'subway', label: '地铁' },
  { id: 'bus', label: '公交/大巴' },
  { id: 'taxi', label: '出租/网约' },
  { id: 'flight', label: '飞机' },
  { id: 'ferry', label: '船' },
];

export function categoryMeta(category: string): { label: string; color: string; glow: string; icon: string } {
  return CATEGORIES.find((item) => item.id === category) ?? {
    label: '站点',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.35)',
    icon: '•',
  };
}

/** 游玩按活动本身上色。深色面板上用得开的颜色，和机场、住宿、交通的原色错开。 */
export const PLAY_KINDS: { id: string; label: string; color: string; glow: string; icon: string }[] = [
  { id: 'dive', label: '潜水', color: '#2ad4c8', glow: 'rgba(42,212,200,0.45)', icon: '🤿' },
  { id: 'skydive', label: '跳伞', color: '#ff4f8b', glow: 'rgba(255,79,139,0.45)', icon: '🪂' },
  { id: 'citywalk', label: 'Citywalk', color: '#c4b5fd', glow: 'rgba(196,181,253,0.42)', icon: '🚶' },
  { id: 'shoot', label: '射击', color: '#ff5a36', glow: 'rgba(255,90,54,0.45)', icon: '🎯' },
  { id: 'speedboat', label: '快艇', color: '#49b6ff', glow: 'rgba(73,182,255,0.45)', icon: '🚤' },
  { id: 'shop', label: '购物', color: '#f0c14d', glow: 'rgba(240,193,77,0.4)', icon: '🛍' },
  { id: 'cable', label: '缆车', color: '#6fce7a', glow: 'rgba(111,206,122,0.4)', icon: '🚠' },
  { id: 'luge', label: '滑板', color: '#ff9e2c', glow: 'rgba(255,158,44,0.45)', icon: '🛷' },
  { id: 'zoo', label: '动物园', color: '#34d399', glow: 'rgba(52,211,153,0.45)', icon: '🦘' },
  { id: 'view', label: '观景', color: '#d7e27a', glow: 'rgba(215,226,122,0.35)', icon: '🏞' },
];

const PLAY_BY_NAME: Record<string, string> = {
  潜水: 'dive',
  瓦纳卡跳伞: 'skydive',
  'City Walk和替补前一天行程取消': 'citywalk',
  悉尼歌剧院: 'citywalk',
  海德公园: 'citywalk',
  悉尼大学主校区: 'citywalk',
  弗林德斯火车站: 'citywalk',
  圣保罗大教堂: 'citywalk',
  皇家拱廊: 'citywalk',
  维多利亚图书馆: 'citywalk',
  大卫公园: 'citywalk',
  植物园: 'citywalk',
  皇后镇公园: 'citywalk',
  'Real Guns': 'shoot',
  鲨鱼快艇: 'speedboat',
  'Australia the Gift': 'shop',
  萨拉曼卡集市: 'shop',
  'Riverside Market': 'shop',
  'Westfield Riccarton': 'shop',
  山顶缆车中环站: 'cable',
  天际线缆车: 'cable',
  天际线滑板: 'luge',
  星光大道: 'view',
  太平山顶: 'view',
  凯恩斯潟湖: 'view',
  太阳恋人号: 'view',
  摩尔礁: 'view',
  大堡礁直升机观光: 'view',
  金字塔山: 'view',
  袋鼠谷: 'zoo',
  帕罗尼拉公园: 'view',
  米拉米拉瀑布: 'view',
  邦迪海滩: 'view',
  吉布森石阶: 'view',
  十二使徒: 'view',
  'Great Ocean Road Wildlife Park': 'zoo',
  洛克阿德大峡谷: 'view',
  'Pennicott Wilderness Journeys': 'view',
  亚瑟港: 'view',
  皮勒角: 'view',
  '3 小时巡航': 'view',
  鹰颈峡: 'view',
  'Tasmanian Devil Unzoo': 'zoo',
  伯克斯山口: 'view',
  好牧羊人教堂: 'view',
  普卡基: 'view',
  特威泽尔: 'view',
  奥马鲁阿玛: 'view',
  林迪斯山口: 'view',
  塔拉斯: 'view',
  卡德罗纳: 'view',
  皇冠山脉: 'view',
  皇冠山脉鞍部: 'view',
  箭镇: 'view',
  几维鸟园: 'zoo',
  'Milford Sound Scenic Flights Hangar': 'view',
  峡湾游船: 'view',
};

export function nodeFace(node: { name: string; category: string }): { label: string; color: string; glow: string; icon: string } {
  const kind = PLAY_KINDS.find((item) => item.id === PLAY_BY_NAME[node.name]);
  return kind ?? categoryMeta(node.category);
}

export function transportLabel(mode: string): string {
  return TRANSPORTS.find((item) => item.id === mode)?.label ?? mode;
}
