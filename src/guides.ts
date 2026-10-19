export const GUIDE_IDS = ['visa', 'licence', 'insure', 'au', 'nz', 'roo', 'car'] as const;

export type GuideId = (typeof GUIDE_IDS)[number];

export function isGuideId(value: string | null): value is GuideId {
  return GUIDE_IDS.some((id) => id === value);
}

export interface GuideField {
  label: string;
  value: string;
}

export interface GuideScreen {
  /** 这张图在说哪一个网页或柜台。 */
  caption: string;
  /** 窗口标题，用官网自己的栏目名。 */
  window: string;
  fields: GuideField[];
}

export interface GuideFigure {
  /** 相对站点根目录，不含开头的斜杠。 */
  src: string;
  alt: string;
  caption: string;
}

export interface GuideStep {
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
  screen?: GuideScreen;
  figures?: GuideFigure[];
}

export interface Guide {
  id: GuideId;
  eyebrow: string;
  title: string;
  menuNote: string;
  lede: string;
  steps: GuideStep[];
}

const AS_OF = '示意图按 2026-10-16 打开的官网栏目画，不是网站截图。页面改了，以链接为准。';

export const GUIDES: Guide[] = [
  {
    id: 'visa',
    eyebrow: '现在办',
    title: '签证',
    menuNote: '四人先办澳大利亚旅游签，批下来再办新西兰',
    lede: '四人各办一张澳大利亚访客签证，办在登机用的那本护照上。页面上的 600 是这张签证的类别编号，不是费用，也不是能待的天数。澳大利亚批下来之前，不要交新西兰的申请。',
    steps: [
      {
        title: '办访客签证，类别选 600',
        body: '600 是澳大利亚给访客签证起的类别编号，英文是 Visitor visa (subclass 600)。这张签证用来短期待在澳大利亚，不能打工。它下面有好几档，这趟选旅游这一档，英文 Tourist stream：度假、游玩、看朋友。打开内政部网站，注册或登录 ImmiAccount。四人各交一份，不能四个人挤在同一张表里。同行出发可以选 Group processing，方便一起审，仍然是一人一份。',
        href: 'https://immi.homeaffairs.gov.au/help-support/applying-online-or-on-paper/online',
        hrefLabel: 'ImmiAccount 在线申请说明',
        screen: {
          caption: AS_OF,
          window: 'ImmiAccount',
          fields: [
            { label: '登录后', value: 'New application' },
            { label: '签证', value: 'Visitor visa，类别编号 600' },
            { label: '这一档', value: 'Tourist stream，旅游' },
            { label: '同行', value: 'Group processing，可选' },
            { label: '通知', value: '勾选接收电子信件' },
          ],
        },
      },
      {
        title: '不要选 ETA，也不要下官方应用',
        body: '中国护照不能用 ETA，那是另一类签证，编号 601。也不能用 eVisitor，编号 651。Australian Immi App 不是用来交这张签证的，它只在收到采集通知后用来交护照和人脸，而且中国大陆不在那个应用的国家名单里。常旅客这一档要录指纹，大陆的采集点在香港。这趟选旅游这一档，在网页上交完即可。',
        href: 'https://china.embassy.gov.au/bjng/dima0301.html',
        hrefLabel: '澳大利亚驻华使馆：在华可办的签证',
      },
      {
        title: '传护照，按当天价格付款',
        body: '姓名和护照逐字一致。护照个人资料页要清晰。不是英文的材料附上英文翻译。在 Attach documents 这一页：选文件类型，写一句说明，选文件，点添加，再确认。单个文件不超过 5 MB。费用以提交当天的估价器为准。交完后签证是电子的，护照上没有贴纸。准签信留一份纸质、一份云端。没有它，航空公司不让登机。',
        href: 'https://immi.homeaffairs.gov.au/visas/visa-pricing-estimator?visa=600',
        hrefLabel: '访客签证估价器',
        screen: {
          caption: AS_OF,
          window: 'Attach documents',
          fields: [
            { label: 'Document type', value: '下拉选择文件类型' },
            { label: 'Description', value: '用英文写这是什么' },
            { label: 'Browse', value: '选中扫描件' },
            { label: 'Add attachments', value: '加进列表' },
            { label: 'Confirm', value: '状态从 Required 变成 Received' },
          ],
        },
      },
      {
        title: '按上传栏准备文件',
        body: '按申请表里出现的栏交。下面六张图是一位申请人传过的文件，和帮助页不一致的地方写在图下。',
        href: 'https://immi.homeaffairs.gov.au/check-twice-submit-once/visitor-visa',
        hrefLabel: '交访客签证前再核对一遍',
        figures: [
          {
            src: 'visa/6acddb93000000000b004a4b/01.webp',
            alt: '护照资料页和身份证正反面的示例',
            caption: '护照资料页，扫描清晰，JPG 或 PDF 都可以。下面是身份证正反面。',
          },
          {
            src: 'visa/6acddb93000000000b004a4b/02.webp',
            alt: '户口本、结婚证和家庭构成表的示例',
            caption: '户口本从首页到全部成员页。已婚或离异再附结婚证或离婚证。图里的 54 表，笔记写成没有直系亲属户口本才交。帮助页写中国申请人户口本和表格 54 都要。',
          },
          {
            src: 'visa/6acddb93000000000b004a4b/03.webp',
            alt: '出入境记录、行程单和解释信的示例',
            caption: '左边是出入境记录或旧签证页。右边是行程单。解释信也可以放在「在澳活动」这一栏。',
          },
          {
            src: 'visa/6acddb93000000000b004a4b/04.webp',
            alt: '银行流水、存款证明、房产证和行驶证的示例',
            caption: '笔记把近 6 个月流水、余额大于 5 万写成要交的。帮助页的例子是近三个月流水或工资单，没有 5 万这个数。存款证明、房产、车产是笔记里的补充。',
          },
          {
            src: 'visa/6acddb93000000000b004a4b/05.webp',
            alt: '邀请函、在职证明和营业执照的示例',
            caption: '邀请函只在探亲或访友那一栏，这趟旅游不用。在职证明用公司抬头并盖章。自雇交营业执照。',
          },
          {
            src: 'visa/6acddb93000000000b004a4b/06.webp',
            alt: '社保、个税和同行人护照、签证的示例',
            caption: '社保和个人所得税是笔记里的补充，帮助页没有列。有同行人才传对方护照首页；对方已获批再附签证。四人各交各的。',
          },
        ],
      },
      {
        title: '访客签证批下来，再看新西兰',
        body: '中国护照从澳大利亚飞新西兰，可以不另办新西兰签证，改办 NZeTA。人必须已经在澳大利亚入境过，再从澳大利亚的机场起飞，而且这张访客签证在凯恩斯值机时还有效。只在澳大利亚转机不能用。试点从 2025 年 11 月 3 日开始，头 12 个月到 2026 年 11 月。2026 年 10 月 16 日，移民局页面写明评估还没结束，这期间仍可继续用 NZeTA。出发前再打开这一页。如果那句「可以继续」不见了，就另交新西兰访客签证。不要两份一起交。',
        href: 'https://www.immigration.govt.nz/visit/what-you-need-to-visit-new-zealand/chinese-and-pacific-island-visitors-travelling-from-australia/',
        hrefLabel: '从澳大利亚前往新西兰的试点说明',
      },
      {
        title: '用官方应用或官网办 NZeTA',
        body: '只从移民局页面进官方应用或官网。应用 17 纽元，网站 23 纽元，另加游客税 100 纽元。一次最多可以给 10 个人一起交。至少提前 72 小时。照片要是近 6 个月的本人。不要用 AI 修改，也不要拍护照或屏幕。NZeTA 不是签证，不保证放行。过关时，边境另发一份最长 3 个月的访客签证。值机时还没有 NZeTA，航空公司可以不让上飞机。',
        href: 'https://www.immigration.govt.nz/visit/what-you-need-to-visit-new-zealand/nzeta-application-guide-for-citizens-of-china/',
        hrefLabel: '中国公民 NZeTA 指南（页内有中文视频）',
        screen: {
          caption: AS_OF,
          window: 'NZeTA',
          fields: [
            { label: '护照', value: '登机用的那一本，可用应用扫描' },
            { label: '照片', value: '本人近照，禁止 AI 修改' },
            { label: '邮箱', value: '收结果' },
            { label: '声明', value: '来访目的、健康和犯罪记录' },
            { label: '付款', value: '应用 17 或网站 23，再加 100 纽元' },
          ],
        },
      },
      {
        title: '护照和回程票一起准备好',
        body: '澳大利亚只要求护照盖住停留的日子。新西兰要求护照在离开日之后还有效至少 3 个月。3 月 1 日离开，有效期要到 2027 年 6 月 1 日。值机时要能出示已经付款的离开新西兰的机票，目的地是本人可以入境的国家。',
      },
    ],
  },
  {
    id: 'licence',
    eyebrow: '现在办',
    title: '驾照',
    menuNote: '办英文翻译，不办国际驾照',
    lede: '只在新西兰开车。澳大利亚这段不用驾照。带上中国驾照原件和英文翻译。',
    steps: [
      {
        title: '不要买国际驾照',
        body: '中国没有加入 1968 年道路交通公约，大陆没有机关能签发国际驾驶许可。北京交管 2026 年 7 月仍写明不能办。网上卖的小册子不能用。只有小册子、没有中国驾照原件，不能在新西兰开车。',
        href: 'https://jtgl.beijing.gov.cn/jgj/qaknowledge/325750668/325750918/325731300/325752872/index.html',
        hrefLabel: '北京交管：大陆不能办理国际驾照',
      },
      {
        title: '把驾照译成英文',
        body: '新西兰交通局接受四类译文：交通局认可的翻译社、使领馆、发证机关，以及中国公证处出具的翻译件。正页和副页都要译，使用地填新西兰。每个开车的人一份。交管 12123 的截图不能当驾照。',
        href: 'https://www.nzta.govt.nz/driver-licences/new-residents-and-visitors/approved-translators',
        hrefLabel: '新西兰交通局认可的译文',
        screen: {
          caption: '公证书上要能看清这些，不是网上表格的截图。',
          window: '驾驶证英文译文',
          fields: [
            { label: '正页', value: '姓名、证号、准驾车型、有效期' },
            { label: '副页', value: '一并译出' },
            { label: '使用地', value: '新西兰' },
            { label: '出具方', value: '公证处，或交通局认可的翻译社' },
          ],
        },
      },
      {
        title: '下单前先问 Apex 收不收',
        body: '交通局认公证处。Apex 的常见问题只写了翻译社、使领馆和发证机关，没有写公证处。发邮件到 reservations@apexrentals.co.nz，问基督城机场店收不收公证处的英文翻译。拿到书面回复再付款。还在实习期的，写在同一封邮件里。',
        href: 'https://www.apexrentals.co.nz/rental-info/frequently-asked-questions',
        hrefLabel: 'Apex 常见问题里的驾照要求',
      },
      {
        title: '取车当天两样都带上',
        body: '2 月 23 日，每个要开车的人带驾照原件和译文。开车时也随身带。游客开小客车最长 18 个月，这趟不用换成新西兰驾照。',
      },
      {
        title: '靠左行驶',
        body: '司机要满 21 岁，持正式驾照。副司机不加价，但取车时必须到场。柜台可能先做一份靠左行驶的问卷，再让人试开。店员认为开不了，会终止合同并退租金。路上靠左。没有信号灯的路口，让右边来的车先走。进环岛时，让已经在环岛里的车。开车的人当天不喝酒。20 岁以上，血液酒精上限是 50 毫克/100 毫升。',
      },
    ],
  },
  {
    id: 'insure',
    eyebrow: '出发前',
    title: '保险',
    menuNote: '出发前买好，保期盖住整个行程',
    lede: '在国内买人身安全和医疗保险。外交部没有指定必须买哪一家。不要买只卖给澳新本地居民的保单。',
    steps: [
      {
        title: '在持牌公司自己的页面买',
        body: '用保险公司官网、它自己的应用，或银行和支付宝里该公司的投保页。保单写明澳大利亚和新西兰，日期从 2027 年 2 月 8 日盖到 3 月 1 日，四个人都在被保险人里。不要在代办签证的网站顺手买。',
        href: 'https://cs.mfa.gov.cn/zggmcgx/lsbhyxz/cjwd_149483/202607/t20260713_11981016.html',
        hrefLabel: '外交部：行前购买合适的保险',
      },
      {
        title: '对着条款核对五个活动',
        body: '不要只看「含户外运动」。在除外和承保活动里找这五个名字：瓦纳卡跳伞、礁上直升机、天际线滑板、鲨鱼快艇、米尔福德观光飞行。跳伞经常整项除外。观光飞行如果写成持牌飞机上的付费乘客，有时在保，直升机要单独看。对不上就换一份，或接受这项自己承担。',
        screen: {
          caption: '买的时候对着保单页面找这几栏。不是某一家公司的截图。',
          window: '保单条款',
          fields: [
            { label: '目的地', value: '澳大利亚、新西兰' },
            { label: '保险期间', value: '2027-02-08 至 2027-03-01' },
            { label: '被保险人', value: '四个人都在' },
            { label: '活动', value: '跳伞、直升机、滑板、快艇、观光飞行' },
            { label: '救援电话', value: '抄进手机，保单离线留一份' },
          ],
        },
      },
      {
        title: '车的免赔不在这份旅行险里',
        body: '旅行险的个人责任通常不保开车撞人和撞车。出事故要付的那笔免赔，在 Apex 下单时的附加项里买。条款里如果另有「租车免赔额」，再看它是否要求正式驾照和英文翻译。',
      },
      {
        title: '买之前先看风暴条款',
        body: '凯恩斯 2 月在气旋季。不少保单把已经命名的风暴当成已知事件。风暴有了名字之后才买，这场风暴造成的取消不赔。买的时候看自己那份条款有没有同样的句子。',
      },
      {
        title: '出事先打救援电话',
        body: '看门诊如果先自己付钱，留好发票，回国再报销。住院按救援电话指的医院去。入院前再确认能不能垫付。新西兰看病本身要付钱，医疗这一项是这份保单的主体。中国领事应用可以打 12308，它不卖保险。',
      },
    ],
  },
  {
    id: 'au',
    eyebrow: '2 月 10 日',
    title: '入境澳大利亚',
    menuNote: '在凯恩斯入境，飞机上填入境卡',
    lede: '2 月 10 日 13:30 到凯恩斯。这一班是澳航、捷星中转，电子申报如果澳航应用里有就用应用，没有就在飞机上填纸质卡。第一晚住 Aveline。后来从霍巴特飞走，那是离境，不用再入一次境。下面的实拍是悉尼机场。入境卡和自助机是同一套。通道在左还是在右，按凯恩斯现场的牌子。',
    steps: [
      {
        title: '飞机上填纸质入境卡',
        body: '正反面都填，本人签字，用英文，蓝笔或黑笔。简体中文样张只帮看懂题目，不能把答案写在样张上。第一晚地址写凯恩斯旅馆 Aveline Dual-Key。健康和犯罪记录按实情填。带一支笔。从香港飞来，近 6 天没有去过黄热病流行的国家，不用带黄热病证明。',
        href: 'https://www.abf.gov.au/entering-leaving-australia/files/ipc-sample-chinese-simplified.pdf',
        hrefLabel: '入境卡简体中文样张（PDF）',
        screen: {
          caption: '题目来自边境执法局的简体中文样张。样张版式是 2019 年 7 月，飞机上以当场发的卡为准。',
          window: 'Incoming Passenger Card',
          fields: [
            { label: '地址', value: 'Aveline Dual-Key，凯恩斯' },
            { label: '食品和动植物', value: '有或拿不准，选 Yes' },
            { label: '药品', value: '常备药、维生素也选 Yes' },
            { label: '鞋和泥土', value: '乡下或淡水穿过的，选 Yes' },
            { label: '近 30 天', value: '去过农场或野外，选 Yes' },
            { label: '现金', value: '达到 1 万澳元要申报' },
          ],
        },
        figures: [
          {
            src: 'arrival/6ab4f076000000001a023f6d/02.webp',
            alt: '客舱里空乘在发入境材料',
            caption: '入境卡在飞机上发。这张拍的是飞悉尼的澳航客舱。南航同样发纸质卡。没发到，落地后大厅里有。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/03.webp',
            alt: '手里的澳大利亚入境卡正面和背面',
            caption: '正面申报物品，背面签字、选停留原因。卡上印着方框打叉，不是打勾。姓名和护照号是拍摄者的，不要抄。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/04.webp',
            alt: '入境卡中文填写说明，方框里打叉',
            caption: '游客选 B。电话写 +86。地址写 Aveline Dual-Key，凯恩斯 QLD，不要抄图上的悉尼。有食品、药品或拿不准，那一题选「是」。图上多数题打在「否」，是拍摄者自己没带的情况。',
          },
        ],
      },
      {
        title: '食品和穿过的鞋主动交出',
        body: '新鲜水果、蔬菜、种子、肉类、乳制品不要带。蜂蜜可以进大多数州，但要申报并接受检查。常备药和维生素也要申报，名称用英文写在卡上。拿不准的物品选 Yes。进凯恩斯前把鞋底和包上的土、草、粪便洗掉并晾干。主动交给检查员就不罚款。瞒报违法。',
        href: 'https://www.agriculture.gov.au/biosecurity-trade/policy/faqs',
        hrefLabel: '农业部：什么必须申报',
      },
      {
        title: '先试自助闸机，过不了走人工',
        body: '护照在有效期内、年满 7 岁、身高至少 1.1 米可以试 SmartGate。电子护照和普通护照都可以。护照首页朝下塞进读卡器，照片朝向机器。屏幕可以选简体中文。摘掉口罩、帽子和墨镜。一次只进一个人。门不开，去协助台或人工柜台。入境卡照样要填。',
        href: 'https://www.abf.gov.au/entering-and-leaving-australia/smartgate/arrivals/how-to-use-smartgates',
        hrefLabel: 'SmartGate 官方两步说明',
        screen: {
          caption: '按边境执法局页面的两步画的。简体中文字幕短片在同一机构的资料页。',
          window: 'SmartGate',
          fields: [
            { label: '第一步 自助机', value: '护照首页朝下塞进读卡器，照片朝向机器' },
            { label: '屏幕', value: '可选简体中文，按提示作答' },
            { label: '小票', value: '打出来，和入境卡放在一起' },
            { label: '第二步 闸门', value: '看摄像头，门开了去取行李' },
            { label: '过不了', value: '去人工柜台' },
          ],
        },
        figures: [
          {
            src: 'arrival/6ab4f076000000001a023f6d/06.webp',
            alt: '护照检查区排队使用的自助机',
            caption: '自助机在 Passport Control 下面排队。头顶的国内转机牌子是悉尼航站楼。这趟在凯恩斯进城，过完闸门去行李提取。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/07.webp',
            alt: '护照照片页朝下插入自助机',
            caption: '照片页朝下，按箭头插到底，问题答完再抽出来。左下角 Change language 可以选简体中文。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/08.webp',
            alt: '自助机上结核、刑事定罪和近六天行程三题',
            caption: '这三题按实情。图上黄字写「都选否」，是拍摄者自己的答案。有结核、有刑事定罪，或近 6 天去过非洲、南美洲、中美洲或加勒比，选「是」。这趟从中国经广州，第三题选否。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/09.webp',
            alt: '自助机吐出小票，屏幕指向闸门',
            caption: '答完先取护照，再取小票。小票和入境卡放在一起，按屏幕去闸门。门不开，去人工柜台。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/05.webp',
            alt: '自助通道的小票样品和通道指示',
            caption: '小票上有人脸，拿着往前走。红圈是拍摄者在悉尼画的。凯恩斯不要按这个左右找路，认 SmartGate 和 Passport Control。',
          },
        ],
      },
      {
        title: '取完行李再交卡',
        body: '取行李时如果检疫犬过来，按工作人员说的把行李放在地上。把 SmartGate 小票和入境卡交给边境或生物安全官员，再出大厅。一般商品免税额：成人 900 澳元，18 岁以下 450 澳元。烟和酒另有限额。超过的写进入境卡。',
        figures: [
          {
            src: 'arrival/6ab4f076000000001a023f6d/10.webp',
            alt: '行李提取和转机的指示牌',
            caption: '闸门开了跟 Baggage Claim，中文是行李提取。International Transfer 是转机，这趟不走。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/11.webp',
            alt: '行李转盘上的托运行李',
            caption: '到自己的转盘取行李。转盘边上的黄按钮是紧急停止，不要按。',
          },
          {
            src: 'arrival/6ab4f076000000001a023f6d/12.webp',
            alt: '出口旁的生物安全申报立牌',
            caption: '出口前这块立牌写着，不申报可能取消签证。食品、肉类、水果、植物在这里最后交一次，再把小票和入境卡交给官员。',
          },
        ],
      },
    ],
  },
  {
    id: 'nz',
    eyebrow: '2 月 21 日',
    title: '入境新西兰',
    menuNote: '中转入境，前一晚填好申报',
    lede: '2 月 21 日 12:25 从霍巴特飞基督城，21:25 到，1 次中转。中转城市这页没印。入境在中转的新西兰机场办，不在基督城。',
    steps: [
      {
        title: '2 月 20 日晚上在酒店填申报',
        body: '每人一份，包括孩子。最早是飞往新西兰之前 24 小时，最晚到中转机场查护照之前。免费，和护照绑在一起，不用打印，也不用出示二维码。只走官网或官方 NZTD 应用。应用商店下不到，就用网页。在网页上开始的申报，不能改到应用里提交。不要留到霍巴特去机场的车上再填。答案用英文。',
        href: 'https://www.travellerdeclaration.govt.nz/',
        hrefLabel: '新西兰旅客申报',
        screen: {
          caption: AS_OF,
          window: 'New Zealand Traveller Declaration',
          fields: [
            { label: '护照', value: '可用应用扫描' },
            { label: '在新西兰的地址', value: '先写第一晚，基督城 Lylo' },
            { label: '航班', value: '2 月 21 日霍巴特出发' },
            { label: '近 30 天', value: '去过的地方' },
            { label: '携带物品', value: '食品、鞋、木制品，有就选 Yes' },
            { label: '入境资格', value: 'NZeTA 或访客签证' },
          ],
        },
      },
      {
        title: '霍巴特值机时三样都要在',
        body: '澳大利亚访客签证仍然有效。NZeTA 或新西兰访客签证已经办好。能出示 3 月 1 日已经付款的离境机票。缺一样，航空公司可以不让上飞机。',
      },
      {
        title: '在中转机场走自助通道',
        body: '中国电子护照、年满 10 岁、申报已经提交，可以用 eGate。护照放上扫描，看摄像头。申报在扫护照时自动核对。过了护照检查就不能再改。漏报了什么，当场告诉官员。过不了就走人工。',
        href: 'https://www.customs.govt.nz/travel-to-and-from-new-zealand/travel-by-air/egate',
        hrefLabel: '海关：eGate 使用条件',
        screen: {
          caption: '按新西兰海关的到港说明画的。',
          window: 'Auckland passport control',
          fields: [
            { label: '申报', value: '扫护照时自动核对' },
            { label: 'eGate', value: '电子护照、年满 10 岁' },
            { label: '过关之后', value: '申报不能再改' },
            { label: '下一程', value: '国内航班去基督城' },
          ],
        },
      },
      {
        title: '行李通道申报食品和鞋',
        body: '食品、蜂蜜、肉、蛋、种子、木制品，以及穿过的户外鞋，申报里选 Yes。不申报可能被罚款或起诉。飞机上发的食物留在飞机上。在塔斯马尼亚和凯恩斯穿过的鞋，洗干净再申报。2 月 22 日人已经在新西兰，当天在基督城买的食品可以带上车。现金或折合达到 1 万纽元，另填现金申报。',
        href: 'https://www.mpi.govt.nz/bring-send-to-nz/bringing-and-posting-items-to-nz/travelling-to-new-zealand',
        hrefLabel: '初级产业部：入境可带物品',
      },
    ],
  },
  {
    id: 'roo',
    eyebrow: '离开澳洲前',
    title: '袋鼠蛋蛋',
    menuNote: '商店成品可申报带进新西兰，墨尔本 2 月 16 日买',
    lede: '这是商店卖的袋鼠阴囊加工品，常见钥匙扣、开瓶器和零钱包。买成品，收据和原包装留着。2 月 20 日晚上填旅客申报时，动物皮毛选 Yes。检查在中转的新西兰机场，不在基督城。',
    steps: [
      {
        title: '可以带，申报之后由官员看',
        body: '初级产业部把动物皮做的纪念品算作风险物品，必须申报，到港后检查。商业制造、没有粘着的脂肪、肌肉、筋、血、土、虫害和腐烂，才符合观赏性动物制品的进口标准。放行没有保证。不申报，即使是忘了，当场 400 纽元；故意藏匿更重。商业捕猎的红袋鼠、东灰袋鼠、西灰袋鼠不在濒危物种贸易公约名单里，普通旅游纪念品一般不用另办许可证。生皮和带肉的不买。',
        href: 'https://www.mpi.govt.nz/bring-send-to-nz/bringing-and-posting-items-to-nz/how-to-declare-items-when-arriving-in-nz',
        hrefLabel: '初级产业部：入境如何申报',
        screen: {
          caption: '申报规则按 2026-10-19 打开的初级产业部页面。罚款页复核日 2024-05-07。',
          window: 'New Zealand Traveller Declaration',
          fields: [
            { label: '何时填', value: '2 月 20 日晚上，人在霍巴特' },
            { label: '动物皮毛', value: '有袋鼠蛋蛋就选 Yes' },
            { label: '检查', value: '中转的新西兰机场，不在基督城' },
            { label: '不申报', value: '当场 400 纽元' },
          ],
        },
      },
      {
        title: '2 月 16 日在墨尔本买',
        body: 'TravellerShop 把袋鼠蛋蛋写在自己的商品页上。地址 40 Elizabeth Street，市中心，皇家拱廊和弗林德斯街这一圈顺路。周一至周六 9:00–20:00，周日 9:30–19:30。电话 +61 3 9650 4595。2 月 16 日周二 11:10 落地，当天市区步行，赶得上。钥匙扣 33–36 澳元，开瓶器 37–42 澳元，标价是 2026-10-19 的页面。2 月 17 日全天在大洋路，不留到那天。',
        href: 'https://www.travellershop.com.au/collections/kangaroo-scrotum',
        hrefLabel: 'TravellerShop 袋鼠蛋蛋',
        screen: {
          caption: '地址、钟点和标价按 2026-10-19 打开的店家页面。',
          window: '40 Elizabeth Street',
          fields: [
            { label: '店', value: 'TravellerShop' },
            { label: '2 月 16 日', value: '周二，11:10 落地后进城' },
            { label: '钟点', value: '周一至周六 9:00–20:00' },
            { label: '钥匙扣', value: '33–36 澳元' },
            { label: '开瓶器', value: '37–42 澳元' },
          ],
        },
      },
      {
        title: '凯恩斯 2 月 10 日傍晚也能买',
        body: '2 月 10 日 13:30 到凯恩斯，傍晚在潟湖。Love Cairns 在 Shop 6/93 The Esplanade，电话 (07) 4051 6363。同一连锁还有 Australia the Gift，107 Abbott Street，电话 0413 306 215。连锁官网有这条产品。店里当天有没有货、几点关门，页面没有逐店写死，第三方页面大约是每天 9:00–22:00，进店前再看门上的钟点。2 月 14 日 06:40 飞悉尼，不留到出发早上。',
        href: 'https://www.australiathegift.com.au/product-category/australian-made/fur-leather/kangaroo-scrotum-souvenirs/',
        hrefLabel: 'Australia the Gift 袋鼠蛋蛋',
      },
      {
        title: '悉尼只剩 2 月 14 日周日',
        body: 'Paddy\'s Markets Haymarket 的 Sydney Souvenirs 在 Stall 460，商品页有 Kangaroo Balls 钥匙扣，分类页从 29 澳元起。市场周三至周日 10:00–18:00，周一和周二关门。2 月 14 日周日 10:40 到悉尼，营业时间内赶得上，摊位在 Haymarket，不在歌剧院那条路上。2 月 15 日周一市场关门。环形码头 Gateway Plaza G16、1 Macquarie Place 的 Australia the Gift 是同一连锁，电话 (02) 9241 7788，店内库存网页没有逐店标，去之前打这个电话。',
        href: 'https://www.paddysmarkets.com.au/haymarket/trading-hours',
        hrefLabel: '帕迪市场 Haymarket 营业时间',
        screen: {
          caption: '市场钟点按官网。商品按 Sydney Souvenirs 和 Australian Made 页面，2026-10-19。',
          window: 'Paddy\'s Markets Haymarket',
          fields: [
            { label: '摊位', value: 'Stall 460，Sydney Souvenirs' },
            { label: '2 月 14 日', value: '周日 10:00–18:00，10:40 落地' },
            { label: '2 月 15 日', value: '周一，市场关门' },
            { label: '钥匙扣', value: '从 29 澳元起' },
          ],
        },
      },
      {
        title: '霍巴特和新西兰没有查到这家货',
        body: 'Australia the Gift 的门店名单里没有塔斯马尼亚。萨拉曼卡集市每周六 8:30–15:00，2 月 20 日正好是周六，摊位介绍里没有这件商品。基督城和皇后镇的纪念品店页面卖的是新西兰货。澳洲网店可以寄到新西兰，包裹仍要过生物安全，也赶不上这趟路上用。在墨尔本或更早买好。',
        href: 'https://www.australiathegift.com.au/find-a-store/',
        hrefLabel: 'Australia the Gift 门店名单',
      },
    ],
  },
  {
    id: 'car',
    eyebrow: '2 月 23 日取',
    title: '租车',
    menuNote: '基督城机场取车，皇后镇机场还车',
    lede: '在 Apex 官网自己下单。不要用代订平台。取车和还车都不需要应用。',
    steps: [
      {
        title: '付款前先发一封邮件',
        body: '写到 reservations@apexrentals.co.nz。问三件事：基督城机场店收不收中国公证处的英文驾照翻译；2 月 23 日上午取、2 月 28 日下午还，总价按几天计；皇冠山脉能不能开。有书面回复再付款。预订中心电话 0800 500 660，新西兰时间周一到周五 8:30 到 17:30。',
      },
      {
        title: '在中文页按六步填完',
        body: '主承租人用自己的实体卡：签证、万事达、美国运通、银联信用卡，或银行发的签证、万事达借记卡。支付宝、现金、虚拟卡不行。取车时必须出示下单用的那张卡，柜台不能换卡。银联被拒，就停在付款这一步，换本人的签证或万事达重新付。提前还车不退租金。',
        href: 'https://www.apexrentals.co.nz/zh-cn/reservations',
        hrefLabel: 'Apex 中文预订页',
        screen: {
          caption: AS_OF,
          window: 'Create Reservation',
          fields: [
            { label: '1 地点', value: '新西兰 · 基督城机场取 · 皇后镇机场还' },
            { label: '2 钟点', value: '2 月 23 日上午取，2 月 28 日 17:29 前还' },
            { label: '3 选车', value: '看这一步写的免赔和计天' },
            { label: '4 附加项', value: '免赔降多少，以这一页的数字为准' },
            { label: '5 联系人', value: '护照拼音，和持卡人一致' },
            { label: '6 付款', value: '主承租人的实体卡' },
          ],
        },
      },
      {
        title: '2 月 23 日从航站楼叫接驳',
        body: '人在 Lylo，先走到基督城机场航站楼。点确认邮件里的 Ready to Collect，或打 0800 400 121。走过值机柜台，从 1 号或 2 号门出去，接驳点在右边、新西兰航空标志下面。行李自己放上车。每个开车的人带驾照原件和译文。柜台可能先做靠左行驶的问卷，再让人试开。',
        href: 'https://www.apexrentals.co.nz/rental-car-locations/christchurch-airport-branch/pick-up-instructions-normal-hours-terminal',
        hrefLabel: '基督城机场取车说明',
        screen: {
          caption: '按基督城机场店页面的取车顺序画的。',
          window: 'Ready to Collect',
          fields: [
            { label: '邮件', value: '点 Ready to Collect' },
            { label: '或者电话', value: '0800 400 121' },
            { label: '出门', value: '1 号或 2 号门' },
            { label: '等候', value: '右边，新西兰航空标志下' },
          ],
        },
      },
      {
        title: '2 月 28 日加满油再还',
        body: '还车前把油加满，油品看油箱盖上的贴纸。不要把 AdBlue 加进油箱。车开回皇后镇 32 Lucas Place。营业时间内还车后，免费接驳只回航站楼，不送回松木。自己加满，或让店里加并按升收费。开了不到 120 公里、又没有加油小票会不会另收费，官网这一页没写，按合同算。出过事故，还车时留出填表的时间，路上先打 0800 500 660。',
        href: 'https://www.apexrentals.co.nz/rental-car-locations/queenstown-airport-branch/drop-off-instructions-normal-hours',
        hrefLabel: '皇后镇机场还车说明',
      },
    ],
  },
];

export function guideById(id: GuideId): Guide {
  const guide = GUIDES.find((item) => item.id === id);
  if (!guide) throw new Error(id);
  return guide;
}
