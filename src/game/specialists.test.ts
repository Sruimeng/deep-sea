import { describe, expect, it } from 'vitest'
import { ENEMY_STATS, STAGES } from './content'
import { CITY_BLOCKS } from './blocks'
import { Game } from './simulation'
import { streetCenter } from './street'
import type { Controls, EnemyKind } from './types'

const idle: Controls = { x: 0, z: 0, attack: false, pressed: new Set() }
function setup(kind: EnemyKind, wave = 0) {
  const game = new Game()
  game.start()
  game.begin()
  game.wave = wave
  game.hero.x = streetCenter(wave)
  game.hero.z = 0
  const enemy = game.enemies[0]!
  Object.assign(enemy, {
    kind,
    x: game.hero.x + 4,
    z: 0,
    cooldown: 0,
    hp: ENEMY_STATS[kind].hp,
    maxHp: ENEMY_STATS[kind].hp,
  })
  game.enemies = [enemy]
  game.reserves = []
  game.props = []
  return { game, enemy }
}
function advance(game: Game, seconds: number) {
  for (let frame = 0; frame < Math.ceil(seconds * 60); frame++) game.tick(1 / 60, idle)
}

describe('specialist encounters', () => {
  it.each([0, 2])('locks the pounce at the warning position in block %i', (wave) => {
    const { game, enemy } = setup('leaper', wave)
    advance(game, 0.02)
    const target = { x: game.hero.x, z: game.hero.z }
    expect(game.zones[0]).toMatchObject({ ...target, kind: 'pounce', ownerId: enemy.id })
    game.hero.z = 3
    advance(game, 1.45)
    expect(game.hero.hp).toBe(game.hero.maxHp)
    expect(Math.abs(enemy.x - target.x)).toBeLessThan(0.5)
    expect(enemy.y).toBeLessThan(0.1)
  })
  it('lands a pounce once and allows jumping over the impact', () => {
    const { game, enemy } = setup('leaper')
    advance(game, 1.5)
    expect(game.hero.hp).toBe(game.hero.maxHp - ENEMY_STATS.leaper.damage)
    advance(game, 0.6)
    expect(game.hero.hp).toBe(game.hero.maxHp - ENEMY_STATS.leaper.damage)
    game.hero.hurt = 0
    game.hero.y = 1.5
    game.zones.push({
      id: 999,
      x: game.hero.x,
      z: game.hero.z,
      radius: 1.5,
      life: 0.01,
      duration: 1.4,
      fired: false,
      kind: 'pounce',
      ownerId: enemy.id,
    })
    game.tick(1 / 60, idle)
    expect(game.hero.hp).toBe(game.hero.maxHp - ENEMY_STATS.leaper.damage)
  })
  it.each(['windup', 'airborne'] as const)('cancels a pounce when struck during %s', (phase) => {
    const { game, enemy } = setup('leaper')
    advance(game, phase === 'airborne' ? 1 : 0.2)
    expect(game.zones).toHaveLength(1)
    game['hitEnemy'](enemy, 18, 5)
    game.hitStop = 0
    advance(game, 0.05)
    expect(game.zones).toHaveLength(0)
    expect(enemy.attack).toBe(0)
    advance(game, 0.6)
    expect(game.hero.hp).toBe(game.hero.maxHp)
  })
  it('detonates a thrown bomb at its locked position even after the thrower dies', () => {
    const { game, enemy } = setup('bomber', 2)
    advance(game, 0.02)
    game.hero.z = 3
    advance(game, 1.05)
    const bomb = game.zones.find((zone) => zone.kind === 'bomb')!
    expect(bomb).toMatchObject({ x: streetCenter(2), z: 0 })
    game.props = [{ id: 991, kind: 'box', x: bomb.x, z: bomb.z, hp: 20, broken: false }]
    enemy.hp = 0
    // A surviving enemy keeps the encounter open while the bomb finishes its fuse.
    game.enemies.push({
      ...enemy,
      id: 992,
      kind: 'packet',
      hp: 80,
      x: bomb.x + 9,
      z: -3,
      cooldown: 100,
      collisionHits: [],
    })
    advance(game, 1.1)
    expect(game.hero.hp).toBe(game.hero.maxHp)
    expect(game.props[0]!.broken).toBe(true)
    expect(bomb.fired).toBe(true)
  })
  it('damages a player who stays inside the bomb warning only once', () => {
    const { game } = setup('bomber')
    advance(game, 2.2)
    expect(game.hero.hp).toBe(game.hero.maxHp - ENEMY_STATS.bomber.damage)
    advance(game, 0.5)
    expect(game.hero.hp).toBe(game.hero.maxHp - ENEMY_STATS.bomber.damage)
  })
  it('repairs nearby injured allies without reviving, overhealing or healing the boss', () => {
    const { game, enemy } = setup('medic')
    const ally = {
      ...enemy,
      id: 901,
      kind: 'packet' as const,
      x: enemy.x + 1,
      hp: 74,
      maxHp: 80,
      cooldown: 100,
      collisionHits: [],
    }
    const dead = { ...ally, id: 902, hp: 0 }
    const boss = { ...ally, id: 903, kind: 'boss' as const, hp: 500, maxHp: 650 }
    const far = { ...ally, id: 904, x: enemy.x - 9, hp: 30 }
    game.enemies.push(ally, dead, boss, far)
    advance(game, 1.3)
    expect(ally.hp).toBe(80)
    expect(dead.hp).toBe(0)
    expect(boss.hp).toBe(500)
    expect(far.hp).toBe(30)
    expect(enemy.cooldown).toBeGreaterThan(3)
  })
  it('interrupts a repair pulse and prevents immediate recasting', () => {
    const { game, enemy } = setup('medic')
    const ally = {
      ...enemy,
      id: 901,
      kind: 'packet' as const,
      hp: 20,
      maxHp: 80,
      cooldown: 100,
      collisionHits: [],
    }
    game.enemies.push(ally)
    advance(game, 0.3)
    expect(enemy.windup).toBeGreaterThan(0)
    game['hitEnemy'](enemy, 18, 5)
    game.hitStop = 0
    advance(game, 0.6)
    expect(ally.hp).toBe(20)
  })
  it('introduces specialists in opening crowds while keeping cannon fodder in the majority', () => {
    for (const stage of STAGES) {
      for (const wave of stage.waves) {
        expect(wave.slice(0, 6).some((kind) => kind !== 'packet')).toBe(true)
        expect(wave.filter((kind) => kind === 'packet').length).toBeGreaterThanOrEqual(
          wave.length / 2,
        )
      }
    }
    expect(
      new Set(
        Object.values(CITY_BLOCKS)
          .flat()
          .map((block) => block.name),
      ).size,
    ).toBe(30)
  })
})
