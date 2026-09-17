import * as THREE from 'three'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import type { Actor, Effect } from './types'

type GlowMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
interface Echo {
  object: THREE.Group
  material: THREE.MeshBasicMaterial
  life: number
}

const glow = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
const mesh = (group: THREE.Group, geometry: THREE.BufferGeometry, color: string, opacity = 1) => {
  const item = new THREE.Mesh(geometry, glow(color, opacity))
  item.userData.opacity = opacity
  group.add(item)
  return item
}
const arc = (
  group: THREE.Group,
  inner: number,
  outer: number,
  color: string,
  start = 0,
  length = Math.PI * 2,
) => mesh(group, new THREE.RingGeometry(inner, outer, 48, 1, start, length), color)

export function isSkillEffect(effect: Effect) {
  return effect.kind === 'slash' || effect.kind === 'charge' || effect.kind === 'special'
}

export function createSkillEffect(effect: Effect) {
  const group = new THREE.Group()
  const strike = effect.strike ?? 1
  if (effect.kind === 'slash') {
    const rising = strike === 3
    const spinning = strike === 4 || strike === 6
    const color = strike === 8 ? '#79e6ff' : strike === 3 ? '#ffbc40' : effect.color
    if (rising || spinning) {
      for (let i = 0; i < 3; i++) {
        const ribbon = arc(
          group,
          1.1 + i * 0.17,
          1.32 + i * 0.17,
          i === 1 ? '#ffffff' : color,
          -1.2,
          spinning ? Math.PI * 1.75 : Math.PI * 1.1,
        )
        if (spinning) {
          ribbon.rotation.x = -Math.PI / 2
          ribbon.position.y = i * 0.16
        } else {
          ribbon.position.x = 0.25
          ribbon.rotation.y = 0.2
          ribbon.position.z = i * 0.08
        }
        ribbon.material.blending = THREE.NormalBlending
        ribbon.userData.role = 'arc'
        ribbon.userData.index = i
      }
    } else {
      for (let i = 0; i < (strike === 7 || strike === 8 ? 5 : 3); i++) {
        const streak = mesh(
          group,
          new THREE.ConeGeometry(i === 0 ? 0.16 : 0.065, i === 0 ? 2.8 : 2, 4),
          i === 0 ? '#ffffff' : color,
          i === 0 ? 0.95 : 0.65,
        )
        streak.rotation.z = -Math.PI / 2
        streak.position.set(0.7 - i * 0.13, ((i % 3) - 1) * 0.22, (i % 2 ? -1 : 1) * 0.2)
        streak.userData.role = 'streak'
      }
      const shock = arc(group, 0.5, 0.57, color, -0.9, Math.PI * 1.7)
      shock.rotation.y = Math.PI / 2
      shock.position.x = 1.6
      shock.userData.role = 'shock'
    }
    for (let i = 0; i < (strike > 2 ? 10 : 4); i++) {
      const spark = mesh(group, new THREE.OctahedronGeometry(0.075), i % 3 ? color : '#ffffff')
      spark.userData.role = 'spark'
      spark.userData.angle = i * 2.4
      spark.userData.index = i
    }
    return group
  }
  if (effect.kind === 'charge') {
    for (let i = 0; i < 3; i++) {
      const ring = arc(group, 0.85, 0.92, i === 1 ? '#c0f8ff' : '#f9cf00', i, Math.PI * 1.5)
      ring.rotation.x = -Math.PI / 2
      ring.userData.role = 'charge-ring'
      ring.userData.index = i
    }
    for (let i = 0; i < 12; i++) {
      const spark = mesh(group, new THREE.OctahedronGeometry(0.095), i % 2 ? '#a0efff' : '#ffdc6c')
      spark.userData.role = 'charge-spark'
      spark.userData.angle = (i * Math.PI) / 6
    }
    return group
  }
  for (let i = 0; i < 3; i++) {
    const ring = arc(group, 0.94, 1, i === 1 ? '#ffffff' : i === 2 ? '#8feeff' : '#ffda54')
    ring.rotation.x = -Math.PI / 2
    ring.userData.role = 'wave'
    ring.userData.index = i
  }
  const core = mesh(group, new THREE.CylinderGeometry(0.3, 1.4, 4.4, 20, 1, true), '#fff1ab', 0.55)
  core.userData.role = 'core'
  for (let i = 0; i < 14; i++) {
    const beam = mesh(
      group,
      new THREE.ConeGeometry(0.12, 3.2, 4),
      i % 2 ? '#ffe090' : '#b0efff',
      0.7,
    )
    beam.userData.role = 'beam'
    beam.userData.angle = (i * Math.PI) / 7
    beam.userData.index = i
  }
  for (let i = 0; i < 18; i++) {
    const shard = mesh(group, new THREE.OctahedronGeometry(0.12), i % 3 ? '#f9cf00' : '#ffffff')
    shard.userData.role = 'debris'
    shard.userData.angle = i * 2.4
    shard.userData.index = i
  }
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5
    const points = [new THREE.Vector3(0, 0, 0)]
    for (let n = 1; n <= 4; n++)
      points.push(
        new THREE.Vector3(
          (Math.cos(angle + (n % 2 ? 0.12 : -0.1)) * n) / 4,
          0,
          (Math.sin(angle + (n % 2 ? 0.12 : -0.1)) * n) / 4,
        ),
      )
    const crack = mesh(
      group,
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, 0.008, 3, false),
      '#f9cf00',
      0.65,
    )
    crack.userData.role = 'circuit'
  }
  return group
}

export function updateSkillEffect(group: THREE.Object3D, effect: Effect, reducedMotion: boolean) {
  const p = Math.max(0, Math.min(1, 1 - effect.life / effect.duration))
  const age = effect.duration - effect.life
  const fade = Math.pow(1 - p, 1.4)
  group.position.set(
    effect.x,
    effect.kind === 'slash' ? (effect.height ?? 0) + 1.3 : 0.09,
    effect.z,
  )
  group.rotation.y = effect.kind === 'slash' && effect.facing === -1 ? Math.PI : 0
  group.children.forEach((node) => {
    const item = node as GlowMesh
    const { role, index = 0, angle = 0 } = item.userData
    item.visible = true
    item.material.opacity = fade * (item.userData.opacity ?? 1) * (reducedMotion ? 0.6 : 1)
    if (role === 'arc') {
      item.scale.setScalar((effect.strike === 6 ? 1.4 : 1) * (0.85 + p * 0.35))
      item.rotation.z = (effect.strike === 3 ? -0.45 + p * 1.4 : p * 2.5) + index * 0.12
      if (effect.strike === 3) item.position.y = -0.35 + p * 1.7
    } else if (role === 'streak') {
      item.scale.set(
        1 - p * 0.5,
        0.65 + Math.sin((Math.min(1, p * 2.5) * Math.PI) / 2) * 0.7,
        1 - p * 0.5,
      )
    } else if (role === 'shock') {
      item.scale.setScalar(0.6 + p * 1.4)
    } else if (role === 'spark') {
      item.position.set(
        0.9 + p * (1 + (index % 3)),
        Math.sin(angle) * p * 1.1,
        Math.cos(angle) * p * 0.9,
      )
      item.scale.setScalar(1 - p)
      item.visible = !reducedMotion
    } else if (role === 'charge-ring') {
      item.scale.setScalar(1.5 - p * 0.8 + index * 0.1)
      item.position.y = 0.1 + index * 0.65 + p * 0.4
      item.rotation.z = p * 3 + index
      item.material.opacity = Math.sin(p * Math.PI) * (reducedMotion ? 0.25 : 0.65)
    } else if (role === 'charge-spark') {
      const radius = 2.2 * (1 - p)
      item.position.set(Math.cos(angle + p) * radius, 0.2 + p * 2, Math.sin(angle + p) * radius)
      item.material.opacity = Math.sin(p * Math.PI)
      item.visible = !reducedMotion
    } else if (role === 'wave') {
      const t = Math.max(0, (age - index * 0.055) / 0.3)
      const radius = effect.radius ?? 7
      item.scale.setScalar(Math.max(0.01, radius * Math.min(1, Math.pow(t, 0.6))))
      item.position.y = index * 0.09
      item.material.opacity = Math.max(0, 1 - t / 2) * (reducedMotion ? 0.35 : 0.85)
    } else if (role === 'core') {
      const height = Math.sin(Math.min(1, age / 0.38) * Math.PI)
      item.scale.set(1 - p * 0.7, Math.max(0.01, height), 1 - p * 0.7)
      item.position.y = 2.2 * height
      item.visible = !reducedMotion
    } else if (role === 'beam') {
      const radius = (effect.radius ?? 7) * (0.25 + p * 0.55)
      const height = Math.max(0, Math.sin(Math.min(1, age / 0.45) * Math.PI))
      item.position.set(Math.cos(angle) * radius, height * 1.3, Math.sin(angle) * radius)
      item.scale.set(1, height * (0.65 + (index % 3) * 0.2), 1)
      item.visible = !reducedMotion
    } else if (role === 'debris') {
      const radius = p * (2 + (index % 5))
      item.position.set(
        Math.cos(angle) * radius,
        Math.sin(p * Math.PI) * (1 + (index % 3)),
        Math.sin(angle) * radius,
      )
      item.rotation.set(p * 5 + index, p * 4, p * 3)
      item.scale.setScalar(1 - p * 0.75)
      item.visible = !reducedMotion
    } else if (role === 'circuit') {
      item.scale.setScalar((effect.radius ?? 7) * Math.min(1, age * 7))
      item.material.opacity = fade * (reducedMotion ? 0.18 : 0.5)
    }
  })
}

export class HeroEchoes {
  private echoes: Echo[] = []
  private interval = 0
  constructor(private scene: THREE.Group) {}
  update(body: THREE.Group, hero: Actor, active: boolean, dt: number, reducedMotion: boolean) {
    if (reducedMotion) {
      this.clear()
      return
    }
    this.interval -= dt
    for (const echo of this.echoes) {
      echo.life -= dt
      echo.material.opacity = Math.max(0, echo.life / 0.18) * 0.22
      if (echo.life <= 0) this.release(echo)
    }
    this.echoes = this.echoes.filter((echo) => echo.life > 0)
    if (!active || dt <= 0 || this.interval > 0 || this.echoes.length >= 4) return
    this.interval = 0.055
    const object = new THREE.Group()
    const silhouette = clone(body)
    const material = glow(hero.strike === 8 ? '#80dcff' : '#f9cf00', 0.22)
    silhouette.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      node.material = material
      node.castShadow = node.receiveShadow = false
    })
    object.add(silhouette)
    object.position.set(hero.x, 0, hero.z)
    this.scene.add(object)
    this.echoes.push({ object, material, life: 0.18 })
  }
  private release(echo: Echo) {
    this.scene.remove(echo.object)
    echo.object.traverse((node) => {
      if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose()
    })
    echo.material.dispose()
  }
  clear() {
    this.echoes.forEach((echo) => this.release(echo))
    this.echoes = []
    this.interval = 0
  }
}
