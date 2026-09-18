import { isDifficulty, type Difficulty } from './difficulty'
import { STAGES, UPGRADES } from './content'
import { completedBefore, levelOf } from './roguelike'
import type { SaveData } from './types'
const SAVE_KEY = 'vast-offline-save-v1'
const BEST_KEY = 'vast-offline-best-v1'

export function readSave(): SaveData | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    if (!data || typeof data !== 'object') return null
    const s = data as SaveData
    if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage >= STAGES.length) return null
    if (!Number.isFinite(s.score) || s.score < 0 || !Array.isArray(s.upgrades)) return null
    if (!s.upgrades.every((id) => UPGRADES.some((upgrade) => upgrade.id === id))) return null
    if (s.version === 1) {
      if (s.upgrades.length >= STAGES.length || new Set(s.upgrades).size !== s.upgrades.length)
        return null
    } else if (s.version === 2) {
      if (s.difficulty !== undefined && !isDifficulty(s.difficulty)) return null
      if (!Number.isInteger(s.wave) || s.wave < 0 || s.wave >= STAGES[s.stage]!.waves.length)
        return null
      if (s.phase !== 'start' && s.phase !== 'draft') return null
      if (!Number.isInteger(s.seed) || s.seed < 0 || s.seed > 0xffffffff) return null
      if (
        ![s.hp, s.rage, s.kills, s.bestCombo, s.elapsed, s.bountyScore, s.clearBonus].every(
          (value) => Number.isFinite(value) && value >= 0,
        )
      )
        return null
      if (s.hp <= 0 || s.hp > 100 + levelOf(s.upgrades, 'coffee') * 35 || s.rage > 100) return null
      if (!Number.isInteger(s.kills) || !Number.isInteger(s.bestCombo)) return null
      if (s.upgrades.length > completedBefore(s.stage, s.wave)) return null
      if (UPGRADES.some((item) => s.upgrades.filter((id) => id === item.id).length > item.maxLevel))
        return null
    } else return null
    return s
  } catch {
    return null
  }
}
export function writeSave(save: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    /* Private browsing may reject persistence. */
  }
}
export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* Storage is optional. */
  }
}
export function readBest(difficulty: Difficulty = 'casual') {
  try {
    return Math.max(
      0,
      Number(
        localStorage.getItem(difficulty === 'casual' ? BEST_KEY : `${BEST_KEY}-${difficulty}`),
      ) || 0,
    )
  } catch {
    return 0
  }
}
export function writeBest(score: number, difficulty: Difficulty = 'casual') {
  try {
    localStorage.setItem(
      difficulty === 'casual' ? BEST_KEY : `${BEST_KEY}-${difficulty}`,
      String(Math.max(readBest(difficulty), score)),
    )
  } catch {
    /* Storage is optional. */
  }
}
