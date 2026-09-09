<script setup lang="ts">
import { PhSpinnerGap } from '@phosphor-icons/vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
  },
)

const VARIANT_CLASS: Record<string, string> = {
  primary: 'bg-brand-600 text-white active:bg-brand-700 disabled:bg-neutral-300',
  secondary: 'border border-line bg-surface text-ink active:bg-neutral-50 disabled:text-ink-subtle',
  ghost: 'text-brand-600 active:bg-brand-50 disabled:text-ink-subtle',
  danger: 'border border-danger-600 text-danger-600 active:bg-danger-50 disabled:border-neutral-300 disabled:text-ink-subtle',
}

const SIZE_CLASS: Record<string, string> = {
  sm: 'min-h-[40px] px-3 text-sm',
  md: 'min-h-[48px] px-4 text-base',
  lg: 'min-h-[52px] px-5 text-base',
}
</script>

<template>
  <button
    :type="type"
    class="press focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold disabled:cursor-not-allowed"
    :class="[VARIANT_CLASS[variant], SIZE_CLASS[size], block ? 'w-full' : '']"
    :disabled="disabled || loading"
  >
    <PhSpinnerGap v-if="loading" class="h-[1.15em] w-[1.15em] animate-spin" weight="bold" aria-hidden="true" />
    <slot />
  </button>
</template>
