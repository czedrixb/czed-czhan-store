<script setup lang="ts">
import type { Product } from '~/types'

const search = ref('')
const results = ref<Product[]>([])
const frequent = ref<Product[]>([])
const selected = ref<Product | null>(null)
const quantity = ref(1)
const saving = ref(false)
const toast = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

async function loadFrequent() {
  frequent.value = await $fetch<Product[]>('/api/products/frequent')
}

async function runSearch() {
  if (!search.value.trim()) {
    results.value = []
    return
  }
  results.value = await $fetch<Product[]>('/api/products', {
    query: { q: search.value.trim(), active: 'true' },
  })
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 200)
})

onMounted(loadFrequent)

function selectProduct(product: Product) {
  selected.value = product
  quantity.value = 1
  search.value = ''
  results.value = []
}

function clearSelection() {
  selected.value = null
  quantity.value = 1
}

const canSell = computed(() => {
  const p = selected.value
  return !!p && p.costPrice !== null && p.sellingPrice !== null && p.stock > 0
})

const subtotal = computed(() => (selected.value?.sellingPrice ?? 0) * quantity.value)
const profit = computed(() => {
  const p = selected.value
  if (!p || p.costPrice === null || p.sellingPrice === null) return 0
  return (p.sellingPrice - p.costPrice) * quantity.value
})

function incQty() {
  if (selected.value && quantity.value < selected.value.stock) quantity.value++
}
function decQty() {
  if (quantity.value > 1) quantity.value--
}

async function saveSale() {
  if (!selected.value || !canSell.value || saving.value) return
  saving.value = true
  try {
    const sale = await $fetch<{ previousStock: number; newStock: number }>('/api/sales', {
      method: 'POST',
      body: { productId: selected.value.id, quantity: quantity.value },
    })
    toast.value = `Saved! Stock: ${sale.previousStock} → ${sale.newStock}`
    clearSelection()
    loadFrequent()
    setTimeout(() => (toast.value = ''), 2500)
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.value = message || 'Could not save sale'
    setTimeout(() => (toast.value = ''), 3000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Add Sale" />

    <div class="space-y-4 px-4 py-4">
      <div
        v-if="toast"
        class="rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white"
        data-testid="sale-toast"
      >
        {{ toast }}
      </div>

      <template v-if="!selected">
        <input
          v-model="search"
          type="search"
          placeholder="Search product..."
          class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
          data-testid="product-search"
        />

        <ul v-if="results.length" class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          <li v-for="p in results" :key="p.id">
            <button
              type="button"
              class="flex w-full items-center justify-between px-4 py-3 text-left active:bg-gray-50"
              data-testid="search-result"
              @click="selectProduct(p)"
            >
              <span>
                <span class="font-medium text-gray-900">{{ p.name }}</span>
                <span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span>
              </span>
              <span class="text-xs text-gray-400">{{ p.stock }} in stock</span>
            </button>
          </li>
        </ul>

        <section v-if="!search && frequent.length">
          <h2 class="mb-2 text-sm font-semibold text-gray-700">Frequently Sold</h2>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="p in frequent"
              :key="p.id"
              type="button"
              class="rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-sm active:bg-gray-50"
              data-testid="frequent-product"
              @click="selectProduct(p)"
            >
              <span class="block font-medium text-gray-900">{{ p.name }}</span>
              <span v-if="p.variant" class="block text-xs text-gray-500">{{ p.variant }}</span>
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="rounded-2xl border border-gray-100 bg-white p-5">
          <button type="button" class="mb-3 text-sm font-medium text-brand-600" @click="clearSelection">
            ← Change product
          </button>

          <p class="text-lg font-bold text-gray-900">
            {{ selected.name }}<span v-if="selected.variant" class="font-normal text-gray-500"> · {{ selected.variant }}</span>
          </p>

          <p v-if="!canSell" class="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">
            <span v-if="selected.costPrice === null || selected.sellingPrice === null">
              This product needs pricing before it can be sold.
            </span>
            <span v-else>Out of stock.</span>
          </p>

          <template v-else>
            <div class="mt-4 flex items-center justify-center gap-6">
              <button
                type="button"
                class="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 active:bg-gray-200"
                data-testid="qty-decrement"
                @click="decQty"
              >
                −
              </button>
              <span class="w-12 text-center text-3xl font-bold tabular-nums" data-testid="qty-value">{{ quantity }}</span>
              <button
                type="button"
                class="h-12 w-12 rounded-full bg-gray-100 text-2xl font-bold text-gray-700 active:bg-gray-200"
                data-testid="qty-increment"
                @click="incQty"
              >
                +
              </button>
            </div>
            <p class="mt-1 text-center text-xs text-gray-400">{{ selected.stock }} in stock</p>

            <div class="mt-5 grid grid-cols-2 gap-3 text-center">
              <div class="rounded-xl bg-gray-50 py-3">
                <p class="text-xs uppercase text-gray-500">Subtotal</p>
                <p class="text-xl font-bold tabular-nums" data-testid="sale-subtotal">{{ formatPeso(subtotal) }}</p>
              </div>
              <div class="rounded-xl bg-brand-50 py-3">
                <p class="text-xs uppercase text-brand-700">Profit</p>
                <p class="text-xl font-bold tabular-nums text-brand-700" data-testid="sale-profit">{{ formatPeso(profit) }}</p>
              </div>
            </div>

            <button
              type="button"
              class="mt-5 w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white active:bg-brand-700 disabled:opacity-50"
              :disabled="saving"
              data-testid="save-sale"
              @click="saveSale"
            >
              {{ saving ? 'Saving…' : 'Save Sale' }}
            </button>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
