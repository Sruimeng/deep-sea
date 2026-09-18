<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import { DIFFICULTIES } from '../../game/difficulty'
import { STAGES } from '../../game/content'
import type { Snapshot, UpgradeId } from '../../game/types'
import BuffDraft from './BuffDraft.vue'
import RunBuild from './RunBuild.vue'
import { blockAt } from '../../game/blocks'
import GameIcon from './GameIcon.vue'

const { t } = useLocale()
defineProps<{ state: Snapshot; help: boolean; muted: boolean; lowMotion: boolean }>()
defineEmits<{
  begin: []
  resume: []
  retry: []
  menu: []
  choose: [id: UpgradeId]
  closeHelp: []
  toggleSound: []
  toggleMotion: []
}>()
</script>
<template>
  <div v-if="help" class="modal-layer" @click.self="$emit('closeHelp')">
    <section
      class="dialog help-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <button
        class="icon-button dialog-close"
        :aria-label="t('关闭操作指南')"
        autofocus
        @click="$emit('closeHelp')"
      >
        <GameIcon name="close" /></button
      ><span class="eyebrow">{{ t('EMPLOYEE HANDBOOK / 非正式版') }}</span>
      <h2 id="help-title">{{ t('故障处理指南') }}</h2>
      <p class="dialog-subtitle">{{ t('遇到问题，先试着打一拳。') }}</p>
      <div class="controls-grid">
        <div>
          <kbd>W A S D</kbd><b>{{ t('移动') }}</b
          ><span>{{ t('也支持方向键') }}</span>
        </div>
        <div>
          <kbd>J</kbd><b>{{ t('连续出拳') }}</b
          ><span>{{ t('第三击挑飞；围攻时横扫') }}</span>
        </div>
        <div>
          <kbd>K</kbd><b>{{ t('跳跃 / 飞踢') }}</b
          ><span>{{ t('跳起后出拳') }}</span>
        </div>
        <div>
          <kbd>SPACE</kbd><b>{{ t('冲刺 / 追击') }}</b
          ><span>{{ t('挑飞后按空格追击；冲刺接 J 突进拳') }}</span>
        </div>
        <div>
          <kbd>E</kbd><b>{{ t('拾取 / 投掷') }}</b
          ><span>{{ t('键盘、椅子、纸箱') }}</span>
        </div>
        <div>
          <kbd>Q</kbd><b>{{ t('强制重连') }}</b
          ><span>{{ t('怒气满后清场') }}</span>
        </div>
      </div>
      <p>{{ t('选卡快捷键') }} · {{ t('数字键或小键盘 1 / 2 / 3') }}</p>
      <p>{{ t('难度降低所有击破与咖啡回血，升级续杯和跨城仍回满。') }}</p>
      <div class="help-note">
        {{
          t(
            '清空每个街段后三选一 Buff，再向右前进。Buff 持续整局，可叠加升级。把敌人打进人群，能连锁撞击并砸碎道具。',
          )
        }}<br />{{ t('Esc 暂停。离开窗口自动暂停，每小关开始与选卡时自动存档。') }}
      </div>
      <button class="button button-primary" @click="$emit('closeHelp')">
        {{ t('懂了，开打') }}<GameIcon name="arrow" />
      </button>
    </section>
  </div>
  <div v-else-if="state.mode === 'intro'" class="modal-layer intro-layer">
    <section
      class="dialog intro-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-title"
    >
      <span class="eyebrow">{{ STAGES[state.stage]!.location }}</span>
      <div class="chapter-number">0{{ state.stage + 1 }}</div>
      <h2 id="intro-title">{{ t(STAGES[state.stage]!.name) }}</h2>
      <p>{{ t(STAGES[state.stage]!.story) }}</p>
      <p>
        {{
          t('街段 {0} / {1} · {2} · 全程 {3} 关', {
            '0': state.wave + 1,
            '1': state.waveCount,
            '2': blockAt(STAGES[state.stage]!.city, state.wave).name,
            '3': state.total,
          })
        }}
      </p>
      <p>{{ t('难度：{0}', { '0': DIFFICULTIES[state.difficulty].name }) }}</p>
      <div class="intro-tip">
        <GameIcon :name="state.stage === 3 ? 'shield' : 'keyboard'" />{{
          t(
            String(
              state.stage === 0
                ? 'J 三拳挑飞 → 空格追击 · 清场后向右走'
                : state.stage === 1
                  ? '转圈怪会瞄准你的位置，保持移动。'
                  : state.stage === 2
                    ? '盾牌挡得住拳头，挡不住你扔来的办公椅。'
                    : '红圈要躲，横扫要跳，护盾要拆。',
            ),
          )
        }}
      </div>
      <button class="button button-primary" @click="$emit('begin')">
        {{ t(state.stage === 3 ? '拔掉它的网线' : '进入战斗') }}<GameIcon name="arrow" /></button
      ><span class="enter-hint">PRESS ENTER TO START</span>
    </section>
  </div>
  <div v-else-if="state.mode === 'paused'" class="modal-layer">
    <section
      class="dialog pause-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <span class="eyebrow">CONNECTION ON HOLD</span>
      <h2 id="pause-title">{{ t('摸会儿鱼。') }}</h2>
      <p class="dialog-subtitle">{{ t('网络还没好，但你可以歇一歇。') }}</p>
      <button class="button button-primary" @click="$emit('resume')">
        {{ t('继续战斗') }}<GameIcon name="play" />
      </button>
      <RunBuild :build="state.build" :difficulty="state.difficulty" />
      <p>{{ t('难度：{0}', { '0': DIFFICULTIES[state.difficulty].name }) }}</p>
      <div class="settings-row">
        <button @click="$emit('toggleSound')">
          <GameIcon :name="muted ? 'muted' : 'sound'" />{{
            t('声音 {0}', { '0': muted ? '关闭' : '开启' })
          }}</button
        ><button @click="$emit('toggleMotion')">
          {{ t('震屏 {0}', { '0': lowMotion ? '关闭' : '开启' }) }}
        </button>
      </div>
      <button class="text-button" @click="$emit('menu')">
        {{ t('返回首页 · 已保存本小关起点') }}
      </button>
    </section>
  </div>
  <BuffDraft
    v-else-if="state.mode === 'upgrade'"
    :state="state"
    @choose="$emit('choose', $event)"
  />
  <div v-else-if="state.mode === 'gameover'" class="modal-layer">
    <section
      class="dialog result-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <span class="eyebrow">ERROR 408 / EMPLOYEE TIMEOUT</span><span class="result-symbol">×</span>
      <h2 id="gameover-title">{{ t('你掉线了。') }}</h2>
      <p class="dialog-subtitle">{{ t('只是暂时的。打工人的连接永不断开。') }}</p>
      <div class="result-stats">
        <div>
          <b>{{ state.score.toLocaleString() }}</b
          ><span>{{ t('回收数据') }}</span>
        </div>
        <div>
          <b>{{ state.bestCombo }}</b
          ><span>{{ t('最高连击') }}</span>
        </div>
      </div>
      <button class="button button-primary" @click="$emit('retry')">
        {{ t('重连本关') }}<GameIcon name="reset" /></button
      ><button class="text-button" @click="$emit('menu')">{{ t('先摸会儿鱼') }}</button>
    </section>
  </div>
  <div v-else-if="state.mode === 'victory'" class="modal-layer victory-layer">
    <section
      class="dialog result-dialog victory-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="victory-title"
    >
      <span class="eyebrow">UPLOAD COMPLETE / 100%</span><GameIcon name="cup" :size="64" />
      <h2 id="victory-title">
        {{ t('准点下班。') }}<small>{{ t('虽然已经不准点了。') }}</small>
      </h2>
      <div class="result-stats">
        <div>
          <b>{{ state.score.toLocaleString() }}</b
          ><span>{{ t('回收数据') }}</span>
        </div>
        <div>
          <b>{{ state.bestCombo }}</b
          ><span>{{ t('最高连击') }}</span>
        </div>
        <div>
          <b
            >{{ Math.floor(state.elapsed / 60) }}:{{
              Math.floor(state.elapsed % 60)
                .toString()
                .padStart(2, '0')
            }}</b
          ><span>{{ t('本次战斗') }}</span>
        </div>
      </div>
      <p class="reward-receipt">
        {{
          t('Boss 与精英奖励 +{0} · 通关奖励 +{1} 数据，已计入总分', {
            '0': state.bountyScore,
            '1': state.clearBonus,
          })
        }}
      </p>
      <RunBuild :build="state.build" :difficulty="state.difficulty" />
      <div class="ending-joke">
        <span>{{ t('系统通知') }}</span
        ><b>{{ t('文件过大，请重新上传。') }}</b
        ><small>{{ t('……明天再说。') }}</small>
      </div>
      <button class="button button-primary" @click="$emit('menu')">
        {{ t('拔线，下班。') }}<GameIcon name="arrow" />
      </button>
    </section>
  </div>
</template>
