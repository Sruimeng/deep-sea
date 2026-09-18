<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import { computed, onMounted, useTemplateRef } from 'vue'
import { DIFFICULTIES } from '../../game/difficulty'
import { STAGES } from '../../game/content'
import { blockAt } from '../../game/blocks'
import { upgradeBenefit } from '../../game/roguelike'
import type { Snapshot, UpgradeId } from '../../game/types'
import RunBuild from './RunBuild.vue'
import GameIcon from './GameIcon.vue'

const { t } = useLocale()
const props = defineProps<{ state: Snapshot }>()
defineEmits<{ choose: [id: UpgradeId] }>()
const title = useTemplateRef('title')
onMounted(() => title.value?.focus({ preventScroll: true }))
const level = (id: UpgradeId) => props.state.build.find((item) => item.id === id)?.level ?? 0
const final = computed(() => props.state.completed === props.state.total)
const next = computed(() =>
  final.value
    ? '领取并结算'
    : props.state.wave === props.state.waveCount - 1
      ? '满血进入下一城'
      : t('回复 {0}% 生命，向右前进', { '0': Math.round(props.state.clearHeal * 100) }),
)
</script>
<template>
  <div class="modal-layer upgrade-layer">
    <section
      class="upgrade-dialog buff-draft"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <span class="eyebrow">{{
        t('街段 {0} / {1} CLEARED · {2}', {
          '0': state.completed,
          '1': state.total,
          '2': blockAt(STAGES[state.stage]!.city, state.wave).name,
        })
      }}</span>
      <h2 id="upgrade-title" ref="title" tabindex="-1">
        {{ t('再强一点。') }}<span>{{ t('选你的下一招。') }}</span>
      </h2>
      <p>{{ t('三选一 · Buff 持续整局，可叠至 5 级 · {0}', { '0': next }) }}</p>
      <div
        class="draft-progress"
        :aria-label="t('街段 {0} / {1}', { '0': state.completed, '1': state.total })"
      >
        <i :style="{ width: `${(state.completed / state.total) * 100}%` }" />
      </div>
      <p class="draft-shortcuts">{{ t('按 1 / 2 / 3 直接选卡，也可 Tab + Enter') }}</p>
      <div class="upgrade-cards">
        <button
          v-for="(choice, index) in state.choices"
          :key="choice.id"
          class="upgrade-card"
          :aria-keyshortcuts="String(index + 1)"
          :class="{ stacking: level(choice.id) > 0 }"
          @click="$emit('choose', choice.id)"
        >
          <div class="upgrade-card-top">
            <kbd class="buff-key">{{ index + 1 }}</kbd>
            <span>{{ t('{0}流', { '0': choice.label }) }}</span
            ><span>{{ t(level(choice.id) ? '叠加升级' : '新能力') }}</span>
          </div>
          <span class="upgrade-icon">{{ choice.icon }}</span>
          <h3>{{ t(choice.name) }}</h3>
          <b class="buff-level"
            >{{ level(choice.id) ? `Lv.${level(choice.id)} → ` : '' }}Lv.{{ level(choice.id) + 1 }}
            <small>/ {{ choice.maxLevel }}</small></b
          >
          <p>{{ t(choice.description) }}</p>
          <div class="buff-benefit">
            {{
              t(
                upgradeBenefit(
                  choice.id,
                  level(choice.id) + 1,
                  DIFFICULTIES[state.difficulty].healing,
                ),
              )
            }}
          </div>
          <div class="upgrade-select">
            {{ t(final ? '领取并结算' : '就选这个') }} <GameIcon name="arrow" />
          </div>
        </button>
      </div>
      <RunBuild :build="state.build" :difficulty="state.difficulty" />
      <p class="draft-save">{{ t('已保存选卡进度 · 刷新保留当前候选 · 失败从本小关起点重试') }}</p>
    </section>
  </div>
</template>
<style scoped>
.buff-key {
  padding: 2px 7px;
  font: 700 14px monospace;
  border: 1px solid #f9cf0070;
  color: #f9cf00;
}
.draft-shortcuts {
  margin-top: 14px;
  color: #f9cf00 !important;
}
.upgrade-layer {
  align-items: flex-start;
}
.buff-draft {
  padding-block: 24px;
  margin-block: auto;
  flex-shrink: 0;
  max-width: 100%;
}
.buff-draft > h2:focus {
  outline: none;
}
.buff-draft > h2 {
  font-size: clamp(28px, 4vw, 48px);
}
.buff-draft > h2 span {
  display: block;
}
.buff-draft .upgrade-card {
  min-height: 310px;
}
.buff-level {
  display: block;
  color: #f9cf00;
  font-size: 19px;
  margin: 10px 0;
}
.buff-level small {
  font-size: 11px;
  color: #8e8e98;
}
.buff-benefit {
  font-size: 12px;
  color: #e8dba0;
  line-height: 1.6;
  margin-bottom: 18px;
}
.stacking {
  border-color: #f9cf0080;
}
.draft-progress {
  height: 3px;
  margin-top: 20px;
  background: #ffffff15;
}
.draft-progress i {
  display: block;
  height: 100%;
  background: #f9cf00;
}
.buff-draft .draft-save {
  font-size: 11px;
  margin-top: 18px;
  color: #888891;
}
@media (max-width: 600px) {
  .buff-draft .upgrade-cards {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 16px;
  }
  .buff-draft .upgrade-card {
    min-height: 0;
    padding: 16px;
    text-align: left;
  }
  .buff-draft .upgrade-icon {
    float: right;
    font-size: 30px;
    height: auto;
    margin: 4px 0 0 12px;
  }
  .buff-draft .upgrade-card h3 {
    font-size: 18px;
    margin: 8px 0;
  }
  .buff-draft .upgrade-card-top {
    font-size: 10px;
  }
  .buff-draft .upgrade-card > p {
    font-size: 12px;
    margin: 8px 0;
  }
  .buff-draft .upgrade-select {
    font-size: 12px;
    padding-top: 8px;
  }
  .buff-benefit {
    margin-bottom: 10px;
  }
  .buff-level {
    font-size: 15px;
    margin: 4px 0;
  }
}
</style>
