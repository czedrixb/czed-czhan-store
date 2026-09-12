<script setup lang="ts">
import { PhFileXls } from '@phosphor-icons/vue'
import type { MonthlyReport, SalesTotals, WeeklyReport } from '~/types'

const toast = useToast()

const tab = ref<'daily' | 'weekly' | 'monthly'>('daily')

const daily = ref<(SalesTotals & { date: string }) | null>(null)
const weekly = ref<WeeklyReport | null>(null)
const monthly = ref<MonthlyReport | null>(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    if (tab.value === 'daily') daily.value = await $fetch('/api/reports/daily')
    else if (tab.value === 'weekly') weekly.value = await $fetch('/api/reports/weekly')
    else monthly.value = await $fetch('/api/reports/monthly')
  } catch (err: unknown) {
    toast.error(apiErrorMessage(err, 'Could not load this report'))
  } finally {
    loading.value = false
  }
}

watch(tab, load)
onMounted(load)
</script>

<template>
  <div>
    <PageHeader title="Reports" />

    <div class="space-y-4 px-4 py-4">
      <div class="flex gap-2">
        <button
          v-for="t in (['daily', 'weekly', 'monthly'] as const)"
          :key="t"
          type="button"
          class="press focus-ring flex-1 rounded-[var(--radius-pill)] py-1.5 text-sm font-medium capitalize"
          :class="tab === t ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-ink-muted'"
          @click="tab = t"
        >
          {{ t }}
        </button>
      </div>

      <AppSkeleton v-if="loading" variant="stat-grid" />

      <template v-else-if="tab === 'daily' && daily">
        <h2 class="text-sm font-semibold text-ink-muted">{{ formatDateLabel(daily.date) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Total Revenue" :value="formatPeso(daily.revenue)" tone="brand" />
          <StatTile label="Cost of Goods" :value="formatPeso(daily.cost)" tone="accent" />
          <StatTile label="Gross Profit" :value="formatPeso(daily.profit)" tone="teal" />
          <StatTile label="Items Sold" :value="String(daily.itemsSold)" tone="amber" />
        </div>
        <StatTile label="Transactions" :value="String(daily.transactions)" />
        <a
          :href="`/api/export/sales?range=today`"
          class="press focus-ring flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line py-3 text-center text-sm font-semibold text-ink"
        >
          <PhFileXls class="h-4 w-4" weight="bold" />
          Export Daily Sales
        </a>
      </template>

      <template v-else-if="tab === 'weekly' && weekly">
        <h2 class="text-sm font-semibold text-ink-muted">{{ formatDateLabel(weekly.start) }} to {{ formatDateLabel(weekly.end) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Revenue" :value="formatPeso(weekly.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(weekly.cost)" tone="accent" />
          <StatTile label="Gross Profit" :value="formatPeso(weekly.profit)" tone="teal" />
          <StatTile label="Items Sold" :value="String(weekly.itemsSold)" tone="amber" />
        </div>
        <section v-if="weekly.topProducts.length">
          <h3 class="mb-2 text-sm font-semibold text-ink-muted">Top Products</h3>
          <ol class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            <li v-for="(p, i) in weekly.topProducts" :key="p.productId" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ i + 1 }}. {{ p.name }}<span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.quantitySold }} sold</span>
            </li>
          </ol>
        </section>
        <a
          :href="`/api/export/sales?range=week`"
          class="press focus-ring flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line py-3 text-center text-sm font-semibold text-ink"
        >
          <PhFileXls class="h-4 w-4" weight="bold" />
          Export Weekly Sales
        </a>
      </template>

      <template v-else-if="tab === 'monthly' && monthly">
        <h2 class="text-sm font-semibold text-ink-muted">{{ formatDateLabel(monthly.start) }} to {{ formatDateLabel(monthly.end) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Revenue" :value="formatPeso(monthly.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(monthly.cost)" tone="accent" />
          <StatTile label="Gross Profit" :value="formatPeso(monthly.profit)" tone="teal" />
          <StatTile label="Items Sold" :value="String(monthly.itemsSold)" tone="amber" />
        </div>
        <section v-if="monthly.topProducts.length">
          <h3 class="mb-2 text-sm font-semibold text-ink-muted">Best-Selling Products</h3>
          <ol class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            <li v-for="(p, i) in monthly.topProducts" :key="p.productId" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ i + 1 }}. {{ p.name }}<span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.quantitySold }} sold</span>
            </li>
          </ol>
        </section>
        <section v-if="monthly.lowestStock.length">
          <h3 class="mb-2 text-sm font-semibold text-ink-muted">Lowest-Stock Products</h3>
          <ul class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            <li v-for="p in monthly.lowestStock" :key="p.id" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ p.name }}<span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.stock }}</span>
            </li>
          </ul>
        </section>
        <a
          :href="`/api/export/sales?range=month`"
          class="press focus-ring flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line py-3 text-center text-sm font-semibold text-ink"
        >
          <PhFileXls class="h-4 w-4" weight="bold" />
          Export Monthly Sales
        </a>
      </template>
    </div>
  </div>
</template>
