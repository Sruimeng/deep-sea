import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunSave } from './types'
import { clearSave, readBest, readSave, writeBest, writeSave } from './storage'
const entries = new Map<string, string>()
beforeEach(() => {
  entries.clear()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  })
})
describe('save data', () => {
  it('round trips a stage checkpoint and deletes it on completion', () => {
    const save = { version: 1 as const, stage: 4, score: 2500, upgrades: ['keyboard' as const] }
    writeSave(save)
    expect(readSave()).toEqual(save)
    clearSave()
    expect(readSave()).toBeNull()
  })
  it.each([
    '{broken',
    'null',
    '{"version":1,"stage":5,"score":0,"upgrades":[]}',
    '{"version":1,"stage":0,"score":-1,"upgrades":[]}',
    '{"version":1,"stage":0,"score":0,"upgrades":["godmode"]}',
    '{"version":1,"stage":0,"score":0,"upgrades":["coffee","coffee"]}',
  ])('rejects invalid storage: %s', (text) => {
    entries.set('vast-offline-save-v1', text)
    expect(readSave()).toBeNull()
  })
  const run: RunSave = {
    version: 2,
    stage: 1,
    wave: 3,
    phase: 'draft',
    seed: 123,
    score: 5200,
    hp: 128,
    rage: 62,
    kills: 58,
    bestCombo: 30,
    elapsed: 120,
    bountyScore: 900,
    clearBonus: 0,
    upgrades: ['coffee', 'coffee', 'chain'],
  }
  it('round trips a stacked mid-city draft checkpoint', () => {
    writeSave(run)
    expect(readSave()).toEqual(run)
  })
  it.each([
    { wave: 6 },
    { wave: -1 },
    { phase: 'playing' },
    { seed: -1 },
    { seed: 1.5 },
    { hp: 0 },
    { hp: 171 },
    { rage: 101 },
    { elapsed: null },
    { bestCombo: -1 },
    { upgrades: Array(6).fill('coffee') },
    { stage: 0, wave: 0 },
  ])('rejects invalid v2 checkpoint fields: %j', (invalid) => {
    entries.set('vast-offline-save-v1', JSON.stringify({ ...run, ...invalid }))
    expect(readSave()).toBeNull()
  })
  it('retains the highest completed score', () => {
    writeBest(2000)
    writeBest(100)
    expect(readBest()).toBe(2000)
  })
  it('keeps high scores separate for each difficulty', () => {
    writeBest(5000, 'casual')
    writeBest(1000, 'hard')
    writeBest(900, 'hard')
    expect(readBest('casual')).toBe(5000)
    expect(readBest('hard')).toBe(1000)
    expect(readBest('nightmare')).toBe(0)
  })
  it('accepts old v2 saves but rejects unknown difficulty values', () => {
    writeSave(run)
    expect(readSave()).not.toBeNull()
    entries.set('vast-offline-save-v1', JSON.stringify({ ...run, difficulty: 'impossible' }))
    expect(readSave()).toBeNull()
    writeSave({ ...run, difficulty: 'nightmare' })
    expect(readSave()).toEqual({ ...run, difficulty: 'nightmare' })
  })
  it('works when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw Error('blocked')
      },
      setItem() {
        throw Error('blocked')
      },
      removeItem() {
        throw Error('blocked')
      },
    })
    expect(readSave()).toBeNull()
    expect(readBest()).toBe(0)
    expect(() => writeSave({ version: 1, stage: 0, score: 0, upgrades: [] })).not.toThrow()
    expect(clearSave).not.toThrow()
  })
})
