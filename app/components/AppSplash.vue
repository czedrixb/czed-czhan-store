<script setup lang="ts">
// Covers first paint until startup is ready (mounted from app/app.vue, which
// renders server-side, so this is present in the initial HTML rather than
// appearing only after the interface has already loaded). Dismissal rides on
// Nuxt's own Suspense resolution - the same point auth.global.ts's session
// check and any /login or /settings/password redirect have already settled -
// so there is no artificial delay and no separate loading state to track.
const { dismissed, failed, dismiss, fail, retry } = useSplash()

if (import.meta.client) {
  const nuxtApp = useNuxtApp()
  let watchdog: ReturnType<typeof setTimeout> | undefined

  nuxtApp.hook('app:suspense:resolve', () => {
    clearTimeout(watchdog)
    dismiss()
  })
  nuxtApp.hook('app:error', () => {
    clearTimeout(watchdog)
    fail()
  })

  // Startup should never be able to trap a user behind the splash - if
  // nothing has resolved or errored within a generous window (a hung
  // network request, an unhandled rejection Nuxt's error hook missed), fail
  // open into the recoverable error state instead of staying blank forever.
  watchdog = setTimeout(() => {
    if (!dismissed.value) fail()
  }, 10_000)

  // Deterministic test seam for the otherwise-hard-to-simulate "startup
  // hung/failed" case (same idea as VISUAL_BASELINE in
  // tests/e2e/15-visual-redesign.spec.ts). Exercises the exact same failed
  // state/retry button real failures render - never read outside test runs.
  if (useRoute().query.__splashTest === 'fail') {
    clearTimeout(watchdog)
    fail()
  }
}
</script>

<template>
  <Transition name="splash">
    <div
      v-if="!dismissed"
      class="safe-top safe-bottom fixed inset-0 z-[60] flex flex-col items-center justify-center bg-canvas px-6 text-center"
    >
      <BrandMark :size="96" class="splash-mark" />
      <h1 class="mt-6 text-2xl font-bold text-ink">Tindahan</h1>
      <p class="mt-1 text-sm text-ink-subtle">Your everyday store companion</p>

      <div v-if="failed" class="mt-10 flex flex-col items-center gap-3">
        <p class="text-sm font-medium text-danger-600">Couldn't start Tindahan.</p>
        <AppButton size="sm" variant="secondary" data-testid="splash-retry" @click="retry">Try again</AppButton>
      </div>
    </div>
  </Transition>
</template>
