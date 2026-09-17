<script setup lang="ts">
import { STAGES } from '../../game/content'
import type { Snapshot, UpgradeId } from '../../game/types'
import GameIcon from './GameIcon.vue'
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
        aria-label="关闭操作指南"
        autofocus
        @click="$emit('closeHelp')"
      >
        <GameIcon name="close" /></button
      ><span class="eyebrow">EMPLOYEE HANDBOOK / 非正式版</span>
      <h2 id="help-title">故障处理指南</h2>
      <p class="dialog-subtitle">遇到问题，先试着打一拳。</p>
      <div class="controls-grid">
        <div><kbd>W A S D</kbd><b>移动</b><span>也支持方向键</span></div>
        <div><kbd>J</kbd><b>连续出拳</b><span>第三击挑飞；围攻时横扫</span></div>
        <div><kbd>K</kbd><b>跳跃 / 飞踢</b><span>跳起后出拳</span></div>
        <div><kbd>SPACE</kbd><b>冲刺 / 追击</b><span>挑飞后按空格追击；冲刺接 J 突进拳</span></div>
        <div><kbd>E</kbd><b>拾取 / 投掷</b><span>键盘、椅子、纸箱</span></div>
        <div><kbd>Q</kbd><b>强制重连</b><span>怒气满后清场</span></div>
      </div>
      <div class="help-note">
        清空街段后向右前进。把敌人打进人群，能连锁撞击并砸碎道具。<br />Esc
        暂停。离开窗口自动暂停，每关开始时自动存档。
      </div>
      <button class="button button-primary" @click="$emit('closeHelp')">
        懂了，开打 <GameIcon name="arrow" />
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
      <h2 id="intro-title">{{ STAGES[state.stage]!.name }}</h2>
      <p>{{ STAGES[state.stage]!.story }}</p>
      <div class="intro-tip">
        <GameIcon :name="state.stage === 3 ? 'shield' : 'keyboard'" />{{
          state.stage === 0
            ? 'J 三拳挑飞 → 空格追击 · 清场后向右走'
            : state.stage === 1
              ? '转圈怪会瞄准你的位置，保持移动。'
              : state.stage === 2
                ? '盾牌挡得住拳头，挡不住你扔来的办公椅。'
                : '红圈要躲，横扫要跳，护盾要拆。'
        }}
      </div>
      <button class="button button-primary" @click="$emit('begin')">
        {{ state.stage === 3 ? '拔掉它的网线' : '进入战斗' }}<GameIcon name="arrow" /></button
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
      <h2 id="pause-title">摸会儿鱼。</h2>
      <p class="dialog-subtitle">网络还没好，但你可以歇一歇。</p>
      <button class="button button-primary" @click="$emit('resume')">
        继续战斗<GameIcon name="play" />
      </button>
      <div class="settings-row">
        <button @click="$emit('toggleSound')">
          <GameIcon :name="muted ? 'muted' : 'sound'" />声音 {{ muted ? '关闭' : '开启' }}</button
        ><button @click="$emit('toggleMotion')">震屏 {{ lowMotion ? '关闭' : '开启' }}</button>
      </div>
      <button class="text-button" @click="$emit('menu')">返回首页 · 已保存本关起点</button>
    </section>
  </div>
  <div v-else-if="state.mode === 'upgrade'" class="modal-layer upgrade-layer">
    <section class="upgrade-dialog" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <span class="eyebrow">OFFICE {{ state.stage + 1 }} CLEARED / 连接恢复</span>
      <h2 id="upgrade-title">打得不错。<br /><span>领点员工福利。</span></h2>
      <p>选择一项升级，带着满血进入下一座城市。</p>
      <p class="reward-receipt">
        本关击破奖励 +{{ state.bountyScore }} · 通关奖励 +{{ state.clearBonus }} 数据，已到账
      </p>
      <div class="upgrade-cards">
        <button
          v-for="(choice, i) in state.choices"
          :key="choice.id"
          class="upgrade-card"
          @click="$emit('choose', choice.id)"
        >
          <div class="upgrade-card-top">
            <span>0{{ i + 1 }}</span
            ><span>{{ choice.label }}</span>
          </div>
          <span class="upgrade-icon">{{ choice.icon }}</span>
          <h3>{{ choice.name }}</h3>
          <p>{{ choice.description }}</p>
          <div class="upgrade-select">就选这个 <GameIcon name="arrow" /></div>
        </button>
      </div>
    </section>
  </div>
  <div v-else-if="state.mode === 'gameover'" class="modal-layer">
    <section
      class="dialog result-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
    >
      <span class="eyebrow">ERROR 408 / EMPLOYEE TIMEOUT</span><span class="result-symbol">×</span>
      <h2 id="gameover-title">你掉线了。</h2>
      <p class="dialog-subtitle">只是暂时的。打工人的连接永不断开。</p>
      <div class="result-stats">
        <div>
          <b>{{ state.score.toLocaleString() }}</b
          ><span>回收数据</span>
        </div>
        <div>
          <b>{{ state.bestCombo }}</b
          ><span>最高连击</span>
        </div>
      </div>
      <button class="button button-primary" @click="$emit('retry')">
        重连本关<GameIcon name="reset" /></button
      ><button class="text-button" @click="$emit('menu')">先摸会儿鱼</button>
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
      <h2 id="victory-title">准点下班。<small>虽然已经不准点了。</small></h2>
      <div class="result-stats">
        <div>
          <b>{{ state.score.toLocaleString() }}</b
          ><span>回收数据</span>
        </div>
        <div>
          <b>{{ state.bestCombo }}</b
          ><span>最高连击</span>
        </div>
        <div>
          <b
            >{{ Math.floor(state.elapsed / 60) }}:{{
              Math.floor(state.elapsed % 60)
                .toString()
                .padStart(2, '0')
            }}</b
          ><span>本次战斗</span>
        </div>
      </div>
      <p class="reward-receipt">
        Boss 与精英奖励 +{{ state.bountyScore }} · 通关奖励 +{{ state.clearBonus }} 数据，已计入总分
      </p>
      <div class="ending-joke">
        <span>系统通知</span><b>文件过大，请重新上传。</b><small>……明天再说。</small>
      </div>
      <button class="button button-primary" @click="$emit('menu')">
        拔线，下班。<GameIcon name="arrow" />
      </button>
    </section>
  </div>
</template>
