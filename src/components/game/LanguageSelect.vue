<script setup lang="ts">
import { useLocale } from '../../i18n/useLocale'
import { isLocale } from '../../i18n'
const { t, locale, setLocale } = useLocale()
function change(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (isLocale(value)) setLocale(value)
}
</script>
<template>
  <select class="language-select" :aria-label="t('语言')" :value="locale" @change="change">
    <option value="zh-CN" lang="zh-CN">简体中文</option>
    <option value="en" lang="en">English</option>
  </select>
</template>
<style scoped>
.language-select {
  color: #e8e8e8;
  background: #23252a;
  border: 1px solid #555;
  padding: 7px;
  font: inherit;
  font-size: 11px;
  max-width: 100px;
  border-radius: 2px;
}
.language-select:focus-visible {
  outline: 2px solid #f9cf00;
}
@media (max-width: 600px) {
  .language-select {
    max-width: 78px;
    padding: 6px 2px;
    font-size: 10px;
  }
}
</style>
