<script setup lang="ts">
import type { MonthlyReport, SalesTotals, WeeklyReport } from '~/types'

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
          class="flex-1 rounded-full py-1.5 text-sm font-medium capitalize"
          :class="tab === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'"
          @click="tab = t"
        >
          {{ t }}
        </button>
      </div>

      <div v-if="loading" class="py-12 text-center text-gray-400">Loading…</div>

      <template v-else-if="tab === 'daily' && daily">
        <h2 class="text-sm font-semibold text-gray-700">{{ formatDateLabel(daily.date) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Total Revenue" :value="formatPeso(daily.revenue)" tone="brand" />
          <StatTile label="Cost of Goods" :value="formatPeso(daily.cost)" />
          <StatTile label="Gross Profit" :value="formatPeso(daily.profit)" tone="brand" />
          <StatTile label="Items Sold" :value="String(daily.itemsSold)" />
        </div>
        <StatTile label="Transactions" :value="String(daily.transactions)" />
        <a :href="`/api/export/sales?range=today`" class="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700">
          Export Daily Sales
        </a>
      </template>

      <template v-else-if="tab === 'weekly' && weekly">
        <h2 class="text-sm font-semibold text-gray-700">{{ formatDateLabel(weekly.start) }} – {{ formatDateLabel(weekly.end) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Revenue" :value="formatPeso(weekly.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(weekly.cost)" />
          <StatTile label="Gross Profit" :value="formatPeso(weekly.profit)" tone="brand" />
          <StatTile label="Items Sold" :value="String(weekly.itemsSold)" />
        </div>
        <section v-if="weekly.topProducts.length">
          <h3 class="mb-2 text-sm font-semibold text-gray-700">Top Products</h3>
          <ol class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            <li v-for="(p, i) in weekly.topProducts" :key="p.productId" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ i + 1 }}. {{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.quantitySold }} sold</span>
            </li>
          </ol>
        </section>
        <a :href="`/api/export/sales?range=week`" class="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700">
          Export Weekly Sales
        </a>
      </template>

      <template v-else-if="tab === 'monthly' && monthly">
        <h2 class="text-sm font-semibold text-gray-700">{{ formatDateLabel(monthly.start) }} – {{ formatDateLabel(monthly.end) }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Revenue" :value="formatPeso(monthly.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(monthly.cost)" />
          <StatTile label="Gross Profit" :value="formatPeso(monthly.profit)" tone="brand" />
          <StatTile label="Items Sold" :value="String(monthly.itemsSold)" />
        </div>
        <section v-if="monthly.topProducts.length">
          <h3 class="mb-2 text-sm font-semibold text-gray-700">Best-Selling Products</h3>
          <ol class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            <li v-for="(p, i) in monthly.topProducts" :key="p.productId" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ i + 1 }}. {{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.quantitySold }} sold</span>
            </li>
          </ol>
        </section>
        <section v-if="monthly.lowestStock.length">
          <h3 class="mb-2 text-sm font-semibold text-gray-700">Lowest-Stock Products</h3>
          <ul class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            <li v-for="p in monthly.lowestStock" :key="p.id" class="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></span>
              <span class="font-medium tabular-nums">{{ p.stock }}</span>
            </li>
          </ul>
        </section>
        <a :href="`/api/export/sales?range=month`" class="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700">
          Export Monthly Sales
        </a>
      </template>
    </div>
  </div>
</template>
