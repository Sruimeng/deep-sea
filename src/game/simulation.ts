import { attackMove } from './attacks'
import { STREET, streetBounds, streetCenter } from './street'
import { enemyDestination } from './enemy-tactics'
import { HIT_FEEDBACK } from './combat-feedback'
import { ENEMY_STATS, STAGES, UPGRADES, WEAPON_NAMES } from './content'
import type {
  Actor,
  Controls,
  CombatReward,
  Drop,
  Effect,
  HitKind,
  EnemyKind,
  Milestone,
  Mode,
  Point,
  Projectile,
  Prop,
  SaveData,
  Snapshot,
  Sound,
  UpgradeId,
  Zone,
} from './types'

export const BOUNDS = { x: STREET.halfWidth, z: STREET.depth }
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z)

export class Game {
  mode: Mode = 'menu'
  stage = 0
  wave = 0
  advancing = false
  private dashBuffer = 0
  private pursuitTarget: number | null = null
  score = 0
  rage = 0
  comboDamage = 0
  combo = 0
  bestCombo = 0
  kills = 0
  elapsed = 0
  upgrades: UpgradeId[] = []
  hero: Actor
  enemies: Actor[] = []
  reserves: EnemyKind[] = []
  waveTotal = 0
  waveKills = 0
  milestone: Milestone | null = null
  private reinforcementTime = 0
  private spawnIndex = 0
  private streak = 0
  private streakTime = 0
  props: Prop[] = []
  projectiles: Projectile[] = []
  zones: Zone[] = []
  drops: Drop[] = []
  effects: Effect[] = []
  sounds: Sound[] = []
  rewards: CombatReward[] = []
  bountyScore = 0
  clearBonus = 0
  weapon: Prop['kind'] | null = null
  weaponUses = 0
  toast = ''
  toastTime = 0
  comboTime = 0
  dashTime = 0
  dashCooldown = 0
  waveDelay = 0
  comboStep = 0
  comboReset = 0
  shield = false
  shieldUsed = false
  reviveUsed = false
  slowTime = 0
  hitStop = 0
  attackBuffer = 0
  pendingStrike = false
  bossTurn = 0
  choices = UPGRADES.slice(0, 3)
  onCheckpoint?: (save: SaveData) => void
  onFinish?: (score: number) => void
  private nextId = 0
  private dashHits = new Set<number>()

  constructor() {
    this.hero = this.actor('hero', -5, 0)
    this.setupProps()
  }
  private actor(kind: Actor['kind'], x: number, z: number): Actor {
    const hp =
      kind === 'hero' ? 100 + (this.upgrades.includes('coffee') ? 35 : 0) : ENEMY_STATS[kind].hp
    return {
      id: ++this.nextId,
      kind,
      x,
      z,
      y: 0,
      vy: 0,
      vx: 0,
      vz: 0,
      facing: 1,
      hp,
      maxHp: hp,
      hurt: 0,
      attack: 0,
      cooldown: 0.7,
      windup: 0,
      target: { x, z },
      dead: 0,
      walk: 0,
      strike: 0,
      attackId: 0,
      attackDuration: 0,
      launchTime: 0,
      airHits: 0,
      collisionHits: [],
    }
  }
  start(save?: SaveData) {
    this.stage = save?.stage ?? 0
    this.score = save?.score ?? 0
    this.upgrades = [...(save?.upgrades ?? [])]
    this.kills = this.bestCombo = this.elapsed = this.rage = 0
    this.loadStage()
  }
  private loadStage() {
    this.hero = this.actor('hero', -6, 0)
    this.enemies = []
    this.reserves = []
    this.waveTotal = this.waveKills = this.streak = this.streakTime = 0
    this.milestone = null
    this.projectiles = []
    this.zones = []
    this.effects = []
    this.drops = []
    this.rewards = []
    this.bountyScore = this.clearBonus = 0
    this.wave = 0
    this.advancing = false
    this.dashBuffer = 0
    this.pursuitTarget = null
    this.combo = this.comboDamage = 0
    this.comboStep = 0
    this.comboReset = 0
    this.weapon = null
    this.weaponUses = 0
    this.waveDelay = 0
    this.shield = this.shieldUsed = this.reviveUsed = false
    this.dashTime = this.dashCooldown = 0
    this.hitStop = this.attackBuffer = this.slowTime = 0
    this.pendingStrike = false
    this.bossTurn = 0
    this.toastTime = 0
    this.setupProps()
    this.mode = 'intro'
    this.onCheckpoint?.({
      version: 1,
      stage: this.stage,
      score: this.score,
      upgrades: [...this.upgrades],
    })
  }
  begin() {
    if (this.mode === 'intro') {
      this.mode = 'playing'
      this.spawnWave()
    }
  }
  pause() {
    if (this.mode === 'playing') this.mode = 'paused'
  }
  resume() {
    if (this.mode === 'paused') this.mode = 'playing'
  }
  menu() {
    this.mode = 'menu'
    this.wave = 0
    this.advancing = false
    this.pursuitTarget = null
    this.enemies = []
    this.reserves = []
    this.waveTotal = this.waveKills = this.streak = this.streakTime = 0
    this.milestone = null
    this.projectiles = []
    this.zones = []
    this.effects = []
  }
  retry() {
    this.rage = 0
    this.loadStage()
  }
  choose(id: UpgradeId) {
    if (this.mode !== 'upgrade' || !this.choices.some((choice) => choice.id === id)) return
    this.upgrades.push(id)
    this.stage++
    this.loadStage()
  }
  private setupProps() {
    this.props = STAGES[this.stage]!.waves.flatMap((_, segment) =>
      [
        { id: ++this.nextId, kind: 'keyboard', x: -5, z: 1.5, hp: 20, broken: false },
        { id: ++this.nextId, kind: 'chair', x: 1, z: -2.7, hp: 36, broken: false },
        { id: ++this.nextId, kind: 'box', x: 6, z: 2.3, hp: 20, broken: false },
        { id: ++this.nextId, kind: 'box', x: -8, z: -2.7, hp: 20, broken: false },
      ].map((prop) => ({
        ...prop,
        kind: prop.kind as Prop['kind'],
        x: prop.x + streetCenter(segment),
      })),
    )
  }
  private spawnWave() {
    this.advancing = false
    this.waveDelay = 0
    const kinds = STAGES[this.stage]!.waves[this.wave]!
    this.reserves = [...kinds]
    this.waveTotal = kinds.length
    this.waveKills = this.spawnIndex = 0
    this.reinforcementTime = 0
    this.spawnReinforcements(this.crowdLimit)
    this.announce(
      kinds.includes('boss')
        ? '延迟之王上线。注意地面预警！'
        : `街段 ${this.wave + 1} / 3 · ${this.stage === 0 && this.wave === 0 ? '三拳挑飞 → 空格追击' : STAGES[this.stage]!.subtitle}`,
    )
  }
  get crowdLimit() {
    return Math.min(10, 6 + this.stage)
  }
  private spawnReinforcements(count: number) {
    for (let n = 0; n < count && this.reserves.length; n++) {
      const kind = this.reserves.shift()!
      const i = this.spawnIndex++
      const center = streetCenter(this.wave)
      const side = i % 3 === 2 ? -1 : 1
      const edge = center + side * 10.7
      const x = Math.abs(edge - this.hero.x) < 3.5 ? center - side * 10.7 : edge
      const enemy = this.actor(kind, x, -3 + (i % 5) * 1.5)
      enemy.facing = Math.sign(this.hero.x - x)
      enemy.cooldown = 0.8 + (i % 3) * 0.18
      this.enemies.push(enemy)
      this.effect('dash', enemy, '#a6cff5')
    }
    this.reinforcementTime = 1.1
  }
  private announce(message: string) {
    this.toast = message
    this.toastTime = 4
  }
  private effect(kind: Effect['kind'], at: Point, color = '#f9cf00', text?: string, power = 1) {
    const duration = kind === 'special' ? 0.75 : kind === 'text' ? 1 : 0.45
    this.effects.push({
      id: ++this.nextId,
      kind,
      x: at.x,
      z: at.z,
      color,
      text,
      power,
      facing: this.hero.facing,
      life: duration,
      duration,
    })
  }
  tick(dt: number, controls: Controls) {
    if (this.mode !== 'playing') return
    dt = Math.min(dt, 0.04)
    this.effects.forEach((effect) => (effect.life -= dt))
    this.effects = this.effects.filter((effect) => effect.life > 0)
    if (controls.pressed.has('attack')) this.attackBuffer = 0.2
    if (controls.pressed.has('dash')) this.dashBuffer = 0.24
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt)
      return
    }
    if (this.slowTime > 0) {
      this.slowTime = Math.max(0, this.slowTime - dt)
      dt *= 0.4
    }
    this.attackBuffer = Math.max(0, this.attackBuffer - dt)
    this.dashBuffer = Math.max(0, this.dashBuffer - dt)
    this.elapsed += dt
    this.toastTime = Math.max(0, this.toastTime - dt)
    this.rewards.forEach((reward) => (reward.life -= dt))
    this.streakTime = Math.max(0, this.streakTime - dt)
    if (this.milestone) {
      this.milestone.life -= dt
      if (this.milestone.life <= 0) this.milestone = null
    }
    this.comboTime -= dt
    if (this.comboTime <= 0) this.combo = this.comboDamage = 0
    this.comboReset -= dt
    if (this.comboReset <= 0) this.comboStep = 0
    this.dashCooldown = Math.max(0, this.dashCooldown - dt)
    this.updatePlayer(dt, controls)
    if (this.mode !== 'playing') return
    this.updateEnemies(dt)
    this.updateProjectiles(dt)
    this.updateZones(dt)
    this.updateDrops(dt)
    if (this.mode !== 'playing') return
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0 || enemy.dead < 1.1)
    if (this.advancing) {
      if (this.hero.x >= streetCenter(this.wave + 1) + STREET.entry) {
        this.wave++
        this.spawnWave()
      }
      return
    }
    const alive = this.enemies.filter((enemy) => enemy.hp > 0).length
    this.reinforcementTime -= dt
    if (this.reserves.length) {
      if (alive < this.crowdLimit && (this.reinforcementTime <= 0 || alive === 0))
        this.spawnReinforcements(
          Math.min(this.crowdLimit - alive, alive === 0 ? this.crowdLimit : 2),
        )
      return
    }
    if (alive) return
    if (this.waveDelay === 0 && this.waveKills > 0) {
      const bonus = this.waveKills * 20
      this.score += bonus
      this.milestone = { title: '全场清空', count: this.waveKills, bonus, life: 1.7 }
      this.sounds.push('reward')
    }
    this.waveDelay += dt
    if (this.waveDelay < (this.wave < 2 ? 0.45 : 1.7)) return
    this.waveDelay = 0
    this.drops.forEach((drop) => this.collectDrop(drop))
    this.drops = []
    if (this.wave < STAGES[this.stage]!.waves.length - 1) {
      this.advancing = true
      this.projectiles = []
      this.zones = []
      this.announce('街段打通！向右前进 →')
      return
    }
    this.sounds.push('win')
    this.clearBonus = 500 + Math.round(this.hero.hp * 2)
    this.score += this.clearBonus
    if (this.stage === STAGES.length - 1) {
      this.mode = 'victory'
      this.onFinish?.(this.score)
      return
    }
    this.mode = 'upgrade'
    this.choices = UPGRADES.filter((upgrade) => !this.upgrades.includes(upgrade.id)).slice(0, 3)
  }
  get bounds() {
    return streetBounds(this.wave, this.advancing)
  }
  private clampX(x: number) {
    return Math.max(this.bounds.left, Math.min(this.bounds.right, x))
  }
  private updateBody(actor: Actor, dt: number) {
    actor.hurt = Math.max(0, actor.hurt - dt)
    actor.attack = Math.max(0, actor.attack - dt)
    actor.cooldown = Math.max(0, actor.cooldown - dt)
    actor.x = this.clampX(actor.x + actor.vx * dt)
    actor.z = clamp(actor.z + actor.vz * dt, BOUNDS.z)
    actor.launchTime = Math.max(0, actor.launchTime - dt)
    const drag = actor.launchTime > 0 ? 2.6 : 9
    actor.vx *= Math.exp(-drag * dt)
    actor.vz *= Math.exp(-drag * dt)
    if (actor.y > 0 || actor.vy > 0) {
      actor.vy -= 23 * dt
      actor.y = Math.max(0, actor.y + actor.vy * dt)
    }
    if (actor.y === 0) {
      actor.vy = 0
      actor.airHits = 0
    }
  }
  private updatePlayer(dt: number, input: Controls) {
    const h = this.hero
    this.updateBody(h, dt)
    if (h.attack === 0) this.pursuitTarget = null
    if (this.pursuitTarget !== null && this.pendingStrike) {
      const target = this.enemies.find((enemy) => enemy.id === this.pursuitTarget)
      if (target) {
        h.x = this.clampX(h.x + clamp(target.x - h.facing * 1.1 - h.x, 32 * dt))
        h.z += clamp(target.z - h.z, 18 * dt)
      }
    }
    if (this.pendingStrike && h.attack <= h.attackDuration - attackMove(h.strike).contact) {
      this.pendingStrike = false
      if (h.strike === 5) this.resolveSpecial()
      else this.resolveAttack()
    }
    if (input.pressed.has('jump') && h.y === 0) {
      h.vy = 9
      this.sounds.push('jump')
    }
    if (this.dashBuffer > 0 && this.dashCooldown === 0 && (!this.pendingStrike || h.attack === 0)) {
      this.dashBuffer = 0
      const target = this.findPursuitTarget()
      if (target) {
        this.pursuitTarget = target.id
        h.facing = Math.sign(target.x - h.x) || h.facing
        h.vx = h.vz = 0
        h.vy = 7
        this.dashTime = 0.26
        this.dashCooldown = 0.7
        this.attack(8)
        this.effect('dash', h)
        this.sounds.push('dash')
        return
      }
      this.dashTime = 0.22
      this.pursuitTarget = null
      this.effect('dash', h, '#f9cf00')
      this.dashCooldown = this.upgrades.includes('dash') ? 0.7 : 1.2
      this.dashHits.clear()
      this.sounds.push('dash')
    }
    const length = Math.hypot(input.x, input.z)
    if (length > 0) {
      if (input.x && h.attack === 0) h.facing = Math.sign(input.x)
      const speed =
        this.pursuitTarget !== null && h.attack > 0
          ? 0
          : this.dashTime > 0
            ? 18
            : h.attack > 0
              ? h.y > 0
                ? 2.2
                : 0
              : 5.5
      h.x = this.clampX(h.x + (input.x / length) * speed * dt)
      h.z = clamp(h.z + (input.z / length) * speed * dt, BOUNDS.z)
      h.walk += dt * speed
    } else if (this.dashTime > 0 && this.pursuitTarget === null)
      h.x = this.clampX(h.x + h.facing * 18 * dt)
    if (this.dashTime > 0) {
      this.dashTime -= dt
      if (this.upgrades.includes('dash'))
        this.enemies.forEach((enemy) => {
          if (enemy.hp <= 0 || distance(h, enemy) > 1.8 || this.dashHits.has(enemy.id)) return
          this.dashHits.add(enemy.id)
          this.hitEnemy(enemy, 25, 7, true)
        })
    }
    if ((input.attack || this.attackBuffer > 0) && h.cooldown === 0) {
      this.attackBuffer = 0
      this.attack()
    }
    if (input.pressed.has('pickup')) this.pickup()
    if (input.pressed.has('special')) this.special()
  }
  private findPursuitTarget() {
    return this.enemies
      .filter(
        (enemy) =>
          enemy.kind !== 'boss' &&
          enemy.launchTime > 0 &&
          enemy.y > 0.15 &&
          enemy.airHits < 3 &&
          enemy.hp > 0 &&
          distance(enemy, this.hero) < 6.5,
      )
      .sort((a, b) => distance(a, this.hero) - distance(b, this.hero))[0]
  }
  private attack(strike?: number) {
    const h = this.hero
    this.comboStep = (this.comboStep % 3) + 1
    this.comboReset = 0.85
    const surrounded =
      this.enemies.filter((enemy) => enemy.hp > 0 && distance(enemy, h) < 2.8).length >= 2
    this.pursuitTarget = strike === 8 ? this.pursuitTarget : null
    h.strike =
      strike ??
      (h.y > 0.5
        ? 4
        : this.dashTime > 0
          ? 7
          : this.comboStep === 3 && surrounded
            ? 6
            : this.comboStep)
    if (h.strike === 7) {
      this.dashTime = 0
      h.vx = h.facing * 7
    }
    h.attackId++
    h.attackDuration = attackMove(h.strike).duration
    const target = this.enemies
      .filter(
        (enemy) =>
          enemy.hp > 0 &&
          (enemy.x - h.x) * h.facing > 0 &&
          Math.abs(enemy.z - h.z) < 1 &&
          distance(enemy, h) < 3,
      )
      .sort((a, b) => distance(a, h) - distance(b, h))[0]
    if (target && h.y === 0 && h.strike !== 6 && h.strike !== 7 && h.strike !== 8)
      h.vx =
        h.facing *
        Math.min(7, Math.max(0, Math.abs(target.x - h.x) - 1.45) / attackMove(h.strike).contact)
    h.attack = h.attackDuration
    h.cooldown = h.attackDuration
    this.pendingStrike = true
    this.sounds.push('swing')
  }
  private resolveAttack() {
    const h = this.hero
    const move = attackMove(h.strike)
    const sweep = h.strike === 6
    const heavy = move.force > 6
    h.vx = sweep ? 0 : h.facing * (heavy ? 5.5 : 2.8)
    this.effect(
      'slash',
      { x: h.x + h.facing * 0.7, z: h.z },
      heavy ? '#f9cf00' : '#ffffff',
      undefined,
      heavy ? 2 : 1,
    )
    const reach = this.weapon ? 2.8 : move.reach
    let hits = 0
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue
      if (sweep) {
        if (distance(enemy, h) > reach) continue
      } else if (
        Math.abs(enemy.z - h.z) > 1.15 ||
        Math.abs(enemy.x - h.x) > reach ||
        (enemy.x - h.x) * h.facing < -0.5
      )
        continue
      this.hitEnemy(
        enemy,
        move.damage * (this.upgrades.includes('keyboard') ? 1.35 : 1) + (this.weapon ? 12 : 0),
        move.force,
        h.strike === 4 || h.strike === 8,
      )
      if (
        !(enemy.kind === 'boss' && this.shield) &&
        (h.strike === 8 || enemy.kind !== 'guard' || (h.x - enemy.x) * enemy.facing <= 0)
      ) {
        if (h.strike === 3 || h.strike === 6) this.dashCooldown = 0
        if (h.strike === 8) this.effect('text', enemy, '#f9cf00', '追击！')
      }
      hits++
    }
    for (const prop of this.props) {
      if (prop.broken || distance(h, prop) > reach || (prop.x - h.x) * h.facing < -0.6) continue
      prop.hp -= heavy ? 30 : 18
      if (prop.hp <= 0) this.breakProp(prop)
    }
    if (hits && this.weapon && --this.weaponUses <= 0) {
      this.weapon = null
      this.announce('键盘打坏了？还有拳头。')
    }
  }
  private hitEnemy(
    enemy: Actor,
    damage: number,
    force: number,
    bypass = false,
    charge = true,
    source?: Actor,
  ) {
    if (enemy.hp <= 0) return
    if (enemy.kind === 'boss' && this.shield) {
      this.effect('text', enemy, '#93bbff', '先拆中继器')
      return
    }
    const blocked = enemy.kind === 'guard' && !bypass && (this.hero.x - enemy.x) * enemy.facing > 0
    const counter = !blocked && enemy.windup > 0
    if (blocked) {
      damage *= 0.2
      force = 1
    } else if (counter) damage *= 1.35
    const dealt = Math.min(enemy.hp, damage)
    enemy.hp = Math.max(0, enemy.hp - damage)
    const heavy = force > 6
    const kind: HitKind =
      enemy.hp === 0
        ? 'finish'
        : blocked
          ? 'block'
          : counter
            ? 'counter'
            : heavy
              ? 'heavy'
              : 'light'
    const feedback = HIT_FEEDBACK[kind]
    this.hitStop = Math.max(this.hitStop, feedback.stop)
    enemy.hurt = feedback.stun
    if (!blocked) {
      enemy.windup = 0
      enemy.attack = 0
      enemy.cooldown = Math.max(enemy.cooldown, feedback.stun + 0.12)
    }
    const direction = source
      ? Math.sign(source.vx)
      : Math.sign(enemy.x - this.hero.x) || this.hero.facing
    enemy.vx = direction * force * (enemy.kind === 'boss' ? 0.25 : 1)
    if ((heavy || enemy.hp === 0) && enemy.kind !== 'boss') {
      enemy.airHits = enemy.y > 0.15 ? enemy.airHits + 1 : 1
      enemy.launchTime = 0.9
      enemy.collisionHits = source ? [...source.collisionHits, source.id] : []
      enemy.vy =
        enemy.airHits >= 3
          ? Math.min(enemy.vy, -2)
          : enemy.hp === 0
            ? 8.5
            : this.hero.strike === 3 || this.hero.strike === 6
              ? 9.5
              : 7.2
      enemy.y = Math.max(0.01, enemy.y)
    }
    if (!blocked) {
      this.combo++
      this.comboDamage += dealt
      this.bestCombo = Math.max(this.combo, this.bestCombo)
      this.comboTime = 2.7
      if (charge) this.rage = Math.min(100, this.rage + (this.upgrades.includes('cable') ? 11 : 8))
    }
    const height = enemy.y + (enemy.kind === 'boss' ? 2.1 : enemy.kind === 'guard' ? 1.6 : 1.15)
    const lane =
      this.effects.filter(
        (effect) =>
          effect.kind === 'damage' && Math.abs(effect.x - enemy.x) < 2.5 && effect.life > 0.25,
      ).length % 3
    for (const effectKind of ['impact', 'damage'] as const) {
      const duration =
        effectKind === 'damage' ? 0.85 : blocked ? 0.14 : heavy || counter ? 0.3 : 0.2
      this.effects.push({
        id: ++this.nextId,
        kind: effectKind,
        x: enemy.x,
        z: enemy.z,
        height,
        lane,
        life: duration,
        duration,
        color: feedback.color,
        hitKind: kind,
        damage: Math.round(dealt),
        power: feedback.power,
        facing: direction,
      })
    }
    this.sounds.push(kind === 'light' ? 'punch' : kind)
    if (enemy.hp === 0) {
      if (!this.enemies.some((other) => other.hp > 0))
        this.slowTime = enemy.kind === 'boss' ? 0.4 : 0.18
      this.kill(enemy)
    }
  }

  private kill(enemy: Actor) {
    this.kills++
    this.waveKills++
    this.streak = this.streakTime > 0 ? this.streak + 1 : 1
    this.streakTime = 4
    if ([3, 5, 8, 12].includes(this.streak)) {
      const bonus = this.streak * 30
      this.score += bonus
      this.milestone = {
        title: this.streak >= 8 ? '势不可挡' : this.streak >= 5 ? '横扫全场' : '连续击破',
        count: this.streak,
        bonus,
        life: 2.2,
      }
      this.sounds.push('reward')
    }
    const elite = enemy.kind === 'guard' || enemy.kind === 'charger' || enemy.kind === 'boss'
    if (elite) this.rewardEnemy(enemy)
    else this.score += 100 + Math.min(this.combo, 30) * 5
    if (!elite)
      this.drops.push({
        id: ++this.nextId,
        kind: this.kills % 4 === 0 ? 'coffee' : 'data',
        x: enemy.x,
        z: enemy.z,
        life: 18,
      })
    this.effect('break', enemy, enemy.kind === 'spinner' ? '#93bbff' : '#ff9054')
    this.sounds.push('break')
  }
  private rewardEnemy(enemy: Actor) {
    const kind = enemy.kind
    if (kind !== 'guard' && kind !== 'charger' && kind !== 'boss') return
    const boss = kind === 'boss'
    const health = Math.min(this.hero.maxHp - this.hero.hp, boss ? 40 : 12)
    const rage = Math.min(100 - this.rage, boss ? 40 : 18)
    const score = boss ? 2000 : 300
    const label = boss
      ? '延迟之王 · 击破奖励'
      : kind === 'guard'
        ? '精英盾兵 · 击破奖励'
        : '精英冲撞怪 · 击破奖励'
    this.hero.hp += health
    this.rage += rage
    this.score += score
    this.bountyScore += score
    this.rewards.push({ id: enemy.id, kind, label, score, health, rage, life: 5 })
    this.effect('text', enemy, '#f9cf00', `+${score} 奖励`)
    this.effect('reward', enemy, '#f9cf00', undefined, boss ? 2 : 1)
    this.sounds.push('reward')
  }
  private breakProp(prop: Prop) {
    prop.broken = true
    this.score += 30
    this.effect('break', prop, '#d4c6aa')
    this.sounds.push('break')
    if (prop.kind === 'relay') {
      this.shield = this.props.some((p) => p.kind === 'relay' && !p.broken)
      if (!this.shield) this.announce('护盾已断开！揍它！')
    } else if (prop.kind === 'box')
      this.drops.push({ id: ++this.nextId, kind: 'coffee', x: prop.x, z: prop.z, life: 20 })
  }
  private pickup() {
    const h = this.hero
    if (this.weapon) {
      this.projectiles.push({
        id: ++this.nextId,
        x: h.x,
        z: h.z,
        y: 1.1,
        vx: h.facing * 15,
        vz: 0,
        life: 2,
        friendly: true,
        kind: this.weapon === 'relay' ? 'box' : this.weapon,
        hit: [],
      })
      this.weapon = null
      this.weaponUses = 0
      this.sounds.push('dash')
      return
    }
    const prop = this.props
      .filter((p) => !p.broken && p.kind !== 'relay' && distance(h, p) < 2.5)
      .sort((a, b) => distance(h, a) - distance(h, b))[0]
    if (!prop) {
      this.announce('靠近地上的键盘、椅子或纸箱，再按 E。')
      return
    }
    this.weapon = prop.kind
    this.weaponUses = 7
    prop.broken = true
    this.sounds.push('pickup')
    this.announce(`${WEAPON_NAMES[prop.kind]}已装备 · J 挥打 / E 投掷`)
  }
  private special() {
    if (this.rage < 100) {
      this.announce('怒气还没满。命中敌人积攒怒气！')
      return
    }
    this.rage = 0
    this.hero.hurt = 0.9
    this.hero.strike = 5
    this.hero.attackId++
    this.hero.attack = this.hero.attackDuration = attackMove(5).duration
    this.hero.cooldown = this.hero.attackDuration
    this.pendingStrike = true
  }
  private resolveSpecial() {
    const upgraded = this.upgrades.includes('cable')
    for (const enemy of this.enemies)
      if (distance(enemy, this.hero) < (upgraded ? 12 : 7))
        this.hitEnemy(enemy, upgraded ? 110 : 80, 16, true, false)
    this.projectiles = this.projectiles.filter((p) => p.friendly)
    this.effect('special', this.hero)
    this.sounds.push('special')
    this.announce('强 制 重 连 ！')
  }
  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.launchTime > 0 && Math.abs(enemy.vx) > 4) {
        for (const other of this.enemies) {
          if (
            other.id === enemy.id ||
            other.hp <= 0 ||
            enemy.collisionHits.includes(other.id) ||
            (other.x - enemy.x) * enemy.vx < 0 ||
            distance(enemy, other) >= 1.5
          )
            continue
          enemy.collisionHits.push(other.id)
          this.hitEnemy(other, 22, Math.max(9, Math.abs(enemy.vx) * 0.8), true, false, enemy)
          this.effect('text', other, '#f9cf00', '连锁撞击')
        }
        for (const prop of this.props) {
          if (prop.broken || prop.kind === 'relay' || distance(enemy, prop) > 1.4) continue
          this.breakProp(prop)
        }
      }
      if (enemy.kind === 'charger' && enemy.attack > 0 && enemy.hp > 0 && enemy.hurt === 0) {
        const dx = enemy.target.x,
          dz = enemy.target.z
        enemy.vx = dx * 16
        enemy.vz = dz * 16
        if (distance(enemy, this.hero) < 1.35 && this.hero.y < 0.9)
          this.damageHero(ENEMY_STATS.charger.damage, enemy)
      }
      this.updateBody(enemy, dt)
      if (enemy.kind === 'hero') continue
      if (enemy.hp <= 0) {
        enemy.dead += dt
        continue
      }
      if (enemy.kind === 'boss' && enemy.hp < enemy.maxHp * 0.4 && !this.shieldUsed) {
        this.shield = this.shieldUsed = true
        this.props.push(
          ...[-7, 7].map((offset) => ({
            id: ++this.nextId,
            kind: 'relay' as const,
            x: streetCenter(this.wave) + offset,
            z: -2.5,
            hp: 72,
            broken: false,
          })),
        )
        this.announce('99% 护盾启动！打碎两侧发光中继器。')
      }
      if (enemy.hurt > 0 || enemy.y > 0.1 || (enemy.kind === 'charger' && enemy.attack > 0))
        continue
      const stats = ENEMY_STATS[enemy.kind]
      const dx = this.hero.x - enemy.x,
        dz = this.hero.z - enemy.z,
        d = Math.hypot(dx, dz)
      if (enemy.windup > 0) {
        enemy.windup -= dt
        if (enemy.windup <= 0) this.enemyAttack(enemy)
        continue
      }
      enemy.facing = Math.sign(dx) || enemy.facing
      const inRange =
        enemy.kind === 'spinner' || enemy.kind === 'charger'
          ? d < stats.range
          : d < stats.range && Math.abs(dz) < 0.85
      const attackers = this.enemies.filter(
        (other) => other.hp > 0 && other.hurt === 0 && (other.windup > 0 || other.attack > 0),
      ).length
      const hasOpening = attackers < 2
      if (inRange && enemy.cooldown === 0 && hasOpening) {
        enemy.windup = stats.windup
        enemy.target = { x: this.hero.x, z: this.hero.z }
        if (enemy.kind === 'boss') this.bossWarning(enemy)
        continue
      }
      const target = enemyDestination(enemy, this.hero, this.elapsed)
      const tx = this.clampX(target.x) - enemy.x
      const tz = clamp(target.z, BOUNDS.z - 0.2) - enemy.z
      const travel = Math.hypot(tx, tz)
      if (travel > 0.15) {
        const speed = stats.speed * (enemy.kind === 'spinner' && d < 4 ? 1.45 : 1)
        const step = Math.min(travel, speed * dt)
        enemy.x = this.clampX(enemy.x + (tx / travel) * step)
        enemy.z = clamp(enemy.z + (tz / travel) * step, BOUNDS.z)
        enemy.walk += step
      }
      for (const other of this.enemies) {
        if (other.id === enemy.id || other.hp <= 0) continue
        const dist = distance(enemy, other)
        if (dist < 1 && dist > 0.01) {
          enemy.x = this.clampX(enemy.x + ((enemy.x - other.x) / dist) * dt)
          enemy.z = clamp(enemy.z + ((enemy.z - other.z) / dist) * dt, BOUNDS.z)
        }
      }
    }
  }
  private bossWarning(enemy: Actor) {
    this.bossTurn++
    const sweep = this.bossTurn % 3 === 0
    const positions = sweep
      ? [{ x: enemy.x, z: enemy.z }]
      : [
          enemy.target,
          { x: enemy.target.x + 3, z: enemy.target.z - 1.5 },
          { x: enemy.target.x - 3, z: enemy.target.z + 1.5 },
        ]
    positions.forEach((p) =>
      this.zones.push({
        id: ++this.nextId,
        ...p,
        radius: sweep ? 7 : 1.6,
        duration: 1.35,
        life: 1.35,
        fired: false,
        kind: sweep ? 'sweep' : 'crash',
      }),
    )
    this.announce(sweep ? '网线横扫！按 K 跳起来。' : '请求超时！离开红色预警区。')
    this.sounds.push('warn')
  }
  private enemyAttack(enemy: Actor) {
    if (enemy.kind === 'hero') return
    const stats = ENEMY_STATS[enemy.kind]
    enemy.cooldown = stats.cooldown
    enemy.attack = 0.3
    if (enemy.kind === 'boss') return
    if (enemy.kind === 'charger') {
      const dx = enemy.target.x - enemy.x,
        dz = enemy.target.z - enemy.z
      const d = Math.hypot(dx, dz) || 1
      enemy.target = { x: dx / d, z: dz / d }
      enemy.attack = 0.55
      this.sounds.push('dash')
      return
    }
    if (enemy.kind === 'spinner') {
      const dx = enemy.target.x - enemy.x,
        dz = enemy.target.z - enemy.z,
        d = Math.hypot(dx, dz) || 1
      this.projectiles.push({
        id: ++this.nextId,
        x: enemy.x,
        z: enemy.z,
        y: 0.8,
        vx: (dx / d) * 6,
        vz: (dz / d) * 6,
        life: 4,
        friendly: false,
        kind: 'ring',
        hit: [],
      })
      this.sounds.push('shoot')
      return
    }
    if (distance(enemy, this.hero) < stats.range + 0.45 && this.hero.y < 0.8)
      this.damageHero(stats.damage, enemy)
  }
  private damageHero(damage: number, from: Point) {
    if (this.mode !== 'playing' || this.hero.hurt > 0 || this.dashTime > 0) return
    const h = this.hero
    h.hp = Math.max(0, h.hp - damage)
    h.hurt = 0.85
    h.vx = (Math.sign(h.x - from.x) || 1) * 4
    this.combo = this.comboDamage = 0
    this.rage = Math.min(100, this.rage + 10)
    this.effect('impact', h, '#ff644f', undefined, 1.5)
    this.hitStop = 0.055
    this.sounds.push('hurt')
    if (h.hp > 0) return
    if (this.upgrades.includes('cache') && !this.reviveUsed) {
      this.reviveUsed = true
      h.hp = h.maxHp / 2
      h.hurt = 2
      this.enemies.forEach((e) => (e.vx = (Math.sign(e.x - h.x) || 1) * 12))
      this.effect('special', h)
      this.announce('本地缓存恢复成功。再来！')
      return
    }
    this.mode = 'gameover'
  }
  private updateProjectiles(dt: number) {
    for (const p of this.projectiles) {
      p.life -= dt
      p.x += p.vx * dt
      p.z += p.vz * dt
      if (!p.friendly && distance(p, this.hero) < 0.7 && this.hero.y < 0.9) {
        this.damageHero(9, p)
        p.life = 0
      }
      if (p.friendly) {
        for (const enemy of this.enemies) {
          if (enemy.hp <= 0 || p.hit.includes(enemy.id) || distance(p, enemy) > 1.3) continue
          p.hit.push(enemy.id)
          this.hitEnemy(enemy, 55, 13, true)
        }
        for (const prop of this.props)
          if (!prop.broken && prop.kind === 'relay' && distance(p, prop) < 1.4) {
            prop.hp -= 55
            if (prop.hp <= 0) this.breakProp(prop)
            p.life = 0
          }
      }
    }
    this.projectiles = this.projectiles.filter(
      (p) =>
        p.life > 0 &&
        p.x > this.bounds.left - 4 &&
        p.x < this.bounds.right + 4 &&
        Math.abs(p.z) < 8,
    )
  }
  private updateZones(dt: number) {
    for (const zone of this.zones) {
      zone.life -= dt
      if (zone.life > 0 || zone.fired) continue
      zone.fired = true
      this.effect('break', zone, '#ff644f')
      this.sounds.push('heavy')
      if (distance(zone, this.hero) < zone.radius && (zone.kind !== 'sweep' || this.hero.y < 0.75))
        this.damageHero(20, zone)
    }
    this.zones = this.zones.filter((zone) => zone.life > -0.3)
  }
  private updateDrops(dt: number) {
    for (const drop of this.drops) {
      drop.life -= dt
      const d = distance(drop, this.hero)
      if (d < 3 && d > 0.6) {
        drop.x += (this.hero.x - drop.x) * dt * 6
        drop.z += (this.hero.z - drop.z) * dt * 6
      }
      if (d > 0.9) continue
      this.collectDrop(drop)
    }
    this.drops = this.drops.filter((drop) => drop.life > 0)
  }
  private collectDrop(drop: Drop) {
    drop.life = 0
    if (drop.kind === 'coffee') {
      this.hero.hp = Math.min(
        this.hero.maxHp,
        this.hero.hp + (this.upgrades.includes('coffee') ? 35 : 22),
      )
      this.effect('heal', this.hero)
      this.effect('text', this.hero, '#f9cf00', '续命咖啡')
    } else this.score += 50
    this.sounds.push('pickup')
  }

  snapshot(): Snapshot {
    const boss = this.enemies.find((enemy) => enemy.kind === 'boss' && enemy.hp > 0)
    return {
      advancing: this.advancing,
      pursuitReady: this.dashCooldown === 0 && !!this.findPursuitTarget(),
      rewards: this.rewards
        .filter((reward) => reward.life > 0)
        .slice(-3)
        .map((reward) => ({ ...reward })),
      bountyScore: this.bountyScore,
      clearBonus: this.clearBonus,
      reserves: this.reserves.length,
      waveTotal: this.waveTotal,
      waveKills: this.waveKills,
      milestone: this.milestone ? { ...this.milestone } : null,
      mode: this.mode,
      stage: this.stage,
      wave: this.wave,
      hp: this.hero.hp,
      maxHp: this.hero.maxHp,
      rage: this.rage,
      score: this.score,
      combo: this.combo,
      comboDamage: Math.round(this.comboDamage),
      bestCombo: this.bestCombo,
      kills: this.kills,
      enemies: this.enemies.filter((enemy) => enemy.hp > 0).length,
      weapon: this.weapon ? WEAPON_NAMES[this.weapon] : '赤手空拳',
      weaponUses: this.weaponUses,
      bossHp: boss?.hp ?? 0,
      bossMaxHp: boss?.maxHp ?? 0,
      shield: this.shield,
      toast: this.toast,
      toastTime: this.toastTime,
      elapsed: this.elapsed,
      dashReady: this.dashCooldown === 0,
      choices: this.choices,
    }
  }
}
