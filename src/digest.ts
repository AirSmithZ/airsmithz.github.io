/** 与 out/澳新行程整理.md 的汇总表同一份。 */
export interface DigestStop {
  region: string;
  country: string;
  when: string;
  items: string[];
}

export const DIGEST_STOPS: DigestStop[] = [
  { region: '成都', country: '中国', when: '2 月 9 日', items: ['只起飞，没有目的地亮点'] },
  {
    region: '墨尔本',
    country: '澳大利亚',
    when: '2 月 10–11 日',
    items: ['City Walk（皇家拱廊、弗林德斯街）', '洛克阿德大峡谷', '大洋路的十二使徒'],
  },
  {
    region: '霍巴特',
    country: '澳大利亚',
    when: '2 月 12–14 日',
    items: ['City Walk（萨拉曼卡集市、大卫公园）', '塔斯曼半岛巡航', '塔斯马尼亚恶魔动物园'],
  },
  {
    region: '悉尼',
    country: '澳大利亚',
    when: '2 月 15–16 日',
    items: ['City Walk（悉尼歌剧院、悉尼大学、海德公园）'],
  },
  {
    region: '凯恩斯',
    country: '澳大利亚',
    when: '2 月 17–20 日',
    items: ['直升机环绕大堡礁', '潜水（深浅浮潜均支持）', '逛热带雨林（袋鼠谷、帕罗尼拉公园、米拉米拉瀑布）'],
  },
  {
    region: '基督城',
    country: '新西兰',
    when: '2 月 21–22 日',
    items: ['City Walk（逛市集、植物园）'],
  },
  {
    region: '费尔利',
    country: '新西兰',
    when: '2 月 23–24 日',
    items: ['拉卡亚观景', '好牧羊人教堂', '银河'],
  },
  {
    region: '瓦纳卡',
    country: '新西兰',
    when: '2 月 25 日',
    items: ['玩具博物馆', '箭镇', '跳伞', '银河'],
  },
  {
    region: '皇后镇',
    country: '新西兰',
    when: '2 月 26 日–3 月 1 日',
    items: ['米尔福德峡湾', '皇后镇公园', '天际线', '鲨鱼快艇', '固定翼观赏冰川', '南极光（极小概率）', '银河'],
  },
];
