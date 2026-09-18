import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Input } from './input'

let events: Map<string, (event: KeyboardEvent) => void>
let input: Input
function key(code: string, extras: Partial<KeyboardEvent> = {}) {
  const event = {
    code,
    repeat: false,
    target: { closest: () => null },
    preventDefault: vi.fn(),
    ...extras,
  } as unknown as KeyboardEvent
  events.get('keydown')!(event)
  return event
}
beforeEach(() => {
  events = new Map()
  vi.stubGlobal('window', {
    addEventListener: (key: string, fn: (event: KeyboardEvent) => void) => events.set(key, fn),
    removeEventListener: (key: string) => events.delete(key),
  })
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
  input = new Input()
})
afterEach(() => {
  input.dispose()
  vi.unstubAllGlobals()
})
describe('buff keyboard input', () => {
  it.each(['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'])(
    'selects exactly one card with %s',
    (code) => {
      input.draftEnabled = true
      input.onChoose = vi.fn()
      expect(key(code).preventDefault).toHaveBeenCalledOnce()
      expect(input.onChoose).toHaveBeenCalledExactlyOnceWith(Number(code.at(-1)) - 1)
      key(code, { repeat: true })
      expect(input.onChoose).toHaveBeenCalledOnce()
    },
  )
  it('ignores card keys while fighting, paused, or viewing help', () => {
    input.onChoose = vi.fn()
    input.enabled = true
    key('Digit1')
    input.enabled = false
    key('Digit2')
    expect(input.onChoose).not.toHaveBeenCalled()
  })
  it('does not intercept modified shortcuts or editable fields', () => {
    input.draftEnabled = true
    input.onChoose = vi.fn()
    key('Digit1', { ctrlKey: true })
    key('Digit1', { metaKey: true })
    key('Digit1', { altKey: true })
    key('Digit1', { isComposing: true })
    key('Digit1', { target: { closest: () => ({}) } as unknown as HTMLElement })
    expect(input.onChoose).not.toHaveBeenCalled()
  })
  it('lets Enter activate the focused button without a second global action', () => {
    input.onConfirm = vi.fn()
    key('Enter', {
      target: {
        closest: (selector: string) => (selector.includes('button') ? {} : null),
      } as unknown as HTMLElement,
    })
    expect(input.onConfirm).not.toHaveBeenCalled()
    key('Enter')
    expect(input.onConfirm).toHaveBeenCalledOnce()
  })
  it('keeps combat inputs out of a draft and removes listeners on disposal', () => {
    input.draftEnabled = true
    key('KeyJ')
    expect(input.sample().pressed.size).toBe(0)
    input.dispose()
    expect(events.has('keydown')).toBe(false)
  })
})
