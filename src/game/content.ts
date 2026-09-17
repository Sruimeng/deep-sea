import type { EnemyKind, Stage, Upgrade } from './types'

const mob = (count: number, ...specialists: EnemyKind[]): EnemyKind[] => {
  const kinds: EnemyKind[] = Array.from({ length: count }, () => 'packet')
  specialists.forEach((kind, index) => kinds.splice(Math.min(2 + index * 3, kinds.length), 0, kind))
  return kinds
}

export const ENEMY_NAMES: Record<EnemyKind, string> = {
  packet: '丢包蟹',
  spinner: '加载眼',
  guard: '防火墙铁卫',
  charger: '咖啡冲撞兽',
  leaper: '弹窗跳蚤',
  bomber: '缓存投弹手',
  medic: '补丁维修蜂',
  boss: '路由猩猩',
}

export const ENEMY_HINTS: Partial<Record<EnemyKind, string>> = {
  leaper: '离开紫圈，出拳可打断跳砸',
  bomber: '避开橙圈，贴身打断投弹',
  medic: '绿圈正在修复同伴，优先击破',
}

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
      '北京办公室，18:01。红墙外的灯笼亮了，上传还卡在 99%。拆开快递的瞬间，丢包蟹扑了出来。穿过夜市赶上末班地铁。紫色弹窗跳蚤锁定落点扑来，出拳打断它，再用三段连击把它打回包裹里。',
    waves: [
      mob(5, 'leaper'),
      mob(6, 'spinner', 'leaper', 'bomber'),
      mob(8, 'guard', 'charger', 'leaper', 'bomber'),
    ],
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
      '玻璃幕墙外是浦江夜色，幕墙内是第八次视频重连。悬浮加载眼保持距离发射环形弹幕。从货运码头一路打上屋顶。投弹手封锁落脚点，维修蜂在后排回血；冲刺穿过弹幕，先拆掉支援。',
    waves: [
      mob(4, 'spinner', 'spinner', 'bomber', 'leaper'),
      mob(7, 'spinner', 'charger', 'bomber', 'medic', 'leaper'),
      mob(8, 'guard', 'spinner', 'bomber', 'charger', 'medic', 'leaper'),
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
      '茶还没凉，带宽先凉了。竹影下的防火墙铁卫举着护盾。绕后出拳，或跳起飞踢击破正面防守。穿过西湖长桥，打进龙井茶园。维修蜂会给铁卫回血，别让它躲在后排。',
    waves: [
      mob(6, 'guard', 'leaper', 'medic', 'spinner'),
      mob(8, 'guard', 'charger', 'spinner', 'guard', 'medic', 'leaper'),
      mob(10, 'guard', 'guard', 'spinner', 'leaper', 'medic', 'bomber'),
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
      '海岸露台，跨洋会议。咖啡机吸满了延迟，变成红色冲撞兽。看到冲锋线就向侧面让开，趁它刹车时反击。沿游乐栈道追到公路餐车站，还要留意跳砸和地上的延时炸弹。',
    waves: [
      mob(7, 'charger', 'charger', 'leaper', 'spinner', 'bomber'),
      mob(10, 'charger', 'charger', 'spinner', 'guard', 'bomber', 'leaper'),
      mob(12, 'guard', 'charger', 'spinner', 'charger', 'medic', 'leaper'),
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
      '所有故障都指向深圳机房。巨型路由猩猩吞掉了五地的带宽。穿过物流装卸区打进核心大厅。躲开红色预警，跳过网线横扫；护盾亮起时先砸掉两侧中继器。',
    waves: [
      mob(8, 'guard', 'spinner', 'charger', 'bomber', 'medic', 'leaper'),
      mob(12, 'guard', 'charger', 'spinner', 'charger', 'medic', 'leaper'),
      ['boss', ...mob(5, 'spinner', 'leaper', 'bomber')],
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
  leaper: { hp: 54, speed: 2.35, damage: 12, range: 5.5, windup: 0.8, cooldown: 2.8 },
  bomber: { hp: 48, speed: 1.25, damage: 14, range: 8, windup: 1.0, cooldown: 3.6 },
  medic: { hp: 42, speed: 1.15, damage: 0, range: 4.5, windup: 1.15, cooldown: 4.2 },
  boss: { hp: 650, speed: 0.9, damage: 18, range: 5, windup: 1.15, cooldown: 2.8 },
}
