import { STAGES, UPGRADES } from './content'
import type { SaveData } from './types'
const SAVE_KEY = 'vast-offline-save-v1'
const BEST_KEY = 'vast-offline-best-v1'

export function readSave(): SaveData | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    if (!data || typeof data !== 'object') return null
    const s = data as SaveData
    if (s.version !== 1 || !Number.isInteger(s.stage) || s.stage < 0 || s.stage >= STAGES.length)
      return null
    if (!Number.isFinite(s.score) || s.score < 0 || !Array.isArray(s.upgrades)) return null
    if (s.upgrades.length >= STAGES.length || new Set(s.upgrades).size !== s.upgrades.length)
      return null
    if (!s.upgrades.every((id) => UPGRADES.some((upgrade) => upgrade.id === id))) return null
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
export function readBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0)
  } catch {
    return 0
  }
}
export function writeBest(score: number) {
  try {
    localStorage.setItem(BEST_KEY, String(Math.max(readBest(), score)))
  } catch {
    /* Storage is optional. */
  }
}
