import * as THREE from 'three'
import { expect, it } from 'vitest'
import { GameRenderer } from './renderer'
import { Game } from './simulation'

it('holds the contact pose during hit stop instead of freezing before the punch lands', () => {
  const renderer = Object.create(GameRenderer.prototype) as GameRenderer
  renderer['actors'] = new Map()
  renderer['clock'] = 0
  const game = new Game()
  const group = new THREE.Group(),
    body = new THREE.Group(),
    hand = new THREE.Group()
  hand.name = 'hand'
  body.add(hand)
  group.add(body)
  const mixer = new THREE.AnimationMixer(body)
  const clip = new THREE.AnimationClip('jab', 1, [
    new THREE.NumberKeyframeTrack('hand.position[x]', [0, 1], [0, 3]),
  ])
  renderer['actors'].set(game.hero.id, {
    group,
    body,
    shadow: new THREE.Mesh(),
    bar: new THREE.Mesh(),
    mixer,
    actions: { jab: mixer.clipAction(clip) },
  })
  Object.assign(game.hero, { strike: 1, attackId: 1, attackDuration: 0.29, attack: 0.29 })
  renderer['updateActor'](game.hero, game, 1 / 60)
  game.hero.attack = 0.29 - 0.083
  game.hitStop = 0.05
  renderer['updateActor'](game.hero, game, 0)
  expect(hand.position.x).toBeCloseTo((0.083 / 0.29) * 3)
  const contact = hand.position.x
  renderer['updateActor'](game.hero, game, 0)
  expect(hand.position.x).toBe(contact)
})
