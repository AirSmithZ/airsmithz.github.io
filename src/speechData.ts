export type SpeechLine = {
  who?: string
  tone?: string
  text: string
  kind?: "say" | "note" | "slot"
}

export type SpeechBeat = {
  id: string
  time?: string
  hint?: string
  who?: string
  tone?: string
  lines: SpeechLine[]
}

export type SpeechBlock = {
  id: string
  title: string
  note?: string
  beats: SpeechBeat[]
}

/** 原文来自 致辞/发言.md，只做结构拆分，不改措辞。 */
export const speechBlocks: SpeechBlock[] = [
  {
    id: "pre",
    title: "仪式开始前",
    beats: [
      {
        id: "pre-1",
        time: "11:53",
        hint: "开场前5分钟",
        who: "曾沛豪",
        tone: "zeng",
        lines: [
          {
            kind: "say",
            text: "各位来宾大家好。欢迎来到今天的婚礼现场。婚礼仪式将于5分钟后，也就是11点58分正式开始，请还未落座的朋友尽快落座，谢谢大家的配合。",
          },
        ],
      },
      {
        id: "pre-2",
        time: "11:56",
        hint: "开场前2分钟",
        who: "曾沛豪",
        tone: "zeng",
        lines: [
          {
            kind: "say",
            text: "现场的各位来宾，婚礼仪式将在2分钟后准时开始。麻烦各位把手机调至静音或震动，谢谢大家的配合，让我们共同期待",
          },
        ],
      },
    ],
  },
  {
    id: "open",
    title: "正式开场，邀请新郎新娘上台",
    beats: [
      {
        id: "open-1",
        time: "11:58",
        lines: [
          {
            kind: "say",
            text: "现在，新郎周祎和新娘杜章锦的婚礼仪式正式开始！接下来有请这对新人登场",
          },
        ],
      },
    ],
  },
  {
    id: "hello",
    title: "开场白",
    note: "以下部分需要2个话筒",
    beats: [
      {
        id: "hello-1",
        lines: [
          { who: "新郎", tone: "groom", kind: "say", text: "尊敬的各位来宾，" },
          { who: "新娘", tone: "bride", kind: "say", text: "亲爱的朋友们，" },
          { who: "合", tone: "parents", kind: "say", text: "大家好！" },
        ],
      },
    ],
  },
  {
    id: "vows",
    title: "誓言",
    beats: [
      {
        id: "vows-intro",
        who: "新郎",
        tone: "groom",
        lines: [
          {
            kind: "say",
            text: "感谢大家来到现场见证我们的爱情，你们的到来就是最好的祝福，我谨代表新娘及双方父母，对大家的到来表示热烈的欢迎和感谢。在今天这个特殊的时刻，我们彼此都准备的来一些话，想和对方、也与大家一起分享",
          },
          { kind: "slot", text: "【新郎誓言】" },
          { kind: "slot", text: "【新娘誓言】" },
        ],
      },
    ],
  },
  {
    id: "rings",
    title: "交换戒指",
    beats: [
      {
        id: "rings-groom",
        who: "新郎",
        tone: "groom",
        lines: [
          {
            kind: "say",
            text: "感谢在座各位为我们见证，接下来该交换戒指啦!有请我的发小曾沛豪为我们送上戒指。",
          },
          {
            kind: "note",
            text: "曾沛豪顺手带下去一个话筒",
          },
          {
            kind: "say",
            text: "杜章锦女士，请允许我以丈夫的身份为你戴上戒指。",
          },
        ],
      },
      {
        id: "rings-bride",
        who: "新娘",
        tone: "bride",
        lines: [
          {
            kind: "say",
            text: "周祎先生，请允许我以妻子的名义为你戴上戒指。",
          },
          {
            kind: "note",
            text: "交换对戒后，新郎新娘拥抱，向摄影师展示戒指，拍照。",
          },
        ],
      },
    ],
  },
  {
    id: "prize",
    title: "看盘底",
    beats: [
      {
        id: "prize-1",
        who: "新娘",
        tone: "bride",
        lines: [
          {
            kind: "say",
            text: "庄重的仪式告一段落，接下来是今天为大家准备的小惊喜。请各位宾客看一下自己面前餐盘（桌卡）的底部，找到编号或标记的朋友，就可以上台来，和两位新人一起领取这份纪念品。有请中奖的朋友们上台！",
          },
        ],
      },
    ],
  },
  {
    id: "photo",
    title: "兑奖结束",
    beats: [
      {
        id: "photo-1",
        lines: [
          {
            kind: "say",
            text: "奖品领到了，先别急着回座位。有请刚才上台的各位亲友，还有想和新人合影的朋友们，一起到台上来，我们拍一张合影。",
          },
        ],
      },
    ],
  },
]
