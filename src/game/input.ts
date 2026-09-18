import type { Action, Controls } from './types'
const ACTIONS: Record<string, Action> = {
  KeyJ: 'attack',
  KeyK: 'jump',
  Space: 'dash',
  KeyE: 'pickup',
  KeyQ: 'special',
}
const GAME_KEYS = new Set([
  ...Object.keys(ACTIONS),
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

export class Input {
  private held = new Set<string>()
  private touches = new Set<string>()
  private pressed = new Set<Action>()
  enabled = false
  draftEnabled = false
  onChoose?: (index: number) => void
  onPause?: () => void
  onConfirm?: () => void
  onBlur?: () => void
  private keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement)?.closest('input, textarea, select, [contenteditable="true"]'))
      return
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return
    const choice = /^(?:Digit|Numpad)([123])$/.exec(event.code)
    if (this.draftEnabled && choice) {
      event.preventDefault()
      if (!event.repeat) this.onChoose?.(Number(choice[1]) - 1)
      return
    }
    if (event.code === 'Escape' && !event.repeat) {
      this.onPause?.()
      return
    }
    if (event.code === 'Enter' && !event.repeat) {
      if ((event.target as HTMLElement)?.closest('button, summary, a')) return
      this.onConfirm?.()
      return
    }
    if (!this.enabled || !GAME_KEYS.has(event.code)) return
    event.preventDefault()
    this.held.add(event.code)
    if (!event.repeat && ACTIONS[event.code]) this.pressed.add(ACTIONS[event.code]!)
  }
  private keyup = (event: KeyboardEvent) => this.held.delete(event.code)
  private blur = () => {
    this.clear()
    this.onBlur?.()
  }
  private visibility = () => {
    if (document.hidden) this.blur()
  }
  constructor() {
    window.addEventListener('keydown', this.keydown)
    window.addEventListener('keyup', this.keyup)
    window.addEventListener('blur', this.blur)
    document.addEventListener('visibilitychange', this.visibility)
  }
  touch(key: string, down: boolean) {
    if (down) {
      this.touches.add(key)
      if (ACTIONS[key]) this.pressed.add(ACTIONS[key]!)
    } else this.touches.delete(key)
  }
  clear() {
    this.held.clear()
    this.touches.clear()
    this.pressed.clear()
  }
  sample(): Controls {
    const has = (key: string) => this.held.has(key) || this.touches.has(key)
    const result = {
      x: Number(has('KeyD') || has('ArrowRight')) - Number(has('KeyA') || has('ArrowLeft')),
      z: Number(has('KeyS') || has('ArrowDown')) - Number(has('KeyW') || has('ArrowUp')),
      attack: has('KeyJ'),
      pressed: new Set(this.pressed),
    }
    this.pressed.clear()
    return result
  }
  dispose() {
    window.removeEventListener('keydown', this.keydown)
    window.removeEventListener('keyup', this.keyup)
    window.removeEventListener('blur', this.blur)
    document.removeEventListener('visibilitychange', this.visibility)
  }
}
