export const yuan = (n: number) =>
  n.toLocaleString("zh-CN", { maximumFractionDigits: 0 })

export const total = 125_016
export const paid = 9_988
export const quotedUnpaid = total - paid

export const expenseBars = [
  { name: "酒店", yuan: 65_580 },
  { name: "造景", yuan: 21_500 },
  { name: "白酒", yuan: 18_000 },
  { name: "妆造礼服", yuan: 9_188 },
  { name: "摄影拍照", yuan: 3_568 },
  { name: "住宿", yuan: 2_960 },
  { name: "喜糖", yuan: 1_800 },
  { name: "香烟", yuan: 1_800 },
  { name: "发出红包", yuan: 620 },
]

export const tableCompare = [
  { name: "15 桌", value: 112_021 },
  { name: "20 桌", value: 112_021, extra: 12_995 },
]

export type CallSeat = {
  who: string
  act: string
  tone: string
  notes?: string[]
}

export type CallMusic = {
  key: "dusk" | "entrance" | "river" | "better"
  title: string
}

export type CallNode = {
  id: string
  part: string
  time: string
  until?: string
  title: string
  place: string
  note?: string
  music?: CallMusic
  watch?: string[]
  seats: CallSeat[]
  inferred?: boolean
  lock?: boolean
  speak?: { who: string; tone: string; act: string }[]
}

export type PrepItem = {
  name: string
  note: string
}

export type PersonConfirm = {
  name: string
  tone: string
  time: string
  place: string
  by: string
  phone?: string
  inferred?: boolean
  note: string
}

export const callNodes: CallNode[] = [
  {
    id: "eve-pack",
    part: "前一天",
    time: "上午",
    title: "搬东西到酒店",
    place: "交子国际酒店",
    note: "出门前把誓词卡写完。到酒店先对套房钥匙和行李暂放点。",
    watch: [
      "戒盒、誓词卡、切歌遥控器单独清点，不混进大箱。",
      "上台戒进绒盒，备用戒分袋。烟和抽奖喜字先别交经理，傍晚再交。",
    ],
    seats: [
      { who: "新郎", tone: "groom", act: "装箱、开车", notes: ["喜糖、伴手礼、烟、红包、刮刮乐、装饰、喜字。", "充电宝充满电。"] },
      { who: "新娘", tone: "bride", act: "装箱", notes: ["衣物、鞋、胸贴、防走光贴、防磨脚贴、美瞳、面膜、收腹裤、皮带、刮胡刀。", "誓词卡字写完再放。"] },
    ],
  },
  {
    id: "eve-rehearse",
    part: "前一天",
    time: "下午",
    title: "彩排、调音、走流程",
    place: "天府雅韵厅",
    note: "话筒调试 ×3。和曾沛豪、李宗达把台上段走通。",
    watch: [
      "确认各曲能切到：日落黄昏 → 共同入场 → River Flows in You → Better Man。",
      "戒盒空演一次：上台、开盒、空盒带下台。",
    ],
    seats: [
      { who: "曾沛豪", tone: "zeng", act: "走流程", notes: ["试自己那支麦。", "戒盒、誓词卡在他手上练一次。"] },
      { who: "李宗达", tone: "li", act: "切歌、调音", notes: ["遥控器在他手上。", "三刀点位走一遍。"] },
      { who: "新郎", tone: "groom", act: "彩排", notes: ["试麦。"] },
      { who: "新娘", tone: "bride", act: "彩排", notes: ["试麦。"] },
    ],
  },
  {
    id: "eve-xin",
    part: "前一天",
    time: "下午",
    title: "确认布景，对接辛家",
    place: "宴会厅",
    seats: [
      { who: "辛家婚礼", tone: "xin", act: "布景就位", notes: ["缺件当场记，不隔夜。"] },
      { who: "新郎", tone: "groom", act: "对接", notes: ["问清摆盘、喜字位置。"] },
    ],
  },
  {
    id: "eve-vendors",
    part: "前一天",
    time: "下午",
    title: "妆造、拍摄、拍照机、白酒对接",
    place: "酒店 / 微信",
    note: "分头打电话或当面确认，四点都对过话再接人。",
    seats: [
      { who: "林夕", tone: "linxi", act: "确认到场", notes: ["问带几个人。", "新郎 6:30 与新娘第一套怎么排。"] },
      { who: "夏天", tone: "summer", act: "确认到场", notes: ["告诉他到哪间套房。", "车费我们出。"] },
      { who: "胡勤煜", tone: "hu", act: "确认进场", notes: ["7:40 进、9:40 开、11:40 收。", "外区与空镜重叠的 40 分钟停不停。"] },
      { who: "白酒", tone: "baijiu", act: "确认到位", notes: ["箱数、开箱位置、谁签字。"] },
    ],
  },
  {
    id: "eve-checkin",
    part: "前一天",
    time: "下午",
    title: "接朋友亲戚，办理入住",
    place: "酒店前台",
    note: "共 8 间：朋友 ×5、女方亲戚 ×2、男方父母 ×1。新人房另计。",
    seats: [
      { who: "新郎", tone: "groom", act: "接人、办入住", notes: ["房号发到群。"] },
      { who: "朋友", tone: "guest", act: "入住", notes: ["5 间。"] },
      { who: "女方亲戚", tone: "momw", act: "入住", notes: ["2 间。"] },
      { who: "男方父母", tone: "parents", act: "入住", notes: ["1 间。"] },
    ],
  },
  {
    id: "eve-dress",
    part: "前一天",
    time: "下午",
    title: "取婚纱、西服",
    place: "念念婚纱",
    note: "必须两人一起去，要试衣服。",
    watch: ["对上敬茶服、迎宾纱、主婚纱各是哪一件。", "当晚放进套房或婚房。"],
    seats: [
      { who: "新娘", tone: "bride", act: "试穿取件" },
      { who: "新郎", tone: "groom", act: "试穿取件" },
    ],
  },
  {
    id: "eve-shop",
    part: "前一天",
    time: "下午",
    title: "买水果、葡萄汁；烟与喜字交经理",
    place: "超市 → 酒店",
    note: "棋牌茶坊砂糖橘，签到台阳光玫瑰，敬酒用葡萄汁。",
    seats: [
      { who: "新郎", tone: "groom", act: "采购、交接", notes: ["烟、抽奖喜字当面点清交给经理，给第二天摆盘。", "水果和葡萄汁放到约定位置。"] },
    ],
  },
  {
    id: "eve-dinner",
    part: "前一天",
    time: "晚上",
    title: "鱼火锅、大魔方晚饭",
    place: "鱼火锅；大魔方",
    note: "桌 1、桌 2 在鱼火锅；女方家里 4 人在大魔方。",
    watch: [
      "新娘当晚洗头吹干，不上护发素。",
      "回房再确认：林夕、夏天到场信息；5:00 闹钟。",
    ],
    seats: [
      {
        who: "桌1",
        tone: "huang",
        act: "鱼火锅",
        notes: ["黄钰皓、熊梦佳、唐东阳、熊书婷、李宗达、朱艳玲、曾沛豪、龚玥。"],
      },
      {
        who: "桌2",
        tone: "guest",
        act: "鱼火锅",
        notes: ["杨济涛、李鑫泷；任泓竹、李佳璇、刘喜瑞；许尔斌、廖楷弟。"],
      },
      { who: "桌3", tone: "momw", act: "大魔方", notes: ["女方家里 4 人。"] },
    ],
  },
  {
    id: "wake",
    part: "仪式前",
    time: "5:00",
    until: "5:30",
    title: "新娘起床",
    place: "套房",
    seats: [
      { who: "新娘", tone: "bride", act: "起床吃饭", notes: ["洗漱、早饭、敷面膜。", "这 30 分钟用来吃饭，洗漱、敷面膜。"] },
      { who: "新郎", tone: "groom", act: "起床", notes: ["洗漱、早饭、敷面膜。", "6:30 才开始化妆。"] },
    ],
  },
  {
    id: "tea-dress",
    part: "仪式前",
    time: "5:30",
    until: "8:00",
    title: "敬茶服",
    place: "套房",
    note: "钥匙要在 5:30 前能开。",
    seats: [
      { who: "林夕", tone: "linxi", act: "做敬茶服", notes: ["这套是新中式，8:00 收妆。", "脖子和肩膀的粉底要打上。"] },
      { who: "新娘", tone: "bride", act: "化妆", notes: ["化妆间用吸管喝水。", "8:05 才拍照，中间 5 分钟休整时间。"] },
    ],
  },
  {
    id: "photo-in",
    part: "仪式前",
    time: "6:00",
    until: "6:15",
    title: "夏天到",
    place: "套房",
    inferred: true,
    seats: [
      { who: "夏天", tone: "summer", act: "到套房", notes: ["合同是 6:00 到 13:30。", "超时按 200 元一小时。", "车费我们出。"] },
      { who: "新娘", tone: "bride", act: "负责联系", notes: ["告诉他到哪。", "人没到就打 15928125194。"] },
    ],
  },
  {
    id: "groom-makeup",
    part: "仪式前",
    time: "6:30",
    until: "7:00",
    title: "新郎化妆",
    place: "套房",
    seats: [
      { who: "林夕", tone: "linxi", act: "给新郎化妆", notes: ["和给新娘做的第一套撞在一起。", "一个人做不完。", "新娘负责联系她确认。"] },
      { who: "新郎", tone: "groom", act: "化妆", notes: ["7:00 到 7:30 他有空。"] },
    ],
  },
  {
    id: "mom-1",
    part: "仪式前",
    time: "7:00",
    until: "7:30",
    title: "第一位妈妈化妆",
    place: "套房",
    seats: [
      { who: "林夕", tone: "linxi", act: "给母亲化妆" },
      { who: "女方母亲", tone: "momw", act: "化妆" },
      { who: "男方母亲", tone: "momm", act: "化妆" },
      { who: "新郎父亲", tone: "dad", act: "不化妆" },
    ],
  },
  {
    id: "mom-2",
    part: "仪式前",
    time: "7:30",
    until: "8:00",
    title: "第二位妈妈化妆",
    place: "套房",
    seats: [
      { who: "林夕", tone: "linxi", act: "给另一位母亲化妆", notes: ["和下一档抢同一间化妆间。", "过了 8:00 就把镜子让出来。"] },
    ],
  },
  {
    id: "groom-photo",
    part: "仪式前",
    time: "7:30",
    until: "8:00",
    title: "新郎拍照",
    place: "套房；镜子没让出来就到套房外",
    seats: [
      { who: "夏天", tone: "summer", act: "拍新郎", notes: ["镜子没让出来就改到套房外。"] },
      { who: "新郎", tone: "groom", act: "拍照", notes: ["8:05 新娘拍照不往后推。"] },
    ],
  },
  {
    id: "booth-in",
    part: "仪式前",
    time: "7:40",
    until: "7:55",
    title: "拍照机进场",
    place: "宴会厅外",
    inferred: true,
    seats: [
      { who: "胡勤煜", tone: "hu", act: "带机器进场", notes: ["机器是国皓智胜的。", "电话 15982158784。", "", ""] },
    ],
  },
  {
    id: "parents",
    part: "仪式前",
    time: "8:00",
    until: "8:30",
    title: "父母到，姐姐泡茶",
    place: "套房",
    seats: [
      { who: "花姐", tone: "hua", act: "在场" },
      { who: "新娘姐姐", tone: "sister", act: "泡茶", notes: ["茶和改口红包准备好。"] },
      { who: "新郎父亲", tone: "dad", act: "这个点到", notes: [] },
      { who: "女方母亲", tone: "momw", act: "在场" },
      { who: "男方母亲", tone: "momm", act: "在场" },
    ],
  },
  {
    id: "bride-photo",
    part: "仪式前",
    time: "8:05",
    until: "8:25",
    title: "新娘拍照",
    place: "套房",
    seats: [
      { who: "夏天", tone: "summer", act: "拍敬茶服" },
      { who: "新娘", tone: "bride", act: "拍照", notes: ["身上还是敬茶服。"] },
    ],
  },
  {
    id: "tea",
    part: "仪式前",
    time: "8:30",
    until: "8:35",
    title: "改口茶，全家福",
    place: "套房",
    note: "端茶在花姐和新娘姐姐里出一个。",
    seats: [
      { who: "辛家婚礼", tone: "xin", act: "主持" },
      { who: "花姐", tone: "hua", act: "端茶", notes: ["和姐姐里出一个。不主持。"] },
      { who: "新娘姐姐", tone: "sister", act: "端茶", notes: ["和花姐里出一个。不主持。"] },
      { who: "新娘", tone: "bride", act: "坐着递" },
      { who: "新郎", tone: "groom", act: "坐着递" },
      { who: "女方母亲", tone: "momw", act: "喝第一杯" },
      { who: "男方母亲", tone: "momm", act: "喝第二杯" },
      { who: "新郎父亲", tone: "dad", act: "喝第三杯" },
      { who: "夏天", tone: "summer", act: "拍照", notes: ["这场必须拍到。"] },
      { who: "黄钰皓", tone: "huang", act: "到套房录像", notes: ["自己带 pocket。"] },
      { who: "唐东阳", tone: "tang", act: "到套房录像", notes: ["自己带 pocket。"] },
    ],
  },
  {
    id: "veil",
    part: "仪式前",
    time: "8:40",
    until: "9:20",
    title: "换迎宾纱",
    place: "婚房",
    seats: [
      { who: "林夕", tone: "linxi", act: "换迎宾纱", notes: ["超时就压缩 9:20 的拍照。", "10:05 换主婚纱不推迟。"] },
      { who: "新娘", tone: "bride", act: "换迎宾纱" },
    ],
  },
  {
    id: "welcome",
    part: "仪式前",
    time: "9:20",
    until: "10:00",
    title: "迎宾区拍照",
    place: "迎宾区",
    note: "",
    seats: [
      { who: "夏天", tone: "summer", act: "拍迎宾" },
      { who: "新娘", tone: "bride", act: "穿迎宾纱" },
      { who: "新郎", tone: "groom", act: "一起拍" },
      { who: "黄钰皓", tone: "huang", act: "跟拍" },
      { who: "唐东阳", tone: "tang", act: "跟拍" },
    ],
  },
  {
    id: "booth-open",
    part: "仪式前",
    time: "9:40",
    until: "11:40",
    title: "拍照机开放",
    place: "宴会厅外",
    seats: [
      { who: "国皓智胜", tone: "booth", act: "外区开着", notes: ["11:40 收机器收。", "延时按 400 元一小时。"] },
    ],
  },
  {
    id: "gown",
    part: "仪式前",
    time: "10:05",
    until: "10:45",
    title: "换主婚纱",
    place: "婚房",
    seats: [
      { who: "林夕", tone: "linxi", act: "换主婚纱", notes: ["超时了就压缩 10:50 的空镜。", "11:30 新娘休息不往后推。"] },
      { who: "新娘", tone: "bride", act: "换主婚纱", notes: ["10:45 走到宴会厅。", "这一套穿到仪式结束。"] },
    ],
  },
  {
    id: "sign",
    part: "仪式前",
    time: "10:30",
    until: "11:30",
    title: "宾客签到",
    place: "宴会厅外，茶水间",
    inferred: true,
    note: "椅子由辛家婚礼负责。暖场《茹俊龙 - 日落黄昏》从签到放到两人走 T 台。",
    seats: [
      { who: "新郎", tone: "groom", act: "在签到台", notes: ["礼金放进背包。", "发伴手礼、喜糖和烟。", "告诉客人桌号，领进茶水间。"] },
      { who: "新郎父亲", tone: "dad", act: "签到", notes: [] },
      { who: "新郎母亲", tone: "momm", act: "签到", notes: [] },
      { who: "新娘", tone: "bride", act: "留在婚房", notes: ["正在换主婚纱，不叫下来。"] },
    ],
  },
  {
    id: "empty",
    part: "仪式前",
    time: "10:50",
    until: "11:30",
    title: "空镜",
    place: "宴会厅",
    seats: [
      { who: "夏天", tone: "summer", act: "拍空镜", notes: ["这段时间厅里不接待客人。", "厅要是没清出来，这段就缩短。"] },
      { who: "新娘", tone: "bride", act: "穿主婚纱", notes: ["11:30 还是去三楼化妆间。"] },
      { who: "黄钰皓", tone: "huang", act: "进宴会厅", notes: ["至少有一台进去。"] },
      { who: "唐东阳", tone: "tang", act: "进宴会厅", notes: ["至少有一台进去。"] },
      { who: "国皓智胜", tone: "booth", act: "在迎宾区布置机器", notes: [] },
    ],
  },
  {
    id: "rest",
    part: "仪式前",
    time: "11:30",
    until: "11:50",
    title: "新娘休息",
    place: "三楼化妆间",
    seats: [
      { who: "新娘", tone: "bride", act: "休息", notes: ["这 20 分钟不拿来再换一套。"] },
    ],
  },
  {
    id: "seat",
    part: "仪式前",
    time: "11:30",
    until: "11:50",
    title: "宾客入席",
    place: "宴会厅",
    note: "单子上写了 30 分钟。人没坐完，11:58 也开场。",
    seats: [
      { who: "新郎", tone: "groom", act: "领入席", notes: ["从签到台领到午宴桌。", "11:50 停止领座。"] },
      { who: "新郎父亲", tone: "dad", act: "领入席", notes: ["11:50 停止领座。"] },
      { who: "新郎母亲", tone: "momm", act: "领入席", notes: ["11:50 停止领座。"] },
    ],
  },
  {
    id: "ring",
    part: "仪式前",
    time: "11:40",
    until: "11:50",
    title: "戒盒放好",
    place: "曾沛豪口袋",
    seats: [
      { who: "曾沛豪", tone: "zeng", act: "放戒盒", notes: ["里面只放上台那一枚。", "不要一早就揣着。", "11:50 进厅前再摸一次。", "西装他自己有。", "备用的那一枚不要放进同一个口袋。", "两张誓词卡也在他手上，不交给新人。"] },
    ],
  },
  {
    id: "hold",
    part: "仪式前",
    time: "11:50",
    until: "11:58",
    title: "候场",
    place: "宴会厅",
    note: "",
    seats: [
      { who: "新郎", tone: "groom", act: "负责这一段", notes: ["试自己那支麦。", "仪式前手机静音。"] },
      { who: "新娘", tone: "bride", act: "候场", notes: ["试自己那支麦。"] },
      { who: "曾沛豪", tone: "zeng", act: "拿誓词卡、戒盒", notes: ["试自己那支麦。"] },
      { who: "李宗达", tone: "li", act: "拿切歌遥控器", notes: ["站到过道一边。", "切歌归他。"] },
    ],
  },
  {
    id: "call",
    part: "正式仪式",
    time: "11:53",
    until: "11:58",
    title: "喊入座",
    place: "台侧",
    speak: [{ who: "曾沛豪", tone: "zeng", act: "热场示意入座" }],
    music: { key: "dusk", title: "茹俊龙 · 日落黄昏" },
    note: "暖场，沿用签到起的吉他曲。正式开始仍放这首，走 T 台再切。",
    seats: [
      { who: "曾沛豪", tone: "zeng", act: "喊入座", notes: ["不上台。", "只喊一句。", "暖场不用停。", "这一声不能代替刚才的领座。", "没喊到的人，11:58 照样走。"] },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像", notes: [""] },
      { who: "唐东阳", tone: "tang", act: "全程录像", notes: [""] },
    ],
  },
  {
    id: "twalk",
    part: "正式仪式",
    time: "11:58",
    until: "12:00",
    title: "走 T 台",
    place: "台上，过道",
    note: "约 2 分钟。李宗达手动切歌，从暖场切到《共同入场》。",
    music: { key: "entrance", title: "共同入场" },
    speak: [{ who: "曾沛豪", tone: "zeng", act: "示意新人入场" }],
    lock: true,
    seats: [
      { who: "新娘", tone: "bride", act: "上台" },
      { who: "新郎", tone: "groom", act: "走 T 台" },
      { who: "李宗达", tone: "li", act: "手动切歌", notes: ["从《日落黄昏》切到《共同入场》。", "这首放到念誓词再切。", "开走之前站好。"] },
      { who: "新郎父母", tone: "parents", act: "开门", notes: ["开门之前站好。"] },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
    ],
  },
  {
    id: "vow-g",
    part: "正式仪式",
    time: "12:00",
    until: "12:02",
    title: "新郎誓词",
    place: "台上",
    speak: [{ who: "新郎", tone: "groom", act: "演讲" }],
    music: { key: "river", title: "River Flows in You" },
    note: "沿用誓词这首，不另切。",
    seats: [
      { who: "新郎", tone: "groom", act: "念誓词", notes: ["先对全场说，最后转向杜章锦，结尾是「谢谢大家」。", "大约 2 分半。", "念的时候不垫大音乐。", "卡在曾沛豪手上，这段先照着稿念。", "念完再介绍曾沛豪。"] },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
      { who: "氛围组", tone: "guest", act: "欢呼、掌声" },
    ],
  },
  {
    id: "vow-b",
    part: "正式仪式",
    time: "12:02",
    until: "12:04:30",
    title: "新娘誓词",
    place: "台上",
    speak: [{ who: "新娘", tone: "bride", act: "演讲" }],
    music: { key: "river", title: "River Flows in You" },
    note: "李宗达切到这首。誓词段不垫大音量。",
    seats: [
      { who: "新娘", tone: "bride", act: "念誓词", notes: ["对着新郎说。", "大约 2 分钟。"] },
      { who: "李宗达", tone: "li", act: "手动切歌", notes: ["从《共同入场》切到这首。", "放到互相戴戒指再切。"] },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
      { who: "氛围组", tone: "guest", act: "欢呼、掌声" },
    ],
  },
  {
    id: "rings",
    part: "正式仪式",
    time: "12:04:30",
    until: "12:05:30",
    title: "送戒",
    place: "台上",
    music: { key: "river", title: "River Flows in You" },
    note: "誓词这首放到这里。互相戴戒指再切。",
    speak: [{ who: "新郎", tone: "groom", act: "介绍曾沛豪上台" }],
    seats: [
      { who: "新郎", tone: "groom", act: "先介绍，再取戒" },
      { who: "曾沛豪", tone: "zeng", act: "送戒、交卡", notes: ["把盒子打开。", "空盒他带下台。", "在台上不讲话。", "大约 1 分钟。", "戒盒要是不在身上，这一步没有第二遍。"] },
      { who: "新娘", tone: "bride", act: "取戒" },
      { who: "夏天", tone: "summer", act: "全程拍照", notes: ["一台相机。要是错过取盒，没有第二遍。"] },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
      { who: "氛围组", tone: "guest", act: "欢呼、掌声" },
    ],
  },
  {
    id: "wear",
    part: "正式仪式",
    time: "12:05:30",
    until: "12:06:30",
    title: "互相戴戒指",
    place: "台上",
    speak: [{ who: "新郎新娘", tone: "groom, bride", act: "互相戴戒指" }],
    music: { key: "better", title: "Robbie Williams · Better Man" },
    note: "大约 1 分钟。酒店做不到定点光，就不加。李宗达在曾沛豪下台后切到这首。",
    seats: [
      { who: "新郎", tone: "groom", act: "先给新娘戴", notes: ["等曾沛豪下台，再开口。"] },
      { who: "新娘", tone: "bride", act: "再给新郎戴" },
      { who: "李宗达", tone: "li", act: "手动切歌", notes: ["切到 Better Man。"] },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
      { who: "氛围组", tone: "guest", act: "欢呼、掌声" },
    ],
  },
  {
    id: "cheer",
    part: "正式仪式",
    time: "12:06:30",
    until: "12:10",
    title: "欢呼、掌声、音乐",
    place: "台上，曾沛豪在台下",
    inferred: true,
    music: { key: "better", title: "Robbie Williams · Better Man" },
    note: "沿用戴戒指这首，不用再切。",
    seats: [
      { who: "曾沛豪", tone: "zeng", act: "示意氛围组", notes: ["示意欢呼、掌声一起起。"] },
      { who: "氛围组", tone: "guest", act: "欢呼、掌声" },
      { who: "新娘", tone: "bride", act: "不切音乐" },
      { who: "新郎", tone: "groom", act: "不切音乐" },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "全程录像" },
      { who: "唐东阳", tone: "tang", act: "全程录像" },
    ],
  },
  {
    id: "prize",
    part: "正式仪式",
    time: "12:10",
    until: "12:16",
    title: "看盘底，兑奖",
    place: "台上",
    speak: [
      { who: "新娘", tone: "bride", act: "发言让客人看盘底，台上兑奖" },
      { who: "新郎", tone: "groom", act: "一起发奖" },
    ],
    inferred: true,
    music: { key: "better", title: "Robbie Williams · Better Man" },
    note: "先兑奖，再合照。奖品我们自己在台上发。",
    seats: [
      { who: "新娘", tone: "bride", act: "说看盘底、发奖", notes: ["欢呼过后先做这一段。", "不点客人的名。", "我们自己发。"] },
      { who: "新郎", tone: "groom", act: "一起发奖" },
      { who: "夏天", tone: "summer", act: "全程拍照" },
    ],
  },
  {
    id: "photo-all",
    part: "正式仪式",
    time: "12:16",
    until: "12:22",
    title: "合照",
    place: "台上",
    inferred: true,
    speak: [
      { who: "新娘", tone: "bride", act: "示意合照" },
      { who: "新郎", tone: "groom", act: "示意合照" },
    ],
    music: { key: "better", title: "Robbie Williams · Better Man" },
    note: "兑奖结束后再合照。音乐沿用 Better Man。",
    seats: [
      { who: "新娘", tone: "bride", act: "请大家上台", notes: ["人往台上走会拖时间。", "超时了就先少拍。"] },
      { who: "新郎", tone: "groom", act: "示意合照" },
      { who: "夏天", tone: "summer", act: "全程拍照" },
      { who: "黄钰皓", tone: "huang", act: "上台合影" },
      { who: "唐东阳", tone: "tang", act: "上台合影" },
      { who: "氛围组", tone: "guest", act: "上台合影" },
    ],
  },
  {
    id: "thanks",
    part: "正式仪式",
    time: "12:22",
    until: "12:23",
    title: "谢谢大家",
    place: "台上",
    music: { key: "better", title: "Robbie Williams · Better Man" },
    note: "仪式收束，仍放 Better Man。",
    speak: [
      { who: "新娘", tone: "bride", act: "谢谢大家" },
      { who: "新郎", tone: "groom", act: "谢谢大家" },
    ],
    seats: [
      { who: "夏天", tone: "summer", act: "全程拍照" },
    ],
  },
  {
    id: "toast-dress",
    part: "仪式之后",
    time: "12:30",
    until: "12:50",
    title: "换敬酒服",
    place: "三楼化妆间",
    seats: [
      { who: "林夕", tone: "linxi", act: "换敬酒服" },
      { who: "新娘", tone: "bride", act: "换敬酒服", notes: ["要是超过 20 分钟，12:50 往后顺。"] },
      { who: "新郎", tone: "groom", act: "先吃", notes: ["不等新娘换完再吃。"] },
      { who: "父母", tone: "parents", act: "先吃" },
    ],
  },
  {
    id: "scratch-prize",
    part: "仪式之后",
    time: "敬酒前",
    title: "兑奖",
    place: "礼台旁边",
    seats: [
      { who: "新郎", tone: "groom", act: "和酒店对接上热菜" },
      { who: "新郎四娘", tone: "aunt", act: "兑奖", notes: ["40 张刮刮乐。", "客人找她，不找新人。"] },
    ],
  },
  {
    id: "toast",
    part: "仪式之后",
    time: "12:50",
    until: "13:30",
    title: "按桌号敬酒",
    place: "宴会厅",
    note: "吃饭时的音乐沿用仪式后的背景。午宴快结束时说一次：晚饭留不留、下午打不打牌。不要写在签到本上，散席记在同一张纸。晚饭在 1F 锦华厅。打牌在 3F 古堰安澜厅，4 人一桌。",
    seats: [
      { who: "新娘", tone: "bride", act: "按桌敬酒", notes: ["从 1 号桌开始，按桌号往下走。", "不敬全场，酒自己倒。", "这一段可以顺延。"] },
      { who: "新郎", tone: "groom", act: "带父母敬酒" },
      { who: "父母", tone: "parents", act: "跟着去敬酒" },
      { who: "夏天", tone: "summer", act: "收工", notes: ["13:30 收工。"] },
    ],
  },
  {
    id: "balances",
    part: "仪式之后",
    time: "13:30",
    title: "付尾款",
    place: "宴会厅",
    note: "敬酒要是顺延，这一段跟着顺。",
    seats: [
      {
        who: "新娘",
        tone: "bride",
        act: "付尾款",
        notes: [
          "对接林夕，化妆。合同 3,288 已经记过实付，还有尾款再付。",
          "对接夏天，拍照。尾款 1,040。超时按 200 元一小时。",
          "礼服要是还有尾款，也在这时付。念念 3,800 已经记过实付。",
        ],
      },
      {
        who: "新郎",
        tone: "groom",
        act: "付尾款",
        notes: [
          "对接酒店。报价 65,580，还没付。",
          "对接拍照机。尾款 888。",
          "对接辛家婚庆。造景 21,500，实付还没记。",
          "微信联系销售，把剩下的国窖退掉。",
        ],
      },
    ],
  },
  {
    id: "cards",
    part: "仪式之后",
    time: "散席",
    title: "散场到棋牌室",
    place: "3F 古堰安澜厅",
    seats: [
      {
        who: "新郎",
        tone: "groom",
        act: "接到棋牌室",
        notes: ["和父母一起确定打牌人数。", "记在散席那张纸上，4 人一桌。"],
      },
      { who: "新郎父亲", tone: "dad", act: "接到棋牌室" },
      { who: "新郎母亲", tone: "momm", act: "接到棋牌室" },
    ],
  },
]

export const peopleConfirm: PersonConfirm[] = [
  { name: "林夕", tone: "linxi", time: "11.21 下午", place: "微信 / 套房", by: "新娘", note: "前一天先确认到场和带几个人。当天 5:30 起跟到 12:50 换完敬酒服。6:30 新郎、7:00 和 7:30 两位妈妈和她重叠。" },
  { name: "夏天", tone: "summer", time: "11.21 下午", place: "微信 / 套房", by: "新娘", phone: "15928125194", note: "前一天告诉他到哪。合同到 13:30。车费我们出。仪式中全程拍照。" },
  { name: "胡勤煜", tone: "hu", time: "11.21 下午", place: "宴会厅外", by: "新郎", phone: "15982158784", inferred: true, note: "前一天确认进场。国皓智胜拍照机。7:40 进、9:40 开放，11:40 收。" },
  { name: "辛家婚礼", tone: "xin", time: "11.21 下午", place: "宴会厅", by: "新郎", note: "前一天确认布景就位。缺件当场记。" },
  { name: "酒店经理", tone: "booth", time: "11.21 傍晚", place: "酒店", by: "新郎", note: "收下烟和抽奖喜字，给第二天摆盘。当面点清。" },
  { name: "花姐", tone: "hua", time: "8:00", place: "套房", by: "新娘", note: "改口茶可以端茶，不主持。和姐姐里出一个。" },
  { name: "新娘姐姐", tone: "sister", time: "8:00", place: "套房", by: "新娘", note: "8:00 泡茶，茶和 3 个改口费放到茶几上。改口茶可以端茶，和花姐里出一个。" },
  { name: "黄钰皓", tone: "huang", time: "8:20", place: "套房", by: "新郎", inferred: true, note: "录像，自带 pocket。赶上 8:30 的茶。仪式中全程录像。前一晚在鱼火锅桌 1。" },
  { name: "唐东阳", tone: "tang", time: "8:20", place: "套房", by: "新郎", inferred: true, note: "录像，自带 pocket。赶上 8:30 的茶。仪式中全程录像。前一晚在鱼火锅桌 1。" },
  { name: "曾沛豪", tone: "zeng", time: "11.21 下午", place: "宴会厅", by: "新郎", note: "前一天彩排。戒盒、誓词卡在他手上。当天 11:53 台侧喊入座。切歌不归他。" },
  { name: "李宗达", tone: "li", time: "11.21 下午", place: "过道两边", by: "新郎", note: "前一天彩排切歌。遥控器在他手上。走 T 台、誓词、戴戒三刀。" },
  { name: "新郎四娘", tone: "aunt", time: "敬酒前", place: "礼台旁边", by: "新郎", note: "仪式中兑奖新人自己发。敬酒前再到礼台旁边，40 张刮刮乐。" },
  { name: "白酒", tone: "baijiu", time: "11.21 下午", place: "宴会厅", by: "新郎", note: "前一天确认箱数和开箱位置。当天确保就位。" },
]

export const openTasks: PrepItem[] = [
  { name: "写誓词卡", note: "11.21 上午装箱前写完两张。交给曾沛豪，不装进新人口袋。" },
  { name: "搬物资到酒店", note: "11.21 上午：喜糖、伴手礼、烟、衣物、贴身小件、戒指、红包、刮刮乐、装饰、喜字。" },
  { name: "彩排与调音", note: "11.21 下午：三麦、切歌三刀、戒盒空演。曾沛豪、李宗达一起。" },
  { name: "辛家布景", note: "11.21 下午确认就位，缺件当场记。" },
  { name: "四大金刚对接", note: "11.21 下午：林夕、夏天、胡勤煜、白酒，四点都对过话。" },
  { name: "取婚纱西服", note: "11.21 下午两人一起去念念试穿，对上敬茶服、迎宾纱、主婚纱。" },
  { name: "买水果葡萄汁", note: "棋牌茶坊砂糖橘，签到台阳光玫瑰，敬酒葡萄汁。放到酒店约定位置。" },
  { name: "烟与喜字交经理", note: "11.21 傍晚当面点清，给第二天摆盘。" },
  { name: "8 间房入住", note: "朋友 ×5、女方亲戚 ×2、男方父母 ×1。房号发群。" },
  { name: "护墙", note: "套房装饰上墙时，先贴低粘美纹纸，无痕双面胶贴在美纹纸上。" },
  { name: "套房钥匙", note: "问酒店：房号、几点拿钥匙、茶后的行李放哪、茶和开水给不给。5:30 前要能开。" },
  { name: "改口叫法", note: "还没定。没定之前，改口茶先叫爸、妈。" },
  { name: "拍照机重叠段", note: "问胡勤煜：外区和空镜重叠的 40 分钟停不停。" },
  { name: "午宴背景曲", note: "仪式四首已定。午宴背景曲名还没定。" },
  { name: "出菜", note: "问酒店：仪式中上不上冷菜，12:30 主桌能不能先吃，12:50 之前热菜上过没有。问回来只改出菜。" },
]

export const prepItems: PrepItem[] = [
  { name: "对戒，两枚", note: "两枚都在手边。上台那一枚在戒盒里，另一枚分开，不进同一个口袋。" },
  { name: "戒指绒盒", note: "绒盒里只放上台那一枚，已经装好。" },
  { name: "誓词卡，两张", note: "两张卡上的字写好，和戒盒放在一起，不装进新人口袋。" },
  { name: "切歌遥控器", note: "遥控器在，11.21 彩排后仍交给李宗达。" },
  { name: "麦克风，三支", note: "三支都在。11.21 下午彩排时试过。" },
  { name: "刮刮乐卡片，40 张", note: "40 张在。敬酒前交给新郎四娘，她在礼台旁边兑。" },
  { name: "大红包、小红包", note: "改口费与感谢红包分装贴便签。11.21 上午进酒店。" },
  { name: "改口费", note: "3 个纸袋各装好 6,666。第二天 8:00 前，新娘姐姐和茶一起放到套房茶几上。" },
  { name: "盖碗和托盘", note: "盖碗 4 个、托盘 1 个在，改口茶用。" },
  { name: "茶几七件套", note: "七件套在家里茶几上。" },
  { name: "新娘新郎衣物", note: "11.21 取件试穿后放套房。含皮带。" },
  { name: "敬茶服、迎宾纱、主婚纱", note: "念念取回后三件都对上名字，第二天换得上。" },
  { name: "鞋子", note: "皮鞋、高跟鞋 ×3、平底鞋。擦净，放套房。" },
  { name: "贴身小件", note: "胸贴、防走光贴、防磨脚贴、美瞳、面膜、提臀收腹裤。放新娘妆袋。" },
  { name: "充电宝、刮胡刀", note: "充电宝充满电。11.21 上午进酒店。" },
  { name: "伴手礼", note: "伴手礼在，第二天签到时新郎拿得到。" },
  { name: "酒席喜糖盒", note: "盒子分装好。午餐的 220 盒单独放，不和签到糖、茶房散糖混在一起。" },
  { name: "签到糖", note: "200 颗在。只在签到发，不放上正餐桌。" },
  { name: "茶房的散糖", note: "大约 10 斤在，单独备好，不从酒席盒里拆。" },
  { name: "硬中华和国窖", note: "烟 11.21 傍晚交经理摆盘；签到还能发。国窖按箱数到位。" },
  { name: "抽奖喜字", note: "11.21 傍晚和烟一起交经理，给第二天摆盘。" },
  { name: "套房装饰", note: "门喜、拉花、背景、喜字桌布都在，能带去套房。" },
  { name: "美纹纸和无痕双面胶", note: "低粘美纹纸和无痕双面胶在。上墙时先贴美纹纸，胶贴在纸上。" },
  { name: "砂糖橘、阳光玫瑰、葡萄汁", note: "11.21 下午买。茶坊砂糖橘，签到台阳光玫瑰，敬酒葡萄汁。" },
  { name: "矿泉水", note: "酒店提供，自己不带。" },
  { name: "西装", note: "曾沛豪自己的西装在，第二天穿得上。" },
]

export const expenseLines = [
  ["酒店午宴", "2,599 × 20 桌", "51,980"],
  ["晚宴 + 茶房", "800 × 10 桌 + 5,600", "13,600"],
  ["辛家造景", "总价，实付未记", "21,500"],
  ["国窖1573", "750 × 6 瓶 × 4 件", "18,000"],
  ["妆造、礼服、父母衣服、小件", "含婚鞋婚包美甲茶几伴手礼", "9,188"],
  ["摄影 + 拍照机", "2,080 + 1,488", "3,568"],
  ["住宿", "370 × 8 间 × 1 晚", "2,960"],
  ["酒席喜糖盒", "已付", "1,800"],
  ["硬中华", "4 条 × 450", "1,800"],
  ["已定感谢红包", "200+60+60+60+120+120", "620"],
]

export const unpriced = [
  ["摄影超时、夏天车费和住宿", "超时 200 元/小时，小时数和车费都没写"],
  ["拍照机超时", "400 元/小时，小时数没写"],
  ["红酒、饮料、签到糖、茶房", "无标价。国窖、烟、喜糖盒已经计入"],
  ["对戒、套房装饰、便服", "已买，实付未记"],
  ["美纹纸、双面胶", "无标价"],
  ["红包纸袋", "撒红包不做。小红包纸袋已有 100 多个，实付未记"],
  ["造景加项、改图、超时", "21,500 不含这些"],
  ["再加房间", "这轮 8 间已计入。女方亲戚 2 间还没写是谁"],
  ["加机麻", "200 元/桌，桌数没定"],
  ["减桌、空桌费", "还没问酒店"],
]

export const circles = [
  { name: "发小", heads: 3 },
  { name: "初中", heads: 0 },
  { name: "高中", heads: 8 },
  { name: "大学", heads: 20 },
  { name: "朋友", heads: 21 },
  { name: "同事", heads: 9 },
  { name: "桌游", heads: 5 },
  { name: "名单外", heads: 2 },
]

export const parties = [
  { name: "朋友同事", heads: 68, tables: 7 },
  { name: "男方家里", heads: 55, tables: 6 },
  { name: "女方", heads: 30, tables: 3 },
  { name: "主桌", heads: 8, tables: 1 },
]

export const rooms = [
  ["1", "廖楷弟", "人数未写", "1 晚"],
  ["2", "刘喜瑞（大学）", "人数未写", "1 晚"],
  ["3", "任泓竹（大学）", "人数未写", "1 晚"],
  ["4", "曾沛豪", "人数未写", "1 晚"],
  ["5", "许尔斌", "人数未写", "1 晚"],
  ["6", "女方亲戚", "人数未写", "1 晚"],
  ["7", "女方亲戚", "人数未写", "1 晚"],
  ["8", "男方父母", "人数未写", "1 晚"],
]

