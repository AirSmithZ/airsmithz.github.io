/** 游玩跟流程图同一批，按当晚住下的城市归段。图标用节点上的游玩种类。 */
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
      { icon: '🚶', text: '星光大道' },
      { icon: '🏞', text: '太平山顶' },
    ],
  },
  {
    region: '凯恩斯',
    country: '澳大利亚',
    when: '2 月 10–13 日',
    items: [
      { icon: '🏞', text: '凯恩斯潟湖' },
      { icon: '⛴', text: '太阳恋人号' },
      { icon: '⛴', text: '摩尔礁' },
      { icon: '🤿', text: '潜水' },
      { icon: '🚁', text: '大堡礁直升机观光' },
      { icon: '🏛', text: '凯恩斯美术馆' },
      { icon: '🏞', text: '市区植物园' },
      { icon: '🏞', text: '惠特菲尔德（可选）' },
      { icon: '🏛', text: '装甲博物馆' },
      { icon: '🏖️', text: '棕榈湾海滩' },
      { icon: '🏞', text: '金字塔山' },
      { icon: '🦘', text: '袋鼠谷' },
      { icon: '🏞', text: '帕罗尼拉公园' },
      { icon: '🏞', text: '米拉米拉瀑布' },
    ],
  },
  {
    region: '悉尼',
    country: '澳大利亚',
    when: '2 月 14–15 日',
    items: [
      { icon: '🛍', text: 'Australia the Gift' },
      { icon: '🚶', text: '悉尼歌剧院' },
      { icon: '🚶', text: '海德公园' },
      { icon: '🚶', text: '悉尼大学主校区' },
      { icon: '🏖️', text: '邦迪海滩' },
    ],
  },
  {
    region: '墨尔本',
    country: '澳大利亚',
    when: '2 月 16–17 日',
    items: [
      { icon: '🚶', text: '弗林德斯火车站' },
      { icon: '🚶', text: '圣保罗大教堂' },
      { icon: '🚶', text: '皇家拱廊' },
      { icon: '🚶', text: '维多利亚图书馆' },
      { icon: '🏞', text: '吉布森石阶' },
      { icon: '🏞', text: '十二使徒' },
      { icon: '🦘', text: 'Great Ocean Road Wildlife Park （可选）' },
      { icon: '🏞', text: '洛克阿德大峡谷' },
    ],
  },
  {
    region: '霍巴特',
    country: '澳大利亚',
    when: '2 月 18–20 日',
    items: [
      { icon: '⛴', text: 'Pennicott Wilderness Journeys' },
      { icon: '🚶', text: '亚瑟港' },
      { icon: '🏞', text: '皮勒角' },
      { icon: '🏞', text: '鹰颈峡' },
      { icon: '🦘', text: 'Tasmanian Devil Unzoo' },
      { icon: '🧺', text: '萨拉曼卡集市' },
      { icon: '🚶', text: '大卫公园' },
    ],
  },
  {
    region: '基督城',
    country: '新西兰',
    when: '2 月 21–22 日',
    items: [
      { icon: '🧺', text: 'Riverside Market' },
      { icon: '🚶', text: '植物园' },
      { icon: '🛍', text: 'Westfield Riccarton' },
      { icon: '🚜', text: 'Warwickz Farm' },
    ],
  },
  {
    region: '蒂卡波',
    country: '新西兰',
    when: '2 月 23 日',
    items: [
      { icon: '🏞', text: '伯克斯山口' },
      { icon: '🚶', text: '好牧羊人教堂' },
      { icon: '🌌', text: '教堂外看银河（可选）' },
    ],
  },
  {
    region: '瓦纳卡',
    country: '新西兰',
    when: '2 月 24 日',
    items: [
      { icon: '🏞', text: '普卡基' },
      { icon: '🚶', text: '特威泽尔' },
      { icon: '🚶', text: '奥马鲁阿玛' },
      { icon: '🏞', text: '林迪斯山口' },
      { icon: '🚶', text: '塔拉斯' },
      { icon: '🎯', text: 'Real Guns' },
      { icon: '🏞', text: '瓦纳卡巨杉' },
      { icon: '🏞', text: '瓦纳卡孤独的树' },
    ],
  },
  {
    region: '皇后镇',
    country: '新西兰',
    when: '2 月 25–28 日',
    items: [
      { icon: '🪂', text: '瓦纳卡跳伞' },
      { icon: '🏛', text: '国家交通与玩具博物馆' },
      { icon: '🚶', text: '卡德罗纳' },
      { icon: '🏞', text: '皇冠山脉' },
      { icon: '🏞', text: '皇冠山脉鞍部' },
      { icon: '🚶', text: '箭镇' },
      { icon: '🚤', text: '鲨鱼快艇' },
      { icon: '🦘', text: '几维鸟园' },
      { icon: '🚠', text: '天际线缆车' },
      { icon: '🛷', text: '天际线滑板' },
      { icon: '🚶', text: '皇后镇公园' },
      { icon: '🛩️', text: 'Milford Sound Scenic Flights Hangar' },
      { icon: '🛳️', text: '峡湾游船' },
    ],
  },
];
