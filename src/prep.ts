import { useSyncExternalStore } from 'react';

export type PrepKind = 'todo' | 'note' | 'pack';

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

export const TODO_GROUPS = ['现在', '签证批下之后', '订票、订车', '出发前', '在路上'] as const;
export const NOTE_CHAPTERS = [
  '入境澳大利亚',
  '入境新西兰',
  '签证',
  '断点',
  '租车',
  '驾照',
  '行李',
  '紧急',
  '健康',
  '天气',
  '钱和通讯',
] as const;
export const PACK_GROUPS = ['证件', '衣服', '活动', '其余', '不带'] as const;

export const PREP_META: Record<PrepKind, { title: string; eyebrow: string; blurb: string }> = {
  todo: {
    title: '待办事项',
    eyebrow: '出发前',
    blurb: '勾完一条就留下。重置只换回这一栏的初始条目。',
  },
  note: {
    title: '参考信息',
    eyebrow: '过关',
    blurb: '澳大利亚和新西兰的入境要求放在最上面。其余按章查阅。',
  },
  pack: {
    title: '携带物品',
    eyebrow: '行李',
    blurb: '4 个人各一份。司机的证件按实际开车的人数。',
  },
};

const SEED_TODOS: TodoItem[] = [
  { id: 't1', group: '现在', text: '4 本护照有效期到 2027-06-01 以后', note: '新西兰要求离开后再留 3 个月', done: false },
  { id: 't2', group: '现在', text: '4 个人在 ImmiAccount 各交一份澳大利亚 600 旅游签证', note: '不能用 ETA 或 eVisitor', done: false },
  { id: 't3', group: '现在', text: '每个司机办驾照英文公证，正页和副页，使用地填新西兰', note: '不办国际驾照', done: false },
  { id: 't4', group: '现在', text: '给 Apex 发邮件问翻译、计天、皇冠山脉，书面回复后再付款', note: 'reservations@apexrentals.co.nz', done: false },
  { id: 't5', group: '现在', text: '买旅行险，除外名单含跳伞、礁上直升机、天际线滑板、鲨鱼快艇、米尔福德观光飞行', note: '气旋还没被命名时买', done: false },
  { id: 't6', group: '签证批下之后', text: '看过 2026 年 11 月试点结论：还开着就办 NZeTA，关了就交新西兰访客签证', note: '两笔不一起交', done: false },
  { id: 't7', group: '订票、订车', text: '广州中转按公开时刻再对一次', note: '卡片和时刻表差 10 分钟；2 月 9 日是春节初四', done: false },
  { id: 't8', group: '订票、订车', text: '2 月 21 日凯恩斯—布里斯班—奥克兰—基督城订成一张票', note: '没有后一班', done: false },
  { id: 't9', group: '订票、订车', text: '三段捷星给每人每段加上托运', note: '2 月 12、15、17 日', done: false },
  { id: 't10', group: '订票、订车', text: '回程买成 3 月 1 日已付款的票', note: '新西兰值机要看这张票', done: false },
  { id: 't11', group: '订票、订车', text: '凯恩斯住宿和联程保持可退，直到人离开凯恩斯', note: '早班没有替补日', done: false },
  { id: 't12', group: '订票、订车', text: '在 Apex 官网下单：基督城机场取、皇后镇机场还', note: 'apexrentals.co.nz/zh-cn/reservations', done: false },
  { id: 't13', group: '出发前', text: 'T-14 · 2027-01-26：再看签证、NZeTA、Apex 回复；塔斯曼、米尔福德、联程要已经下单', note: '', done: false },
  { id: 't14', group: '出发前', text: 'T-7 · 2027-02-02：看凯恩斯预报和气旋预警，出海仍把 2 月 19 日空着', note: '', done: false },
  { id: 't15', group: '出发前', text: 'T-3 · 2027-02-06：确认函离线存一份；留下 2 月 21 日凌晨出租车电话', note: '滑板首圈若还没约，这天约', done: false },
  { id: 't16', group: '出发前', text: 'T-1 · 2027-02-08：纸质证件和云端各一份；卡已开通境外；南岛离线地图下好；号码能打出电话', note: '', done: false },
  { id: 't17', group: '在路上', text: '2 月 10 日，南航飞机上填澳大利亚入境卡', note: '第一晚地址 Absolute Collins', done: false },
  { id: 't18', group: '在路上', text: '2 月 20 日晚上在凯恩斯填新西兰旅客申报，并订好次日凌晨出租车', note: '只走 travellerdeclaration.govt.nz', done: false },
  { id: 't19', group: '在路上', text: '2 月 23 日上午取车，每个司机带驾照原件和公证书', note: '出示下单用的那张实体卡', done: false },
  { id: 't20', group: '在路上', text: '2 月 28 日用确认函对米尔福德时长。对得上就 17:29 前还车；对不上或落地晚于关门，车留到 3 月 1 日中午前还', note: '', done: false },
];

const SEED_NOTES: NoteItem[] = [
  {
    id: 'n1',
    chapter: '入境澳大利亚',
    title: '没有 600 不能登机',
    strict: true,
    body: '4 个人各有一份已经批下来的访客签证 600，和登机护照是同一本。签证电子绑定护照，边检不看贴纸。没有签证，南航不让登机。准签信纸质一份、云端一份。',
  },
  {
    id: 'n2',
    chapter: '入境澳大利亚',
    title: '飞机上填纸质入境卡',
    strict: true,
    body: '南航不在澳航电子申报试点里。全国网页版说在 2027 年底前铺开。正反面都填，本人签字，有简体中文样张。准备一支笔。第一晚地址写 Absolute Collins。健康和犯罪记录按实情填，不实填写可以影响签证。 https://www.abf.gov.au/entering-and-leaving-australia/crossing-the-border/at-the-border/incoming-passenger-card-(ipc)',
  },
  {
    id: 'n3',
    chapter: '入境澳大利亚',
    title: '食品和鞋要申报',
    strict: true,
    body: '食品、植物、动物制品、乡村穿过的鞋，入境卡填 Yes。如实申报并交给检查员，生物安全法下不罚。瞒报违法。新鲜水果、蔬菜、种子、肉类、乳制品不带。蜂蜜可以进大多数州，但要申报并接受检查。进墨尔本前把鞋上的土、草、粪便洗掉并晾干。 https://www.agriculture.gov.au/biosecurity-trade/policy/faqs',
  },
  {
    id: 'n4',
    chapter: '入境澳大利亚',
    title: 'SmartGate 过不了就走人工',
    strict: true,
    body: '护照有效、年满 7 岁、身高至少 1.1 米可以试 SmartGate，屏幕能选简体中文。试点已从电子护照放宽到普通护照。入境卡照填。 https://www.abf.gov.au/entering-and-leaving-australia/smartgate/arrivals/who-can-use-smartgates',
  },
  {
    id: 'n5',
    chapter: '入境澳大利亚',
    title: '现金和免税',
    strict: true,
    body: '进或出澳大利亚，现金或等值达到 1 万澳元，过关前申报。一般商品成人免税额 900 澳元，18 岁以下 450 澳元，烟酒另有限额，超了写进入境卡。 https://www.austrac.gov.au/general-public/moving-money-overseas',
  },
  {
    id: 'n6',
    chapter: '入境澳大利亚',
    title: '这趟不用黄热病证书',
    strict: true,
    body: '从中国出发、广州转机，近 6 天没有到过黄热病风险国家，澳大利亚不拿黄热病证书卡人。入境卡问到近 6 天去过的地方，按实际行程填。2 月 10 日进墨尔本。布里斯班是离开澳大利亚，不是第二次入境。',
  },
  {
    id: 'n7',
    chapter: '入境新西兰',
    title: '值机时签证和 NZeTA 都要在',
    strict: true,
    body: '人已经进入澳大利亚，再从澳大利亚的机场起飞，600 在凯恩斯值机时仍有效，才能用 NZeTA 这条。只在澳大利亚转机不能用。试点从 2025-11-03 起 12 个月，2 月 21 日已经落在原窗口外面，页面没有写 2027 年 2 月还算不算。没有 NZeTA 或访客签证，航空公司可以不让上飞机。NZeTA 不保证放行，放行后边境给最长 3 个月的访客签证。 https://www.immigration.govt.nz/visit/what-you-need-to-visit-new-zealand/chinese-and-pacific-island-visitors-travelling-from-australia/',
  },
  {
    id: 'n8',
    chapter: '入境新西兰',
    title: '要有已付款的离境票',
    strict: true,
    body: '护照在计划离开后再有效至少 3 个月，3 月 1 日离开就要到 2027-06-01。值机要能出示已付款的离境机票，目的地是本人有权进入的国家，离开日在抵达后 3 个月内。回程现在还不是 3 月 1 日的订单。没有这张票，2 月 21 日可能上不了飞新西兰的飞机。',
  },
  {
    id: 'n9',
    chapter: '入境新西兰',
    title: '生活费和担保人',
    strict: true,
    body: '每人每月至少 1000 纽元；住宿已经付清则 400 纽元。可以是银行或信用卡对账单、住宿预付凭证。需要担保人付钱的，不能走 NZeTA，要事先办访客签证。医疗费用自理。照片不要用 AI 修改。NZeTA 每人 17 纽元（官方 App）或 23 纽元（网站），另加 100 纽元游客税，至少提前 72 小时。',
  },
  {
    id: 'n10',
    chapter: '入境新西兰',
    title: '旅客申报只走官网',
    strict: true,
    body: '2 月 20 日晚上在凯恩斯填，每人一份。最早是起飞前 24 小时，最晚到奥克兰护照检查之前。免费，和护照绑在一起，不用打印。第三方收费网站不要用。3:00 的出租车上不要现填。 https://www.travellerdeclaration.govt.nz/',
  },
  {
    id: 'n11',
    chapter: '入境新西兰',
    title: '入境在奥克兰，不在基督城',
    strict: true,
    body: '奥克兰先入境，再转国内航班去基督城，衔接大约 1 小时 35 分。中国电子护照、年满 10 岁、旅客申报已交，可以用 eGate。 https://www.customs.govt.nz/travel-to-and-from-new-zealand/travel-by-air/egate',
  },
  {
    id: 'n12',
    chapter: '入境新西兰',
    title: '不申报可以罚 400 纽元',
    strict: true,
    body: '食品、蜂蜜、肉、蛋、种子、木制品，以及穿过的户外鞋和徒步装备，申报里选 Yes。飞机上发的食物留在飞机上。塔斯马尼亚和凯恩斯穿过的鞋，洗干净再申报。2 月 22 日在基督城买的食品是入境之后的，可以上车。现金或等值达到 1 万纽元，填 Border Cash Report。 https://www.mpi.govt.nz/bring-send-to-nz/bringing-and-posting-items-to-nz/travelling-to-new-zealand',
  },
  {
    id: 'n13',
    chapter: '签证',
    title: '澳大利亚 600',
    strict: false,
    body: '中国护照走访客签证 600 旅游流向，ImmiAccount 在线交，4 人各一份。不能用 ETA（601）或 eVisitor（651）。普通旅游流向先在线交；生物识别是十年多次签才必须去采集点，大陆采集点写的是香港。中国不在 Australian Immi App 的国家名单里。收费以递交当天的估价器为准。行程里的 150 澳元已经对不上；转述写境外每人 250 澳元，这次没有从内政部正文读出这个数字。 https://immi.homeaffairs.gov.au/visas/visa-pricing-estimator?visa=600',
  },
  {
    id: 'n14',
    chapter: '签证',
    title: '护照有效期',
    strict: false,
    body: '澳大利亚只要盖住停留，不要求再留 6 个月。新西兰要求离开后再有效至少 3 个月，所以到 2027-06-01。申请护照和登机护照是同一本。',
  },
  {
    id: 'n15',
    chapter: '断点',
    title: '2 月 21 日没有后一班',
    strict: false,
    body: '拆成三张票要在布里斯班和奥克兰重新托运。布里斯班衔接约 2 小时 55 分，奥克兰约 1 小时 35 分。误了 NZ567，当晚到不了 Lylo，2 月 23 日取车一起往后推。100 路潟湖首班 4:00，赶不上 3:00 到机场。凯恩斯 2 月在气旋季（11 月 1 日到 4 月 30 日）。出海可以改到 2 月 19 日。古堡和早班没有替补日。',
  },
  {
    id: 'n16',
    chapter: '断点',
    title: '广州衔接和春节',
    strict: false,
    body: '卡片写中转 2 小时 20 分，公开时刻差 10 分钟。法定假日是除夕到初三（2 月 5–8 日）。国务院 2027 年放假通知还没出。2 月 9 日是初四，返程人流仍可能压在广州。',
  },
  {
    id: 'n17',
    chapter: '断点',
    title: '米尔福德没有后一天',
    strict: false,
    body: '飞猪这档写平均确认约 4 小时 18 分、成功率 50%，工作时间内 56 小时以外才免费退改。RealNZ 官网写提前 24 小时可改可退，飞—船—飞 4 到 5 小时。以确认函为准。落地晚于 17:29，车还在手上，3 月 1 日 15:05 仍要走。免费接驳只到航站楼。3 月 1 日要 12:05 前到航站楼。',
  },
  {
    id: 'n18',
    chapter: '断点',
    title: '还不是订单',
    strict: false,
    body: '塔斯曼（2 月 15 日早上就要飞）、米尔福德、2 月 21 日联程没有替补日。澳大利亚四家公寓、Lylo、奥兰季、阿尔卑斯交会镇、松木、回程航班也还不是订单。Lylo 限中国证件，24 小时前台，最早 15:00 入住，不收现金。2 月 21 日 20:25 到赶得上。',
  },
  {
    id: 'n19',
    chapter: '租车',
    title: '官网五步',
    strict: false,
    body: '中文页 https://www.apexrentals.co.nz/zh-cn/reservations 。国家选新西兰，取车基督城机场，还车皇后镇机场。不要选「基督城市」。时间 15 分钟一档，取还都放在营业时间内。然后是选车、附加项、联系人、付款。异地还不加费。事先没同意就改还车地，可以加到 2000 纽元。',
  },
  {
    id: 'n20',
    chapter: '租车',
    title: '付款卡和免赔',
    strict: false,
    body: '主承租人本人的实体卡：签证、万事达、美国运通、银联或银联国际信用卡，或银行发的签证/万事达借记卡。支付宝、现金、虚拟卡不行。取车时必须出示下单的那张卡，柜台不换卡。银联被拒就停在付款步，换本人的签证或万事达重付。英文页写新西兰有限减免降到 1000 纽元，中文页写 500，以页面数字为准。提前还车不退款。',
  },
  {
    id: 'n21',
    chapter: '租车',
    title: '取车和还车',
    strict: false,
    body: '2 月 23 日走到航站楼，邮件里点 Ready to Collect，或打 0800 400 121。1 号或 2 号门出去，粉色 Park and Ride 右边等，到 28 Ron Guthrey Road，营业到 18:29。还车在皇后镇 32 Lucas Place，营业到 17:29。还车前加到取车时的同一格油。行驶少于 120 公里，没有加油小票会按公里收加油服务费。',
  },
  {
    id: 'n22',
    chapter: '驾照',
    title: '办公证，不办国际驾照',
    strict: false,
    body: '中国当时未加入 1968 年维也纳公约，境内没有签发国际驾驶许可的机关。NZTA 接受中国公证处的英文翻译。Apex 常见问题没列公证处，下单前用邮件确认。交通局没有要求再办附加证明书。正页和副页都译，使用地填新西兰。每个司机一份。12123 截图不能取车。',
  },
  {
    id: 'n23',
    chapter: '驾照',
    title: '左边开车',
    strict: false,
    body: '满 21 岁，正式执照。实习期先问邮件。副司机不加价，取车时必须在场。柜台可能先做左侧通行问卷再试开，认定开不了会终止合同并退租金。无信号路口让右侧来车。环岛让已在岛上的车。开车的人当天不喝酒，血液酒精上限 50 毫克/100 毫升。',
  },
  {
    id: 'n24',
    chapter: '行李',
    title: '捷星只含座下包',
    strict: false,
    body: '2 月 12、15、17 日都在 2027-02-02 之后。经济舱只含一件座下包，40×30×20 厘米。Starter 不含托运。机场现买第一件 20 公斤是 120 澳元一个人、一段。这三班还不是订单，不会自动带上免费头顶箱。订票时给每人每段加上托运。',
  },
  {
    id: 'n25',
    chapter: '行李',
    title: '液体和手提',
    strict: false,
    body: '国际段手提液体每件不超过 100 毫升，放进可封口透明袋。澳大利亚国内段不按这条。3 月 1 日从皇后镇出境再按 100 毫升。系带包头鞋、处方药、晕船药放进飞基督城的手提行李。',
  },
  {
    id: 'n26',
    chapter: '紧急',
    title: '电话',
    strict: false,
    body: '澳大利亚遇险 000，可要求中文；非紧急 131444。悉尼领保 +61-2-95505519，只覆盖新南威尔士。新西兰遇险 111，说 Chinese 或 Mandarin。奥克兰领保 +64-9-5251200，南岛领区出发前再对一次。外交部 24 小时 +86-10-12308 或 +86-10-65612308。护照丢了先报警拿回执。',
  },
  {
    id: 'n27',
    chapter: '健康',
    title: '药',
    strict: false,
    body: '处方药给自己或同行直系亲属，不超过 3 个月，原包装，英文医生信，放手提。口服避孕药在新西兰可以 6 个月。管制药品在新西兰最多 1 个月，必须申报。散装中草药、茶叶、枸杞不塞进行李。',
  },
  {
    id: 'n28',
    chapter: '天气',
    title: '2 月大概多热',
    strict: false,
    body: '过去五年 2 月 9–28 日的再分析，不是 2027 年预报。墨尔本 26/15，霍巴特 23/13，悉尼 26/19，凯恩斯 31/24（大约 7 天有雨），基督城 20/13，皇后镇 21/11，蒂卡波 18/8，清晨可以到 5°。一件抓绒、一件防水外壳。不带羽绒服。',
  },
  {
    id: 'n29',
    chapter: '天气',
    title: '防晒',
    strict: false,
    body: '紫外线指数到 3 就用 SPF50 或 50+、广谱、防水，出门前 20 分钟涂，两小时和游泳后再补，加宽檐帽和墨镜。2 月是水母季，海滩不靠防蜇网不要下水。',
  },
  {
    id: 'n30',
    chapter: '钱和通讯',
    title: '卡和现金',
    strict: false,
    body: '终端和取款机选当地货币。基督城公交从 2026-11-23 起停用现金和 Metrocard，2 月 22 日每人一张非接触签证或万事达。银联能不能拍卡，这次没查到。',
  },
  {
    id: 'n31',
    chapter: '钱和通讯',
    title: '插头和电话',
    strict: false,
    body: '插座是 I 型，两只扁脚呈倒 V，230 伏。中国两脚平行扁插头插不进。充电器写 100–240 伏就不用变压器。只有流量的 eSIM 不够，订车、跳伞、凌晨出租车都要能打电话。林迪斯山口和皇冠山脉会断信号，离开基督城前下好南岛离线地图。',
  },
];

const SEED_PACKS: PackItem[] = [
  { id: 'p1', group: '证件', text: '护照原件，有效期到 2027-06-01 以后', packed: false },
  { id: 'p2', group: '证件', text: '澳大利亚 600 准签信，纸质一份、云端一份', packed: false },
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
  { id: 'p19', group: '其余', text: '处方药原包装、英文医生信；晕船药', packed: false },
  { id: 'p20', group: '其余', text: '南岛离线地图，以及一个能打电话的号码', packed: false },
  { id: 'p21', group: '不带', text: '公约国际驾照小册子', packed: false },
  { id: 'p22', group: '不带', text: '新鲜水果、蔬菜、肉、奶、种子', packed: false },
  { id: 'p23', group: '不带', text: '散装中草药、茶叶、枸杞', packed: false },
  { id: 'p24', group: '不带', text: '从成都带的瓶装水和零食。蜂蜜若要带，进澳大利亚时申报', packed: false },
  { id: 'p25', group: '不带', text: '带土的鞋。进墨尔本前洗净；飞新西兰前再洗净，并在旅客申报里申报穿过的户外鞋', packed: false },
];

const KEY: Record<PrepKind, string> = {
  todo: 'anz-prep-todo-v1',
  note: 'anz-prep-note-v1',
  pack: 'anz-prep-pack-v1',
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

const loadedTodo = readList(KEY.todo, cloneTodos(), asTodo);
const loadedNote = readList(KEY.note, cloneNotes(), asNote);
const loadedPack = readList(KEY.pack, clonePacks(), asPack);

let todos = loadedTodo.items;
let notes = loadedNote.items;
let packs = loadedPack.items;
let storageOk = loadedTodo.ok && loadedNote.ok && loadedPack.ok;
let snapshot = { todos, notes, packs, storageOk };
const listeners = new Set<() => void>();

function emit(): void {
  snapshot = { todos, notes, packs, storageOk };
  listeners.forEach((listener) => listener());
}

function writeKind(kind: PrepKind): void {
  const value = kind === 'todo' ? todos : kind === 'note' ? notes : packs;
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
};

export function orderedGroups(present: string[], preferred: readonly string[]): string[] {
  const rest = present.filter((name) => !preferred.includes(name));
  return [...preferred.filter((name) => present.includes(name)), ...rest];
}
