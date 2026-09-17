export const STREET = { spacing: 27, halfWidth: 11.5, depth: 3.9, entry: -8 } as const

export function streetCenter(segment: number) {
  return segment * STREET.spacing
}

export function streetBounds(segment: number, advancing: boolean) {
  return {
    left: streetCenter(segment) - STREET.halfWidth,
    right: streetCenter(segment + Number(advancing)) + STREET.halfWidth,
  }
}

export function cameraTarget(heroX: number, facing: number, segments: number, portrait: boolean) {
  const inset = portrait ? 6 : 2
  return Math.max(-inset, Math.min(streetCenter(segments - 1) + inset, heroX + facing * 2.5))
}
