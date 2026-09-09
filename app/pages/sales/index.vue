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

interface Receipt {
  transactionId: number
  soldAt: string
  voidedAt: string | null
  cashReceived: number | null
  changeDue: number | null
  lines: Sale[]
}

const receipts = computed(() => {
  const byTransaction = new Map<number, Receipt>()
  for (const sale of sales.value) {
    let receipt = byTransaction.get(sale.transactionId)
    if (!receipt) {
      receipt = {
        transactionId: sale.transactionId,
        soldAt: sale.soldAt,
        voidedAt: sale.voidedAt,
        cashReceived: sale.cashReceived,
        changeDue: sale.changeDue,
        lines: [],
      }
      byTransaction.set(sale.transactionId, receipt)
    }
    receipt.lines.push(sale)
  }
  return Array.from(byTransaction.values())
})

const groups = computed(() => {
  const byDay = new Map<string, Receipt[]>()
  for (const receipt of receipts.value) {
    const key = formatDateLabel(receipt.soldAt)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(receipt)
  }
  return Array.from(byDay.entries())
})

const totalRevenue = computed(() => sales.value.reduce((sum, s) => sum + s.revenue, 0))
const totalProfit = computed(() => sales.value.reduce((sum, s) => sum + s.profit, 0))

function receiptTotal(receipt: Receipt) {
  return receipt.lines.reduce((sum, l) => sum + l.revenue, 0)
}

async function voidReceipt(receipt: Receipt) {
  await $fetch(`/api/sales/${receipt.transactionId}`, { method: 'DELETE' })
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
          <ul class="space-y-3">
            <li
              v-for="receipt in items"
              :key="receipt.transactionId"
              class="rounded-2xl border border-gray-100 bg-white px-4 py-3"
              :class="{ 'opacity-40': receipt.voidedAt }"
            >
              <div v-for="line in receipt.lines" :key="line.id" class="flex items-center justify-between py-1">
                <p class="text-sm text-gray-900">
                  {{ line.productName }}<span v-if="line.productVariant" class="text-gray-500"> · {{ line.productVariant }}</span>
                  <span class="text-gray-400"> ×{{ line.quantity }}</span>
                </p>
                <span class="tabular-nums text-gray-700">{{ formatPeso(line.revenue) }}</span>
              </div>

              <div class="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                <p class="text-xs text-gray-400">{{ formatTimeLabel(receipt.soldAt) }}</p>
                <div class="flex items-center gap-2">
                  <span class="font-semibold tabular-nums text-gray-900">{{ formatPeso(receiptTotal(receipt)) }}</span>
                  <button
                    v-if="!receipt.voidedAt"
                    type="button"
                    class="text-xs font-medium text-danger-600"
                    @click="voidReceipt(receipt)"
                  >
                    Void
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
