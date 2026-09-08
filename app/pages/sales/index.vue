<script setup lang="ts">
import type { Sale } from '~/types'

const filters = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
] as const

const range = ref<(typeof filters)[number]['key']>('today')
const sales = ref<Sale[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    sales.value = await $fetch<Sale[]>('/api/sales', { query: { range: range.value } })
  } finally {
    loading.value = false
  }
}

watch(range, load)
onMounted(load)

const groups = computed(() => {
  const byDay = new Map<string, Sale[]>()
  for (const sale of sales.value) {
    const key = formatDateLabel(sale.soldAt)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(sale)
  }
  return Array.from(byDay.entries())
})

const totalRevenue = computed(() => sales.value.reduce((sum, s) => sum + s.revenue, 0))
const totalProfit = computed(() => sales.value.reduce((sum, s) => sum + s.profit, 0))

async function voidSale(sale: Sale) {
  await $fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
  load()
}
</script>

<template>
  <div>
    <PageHeader title="Sales History" />

    <div class="px-4 py-4">
      <div class="flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium"
          :class="range === f.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'"
          @click="range = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-3">
        <StatTile label="Revenue" :value="formatPeso(totalRevenue)" tone="brand" />
        <StatTile label="Profit" :value="formatPeso(totalProfit)" tone="brand" />
      </div>

      <div v-if="loading" class="py-12 text-center text-gray-400">Loading…</div>
      <p v-else-if="!sales.length" class="py-12 text-center text-gray-400">No sales in this period.</p>

      <div v-else class="mt-4 space-y-5">
        <section v-for="[day, items] in groups" :key="day">
          <h2 class="mb-2 text-sm font-semibold text-gray-700">{{ day }}</h2>
          <ul class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            <li v-for="sale in items" :key="sale.id" class="flex items-center justify-between px-4 py-3" :class="{ 'opacity-40': sale.voidedAt }">
              <div>
                <p class="font-medium text-gray-900">
                  {{ sale.productName }}<span v-if="sale.productVariant" class="text-gray-500"> · {{ sale.productVariant }}</span>
                  <span class="text-gray-400"> ×{{ sale.quantity }}</span>
                </p>
                <p class="text-xs text-gray-400">{{ formatTimeLabel(sale.soldAt) }} · Profit {{ formatPeso(sale.profit) }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold tabular-nums text-gray-900">{{ formatPeso(sale.revenue) }}</span>
                <button
                  v-if="!sale.voidedAt"
                  type="button"
                  class="text-xs font-medium text-danger-600"
                  @click="voidSale(sale)"
                >
                  Void
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
