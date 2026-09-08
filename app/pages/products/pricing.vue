<script setup lang="ts">
import type { Product } from '~/types'

const products = ref<Product[]>([])
const drafts = reactive<Record<number, { cost: number | null; selling: number | null }>>({})
const savingId = ref<number | null>(null)

async function load() {
  const rows = await $fetch<Product[]>('/api/products', { query: { needsPricing: 'true', active: 'true' } })
  products.value = rows
  for (const p of rows) {
    drafts[p.id] = { cost: null, selling: null }
  }
}
onMounted(load)

async function save(product: Product) {
  const draft = drafts[product.id]
  if (draft.cost === null || draft.selling === null) return
  savingId.value = product.id
  try {
    await $fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      body: {
        costPrice: pesosToCentavos(draft.cost),
        sellingPrice: pesosToCentavos(draft.selling),
      },
    })
    products.value = products.value.filter((p) => p.id !== product.id)
  } finally {
    savingId.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader title="Needs Pricing" :subtitle="`${products.length} product${products.length === 1 ? '' : 's'}`" />

    <div class="px-4 py-4">
      <p v-if="!products.length" class="py-12 text-center text-gray-400">All products are priced.</p>

      <ul v-else class="space-y-3">
        <li v-for="p in products" :key="p.id" class="rounded-2xl border border-gray-100 bg-white p-4">
          <p class="font-medium text-gray-900">{{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></p>
          <p class="text-xs text-gray-400">Stock: {{ p.stock }}</p>
          <div class="mt-2 flex gap-2">
            <input
              v-model.number="drafts[p.id].cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="Cost ₱"
              class="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <input
              v-model.number="drafts[p.id].selling"
              type="number"
              min="0"
              step="0.01"
              placeholder="Sell ₱"
              class="w-24 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              class="flex-1 rounded-lg bg-brand-600 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="drafts[p.id].cost === null || drafts[p.id].selling === null || savingId === p.id"
              @click="save(p)"
            >
              Save
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
