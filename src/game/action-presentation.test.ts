import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { ATTACKS } from './attacks'
import { actionPose, attackClipProgress } from './action-presentation'
import { createSkillEffect, HeroEchoes, updateSkillEffect } from './skill-effects'
import { Game } from './simulation'
import type { Effect } from './types'

function effect(kind: Effect['kind'], strike = 5): Effect {
  return { id: 1, kind, strike, x: 54, z: 0, life: 0.8, duration: 0.8, color: '#f9cf00', radius: 7 }
}

describe('action presentation', () => {
  it('aligns the pursuit kick extension with its later contact frame', () => {
    expect(attackClipProgress(8, ATTACKS[8].contact)).toBeCloseTo(0.2)
    expect(attackClipProgress(4, ATTACKS[4].contact)).toBeCloseTo(0.2)
    expect(actionPose(8, ATTACKS[8].contact).twist % (Math.PI * 2)).toBeCloseTo(0)
    expect(actionPose(5, ATTACKS[5].contact).lift).toBeCloseTo(0)
    expect(actionPose(5, ATTACKS[5].contact / 2).lift).toBeGreaterThan(0.5)
  })
  it.each(Object.keys(ATTACKS).map(Number))(
    'returns strike %i to a neutral pose without exceeding the animation',
    (strike) => {
      const move = ATTACKS[strike as keyof typeof ATTACKS]
      expect(actionPose(strike, move.duration)).toEqual({ lift: 0, lean: 0, twist: 0, stretch: 1 })
      let previous = 0
      for (let i = 0; i <= 120; i++) {
        const progress = attackClipProgress(strike, (i / 120) * move.duration)
        expect(progress).toBeGreaterThanOrEqual(previous)
        expect(progress).toBeLessThanOrEqual(1)
        previous = progress
      }
      expect(attackClipProgress(strike, move.duration * 2)).toBe(1)
    },
  )
  it.each([7, 12])('keeps the shockwave within its %i unit gameplay radius', (radius) => {
    const event = { ...effect('special'), radius }
    const group = createSkillEffect(event)
    for (let i = 0; i < 48; i++) {
      event.life = event.duration * (1 - i / 48)
      updateSkillEffect(group, event, false)
      expect(group.position.x).toBe(54)
      for (const child of group.children.filter((node) => node.userData.role === 'wave'))
        expect(child.scale.x).toBeLessThanOrEqual(radius)
    }
  })
  it('disables the brightest geometry and sparks in reduced motion mode', () => {
    for (const kind of ['special', 'slash', 'charge'] as const) {
      const event = { ...effect(kind, kind === 'slash' ? 3 : 5), life: 0.6 }
      const group = createSkillEffect(event)
      updateSkillEffect(group, event, true)
      const hidden = new Set(['core', 'beam', 'debris', 'spark', 'charge-spark'])
      for (const child of group.children)
        if (hidden.has(child.userData.role)) expect(child.visible).toBe(false)
    }
  })
  it('caps and releases pose echoes without disposing the original character resources', () => {
    const scene = new THREE.Group(),
      body = new THREE.Group()
    const geometry = new THREE.BoxGeometry(),
      material = new THREE.MeshBasicMaterial()
    const disposeGeometry = vi.spyOn(geometry, 'dispose')
    const disposeMaterial = vi.spyOn(material, 'dispose')
    body.add(new THREE.Mesh(geometry, material))
    const echoes = new HeroEchoes(scene),
      hero = new Game().hero
    for (let i = 0; i < 240; i++) {
      hero.x += 0.1
      echoes.update(body, hero, true, 1 / 60, false)
      expect(scene.children.length).toBeLessThanOrEqual(4)
    }
    const frozen = scene.children.length
    echoes.update(body, hero, true, 0, false)
    expect(scene.children).toHaveLength(frozen)
    for (let i = 0; i < 20; i++) echoes.update(body, hero, false, 1 / 60, false)
    expect(scene.children).toHaveLength(0)
    echoes.update(body, hero, true, 1 / 60, false)
    echoes.update(body, hero, true, 1 / 60, true)
    expect(scene.children).toHaveLength(0)
    expect(disposeGeometry).not.toHaveBeenCalled()
    expect(disposeMaterial).not.toHaveBeenCalled()
  })
  it('emits charge first and applies special damage only at the contact frame', () => {
    const game = new Game()
    game.start(undefined, 'casual')
    game.begin()
    game.rage = 100
    const enemy = game.enemies[0]!
    enemy.x = game.hero.x + 1
    enemy.z = game.hero.z
    enemy.cooldown = 100
    game.enemies = [enemy]
    game.reserves = []
    game.tick(1 / 60, { x: 0, z: 0, attack: false, pressed: new Set(['special']) })
    expect(enemy.hp).toBe(enemy.maxHp)
    expect(game.effects.some((item) => item.kind === 'charge')).toBe(true)
    expect(game.effects.some((item) => item.kind === 'special')).toBe(false)
    for (let i = 0; i < 12; i++)
      game.tick(1 / 60, { x: 0, z: 0, attack: false, pressed: new Set() })
    expect(enemy.hp).toBe(0)
    expect(game.effects.find((item) => item.kind === 'special')?.radius).toBe(7)
    expect(game.rage).toBe(0)
  })
  it('keeps charge particles attached to the windup during slow motion', () => {
    const game = new Game()
    game.start(undefined, 'casual')
    game.begin()
    game.rage = 100
    game.slowTime = 0.6
    const input = { x: 0, z: 0, attack: false, pressed: new Set<'special'>(['special']) }
    game.tick(1 / 60, input)
    for (let i = 0; i < 18; i++) game.tick(1 / 60, { ...input, pressed: new Set() })
    expect(game.pendingStrike).toBe(true)
    expect(game.effects.some((item) => item.kind === 'charge')).toBe(true)
    expect(game.effects.some((item) => item.kind === 'special')).toBe(false)
  })
})
