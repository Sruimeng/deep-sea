<script setup lang="ts">
import { DIFFICULTIES, type Difficulty } from '../../game/difficulty'
import { useLocale } from '../../i18n/useLocale'

const { t } = useLocale()
defineProps<{ modelValue: Difficulty; savedDifficulty?: Difficulty }>()
defineEmits<{ 'update:modelValue': [value: Difficulty] }>()
</script>
<template>
  <fieldset class="difficulty-picker">
    <legend>{{ t('新游戏难度') }}</legend>
    <div class="difficulty-options">
      <label
        v-for="item in DIFFICULTIES"
        :key="item.id"
        :class="{ selected: modelValue === item.id }"
      >
        <input
          type="radio"
          name="difficulty"
          :value="item.id"
          :checked="modelValue === item.id"
          @change="$emit('update:modelValue', item.id)"
        />
        {{ t(item.name) }}
      </label>
    </div>
    <p>{{ t(DIFFICULTIES[modelValue].description) }}</p>
    <small v-if="savedDifficulty">{{
      t('存档难度：{0} · 继续游戏保持原难度', { '0': DIFFICULTIES[savedDifficulty].name })
    }}</small>
  </fieldset>
</template>
<style scoped>
.difficulty-picker {
  border: 0;
  padding: 0;
  margin: 16px 0;
  max-width: 440px;
}
legend {
  color: #cacaca;
  font-size: 11px;
  margin-bottom: 8px;
}
.difficulty-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.difficulty-options label {
  cursor: pointer;
  border: 1px solid #666;
  background: #191b1fd9;
  padding: 9px 4px;
  font-size: 12px;
  text-align: center;
  position: relative;
}
.difficulty-options input {
  position: absolute;
  opacity: 0;
  inset: 0;
  width: 100%;
  cursor: pointer;
}
.difficulty-options label:focus-within {
  outline: 2px solid white;
  outline-offset: 2px;
}
.difficulty-options .selected {
  background: #f9cf00;
  color: #151515;
  border-color: #f9cf00;
  font-weight: 800;
}
p {
  color: #d2c69e;
  font-size: 11px;
  line-height: 1.5;
  margin: 8px 0 0;
}
small {
  display: block;
  color: #aaa;
  font-size: 10px;
  margin-top: 5px;
}
</style>
