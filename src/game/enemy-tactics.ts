import type { Actor, Point } from './types'

export function enemyDestination(enemy: Actor, hero: Actor, time: number): Point {
  const dx = enemy.x - hero.x,
    dz = enemy.z - hero.z
  const distance = Math.hypot(dx, dz) || 1
  const side = enemy.id % 2 ? 1 : -1
  const radial = { x: dx / distance, z: dz / distance }
  const tangent = { x: -radial.z * side, z: radial.x * side }
  if (enemy.kind === 'spinner' || enemy.kind === 'bomber' || enemy.kind === 'medic') {
    if (distance < 4)
      return { x: enemy.x + radial.x * 3 + tangent.x, z: enemy.z + radial.z * 3 + tangent.z }
    if (distance < 6) return { x: enemy.x + tangent.x * 1.5, z: enemy.z + tangent.z * 1.5 }
    return { x: hero.x + radial.x * 5, z: hero.z + radial.z * 5 }
  }
  if (enemy.kind === 'leaper') {
    return { x: hero.x + side * 3, z: hero.z + Math.sin(time * 1.8 + enemy.id) * 2.1 }
  }
  if (enemy.kind === 'charger') {
    return {
      x: hero.x + (Math.sign(dx) || side) * 4.5,
      z: hero.z + Math.sin(time * 0.7 + enemy.id) * 1.8,
    }
  }
  if (enemy.kind === 'boss') {
    return {
      x: hero.x + (Math.sign(dx) || side) * 2.7,
      z: hero.z + Math.sin(time + enemy.id) * 1.2,
    }
  }
  if (enemy.kind === 'guard') {
    const spacing = hero.attack > 0 && distance < 2 ? 1.8 : 1.15
    return { x: hero.x + (Math.sign(dx) || side) * spacing, z: hero.z + side * 0.25 }
  }
  // Commit to a flank while approaching; close the depth gap before winding up.
  return { x: hero.x + side * 0.95, z: hero.z + side * (distance > 2.5 ? 1.4 : 0.3) }
}
