<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import type { CombatReward } from '../../game/types'

const { t } = useLocale()
defineProps<{ rewards: CombatReward[] }>()
</script>

<template>
  <div class="combat-rewards" role="status" aria-live="polite" aria-atomic="true">
    <div v-for="reward in rewards" :key="reward.id" class="combat-reward">
      <span class="reward-label">{{ t(reward.label) }}</span>
      <strong class="reward-score"
        >+{{ reward.score }} <small>{{ t('数据') }}</small></strong
      >
      <span class="reward-supplies"
        >{{ t('已到账')
        }}<span v-if="reward.health">{{
          t('· 生命 +{0}', { '0': Math.round(reward.health) })
        }}</span>
        <span v-if="reward.rage">{{ t('· 怒气 +{0}', { '0': Math.round(reward.rage) }) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.combat-rewards {
  position: absolute;
  right: 24px;
  top: 260px;
  display: grid;
  gap: 8px;
  pointer-events: none;
}
.combat-reward {
  display: grid;
  gap: 4px;
  min-width: 210px;
  padding: 14px 18px;
  color: #fff;
  background: #202124ed;
  border-left: 3px solid #f9cf00;
  box-shadow: 0 6px 20px #0002;
  animation: reward-arrive 220ms ease-out;
}
.reward-label {
  font-size: 12px;
}
.reward-score {
  color: #f9cf00;
  font-size: 28px;
  line-height: 1.1;
}
.reward-score small {
  font-size: 12px;
}
.reward-supplies {
  color: #ddd;
  font-size: 11px;
}
@keyframes reward-arrive {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
:global(.reduced-motion) .combat-reward {
  animation: none;
}
@media (max-width: 700px) {
  .combat-rewards {
    top: 208px;
    right: 10px;
    gap: 4px;
  }
  .combat-reward {
    min-width: 0;
    padding: 8px 10px;
  }
  .reward-score {
    font-size: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .combat-reward {
    animation: none;
  }
}
</style>
