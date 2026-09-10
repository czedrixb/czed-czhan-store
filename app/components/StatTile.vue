<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: string
  tone?: 'default' | 'brand' | 'danger'
  icon?: Component
  caption?: string
}>()
</script>

<template>
  <div
    data-testid="stat-tile"
    class="rounded-[var(--radius-card)] border border-line bg-surface p-4"
    style="box-shadow: var(--shadow-card)"
  >
    <div class="flex items-center justify-between gap-2">
      <span
        v-if="icon"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-chip)]"
        :class="{
          'bg-brand-50 text-brand-600': !tone || tone === 'default' || tone === 'brand',
          'bg-danger-50 text-danger-600': tone === 'danger',
        }"
      >
        <component :is="icon" class="h-4.5 w-4.5" weight="regular" aria-hidden="true" />
      </span>
      <p class="ml-auto text-xs font-medium uppercase tracking-wide text-ink-subtle">{{ label }}</p>
    </div>
    <p
      class="mt-3 text-[28px] font-bold leading-tight tabular-nums"
      :class="{
        'text-brand-700': tone === 'brand',
        'text-danger-600': tone === 'danger',
        'text-ink': !tone || tone === 'default',
      }"
    >
      {{ value }}
    </p>
    <p v-if="caption" class="mt-0.5 text-xs text-ink-subtle">{{ caption }}</p>
  </div>
</template>
