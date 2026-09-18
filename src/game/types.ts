import type { Difficulty } from './difficulty'
export type Mode = 'menu' | 'intro' | 'playing' | 'paused' | 'upgrade' | 'gameover' | 'victory'
export type EnemyKind =
  'packet' | 'spinner' | 'guard' | 'charger' | 'leaper' | 'bomber' | 'medic' | 'boss'
export type Action = 'attack' | 'jump' | 'dash' | 'pickup' | 'special'
export type UpgradeId =
  | 'keyboard'
  | 'dash'
  | 'coffee'
  | 'cable'
  | 'cache'
  | 'chain'
  | 'quake'
  | 'leech'
  | 'aerial'
  | 'armor'
  | 'combo'
  | 'throw'
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
  kind: 'crash' | 'sweep' | 'bomb' | 'pounce'
  ownerId?: number
}
export interface Drop extends Point {
  id: number
  kind: 'data' | 'coffee'
  life: number
}
export type HitKind = 'block' | 'light' | 'heavy' | 'counter' | 'finish'
export interface Effect extends Point {
  strike?: number
  radius?: number
  hitKind?: HitKind
  damage?: number
  height?: number
  lane?: number
  id: number
  kind:
    | 'hit'
    | 'break'
    | 'special'
    | 'charge'
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
  maxLevel: number
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
export interface LegacySave {
  version: 1
  stage: number
  score: number
  upgrades: UpgradeId[]
}
export interface RunSave {
  difficulty?: Difficulty
  version: 2
  stage: number
  wave: number
  phase: 'start' | 'draft'
  seed: number
  score: number
  hp: number
  rage: number
  kills: number
  bestCombo: number
  elapsed: number
  bountyScore: number
  clearBonus: number
  upgrades: UpgradeId[]
}
export type SaveData = LegacySave | RunSave
export interface BuildItem extends Upgrade {
  level: number
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
  difficulty: Difficulty
  clearHeal: number
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
  build: BuildItem[]
  completed: number
  total: number
  waveCount: number
}
export type Sound =
  | 'charge'
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
