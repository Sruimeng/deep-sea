import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { blockAt } from './blocks'
import type { City, Stage } from './types'

type Position = [number, number, number]
type MaterialFactory = (color: string) => THREE.MeshStandardMaterial

const THEMES: Record<
  City,
  { floor: string; edge: string; wall: string; sky: string; wood: string }
> = {
  beijing: { floor: '#bdb1a3', edge: '#5a4e49', wall: '#8f3d32', sky: '#cfad91', wood: '#6a4634' },
  shanghai: { floor: '#576271', edge: '#171f35', wall: '#1f3048', sky: '#283954', wood: '#343d52' },
  hangzhou: { floor: '#c5c6b1', edge: '#67756b', wall: '#d8d6c0', sky: '#a9c2b7', wood: '#786145' },
  california: {
    floor: '#d4baa0',
    edge: '#8d6854',
    wall: '#f0d7be',
    sky: '#df9d88',
    wood: '#ac7754',
  },
  shenzhen: { floor: '#4c5266', edge: '#181b2c', wall: '#252637', sky: '#292743', wood: '#3a3a50' },
}

class CitySet {
  readonly group = new THREE.Group()
  constructor(private material: MaterialFactory) {}
  box(size: Position, at: Position, color: string, radius = 0) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size)
    const mesh = new THREE.Mesh(geometry, this.material(color))
    mesh.position.set(...at)
    mesh.castShadow = mesh.receiveShadow = true
    this.group.add(mesh)
    return mesh
  }
  cylinder(radius: number, height: number, at: Position, color: string, top = radius, sides = 16) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, radius, height, sides),
      this.material(color),
    )
    mesh.position.set(...at)
    mesh.castShadow = mesh.receiveShadow = true
    this.group.add(mesh)
    return mesh
  }
  sphere(radius: number, at: Position, color: string, scale: Position = [1, 1, 1]) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), this.material(color))
    mesh.position.set(...at)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    this.group.add(mesh)
    return mesh
  }
  text(
    text: string,
    width: number,
    height: number,
    at: Position,
    foreground: string,
    background?: string,
  ) {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = Math.round((1024 * height) / width)
    const ctx = canvas.getContext('2d')!
    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.font = `700 ${Math.round(canvas.height * 0.57)}px "PingFang SC", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = foreground
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide }),
    )
    mesh.position.set(...at)
    this.group.add(mesh)
    return mesh
  }
  desk(x: number, z: number, color: string, single = false) {
    this.box([single ? 2.5 : 3.3, 0.16, 1.25], [x, 1.32, z], color, 0.06)
    for (const sign of [-1, 1])
      this.box([0.1, 1.3, 0.85], [x + sign * (single ? 1 : 1.4), 0.65, z], '#33353b')
    this.box([1.32, 0.88, 0.1], [x, 1.99, z - 0.22], '#202127', 0.04)
    this.box([0.12, 0.25, 0.12], [x, 1.5, z - 0.22], '#65676a')
    this.text('tripo   /   99%', 1.18, 0.65, [x, 1.99, z - 0.155], '#f9cf00', '#111317')
    this.box([0.9, 0.05, 0.28], [x, 1.44, z + 0.3], '#272a31', 0.025)
    this.cylinder(0.12, 0.24, [x + 0.94, 1.51, z + 0.23], '#f9cf00')
    this.box([0.75, 0.18, 0.7], [x, 0.75, z + 0.78], '#4f525d', 0.08)
    this.box([0.75, 0.7, 0.13], [x, 1.13, z + 1.07], '#4f525d', 0.06)
    this.cylinder(0.08, 0.65, [x, 0.36, z + 0.78], '#35383e')
    this.box([0.85, 0.06, 0.1], [x, 0.06, z + 0.78], '#35383e')
  }
  planter(x: number, z: number, kind: 'bamboo' | 'palm' | 'tree') {
    this.cylinder(0.48, 0.65, [x, 0.32, z], '#e5dfd0', 0.56)
    this.cylinder(0.49, 0.05, [x, 0.67, z], '#4c4137')
    if (kind === 'bamboo') {
      for (let i = 0; i < 6; i++) {
        const bx = x + Math.sin(i * 2.4) * 0.3,
          bz = z + Math.cos(i * 2.4) * 0.3
        const h = 2.1 + (i % 3) * 0.45
        this.cylinder(0.045, h, [bx, h / 2 + 0.6, bz], '#547f56', 0.03, 7)
        for (let j = 0; j < 3; j++)
          this.sphere(
            0.28,
            [bx + (j % 2 ? -0.25 : 0.25), 1.5 + j * 0.6, bz],
            '#6f9c63',
            [1.4, 0.16, 0.7],
          )
      }
    } else if (kind === 'palm') {
      const trunk = this.cylinder(0.16, 3.4, [x, 2.2, z], '#927253', 0.095)
      trunk.rotation.z = -0.08
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        const leaf = this.sphere(
          0.8,
          [x + Math.cos(a) * 0.6, 3.8, z + Math.sin(a) * 0.6],
          '#4e8462',
          [1.55, 0.12, 0.33],
        )
        leaf.rotation.y = -a
        leaf.rotation.z = i % 2 ? 0.18 : -0.18
      }
    } else {
      this.cylinder(0.075, 1.8, [x, 1.45, z], '#70573e')
      for (let i = 0; i < 5; i++)
        this.sphere(
          0.65,
          [x + Math.sin(i * 2.4) * 0.4, 2 + i * 0.15, z + Math.cos(i * 2.4) * 0.3],
          '#72916b',
          [0.8, 1, 0.8],
        )
    }
  }
  skyline(city: City) {
    const color = city === 'shanghai' ? '#344b66' : city === 'shenzhen' ? '#393855' : '#ada795'
    for (let i = 0; i < 17; i++) {
      const h = 1.2 + ((i * 7) % 9) * 0.5
      const x = -16 + i * 2
      this.box([1.4, h, 1.2], [x, h / 2 - 0.1, -11 - (i % 3)], color)
      if (city === 'shanghai' || city === 'shenzhen') {
        for (let row = 0; row < Math.floor(h / 0.42); row++)
          for (const dx of [-0.4, 0, 0.4])
            if ((row + i + dx * 5) % 3 !== 0)
              this.box([0.16, 0.16, 0.02], [x + dx, 0.3 + row * 0.42, -10.37 - (i % 3)], '#c7b9a1')
      }
    }
  }
}

export function buildCityRoom(stage: Stage, material: MaterialFactory, segment = 0) {
  const s = new CitySet(material),
    theme = THEMES[stage.city],
    block = blockAt(stage.city, segment)
  s.box([27, 0.5, 12], [0, -0.3, 0], theme.edge, 0.12)
  s.box([27, 0.12, 11.8], [0, -0.01, 0], block.floor)
  for (
    let x = -12;
    x <= 12;
    x += block.surface === 'wood' ? 0.65 : block.surface === 'asphalt' ? 100 : 2
  )
    s.box([0.018, 0.008, 11.6], [x, 0.06, 0], theme.edge)
  if (block.surface === 'stone' || block.surface === 'tile')
    for (let z = -4; z <= 4; z += 2) s.box([26.6, 0.008, 0.018], [0, 0.06, z], theme.edge)
  s.box([35, 0.15, 6], [0, -0.5, -9], theme.sky)
  s.box([27, 0.12, 0.15], [0, 0.15, 5.7], '#f9cf00')
  const floorMark = s.text(
    `0${segment + 1}  /  ${block.name}  →`,
    5.6,
    0.65,
    [0, 0.065, 4.5],
    stage.city === 'shanghai' || stage.city === 'shenzhen' ? '#abb0c4' : '#6f665b',
  )
  floorMark.rotation.x = -Math.PI / 2

  if (block.surface === 'asphalt') {
    for (let x = -11; x <= 11; x += 3) s.box([1.6, 0.01, 0.1], [x, 0.07, 0], '#d4cba5')
  }
  if (segment > 0) {
    if (segment >= 2 && segment <= 4) buildNewDistrict(s, stage.city, segment)
    else buildDistrict(s, stage.city, segment)
    return s.group
  }
  if (stage.city === 'beijing') {
    s.box([27, 1.15, 0.4], [0, 0.57, -5.7], '#77706b')
    for (let row = 0; row < 4; row++)
      for (let i = 0; i < 27; i++)
        s.box(
          [0.87, 0.22, 0.03],
          [-13 + i + (row % 2) * 0.45, 0.18 + row * 0.27, -5.47],
          row % 2 ? '#8b837a' : '#958b81',
        )
    for (const x of [-12, -4, 4, 12]) {
      s.cylinder(0.16, 4.25, [x, 2.1, -5.4], '#91392d')
      s.box([8, 0.28, 0.42], [x + (x < 0 ? 2 : -2), 4.17, -5.4], '#75352a')
      s.cylinder(0.35, 0.62, [x + 0.45, 3.38, -5.2], '#bc4230', 0.35, 20)
      s.cylinder(0.025, 0.4, [x + 0.45, 2.88, -5.2], '#e2b452')
    }
    for (let i = 0; i < 58; i++) {
      const tile = s.cylinder(0.14, 1.4, [-13.2 + i * 0.46, 4.35, -5.4], '#4b5056', 0.14, 8)
      tile.rotation.x = Math.PI / 2
    }
    s.desk(-8, -4.3, '#a37c55')
    s.desk(-3.5, -4.3, '#a37c55')
    s.planter(-12, -3.6, 'tree')
    s.planter(12, -3.6, 'tree')
    s.text('北京办公室  /  BEIJING', 4.3, 0.65, [-6, 3.2, -5.1], '#ffe6aa', '#75352a')
  }
  if (stage.city === 'shanghai') {
    s.skyline(stage.city)
    s.box([30, 0.04, 3.3], [0, -0.24, -7.8], '#396980')
    for (let i = 0; i < 12; i++)
      s.box([1.1, 0.008, 0.06], [-13 + i * 2.3, -0.21, -7.3 - (i % 3) * 0.4], '#89a6b3')
    for (const x of [-13, -8, -3, 2, 7, 13]) {
      s.box([0.08, 4.4, 0.13], [x, 2.2, -5.7], '#899ca9')
      s.box([0.09, 0.12, 2], [x, 4.35, -4.7], '#899ca9')
    }
    s.box([27, 0.1, 0.16], [0, 1.1, -5.7], '#8595a5')
    s.box([27, 0.1, 0.18], [0, 4.4, -5.7], '#a9b6c0')
    s.box([9, 0.2, 1.55], [-5, 1.15, -4.4], '#1e293b', 0.18)
    for (const x of [-8, -5, -2]) {
      s.box([0.8, 1, 0.14], [x, 0.9, -3.65], '#607383', 0.1)
      s.box([0.9, 0.06, 0.6], [x, 1.29, -4.4], '#9ca5b5', 0.03)
    }
    s.text('SHANGHAI  /  CONNECTING…', 5.1, 0.75, [-6, 3.3, -5.57], '#c4e6ff', '#243347')
    s.planter(-12, -4.5, 'tree')
  }
  if (stage.city === 'hangzhou') {
    s.box([31, 0.05, 5], [0, -0.23, -8.3], '#79afa3')
    for (let i = 0; i < 14; i++)
      s.sphere(0.32, [-13 + i * 2, -0.17, -7 - (i % 3)], '#65856a', [1, 0.08, 1])
    s.box([27, 0.75, 0.38], [0, 0.38, -5.7], '#e1ddcd')
    for (let i = -12; i <= 12; i += 2) {
      s.box([0.12, 1.35, 0.16], [i, 0.7, -5.65], '#746b58')
      s.box([1.85, 0.1, 0.18], [i + 1, 1.25, -5.65], '#746b58')
    }
    for (const x of [-12, -10, 10, 12]) s.planter(x, -4.7, 'bamboo')
    s.box([8, 1.15, 1.15], [-3.5, 0.6, -4.65], '#8f7958', 0.05)
    s.box([8.2, 0.12, 1.3], [-3.5, 1.25, -4.65], '#e3d6b7', 0.04)
    for (let i = 0; i < 6; i++) s.cylinder(0.13, 0.2, [-5 + i * 0.6, 1.41, -4.4], '#c4d2aa')
    s.sphere(0.27, [-5.8, 1.55, -4.5], '#7a8e65', [1, 0.75, 1])
    s.text('杭州  /  KEEP THE FLOW', 4.8, 0.6, [-3.4, 2.55, -5.5], '#435e50', '#e0dac1')
  }
  if (stage.city === 'california') {
    s.box([36, 0.05, 7], [0, -0.25, -9.1], '#80aebb')
    s.sphere(1.6, [8.5, 3.8, -14], '#f6c488')
    for (const x of [-12, -8, -4, 0, 4, 8, 12])
      s.box([0.065, 1.2, 0.065], [x, 0.6, -5.7], '#f4e0c7')
    s.box([26, 0.08, 0.1], [0, 1.2, -5.7], '#f4e0c7')
    s.planter(-12, -4.2, 'palm')
    s.planter(12, -4.2, 'palm')
    s.box([6, 0.85, 1.2], [-6.2, 0.5, -4.8], '#efe1c9', 0.22)
    s.box([6, 0.7, 0.28], [-6.2, 1, -5.3], '#dc926e', 0.12)
    s.box([3, 0.17, 1.2], [-6.2, 0.64, -3.75], '#a77851', 0.1)
    s.cylinder(0.8, 0.14, [0, 1.2, -4.6], '#edddc8')
    s.cylinder(0.09, 1.1, [0, 0.6, -4.6], '#7e6d60')
    s.cylinder(0.045, 3.4, [0, 1.7, -4.6], '#eee1c7')
    s.cylinder(1.8, 0.75, [0, 3.4, -4.6], '#f2c86d', 0.08, 8)
    const surf = s.sphere(0.8, [-10.3, 1.75, -5.2], '#f9cf00', [0.48, 2.1, 0.11])
    surf.rotation.z = -0.2
    s.text('CALIFORNIA  /  AFTER HOURS', 5.8, 0.6, [-6, 2.65, -5.5], '#fff4dc', '#a36249')
  }
  if (stage.city === 'shenzhen') {
    s.skyline(stage.city)
    s.box([27, 0.65, 0.35], [0, 0.32, -5.7], '#252636')
    for (const x of [-11, -8, -5, 10]) {
      s.box([2.2, 3.6, 1.15], [x, 1.8, -4.85], '#232532', 0.09)
      for (let y = 0.4; y < 3.4; y += 0.42) {
        s.box([1.9, 0.31, 0.06], [x, y, -4.23], '#3d4150', 0.025)
        for (let i = 0; i < 7; i++)
          s.box([0.09, 0.025, 0.03], [x - 0.6 + i * 0.15, y, -4.18], '#1c1e27')
        s.box([0.09, 0.08, 0.04], [x + 0.72, y, -4.17], y > 2 ? '#f9cf00' : '#a79bec')
      }
    }
    for (const z of [-3.4, 3.4]) {
      s.box([24, 0.01, 0.045], [0, 0.07, z], '#a79bec')
      for (let x = -10; x <= 10; x += 4) s.box([0.045, 0.01, 0.9], [x, 0.07, z - 0.4], '#a79bec')
    }
    s.text('SHENZHEN  /  CORE OFFLINE', 5.6, 0.75, [-6.3, 4.25, -5.35], '#f9cf00', '#252637')
  }
  return s.group
}

function buildDistrict(s: CitySet, city: City, segment: number) {
  const name = blockAt(city, segment).name
  const night = city === 'shanghai' || city === 'shenzhen'
  const sign = (x = 0, y = 3.7) =>
    s.text(
      name,
      5.8,
      0.75,
      [x, y, -5.1],
      night ? '#c3e9ff' : '#fff0cb',
      night ? '#27384d' : '#734c3a',
    )
  const rail = (color: string, z = -5.6) => {
    s.box([26.8, 0.12, 0.15], [0, 1.15, z], color)
    for (let x = -13; x <= 13; x += 2) s.box([0.12, 1.2, 0.12], [x, 0.6, z], color)
  }
  const container = (x: number, z: number, color: string, width = 6, y = 0) => {
    s.box([width, 2.5, 2], [x, y + 1.25, z], color, 0.06)
    for (let dx = -width / 2 + 0.25; dx < width / 2; dx += 0.4)
      s.box([0.045, 2.25, 0.045], [x + dx, y + 1.25, z + 1.03], '#b3b6b1')
    s.text(
      'VAST / CARGO',
      Math.min(width - 0.5, 3.8),
      0.45,
      [x, y + 1.4, z + 1.06],
      '#e9eddd',
      color,
    )
  }
  const stall = (x: number, color: string, label: string) => {
    s.box([4.2, 1.1, 1.35], [x, 0.55, -4.85], '#8b694a', 0.06)
    for (const dx of [-2, 2]) s.cylinder(0.055, 3, [x + dx, 1.5, -5.2], '#604c3b')
    for (let i = 0; i < 8; i++) {
      const roof = s.box(
        [0.54, 0.12, 2.3],
        [x - 1.9 + i * 0.54, 2.85, -5.1],
        i % 2 ? '#f7e6bd' : color,
      )
      roof.rotation.x = -0.12
      s.box([0.54, 0.3, 0.08], [x - 1.9 + i * 0.54, 2.55, -3.94], i % 2 ? '#f7e6bd' : color)
    }
    s.text(label, 3.3, 0.5, [x, 1.65, -4.12], '#ffedbf', '#654b3d')
    for (let i = 0; i < 6; i++) s.sphere(0.18, [x - 1.3 + i * 0.5, 1.3, -4.6], color)
  }
  if (city === 'beijing' && segment === 1) {
    s.box([27, 3.7, 0.45], [0, 1.8, -6], '#72423b')
    for (const x of [-9, -3, 4, 10]) {
      stall(x, x < 0 ? '#b73f35' : '#cf9d42', x < 0 ? '热乎 · 烧饼' : '下班 · 夜宵')
      s.cylinder(0.32, 0.5, [x, 3.65, -4.75], '#d44e3c')
      s.cylinder(0.025, 0.32, [x, 3.24, -4.75], '#f6cb62')
    }
    s.box([27, 0.04, 0.04], [0, 3.98, -4.75], '#49352e')
    for (const x of [-11.5, 11.5]) {
      s.box([0.35, 4.6, 0.4], [x, 2.3, -5.65], '#8c3934')
      s.box([2.2, 0.28, 1], [x, 4.5, -5.65], '#494d56')
    }
    sign(0, 4.5)
  } else if (city === 'beijing') {
    s.box([27, 4.2, 0.35], [0, 2.05, -6.2], '#45575b')
    s.box([24, 2.5, 1.1], [0, 1.55, -5.65], '#b6c7c9', 0.2)
    s.box([24, 0.22, 0.1], [0, 0.8, -5.05], '#b8333e')
    for (let x = -10; x <= 10; x += 2.5) {
      s.box([1.4, 0.95, 0.05], [x, 1.9, -5.05], '#293e50', 0.05)
      s.box([0.05, 2.1, 0.06], [x + 1.1, 1.5, -5.04], '#566d75')
    }
    s.box([27, 0.03, 0.35], [0, 0.08, -3.85], '#ead17d')
    for (const x of [-10, 0, 10]) {
      s.box([0.5, 4.5, 0.5], [x, 2.25, -5.7], '#477b81')
      s.box([4, 0.12, 0.3], [x, 4.1, -4.9], '#edf9ed')
    }
    sign(-5, 3.65)
    s.text('末班车  23:59  →', 4.5, 0.6, [6, 3.65, -4.9], '#f9cf00', '#24333c')
  } else if (city === 'shanghai' && segment === 1) {
    s.skyline(city)
    s.box([35, 0.05, 7], [0, -0.22, -9], '#315b74')
    container(-8, -5.65, '#a35640')
    container(-8, -5.65, '#3a647c', 6, 2.5)
    container(8, -5.65, '#497a7c', 7)
    for (const x of [-1.5, 5]) s.box([0.32, 6, 0.4], [x, 3, -7], '#d7ab55')
    s.box([8.5, 0.42, 0.65], [1.8, 6, -7], '#d7ab55')
    s.cylinder(0.055, 3, [2, 4.35, -6.6], '#adbac7')
    s.box([0.9, 0.3, 0.6], [2, 2.8, -6.6], '#e6c070')
    for (const x of [-12, -3, 11]) s.cylinder(0.22, 0.75, [x, 0.4, -4.2], '#d8b565')
    sign(-1, 3.7)
  } else if (city === 'shanghai') {
    s.skyline(city)
    rail('#a9bfd2')
    const pad = s.cylinder(3.4, 0.015, [0, 0.065, 0], '#677789', 3.4, 48)
    pad.receiveShadow = true
    const h = s.text('H', 3, 3, [0, 0.084, 0], '#f4e1a3')
    h.rotation.x = -Math.PI / 2
    for (const x of [-10, -6, 7, 11]) {
      s.box([2.3, 1.3, 1.7], [x, 0.65, -4.8], '#748997', 0.08)
      for (let i = 0; i < 5; i++) s.box([1.9, 0.04, 0.06], [x, 0.4 + i * 0.17, -3.92], '#344653')
      s.sphere(0.12, [x, 1.5, -4.8], '#f4635e')
    }
    s.box([4.4, 3.2, 2], [-1.2, 1.6, -6.5], '#35485b')
    s.box([1.4, 2.3, 0.06], [-1.2, 1.15, -5.46], '#95b5c4')
    sign(0, 3.65)
  } else if (city === 'hangzhou' && segment === 1) {
    s.box([35, 0.06, 11], [0, -0.4, -9], '#78aaa5')
    rail('#815e45')
    for (let x = -12; x <= 12; x += 3) {
      s.box([0.22, 1.8, 0.22], [x, 0.9, -5.6], '#886547')
      s.sphere(0.2, [x, 1.85, -5.6], '#d5bc8c')
      s.sphere(0.5, [x + 1, -0.34, -8], '#618f77', [1, 0.05, 1])
      s.sphere(0.12, [x + 1, -0.23, -8], '#e4b4af')
    }
    for (const x of [-9, 9]) {
      s.box([0.3, 4, 0.35], [x, 2, -5.9], '#815b40')
      s.box([5.5, 0.26, 2.4], [x, 4, -5.9], '#4d6d62')
      s.box([4.3, 0.24, 1.8], [x, 4.3, -5.9], '#5e7c6d')
      s.cylinder(0.18, 0.65, [x + 1.7, 3.3, -5.2], '#d9b670')
    }
    sign(0, 2.6)
  } else if (city === 'hangzhou') {
    s.box([31, 1, 7], [0, -0.2, -9], '#758c60')
    for (let row = 0; row < 3; row++)
      for (let x = -13; x <= 13; x += 1.5)
        s.sphere(
          0.72,
          [x, 0.7 + row * 0.32, -6.5 - row * 1.7],
          row % 2 ? '#577c50' : '#71955b',
          [1, 0.65, 0.75],
        )
    stall(-6, '#638875', '龙井 · 新茶')
    for (const x of [4, 6.5, 9]) {
      s.cylinder(0.7, 0.7, [x, 0.35, -4.8], '#b19a68')
      s.cylinder(0.73, 0.08, [x, 0.72, -4.8], '#76915a')
    }
    s.planter(-12, -4.7, 'bamboo')
    s.planter(12, -4.7, 'bamboo')
    sign(0, 3.8)
  } else if (city === 'california' && segment === 1) {
    s.box([36, 0.05, 10], [0, -0.28, -10], '#77adbe')
    rail('#ecd3b6')
    stall(-8, '#d97872', 'ICE CREAM')
    stall(8, '#65a7b6', 'SURF RENTAL')
    for (let i = 0; i < 3; i++) {
      const board = s.sphere(
        0.65,
        [6.5 + i * 1.05, 1.45, -3.95],
        ['#f3c85b', '#87d1c8', '#f0a184'][i]!,
        [0.4, 2, 0.12],
      )
      board.rotation.z = -0.15 + i * 0.13
    }
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(2.9, 0.1, 6, 36),
      new THREE.MeshStandardMaterial({ color: '#f0d8b1' }),
    )
    wheel.position.set(0, 3.4, -10)
    s.group.add(wheel)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      const x = Math.cos(a) * 2.9,
        y = 3.4 + Math.sin(a) * 2.9
      s.box([0.8, 0.7, 0.65], [x, y, -10], i % 2 ? '#d88577' : '#e8c27c', 0.12)
      const spoke = s.box([0.045, 2.9, 0.045], [x / 2, 3.4 + Math.sin(a) * 1.45, -10], '#f0d8b1')
      spoke.rotation.z = a - Math.PI / 2
    }
    sign(0, 2.1)
  } else if (city === 'california') {
    s.box([35, 0.1, 6], [0, -0.23, -9], '#bcaa89')
    for (const x of [-12, 0, 12]) s.planter(x, -6, 'palm')
    s.box([7.5, 2.5, 2.2], [-5.5, 1.65, -5.5], '#e6b55f', 0.22)
    s.box([3.8, 1, 0.06], [-6, 2, -4.37], '#495a60')
    s.box([4.6, 0.15, 0.6], [-6, 1.35, -4.15], '#f1d9aa')
    for (const x of [-8, -3]) {
      const tire = s.cylinder(0.5, 0.3, [x, 0.5, -4.45], '#343b42')
      tire.rotation.x = Math.PI / 2
    }
    s.text('OFFLINE TACOS', 4.5, 0.65, [-5.7, 3.35, -4.4], '#8e4944', '#ffdaa2')
    for (let x = -12; x <= 12; x += 4) s.box([0.08, 0.012, 2.7], [x, 0.075, 3.8], '#e7d7b5')
    s.box([4, 0.9, 1.5], [8, 0.45, -4.8], '#849da2', 0.12)
    s.box([2.2, 0.9, 1.4], [8.2, 1.25, -4.8], '#b9d5d3', 0.17)
    sign(4, 3.8)
  } else if (city === 'shenzhen' && segment === 1) {
    container(-8, -5.5, '#586783', 7)
    container(-8, -5.5, '#806b94', 7, 2.5)
    container(5.5, -5.5, '#4b8380', 9)
    for (let x = -12; x <= 12; x++) {
      const stripe = s.box([0.52, 0.012, 0.5], [x, 0.075, -3.65], x % 2 ? '#e6c662' : '#2d3542')
      stripe.rotation.y = -0.35
    }
    s.box([2, 1, 1.3], [11, 0.55, -4.9], '#d8ac4d', 0.1)
    for (const x of [10.5, 11.5]) s.box([0.15, 3.8, 0.2], [x, 1.9, -4.15], '#546171')
    s.box([1.4, 0.16, 1.1], [11, 0.5, -3.9], '#737f89')
    sign(3, 3.6)
  } else {
    s.box([27, 5, 0.4], [0, 2.5, -6.5], '#172337')
    for (const x of [-11, -8, -5, 5, 8, 11]) {
      s.box([2.1, 3.9, 1.5], [x, 1.95, -5.2], '#1f2b3c', 0.08)
      for (let y = 0.4; y < 3.9; y += 0.4) {
        s.box([1.8, 0.22, 0.04], [x, y, -4.43], '#46566e')
        s.box([0.5, 0.07, 0.05], [x - 0.5, y, -4.39], '#80e1de')
      }
    }
    s.cylinder(1.35, 3.8, [0, 1.9, -5.4], '#415a80', 1.35, 12)
    for (const y of [0.5, 1.4, 2.3, 3.2]) s.cylinder(1.42, 0.12, [0, y, -5.4], '#8abaf1', 1.42, 12)
    for (const z of [-3.4, 3.4]) {
      s.box([26, 0.02, 0.07], [0, 0.08, z], '#80d6e1')
      for (let x = -12; x <= 12; x += 3)
        s.box([0.06, 0.02, 1.2], [x, 0.08, z - Math.sign(z) * 0.55], '#7486b7')
    }
    s.box([27, 0.3, 0.6], [0, 4.6, -5.5], '#586784')
    sign(0, 4.8)
  }
}

function buildNewDistrict(s: CitySet, city: City, segment: number) {
  const theme = THEMES[city]
  const key = `${city}-${segment}`
  const pavilion = (x: number, color: string) => {
    for (const dx of [-2.4, 2.4]) s.cylinder(0.16, 3.8, [x + dx, 1.9, -5.8], theme.wood)
    s.box([6, 0.35, 2.8], [x, 3.9, -5.8], color)
    s.box([4.8, 0.4, 2], [x, 4.25, -5.8], color)
  }
  const shop = (x: number, label: string, color: string) => {
    s.box([5.7, 4.6, 2], [x, 2.3, -6], theme.wall)
    s.box([4.9, 2.5, 0.06], [x, 1.3, -4.97], '#24333d')
    s.text(label, 4.8, 0.8, [x, 3.3, -4.93], color, '#222b39')
    s.box([5.4, 0.12, 0.25], [x, 4.2, -4.8], color)
  }
  if (key === 'beijing-2') {
    s.box([8, 3.6, 3], [0, 1.8, -6.7], '#a2523d')
    pavilion(0, '#575d61')
    s.cylinder(0.8, 1.2, [0, 4.6, -5.8], '#af7950')
    for (const x of [-10, -6, 6, 10]) {
      s.cylinder(0.35, 1.3, [x, 0.65, -4.8], '#ae9277')
      s.sphere(0.48, [x, 1.5, -4.8], '#c6b399')
    }
  } else if (key === 'beijing-3') {
    for (const x of [-11, 11]) {
      s.box([0.14, 4, 0.2], [x, 2, -5], '#c4c9bf')
      s.box([2.7, 1.6, 0.12], [x, 3.7, -4.9], '#eeeece')
      s.box([1.1, 0.08, 0.85], [x, 3.15, -4.5], '#d5674e')
    }
    for (const z of [-3.4, 3.4]) s.box([23, 0.02, 0.08], [0, 0.08, z], '#eee5c2')
    s.box([0.08, 0.02, 6.8], [0, 0.08, 0], '#eee5c2')
    s.skyline(city)
  } else if (key === 'beijing-4') {
    s.box([27, 5, 1], [0, 2.5, -6], '#876657')
    for (const x of [-10, -3, 4, 11]) {
      s.box([4.6, 2.5, 0.08], [x, 2.6, -5.45], '#344751')
      const art = s.box([1.4, 1.4, 0.2], [x, 2.6, -5.3], x < 0 ? '#e5a34c' : '#60a7a0')
      art.rotation.z = Math.PI / 4
    }
    s.cylinder(0.6, 7, [-10, 3.5, -8], '#985e45')
  } else if (key === 'shanghai-2') {
    for (const [i, x] of [-10, -3.4, 3.4, 10].entries()) {
      shop(x, ['ARCADE', '夜 · 唱片', 'OFFLINE', '24H 咖啡'][i]!, i % 2 ? '#ec81bb' : '#77dbed')
      s.box([0.12, 4.8, 0.2], [x - 2.6, 2.4, -4.8], '#b884f1')
    }
  } else if (key === 'shanghai-3') {
    s.box([35, 0.06, 12], [0, -0.35, -10], '#33677e')
    s.box([13, 1.6, 3], [0, 0.5, -7.7], '#e9ddc2', 0.4)
    s.box([8, 1.5, 2], [0, 2, -7.7], '#7196aa', 0.15)
    s.box([9, 0.2, 2.5], [0, 2.85, -7.7], '#e4c765')
    for (const x of [-10, -7, 7, 10]) s.cylinder(0.16, 1.3, [x, 0.65, -4.8], '#baa888')
  } else if (key === 'shanghai-4') {
    s.skyline(city)
    for (const x of [-10, -5, 5, 10]) {
      s.planter(x, -4.9, 'tree')
      s.box([3.4, 0.5, 0.7], [x, 0.3, -4.4], '#abb99d')
    }
    s.box([8, 0.3, 2], [0, 3.8, -5.8], '#6f897c')
    for (const x of [-3.7, 3.7]) s.box([0.2, 3.8, 0.2], [x, 1.9, -5.8], '#9eaf95')
  } else if (key === 'hangzhou-2') {
    for (let x = -12; x <= 12; x += 2) {
      s.planter(x, -5.4 - Math.abs(x % 3), 'bamboo')
      if (x % 4 === 0) s.sphere(0.7, [x, 0.3, -4.8], '#91a291', [1.3, 0.7, 1])
    }
  } else if (key === 'hangzhou-3') {
    pavilion(-8, '#72695a')
    pavilion(8, '#72695a')
    for (const x of [-2.5, 2.5]) s.box([0.7, 4.5, 0.8], [x, 2.25, -5.5], '#ad7656')
    s.box([7, 0.5, 2], [0, 4.5, -5.5], '#5e6c63')
    s.cylinder(0.9, 1.4, [8, 2.6, -5.5], '#a99866')
  } else if (key === 'hangzhou-4') {
    for (const x of [-10, -3.3, 3.3, 10]) {
      shop(x, '旧书 · 新故事', '#d4c89f')
      for (let i = 0; i < 9; i++)
        s.box(
          [0.25, 0.5 + (i % 3) * 0.13, 0.5],
          [x - 1.6 + i * 0.4, 0.5, -4.7],
          i % 2 ? '#ad8066' : '#6b9588',
        )
      const umbrella = s.cylinder(1.3, 0.5, [x, 3.3, -4.8], '#85a8a3', 0.1)
      umbrella.rotation.z = 0.1
    }
  } else if (key === 'california-2') {
    s.box([35, 0.04, 10], [0, -0.3, -10], '#73b6c5')
    for (const x of [-9, 9]) {
      s.cylinder(0.1, 3.2, [x, 1.6, -4.9], '#dfb35e')
      s.planter(x * 1.3, -6, 'palm')
    }
    for (let x = -9; x <= 9; x++) s.box([0.035, 1.25, 0.035], [x, 2.1, -4.9], '#f4e9ca')
    for (const y of [1.5, 1.8, 2.1, 2.4, 2.7]) s.box([18, 0.035, 0.035], [0, y, -4.9], '#f4e9ca')
    for (const z of [-3, 3]) s.box([20, 0.015, 0.08], [0, 0.08, z], '#f4e9ca')
  } else if (key === 'california-3') {
    s.box([14, 0.9, 4], [0, 0.45, -6.5], '#3c3548')
    for (const x of [-7, 7]) {
      s.box([0.25, 6, 0.25], [x, 3, -5.5], '#adb1b1')
      s.box([1.8, 3.5, 1.3], [x, 1.8, -5.3], '#272536')
      for (const y of [1, 2.6])
        s.cylinder(0.55, 0.15, [x, y, -4.58], '#61526d').rotation.x = Math.PI / 2
    }
    s.box([14, 0.25, 0.3], [0, 6, -5.5], '#adb1b1')
    for (let x = -6; x <= 6; x += 2) s.sphere(0.2, [x, 5.7, -5.3], x % 4 ? '#ed9cbd' : '#84d7d2')
    s.text('NO SIGNAL / LIVE', 9, 1.8, [0, 3.4, -5], '#e7a7d2', '#352945')
  } else if (key === 'california-4') {
    for (const x of [-11, -7, 7, 11]) {
      s.cylinder(1.9, 4 + Math.abs(x) / 3, [x, 1, -9], '#bf8966', 0.7, 6)
    }
    s.box([13, 0.4, 4], [0, 4, -5.8], '#d3b691')
    for (const x of [-5, 0, 5]) {
      s.box([1.3, 2.2, 1], [x, 1.1, -4.9], '#d37c60', 0.1)
      s.box([1, 0.7, 0.06], [x, 1.7, -4.36], '#3a4951')
      s.cylinder(0.1, 4, [x, 2, -6], '#ccbaa0')
    }
  } else if (key === 'shenzhen-2') {
    for (const x of [-10, -3.3, 3.3, 10]) {
      shop(x, '芯片 · 维修 · 刷机', '#88e0dc')
      for (let i = 0; i < 6; i++)
        s.box([0.55, 0.7, 0.12], [x - 2 + i * 0.8, 1.2, -4.8], i % 2 ? '#7297c1' : '#b897d2')
    }
  } else if (key === 'shenzhen-3') {
    s.skyline(city)
    for (const x of [-9, 0, 9]) {
      s.cylinder(1.8, 0.08, [x, 0.1, -4.8], '#79abae', 1.8, 24)
      s.box([1.2, 0.5, 0.7], [x, 2.7, -5.6], '#b4cdd1', 0.1)
      for (const dx of [-1, 1])
        for (const dz of [-0.6, 0.6]) {
          s.box([2.4, 0.09, 0.1], [x, 2.7, -5.6 + dz], '#8fa4b6')
          s.cylinder(0.65, 0.03, [x + dx, 2.9, -5.6 + dz], '#53677c', 0.65, 16)
        }
    }
  } else {
    for (const y of [0.9, 2.1, 3.3]) {
      const pipe = s.cylinder(0.32, 27, [0, y, -5.8], '#63a9b4', 0.32, 12)
      pipe.rotation.z = Math.PI / 2
      for (const x of [-10, -3, 4, 11]) s.box([0.2, 0.85, 0.85], [x, y, -5.8], '#9ec4c4')
    }
    for (const x of [-11, 11]) {
      s.cylinder(1, 4.5, [x, 2.25, -7], '#486f86')
      s.box([0.25, 3.5, 0.1], [x, 2.25, -5.95], '#8ee7d7')
    }
  }
  s.text(blockAt(city, segment).name, 5.8, 0.65, [0, 5.2, -5.1], '#f3e5ba', theme.wall)
}
