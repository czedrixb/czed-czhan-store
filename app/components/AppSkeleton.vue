<script setup lang="ts">
// Shape-matched loading placeholder. `variant` picks a preset shape so each
// screen's skeleton roughly matches the content it stands in for, rather
// than a single generic spinner everywhere.
withDefaults(
  defineProps<{
    variant?: 'stat-grid' | 'list' | 'card' | 'line'
    rows?: number
  }>(),
  { variant: 'line', rows: 3 },
)
</script>

<template>
  <div aria-hidden="true" role="presentation">
    <div v-if="variant === 'stat-grid'" class="grid grid-cols-2 gap-3">
      <div v-for="i in 4" :key="i" class="skeleton h-20 rounded-[var(--radius-card)]" />
    </div>

    <div v-else-if="variant === 'list'" class="overflow-hidden rounded-[var(--radius-card)] border border-line">
      <div v-for="i in rows" :key="i" class="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
        <div class="space-y-2">
          <div class="skeleton h-3.5 w-32 rounded" />
          <div class="skeleton h-3 w-20 rounded" />
        </div>
        <div class="skeleton h-3.5 w-10 rounded" />
      </div>
    </div>

    <div v-else-if="variant === 'card'" class="skeleton h-28 rounded-[var(--radius-card)]" />

    <div v-else class="space-y-2">
      <div v-for="i in rows" :key="i" class="skeleton h-3.5 rounded" :style="{ width: i % 2 ? '100%' : '70%' }" />
    </div>
  </div>
</template>
