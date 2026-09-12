<script setup lang="ts">
// titleTemplate needs a function, which nuxt.config's serializable app.head
// can't carry (see the comment there) - set once here instead.
useHead({
  titleTemplate: (title) => (title && title !== 'Tindahan' ? `${title} · Tindahan` : 'Tindahan'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AppSplash />
</template>
