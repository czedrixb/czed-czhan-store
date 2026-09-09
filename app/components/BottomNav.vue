<script setup lang="ts">
import { PhHouse, PhShoppingCartSimple, PhPackage, PhChartBar, PhDotsThreeOutline } from '@phosphor-icons/vue'
import type { Component } from 'vue'

interface Tab {
  label: string
  to: string
  icon: Component
  match: (path: string) => boolean
}

const tabs: Tab[] = [
  { label: 'Home', to: '/', icon: PhHouse, match: (p) => p === '/' },
  { label: 'Sale', to: '/sales/new', icon: PhShoppingCartSimple, match: (p) => p.startsWith('/sales') },
  { label: 'Stock', to: '/inventory', icon: PhPackage, match: (p) => p.startsWith('/inventory') || p.startsWith('/products') },
  { label: 'Reports', to: '/reports', icon: PhChartBar, match: (p) => p.startsWith('/reports') },
  { label: 'More', to: '/settings', icon: PhDotsThreeOutline, match: (p) => p.startsWith('/settings') },
]

const route = useRoute()
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-line bg-surface/95 backdrop-blur safe-bottom"
    aria-label="Primary"
  >
    <ul class="flex">
      <li v-for="tab in tabs" :key="tab.to" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="focus-ring flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-[var(--dur-base)]"
          :class="tab.match(route.path) ? 'text-brand-600' : 'text-ink-subtle active:text-ink-muted'"
        >
          <component
            :is="tab.icon"
            class="h-6 w-6 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
            :class="tab.match(route.path) ? 'scale-110' : ''"
            :weight="tab.match(route.path) ? 'fill' : 'regular'"
          />
          {{ tab.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
