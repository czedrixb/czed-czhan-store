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
  <div class="safe-bottom fixed inset-x-0 bottom-0 z-50 isolate mx-auto max-w-md px-4 [--safe-pb:0.75rem]">
    <nav
      class="flex rounded-[28px] border border-line/60 bg-surface/95 backdrop-blur"
      style="box-shadow: var(--shadow-nav)"
      aria-label="Primary"
    >
      <ul class="flex w-full">
        <li v-for="tab in tabs" :key="tab.to" class="flex-1">
          <NuxtLink
            :to="tab.to"
            class="focus-ring relative z-10 flex touch-manipulation flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors duration-[var(--dur-base)]"
            :class="tab.match(route.path) ? 'text-brand-600' : 'text-ink-subtle active:text-ink-muted'"
            @touchend.prevent="navigateTo(tab.to)"
          >
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-[var(--dur-base)]"
              :class="tab.match(route.path) ? 'bg-brand-600' : ''"
            >
              <component
                :is="tab.icon"
                class="h-5 w-5 transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
                :class="tab.match(route.path) ? 'scale-110 text-white' : ''"
                :weight="tab.match(route.path) ? 'fill' : 'regular'"
              />
            </span>
            {{ tab.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
