<script setup lang="ts">
// Single source of truth for the Tindahan storefront mark in the UI (login,
// HomeHeader, splash). Rendered from the same SVG that scripts/generate-icons.ts
// rasterizes for every favicon/PWA icon, so the in-app mark and the installed
// icon can never drift apart.
import mark from '~/assets/brand/tindahan-mark.svg?raw'

withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <span
    class="brand-mark inline-block shrink-0 overflow-hidden rounded-[22%]"
    :style="{ width: `${size}px`, height: `${size}px` }"
    v-html="mark"
  />
</template>

<style>
/* Not scoped: v-html content isn't reachable by Vue's scoped-style attribute
   selectors, and the inlined <svg> otherwise falls back to its intrinsic
   300x150 box instead of filling the sized wrapper span. */
.brand-mark svg {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
