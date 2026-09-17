<script setup lang="ts">
import { STAGES } from '../../game/content'
import GameIcon from './GameIcon.vue'
defineProps<{
  saved: boolean
  best: number
  ready: boolean
  progress: number
  previewStage: number
}>()
defineEmits<{ start: []; continue: []; help: []; preview: [stage: number] }>()
</script>
<template>
  <section class="menu-view" aria-labelledby="game-title">
    <div class="menu-copy">
      <div class="edition">
        <span class="live-dot" /> VAST ORIGINAL · 办公室生存实录
        <span class="edition-number">VOL. 002</span>
      </div>
      <h1 id="game-title">
        <span class="title-small">断网</span
        ><span class="title-large">大作战<span class="title-spark">✳</span></span>
      </h1>
      <div class="english-title">OFFLINE. <span>ON FIRE.</span></div>
      <p class="menu-tagline">网可以卡，<strong>拳不能停。</strong></p>
      <p class="menu-description">
        上传卡在 99%，耐心只剩 1%。<br />从北京到加州，打通五地办公室。<br />夺回带宽，也夺回你的下班时间。
      </p>
      <div class="menu-actions">
        <button
          class="button button-primary start-button"
          :disabled="!ready"
          @click="saved ? $emit('continue') : $emit('start')"
        >
          <span>{{ ready ? (saved ? '继续战斗' : '开始揍它') : `整装待发 ${progress}%` }}</span
          ><GameIcon name="arrow" :size="25" />
        </button>
        <button v-if="saved" class="button button-ghost new-game" @click="$emit('start')">
          重新开始
        </button>
        <button v-else class="controls-link" @click="$emit('help')">
          <GameIcon name="keyboard" /> 操作指南 <span>↗</span>
        </button>
      </div>
      <div class="menu-facts">
        <span><i /> 单人闯关</span><span><i /> 五地办公室</span><span><i /> 无需联网对战</span>
      </div>
      <nav class="city-route" aria-label="预览五地办公室">
        <button
          v-for="(stage, i) in STAGES"
          :key="stage.city"
          class="city-stop"
          :class="{ active: previewStage === i }"
          :aria-pressed="previewStage === i"
          @click="$emit('preview', i)"
        >
          <b>0{{ i + 1 }}</b
          >{{ stage.cityName }}
        </button>
      </nav>
      <div class="city-preview-label">FIVE OFFICES. ONE LAST FIGHT.</div>
      <div v-if="best" class="best-score">
        PERSONAL BEST <strong>{{ best.toLocaleString() }}</strong> PTS
      </div>
    </div>
    <div class="scene-caption">
      <span class="caption-dot" />
      <div>
        <b>{{ STAGES[previewStage]!.cityName }}办公室 · {{ STAGES[previewStage]!.time }}</b
        ><span>{{ STAGES[previewStage]!.landmark }}</span>
      </div>
      <span class="coordinate">WORLD TOUR<br />LOCAL MODE</span>
    </div>
    <div class="upload-sticker">
      <div><GameIcon name="wifi" :size="18" /><span>FINAL_FINAL_v8.glb</span><b>99%</b></div>
      <div class="fake-progress"><i /></div>
      <p>正在上传… <span>预计剩余：永远</span></p>
    </div>
  </section>
</template>
