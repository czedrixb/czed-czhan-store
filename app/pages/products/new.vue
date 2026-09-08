<script setup lang="ts">
const name = ref('')
const variant = ref('')
const costPesos = ref<number | null>(null)
const sellingPesos = ref<number | null>(null)
const stock = ref(0)
const lowStockThreshold = ref(5)
const saving = ref(false)
const error = ref('')

async function save() {
  if (!name.value.trim()) return
  saving.value = true
  error.value = ''
  try {
    const created = await $fetch<{ id: number }>('/api/products', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        variant: variant.value.trim(),
        costPrice: costPesos.value === null ? null : pesosToCentavos(costPesos.value),
        sellingPrice: sellingPesos.value === null ? null : pesosToCentavos(sellingPesos.value),
        stock: stock.value,
        lowStockThreshold: lowStockThreshold.value,
      },
    })
    await navigateTo(`/products/${created.id}`)
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not create product'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Add Product" />

    <div class="space-y-3 px-4 py-4">
      <p v-if="error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{{ error }}</p>

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
      <div class="grid grid-cols-2 gap-3">
        <label class="block text-sm">
          <span class="text-gray-600">Starting Stock</span>
          <input v-model.number="stock" type="number" min="0" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
        </label>
        <label class="block text-sm">
          <span class="text-gray-600">Low Stock Threshold</span>
          <input v-model.number="lowStockThreshold" type="number" min="0" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2" />
        </label>
      </div>

      <button
        type="button"
        class="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="saving || !name.trim()"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save Product' }}
      </button>
    </div>
  </div>
</template>
