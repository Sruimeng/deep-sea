import { STAGES, UPGRADES } from './content'
import type { UpgradeId } from './types'

export const levelOf = (upgrades: readonly UpgradeId[], id: UpgradeId) =>
  Math.min(
    UPGRADES.find((item) => item.id === id)!.maxLevel,
    upgrades.filter((item) => item === id).length,
  )

export const completedBefore = (stage: number, wave: number) =>
  STAGES.slice(0, stage).reduce((total, item) => total + item.waves.length, 0) + wave

export const TOTAL_BLOCKS = STAGES.reduce((total, stage) => total + stage.waves.length, 0)

export function draftChoices(
  upgrades: readonly UpgradeId[],
  seed: number,
  stage: number,
  wave: number,
) {
  let state = (seed ^ Math.imul(completedBefore(stage, wave) + 1, 0x9e3779b9)) >>> 0
  const pool = UPGRADES.filter((item) => levelOf(upgrades, item.id) < item.maxLevel)
  for (let i = pool.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, 3)
}

export function upgradeBenefit(id: UpgradeId, level: number): string {
  switch (id) {
    case 'keyboard':
      return `拳脚伤害 +${35 * level}%`
    case 'dash':
      return `冲刺伤害 ${15 + 10 * level} · 冷却 ${Math.max(0.38, 0.78 - level * 0.08).toFixed(2)} 秒`
    case 'coffee':
      return `生命上限 ${100 + 35 * level} · 咖啡回复 ${22 + 13 * level}`
    case 'cable':
      return `大招 ${80 + 30 * level} 伤害 / 12 米 · 命中怒气 +${8 + 3 * level}`
    case 'cache':
      return `每小关复活 1 次 · 恢复 ${40 + 10 * level}% 生命`
    case 'chain':
      return `每 4 次直击 → 电击 3 个目标，各 ${12 * level} 伤害`
    case 'quake':
      return `终结拳震波 ${10 * level} 伤害 / 3.6 米`
    case 'leech':
      return `每次击破回复 ${2 * level} 生命`
    case 'aerial':
      return `飞踢、追击伤害 +${30 * level}%`
    case 'armor':
      return `受到伤害 −${8 * level}%`
    case 'combo':
      return `每 5 连击增伤 ${5 * level}% · 上限 ${20 * level}%`
    case 'throw':
      return `投掷 ${55 + 25 * level} 伤害 · 武器耐久 ${7 + 2 * level}`
  }
}
