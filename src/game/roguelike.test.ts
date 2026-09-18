import { describe, expect, it, vi } from 'vitest'
import { STAGES, UPGRADES } from './content'
import { CITY_BLOCKS } from './blocks'
import { completedBefore, draftChoices, levelOf, TOTAL_BLOCKS } from './roguelike'
import { Game } from './simulation'
import type { Actor, Controls, RunSave, UpgradeId } from './types'

const idle: Controls = { x: 0, z: 0, attack: false, pressed: new Set() }
const tick = (game: Game, seconds = 1) => {
  for (let i = 0; i < seconds * 60; i++) game.tick(1 / 60, idle)
}
function playing(upgrades: UpgradeId[] = []) {
  const game = new Game()
  game.start(undefined, 'casual')
  game.seed = 27
  game.upgrades = upgrades
  game.begin()
  return game
}
function clear(game: Game) {
  game.enemies = []
  game.reserves = []
  tick(game)
}
function hit(game: Game, enemy: Actor, damage = 1, charge = true) {
  game['hitEnemy'](enemy, damage, 1, true, charge)
}

describe('campaign growth', () => {
  it('has 30 matched encounters and locations, with only one final boss', () => {
    expect(TOTAL_BLOCKS).toBe(30)
    for (const stage of STAGES) {
      expect(stage.waves).toHaveLength(6)
      expect(CITY_BLOCKS[stage.city]).toHaveLength(stage.waves.length)
    }
    expect(
      STAGES.flatMap((stage) => stage.waves.flat()).filter((id) => id === 'boss'),
    ).toHaveLength(1)
    expect(STAGES.at(-1)!.waves.at(-1)).toContain('boss')
  })
  it('offers three distinct deterministic choices, varies by run, and excludes capped buffs', () => {
    const upgrades: UpgradeId[] = Array(5).fill('keyboard')
    const draft = draftChoices(upgrades, 42, 0, 2)
    expect(draft).toEqual(draftChoices(upgrades, 42, 0, 2))
    expect(new Set(draft.map((item) => item.id)).size).toBe(3)
    expect(draft.some((item) => item.id === 'keyboard')).toBe(false)
    expect(
      new Set(
        Array.from({ length: 10 }, (_, seed) =>
          draftChoices(upgrades, seed, 0, 2)
            .map((item) => item.id)
            .join(),
        ),
      ).size,
    ).toBeGreaterThan(5)
  })
  it('retains at least three available options through every legal 30-choice build', () => {
    for (let seed = 0; seed < 20; seed++) {
      const upgrades: UpgradeId[] = []
      STAGES.forEach((stage, city) =>
        stage.waves.forEach((_, wave) => {
          const choices = draftChoices(upgrades, seed, city, wave)
          expect(choices).toHaveLength(3)
          upgrades.push(choices[0]!.id)
        }),
      )
      expect(upgrades).toHaveLength(30)
      expect(UPGRADES.every((item) => levelOf(upgrades, item.id) <= 5)).toBe(true)
    }
  })
  it('pauses each draft and preserves candidates, health and score across reload', () => {
    const game = playing()
    const checkpoint = vi.fn()
    game.onCheckpoint = checkpoint
    game.hero.hp = 61
    game.rage = 33
    game.waveKills = 6
    clear(game)
    const save = checkpoint.mock.lastCall![0] as RunSave
    expect(save.phase).toBe('draft')
    const restored = new Game()
    restored.start(save)
    expect(restored.mode).toBe('upgrade')
    expect(restored.choices).toEqual(game.choices)
    expect(restored.hero.hp).toBe(61)
    const score = restored.score
    tick(restored, 4)
    expect(restored.score).toBe(score)
    expect(restored.rage).toBe(33)
    restored.choose(restored.choices[0]!.id)
    restored.choose(restored.choices[0]?.id ?? 'coffee')
    expect(restored.upgrades).toHaveLength(1)
    expect(restored.advancing).toBe(true)
    restored.retry()
    expect(restored.wave).toBe(1)
    expect(restored.mode).toBe('intro')
    expect(restored.upgrades).toHaveLength(1)
    expect(restored.score).toBe(score)
  })
  it('stacks a chosen buff and resumes the next block without losing its level', () => {
    const game = playing(['coffee'])
    game.hero.maxHp = 135
    clear(game)
    game.choices = [UPGRADES.find((item) => item.id === 'coffee')!]
    game.choose('coffee')
    expect(game.hero.maxHp).toBe(170)
    expect(game.hero.hp).toBe(170)
    game.retry()
    expect(game.level('coffee')).toBe(2)
    expect(game.hero.maxHp).toBe(170)
    expect(game.wave).toBe(1)
    expect(game.hero.x).toBe(21)
  })
  it('starts a fresh run without the previous build and migrates legacy saves', () => {
    const game = playing(['coffee', 'chain'])
    game.start({ version: 1, stage: 2, score: 100, upgrades: ['keyboard', 'coffee'] })
    expect(game.wave).toBe(0)
    expect(game.hero.maxHp).toBe(135)
    game.start(undefined, 'casual')
    expect(game.upgrades).toEqual([])
    expect(game.hero.maxHp).toBe(100)
    expect(completedBefore(2, 3)).toBe(15)
  })
})

describe('buff combat effects', () => {
  it('chains to at most three neighbors on the fourth direct hit without recursive charge', () => {
    const game = playing(['chain', 'chain'])
    game.enemies.forEach((enemy, index) =>
      Object.assign(enemy, { x: index * 0.4, z: 0, windup: 0 }),
    )
    const target = game.enemies[0]!
    for (let i = 0; i < 4; i++) hit(game, target)
    expect(game.enemies.slice(1, 4).map((enemy) => enemy.maxHp - enemy.hp)).toEqual([24, 24, 24])
    expect(game.enemies[4]!.hp).toBe(game.enemies[4]!.maxHp)
    expect(game.rage).toBe(32)
    hit(game, target, 1, false)
    expect(game.rage).toBe(32)
  })
  it('combines keyboard and aerial multipliers on pursuit, and applies quake once per finisher', () => {
    const game = playing(['keyboard', 'aerial'])
    const enemy = game.enemies[0]!
    game.enemies = [enemy]
    Object.assign(game.hero, { x: 0, z: 0, facing: 1, strike: 8 })
    Object.assign(enemy, { x: 1, z: 0, hp: 500, maxHp: 500, windup: 0 })
    game['resolveAttack']()
    expect(500 - enemy.hp).toBeCloseTo(34 * 1.35 * 1.3)
    game.upgrades = ['quake', 'quake']
    game.hero.strike = 3
    enemy.hp = 500
    game['resolveAttack']()
    expect(500 - enemy.hp).toBe(38 + 20)
    expect(game.effects.filter((effect) => effect.kind === 'special').at(-1)?.radius).toBe(3.6)
  })
  it('reduces incoming damage and heals on a kill only once', () => {
    const game = playing(['armor', 'armor', 'leech', 'leech'])
    game.hero.hp = 50
    game['damageHero'](20, { x: 5, z: 0 })
    expect(game.hero.hp).toBeCloseTo(33.2)
    const enemy = game.enemies[0]!
    hit(game, enemy, 1000)
    expect(game.hero.hp).toBeCloseTo(37.2)
    hit(game, enemy, 1000)
    expect(game.hero.hp).toBeCloseTo(37.2)
  })
  it('refreshes the cache once per street and keeps combo growth bounded', () => {
    const game = playing(['cache', 'cache'])
    game['damageHero'](1000, { x: 5, z: 0 })
    expect(game.hero.hp).toBeCloseTo(60)
    expect(game.reviveUsed).toBe(true)
    game['spawnWave']()
    game.hero.hurt = 0
    game['damageHero'](1000, { x: 5, z: 0 })
    expect(game.hero.hp).toBeCloseTo(60)
    game.hero.hurt = 0
    game['damageHero'](1000, { x: 5, z: 0 })
    expect(game.mode).toBe('gameover')

    game.start(undefined, 'casual')
    game.begin()
    game.upgrades = ['combo', 'combo']
    const enemy = game.enemies[0]!
    game.enemies = [enemy]
    Object.assign(game.hero, { x: 0, z: 0, facing: 1, strike: 1 })
    Object.assign(enemy, { x: 1, z: 0, hp: 500, maxHp: 500, windup: 0 })
    game.combo = 100
    game['resolveAttack']()
    expect(500 - enemy.hp).toBeCloseTo(18 * 1.4)
  })
  it('upgrades dash, throwing, rage gain and special damage without increasing its visual radius', () => {
    const game = playing(['dash', 'dash', 'throw', 'throw', 'cable', 'cable'])
    game.tick(1 / 60, { ...idle, pressed: new Set(['dash']) })
    expect(game.dashCooldown).toBeCloseTo(0.62)
    const enemy = game.enemies[0]!
    game.enemies = [enemy]
    Object.assign(enemy, { x: game.hero.x + 1, z: 0, hp: 500, maxHp: 500, windup: 0 })
    hit(game, enemy)
    expect(game.rage).toBe(14)
    const before = enemy.hp
    game['resolveSpecial']()
    expect(before - enemy.hp).toBe(140)
    expect(game.effects.find((effect) => effect.kind === 'special')?.radius).toBe(12)
    game.props = [{ id: 999, x: game.hero.x, z: 0, kind: 'keyboard', hp: 20, broken: false }]
    game['pickup']()
    expect(game.weaponUses).toBe(11)
    game['pickup']()
    game['updateProjectiles'](0.01)
    expect(before - enemy.hp).toBe(245)
  })
})
