import type { EnemyKind, Stage, Upgrade } from './types'

const mob = (count: number, ...specialists: EnemyKind[]): EnemyKind[] => [
  ...Array.from({ length: count }, (): EnemyKind => 'packet'),
  ...specialists,
]

export const STAGES: Stage[] = [
  {
    city: 'beijing',
    cityName: '北京',
    time: '18:01',
    landmark: '胡同 · 红墙 · 灰瓦',
    name: '胡同断线事件',
    subtitle: '胡同九拐，拳头直来。',
    location: '01 / BEIJING',
    color: '#f9cf00',
    story:
      '北京办公室，18:01。红墙外的灯笼亮了，上传还卡在 99%。拆开快递的瞬间，丢包蟹扑了出来。三段连击把它们打回包裹里。',
    waves: [mob(6), mob(7, 'spinner', 'spinner'), mob(10, 'guard', 'charger')],
  },
  {
    city: 'shanghai',
    cityName: '上海',
    time: '19:20',
    landmark: '浦江 · 天际线 · 玻璃幕墙',
    name: '外滩加载风暴',
    subtitle: '浦江灯火亮，会议连不上。',
    location: '02 / SHANGHAI',
    color: '#83cfff',
    story:
      '玻璃幕墙外是浦江夜色，幕墙内是第八次视频重连。悬浮加载眼保持距离发射环形弹幕。利用冲刺接近它，再把键盘扔出去。',
    waves: [
      mob(6, 'spinner', 'spinner'),
      mob(9, 'spinner', 'charger', 'spinner'),
      mob(10, 'guard', 'spinner', 'spinner', 'charger'),
    ],
  },
  {
    city: 'hangzhou',
    cityName: '杭州',
    time: '16:45',
    landmark: '西湖 · 竹影 · 曲桥',
    name: '西湖限速结界',
    subtitle: '湖面很平，心态不平。',
    location: '03 / HANGZHOU',
    color: '#86d9b2',
    story:
      '茶还没凉，带宽先凉了。竹影下的防火墙铁卫举着护盾。绕后出拳，或跳起飞踢击破正面防守。院外的西湖今天救不了你的心态。',
    waves: [
      mob(7, 'guard', 'packet', 'spinner'),
      mob(10, 'guard', 'charger', 'spinner', 'guard'),
      mob(12, 'guard', 'guard', 'spinner', 'charger'),
    ],
  },
  {
    city: 'california',
    cityName: '加州',
    time: '17:30',
    landmark: '落日 · 棕榈 · 金门大桥',
    name: '落日咖啡暴走',
    subtitle: '时差倒完了，服务器倒了。',
    location: '04 / CALIFORNIA',
    color: '#ffac7c',
    story:
      '海岸露台，跨洋会议。咖啡机吸满了延迟，变成红色冲撞兽。看到冲锋线就向侧面让开，趁它刹车时反击。',
    waves: [
      mob(9, 'charger', 'packet', 'spinner'),
      mob(12, 'charger', 'charger', 'spinner', 'guard'),
      mob(14, 'guard', 'charger', 'spinner', 'charger'),
    ],
  },
  {
    city: 'shenzhen',
    cityName: '深圳',
    time: '22:08',
    landmark: '平安金融中心 · 电路 · 机房',
    name: '湾区终极重连',
    subtitle: '五地连线，只差这一拳。',
    location: '05 / SHENZHEN',
    color: '#a79bec',
    story:
      '所有故障都指向深圳机房。巨型路由猩猩吞掉了五地的带宽。躲开红色预警，跳过网线横扫；护盾亮起时先砸掉两侧中继器。',
    waves: [
      mob(11, 'guard', 'spinner', 'charger'),
      mob(14, 'guard', 'charger', 'spinner', 'charger'),
      ['boss', ...mob(8)],
    ],
  },
]

export const UPGRADES: Upgrade[] = [
  {
    id: 'keyboard',
    name: '机械键盘',
    label: 'DAMAGE +',
    description: '连击伤害 +35%，第三击的击退更强。',
    icon: '⌨',
  },
  {
    id: 'dash',
    name: '带薪冲刺',
    label: 'DASH +',
    description: '冲刺撞伤沿途敌人，冷却缩短至 0.7 秒。',
    icon: '↗',
  },
  {
    id: 'coffee',
    name: '无限续杯',
    label: 'HEALTH +',
    description: '生命上限 +35，立即回满；咖啡回复更多。',
    icon: '♨',
  },
  {
    id: 'cable',
    name: '有线连接',
    label: 'SPECIAL +',
    description: '大招范围扩大、伤害提高，命中积攒更多怒气。',
    icon: 'ϟ',
  },
  {
    id: 'cache',
    name: '本地缓存',
    label: 'SECOND CHANCE',
    description: '每关首次倒地时，恢复 50% 生命并击退敌人。',
    icon: '↻',
  },
]

export const WEAPON_NAMES = {
  keyboard: '机械键盘',
  chair: '人体工学椅',
  box: '快递纸箱',
  relay: '中继器',
}
export const ENEMY_STATS = {
  packet: { hp: 80, speed: 2.0, damage: 9, range: 1.35, windup: 0.6, cooldown: 1.5 },
  spinner: { hp: 45, speed: 1.45, damage: 8, range: 8, windup: 0.9, cooldown: 2.7 },
  guard: { hp: 100, speed: 1.15, damage: 14, range: 1.7, windup: 0.85, cooldown: 2.1 },
  charger: { hp: 74, speed: 1.7, damage: 15, range: 7, windup: 0.95, cooldown: 2.8 },
  boss: { hp: 650, speed: 0.9, damage: 18, range: 5, windup: 1.15, cooldown: 2.8 },
}
