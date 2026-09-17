import type { HitKind } from './types'

interface HitFeedback {
  stop: number
  stun: number
  power: number
  color: string
  label: string
  pixels: number
}

export const HIT_FEEDBACK: Record<HitKind, HitFeedback> = {
  block: { stop: 0.025, stun: 0.08, power: 0.5, color: '#9cceff', label: '格挡', pixels: 24 },
  light: { stop: 0.048, stun: 0.26, power: 1, color: '#fff4cf', label: '', pixels: 38 },
  heavy: { stop: 0.095, stun: 0.46, power: 1.8, color: '#ffcd42', label: '重击', pixels: 54 },
  counter: {
    stop: 0.12,
    stun: 0.58,
    power: 2.1,
    color: '#ff8652',
    label: 'COUNTER · 反击',
    pixels: 58,
  },
  finish: { stop: 0.14, stun: 0.6, power: 2.5, color: '#ffe15a', label: 'K.O.', pixels: 66 },
}

export function damagePose(age: number, duration: number, reducedMotion: boolean) {
  const progress = Math.min(1, Math.max(0, age / duration))
  const burst = age < 0.065 ? 0.55 + (age / 0.065) * 0.85 : 1 + 0.4 * Math.exp(-(age - 0.065) * 19)
  return {
    scale: reducedMotion ? 1 : burst,
    rise: reducedMotion
      ? 0.25
      : 0.18 + Math.sin(Math.min(1, progress * 1.1) * Math.PI * 0.65) * 1.2,
    drift: reducedMotion ? 0 : progress * 0.65,
    opacity: 1 - Math.max(0, (progress - 0.62) / 0.38),
  }
}
