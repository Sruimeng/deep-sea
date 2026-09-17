<script setup lang="ts">
import type { Milestone } from '../../game/types'
defineProps<{ milestone: Milestone }>()
</script>

<template>
  <div class="battle-milestone" :key="`${milestone.title}-${milestone.count}`" role="status">
    <span class="milestone-count">{{ milestone.count }}<small> K.O.</small></span>
    <strong class="milestone-title">{{ milestone.title }}</strong>
    <span class="milestone-bonus">额外奖励 +{{ milestone.bonus }}</span>
  </div>
</template>

<style scoped>
.battle-milestone {
  position: absolute;
  top: 190px;
  left: 50%;
  transform: translateX(-50%) rotate(-4deg);
  display: grid;
  text-align: center;
  color: #f9cf00;
  pointer-events: none;
  text-shadow:
    3px 4px #141414,
    -1px -1px #141414;
  animation: milestone-enter 250ms ease-out;
}
.battle-milestone.with-boss {
  top: 218px;
}
.milestone-count {
  font:
    italic 900 60px/0.95 'Arial Black',
    sans-serif;
}
.milestone-count small {
  font-size: 28px;
}
.milestone-title {
  margin-top: 8px;
  font-size: 24px;
  letter-spacing: 5px;
}
.milestone-bonus {
  margin-top: 8px;
  color: #fff;
  font-size: 12px;
}
@keyframes milestone-enter {
  from {
    opacity: 0;
    transform: translateX(-50%) rotate(-7deg) scale(1.4);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) rotate(-4deg) scale(1);
  }
}
:global(.reduced-motion) .battle-milestone {
  animation: none;
}
@media (max-width: 760px) {
  .battle-milestone {
    top: 205px;
    left: 27%;
  }
  .battle-milestone.with-boss {
    top: 250px;
  }
  .milestone-count {
    font-size: 38px;
  }
  .milestone-count small {
    font-size: 18px;
  }
  .milestone-title {
    font-size: 18px;
    letter-spacing: 2px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .battle-milestone {
    animation: none;
  }
}
</style>
