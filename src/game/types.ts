export type Mode = 'menu' | 'intro' | 'playing' | 'paused' | 'upgrade' | 'gameover' | 'victory'
export type EnemyKind = 'packet' | 'spinner' | 'guard' | 'charger' | 'boss'
export type Action = 'attack' | 'jump' | 'dash' | 'pickup' | 'special'
export type UpgradeId = 'keyboard' | 'dash' | 'coffee' | 'cable' | 'cache'
export interface Point {
  x: number
  z: number
}
export interface Actor extends Point {
  id: number
  kind: 'hero' | EnemyKind
  y: number
  vy: number
  vx: number
  vz: number
  facing: number
  hp: number
  maxHp: number
  hurt: number
  attack: number
  cooldown: number
  windup: number
  target: Point
  dead: number
  walk: number
  strike: number
  attackId: number
  attackDuration: number
  launchTime: number
  airHits: number
  collisionHits: number[]
}
export interface Prop extends Point {
  id: number
  kind: 'keyboard' | 'chair' | 'box' | 'relay'
  hp: number
  broken: boolean
}
export interface Projectile extends Point {
  id: number
  vx: number
  vz: number
  y: number
  life: number
  friendly: boolean
  kind: 'keyboard' | 'chair' | 'box' | 'ring'
  hit: number[]
}
export interface Zone extends Point {
  id: number
  radius: number
  life: number
  duration: number
  fired: boolean
  kind: 'crash' | 'sweep'
}
export interface Drop extends Point {
  id: number
  kind: 'data' | 'coffee'
  life: number
}
export type HitKind = 'block' | 'light' | 'heavy' | 'counter' | 'finish'
export interface Effect extends Point {
  hitKind?: HitKind
  damage?: number
  height?: number
  lane?: number
  id: number
  kind:
    | 'hit'
    | 'break'
    | 'special'
    | 'text'
    | 'heal'
    | 'dash'
    | 'slash'
    | 'impact'
    | 'reward'
    | 'damage'
  life: number
  duration: number
  color: string
  text?: string
  facing?: number
  power?: number
}
export interface Controls {
  x: number
  z: number
  attack: boolean
  pressed: Set<Action>
}
export interface Upgrade {
  id: UpgradeId
  name: string
  label: string
  description: string
  icon: string
}
export type City = 'beijing' | 'shanghai' | 'hangzhou' | 'california' | 'shenzhen'
export interface Stage {
  city: City
  cityName: string
  time: string
  landmark: string
  name: string
  subtitle: string
  location: string
  color: string
  story: string
  waves: EnemyKind[][]
}
export interface SaveData {
  version: 1
  stage: number
  score: number
  upgrades: UpgradeId[]
}
export interface CombatReward {
  id: number
  kind: 'guard' | 'charger' | 'boss'
  label: string
  score: number
  health: number
  rage: number
  life: number
}
export interface Milestone {
  title: string
  count: number
  bonus: number
  life: number
}
export interface Snapshot {
  advancing: boolean
  pursuitReady: boolean
  reserves: number
  waveTotal: number
  waveKills: number
  milestone: Milestone | null
  rewards: CombatReward[]
  bountyScore: number
  clearBonus: number
  mode: Mode
  stage: number
  wave: number
  hp: number
  maxHp: number
  rage: number
  score: number
  combo: number
  comboDamage: number
  bestCombo: number
  kills: number
  enemies: number
  weapon: string
  weaponUses: number
  bossHp: number
  bossMaxHp: number
  shield: boolean
  toast: string
  toastTime: number
  elapsed: number
  dashReady: boolean
  choices: Upgrade[]
}
export type Sound =
  | 'swing'
  | 'block'
  | 'punch'
  | 'heavy'
  | 'counter'
  | 'finish'
  | 'hurt'
  | 'jump'
  | 'dash'
  | 'pickup'
  | 'reward'
  | 'break'
  | 'special'
  | 'win'
  | 'warn'
  | 'shoot'
