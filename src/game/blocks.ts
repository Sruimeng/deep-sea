import type { City, Point, Prop } from './types'

export interface StreetBlock {
  name: string
  surface: 'stone' | 'asphalt' | 'wood' | 'metal' | 'tile'
  floor: string
  props: (Point & { kind: Exclude<Prop['kind'], 'relay'> })[]
}

const layouts: StreetBlock['props'][] = [
  [
    { kind: 'keyboard', x: -5, z: 1.5 },
    { kind: 'chair', x: 1, z: -2.7 },
    { kind: 'box', x: 6, z: 2.3 },
    { kind: 'box', x: -8, z: -2.7 },
  ],
  [
    { kind: 'box', x: -7, z: 2.5 },
    { kind: 'box', x: -5.5, z: 2.5 },
    { kind: 'chair', x: -1, z: -2 },
    { kind: 'keyboard', x: 2, z: 1.5 },
    { kind: 'box', x: 6, z: -2.4 },
    { kind: 'box', x: 7.3, z: -2.4 },
  ],
  [
    { kind: 'chair', x: -7, z: -2.4 },
    { kind: 'keyboard', x: -3, z: 2.6 },
    { kind: 'box', x: 0, z: -2.6 },
    { kind: 'box', x: 3.2, z: 2.4 },
    { kind: 'chair', x: 6, z: -1.8 },
  ],
]
const block = (
  name: string,
  surface: StreetBlock['surface'],
  floor: string,
  layout: number,
): StreetBlock => ({ name, surface, floor, props: layouts[layout]! })

export const CITY_BLOCKS: Record<City, readonly [StreetBlock, StreetBlock, StreetBlock]> = {
  beijing: [
    block('红墙胡同', 'stone', '#bdb1a3', 0),
    block('灯笼夜市', 'stone', '#9d8270', 1),
    block('末班地铁', 'tile', '#91a09f', 2),
  ],
  shanghai: [
    block('江景办公室', 'tile', '#576271', 0),
    block('浦江货运码头', 'metal', '#586b73', 1),
    block('高空停机坪', 'asphalt', '#424a61', 2),
  ],
  hangzhou: [
    block('湖畔茶室', 'stone', '#c5c6b1', 0),
    block('西湖长桥', 'wood', '#b6a283', 2),
    block('龙井茶园', 'stone', '#9ba789', 1),
  ],
  california: [
    block('落日露台', 'wood', '#d4baa0', 0),
    block('海岸游乐栈道', 'wood', '#bb926e', 1),
    block('公路餐车站', 'asphalt', '#67616a', 2),
  ],
  shenzhen: [
    block('湾区接入站', 'tile', '#4c5266', 0),
    block('物流装卸区', 'metal', '#525e69', 1),
    block('核心服务器大厅', 'metal', '#303a51', 2),
  ],
}

export const blockAt = (city: City, segment: number): StreetBlock =>
  CITY_BLOCKS[city][segment] ?? CITY_BLOCKS[city][0]
