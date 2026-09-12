<script setup lang="ts">
import type { Component } from 'vue'

type Tone = 'default' | 'brand' | 'accent' | 'teal' | 'amber' | 'danger'

defineProps<{
  label: string
  value: string
  tone?: Tone
  icon?: Component
  caption?: string
}>()

// One place mapping a semantic tone to its card surface / icon chip / value
// color, so each metric can carry a distinct tinted surface (Sales=brand,
// Cost=accent/coral, Profit=teal, Items sold=amber) instead of every tile
// rendering as an identical white card.
const CARD_CLASS: Record<Tone, string> = {
  default: 'bg-surface',
  brand: 'bg-brand-50',
  accent: 'bg-accent-50',
  teal: 'bg-teal-50',
  amber: 'bg-warn-50',
  danger: 'bg-danger-50',
}
const ICON_CLASS: Record<Tone, string> = {
  default: 'bg-brand-100 text-brand-700',
  brand: 'bg-brand-100 text-brand-700',
  accent: 'bg-accent-100 text-accent-700',
  teal: 'bg-teal-100 text-teal-700',
  amber: 'bg-warn-100 text-warn-700',
  danger: 'bg-danger-100 text-danger-700',
}
const VALUE_CLASS: Record<Tone, string> = {
  default: 'text-ink',
  brand: 'text-brand-700',
  accent: 'text-accent-700',
  teal: 'text-teal-700',
  amber: 'text-warn-700',
  danger: 'text-danger-600',
}
</script>

<template>
  <div
    data-testid="stat-tile"
    class="rounded-[var(--radius-card)] border border-line p-4"
    :class="CARD_CLASS[tone ?? 'default']"
    style="box-shadow: var(--shadow-card)"
  >
    <div class="flex items-center justify-between gap-2">
      <span
        v-if="icon"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-chip)]"
        :class="ICON_CLASS[tone ?? 'default']"
      >
        <component :is="icon" class="h-4.5 w-4.5" weight="regular" aria-hidden="true" />
      </span>
      <p class="ml-auto text-xs font-medium uppercase tracking-wide text-ink-subtle">{{ label }}</p>
    </div>
    <p class="mt-3 text-[28px] font-bold leading-tight tabular-nums" :class="VALUE_CLASS[tone ?? 'default']">
      {{ value }}
    </p>
    <p v-if="caption" class="mt-0.5 text-xs text-ink-subtle">{{ caption }}</p>
  </div>
</template>
