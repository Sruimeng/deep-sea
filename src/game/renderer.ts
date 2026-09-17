import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { attackMove } from './attacks'
import { HIT_FEEDBACK, damagePose } from './combat-feedback'
import { STAGES } from './content'
import { buildCityRoom } from './cities'
import { cameraTarget, STREET, streetCenter } from './street'
import type { Game } from './simulation'
import type { Actor, Effect, Prop } from './types'

interface Visual {
  group: THREE.Group
  body: THREE.Group
  shadow: THREE.Mesh
  bar: THREE.Mesh
  mixer?: THREE.AnimationMixer
  actions?: Record<string, THREE.AnimationAction>
  action?: string
  limbs?: THREE.Group[]
  asset?: boolean
  flashMaterials?: THREE.MeshStandardMaterial[]
}
interface Model {
  scene: THREE.Group
  clips: THREE.AnimationClip[]
}
const PALETTE = {
  dark: '#1b1d20',
  lime: '#f9cf00',
  paper: '#e7e9dc',
  floor: '#c3cbb9',
  orange: '#ff9159',
}

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera()
  private sun = new THREE.DirectionalLight()
  private ambient = new THREE.HemisphereLight()
  private room = new THREE.Group()
  private landmarks = new THREE.Group()
  private dynamic = new THREE.Group()
  private route = new THREE.Group()
  private cameraX: number | undefined
  private actors = new Map<number, Visual>()
  private props = new Map<number, THREE.Group>()
  private ephemeral = new Map<number, THREE.Object3D>()
  private models = new Map<string, Model>()
  private materials = new Map<string, THREE.MeshStandardMaterial>()
  private size: ResizeObserver
  private currentStage = -1
  private clock = 0
  private disposed = false
  private portrait = false
  private shake = 0
  private cameraPunch = 0
  private kickDirection = 1
  private handledEffects = new Set<number>()
  lowMotion = false
  onProgress?: (value: number, text: string) => void

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.setClearColor('#191d19', 0)
    this.renderer.domElement.setAttribute('aria-label', 'VAST 断网大作战 3D 游戏场景')
    this.host.appendChild(this.renderer.domElement)
    const ambient = new THREE.HemisphereLight('#f1f3ff', '#73737d', 2.1)
    const sun = new THREE.DirectionalLight('#fff2da', 3.2)
    this.sun = sun
    this.ambient = ambient
    sun.position.set(-8, 18, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, {
      left: -22,
      right: 22,
      top: 16,
      bottom: -16,
      near: 0.5,
      far: 70,
    })
    sun.shadow.normalBias = 0.04
    const rim = new THREE.DirectionalLight('#c6e3ff', 1.3)
    rim.position.set(9, 7, -8)
    this.scene.add(
      ambient,
      sun,
      sun.target,
      rim,
      this.room,
      this.landmarks,
      this.dynamic,
      this.route,
    )
    const gate = new THREE.Group()
    gate.name = 'gate'
    for (const z of [-3.7, 3.7]) {
      this.box(gate, [0.24, 1.15, 0.24], [0, 0.58, z], '#f9cf00')
    }
    this.box(gate, [0.12, 0.03, 7.4], [0, 0.09, 0], '#ff795c')
    const arrows = new THREE.Group()
    arrows.name = 'arrows'
    for (const x of [-1.3, 0, 1.3]) {
      for (const direction of [-1, 1]) {
        const bar = this.box(arrows, [1.2, 0.035, 0.22], [x, 0.12, direction * 0.35], '#f9cf00')
        bar.rotation.y = direction * 0.7
      }
    }
    this.route.add(gate, arrows)
    this.camera.position.set(6, 15, 22)
    this.camera.lookAt(0, 0, 0)
    this.size = new ResizeObserver(() => this.resize())
    this.size.observe(host)
    this.resize()
  }
  async load() {
    let loaded = 0
    const loader = new GLTFLoader()
    const files = [
      'hero',
      'packet',
      'spinner',
      'guard',
      'charger',
      'router',
      ...STAGES.map((stage) => stage.city),
    ]
    const results = await Promise.allSettled(
      files.map(async (name) => {
        const gltf = await loader.loadAsync(`/models/${name}.glb?v=action-crowd-20260917`)
        if (this.disposed) {
          this.disposeObject(gltf.scene)
          return
        }
        gltf.scene.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return
          node.castShadow = true
          node.receiveShadow = true
          const materials = Array.isArray(node.material) ? node.material : [node.material]
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = Math.max(0.38, material.roughness)
            }
          })
        })
        this.models.set(name, { scene: gltf.scene, clips: gltf.animations })
        loaded++
        this.onProgress?.(
          Math.round((loaded / files.length) * 100),
          `资源就绪 ${loaded} / ${files.length}`,
        )
      }),
    )
    this.clearActors()
    this.currentStage = -1
    return results.every((result) => result.status === 'fulfilled')
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    const aspect = w / h
    this.portrait = aspect < 0.9
    const size = this.portrait ? 31 : Math.max(17.7, 31 / aspect)
    this.camera.left = (-size * aspect) / 2
    this.camera.right = (size * aspect) / 2
    this.camera.top = size / 2
    this.camera.bottom = -size / 2
    this.camera.near = 0.1
    this.camera.far = 150
    this.camera.updateProjectionMatrix()
  }
  private mat(color: string) {
    let material = this.materials.get(color)
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.82 })
      this.materials.set(color, material)
    }
    return material
  }
  private box(parent: THREE.Object3D, dimensions: number[], position: number[], color: string) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions[0], dimensions[1], dimensions[2]),
      this.mat(color),
    )
    mesh.position.set(position[0]!, position[1]!, position[2]!)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  private cylinder(
    parent: THREE.Object3D,
    radius: number,
    height: number,
    position: number[],
    color: string,
    sides = 10,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, height, sides),
      this.mat(color),
    )
    mesh.position.set(position[0]!, position[1]!, position[2]!)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  private buildRoom(stage: number) {
    this.clearGroup(this.room)
    this.clearGroup(this.landmarks)
    this.currentStage = stage
    this.cameraX = undefined
    const info = STAGES[stage]!
    const lighting = [
      { sun: '#ffe0b0', ambient: '#c8d8f2', power: 3.0, fill: 1.9 },
      { sun: '#9ab9f5', ambient: '#95bafa', power: 1.5, fill: 1.7 },
      { sun: '#fff1d1', ambient: '#d5ebdf', power: 2.6, fill: 2.1 },
      { sun: '#ffbf83', ambient: '#ecbfbd', power: 3.2, fill: 1.8 },
      { sun: '#d2c5ff', ambient: '#acb4ef', power: 1.8, fill: 1.8 },
    ][stage]!
    this.sun.color.set(lighting.sun)
    this.sun.intensity = lighting.power
    this.ambient.color.set(lighting.ambient)
    this.ambient.intensity = lighting.fill

    info.waves.forEach((_, segment) => {
      const block = buildCityRoom(info, (color) => this.mat(color), segment)
      block.position.x = streetCenter(segment)
      this.room.add(block)
    })
    const asset = this.models.get(info.city)
    if (asset) {
      const landmark = clone(asset.scene)
      const bounds = new THREE.Box3().setFromObject(landmark)
      const size = bounds.getSize(new THREE.Vector3())
      const scale = Math.min(
        9 / size.x,
        (info.city === 'shanghai' || info.city === 'shenzhen' ? 7 : 4.7) / size.y,
      )
      landmark.scale.setScalar(scale)
      const center = bounds.getCenter(new THREE.Vector3())
      landmark.position.set(
        6.2 - center.x * scale,
        -bounds.min.y * scale - 0.3,
        -8 - center.z * scale,
      )
      this.landmarks.add(landmark)
      const lastLandmark = clone(landmark)
      lastLandmark.position.x += streetCenter(info.waves.length - 1)
      this.landmarks.add(lastLandmark)
    }
    const logo = new THREE.TextureLoader().load('/brand/tripo-mark.svg')
    logo.colorSpace = THREE.SRGBColorSpace
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: logo, transparent: true }),
    )
    sign.position.set(-11.5, 2.9, -5.1)
    this.landmarks.add(sign)
  }
  private mergeRoom() {
    this.room.updateMatrixWorld(true)
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
    const meshes: THREE.Mesh[] = []
    this.room.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || Array.isArray(node.material)) return
      const geometry = (
        node.geometry.index ? node.geometry.toNonIndexed() : node.geometry.clone()
      ).applyMatrix4(node.matrixWorld)
      const batch = batches.get(node.material) ?? []
      batch.push(geometry)
      batches.set(node.material, batch)
      meshes.push(node)
    })
    meshes.forEach((mesh) => {
      mesh.removeFromParent()
      mesh.geometry.dispose()
    })
    batches.forEach((geometries, material) => {
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((geometry) => geometry.dispose())
      if (!merged) return
      const mesh = new THREE.Mesh(merged, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.room.add(mesh)
    })
  }
  private fallback(kind: Actor['kind']): { body: THREE.Group; limbs: THREE.Group[] } {
    const body = new THREE.Group(),
      limbs: THREE.Group[] = []
    const color =
      kind === 'hero'
        ? PALETTE.lime
        : kind === 'spinner'
          ? '#91b3fa'
          : kind === 'guard'
            ? '#798590'
            : '#f39552'
    this.box(body, [0.78, 0.85, 0.5], [0, 1.2, 0], color)
    this.box(body, [0.82, 0.76, 0.65], [0, 2, 0], kind === 'hero' ? '#e3bf97' : color)
    if (kind === 'hero') this.box(body, [0.86, 0.23, 0.7], [0, 2.34, 0], '#262a26')
    for (const x of [-0.23, 0.23]) this.box(body, [0.12, 0.13, 0.035], [x, 2.05, 0.34], '#202920')
    for (const x of [-0.25, 0.25, -0.55, 0.55]) {
      const limb = new THREE.Group()
      const arm = Math.abs(x) > 0.3
      limb.position.set(x, arm ? 1.6 : 0.85, 0)
      this.box(
        limb,
        [arm ? 0.28 : 0.3, arm ? 0.6 : 0.7, 0.32],
        [0, -0.28, 0],
        arm ? color : '#343b32',
      )
      this.box(limb, [0.33, 0.22, 0.48], [0, -0.59, 0.08], '#eeeadd')
      body.add(limb)
      limbs.push(limb)
    }
    return { body, limbs }
  }
  private createActor(actor: Actor): Visual {
    const group = new THREE.Group()
    const key = actor.kind === 'boss' ? 'router' : actor.kind
    const asset = this.models.get(key)
    let body: THREE.Group,
      limbs: THREE.Group[] | undefined,
      mixer: THREE.AnimationMixer | undefined,
      actions: Record<string, THREE.AnimationAction> | undefined
    const flashMaterials: THREE.MeshStandardMaterial[] = []
    if (asset) {
      body = clone(asset.scene) as THREE.Group
      body.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return
        const copy = (material: THREE.Material) => {
          const owned = material.clone()
          if (owned instanceof THREE.MeshStandardMaterial) {
            flashMaterials.push(owned)
            owned.userData.actorOwned = true
          }
          return owned
        }
        node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material)
      })
      const bounds = new THREE.Box3().setFromObject(body),
        dimensions = bounds.getSize(new THREE.Vector3())
      const height =
        actor.kind === 'boss'
          ? 3.8
          : actor.kind === 'hero'
            ? 3.15
            : actor.kind === 'guard'
              ? 2.65
              : actor.kind === 'charger'
                ? 1.45
                : actor.kind === 'spinner'
                  ? 1.5
                  : 1.5
      const scale = height / dimensions.y
      body.scale.setScalar(scale)
      body.position.y = -bounds.min.y * scale
      if (asset.clips.length) {
        mixer = new THREE.AnimationMixer(body)
        actions = {}
        asset.clips.forEach((clip) => (actions![clip.name] = mixer!.clipAction(clip)))
      }
    } else {
      const fallback = this.fallback(actor.kind)
      body = fallback.body
      limbs = fallback.limbs
    }
    const rotating = new THREE.Group()
    rotating.add(body)
    group.add(rotating)
    if (actor.kind === 'guard' && !asset)
      this.box(rotating, [1.05, 1.3, 0.16], [0, 1.1, 0.6], '#91acbe')
    if (actor.kind === 'spinner' && !asset) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.62, 0.075, 6, 24, Math.PI * 1.65),
        this.mat('#8cacfb'),
      )
      ring.position.set(0, 2.3, 0)
      ring.name = 'halo'
      rotating.add(ring)
    }
    if (actor.kind === 'charger') {
      const telegraph = new THREE.Mesh(
        new THREE.PlaneGeometry(0.48, 8),
        new THREE.MeshBasicMaterial({
          color: '#ff503a',
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        }),
      )
      telegraph.rotation.x = -Math.PI / 2
      telegraph.name = 'charge-warning'
      group.add(telegraph)
    }
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(actor.kind === 'boss' ? 1.55 : 0.6, 24),
      new THREE.MeshBasicMaterial({
        color: '#243023',
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.03
    group.add(shadow)
    if (actor.kind === 'hero') {
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.67, 0.77, 32),
        new THREE.MeshBasicMaterial({ color: PALETTE.lime, side: THREE.DoubleSide }),
      )
      marker.rotation.x = -Math.PI / 2
      marker.position.y = 0.045
      group.add(marker)
    }
    const bar = this.box(
      group,
      [1.1, 0.08, 0.04],
      [0, actor.kind === 'boss' ? 3.8 : 2.8, 0],
      '#ff7252',
    )
    bar.visible = false
    this.dynamic.add(group)
    return {
      group,
      body: rotating,
      shadow,
      bar,
      limbs,
      mixer,
      actions,
      asset: !!asset,
      flashMaterials,
    }
  }
  private updateActor(actor: Actor, game: Game, dt: number) {
    let visual = this.actors.get(actor.id)
    if (!visual) {
      visual = this.createActor(actor)
      this.actors.set(actor.id, visual)
    }
    const { group, body, bar, limbs, mixer, actions } = visual
    group.position.set(actor.x, 0, actor.z)
    const targetY = actor.facing === 1 ? Math.PI * 0.43 : -Math.PI * 0.43
    const turn = Math.atan2(
      Math.sin(targetY - body.rotation.y),
      Math.cos(targetY - body.rotation.y),
    )
    body.rotation.y += turn * (1 - Math.exp(-dt * (actor.attack > 0 ? 35 : 20)))
    body.position.y = actor.y
    body.position.x = 0
    body.rotation.x = 0
    const attacking = actor.attack > 0
    const isHero = actor.kind === 'hero'
    const running =
      dt === 0
        ? (group.userData.running ?? false)
        : actor.walk !== (group.userData.walk ?? actor.walk)
    group.userData.running = running
    group.userData.walk = actor.walk
    body.rotation.z =
      actor.hp <= 0
        ? Math.min(actor.dead * 3, Math.PI / 2) * actor.facing
        : actor.hurt > 0 && !(isHero && actor.strike === 5 && attacking)
          ? -Math.sign(actor.vx || actor.facing) *
            Math.sin((Math.min(1, actor.hurt / 0.36) * Math.PI) / 2) *
            (actor.kind === 'boss' ? 0.09 : 0.26)
          : 0
    const squash =
      actor.hurt > 0 && !isHero
        ? 1 - Math.min(1, actor.hurt / 0.22) * 0.1
        : actor.windup > 0
          ? 0.93 + Math.sin(this.clock * 35) * 0.015
          : 1
    body.scale.set(1 / squash, squash, 1 / squash)
    if (actor.kind === 'packet' && actor.hp > 0) {
      body.position.y += Math.abs(Math.sin(actor.walk * 9)) * 0.18
      body.rotation.z += Math.sin(actor.walk * 9) * 0.06
    }
    if (actor.kind === 'spinner') {
      body.position.y += 0.9 + Math.sin(this.clock * 3 + actor.id) * 0.2
      body.rotation.z += Math.sin(this.clock * 2) * 0.13
    }
    if (actor.kind === 'guard' && running) body.rotation.z += Math.sin(actor.walk * 5) * 0.045
    if (actor.kind === 'charger') {
      body.rotation.x = actor.attack > 0 ? 0.16 : actor.windup > 0 ? -0.12 : 0
      if (actor.windup > 0) body.position.x = Math.sin(this.clock * 60) * 0.05
    }
    if (actor.kind === 'boss') body.position.y += Math.sin(this.clock * 3) * 0.08
    if (limbs)
      limbs.forEach((limb, i) => {
        limb.rotation.x = running ? Math.sin(actor.walk * 3 + (i % 2) * Math.PI) * 0.65 : 0
        if (attacking) {
          const t = 1 - actor.attack / Math.max(0.01, actor.attackDuration)
          const extension =
            Math.sin((Math.min(1, t / 0.3) * Math.PI) / 2) * (1 - Math.max(0, (t - 0.4) / 0.6))
          if (i >= 2)
            limb.rotation.x = -0.4 - extension * (i === (actor.strike === 1 ? 2 : 3) ? 1.5 : 0.25)
          else limb.rotation.x = extension * (i ? 0.3 : -0.3)
        }
      })
    if (mixer && actions) {
      const previousY = group.userData.previousY ?? actor.y
      if (isHero && previousY > 0 && actor.y === 0) group.userData.landing = 0.24
      group.userData.previousY = actor.y
      group.userData.landing = Math.max(0, (group.userData.landing ?? 0) - dt)
      const desired =
        actor.hp <= 0
          ? 'fall'
          : attacking
            ? isHero
              ? attackMove(actor.strike).clip
              : 'punch'
            : isHero && game.dashTime > 0
              ? 'dash'
              : actor.y > 0.15
                ? 'jump'
                : actor.hurt > 0.5
                  ? 'hurt'
                  : isHero && group.userData.landing > 0 && !running
                    ? 'land'
                    : running
                      ? 'run'
                      : 'idle'
      const repeated = attacking && group.userData.attackId !== actor.attackId
      if ((visual.action !== desired || repeated) && actions[desired]) {
        const previous = visual.action ? actions[visual.action] : undefined
        const next = actions[desired]!
        next.reset().setEffectiveWeight(1).play()
        next.setLoop(
          ['idle', 'run'].includes(desired) ? THREE.LoopRepeat : THREE.LoopOnce,
          Infinity,
        )
        next.clampWhenFinished = true
        next.timeScale = 1
        if (previous && previous !== next) {
          const blend = attacking ? 0.035 : 0.12
          previous.fadeOut(blend)
          next.fadeIn(blend)
        }
        visual.action = desired
        group.userData.attackId = actor.attackId
      }
      const action = visual.action ? actions[visual.action] : undefined
      if (action) {
        action.paused = attacking
        if (attacking && actor.attackDuration) {
          // Simulation owns contact time; hit stop must hold the fist at impact.
          action.time = (1 - actor.attack / actor.attackDuration) * action.getClip().duration
        } else if (desired === 'run') {
          action.time = ((actor.walk % 2.8) / 2.8) * action.getClip().duration
          action.paused = true
        }
      }
      mixer.update(dt)
    } else if (attacking) body.rotation.x = Math.sin(actor.attack * 12) * -0.2
    if (isHero && !visual.asset && game.dashTime > 0) body.rotation.z = -actor.facing * 0.3
    visual.flashMaterials?.forEach((material) => {
      material.emissive.set(
        actor.hurt > 0 && !isHero ? '#fff1b2' : actor.windup > 0 ? '#ff412a' : '#000000',
      )
      material.emissiveIntensity =
        actor.hurt > 0 && !isHero
          ? 1.5
          : actor.windup > 0
            ? 0.25 + Math.sin(this.clock * 20) * 0.15
            : 0
    })
    bar.visible = actor.hp > 0 && actor.hp < actor.maxHp && !isHero && actor.kind !== 'boss'
    bar.scale.x = Math.max(0.01, actor.hp / actor.maxHp)
    if (actor.hp <= 0) group.scale.setScalar(Math.max(0.01, 1 - actor.dead / 0.7))
    else group.scale.setScalar(game.mode === 'menu' && isHero ? 1.35 : 1)
    if (isHero && actor.hurt > 0 && !(attacking && actor.strike === 5) && !this.lowMotion)
      body.visible = Math.floor(actor.hurt * 20) % 2 === 0
    else body.visible = true
    const warning = group.getObjectByName('charge-warning')
    if (warning) {
      warning.visible = actor.windup > 0
      const dx = actor.target.x - actor.x,
        dz = actor.target.z - actor.z
      const d = Math.hypot(dx, dz) || 1
      warning.position.set((dx / d) * 4, 0.08, (dz / d) * 4)
      warning.rotation.z = Math.atan2(dx, dz)
    }
    const halo = body.getObjectByName('halo')
    if (halo) halo.rotation.z = this.clock * 3
    let handWeapon = body.getObjectByName('held')
    if (isHero && game.weapon && !handWeapon) {
      handWeapon = this.propModel(game.weapon)
      handWeapon.name = 'held'
      handWeapon.scale.setScalar(0.55)
      body.add(handWeapon)
    }
    if (handWeapon && (!game.weapon || !isHero)) {
      body.remove(handWeapon)
      this.disposeObject(handWeapon, false)
    }
    if (handWeapon) {
      handWeapon.position.set(0.65, 1.1, attacking ? 0.9 : 0.4)
      handWeapon.rotation.z = attacking ? -1.3 : -0.3
    }
  }
  private propModel(kind: Prop['kind']): THREE.Group {
    const group = new THREE.Group()
    if (kind === 'keyboard') {
      this.box(group, [1.05, 0.13, 0.43], [0, 0.12, 0], '#353b31')
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 3; j++)
          this.box(
            group,
            [0.085, 0.04, 0.085],
            [-0.43 + i * 0.108, 0.21, -0.12 + j * 0.12],
            i === 0 ? '#f9cf00' : '#e1e4d5',
          )
    } else if (kind === 'chair') {
      this.box(group, [0.9, 0.2, 0.9], [0, 0.7, 0], '#566a50')
      this.box(group, [0.9, 0.9, 0.15], [0, 1.2, -0.4], '#566a50')
      this.cylinder(group, 0.08, 0.6, [0, 0.3, 0], '#303c30')
      this.box(group, [1.1, 0.07, 0.12], [0, 0.12, 0], '#313b31')
      this.box(group, [0.12, 0.07, 1.1], [0, 0.12, 0], '#313b31')
    } else if (kind === 'relay') {
      this.box(group, [0.85, 1.5, 0.65], [0, 0.75, 0], '#313e36')
      this.box(group, [0.55, 1, 0.05], [0, 0.9, 0.35], '#93bbff')
      this.box(group, [0.08, 0.8, 0.08], [0, 1.8, 0], '#f9cf00')
    } else {
      this.box(group, [0.9, 0.8, 0.85], [0, 0.4, 0], '#cfa36a')
      this.box(group, [0.15, 0.82, 0.87], [0, 0.4, 0], '#e6c78e')
    }
    return group
  }
  private effectObject(effect: Effect) {
    const group = new THREE.Group()
    if (effect.kind === 'damage') {
      const feedback = HIT_FEEDBACK[effect.hitKind ?? 'light']
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const value = String(effect.damage ?? 0)
      ctx.font = 'italic 900 110px "Arial Black", sans-serif'
      const numberWidth = ctx.measureText(value).width
      ctx.font = '900 25px sans-serif'
      canvas.width = Math.ceil(Math.max(numberWidth, ctx.measureText(feedback.label).width) + 48)
      canvas.height = feedback.label ? 174 : 138
      ctx.textAlign = 'center'
      ctx.lineJoin = 'round'
      ctx.font = 'italic 900 110px "Arial Black", sans-serif'
      ctx.strokeStyle = '#15131a'
      ctx.lineWidth = 16
      ctx.shadowColor = '#080811'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 5
      ctx.shadowOffsetY = 7
      ctx.strokeText(value, canvas.width / 2, 112)
      ctx.shadowOffsetX = ctx.shadowOffsetY = 0
      const gradient = ctx.createLinearGradient(0, 28, 0, 120)
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.4, feedback.color)
      gradient.addColorStop(1, effect.hitKind === 'block' ? '#6399db' : '#ff963c')
      ctx.fillStyle = gradient
      ctx.fillText(value, canvas.width / 2, 112)
      if (feedback.label) {
        ctx.font = '900 25px sans-serif'
        ctx.lineWidth = 7
        ctx.strokeText(feedback.label, canvas.width / 2, 153)
        ctx.fillStyle = feedback.color
        ctx.fillText(feedback.label, canvas.width / 2, 153)
      }
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }),
      )
      sprite.renderOrder = 20
      sprite.scale.set(canvas.width / 110, canvas.height / 110, 1)
      group.add(sprite)
    } else if (effect.kind === 'text') {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 100
      const ctx = canvas.getContext('2d')!
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 48px sans-serif'
      ctx.lineWidth = 9
      ctx.strokeStyle = '#1b2019'
      ctx.strokeText(effect.text || '', 256, 50)
      ctx.fillStyle = effect.color
      ctx.fillText(effect.text || '', 256, 50)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }))
      sprite.scale.set(effect.text && effect.text.length > 4 ? 3.8 : 2, 0.6, 1)
      group.add(sprite)
    } else if (effect.kind === 'slash') {
      const arc = new THREE.Mesh(
        new THREE.RingGeometry(0.8, 1.02, 32, 1, -1.2, 2.4),
        new THREE.MeshBasicMaterial({
          color: effect.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        }),
      )
      arc.rotation.x = -Math.PI / 2 + (effect.power === 2 ? 0.65 : 0.25)
      arc.rotation.z = effect.facing === -1 ? Math.PI : 0
      group.add(arc)
    } else if (effect.kind === 'impact') {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const ctx = canvas.getContext('2d')!
      const blocked = effect.hitKind === 'block'
      ctx.translate(128, 128)
      ctx.rotate((effect.facing ?? 1) * 0.3)
      if (blocked) {
        ctx.strokeStyle = effect.color
        ctx.lineWidth = 14
        ctx.beginPath()
        ctx.arc(0, 0, 73, -1.3, 1.3)
        ctx.stroke()
      } else {
        for (const [radius, inner, color] of [
          [116, 26, '#201522'],
          [104, 23, effect.color],
          [62, 15, '#ffffff'],
        ] as const) {
          ctx.beginPath()
          for (let i = 0; i < 24; i++) {
            const angle = (i * Math.PI) / 12
            const r = i % 2 ? inner : radius * (i % 3 ? 0.75 : 1)
            const x = Math.cos(angle) * r,
              y = Math.sin(angle) * r * 0.78
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fillStyle = color
          ctx.fill()
        }
      }
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      const burst = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: false }),
      )
      burst.name = 'burst'
      burst.renderOrder = 10
      group.add(burst)
      for (let i = 0; i < (blocked ? 4 : 8); i++) {
        const ray = new THREE.Mesh(
          new THREE.PlaneGeometry(0.07, 0.6),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? '#ffffff' : effect.color,
            transparent: true,
            depthWrite: false,
            depthTest: false,
          }),
        )
        ray.userData.angle = (i * Math.PI) / 4 + 0.2
        ray.rotation.z = -ray.userData.angle
        group.add(ray)
      }
    } else if (effect.kind === 'special' || effect.kind === 'reward') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1, 0.08, 6, 64),
        new THREE.MeshBasicMaterial({ color: effect.color, transparent: true }),
      )
      ring.rotation.x = -Math.PI / 2
      group.add(ring)
    } else {
      for (let i = 0; i < (effect.kind === 'break' ? 9 : 6); i++) {
        const shard = this.box(
          group,
          [0.14, 0.14, effect.kind === 'hit' ? 0.45 : 0.16],
          [0, 0, 0],
          effect.color,
        )
        shard.userData.angle = i * 2.4
        shard.userData.speed = 1 + (i % 3)
      }
    }
    this.dynamic.add(group)
    return group
  }
  render(game: Game, dt: number) {
    this.clock += dt
    if (this.currentStage !== game.stage) {
      this.buildRoom(game.stage)
      this.mergeRoom()
    }
    for (const effect of game.effects) {
      if (this.handledEffects.has(effect.id)) continue
      this.handledEffects.add(effect.id)
      if ((effect.kind !== 'impact' && effect.kind !== 'special') || effect.hitKind === 'block')
        continue
      const power = effect.kind === 'special' ? 2.8 : (effect.power ?? 1)
      this.shake = Math.max(this.shake, power)
      this.cameraPunch = Math.max(this.cameraPunch, power * 0.024)
      this.kickDirection = effect.facing ?? 1
    }
    const menu = game.mode === 'menu'
    const desiredX = menu
      ? -5
      : cameraTarget(game.hero.x, game.hero.facing, STAGES[game.stage]!.waves.length, this.portrait)
    this.cameraX =
      this.cameraX === undefined || menu || game.mode === 'intro'
        ? desiredX
        : this.cameraX + (desiredX - this.cameraX) * (1 - Math.exp(-dt * 7))
    const target = new THREE.Vector3(this.cameraX, 0, -0.4)
    this.sun.position.set(this.cameraX - 8, 18, 8)
    this.sun.target.position.set(this.cameraX, 0, 0)
    this.route.visible = game.mode === 'playing' || game.mode === 'paused'
    this.route.getObjectByName('gate')!.visible = !game.advancing
    this.route.getObjectByName('arrows')!.visible = game.advancing
    this.route.position.set(
      game.advancing
        ? Math.min(game.hero.x + 5, streetCenter(game.wave + 1) + STREET.entry)
        : streetCenter(game.wave) + STREET.halfWidth,
      0,
      game.advancing ? game.hero.z : 0,
    )
    this.camera.position.set(target.x + 6, 15, 22)
    this.shake *= Math.exp(-dt * 16)
    if (this.shake && !this.lowMotion) {
      this.camera.position.x += this.kickDirection * this.shake * 0.18 * Math.cos(this.clock * 62)
      this.camera.position.y += Math.sin(this.clock * 79) * this.shake * 0.055
    }
    this.camera.lookAt(target)
    this.cameraPunch *= Math.exp(-dt * 10)
    this.camera.zoom = 1 + (this.lowMotion ? 0 : this.cameraPunch)
    this.camera.updateProjectionMatrix()
    const actors = [game.hero, ...game.enemies]
    const actorDt = game.hitStop > 0 ? 0 : game.slowTime > 0 ? dt * 0.4 : dt
    for (const actor of actors) this.updateActor(actor, game, actorDt)
    const actorIds = new Set(actors.map((actor) => actor.id))
    for (const [id, visual] of this.actors)
      if (!actorIds.has(id)) {
        this.dynamic.remove(visual.group)
        visual.mixer?.stopAllAction()
        this.disposeObject(visual.group, false)
        this.actors.delete(id)
      }
    for (const prop of game.props) {
      let model = this.props.get(prop.id)
      if (!model) {
        model = this.propModel(prop.kind)
        this.dynamic.add(model)
        this.props.set(prop.id, model)
      }
      model.visible = !prop.broken
      model.position.set(prop.x, 0.04, prop.z)
      if (prop.kind === 'relay' && !prop.broken)
        model.scale.setScalar(1 + Math.sin(this.clock * 8) * 0.025)
    }
    const propIds = new Set(game.props.map((prop) => prop.id))
    for (const [id, model] of this.props)
      if (!propIds.has(id)) {
        this.dynamic.remove(model)
        this.disposeObject(model, false)
        this.props.delete(id)
      }
    const active = new Set<number>()
    for (const projectile of game.projectiles) {
      active.add(projectile.id)
      let model = this.ephemeral.get(projectile.id)
      if (!model) {
        model =
          projectile.kind === 'ring'
            ? new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.08, 6, 20), this.mat('#91b3ff'))
            : this.propModel(projectile.kind)
        this.ephemeral.set(projectile.id, model)
        this.dynamic.add(model)
      }
      model.position.set(projectile.x, projectile.y, projectile.z)
      model.rotation.z += dt * 12
    }
    for (const zone of game.zones) {
      active.add(zone.id)
      let model = this.ephemeral.get(zone.id)
      if (!model) {
        model = new THREE.Mesh(
          new THREE.RingGeometry(0.85, 1, 48),
          new THREE.MeshBasicMaterial({
            color: '#ff503a',
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        )
        model.rotation.x = -Math.PI / 2
        this.dynamic.add(model)
        this.ephemeral.set(zone.id, model)
      }
      model.position.set(zone.x, 0.06, zone.z)
      model.scale.setScalar(zone.radius)
      ;(model as THREE.Mesh).material instanceof THREE.Material &&
        ((model as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity =
          0.35 + Math.abs(Math.sin(this.clock * 12)) * 0.5)
    }
    for (const drop of game.drops) {
      active.add(drop.id)
      let model = this.ephemeral.get(drop.id)
      if (!model) {
        model = new THREE.Mesh(
          drop.kind === 'coffee'
            ? new THREE.CylinderGeometry(0.15, 0.12, 0.3, 10)
            : new THREE.OctahedronGeometry(0.2),
          this.mat(drop.kind === 'coffee' ? '#f1ddaa' : '#d6ff65'),
        )
        this.dynamic.add(model)
        this.ephemeral.set(drop.id, model)
      }
      model.position.set(drop.x, 0.35 + Math.sin(this.clock * 5) * 0.07, drop.z)
      model.rotation.y += dt * 2
    }
    for (const effect of game.effects) {
      active.add(effect.id)
      let model = this.ephemeral.get(effect.id)
      if (!model) {
        model = this.effectObject(effect)
        this.ephemeral.set(effect.id, model)
      }
      const progress = 1 - effect.life / effect.duration
      model.position.set(
        effect.x,
        effect.kind === 'text'
          ? 2.4 + progress
          : effect.kind === 'special'
            ? 0.3
            : (effect.height ?? 1),
        effect.z,
      )
      if (effect.kind === 'damage') {
        const pose = damagePose(effect.duration - effect.life, effect.duration, this.lowMotion)
        const pixels = HIT_FEEDBACK[effect.hitKind ?? 'light'].pixels * (this.portrait ? 0.82 : 1)
        const unit =
          (this.camera.top - this.camera.bottom) / this.camera.zoom / this.host.clientHeight
        model.scale.setScalar(pixels * unit * pose.scale)
        model.position.y = (effect.height ?? 1.4) + 0.6 + pose.rise + (effect.lane ?? 0) * 0.35
        model.position.x += (effect.facing ?? 1) * (pose.drift + (effect.lane ?? 0) * 0.48)
        const screen = model.position.clone().project(this.camera)
        screen.x = THREE.MathUtils.clamp(screen.x, -0.8, 0.8)
        screen.y = THREE.MathUtils.clamp(screen.y, -0.8, 0.8)
        model.position.copy(screen.unproject(this.camera))
        const sprite = model.children[0] as THREE.Sprite
        sprite.material.opacity = pose.opacity
        sprite.material.rotation = this.lowMotion
          ? 0
          : (effect.facing ?? 1) * (0.1 - progress * 0.17)
      } else if (effect.kind === 'impact') {
        model.quaternion.copy(this.camera.quaternion)
        const power = effect.power ?? 1
        model.scale.setScalar(
          (0.7 + Math.sin((Math.min(1, progress * 3) * Math.PI) / 2) * 0.6) * power,
        )
        model.children.forEach((child) => {
          if (child instanceof THREE.Sprite) {
            child.scale.setScalar(1.8 - progress * 0.5)
            child.material.opacity = Math.pow(1 - progress, 1.3)
            return
          }
          const a = child.userData.angle
          child.position.set(
            Math.sin(a) * (0.15 + progress * 1.4),
            Math.cos(a) * (0.15 + progress * 1.4),
            0,
          )
          child.scale.set(1, Math.max(0.01, 1 - progress), 1)
          ;(child as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>).material.opacity =
            1 - progress
        })
      } else if (effect.kind === 'slash') {
        model.scale.setScalar((effect.power ?? 1) * (0.8 + progress * 1.3))
        model.position.y = 1.1 + progress * 0.5
        const arc = model.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
        arc.material.opacity = (1 - progress) * 0.85
      } else if (effect.kind === 'reward') {
        model.position.y = 0.1
        model.scale.setScalar(0.4 + progress * 2)
        const ring = model.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
        ring.material.opacity = 1 - progress
      } else if (effect.kind === 'special')
        model.scale.setScalar(1 + progress * (game.upgrades.includes('cable') ? 12 : 7))
      else if (effect.kind !== 'text')
        model.children.forEach((child) => {
          const angle = child.userData.angle,
            speed = child.userData.speed
          child.position.set(
            Math.cos(angle) * progress * speed,
            Math.sin(angle * 2) * progress * 1.7,
            Math.sin(angle) * progress * speed,
          )
          child.scale.setScalar(1 - progress)
          child.rotation.x = progress * 8
        })
    }
    for (const [id, model] of this.ephemeral)
      if (!active.has(id)) {
        this.dynamic.remove(model)
        this.disposeObject(model, false)
        this.ephemeral.delete(id)
        this.handledEffects.delete(id)
      }
    this.renderer.render(this.scene, this.camera)
  }
  private disposeObject(object: THREE.Object3D, includeAssets = true) {
    object.traverse((node) => {
      if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.Sprite)) return
      if (node instanceof THREE.Mesh && (includeAssets || !this.isAssetGeometry(node.geometry)))
        node.geometry.dispose()
      const mats = Array.isArray(node.material) ? node.material : [node.material]
      mats.forEach((material) => {
        if ([...this.materials.values()].includes(material as THREE.MeshStandardMaterial)) return
        if (!includeAssets && this.isAssetMaterial(material)) return
        if (
          !material.userData.actorOwned &&
          'map' in material &&
          material.map instanceof THREE.Texture
        )
          material.map.dispose()
        material.dispose()
      })
    })
  }
  private isAssetGeometry(geometry: THREE.BufferGeometry) {
    let shared = false
    this.models.forEach((model) =>
      model.scene.traverse((node) => {
        if (node instanceof THREE.Mesh && node.geometry === geometry) shared = true
      }),
    )
    return shared
  }
  private isAssetMaterial(material: THREE.Material) {
    let shared = false
    this.models.forEach((model) =>
      model.scene.traverse((node) => {
        if (
          node instanceof THREE.Mesh &&
          (node.material === material ||
            (Array.isArray(node.material) && node.material.includes(material)))
        )
          shared = true
      }),
    )
    return shared
  }
  private clearGroup(group: THREE.Group) {
    ;[...group.children].forEach((child) => {
      this.disposeObject(child, false)
      group.remove(child)
    })
  }
  private clearActors() {
    this.actors.forEach((visual) => {
      visual.mixer?.stopAllAction()
      this.dynamic.remove(visual.group)
      this.disposeObject(visual.group, false)
    })
    this.actors.clear()
  }
  dispose() {
    this.disposed = true
    this.size.disconnect()
    this.clearActors()
    this.clearGroup(this.room)
    this.clearGroup(this.landmarks)
    this.clearGroup(this.dynamic)
    this.clearGroup(this.route)
    this.models.forEach((model) => this.disposeObject(model.scene))
    this.materials.forEach((material) => material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
