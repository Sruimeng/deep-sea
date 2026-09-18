import { afterEach, expect, it, vi } from 'vitest'
import 'vue'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})
function environment(saved: string | null, languages: string[]) {
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() }
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('navigator', { languages })
  vi.stubGlobal('document', { documentElement: { lang: '' }, title: '', querySelector: () => null })
  return storage
}
it('loads the saved language before browser preferences and updates document language', async () => {
  const storage = environment('en', ['zh-CN'])
  const { useLocale } = await import('./useLocale')
  const ui = useLocale()
  expect(ui.locale.value).toBe('en')
  expect(document.documentElement.lang).toBe('en')
  ui.setLocale('zh-CN')
  expect(document.documentElement.lang).toBe('zh-CN')
  expect(storage.setItem).toHaveBeenCalledWith('vast-locale', 'zh-CN')
  expect(ui.t('继续战斗')).toBe('继续战斗')
})
it('ignores invalid stored preferences and falls back to English', async () => {
  environment('invalid', ['de-DE'])
  const { useLocale } = await import('./useLocale')
  expect(useLocale().locale.value).toBe('en')
})
it('can change language when localStorage is blocked', async () => {
  environment(null, ['en'])
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw Error('blocked')
    },
    setItem: () => {
      throw Error('blocked')
    },
  })
  const { useLocale } = await import('./useLocale')
  expect(() => useLocale().setLocale('zh-CN')).not.toThrow()
  expect(useLocale().locale.value).toBe('zh-CN')
})
