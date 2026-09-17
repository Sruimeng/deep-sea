<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
const paths: Record<string, string> = {
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  sound: 'm11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
  muted: 'm11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6',
  pause: 'M8 5v14M16 5v14',
  play: 'm8 5 11 7-11 7V5Z',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-7l1-7Z',
  wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0M12 20h.01',
  keyboard:
    'M3 6h18v12H3V6Zm3 3h.01M9 9h.01M12 9h.01M15 9h.01M18 9h.01M6 12h.01M9 12h.01M12 12h.01M15 12h.01M18 12h.01M8 15h8',
  close: 'm6 6 12 12M18 6 6 18',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  reset: 'M3 10a9 9 0 1 1 2 8M3 3v7h7',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z',
  cup: 'M5 3h12v7a6 6 0 0 1-12 0V3Zm12 2h2a3 3 0 0 1 0 6h-2M12 16v5m-5 0h10',
}
</script>
<template>
  <svg
    :width="size || 20"
    :height="size || 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.bolt" />
  </svg>
</template>
