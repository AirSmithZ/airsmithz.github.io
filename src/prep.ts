import { useSyncExternalStore } from 'react';
import { EXTRA_NOTES, EXTRA_PACKS, SEED_APPS } from './data/prepExtra';

export type PrepKind = 'todo' | 'note' | 'pack' | 'app';

export interface TodoItem {
  id: string;
  group: string;
  text: string;
  note: string;
  done: boolean;
}

export interface NoteItem {
  id: string;
  chapter: string;
  title: string;
  body: string;
  strict: boolean;
}

export interface PackItem {
  id: string;
  group: string;
  text: string;
  packed: boolean;
}

export interface AppItem {
  id: string;
  group: string;
  name: string;
  detail: string;
  installed: boolean;
}

export const TODO_GROUPS = ['现在', '签证批下之后', '订票、订车', '出发前', '在路上'] as const;
export const NOTE_CHAPTERS = ['断点', '行李', '紧急', '健康', '天气', '路上', '钱和通讯'] as const;

export function isPrepKind(value: string | null): value is PrepKind {
  return value === 'todo' || value === 'note' || value === 'pack' || value === 'app';
}
export const PACK_GROUPS = ['证件', '衣服', '活动', '其余', '不带'] as const;
export const APP_GROUPS = ['地图', '翻译', '公交', '叫车', '餐厅', '不装'] as const;

export const PREP_META: Record<PrepKind, { title: string; eyebrow: string; blurb: string }> = {
  todo: {
    title: '待办事项',
    eyebrow: '出发前',
    blurb: '勾完一条就留下。重置只换回这一栏的初始条目。',
  },
  note: {
    title: '参考信息',
    eyebrow: '查阅',
    blurb: '断点、路上、电话和天气。签证、入境和租车在「更多」里按步骤看。',
  },
  pack: {
    title: '携带物品',
    eyebrow: '行李',
    blurb: '4 个人各一份。司机的证件按实际开车的人数。',
  },
  app: {
    title: '要装的 App',
    eyebrow: '手机',
    blurb: '出发前装好，离线内容一起下。',
  },
};

const SEED_TODOS: TodoItem[] = [
  { id: 't1', group: '现在', text: '4 本护照有效期到 2027-05-28 以后', note: '新西兰要求离开后再留 3 个月。2 月 28 日离开', done: false },
  { id: 't2', group: '现在', text: '4 个人在 ImmiAccount 各交一份澳大利亚访客签证，选旅游这一档', note: '类别编号是 600。不能用 ETA 或 eVisitor', done: false },
  { id: 't3', group: '现在', text: '每个司机办驾照英文公证，正页和副页，使用地填新西兰', note: '不办国际驾照', done: false },
  { id: 't4', group: '现在', text: '给 Apex 发邮件问翻译、计天、皇冠山脉，书面回复后再付款', note: 'reservations@apexrentals.co.nz', done: false },
  { id: 't5', group: '现在', text: '买旅行险，除外名单含跳伞、礁上直升机、天际线滑板、鲨鱼快艇、米尔福德观光飞行', note: '气旋还没被命名时买', done: false },
  { id: 't6', group: '签证批下之后', text: '出发前再打开移民局页面：还写着可以继续用 NZeTA 就办，不写了就交新西兰访客签证', note: '两笔不一起交', done: false },
  { id: 't7', group: '订票、订车', text: '2 月 8 日双流到香港、2 月 9 日香港到凯恩斯，订成两张票', note: '香港取行李再托。往来港澳通行证加个人旅游签注', done: false },
  { id: 't8', group: '订票、订车', text: '2 月 21 日霍巴特到基督城订成一张票', note: 'NZ196 转 NZ569，12:25–21:25，奥克兰中转', done: false },
  { id: 't9', group: '订票、订车', text: '三段捷星给每人每段加上托运', note: '2 月 14、16、18 日', done: false },
  { id: 't10', group: '订票、订车', text: '回程买成 2 月 28 日的票', note: 'VA162 转 3U3892。悉尼过境要签证，600 单次就另办 771。飞猪这一页还不是订单', done: false },
  { id: 't11', group: '订票、订车', text: '凯恩斯住宿保持可退，直到人离开凯恩斯', note: '出海替补是 2 月 12 日', done: false },
  { id: 't12', group: '订票、订车', text: '在 Apex 官网下单：基督城机场取、皇后镇机场还', note: 'apexrentals.co.nz/zh-cn/reservations', done: false },
  { id: 't13', group: '出发前', text: 'T-14 · 2027-01-26：再看签证、NZeTA、Apex 回复；塔斯曼、米尔福德、联程要已经下单', note: '', done: false },
  { id: 't14', group: '出发前', text: 'T-7 · 2027-02-02：看凯恩斯预报和气旋预警，出海仍把 2 月 12 日空着', note: '', done: false },
  { id: 't15', group: '出发前', text: 'T-3 · 2027-02-06：确认函离线存一份；2 月 14 日早班如果赶不上公交，留下凯恩斯出租车电话', note: '滑板首圈若还没约，这天约', done: false },
  { id: 't16', group: '出发前', text: 'T-1 · 2027-02-07：纸质证件和云端各一份；卡已开通境外；香港、澳洲四城和南岛的离线地图下好；要装的 App 下好离线包；号码能打出电话', note: '2 月 8 日已经在路上', done: false },
  { id: 't17', group: '在路上', text: '2 月 10 日，飞凯恩斯的飞机上填澳大利亚入境卡', note: '第一晚地址 Aveline Dual-Key', done: false },
  { id: 't18', group: '在路上', text: '2 月 20 日晚上在霍巴特填新西兰旅客申报', note: '只走 travellerdeclaration.govt.nz', done: false },
  { id: 't19', group: '在路上', text: '2 月 23 日上午取车，每个司机带驾照原件和公证书', note: '出示下单用的那张实体卡', done: false },
  { id: 't20', group: '在路上', text: '2 月 27 日用确认函对米尔福德时长。对得上就 17:29 前还车；对不上或落地晚于关门，车留到 2 月 28 日中午前还', note: '人要在 12:05 前到航站楼', done: false },
];

const SEED_NOTES: NoteItem[] = [
  {
    id: 'n15',
    chapter: '断点',
    title: '2 月 21 日错过就没有下一班',
    strict: false,
    body: '霍巴特飞基督城，订成一张票。NZ196，12:25 起飞，17:50 到奥克兰，转 NZ569，21:25 到基督城。拆成两张票的话，奥克兰要重新办理托运。\n错过这一班，当晚住不进机场旅馆 Lylo，2 月 23 日的取车也要一起往后推。\n去机场坐已经计入的 SkyBus。09:25 前到机场。\n2 月在凯恩斯的气旋季里（11 月 1 日到 4 月 30 日）。出海如果取消，可以改到 2 月 12 日。2 月 13 日的雨林古堡和 2 月 14 日飞悉尼的早班，没有可以改的日子。',
  },
  {
    id: 'n16',
    chapter: '断点',
    title: '香港停留和春节',
    strict: false,
    body: '2 月 8 日国泰 CX917 直飞香港，2 月 9 日澳航 QF128 再转捷星 JQ952 去凯恩斯。两张票。行李在香港取出，第二天再托。进香港要往来港澳通行证和个人旅游签注，护照单独进不去。\n2 月 8 日是农历初三，香港公众假期。2 月 9 日是初四，补假。年宵和烟花都在到达之前。',
  },
  {
    id: 'n17',
    chapter: '断点',
    title: '米尔福德没有后一天',
    strict: false,
    body: '米尔福德是飞机去、坐船、再飞回来。飞猪和官网说的时长、退改不一样，以收到的确认函为准。\n飞猪这一档写平均要等大约 4 小时 18 分才确认，成功率 50%。在新西兰的工作时间内、出发前 56 小时以外才能免费退改，56 小时以内不退。收到确认函要回复「确认」。RealNZ 官网写提前 24 小时可改可退，全程 4 到 5 小时。\n活动如果取消，或者回来晚于皇后镇门店关门的 17:29，车还在手上，而 2 月 28 日 15:05 的回程仍然要走。还车后的免费接驳只送到航站楼，不送回松木旅馆。2 月 28 日要在 12:05 前到航站楼。',
  },
  {
    id: 'n18',
    chapter: '断点',
    title: '这些还没订，也改不了日子',
    strict: false,
    body: '还没下单、又没有别的日子可以改的：塔斯曼游船（周五班期没重开）、米尔福德、2 月 21 日霍巴特到基督城。\n这些住宿和回程也还没变成已付款的订单：香港这一晚、凯恩斯 Aveline、悉尼 Luxury Stay、墨尔本 Absolute Collins、霍巴特海滨公寓、基督城机场旅馆 Lylo、蒂卡波 3E Apartment、瓦纳卡阿尔卑斯交会镇、皇后镇松木、回程航班。澳洲四家的旧列表价对不上新日期。\nLylo 只收中国证件（含港澳台），不是中国护照可能住不进去。24 小时有前台，最早 15:00 入住，不收现金。2 月 21 日 21:25 到，赶得上入住。',
  },
  {
    id: 'n24',
    chapter: '行李',
    title: '三段捷星要另加托运',
    strict: false,
    body: '2 月 14 日凯恩斯到悉尼、16 日悉尼到墨尔本、18 日墨尔本到霍巴特，都是捷星，出发日都在 2027 年 2 月 2 日之后。从这一天起，捷星经济舱只含一件放在座椅下面的包，尺寸 40×30×20 厘米。头顶行李箱要另买。名为 Starter 的票价不含托运。\n这三班还没下单，不会自动带上免费的头顶箱额度。到机场再买第一件 20 公斤托运，是 120 澳元，一个人、飞一段。订票时给每人、每段加上托运。香港到凯恩斯的第二段是捷星 JQ952，托运再对一次。',
  },
  {
    id: 'n25',
    chapter: '行李',
    title: '液体、鞋和药放哪',
    strict: false,
    body: '国际航班的手提行李里，液体每件不超过 100 毫升，放进可封口的透明袋。进了凯恩斯之后，澳大利亚国内段不按这条查。2 月 28 日从皇后镇出境，再按 100 毫升。\n系带、包住脚趾的鞋，以及处方药和晕船药，放进飞基督城那天的手提行李，不要托运。',
  },
  {
    id: 'n26',
    chapter: '紧急',
    title: '遇险和领事电话',
    strict: false,
    body: '在澳大利亚遇险打 000，可以要求中文。非紧急报警打 131444。驻悉尼总领馆领保 +61-2-95505519，这个号码只负责新南威尔士，墨尔本、霍巴特、凯恩斯不归它管。\n在新西兰遇险打 111，跟接线员说 Chinese 或 Mandarin。驻奥克兰总领馆领保 +64-9-5251200。南岛是否归这一家管，出发前再查一次。\n外交部 24 小时领保：+86-10-12308，或 +86-10-65612308。护照丢了，先报警拿回执，再打领保。',
  },
  {
    id: 'n27',
    chapter: '健康',
    title: '处方药怎么带',
    strict: false,
    body: '处方药带给自己，或带给同行的直系亲属。不超过 3 个月的量，留在原包装里，附上英文医生信，放手提行李。\n口服避孕药在新西兰可以带 6 个月。管制药品在新西兰最多带 1 个月，而且必须在旅客申报里申报。散装中草药、茶叶、枸杞算植物产品，不要塞进行李。',
  },
  {
    id: 'n28',
    chapter: '天气',
    title: '2 月大概什么温度',
    strict: false,
    body: '下面是 2022 到 2026 年、每年 2 月 9 日到 28 日的平均气温，用来估衣服，不是 2027 年 2 月的天气预报。\n墨尔本白天约 26°、夜里约 15°。霍巴特 23° / 13°。悉尼 26° / 19°。凯恩斯 31° / 24°，大约 10 天里有 7 天下雨。基督城 20° / 13°。皇后镇 21° / 11°。蒂卡波 18° / 8°，冷的清晨可以到 5°。\n带一件抓绒、一件防风防水外套。不带羽绒服。长途飞机穿这件抓绒。墨尔本把短袖、薄外套、抓绒按冷热往上加，餐厅空调用那件薄外套。',
  },
  {
    id: 'n29',
    chapter: '天气',
    title: '防晒和水母',
    strict: false,
    body: '紫外线指数到 3，衣服、帽子、阴凉、墨镜、防晒霜一起用。长袖防晒衣尽量选 UPF50。防晒霜用 SPF50 或 50+、广谱、防水，出门前 20 分钟涂，两小时后再补，游泳后再补。宽檐帽，墨镜符合澳标。2 月这几座城市白天都会过这个指数。\n2 月是水母季。没有防蜇网的海滩不要下水。',
  },
  {
    id: 'n30',
    chapter: '钱和通讯',
    title: '刷卡选当地货币',
    strict: false,
    body: '刷卡和取现时，机器上选澳元或纽元，不要选按人民币结算。\n基督城公交从 2026-11-23 起不收现金，也停用 Metrocard。2 月 22 日每人带一张可以贴一下就付款的签证或万事达。银联能不能这样坐公交，这次没查到。',
  },
  {
    id: 'n31',
    chapter: '钱和通讯',
    title: '插头，以及要能打电话',
    strict: false,
    body: '插座是 I 型：两只扁脚呈倒 V，230 伏。中国那种两只脚平行的扁插头插不进去。充电器铭牌写着 100–240 伏，就不用变压器。\n只买流量、不能通话的 eSIM 不够用。订车、跳伞、凌晨出租车都要能打电话。漫游打不出电话再买当地卡。林迪斯山口和皇冠山脉会没有信号。出发前把墨尔本、霍巴特、悉尼、凯恩斯和南岛的离线地图下到手机里。',
  },
  ...EXTRA_NOTES,
];

const SEED_PACKS: PackItem[] = [
  { id: 'p1', group: '证件', text: '护照原件，有效期到 2027-06-01 以后', packed: false },
  { id: 'p2', group: '证件', text: '澳大利亚访客签证的准签信，纸质一份、云端一份', packed: false },
  { id: 'p3', group: '证件', text: '新西兰 NZeTA 或访客签证信', packed: false },
  { id: 'p4', group: '证件', text: '中国驾照原件（每个司机）', packed: false },
  { id: 'p5', group: '证件', text: '公证处英文公证书，含驾照正页和副页（每个司机）', packed: false },
  { id: 'p6', group: '证件', text: '下单用的那张实体卡，由持卡人本人带着；另备一张本人的签证或万事达', packed: false },
  { id: 'p7', group: '证件', text: '每人一张能拍基督城公交的非接触签证或万事达', packed: false },
  { id: 'p8', group: '证件', text: '酒店、机票、团和活动的确认函，离线存一份', packed: false },
  { id: 'p9', group: '证件', text: '一支笔，飞机上填澳大利亚入境卡', packed: false },
  { id: 'p10', group: '衣服', text: '短袖、一条长裤、一件薄外套', packed: false },
  { id: 'p11', group: '衣服', text: '一件抓绒、一件防风防水外壳', packed: false },
  { id: 'p12', group: '衣服', text: '凯恩斯的透气夏装和一件小雨衣', packed: false },
  { id: 'p13', group: '活动', text: '塔斯曼：保暖内衣、手套、毛线帽。防水外套船上发。晕船药放手提', packed: false },
  { id: 'p14', group: '活动', text: '系带包头鞋一双，放进飞基督城的手提。跳伞不发鞋，赤脚和人字拖不行', packed: false },
  { id: 'p15', group: '活动', text: '泳衣、毛巾、一套能打湿的衣服、宽檐帽、墨镜、防晒霜、空水壶。礁上的面罩和防蜇衣船上有', packed: false },
  { id: 'p16', group: '活动', text: '米尔福德：防滑鞋、防水外套、保暖层、含 20%–50% 避蚊胺的驱虫剂。停下来盖住脚踝', packed: false },
  { id: 'p17', group: '活动', text: '鲨鱼快艇：能湿的衣服、毛巾、换洗、手机防水袋', packed: false },
  { id: 'p18', group: '其余', text: '每人一个中国插头转 I 型的转换头，加一个 I 型插口的 USB 排插', packed: false },
  { id: 'p19', group: '其余', text: '处方药原包装、英文医生信；晕车药、晕船药。2 月 11 日上车前吃晕车药', packed: false },
  { id: 'p20', group: '其余', text: '墨尔本、霍巴特、悉尼、凯恩斯和南岛的离线地图，以及一个能打电话的号码', packed: false },
  { id: 'p21', group: '不带', text: '公约国际驾照小册子', packed: false },
  { id: 'p22', group: '不带', text: '新鲜水果、蔬菜、肉、奶、种子', packed: false },
  { id: 'p23', group: '不带', text: '散装中草药、茶叶、枸杞', packed: false },
  { id: 'p24', group: '不带', text: '从成都带的瓶装水和零食。蜂蜜若要带，进澳大利亚时申报', packed: false },
  { id: 'p25', group: '不带', text: '带土的鞋。进凯恩斯前洗净；飞新西兰前再洗净，并在旅客申报里申报穿过的户外鞋', packed: false },
  ...EXTRA_PACKS,
];

const KEY: Record<PrepKind, string> = {
  todo: 'anz-prep-todo-v2',
  note: 'anz-prep-note-v4',
  pack: 'anz-prep-pack-v3',
  app: 'anz-prep-app-v2',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function asTodo(value: unknown): TodoItem | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.group !== 'string' || typeof value.text !== 'string') {
    return null;
  }
  return {
    id: value.id,
    group: value.group,
    text: value.text,
    note: typeof value.note === 'string' ? value.note : '',
    done: value.done === true,
  };
}

function asNote(value: unknown): NoteItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.chapter !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.body !== 'string'
  ) {
    return null;
  }
  return {
    id: value.id,
    chapter: value.chapter,
    title: value.title,
    body: value.body,
    strict: value.strict === true,
  };
}

function asPack(value: unknown): PackItem | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.group !== 'string' || typeof value.text !== 'string') {
    return null;
  }
  return { id: value.id, group: value.group, text: value.text, packed: value.packed === true };
}

function asApp(value: unknown): AppItem | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.group !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  return {
    id: value.id,
    group: value.group,
    name: value.name,
    detail: typeof value.detail === 'string' ? value.detail : '',
    installed: value.installed === true,
  };
}

function readList<T>(key: string, seed: T[], cast: (value: unknown) => T | null): { items: T[]; ok: boolean } {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      localStorage.setItem(key, JSON.stringify(seed));
      return { items: seed, ok: true };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { items: seed, ok: writeRaw(key, seed) };
    const items: T[] = [];
    for (const row of parsed) {
      const item = cast(row);
      if (!item) return { items: seed, ok: writeRaw(key, seed) };
      items.push(item);
    }
    return { items, ok: true };
  } catch {
    return { items: seed, ok: false };
  }
}

function writeRaw(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function cloneTodos() {
  return SEED_TODOS.map((item) => ({ ...item }));
}
function cloneNotes() {
  return SEED_NOTES.map((item) => ({ ...item }));
}
function clonePacks() {
  return SEED_PACKS.map((item) => ({ ...item }));
}
function cloneApps() {
  return SEED_APPS.map((item) => ({ ...item }));
}

function withPrevious<T extends { id: string }>(nextKey: string, previousKey: string, seed: T[], cast: (value: unknown) => T | null): T[] {
  try {
    if (localStorage.getItem(nextKey) !== null) return seed;
    const raw = localStorage.getItem(previousKey);
    if (raw === null) return seed;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seed;
    const previous = new Map<string, T>();
    for (const row of parsed) {
      const item = cast(row);
      if (item) previous.set(item.id, item);
    }
    const seen = new Set(seed.map((item) => item.id));
    const kept = seed.map((item) => {
      const old = previous.get(item.id);
      if (!old) return item;
      if ('done' in item && 'done' in old) return { ...item, done: old.done };
      if ('packed' in item && 'packed' in old) return { ...item, packed: old.packed };
      if ('installed' in item && 'installed' in old) return { ...item, installed: old.installed };
      return item;
    });
    for (const item of previous.values()) {
      if (!seen.has(item.id)) kept.push(item);
    }
    return kept;
  } catch {
    return seed;
  }
}

const loadedTodo = readList(KEY.todo, withPrevious(KEY.todo, 'anz-prep-todo-v1', cloneTodos(), asTodo), asTodo);
const loadedNote = readList(KEY.note, withPrevious(KEY.note, 'anz-prep-note-v3', cloneNotes(), asNote), asNote);
const loadedPack = readList(KEY.pack, withPrevious(KEY.pack, 'anz-prep-pack-v2', clonePacks(), asPack), asPack);
const loadedApp = readList(KEY.app, withPrevious(KEY.app, 'anz-prep-app-v1', cloneApps(), asApp), asApp);

let todos = loadedTodo.items;
let notes = loadedNote.items;
let packs = loadedPack.items;
let apps = loadedApp.items;
let storageOk = loadedTodo.ok && loadedNote.ok && loadedPack.ok && loadedApp.ok;
let snapshot = { todos, notes, packs, apps, storageOk };
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { todos, notes, packs, apps, storageOk };
  listeners.forEach((listener) => listener());
}

function writeKind(kind: PrepKind): void {
  const value = kind === 'todo' ? todos : kind === 'note' ? notes : kind === 'pack' ? packs : apps;
  if (!writeRaw(KEY[kind], value)) storageOk = false;
  emit();
}

export function newPrepId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function usePrep() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const prepActions = {
  addTodo(group: string, text: string, note: string) {
    todos = [...todos, { id: newPrepId('t'), group, text, note, done: false }];
    writeKind('todo');
  },
  updateTodo(id: string, patch: Pick<TodoItem, 'group' | 'text' | 'note'>) {
    todos = todos.map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeKind('todo');
  },
  toggleTodo(id: string) {
    todos = todos.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
    writeKind('todo');
  },
  removeTodo(id: string) {
    todos = todos.filter((item) => item.id !== id);
    writeKind('todo');
  },
  resetTodos() {
    todos = cloneTodos();
    writeKind('todo');
  },
  addNote(chapter: string, title: string, body: string, strict: boolean) {
    notes = [...notes, { id: newPrepId('n'), chapter, title, body, strict }];
    writeKind('note');
  },
  updateNote(id: string, patch: Pick<NoteItem, 'chapter' | 'title' | 'body' | 'strict'>) {
    notes = notes.map((item) => (item.id === id ? { ...item, ...patch } : item));
    writeKind('note');
  },
  removeNote(id: string) {
    notes = notes.filter((item) => item.id !== id);
    writeKind('note');
  },
  resetNotes() {
    notes = cloneNotes();
    writeKind('note');
  },
  addPack(group: string, text: string) {
    packs = [...packs, { id: newPrepId('p'), group, text, packed: false }];
    writeKind('pack');
  },
  updatePack(id: string, patch: Pick<PackItem, 'group' | 'text'>) {
    packs = packs.map((item) => (item.id === id ? { ...item, ...patch, packed: patch.group === '不带' ? false : item.packed } : item));
    writeKind('pack');
  },
  togglePack(id: string) {
    packs = packs.map((item) => (item.id === id && item.group !== '不带' ? { ...item, packed: !item.packed } : item));
    writeKind('pack');
  },
  removePack(id: string) {
    packs = packs.filter((item) => item.id !== id);
    writeKind('pack');
  },
  resetPacks() {
    packs = clonePacks();
    writeKind('pack');
  },
  addApp(group: string, name: string, detail: string) {
    apps = [...apps, { id: newPrepId('a'), group, name, detail, installed: false }];
    writeKind('app');
  },
  updateApp(id: string, patch: Pick<AppItem, 'group' | 'name' | 'detail'>) {
    apps = apps.map((item) =>
      item.id === id ? { ...item, ...patch, installed: patch.group === '不装' ? false : item.installed } : item,
    );
    writeKind('app');
  },
  toggleApp(id: string) {
    apps = apps.map((item) => (item.id === id && item.group !== '不装' ? { ...item, installed: !item.installed } : item));
    writeKind('app');
  },
  removeApp(id: string) {
    apps = apps.filter((item) => item.id !== id);
    writeKind('app');
  },
  resetApps() {
    apps = cloneApps();
    writeKind('app');
  },
};

export function orderedGroups(present: string[], preferred: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of present) {
    if (seen.has(name)) continue;
    seen.add(name);
    unique.push(name);
  }
  const preferredSet = new Set<string>(preferred);
  return [...preferred.filter((name) => seen.has(name)), ...unique.filter((name) => !preferredSet.has(name))];
}
