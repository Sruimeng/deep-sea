import { attackMove } from './attacks'

export interface ActionPose {
  lift: number
  lean: number
  twist: number
  stretch: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

export function actionPose(strike: number, elapsed: number): ActionPose {
  const move = attackMove(strike)
  const age = Math.max(0, elapsed)
  const windup = ease(age / move.contact)
  const recover = ease((age - move.contact) / (move.duration - move.contact))
  const force = windup * (1 - recover)
  const coil = Math.sin(clamp(age / move.contact) * Math.PI)
  const pose: ActionPose = { lift: 0, lean: 0, twist: 0, stretch: 1 }
  if (age >= move.duration) return pose
  if (strike === 1 || strike === 2) {
    pose.lean = force * (strike === 2 ? 0.16 : 0.09) - coil * 0.08
    pose.twist = coil * (strike === 2 ? -0.26 : 0.18)
  } else if (strike === 3) {
    pose.lift = 0.38 * force
    pose.lean = coil * 0.18 - force * 0.17
    pose.stretch = 1 + force * 0.04
  } else if (strike === 4 || strike === 8) {
    // Finish the turn before contact so the extended leg faces its target.
    pose.twist = Math.PI * 2 * windup
    pose.lean = -0.16 * force
    pose.lift = 0.12 * coil
  } else if (strike === 5) {
    pose.lift = 0.7 * coil
    pose.lean = -0.18 * coil + 0.16 * force
    pose.stretch = 1 - 0.1 * force
  } else if (strike === 6) {
    pose.lift = 0.13 * force
    pose.lean = -0.12 * force
  } else if (strike === 7) {
    pose.lean = 0.24 * force
    pose.twist = -0.23 * coil
  }
  return pose
}

export function attackClipProgress(strike: number, elapsed: number) {
  const move = attackMove(strike)
  const t = clamp(elapsed / move.duration)
  if (strike !== 8) return t
  const contact = move.contact / move.duration
  return t <= contact ? (t / contact) * 0.2 : 0.2 + ((t - contact) / (1 - contact)) * 0.8
}
