<script setup lang="ts">
const emit = defineEmits<{ input: [key: string, down: boolean] }>()
const moves = [
  { key: 'KeyW', text: '↑' },
  { key: 'KeyA', text: '←' },
  { key: 'KeyS', text: '↓' },
  { key: 'KeyD', text: '→' },
]
const actions = [
  { key: 'KeyJ', text: '拳' },
  { key: 'KeyK', text: '跳' },
  { key: 'Space', text: '闪' },
  { key: 'KeyE', text: '拾 / 扔' },
  { key: 'KeyQ', text: '重连' },
]
function press(event: PointerEvent, key: string) {
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  emit('input', key, true)
}
</script>
<template>
  <div class="touch-controls">
    <div class="touch-dpad">
      <button
        v-for="move in moves"
        :key="move.key"
        :class="move.key"
        :aria-label="`移动 ${move.text}`"
        @pointerdown="press($event, move.key)"
        @pointerup="$emit('input', move.key, false)"
        @pointercancel="$emit('input', move.key, false)"
        @lostpointercapture="$emit('input', move.key, false)"
      >
        {{ move.text }}
      </button>
    </div>
    <div class="touch-actions">
      <button
        v-for="action in actions"
        :key="action.key"
        :class="action.key"
        @pointerdown="press($event, action.key)"
        @pointerup="$emit('input', action.key, false)"
        @pointercancel="$emit('input', action.key, false)"
        @lostpointercapture="$emit('input', action.key, false)"
      >
        {{ action.text }}
      </button>
    </div>
  </div>
</template>
