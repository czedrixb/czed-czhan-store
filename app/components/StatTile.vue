<script setup lang="ts">
defineProps<{
  label: string
  value: string
  tone?: 'default' | 'brand' | 'danger'
}>()
</script>

<template>
  <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ label }}</p>
    <p
      class="mt-1 text-2xl font-bold tabular-nums"
      :class="{
        'text-brand-700': tone === 'brand',
        'text-danger-600': tone === 'danger',
        'text-gray-900': !tone || tone === 'default',
      }"
    >
      {{ value }}
    </p>
  </div>
</template>
