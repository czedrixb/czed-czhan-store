<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="safe-top sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur">
    <h1 class="text-lg font-bold text-gray-900">{{ title }}</h1>
    <p v-if="subtitle" class="text-sm text-gray-500">{{ subtitle }}</p>
    <slot name="actions" />
  </header>
</template>
