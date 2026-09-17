export const ATTACKS = {
  1: { clip: 'jab', duration: 0.29, contact: 0.075, damage: 18, force: 3, reach: 2.25 },
  2: { clip: 'cross', duration: 0.29, contact: 0.075, damage: 22, force: 4, reach: 2.25 },
  3: { clip: 'uppercut', duration: 0.44, contact: 0.13, damage: 38, force: 13, reach: 2.25 },
  4: { clip: 'kick', duration: 0.4, contact: 0.08, damage: 32, force: 13, reach: 2.5 },
  5: { clip: 'special', duration: 0.68, contact: 0.19, damage: 80, force: 16, reach: 7 },
  6: { clip: 'sweep', duration: 0.53, contact: 0.195, damage: 38, force: 11, reach: 2.65 },
  7: { clip: 'lunge', duration: 0.37, contact: 0.09, damage: 30, force: 10, reach: 2.6 },
  8: { clip: 'kick', duration: 0.36, contact: 0.18, damage: 34, force: 19, reach: 3.2 },
} as const

export function attackMove(strike: number) {
  return ATTACKS[strike as keyof typeof ATTACKS] ?? ATTACKS[1]
}
