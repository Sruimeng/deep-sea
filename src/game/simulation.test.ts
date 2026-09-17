import { describe, expect, it, vi } from 'vitest'
import { STAGES } from './content'
import { streetCenter } from './street'
import { Game, BOUNDS } from './simulation'
import type { Action, Actor, Controls } from './types'

const controls = (actions: Action[] = [], x = 0, z = 0, attack = false): Controls => ({
  x,
  z,
  attack,
  pressed: new Set(actions),
})
function advance(game: Game, seconds: number, input = controls()) {
  for (let t = 0; t < seconds; t += 1 / 60)
    game.tick(1 / 60, t === 0 ? input : { ...input, pressed: new Set() })
}
function playing(stage = 0) {
  const game = new Game()
  game.start({ version: 1, stage, score: 0, upgrades: [] })
  game.begin()
  advance(game, 0.75)
  return game
}
function isolate(game: Game, kind: Actor['kind'] = 'packet') {
  const enemy = game.enemies[0]!
  enemy.kind = kind
  enemy.x = game.hero.x + 1
  enemy.z = game.hero.z
  enemy.cooldown = 10
  game.enemies = [enemy]
  game.reserves = []
  game.props = []
  return enemy
}

describe('combat', () => {
  it('requires the briefing to be dismissed and freezes on pause', () => {
    const game = new Game()
    game.start()
    advance(game, 3, controls([], 1, 0, true))
    expect(game.elapsed).toBe(0)
    game.begin()
    advance(game, 1, controls([], 1))
    expect(game.hero.x).toBeGreaterThan(-6)
    game.pause()
    const x = game.hero.x
    advance(game, 5, controls([], 1))
    expect(game.hero.x).toBe(x)
  })
  it('clamps movement and preserves diagonal speed', () => {
    const game = playing()
    game.enemies = []
    game.hero.x = 0
    game.hero.z = 0
    game.tick(0.04, controls([], 1, 1))
    expect(Math.hypot(game.hero.x, game.hero.z)).toBeCloseTo(5.5 * 0.04)
    game.hero.x = BOUNDS.x
    game.tick(0.04, controls([], 1))
    expect(game.hero.x).toBe(BOUNDS.x)
  })
  it('checks facing, depth and cooldown before applying a punch', () => {
    const game = playing(),
      enemy = isolate(game)
    enemy.z = game.hero.z + 2
    game.tick(0.016, controls(['attack']))
    expect(enemy.hp).toBe(enemy.maxHp)
    advance(game, 0.4)
    enemy.z = game.hero.z
    enemy.x = game.hero.x + 1
    game.tick(0.016, controls(['attack']))
    expect(enemy.hp).toBe(enemy.maxHp)
    advance(game, 0.1)
    const hp = enemy.hp
    expect(hp).toBeLessThan(enemy.maxHp)
    game.tick(0.016, controls(['attack']))
    expect(enemy.hp).toBe(hp)
  })
  it('can pick up a keyboard then throw through enemies', () => {
    const game = playing(),
      enemy = isolate(game)
    game.props = [
      { id: 999, kind: 'keyboard', hp: 20, broken: false, x: game.hero.x, z: game.hero.z },
    ]
    game.tick(0.016, controls(['pickup']))
    expect(game.weapon).toBe('keyboard')
    game.tick(0.016, controls(['pickup']))
    expect(game.weapon).toBeNull()
    expect(game.projectiles).toHaveLength(1)
    advance(game, 0.2)
    expect(enemy.hp).toBe(enemy.maxHp - 55)
  })
  it('guards block front punches but thrown props bypass shields', () => {
    const game = playing(),
      enemy = isolate(game, 'guard')
    enemy.facing = -1
    game.tick(0.016, controls(['attack']))
    advance(game, 0.1)
    expect(enemy.hp).toBeCloseTo(enemy.maxHp - 18 * 0.2)
    game.projectiles.push({
      id: 998,
      x: enemy.x,
      z: enemy.z,
      y: 1,
      vx: 0,
      vz: 0,
      life: 1,
      friendly: true,
      kind: 'chair',
      hit: [],
    })
    game.tick(0.016, controls())
    advance(game, 0.15)
    expect(enemy.hp).toBeCloseTo(enemy.maxHp - 18 * 0.2 - 55)
  })
  it('requires full rage and cannot recharge itself from the special', () => {
    const game = playing(),
      enemy = isolate(game)
    game.rage = 99
    game.tick(0.016, controls(['special']))
    expect(enemy.hp).toBe(enemy.maxHp)
    game.rage = 100
    game.tick(0.016, controls(['special']))
    expect(enemy.hp).toBe(enemy.maxHp)
    advance(game, 0.22)
    expect(enemy.hp).toBe(0)
    expect(game.rage).toBe(0)
  })
  it('dash avoids damage and has a cooldown', () => {
    const game = playing(),
      enemy = isolate(game)
    enemy.windup = 0.01
    game.tick(0.016, controls(['dash']))
    expect(game.hero.hp).toBe(game.hero.maxHp)
    const cooldown = game.dashCooldown
    game.tick(0.016, controls(['dash']))
    expect(game.dashCooldown).toBeLessThan(cooldown)
  })
  it('flying enemies collide with their neighbors', () => {
    const game = playing()
    const [first, second] = game.enemies
    first!.x = 0
    first!.z = 0
    first!.vx = 10
    first!.launchTime = 0.8
    first!.hurt = 0.15
    second!.x = 0.9
    second!.z = 0
    second!.cooldown = 10
    game.tick(0.016, controls())
    expect(second!.hp).toBeLessThan(second!.maxHp)
  })
  it('a lethal hit enters gameover; cached revival is once per stage', () => {
    const game = playing(),
      enemy = isolate(game)
    game.upgrades = ['cache']
    game.hero.hp = 1
    enemy.windup = 0.01
    game.tick(0.016, controls())
    expect(game.mode).toBe('playing')
    expect(game.reviveUsed).toBe(true)
    advance(game, 0.08)
    game.hero.hp = 1
    game.hero.hurt = 0
    enemy.x = game.hero.x
    enemy.z = game.hero.z
    enemy.windup = 0.01
    game.tick(0.016, controls())
    expect(game.mode).toBe('gameover')
  })
})

describe('boss and progression', () => {
  it('boss shield creates relays and only drops when both are destroyed', () => {
    const game = playing(4),
      boss = isolate(game, 'boss')
    boss.maxHp = 650
    boss.hp = 200
    game.tick(0.016, controls())
    expect(game.shield).toBe(true)
    const relays = game.props.filter((prop) => prop.kind === 'relay')
    expect(relays).toHaveLength(2)
    game.hero.x = boss.x - 1
    game.hero.z = boss.z
    game.tick(0.016, controls(['attack']))
    expect(boss.hp).toBe(200)
    for (const relay of relays) {
      game.hero.x = relay.x - 1
      game.hero.z = relay.z
      game.hero.facing = 1
      for (let i = 0; i < 6; i++) {
        game.hero.cooldown = 0
        game.tick(0.016, controls(['attack']))
        advance(game, 0.48)
      }
    }
    expect(game.shield).toBe(false)
  })
  it('telegraphs resolve after their warning; jumping avoids a sweep', () => {
    const game = playing()
    game.zones = [
      {
        id: 998,
        x: game.hero.x,
        z: game.hero.z,
        radius: 3,
        life: 0.2,
        duration: 0.2,
        fired: false,
        kind: 'sweep',
      },
    ]
    advance(game, 0.1)
    expect(game.hero.hp).toBe(game.hero.maxHp)
    game.hero.y = 2
    advance(game, 0.15)
    expect(game.hero.hp).toBe(game.hero.maxHp)
    expect(game.zones[0]!.fired).toBe(true)
  })
  it('clears all five cities, checkpoints choices, and finishes once', () => {
    const game = playing(),
      checkpoint = vi.fn(),
      finish = vi.fn()
    game.onCheckpoint = checkpoint
    game.onFinish = finish
    for (let stage = 0; stage < STAGES.length; stage++) {
      for (let wave = 0; wave < 3; wave++) {
        for (
          let frame = 0;
          frame < 1200 && game.wave === wave && game.mode === 'playing';
          frame++
        ) {
          game.enemies.forEach((enemy) => (enemy.hp = 0))
          game.tick(1 / 60, controls([], game.advancing ? 1 : 0))
        }
      }
      if (stage < STAGES.length - 1) {
        expect(game.mode).toBe('upgrade')
        game.choose(game.choices[0]!.id)
        expect(game.mode).toBe('intro')
        expect(game.hero.hp).toBe(game.hero.maxHp)
        expect(checkpoint).toHaveBeenLastCalledWith(expect.objectContaining({ stage: stage + 1 }))
        game.begin()
      }
    }
    expect(game.mode).toBe('victory')
    expect(finish).toHaveBeenCalledTimes(1)
    advance(game, 5)
    expect(finish).toHaveBeenCalledTimes(1)
  })
  it('does not accept upgrades outside the reward screen or duplicates', () => {
    const game = playing()
    game.choose('coffee')
    expect(game.upgrades).toEqual([])
    game.mode = 'upgrade'
    game.choices = []
    game.choose('coffee')
    expect(game.upgrades).toEqual([])
  })
})

it('a movement-and-attack bot can finish the campaign without modifying health or enemies', () => {
  const game = new Game()
  game.start()
  const routes: string[] = []
  for (
    let frame = 0;
    frame < 60 * 600 && game.mode !== 'victory' && game.mode !== 'gameover';
    frame++
  ) {
    if (game.mode === 'intro') {
      routes.push(String(game.stage))
      game.begin()
    }
    if (game.mode === 'upgrade') {
      const preferred = ['keyboard', 'coffee', 'cable', 'cache', 'dash'] as const
      const choice = preferred.find((id) => game.choices.some((option) => option.id === id))!
      game.choose(choice)
      continue
    }
    const h = game.hero
    const relay = game.props.find((prop) => prop.kind === 'relay' && !prop.broken)
    const nearest = game.enemies
      .filter((enemy) => enemy.hp > 0)
      .sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]
    const target = relay || nearest
    const input = controls([], game.advancing ? 1 : 0, 0, !game.advancing)
    if (nearest?.launchTime && nearest.hp > 0 && nearest.y > 0.15) input.pressed.add('dash')
    if (target) {
      const dx = target.x - h.x,
        dz = target.z - h.z
      input.x = Math.abs(dx) > 1.1 ? Math.sign(dx) : Math.abs(dx) < 0.7 ? -Math.sign(dx) : 0
      input.z = Math.abs(dz) > 0.3 ? Math.sign(dz) : 0
      if (!input.x && h.facing !== Math.sign(dx)) input.x = Math.sign(dx) * 0.01
      if (
        nearest?.kind === 'guard' ||
        game.zones.some((zone) => zone.kind === 'sweep' && zone.life < 0.5)
      )
        input.pressed.add('jump')
      if (
        game.zones.some(
          (zone) =>
            zone.kind === 'crash' && Math.hypot(h.x - zone.x, h.z - zone.z) < zone.radius + 0.3,
        )
      ) {
        input.z = h.z > 0 ? -1 : 1
        input.pressed.add('dash')
      }
    }
    if (game.rage >= 100 && !game.shield) input.pressed.add('special')
    game.tick(1 / 60, input)
  }
  expect({
    mode: game.mode,
    stage: game.stage,
    wave: game.wave,
    hp: game.hero.hp,
    enemies: game.enemies.map((e) => ({ kind: e.kind, hp: e.hp })),
    routes,
  }).toMatchObject({ mode: 'victory', stage: 4, routes: ['0', '1', '2', '3', '4'] })
})

describe('impact timing and enemy identities', () => {
  it('freezes simulation on contact, then resumes without applying a second hit', () => {
    const game = playing(),
      enemy = isolate(game)
    game.tick(1 / 60, controls(['attack']))
    expect(enemy.hp).toBe(enemy.maxHp)
    advance(game, 0.09)
    expect(game.hitStop).toBeGreaterThan(0)
    const hp = enemy.hp,
      x = game.hero.x,
      elapsed = game.elapsed
    game.tick(0.01, controls([], 1))
    expect(game.hero.x).toBe(x)
    expect(game.elapsed).toBe(elapsed)
    advance(game, 0.2)
    expect(enemy.hp).toBe(hp)
    expect(game.hitStop).toBe(0)
  })
  it('buffers a follow-up tap during recovery and performs the second strike', () => {
    const game = playing()
    game.enemies.forEach((enemy) => {
      enemy.x = 10
      enemy.cooldown = 10
    })
    game.props = []
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.18)
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.13)
    expect(game.hero.strike).toBe(2)
    expect(game.hero.attackId).toBe(2)
  })
  it('only real contacts trigger impact feedback, while whiffs produce a swing', () => {
    const game = playing()
    game.enemies.forEach((enemy) => {
      enemy.x = 10
      enemy.cooldown = 10
    })
    game.props = []
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.11)
    expect(game.effects.some((e) => e.kind === 'slash')).toBe(true)
    expect(game.effects.some((e) => e.kind === 'impact')).toBe(false)
    expect(game.sounds).toContain('swing')
    expect(game.hitStop).toBe(0)
  })
  it('charger commits to its telegraphed direction instead of tracking during the rush', () => {
    const game = playing(),
      enemy = isolate(game, 'charger')
    enemy.x = 0
    enemy.z = 0
    game.hero.x = 5
    game.hero.z = 0
    enemy.windup = 0.02
    enemy.target = { x: 5, z: 0 }
    advance(game, 0.04)
    game.hero.z = 3
    advance(game, 0.2)
    expect(enemy.x).toBeGreaterThan(2)
    expect(Math.abs(enemy.z)).toBeLessThan(0.1)
    expect(game.hero.hp).toBe(game.hero.maxHp)
  })
  it('every office has a distinct city and all enemy kinds appear in the campaign', () => {
    expect(new Set(STAGES.map((stage) => stage.city)).size).toBe(5)
    expect(new Set(STAGES.flatMap((stage) => stage.waves.flat()))).toEqual(
      new Set(['packet', 'spinner', 'guard', 'charger', 'leaper', 'bomber', 'medic', 'boss']),
    )
  })
})

describe('guaranteed combat rewards', () => {
  it.each(['guard', 'charger'] as const)('pays a %s bounty immediately, once per kill', (kind) => {
    const game = playing()
    const enemy = isolate(game, kind)
    enemy.hp = 1
    enemy.facing = 1
    game.hero.hp = 40
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.15)
    expect(enemy.hp).toBe(0)
    expect(game.hero.hp).toBe(52)
    expect(game.score).toBeGreaterThanOrEqual(300)
    expect(game.snapshot().rewards).toEqual([
      expect.objectContaining({ kind, score: 300, health: 12, rage: 18 }),
    ])
    const score = game.score
    advance(game, 0.6)
    expect(game.score).toBe(score)
  })
  it('settles distant loot before opening the stage reward screen', () => {
    const game = playing()
    game.wave = 2
    game.enemies = []
    game.drops = [{ id: 999, kind: 'data', x: 11, z: 3, life: 18 }]
    advance(game, 1.8)
    expect(game.mode).toBe('upgrade')
    expect(game.score).toBe(750)
    expect(game.drops).toHaveLength(0)
  })
  it('includes the boss bounty and remaining loot in the final score exactly once', () => {
    const game = playing(4)
    const boss = isolate(game, 'boss')
    game.wave = 2
    boss.hp = 1
    game.shieldUsed = true
    game.hero.hp = 40
    game.rage = 100
    game.drops = [{ id: 999, kind: 'data', x: 11, z: 3, life: 18 }]
    const finish = vi.fn()
    game.onFinish = finish
    game.tick(1 / 60, controls(['special']))
    advance(game, 0.22)
    expect(game.snapshot().rewards).toEqual([
      expect.objectContaining({ kind: 'boss', score: 2000, health: 40, rage: 40 }),
    ])
    expect(game.rage).toBe(40)
    advance(game, 2.2)
    expect(game.mode).toBe('victory')
    expect(game.score).toBe(2730)
    expect(finish).toHaveBeenCalledExactlyOnceWith(2730)
    advance(game, 3)
    expect(finish).toHaveBeenCalledTimes(1)
  })
})

describe('arcade hit feedback', () => {
  it('uses a distinct damage event and keeps its burst moving during hit stop', () => {
    const game = playing()
    isolate(game)
    game.tick(1 / 60, controls(['attack']))
    for (let i = 0; i < 8 && game.hitStop === 0; i++) game.tick(1 / 60, controls())
    const damage = game.effects.find((effect) => effect.kind === 'damage')!
    expect(damage).toMatchObject({ damage: 18, hitKind: 'light' })
    const remaining = damage.life
    const x = game.hero.x
    game.tick(0.016, controls([], 1))
    expect(damage.life).toBeLessThan(remaining)
    expect(game.hero.x).toBe(x)
  })
  it('front blocks do not trigger a flesh impact, combo, or rage gain', () => {
    const game = playing()
    const guard = isolate(game, 'guard')
    guard.facing = -1
    game.sounds = []
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.12)
    expect(game.sounds).toContain('block')
    expect(game.sounds).not.toContain('punch')
    expect(game.combo).toBe(0)
    expect(game.rage).toBe(0)
    expect(game.effects.find((effect) => effect.kind === 'damage')).toMatchObject({
      hitKind: 'block',
    })
  })
  it('interrupting a windup earns a stronger counter hit and reports the real damage', () => {
    const game = playing()
    const enemy = isolate(game)
    enemy.windup = 0.6
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.12)
    expect(enemy.hp).toBeCloseTo(enemy.maxHp - 18 * 1.35)
    expect(enemy.windup).toBe(0)
    expect(game.effects.find((effect) => effect.kind === 'damage')).toMatchObject({
      hitKind: 'counter',
      damage: 24,
    })
    expect(game.sounds).toContain('counter')
  })
  it('the third strike is a heavier finisher with an accurate combo total', () => {
    const game = playing()
    const enemy = isolate(game)
    game.comboStep = 2
    game.comboReset = 1
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.17)
    expect(enemy.hp).toBe(enemy.maxHp - 38)
    expect(game.snapshot().comboDamage).toBe(38)
    expect(game.effects.find((effect) => effect.kind === 'damage')).toMatchObject({
      hitKind: 'heavy',
      damage: 38,
    })
  })
  it('reserves KO emphasis for a lethal hit and never reapplies its damage', () => {
    const game = playing()
    const enemy = isolate(game)
    enemy.hp = 10
    game.tick(1 / 60, controls(['attack']))
    advance(game, 0.12)
    expect(game.effects.find((effect) => effect.kind === 'damage')).toMatchObject({
      hitKind: 'finish',
      damage: 10,
    })
    expect(game.sounds).toContain('finish')
    const score = game.score
    advance(game, 0.8)
    expect(game.kills).toBe(1)
    expect(game.score).toBeGreaterThanOrEqual(score)
  })
})

describe('enemy tactics', () => {
  it('ranged enemies retreat in depth when crowded, instead of only sliding horizontally', () => {
    const game = playing()
    const enemy = isolate(game, 'spinner')
    enemy.x = game.hero.x
    enemy.z = game.hero.z + 1.8
    const separation = Math.hypot(enemy.x - game.hero.x, enemy.z - game.hero.z)
    advance(game, 0.25)
    expect(Math.hypot(enemy.x - game.hero.x, enemy.z - game.hero.z)).toBeGreaterThan(
      separation + 0.2,
    )
  })
  it('melee enemies approach different flanks instead of forming a single queue', () => {
    const game = playing()
    const template = isolate(game)
    game.hero.x = 0
    game.enemies = [0, 1].map((i) => ({ ...template, id: 100 + i, x: 5, z: 0, cooldown: 10 }))
    advance(game, 0.4)
    expect(game.enemies[0]!.z * game.enemies[1]!.z).toBeLessThan(0)
  })
  it('limits simultaneous windups so flanking stays readable', () => {
    const game = playing()
    const template = isolate(game)
    game.enemies = [0, 1, 2, 3].map((i) => ({
      ...template,
      id: 100 + i,
      x: game.hero.x + 1,
      z: game.hero.z,
      cooldown: 0,
    }))
    game.tick(1 / 60, controls())
    expect(game.enemies.filter((enemy) => enemy.windup > 0)).toHaveLength(2)
  })
})

describe('crowd waves and action moves', () => {
  it('opens with six enemies and keeps the campaign substantially denser', () => {
    const game = playing()
    expect(game.enemies.filter((enemy) => enemy.hp > 0)).toHaveLength(6)
    expect(
      STAGES.flatMap((stage) => stage.waves).reduce((total, wave) => total + wave.length, 0),
    ).toBeGreaterThanOrEqual(180)
  })
  it('fills vacancies from reserves without skipping to the next wave or exceeding the crowd cap', () => {
    const game = playing(3)
    expect(game.reserves.length).toBeGreaterThan(0)
    const total = game.waveTotal
    game.enemies.forEach((enemy) => (enemy.hp = 0))
    advance(game, 0.1)
    expect(game.wave).toBe(0)
    expect(game.mode).toBe('playing')
    expect(game.enemies.filter((enemy) => enemy.hp > 0).length).toBeGreaterThan(0)
    expect(game.enemies.filter((enemy) => enemy.hp > 0).length).toBeLessThanOrEqual(game.crowdLimit)
    expect(game.waveTotal).toBe(total)
    const snapshot = game.snapshot()
    expect(snapshot.enemies + snapshot.reserves).toBe(total - 9)
  })
  it('uses a sweeping finisher against enemies on both sides', () => {
    const game = playing()
    const first = isolate(game)
    const second = { ...first, id: 888, x: game.hero.x - 1, z: game.hero.z }
    game.enemies.push(second)
    game.comboStep = 2
    game.comboReset = 1
    game.tick(1 / 60, controls(['attack']))
    expect(game.hero.strike).toBe(6)
    expect(game.hero.vx).toBe(0)
    advance(game, 0.23)
    expect(first.hp).toBeLessThan(first.maxHp)
    expect(second.hp).toBeLessThan(second.maxHp)
  })
  it('chains a dash into a distinct lunging strike', () => {
    const game = playing()
    isolate(game)
    game.tick(1 / 60, controls(['dash', 'attack']))
    expect(game.hero.strike).toBe(7)
    expect(game.hero.vx).toBe(7)
  })
  it('awards a three-kill streak once and clears pending enemies on a fresh run', () => {
    const game = playing()
    const template = isolate(game)
    game.enemies = Array.from({ length: 4 }, (_, i) => ({
      ...template,
      id: 800 + i,
      hp: i === 3 ? 500 : 1,
      x: game.hero.x + 1 + i * 0.1,
    }))
    game.rage = 100
    game.tick(1 / 60, controls(['special']))
    advance(game, 0.24)
    expect(game.milestone).toMatchObject({ title: '连续击破', count: 3, bonus: 90 })
    game.drops = []
    const score = game.score
    advance(game, 0.2)
    expect(game.score).toBe(score)
    game.start()
    expect(game.reserves).toHaveLength(0)
    expect(game.milestone).toBeNull()
  })
})

describe('street progression and pursuit', () => {
  it.each([30, 60, 120])('connects launch and pursuit at %i simulation steps per second', (fps) => {
    const game = playing()
    const enemy = isolate(game)
    const dt = 1 / fps
    for (let frame = 0; frame < fps * 3 && enemy.hp > 0; frame++) {
      const input = controls([], 0, 0, true)
      if (game.snapshot().pursuitReady) input.pressed.add('dash')
      game.tick(dt, input)
    }
    expect(enemy.hp).toBe(0)
    expect(game.hero.strike).toBe(8)
    expect(game.combo).toBe(4)
  })
  it('opens the street after a clear and waits for the player to enter the next block', () => {
    const game = playing()
    game.enemies = []
    game.reserves = []
    advance(game, 1)
    expect(game.snapshot().advancing).toBe(true)
    expect(game.wave).toBe(0)
    advance(game, 4)
    expect(game.wave).toBe(0)
    advance(game, 6, controls([], 1))
    expect(game.wave).toBe(1)
    expect(game.advancing).toBe(false)
    expect(game.enemies.some((enemy) => enemy.hp > 0)).toBe(true)
    expect(
      game.enemies.every((enemy) => enemy.x >= game.bounds.left && enemy.x <= game.bounds.right),
    ).toBe(true)
    expect(game.hero.x).toBeGreaterThan(15)
  })
  it('keeps an uncleared block closed and resets the route on retry', () => {
    const game = playing()
    game.enemies.forEach((enemy) => (enemy.cooldown = 100))
    advance(game, 5, controls([], 1))
    expect(game.wave).toBe(0)
    expect(game.hero.x).toBeLessThanOrEqual(11.5)
    game.wave = 2
    game.advancing = true
    game.retry()
    expect(game.wave).toBe(0)
    expect(game.advancing).toBe(false)
    expect(game.hero.x).toBe(-6)
  })
  it('lands a full three-hit launch and lets a buffered dash pursue during recovery', () => {
    const game = playing()
    const enemy = isolate(game)
    advance(game, 1.02, controls([], 0, 0, true))
    expect(game.hero.strike).toBe(3)
    expect(enemy.hp).toBe(2)
    expect(enemy.y).toBeGreaterThan(0)
    const x = game.hero.x
    game.tick(1 / 60, controls(['dash']))
    advance(game, 0.5)
    expect(game.hero.strike).toBe(8)
    expect(game.hero.x).toBeGreaterThan(x + 0.5)
    expect(enemy.hp).toBe(0)
    expect(game.effects.some((effect) => effect.text === '追击！')).toBe(true)
  })
  it('carries a launched enemy through a crowd and props without hitting the source twice', () => {
    const game = playing()
    const template = isolate(game)
    const first = {
      ...template,
      id: 800,
      x: 0,
      z: 0,
      hp: 80,
      vx: 14,
      y: 1,
      launchTime: 0.9,
      collisionHits: [],
    }
    const second = { ...template, id: 801, x: 1, z: 0, hp: 80, collisionHits: [] }
    const third = { ...template, id: 802, x: 2, z: 0, hp: 80, collisionHits: [] }
    game.enemies = [first, second, third]
    game.props = [{ id: 900, kind: 'box', x: 1, z: 0, hp: 20, broken: false }]
    advance(game, 0.3)
    expect(second.hp).toBeLessThan(80)
    expect(third.hp).toBeLessThan(80)
    expect(first.hp).toBe(80)
    expect(game.props[0]!.broken).toBe(true)
  })
  it('does not turn a charging enemy into a friendly bowling ball', () => {
    const game = playing()
    const template = isolate(game, 'charger')
    const other = { ...template, id: 802, x: template.x + 0.8, hp: 80, collisionHits: [] }
    template.vx = 16
    template.launchTime = 0
    game.enemies = [template, other]
    game.tick(1 / 60, controls())
    expect(other.hp).toBe(80)
  })
  it('keeps thrown weapons and shield relays functional in the final street block', () => {
    const game = playing(4)
    const boss = isolate(game, 'boss')
    game.wave = 2
    game.hero.x = streetCenter(2)
    game.hero.z = 0
    boss.x = game.hero.x + 3
    boss.z = 0
    boss.hp = 200
    boss.maxHp = 650
    game.tick(1 / 60, controls())
    const relays = game.props.filter((prop) => prop.kind === 'relay')
    expect(relays.map((relay) => relay.x)).toEqual([streetCenter(2) - 7, streetCenter(2) + 7])
    game.weapon = 'keyboard'
    game.tick(1 / 60, controls(['pickup']))
    expect(game.projectiles).toHaveLength(1)
    advance(game, 0.05)
    expect(game.projectiles).toHaveLength(1)
    expect(game.projectiles[0]!.x).toBeGreaterThan(54)
  })
})
