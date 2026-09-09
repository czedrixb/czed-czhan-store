<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="safe-top sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-4 backdrop-blur">
    <h1 class="text-lg font-bold text-ink">{{ title }}</h1>
    <p v-if="subtitle" class="text-sm text-ink-subtle">{{ subtitle }}</p>
    <slot name="actions" />
  </header>
</template>
