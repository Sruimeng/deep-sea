<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'

const { t } = useLocale()
defineProps<{ advancing: boolean; pursuitReady: boolean }>()
</script>

<template>
  <div
    v-if="advancing || pursuitReady"
    class="street-prompt"
    :class="{ forward: advancing }"
    role="status"
  >
    <strong>{{ t(advancing ? 'GO →' : '追击！') }}</strong>
    <span>{{ t(advancing ? '街段打通 · 继续向右' : '空格 / 闪 · 追上去再补一击') }}</span>
  </div>
</template>

<style scoped>
.street-prompt {
  position: absolute;
  right: 7%;
  top: 36%;
  display: grid;
  gap: 6px;
  color: #f9cf00;
  text-align: right;
  pointer-events: none;
  text-shadow:
    2px 3px #141414,
    -1px -1px #141414;
}
.street-prompt strong {
  font:
    italic 900 42px/1 'Arial Black',
    sans-serif;
}
.street-prompt span {
  font-size: 12px;
  color: #fff;
}
.forward strong {
  font-size: 56px;
}
@media (max-width: 760px) {
  .street-prompt {
    top: 43%;
    right: 5%;
  }
  .street-prompt strong {
    font-size: 28px;
  }
  .street-prompt span {
    font-size: 10px;
  }
}
</style>
