<script setup lang="ts">
defineProps<{
  label: string
  value: string
  tone?: 'default' | 'brand' | 'danger'
}>()
</script>

<template>
  <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4" style="box-shadow: var(--shadow-card)">
    <p class="text-xs font-medium uppercase tracking-wide text-ink-subtle">{{ label }}</p>
    <p
      class="mt-1 text-2xl font-bold tabular-nums"
      :class="{
        'text-brand-700': tone === 'brand',
        'text-danger-600': tone === 'danger',
        'text-ink': !tone || tone === 'default',
      }"
    >
      {{ value }}
    </p>
  </div>
</template>
