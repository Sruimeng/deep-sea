import { EN } from './en'

export type Locale = 'zh-CN' | 'en'
export type MessageParams = Record<string, string | number>
export const isLocale = (value: unknown): value is Locale => value === 'zh-CN' || value === 'en'
export const detectLocale = (languages: readonly string[]): Locale =>
  languages[0]?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const patterns = Object.entries(EN)
  .filter(([key]) => key.includes('{'))
  .sort(([a], [b]) => b.replace(/\{\w+\}/g, '').length - a.replace(/\{\w+\}/g, '').length)
  .map(([key, value]) => {
    const names = [...key.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!)
    const parts = key.split(/\{\w+\}/g).map(escapeRegex)
    return { regex: new RegExp(`^${parts.join('(.+?)')}$`), names, value }
  })

export function translate(message: string, locale: Locale, params: MessageParams = {}): string {
  if (locale === 'zh-CN') return format(message, params, locale)
  const translated = Object.hasOwn(EN, message) ? EN[message] : undefined
  if (translated !== undefined) return format(translated, params, locale)
  // Simulation snapshots keep source text, so saved runs do not depend on a language.
  if (!/[\u4e00-\u9fff]/.test(message)) return message
  for (const pattern of patterns) {
    const match = message.match(pattern.regex)
    if (match)
      return format(
        pattern.value,
        Object.fromEntries(pattern.names.map((name, i) => [name, match[i + 1]!])),
        locale,
      )
  }
  return message
}
function format(message: string, params: MessageParams, locale: Locale) {
  return message.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = params[key]
    return value === undefined
      ? token
      : typeof value === 'string'
        ? translate(value, locale)
        : String(value)
  })
}
