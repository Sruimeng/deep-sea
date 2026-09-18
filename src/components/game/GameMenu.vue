<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import { STAGES } from '../../game/content'
import DifficultyPicker from './DifficultyPicker.vue'
import { DIFFICULTIES, type Difficulty } from '../../game/difficulty'
import GameIcon from './GameIcon.vue'

const { t } = useLocale()
defineProps<{
  difficulty: Difficulty
  savedDifficulty?: Difficulty
  saved: boolean
  best: number
  ready: boolean
  progress: number
  previewStage: number
}>()
defineEmits<{
  difficulty: [value: Difficulty]
  start: []
  continue: []
  help: []
  preview: [stage: number]
}>()
</script>
<template>
  <section class="menu-view" aria-labelledby="game-title">
    <div class="menu-copy">
      <div class="edition">
        <span class="live-dot" />{{ t('VAST ORIGINAL · 办公室生存实录')
        }}<span class="edition-number">VOL. 002</span>
      </div>
      <h1 id="game-title">
        <span class="title-small">{{ t('断网') }}</span
        ><span class="title-large">{{ t('大作战') }}<span class="title-spark">✳</span></span>
      </h1>
      <div class="english-title">OFFLINE. <span>ON FIRE.</span></div>
      <p class="menu-tagline">
        {{ t('网可以卡，') }}<strong>{{ t('拳不能停。') }}</strong>
      </p>
      <p class="menu-description">
        {{ t('上传卡在 99%，耐心只剩 1%。') }}<br />{{ t('从北京到加州，打通五地办公室。')
        }}<br />{{ t('夺回带宽，也夺回你的下班时间。') }}
      </p>
      <DifficultyPicker
        :model-value="difficulty"
        :saved-difficulty="savedDifficulty"
        @update:model-value="$emit('difficulty', $event)"
      />
      <div class="menu-actions">
        <button
          class="button button-primary start-button"
          :disabled="!ready"
          @click="saved ? $emit('continue') : $emit('start')"
        >
          <span>{{ t(ready ? (saved ? '继续战斗' : '开始揍它') : `整装待发 ${progress}%`) }}</span
          ><GameIcon name="arrow" :size="25" />
        </button>
        <button v-if="saved" class="button button-ghost new-game" @click="$emit('start')">
          {{ t('重新开始') }}
        </button>
        <button v-else class="controls-link" @click="$emit('help')">
          <GameIcon name="keyboard" />{{ t('操作指南') }}<span>↗</span>
        </button>
      </div>
      <div class="menu-facts">
        <span><i />{{ t('单人闯关') }}</span
        ><span><i />{{ t('五地办公室') }}</span
        ><span><i />{{ t('无需联网对战') }}</span>
      </div>
      <nav class="city-route" :aria-label="t('预览五地办公室')">
        <button
          v-for="(stage, i) in STAGES"
          :key="stage.city"
          class="city-stop"
          :class="{ active: previewStage === i }"
          :aria-pressed="previewStage === i"
          @click="$emit('preview', i)"
        >
          <b>0{{ i + 1 }}</b
          >{{ t(stage.cityName) }}
        </button>
      </nav>
      <div class="city-preview-label">FIVE OFFICES. ONE LAST FIGHT.</div>
      <div v-if="best" class="best-score">
        {{
          t('{0} · 最高分 {1}', { '0': DIFFICULTIES[difficulty].name, '1': best.toLocaleString() })
        }}
      </div>
    </div>
    <div class="scene-caption">
      <span class="caption-dot" />
      <div>
        <b>{{
          t('{0}办公室 · {1}', {
            '0': STAGES[previewStage]!.cityName,
            '1': STAGES[previewStage]!.time,
          })
        }}</b
        ><span>{{ t(STAGES[previewStage]!.landmark) }}</span>
      </div>
      <span class="coordinate">WORLD TOUR<br />LOCAL MODE</span>
    </div>
    <div class="upload-sticker">
      <div><GameIcon name="wifi" :size="18" /><span>FINAL_FINAL_v8.glb</span><b>99%</b></div>
      <div class="fake-progress"><i /></div>
      <p>
        {{ t('正在上传…') }}<span>{{ t('预计剩余：永远') }}</span>
      </p>
    </div>
  </section>
</template>
