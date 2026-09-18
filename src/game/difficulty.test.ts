import { describe, expect, it } from 'vitest'
import { DIFFICULTIES, type Difficulty } from './difficulty'
import { Game } from './simulation'
import type { RunSave } from './types'

function gameAt(difficulty: Difficulty) {
  const game = new Game()
  game.start(undefined, difficulty)
  game.begin()
  return game
}

describe('difficulty', () => {
  it('defaults new runs to Standard and keeps old saves on original balance', () => {
    const game = new Game()
    game.start()
    expect(game.difficulty).toBe('standard')
    game.start({ version: 1, stage: 1, score: 0, upgrades: [] }, 'nightmare')
    expect(game.difficulty).toBe('casual')
  })
  it('raises health, damage, crowd size and pressure across all four modes', () => {
    const samples = Object.keys(DIFFICULTIES).map((id) => {
      const game = gameAt(id as Difficulty)
      game['damageHero'](10, { x: 0, z: 0 })
      return {
        hp: game.enemies[0]!.maxHp,
        taken: 100 - game.hero.hp,
        total: game.waveTotal,
        attackers: game.rules.attackers,
        crowd: game.crowdLimit,
        delay: game.rules.cooldown,
      }
    })
    for (let i = 1; i < samples.length; i++) {
      for (const key of ['hp', 'taken', 'total', 'attackers', 'crowd'] as const)
        expect(samples[i]![key]).toBeGreaterThan(samples[i - 1]![key])
      expect(samples[i]!.delay).toBeLessThan(samples[i - 1]!.delay)
    }
  })
  it('keeps late streets challenging as buffs accumulate', () => {
    const game = gameAt('nightmare')
    const first = game.enemies[0]!.maxHp
    game.stage = 4
    game.wave = 4
    const late = game['actor']('packet', 0, 0)
    expect(late.maxHp).toBeGreaterThan(first * 2)
    expect(game.crowdLimit).toBeLessThanOrEqual(13)
  })
  it('applies faster windup, movement and attack cadence, while leaving warnings readable', () => {
    const results = (['casual', 'nightmare'] as const).map((id) => {
      const game = gameAt(id)
      const enemy = game.enemies[0]!
      game.enemies = [enemy]
      Object.assign(enemy, { x: game.hero.x + 1, z: 0, cooldown: 0 })
      game['updateEnemies'](0.01)
      const windup = enemy.windup
      game['enemyAttack'](enemy)
      const cooldown = enemy.cooldown
      Object.assign(enemy, { x: game.hero.x + 8, attack: 0, windup: 0, cooldown: 10 })
      const before = enemy.x
      game['updateEnemies'](0.04)
      return { windup, cooldown, movement: before - enemy.x }
    })
    expect(results[1]!.windup).toBeCloseTo(0.45)
    expect(results[1]!.windup).toBeLessThan(results[0]!.windup)
    expect(results[1]!.cooldown).toBeLessThan(results[0]!.cooldown)
    expect(results[1]!.movement).toBeGreaterThan(results[0]!.movement)
  })
  it.each(Object.keys(DIFFICULTIES) as Difficulty[])(
    'scales coffee and clear healing in %s',
    (difficulty) => {
      const game = gameAt(difficulty)
      game.hero.hp = 30
      game['collectDrop']({ id: 1000, x: 0, z: 0, life: 1, kind: 'coffee' })
      expect(game.hero.hp).toBeCloseTo(30 + 22 * game.rules.healing)
      const before = game.hero.hp
      game.mode = 'upgrade'
      game.choices = game.choices.filter((choice) => choice.id !== 'coffee')
      game.choose(game.choices[0]!.id)
      expect(game.hero.hp).toBeCloseTo(before + 100 * game.rules.clearHeal)
    },
  )
  it('persists difficulty through draft, continue and retry regardless of the menu selection', () => {
    const game = gameAt('hard')
    let saved: RunSave | undefined
    game.onCheckpoint = (save) => {
      if (save.version === 2) saved = save
    }
    game.enemies = []
    game.reserves = []
    for (let i = 0; i < 60; i++)
      game.tick(1 / 60, { x: 0, z: 0, attack: false, pressed: new Set() })
    expect(saved?.difficulty).toBe('hard')
    const restored = new Game()
    restored.start(saved, 'casual')
    expect(restored.mode).toBe('upgrade')
    expect(restored.difficulty).toBe('hard')
    restored.choose(restored.choices[0]!.id)
    restored.retry()
    expect(restored.difficulty).toBe('hard')
    expect(restored.wave).toBe(1)
  })
})
