<script setup lang="ts">
import { PhEye, PhEyeSlash } from '@phosphor-icons/vue'

// Shared show/hide password input used by the self-service change-password
// form and the admin reset drawer, so both get the same toggle instead of
// reimplementing it twice.
defineProps<{
  modelValue: string
  id: string
  testid?: string
  autocomplete?: string
}>()
defineEmits<{ 'update:modelValue': [string] }>()

const visible = ref(false)
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      :value="modelValue"
      :data-testid="testid"
      :type="visible ? 'text' : 'password'"
      :autocomplete="autocomplete"
      class="field-input pr-11"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      class="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-subtle"
      :aria-label="visible ? 'Hide password' : 'Show password'"
      :data-testid="testid ? `${testid}-toggle` : undefined"
      @click="visible = !visible"
    >
      <component :is="visible ? PhEyeSlash : PhEye" class="h-4.5 w-4.5" weight="regular" aria-hidden="true" />
    </button>
  </div>
</template>
