<script setup lang="ts">
import type { Product } from '~/types'

const route = useRoute()
const id = Number(route.params.id)

const { data: product, refresh } = await useFetch<Product>(`/api/products/${id}`)

const name = ref('')
const variant = ref('')
const costPesos = ref<number | null>(null)
const sellingPesos = ref<number | null>(null)
const lowStockThreshold = ref(5)
const savingDetails = ref(false)
const message = ref('')

function syncForm() {
  if (!product.value) return
  name.value = product.value.name
  variant.value = product.value.variant
  costPesos.value = product.value.costPrice === null ? null : centavosToPesos(product.value.costPrice)
  sellingPesos.value = product.value.sellingPrice === null ? null : centavosToPesos(product.value.sellingPrice)
  lowStockThreshold.value = product.value.lowStockThreshold
}
watch(product, syncForm, { immediate: true })

async function saveDetails() {
  savingDetails.value = true
  message.value = ''
  try {
    await $fetch(`/api/products/${id}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        variant: variant.value,
        costPrice: costPesos.value === null ? null : pesosToCentavos(costPesos.value),
        sellingPrice: sellingPesos.value === null ? null : pesosToCentavos(sellingPesos.value),
        lowStockThreshold: lowStockThreshold.value,
      },
    })
    await refresh()
    message.value = 'Saved.'
  } catch (err: unknown) {
    message.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not save'
  } finally {
    savingDetails.value = false
  }
}

// Restock
const restockQty = ref<number | null>(null)
const restocking = ref(false)
async function restock() {
  if (!restockQty.value || restockQty.value <= 0) return
  restocking.value = true
  try {
    await $fetch(`/api/products/${id}/restock`, { method: 'POST', body: { quantity: restockQty.value } })
    restockQty.value = null
    await refresh()
    message.value = 'Stock received.'
  } finally {
    restocking.value = false
  }
}

// Adjustment
const adjustType = ref<'DAMAGE' | 'EXPIRED' | 'MISSING' | 'ADJUSTMENT'>('DAMAGE')
const adjustQty = ref<number | null>(null)
const adjustReason = ref('')
const adjusting = ref(false)
async function adjust() {
  if (!adjustQty.value || adjustQty.value === 0 || !adjustReason.value.trim()) return
  adjusting.value = true
  try {
    const delta = adjustType.value === 'ADJUSTMENT' ? adjustQty.value : -Math.abs(adjustQty.value)
    await $fetch(`/api/products/${id}/adjust`, {
      method: 'POST',
      body: { type: adjustType.value, delta, reason: adjustReason.value.trim() },
    })
    adjustQty.value = null
    adjustReason.value = ''
    await refresh()
    message.value = 'Adjustment recorded.'
  } finally {
    adjusting.value = false
  }
}

async function deactivate() {
  await $fetch(`/api/products/${id}`, { method: 'DELETE' })
  await navigateTo('/inventory')
}
</script>

<template>
  <div v-if="product">
    <PageHeader :title="product.name" :subtitle="product.variant || undefined" />

    <div class="space-y-6 px-4 py-4">
      <p v-if="message" class="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{{ message }}</p>

      <section class="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Details</h2>
        <div class="space-y-3">
          <label class="block text-sm">
            <span class="text-gray-600">Product Name</span>
            <input v-model="name" type="text" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
          </label>
          <label class="block text-sm">
            <span class="text-gray-600">Variant</span>
            <input v-model="variant" type="text" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block text-sm">
              <span class="text-gray-600">Cost Price (₱)</span>
              <input v-model.number="costPesos" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
            </label>
            <label class="block text-sm">
              <span class="text-gray-600">Selling Price (₱)</span>
              <input v-model.number="sellingPesos" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
            </label>
          </div>
          <label class="block text-sm">
            <span class="text-gray-600">Low Stock Threshold</span>
            <input v-model.number="lowStockThreshold" type="number" min="0" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
          </label>
          <button
            type="button"
            class="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="savingDetails"
            @click="saveDetails"
          >
            {{ savingDetails ? 'Saving…' : 'Save Details' }}
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 class="mb-1 text-sm font-semibold text-gray-700">Current Stock</h2>
        <p class="text-3xl font-bold tabular-nums text-gray-900">{{ product.stock }}</p>
      </section>

      <section class="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Receive Stock</h2>
        <div class="flex gap-2">
          <input v-model.number="restockQty" type="number" min="1" placeholder="Quantity received" class="flex-1 rounded-lg border border-gray-200 px-3 py-2" />
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="restocking || !restockQty"
            @click="restock"
          >
            + Add
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Inventory Adjustment</h2>
        <div class="space-y-2">
          <select v-model="adjustType" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="DAMAGE">Damaged</option>
            <option value="EXPIRED">Expired</option>
            <option value="MISSING">Missing</option>
            <option value="ADJUSTMENT">Manual Adjustment (+/-)</option>
          </select>
          <input
            v-model.number="adjustQty"
            type="number"
            :placeholder="adjustType === 'ADJUSTMENT' ? 'Change (e.g. -2 or 3)' : 'Quantity'"
            class="w-full rounded-lg border border-gray-200 px-3 py-2"
          />
          <input v-model="adjustReason" type="text" placeholder="Reason" class="w-full rounded-lg border border-gray-200 px-3 py-2" />
          <button
            type="button"
            class="w-full rounded-xl bg-gray-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="adjusting"
            @click="adjust"
          >
            Save Adjustment
          </button>
        </div>
      </section>

      <button type="button" class="w-full py-2 text-sm font-medium text-danger-600" @click="deactivate">
        Deactivate Product
      </button>
    </div>
  </div>
</template>
