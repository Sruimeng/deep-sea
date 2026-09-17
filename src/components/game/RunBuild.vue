<script setup lang="ts">
import type { BuildItem } from '../../game/types'
import { upgradeBenefit } from '../../game/roguelike'
defineProps<{ build: BuildItem[] }>()
</script>
<template>
  <details v-if="build.length" class="run-build">
    <summary>
      本局构筑 · {{ build.reduce((total, item) => total + item.level, 0) }} 次成长 ·
      {{ build.length }} 种 Buff
    </summary>
    <div class="build-list">
      <div v-for="item in build" :key="item.id" class="build-item">
        <b
          >{{ item.icon }} {{ item.name }} <span>Lv.{{ item.level }} / {{ item.maxLevel }}</span></b
        >
        <small>{{ upgradeBenefit(item.id, item.level) }}</small>
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
