export type Difficulty = 'casual' | 'standard' | 'hard' | 'nightmare'
export interface DifficultyRules {
  id: Difficulty
  name: string
  description: string
  health: number
  growth: number
  damage: number
  speed: number
  windup: number
  cooldown: number
  attackers: number
  crowd: number
  extraEnemies: number
  healing: number
  clearHeal: number
}

export const DIFFICULTIES: Record<Difficulty, DifficultyRules> = {
  casual: {
    id: 'casual',
    name: '休闲',
    description: '原版强度 · 2 人进攻 · 清场回复 20%',
    health: 1,
    growth: 0,
    damage: 1,
    speed: 1,
    windup: 1,
    cooldown: 1,
    attackers: 2,
    crowd: 0,
    extraEnemies: 0,
    healing: 1,
    clearHeal: 0.2,
  },
  standard: {
    id: 'standard',
    name: '标准',
    description: '强化敌群 · 3 人进攻 · 清场回复 15%',
    health: 1.15,
    growth: 0.12,
    damage: 1.2,
    speed: 1.08,
    windup: 0.95,
    cooldown: 0.9,
    attackers: 3,
    crowd: 1,
    extraEnemies: 1,
    healing: 0.85,
    clearHeal: 0.15,
  },
  hard: {
    id: 'hard',
    name: '困难',
    description: '精英增援 · 4 人进攻 · 清场回复 8%',
    health: 1.4,
    growth: 0.2,
    damage: 1.6,
    speed: 1.2,
    windup: 0.85,
    cooldown: 0.72,
    attackers: 4,
    crowd: 2,
    extraEnemies: 3,
    healing: 0.6,
    clearHeal: 0.08,
  },
  nightmare: {
    id: 'nightmare',
    name: '噩梦',
    description: '高压围攻 · 5 人进攻 · 清场不回血',
    health: 1.75,
    growth: 0.3,
    damage: 2.1,
    speed: 1.32,
    windup: 0.75,
    cooldown: 0.58,
    attackers: 5,
    crowd: 3,
    extraEnemies: 5,
    healing: 0.4,
    clearHeal: 0,
  },
}
export const isDifficulty = (value: unknown): value is Difficulty =>
  typeof value === 'string' && Object.hasOwn(DIFFICULTIES, value)
