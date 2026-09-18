import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { parse } from '@vue/compiler-dom'
import { STAGES, UPGRADES, ENEMY_NAMES, ENEMY_HINTS, WEAPON_NAMES } from '../game/content'
import { CITY_BLOCKS } from '../game/blocks'
import { DIFFICULTIES } from '../game/difficulty'
import { upgradeBenefit } from '../game/roguelike'
import { EN } from './en'
import { detectLocale, translate } from './index'

const han = /[\u4e00-\u9fff]/
const check = (text: string) => expect(translate(text, 'en'), text).not.toMatch(han)

describe('localization coverage', () => {
  it('selects Chinese for Chinese preferences and English for other languages', () => {
    expect(detectLocale(['zh-TW', 'en'])).toBe('zh-CN')
    expect(detectLocale(['en-US', 'zh'])).toBe('en')
    expect(detectLocale(['fr-FR'])).toBe('en')
    expect(detectLocale([])).toBe('en')
  })
  it('translates every city, location, upgrade, difficulty and enemy description', () => {
    const texts = [
      ...STAGES.flatMap((stage) => [
        stage.cityName,
        stage.landmark,
        stage.name,
        stage.subtitle,
        stage.story,
      ]),
      ...Object.values(CITY_BLOCKS).flatMap((blocks) => blocks.map((block) => block.name)),
      ...UPGRADES.flatMap((item) => [
        item.name,
        item.description,
        item.label,
        ...Array.from({ length: 5 }, (_, i) => upgradeBenefit(item.id, i + 1, 0.4)),
      ]),
      ...Object.values(DIFFICULTIES).flatMap((item) => [item.name, item.description]),
      ...Object.values(ENEMY_NAMES),
      ...Object.values(ENEMY_HINTS),
      ...Object.values(WEAPON_NAMES),
    ]
    texts.forEach(check)
  })
  it('preserves named parameters and fills every catalog message in both languages', () => {
    for (const [source, english] of Object.entries(EN)) {
      expect(english).not.toMatch(han)
      const params = [...source.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort()
      expect([...english.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort(), source).toEqual(
        params,
      )
      const values = Object.fromEntries(params.map((key) => [key, 5]))
      expect(translate(source, 'en', values)).not.toMatch(/\{\w+\}/)
      expect(translate(source, 'zh-CN', values)).not.toMatch(/\{\w+\}/)
    }
  })
  it('translates composed combat messages and gives specific templates priority', () => {
    expect(translate('街段 3 / 6 · 弹窗跳蚤 · 离开紫圈，出拳可打断跳砸', 'en')).toBe(
      'Street 3 / 6 · Pop-up Leaper · Leave purple circles; punches interrupt the leap',
    )
    expect(translate('大招 140 伤害 / 12 米 · 命中怒气 +14', 'en')).toBe(
      'Special 140 damage / 12 m · Rage per hit +14',
    )
    expect(translate('机械键盘已装备 · J 挥打 / E 投掷', 'en')).toContain(
      'Mechanical Keyboard equipped',
    )
    expect(translate('街段 {0} / {1}', 'zh-CN', { '0': 3, '1': 6 })).toBe('街段 3 / 6')
    expect(translate('unknown label', 'en')).toBe('unknown label')
  })
  it('covers Chinese literals used in views, simulation, scenery and loading states', () => {
    function scan(source: string, file: string) {
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
      function visit(node: ts.Node) {
        if (ts.isStringLiteralLike(node) && han.test(node.text)) check(node.text)
        if (ts.isTemplateExpression(node)) {
          const sample =
            node.head.text + node.templateSpans.map((span) => '5' + span.literal.text).join('')
          if (han.test(sample)) check(sample)
        }
        ts.forEachChild(node, visit)
      }
      visit(ast)
    }
    for (const file of [
      'simulation.ts',
      'cities.ts',
      'renderer.ts',
      'offline.ts',
      'combat-feedback.ts',
    ])
      scan(readFileSync(new URL(`../game/${file}`, import.meta.url), 'utf8'), file)
    const components = new URL('../components/game/', import.meta.url)
    for (const file of readdirSync(components).filter((file) => file.endsWith('.vue'))) {
      const source = readFileSync(new URL(file, components), 'utf8')
      scan(source.split('<script setup lang="ts">')[1]?.split('</script>')[0] ?? '', file)
      const template = source.split('<template>')[1]?.split('</template>')[0]
      if (!template) continue
      function visit(
        node:
          | ReturnType<typeof parse>
          | { type: number; content?: unknown; props?: unknown[]; children?: unknown[] },
      ) {
        if (node.type === 2 && typeof node.content === 'string')
          expect(node.content, file).not.toMatch(han)
        if (node.type === 5) scan((node.content as { content: string }).content, file)
        if ('props' in node && node.props)
          for (const prop of node.props as {
            type: number
            name: string
            value?: { content: string }
            exp?: { content: string }
          }[]) {
            if (
              prop.type === 6 &&
              prop.name !== 'lang' &&
              file !== 'LanguageSelect.vue' &&
              prop.value
            )
              expect(prop.value.content, file).not.toMatch(han)
            if (prop.exp) scan(prop.exp.content, file)
          }
        if (node.children)
          for (const child of node.children)
            if (file !== 'LanguageSelect.vue') visit(child as Parameters<typeof visit>[0])
      }
      visit(parse(template))
    }
  })
})
