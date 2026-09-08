<script setup lang="ts">
const route = useRoute()
const showNav = computed(() => route.path !== '/login')
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-[#f8faf9]">
    <main class="flex-1" :class="showNav ? 'pb-20' : ''">
      <slot />
    </main>
    <BottomNav v-if="showNav" />
  </div>
</template>
