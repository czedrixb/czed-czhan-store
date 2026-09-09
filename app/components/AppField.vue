<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string
    for?: string
  }>(),
  { hint: '', error: '', for: undefined },
)
</script>

<template>
  <label class="block text-sm font-medium text-ink-muted" :for="$props.for">
    {{ label }}
    <div class="mt-1">
      <slot />
    </div>
    <p v-if="error" class="mt-1 text-xs font-medium text-danger-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-ink-subtle">{{ hint }}</p>
  </label>
</template>
