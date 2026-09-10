<script setup lang="ts">
const route = useRoute()
const showNav = computed(() => route.path !== '/login' && route.path !== '/settings/password')

// The bottom nav is `position: fixed`, so its hit-test area stays pinned to
// the layout viewport even when an on-screen keyboard shrinks the visible
// one - e.g. tapping a search result near the bottom of the screen while
// typing on /sales/new can land on the "Sale" tab underneath it instead,
// firing a phantom navigateTo('/sales/new') and yanking focus away from the
// search flow. Hiding the nav for the duration of text-field focus removes
// the overlap instead of trying to out-guess keyboard geometry.
const textInputFocused = ref(false)
const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])
function isTextField(el: Element | null): boolean {
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  return el.tagName === 'INPUT' && !NON_TEXT_INPUT_TYPES.has((el as HTMLInputElement).type)
}
function syncFocusState() {
  textInputFocused.value = isTextField(document.activeElement)
}
function onFocusOut() {
  // The new activeElement isn't set until after this event, so re-check on
  // the next frame instead of assuming focus left every text field entirely.
  requestAnimationFrame(syncFocusState)
}
onMounted(() => {
  document.addEventListener('focusin', syncFocusState)
  document.addEventListener('focusout', onFocusOut)
})
onBeforeUnmount(() => {
  document.removeEventListener('focusin', syncFocusState)
  document.removeEventListener('focusout', onFocusOut)
})
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-transparent">
    <main class="relative z-0 flex-1" :class="showNav ? 'pb-28' : ''">
      <slot />
    </main>
    <BottomNav v-if="showNav && !textInputFocused" />
    <ToastHost />
    <ConfirmDialog />
  </div>
</template>
