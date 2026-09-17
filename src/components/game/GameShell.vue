<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue'
import { STAGES } from '../../game/content'
import { Game } from '../../game/simulation'
import { GameRenderer } from '../../game/renderer'
import { Input } from '../../game/input'
import { Audio } from '../../game/audio'
import { prepareOfflineCache } from '../../game/offline'
import { clearSave, readBest, readSave, writeBest, writeSave } from '../../game/storage'
import type { UpgradeId } from '../../game/types'
import GameIcon from './GameIcon.vue'
import GameMenu from './GameMenu.vue'
import GameHud from './GameHud.vue'
import GameOverlays from './GameOverlays.vue'
import TouchControls from './TouchControls.vue'

const game = new Game()
game.hero.x = 4
game.hero.z = 1
const state = shallowRef(game.snapshot())
const saved = shallowRef(readSave())
const best = shallowRef(readBest())
const previewStage = shallowRef(0)
const ready = shallowRef(false)
const progress = shallowRef(0)
const assetMessage = shallowRef('正在准备办公室…')
const offlineMessage = shallowRef('离线缓存准备中')
const help = shallowRef(false)
const muted = shallowRef(false)
const lowMotion = shallowRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
const error = shallowRef('')
const fullscreen = shallowRef(false)
const scene = useTemplateRef<HTMLElement>('scene')
let renderer: GameRenderer | undefined
let input: Input | undefined
let frame = 0
let previousTime = 0
let publishTime = 0
let disposed = false
let modeBeforeHelp = game.mode
let restoreFocus: HTMLElement | null = null
const audio = new Audio()

function sync() {
  state.value = game.snapshot()
  if (input) input.enabled = game.mode === 'playing' && !help.value
}
function start(continuing = false) {
  if (!ready.value) return
  void audio.unlock()
  input?.clear()
  game.start(continuing && saved.value ? saved.value : undefined)
  sync()
}
function previewCity(stage: number) {
  if (game.mode !== 'menu') return
  previewStage.value = stage
  game.stage = stage
  sync()
}
function begin() {
  void audio.unlock()
  input?.clear()
  game.begin()
  sync()
}
function pause() {
  if (game.mode === 'playing') {
    game.pause()
    input?.clear()
    sync()
  }
}
function resume() {
  void audio.unlock()
  input?.clear()
  game.resume()
  sync()
}
function retry() {
  input?.clear()
  game.start(saved.value ?? undefined)
  sync()
}
function menu() {
  help.value = false
  game.menu()
  game.stage = previewStage.value
  game.hero.x = 4
  game.hero.z = 1
  game.hero.y = 0
  game.hero.hp = game.hero.maxHp
  saved.value = readSave()
  best.value = readBest()
  input?.clear()
  sync()
}
function choose(id: UpgradeId) {
  input?.clear()
  game.choose(id)
  sync()
}
function toggleSound() {
  muted.value = !muted.value
  void audio.unlock()
  audio.setMuted(muted.value)
  try {
    localStorage.setItem('vast-muted', String(muted.value))
  } catch {
    /* Storage is optional. */
  }
}
function toggleMotion() {
  lowMotion.value = !lowMotion.value
  if (renderer) renderer.lowMotion = lowMotion.value
}
function openHelp() {
  restoreFocus = document.activeElement as HTMLElement
  modeBeforeHelp = game.mode
  game.pause()
  help.value = true
  input?.clear()
  sync()
  void nextTick(() => document.querySelector<HTMLElement>('.dialog-close')?.focus())
}
function closeHelp() {
  help.value = false
  if (modeBeforeHelp === 'playing') game.resume()
  input?.clear()
  sync()
  restoreFocus?.focus()
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* Some embedded browsers do not allow fullscreen. */
  }
}
function reload() {
  window.location.reload()
}
function updateFullscreen() {
  fullscreen.value = !!document.fullscreenElement
}
function focusTrap(event: KeyboardEvent) {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')
  if (!dialog || event.key !== 'Tab') return
  const focusable = [
    ...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]'),
  ]
  const first = focusable[0],
    last = focusable.at(-1)
  if (
    event.shiftKey &&
    (!dialog.contains(document.activeElement) || document.activeElement === first)
  ) {
    event.preventDefault()
    last?.focus()
  } else if (
    !event.shiftKey &&
    (!dialog.contains(document.activeElement) || document.activeElement === last)
  ) {
    event.preventDefault()
    first?.focus()
  }
}
function loop(time: number) {
  if (disposed) return
  const dt = Math.min((time - (previousTime || time)) / 1000, 0.04)
  previousTime = time
  if (input) game.tick(dt, input.sample())
  const animate = game.mode === 'playing' || game.mode === 'menu'
  renderer?.render(game, animate ? dt : 0)
  audio.playFrame(game.sounds.splice(0))
  audio.tick(game.mode === 'playing', game.stage)
  if (time - publishTime > 40 || state.value.mode !== game.mode) {
    sync()
    publishTime = time
  }
  frame = requestAnimationFrame(loop)
}
onMounted(async () => {
  game.onCheckpoint = (save) => {
    writeSave(save)
    saved.value = save
  }
  game.onFinish = (score) => {
    writeBest(score)
    clearSave()
    saved.value = null
    best.value = readBest()
  }
  try {
    muted.value = localStorage.getItem('vast-muted') === 'true'
  } catch {
    /* Storage is optional. */
  }
  audio.setMuted(muted.value)
  void prepareOfflineCache().then((message) => {
    if (!disposed) offlineMessage.value = message
  })
  input = new Input()
  input.onPause = () => {
    if (help.value) closeHelp()
    else if (game.mode === 'paused') {
      if (document.hasFocus()) resume()
    } else pause()
  }
  input.onBlur = pause
  input.onConfirm = () => {
    if (help.value) closeHelp()
    else if (game.mode === 'intro') begin()
    else if (game.mode === 'menu') start(!!saved.value)
    else if (game.mode === 'paused') resume()
  }
  document.addEventListener('fullscreenchange', updateFullscreen)
  document.addEventListener('keydown', focusTrap)
  try {
    renderer = new GameRenderer(scene.value!)
    renderer.lowMotion = lowMotion.value
    renderer.onProgress = (value, text) => {
      progress.value = value
      assetMessage.value = text
    }
    frame = requestAnimationFrame(loop)
    const loaded = await renderer.load()
    if (disposed) return
    progress.value = 100
    ready.value = true
    assetMessage.value = loaded ? '本地资源就绪 · READY TO RUMBLE' : '轻量模型模式 · 游戏可正常游玩'
  } catch {
    error.value = '3D 场景未能启动。请开启浏览器硬件加速，或使用最新版 Chrome / Safari 后重试。'
  }
})
onUnmounted(() => {
  disposed = true
  cancelAnimationFrame(frame)
  input?.dispose()
  renderer?.dispose()
  audio.dispose()
  document.removeEventListener('fullscreenchange', updateFullscreen)
  document.removeEventListener('keydown', focusTrap)
})
</script>
<template>
  <main
    class="game-shell"
    :class="{ 'in-game': state.mode !== 'menu', 'reduced-motion': lowMotion }"
  >
    <header class="site-header">
      <a
        class="brand"
        href="#"
        aria-label="VAST 游戏首页"
        @click.prevent="state.mode === 'menu' ? undefined : pause()"
        ><img class="brand-mark" src="/brand/tripo-mark.svg" alt="" /><img
          class="brand-wordmark"
          src="/brand/tripo-wordmark.png"
          alt="Tripo"
        /><span class="brand-divider" /><small>VAST ORIGINAL<br />AFTER HOURS CLUB</small></a
      >
      <div class="header-center">
        <span class="status-light" /> NETWORK UNSTABLE
        <span class="header-ping">999<span>ms</span></span>
      </div>
      <div class="header-tools">
        <button
          class="icon-button"
          :aria-label="muted ? '开启声音' : '关闭声音'"
          :aria-pressed="!muted"
          @click="toggleSound"
        >
          <GameIcon :name="muted ? 'muted' : 'sound'" /></button
        ><button class="icon-button" aria-label="操作指南" @click="openHelp">
          <GameIcon name="help" /></button
        ><button class="fullscreen-button" @click="toggleFullscreen">
          {{ fullscreen ? '退出全屏' : '全屏游玩' }} <span>↗</span>
        </button>
      </div>
    </header>
    <section class="game-stage" :class="{ 'menu-stage': state.mode === 'menu' }">
      <div ref="scene" class="scene" />
      <div class="scene-grain" />
      <GameMenu
        v-if="state.mode === 'menu'"
        :saved="!!saved"
        :best="best"
        :ready="ready"
        :progress="progress"
        :preview-stage="previewStage"
        @preview="previewCity"
        @start="start()"
        @continue="start(true)"
        @help="openHelp"
      />
      <GameHud v-else :state="state" @pause="pause" />
      <GameOverlays
        :state="state"
        :help="help"
        :muted="muted"
        :low-motion="lowMotion"
        @begin="begin"
        @resume="resume"
        @retry="retry"
        @menu="menu"
        @choose="choose"
        @close-help="closeHelp"
        @toggle-sound="toggleSound"
        @toggle-motion="toggleMotion"
      />
      <TouchControls
        v-if="state.mode === 'playing' && !help"
        @input="(key, down) => input?.touch(key, down)"
      />
      <div v-if="error" class="error-state" role="alert">
        <h2>连接 3D 世界失败</h2>
        <p>{{ error }}</p>
        <button class="button button-primary" @click="reload">重新加载</button>
      </div>
    </section>
    <footer class="site-footer">
      <span class="footer-title">{{
        state.mode === 'menu'
          ? 'BUILT FOR BAD WIFI. GOOD TIMES.'
          : `OFFICE 0${state.stage + 1} / 05`
      }}</span>
      <div v-if="state.mode === 'menu'" class="footer-stages">
        <span v-for="(stage, i) in STAGES" :key="stage.city"
          >0{{ i + 1 }} {{ stage.cityName }}</span
        >
      </div>
      <div v-else class="footer-controls">
        <span><kbd>WASD</kbd>移动</span><span><kbd>J</kbd>出拳</span><span><kbd>K</kbd>跳跃</span
        ><span><kbd>E</kbd>拾 / 扔</span><span><kbd>Q</kbd>重连</span>
      </div>
      <span class="footer-build">{{
        state.mode === 'menu'
          ? ready
            ? offlineMessage
            : assetMessage
          : 'ESC 暂停 / 自动存档已开启'
      }}</span>
    </footer>
  </main>
</template>
