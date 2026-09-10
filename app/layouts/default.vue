<script setup lang="ts">
const route = useRoute()
const showNav = computed(() => route.path !== '/login' && route.path !== '/settings/password')
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-surface-sunken">
    <main class="relative z-0 flex-1" :class="showNav ? 'pb-20' : ''">
      <slot />
    </main>
    <BottomNav v-if="showNav" />
    <ToastHost />
    <ConfirmDialog />
  </div>
</template>
