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

it('batches each street separately and preserves distant world positions', () => {
  const renderer = Object.create(GameRenderer.prototype) as GameRenderer
  const room = new THREE.Group()
  renderer['room'] = room
  const material = new THREE.MeshStandardMaterial()
  for (const x of [0, 135]) {
    const block = new THREE.Group()
    block.position.x = x
    block.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material))
    room.add(block)
  }
  renderer['mergeRoom']()
  room.updateMatrixWorld(true)
  expect(room.children).toHaveLength(2)
  const bounds = room.children.map((block) => new THREE.Box3().setFromObject(block))
  expect(bounds.map((box) => box.min.x)).toEqual([-1, 134])
  expect(bounds.map((box) => box.max.x)).toEqual([1, 136])
  room.traverse((node) => {
    if (node instanceof THREE.Mesh) node.geometry.dispose()
  })
  material.dispose()
})
