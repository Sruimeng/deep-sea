import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

interface Gltf {
  nodes: { name: string }[]
  animations: {
    name: string
    channels: { sampler: number; target: { node: number; path: string } }[]
    samplers: { output: number }[]
  }[]
  accessors: { bufferView: number; byteOffset?: number; count: number; type: string }[]
  bufferViews: { byteOffset: number }[]
}
const file = readFileSync(new URL('../../public/models/hero.glb', import.meta.url))
const jsonLength = file.readUInt32LE(12)
const gltf = JSON.parse(file.toString('utf8', 20, 20 + jsonLength)) as Gltf
const bin = 28 + jsonLength
function motion(clip: string, bone: string, path: string) {
  const animation = gltf.animations.find((animation) => animation.name === clip)!
  const channel = animation.channels.find(
    (channel) => gltf.nodes[channel.target.node]!.name === bone && channel.target.path === path,
  )
  if (!channel) return 0
  const accessor = gltf.accessors[animation.samplers[channel.sampler]!.output]!
  const offset =
    bin + gltf.bufferViews[accessor.bufferView]!.byteOffset + (accessor.byteOffset ?? 0)
  const size = accessor.type === 'VEC4' ? 4 : 3
  let max = 0
  for (let frame = 1; frame < accessor.count; frame++) {
    let delta = 0
    for (let axis = 0; axis < size; axis++) {
      delta +=
        (file.readFloatLE(offset + (frame * size + axis) * 4) -
          file.readFloatLE(offset + axis * 4)) **
        2
    }
    max = Math.max(max, Math.sqrt(delta))
  }
  return max
}
describe('authored boxing animation', () => {
  it.each(['jab', 'cross', 'uppercut', 'sweep', 'lunge'])(
    '%s transfers weight through the legs',
    (clip) => {
      expect(
        Math.max(motion(clip, 'L_Thigh', 'rotation'), motion(clip, 'R_Thigh', 'rotation')),
      ).toBeGreaterThan(0.08)
    },
  )
})

it('exports the complete combat set including landing and crowd attacks', () => {
  expect(gltf.animations.map((clip) => clip.name)).toEqual(
    expect.arrayContaining([
      'idle',
      'run',
      'jab',
      'cross',
      'uppercut',
      'kick',
      'sweep',
      'lunge',
      'land',
      'special',
    ]),
  )
  expect(motion('land', 'Hip', 'translation')).toBeGreaterThan(0.025)
  expect(motion('sweep', 'Root', 'rotation')).toBeGreaterThan(1)
})
