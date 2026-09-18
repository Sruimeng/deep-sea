<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import { DIFFICULTIES, type Difficulty } from '../../game/difficulty'
import type { BuildItem } from '../../game/types'
import { upgradeBenefit } from '../../game/roguelike'

const { t } = useLocale()
defineProps<{ build: BuildItem[]; difficulty: Difficulty }>()
</script>
<template>
  <details v-if="build.length" class="run-build">
    <summary>
      {{
        t('本局构筑 · {0} 次成长 · {1} 种 Buff', {
          '0': build.reduce((total, item) => total + item.level, 0),
          '1': build.length,
        })
      }}
    </summary>
    <div class="build-list">
      <div v-for="item in build" :key="item.id" class="build-item">
        <b
          >{{ item.icon }} {{ t(item.name) }}
          <span>Lv.{{ item.level }} / {{ item.maxLevel }}</span></b
        >
        <small>{{
          t(upgradeBenefit(item.id, item.level, DIFFICULTIES[difficulty].healing))
        }}</small>
      </div>
    </div>
  </details>
</template>
<style scoped>
.run-build {
  margin-top: 20px;
  text-align: left;
  color: #d5d5db;
  font-size: 12px;
}
summary {
  cursor: pointer;
  padding: 12px 0;
  color: #f9cf00;
}
.build-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}
.build-item {
  padding: 10px 12px;
  background: #ffffff0a;
  border: 1px solid #ffffff15;
}
b {
  display: flex;
  gap: 6px;
  font-size: 12px;
}
b span {
  margin-left: auto;
  color: #f9cf00;
}
small {
  display: block;
  margin-top: 6px;
  line-height: 1.6;
}
</style>
