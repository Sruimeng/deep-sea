import { expect, it, vi } from 'vitest'
import { damagePose, HIT_FEEDBACK } from './combat-feedback'
import { Audio } from './audio'

it('makes the number peak quickly, settle, and fade without disappearing during hit stop', () => {
  const peak = damagePose(0.065, 0.85, false)
  expect(peak.scale).toBeGreaterThan(1.3)
  expect(damagePose(0.3, 0.85, false).scale).toBeCloseTo(1, 1)
  expect(damagePose(HIT_FEEDBACK.heavy.stop, 0.85, false).opacity).toBe(1)
  expect(damagePose(0.85, 0.85, false).opacity).toBe(0)
})
it('keeps damage readable with motion disabled', () => {
  for (const age of [0, 0.07, 0.3]) {
    expect(damagePose(age, 0.85, true)).toMatchObject({ scale: 1, drift: 0, opacity: 1 })
  }
})
it('plays one strongest impact for a multi-target hit while preserving a reward cue', () => {
  const audio = new Audio()
  const play = vi.spyOn(audio, 'play').mockImplementation(() => {})
  audio.playFrame(['punch', 'heavy', 'punch', 'finish', 'reward', 'reward'])
  expect(play.mock.calls).toEqual([['reward'], ['finish']])
})
