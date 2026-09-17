import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import type { EnemyKind } from './types'

type Position = [number, number, number]
type MaterialFactory = (color: string) => THREE.MeshStandardMaterial
export type SpecialistKind = 'leaper' | 'bomber' | 'medic'
export const isSpecialist = (kind: string): kind is SpecialistKind =>
  ['leaper', 'bomber', 'medic'].includes(kind)

export function buildSpecialist(kind: EnemyKind, material: MaterialFactory) {
  const body = new THREE.Group()
  const limbs: THREE.Group[] = []
  const add = (
    geometry: THREE.BufferGeometry,
    color: string,
    at: Position,
    parent: THREE.Group = body,
  ) => {
    const mesh = new THREE.Mesh(geometry, material(color))
    mesh.position.set(...at)
    mesh.castShadow = mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const box = (size: Position, at: Position, color: string, parent = body) =>
    add(new RoundedBoxGeometry(...size, 2, 0.07), color, at, parent)
  const ball = (radius: number, at: Position, color: string) =>
    add(new THREE.SphereGeometry(radius, 16, 12), color, at)
  const tube = (radius: number, height: number, at: Position, color: string) =>
    add(new THREE.CylinderGeometry(radius, radius, height, 16), color, at)
  const eye = (x: number, y: number, z: number, color = '#fff1c4') => {
    ball(0.16, [x, y, z], color)
    box([0.085, 0.12, 0.04], [x, y, z + 0.15], '#152133')
  }
  if (kind === 'leaper') {
    const shell = ball(0.58, [0, 0.85, 0], '#a17de6')
    shell.scale.set(1.15, 0.8, 0.8)
    box([0.8, 0.15, 0.42], [0, 0.5, 0], '#51447d')
    for (const side of [-1, 1]) {
      eye(side * 0.28, 1.27, 0.26)
      tube(0.045, 0.35, [side * 0.28, 1.05, 0.23], '#65538b')
      const leg = new THREE.Group()
      leg.position.set(side * 0.62, 0.58, 0)
      box([0.32, 0.4, 0.35], [side * 0.12, -0.07, -0.08], '#c4a7fa', leg)
      box([0.26, 0.12, 0.7], [side * 0.2, -0.42, 0.12], '#554071', leg)
      body.add(leg)
      limbs.push(leg)
    }
    box([0.36, 0.07, 0.05], [0, 0.84, 0.48], '#fff1c4')
    tube(0.045, 0.38, [0, 1.42, -0.18], '#51447d')
    ball(0.13, [0, 1.66, -0.18], '#f9cf00')
  } else if (kind === 'bomber') {
    tube(0.55, 1.05, [0, 0.92, 0], '#de7941')
    for (const y of [0.48, 1.3]) tube(0.58, 0.12, [0, y, 0], '#493f43')
    box([0.74, 0.35, 0.16], [0, 1.02, 0.5], '#292f3d')
    for (const side of [-1, 1]) {
      eye(side * 0.21, 1.05, 0.57, '#ffd276')
      const wheel = tube(0.31, 0.24, [side * 0.52, 0.32, 0], '#303444')
      wheel.rotation.z = Math.PI / 2
      ball(0.26, [side * 0.4, 1.63, -0.08], '#45445d')
      tube(0.05, 0.2, [side * 0.4, 1.9, -0.08], '#f9cf00')
    }
    const cannon = tube(0.19, 0.75, [0, 1.55, 0.32], '#655469')
    cannon.rotation.x = Math.PI / 3
    box([0.12, 0.35, 0.035], [0, 0.72, 0.56], '#ffe198')
  } else {
    const shell = ball(0.47, [0, 1.3, 0], '#75d9b7')
    shell.scale.set(1, 0.85, 1.25)
    box([0.58, 0.28, 0.12], [0, 1.32, 0.55], '#214b57')
    for (const side of [-1, 1]) {
      eye(side * 0.17, 1.35, 0.61, '#d5fff0')
      const wing = box([0.75, 0.075, 0.34], [side * 0.72, 1.45, -0.05], '#c4f1df')
      wing.rotation.z = side * 0.15
      wing.name = side < 0 ? 'wing-left' : 'wing-right'
      tube(0.09, 0.45, [side * 0.23, 0.78, 0.08], '#456c76')
      ball(0.15, [side * 0.23, 0.55, 0.08], '#a2ffe0')
    }
    box([0.2, 0.48, 0.08], [0, 1.45, -0.58], '#f3fff8')
    box([0.48, 0.2, 0.08], [0, 1.45, -0.59], '#f3fff8')
    tube(0.04, 0.4, [0, 1.8, 0], '#416973')
    ball(0.12, [0, 2.02, 0], '#c9ffcd')
  }
  return { body, limbs }
}
