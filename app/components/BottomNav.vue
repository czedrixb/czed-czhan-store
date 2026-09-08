<script setup lang="ts">
interface Tab {
  label: string
  to: string
  icon: string
  match: (path: string) => boolean
}

const tabs: Tab[] = [
  {
    label: 'Home',
    to: '/',
    icon: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
    match: (p) => p === '/',
  },
  {
    label: 'Sale',
    to: '/sales/new',
    icon: 'M12 5v14M5 12h14',
    match: (p) => p.startsWith('/sales'),
  },
  {
    label: 'Stock',
    to: '/inventory',
    icon: 'M4 7l8-4 8 4M4 7v10l8 4m-8-14 8 4m0 10 8-4V7m-8 14V11m0 0L20 7',
    match: (p) => p.startsWith('/inventory') || p.startsWith('/products'),
  },
  {
    label: 'Reports',
    to: '/reports',
    icon: 'M4 19V9m6 10V5m6 14v-7',
    match: (p) => p.startsWith('/reports'),
  },
  {
    label: 'More',
    to: '/settings',
    icon: 'M4 6h16M4 12h16M4 18h16',
    match: (p) => p.startsWith('/settings'),
  },
]

const route = useRoute()
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom"
    aria-label="Primary"
  >
    <ul class="mx-auto flex max-w-md">
      <li v-for="tab in tabs" :key="tab.to" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="flex flex-col items-center gap-1 py-2 text-xs font-medium"
          :class="tab.match(route.path) ? 'text-brand-600' : 'text-gray-500'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6">
            <path :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
