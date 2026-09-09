<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'brand' | 'neutral' | 'danger' | 'warn'
  }>(),
  { tone: 'neutral' },
)

const TONE_CLASS: Record<string, string> = {
  brand: 'bg-brand-50 text-brand-700',
  neutral: 'bg-neutral-100 text-ink-muted',
  danger: 'bg-danger-50 text-danger-600',
  warn: 'bg-warn-50 text-warn-600',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 whitespace-nowrap rounded-[var(--radius-pill)] px-2 py-1 text-[10px] font-bold tracking-wide"
    :class="TONE_CLASS[tone]"
  >
    <slot />
  </span>
</template>
