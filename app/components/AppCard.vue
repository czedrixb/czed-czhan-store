<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>

<template>
  <div
    class="rounded-[var(--radius-card)] border border-line bg-surface"
    :class="padded ? 'p-4' : ''"
    :style="{ boxShadow: 'var(--shadow-card)' }"
  >
    <slot />
  </div>
</template>
