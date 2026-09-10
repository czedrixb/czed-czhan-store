<script setup lang="ts">
import { PhPlus } from '@phosphor-icons/vue'

// Home-only hero header (reference design: profile chip + icon button above
// a large headline). Deliberately not a PageHeader variant - PageHeader's
// rendered height is load-bearing for .sticky-search on /sales/new and
// /inventory (see --header-h in main.css), and this header isn't sticky, so
// keeping it a separate component avoids coupling that offset to a second
// set of markup.
defineProps<{
  title: string
  subtitle?: string
}>()

const { session } = useSession()

const initials = computed(() => {
  const name = session.value?.user?.displayName?.trim() ?? ''
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return letters || '?'
})
</script>

<template>
  <header class="safe-top px-4 pb-2 [--safe-pt:1.75rem]">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
          aria-hidden="true"
        >
          {{ initials }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-ink">{{ session?.user?.displayName }}</p>
          <p class="truncate text-xs text-ink-subtle">@{{ session?.user?.username }}</p>
        </div>
      </div>

      <NuxtLink
        to="/sales/new"
        aria-label="Start a new sale"
        class="press focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface text-brand-600"
        style="box-shadow: var(--shadow-card)"
      >
        <PhPlus class="h-5 w-5" weight="bold" aria-hidden="true" />
      </NuxtLink>
    </div>

    <h1 class="mt-5 text-2xl font-bold leading-tight text-ink">{{ title }}</h1>
    <p v-if="subtitle" class="mt-1 text-sm text-ink-subtle">{{ subtitle }}</p>
  </header>
</template>
