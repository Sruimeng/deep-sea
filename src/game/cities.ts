import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
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
    theme = THEMES[stage.city]
  s.box([27, 0.5, 12], [0, -0.3, 0], theme.edge, 0.12)
  s.box([27, 0.12, 11.8], [0, -0.01, 0], theme.floor)
  for (let x = -12; x <= 12; x += stage.city === 'california' ? 0.65 : 2)
    s.box([0.018, 0.008, 11.6], [x, 0.06, 0], theme.edge)
  if (stage.city !== 'california')
    for (let z = -4; z <= 4; z += 2) s.box([26.6, 0.008, 0.018], [0, 0.06, z], theme.edge)
  s.box([35, 0.15, 6], [0, -0.5, -9], theme.sky)
  s.box([27, 0.12, 0.15], [0, 0.15, 5.7], '#f9cf00')
  const floorMark = s.text(
    `0${segment + 1}  /  ${['ENTRY', 'SIDE STREET', 'LAST BLOCK'][segment]}  →`,
    5.6,
    0.65,
    [0, 0.065, 4.5],
    stage.city === 'shanghai' || stage.city === 'shenzhen' ? '#abb0c4' : '#6f665b',
  )
  floorMark.rotation.x = -Math.PI / 2

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
