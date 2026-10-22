/** 文字与 out/澳新行程整理.md 的汇总表同一份。图标跟节点上的种类走。 */
export interface DigestItem {
  icon: string;
  text: string;
}

export interface DigestStop {
  region: string;
  country: string;
  when: string;
  items: DigestItem[];
}

export const DIGEST_STOPS: DigestStop[] = [
  { region: '成都', country: '中国', when: '2 月 8 日', items: [{ icon: '✈️', text: '只起飞，没有目的地亮点' }] },
  {
    region: '香港',
    country: '中国',
    when: '2 月 8–9 日',
    items: [
      { icon: '🚶', text: '尖沙咀海旁看维港日落' },
      { icon: '🏞', text: '太平山卢吉道看维港' },
    ],
  },
  {
    region: '凯恩斯',
    country: '澳大利亚',
    when: '2 月 10–13 日',
    items: [
      { icon: '🚁', text: '直升机环绕大堡礁' },
      { icon: '🤿', text: '潜水（深浅浮潜均支持）' },
      { icon: '🏞', text: '逛热带雨林（袋鼠谷、帕罗尼拉公园、米拉米拉瀑布）' },
    ],
  },
  {
    region: '悉尼',
    country: '澳大利亚',
    when: '2 月 14–15 日',
    items: [
      { icon: '🚶', text: 'City Walk（悉尼歌剧院、顺路 Australia the Gift 买袋鼠蛋蛋、悉尼大学、海德公园）' },
      { icon: '🏖️', text: '2 月 15 日下午邦迪海滩' },
    ],
  },
  {
    region: '墨尔本',
    country: '澳大利亚',
    when: '2 月 16–17 日',
    items: [
      { icon: '🚶', text: 'City Walk（皇家拱廊、弗林德斯街）' },
      { icon: '🏞', text: '洛克阿德大峡谷' },
      { icon: '🏞', text: '大洋路的十二使徒' },
    ],
  },
  {
    region: '霍巴特',
    country: '澳大利亚',
    when: '2 月 18–20 日',
    items: [
      { icon: '🚶', text: 'City Walk（萨拉曼卡集市、大卫公园）' },
      { icon: '⛴', text: '塔斯曼半岛巡航' },
      { icon: '🦘', text: '塔斯马尼亚恶魔动物园' },
    ],
  },
  {
    region: '基督城',
    country: '新西兰',
    when: '2 月 21–22 日',
    items: [{ icon: '🚶', text: 'City Walk（逛市集、植物园）' }],
  },
  {
    region: '蒂卡波',
    country: '新西兰',
    when: '2 月 23 日',
    items: [
      { icon: '🚶', text: '好牧羊人教堂' },
      { icon: '🌌', text: '银河' },
    ],
  },
  {
    region: '瓦纳卡',
    country: '新西兰',
    when: '2 月 24 日',
    items: [
      { icon: '🎯', text: 'Real Guns' },
      { icon: '🌲', text: '瓦纳卡巨杉' },
      { icon: '🌲', text: '瓦纳卡孤独的树' },
      { icon: '🪂', text: '跳伞' },
      { icon: '🏛', text: '玩具博物馆' },
      { icon: '🚶', text: '箭镇' },
      { icon: '🌌', text: '银河' },
    ],
  },
  {
    region: '皇后镇',
    country: '新西兰',
    when: '2 月 25–28 日',
    items: [
      { icon: '🛳️', text: '米尔福德峡湾' },
      { icon: '🏞', text: '皇后镇公园' },
      { icon: '🚠', text: '天际线' },
      { icon: '🚤', text: '鲨鱼快艇' },
      { icon: '🛩️', text: '固定翼观赏冰川' },
      { icon: '🌌', text: '南极光（极小概率）' },
      { icon: '🌌', text: '银河' },
    ],
  },
];
