import { readonly, ref } from 'vue'
import { detectLocale, isLocale, translate, type Locale, type MessageParams } from './index'
const KEY = 'vast-locale'
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* Language selection also works without storage. */
  }
  return detectLocale(typeof navigator === 'undefined' ? ['en'] : navigator.languages)
}
const locale = ref<Locale>(initialLocale())
function updateDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale.value
  document.title = translate('VAST 断网大作战', locale.value)
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      'content',
      translate('VAST 断网大作战：网可以卡，拳不能停。办公室横版闯关游戏。', locale.value),
    )
}
updateDocument()
export function useLocale() {
  function setLocale(value: Locale) {
    locale.value = value
    updateDocument()
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* Storage is optional. */
    }
  }
  return {
    locale: readonly(locale),
    setLocale,
    t: (message: string, params?: MessageParams) => translate(message, locale.value, params),
  }
}
