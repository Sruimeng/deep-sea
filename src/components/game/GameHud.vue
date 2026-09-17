<script setup lang="ts">
import { blockAt } from '../../game/blocks'
import { STAGES } from '../../game/content'
import type { Snapshot } from '../../game/types'
import GameIcon from './GameIcon.vue'
import CombatRewards from './CombatRewards.vue'
import BattleMilestone from './BattleMilestone.vue'
import StreetPrompt from './StreetPrompt.vue'
defineProps<{ state: Snapshot }>()
defineEmits<{ pause: [] }>()
</script>
<template>
  <div class="hud">
    <div class="player-hud">
      <div class="player-avatar"><img src="/brand/tripo-mark.svg" alt="Tripo" /></div>
      <div class="player-bars">
        <div class="bar-label">
          <b>最后一位打工人</b><span>{{ Math.ceil(state.hp) }} / {{ state.maxHp }}</span>
        </div>
        <div
          class="health-track"
          role="progressbar"
          aria-label="生命值"
          :aria-valuenow="Math.ceil(state.hp)"
          :aria-valuemax="state.maxHp"
          aria-valuemin="0"
        >
          <i :style="{ width: `${(state.hp / state.maxHp) * 100}%` }" />
        </div>
        <div class="rage-track" :class="{ charged: state.rage >= 100 }">
          <i :style="{ width: `${state.rage}%` }" />
        </div>
        <div class="rage-label">
          <span>怒气 {{ Math.floor(state.rage) }}%</span
          ><b>{{ state.rage >= 100 ? 'Q 强制重连！' : '命中充能' }}</b>
        </div>
      </div>
    </div>
    <div class="stage-hud">
      <span>{{ STAGES[state.stage]!.location }}</span
      ><b>{{ blockAt(STAGES[state.stage]!.city, state.wave).name }}</b>
      <div class="wave-pips">
        <i v-for="n in state.waveCount" :key="n" :class="{ done: n <= state.wave + 1 }" />
        <span>街段 {{ state.wave + 1 }} / {{ state.waveCount }}</span>
      </div>
      <div class="wave-progress" :aria-label="`本波击破 ${state.waveKills} / ${state.waveTotal}`">
        <i :style="{ width: `${(state.waveKills / Math.max(1, state.waveTotal)) * 100}%` }" />
      </div>
      <small class="wave-count">{{
        state.advancing ? '已打通 · 向右前进 →' : `击破 ${state.waveKills} / ${state.waveTotal}`
      }}</small>
    </div>
    <div class="score-hud">
      <span>RECOVERED DATA</span><strong>{{ state.score.toString().padStart(6, '0') }}</strong
      ><span>场上 {{ state.enemies }} · 增援 {{ state.reserves }}</span>
      <span
        >旅程 {{ state.completed }}/{{ state.total }} · Buff
        {{ state.build.reduce((sum, item) => sum + item.level, 0) }} 级</span
      >
    </div>
    <button class="icon-button pause-button" aria-label="暂停游戏" @click="$emit('pause')">
      <GameIcon name="pause" />
    </button>
  </div>
  <div v-if="state.bossMaxHp" class="boss-hud">
    <div>
      <b>路由猩猩 · 延迟之王</b
      ><span>{{ state.shield ? '护盾在线 · 摧毁两侧中继器' : 'THE KING OF LAG' }}</span>
    </div>
    <div class="boss-track">
      <i :style="{ width: `${(state.bossHp / state.bossMaxHp) * 100}%` }" />
    </div>
  </div>
  <div v-if="state.combo > 1" class="combo" :key="state.combo">
    <strong>{{ state.combo }}<span>HITS</span></strong
    ><span>{{
      state.combo > 20 ? '带宽打满！' : state.combo > 10 ? '批量清理！' : '保持连接'
    }}</span>
    <span class="combo-damage">{{ state.comboDamage }} DAMAGE</span>
  </div>
  <BattleMilestone
    v-if="state.milestone && state.mode === 'playing'"
    :milestone="state.milestone"
    :class="{ 'with-boss': state.bossMaxHp > 0 }"
  />
  <CombatRewards v-if="state.mode === 'playing'" :rewards="state.rewards" />
  <StreetPrompt
    v-if="state.mode === 'playing'"
    :advancing="state.advancing"
    :pursuit-ready="state.pursuitReady"
  />
  <div class="weapon-hud">
    <GameIcon name="keyboard" :size="22" />
    <div>
      <b>{{ state.weapon }}</b
      ><span>{{
        state.weaponUses ? `耐久 ${state.weaponUses} · E 投掷` : '靠近道具 · E 拾取'
      }}</span>
    </div>
  </div>
  <div v-if="state.toastTime > 0" class="game-toast" role="status">
    <GameIcon name="bolt" :size="16" />{{ state.toast }}
  </div>
  <div class="dash-indicator" :class="{ ready: state.dashReady }">
    <span>SPACE</span
    >{{ state.pursuitReady ? '追击！' : state.dashReady ? '冲刺就绪' : '冲刺冷却' }}
  </div>
</template>

<style scoped>
.wave-progress {
  height: 3px;
  width: 100%;
  background: #ffffff20;
  margin-top: 8px;
}
.wave-progress i {
  display: block;
  height: 100%;
  background: #f9cf00;
  transition: width 150ms;
}
.wave-count {
  display: block;
  margin-top: 4px;
  color: #ddd;
  font-size: 10px;
}
:global(.reduced-motion) .wave-progress i {
  transition: none;
}
.combo .combo-damage {
  color: #fff4cf;
  font:
    italic 900 19px/1.2 'Arial Black',
    sans-serif;
  letter-spacing: 0;
  text-shadow: 2px 2px #15131a;
}
@media (max-width: 700px) {
  .combo .combo-damage {
    font-size: 14px;
  }
}
</style>
