<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="safe-top sticky top-0 z-30 rounded-b-[var(--radius-card)] border-b border-line/60 bg-surface px-4 pb-4 [--safe-pt:1.25rem]">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-ink">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-ink-subtle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>
