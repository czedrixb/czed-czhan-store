<script setup lang="ts">
import { PhTray } from '@phosphor-icons/vue'
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    icon?: Component
    message: string
  }>(),
  { icon: undefined },
)
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-12 text-center">
    <component :is="icon ?? PhTray" class="h-9 w-9 text-neutral-300" weight="light" aria-hidden="true" />
    <p class="text-sm text-ink-subtle">{{ message }}</p>
    <div v-if="$slots.action" class="mt-1">
      <slot name="action" />
    </div>
  </div>
</template>
