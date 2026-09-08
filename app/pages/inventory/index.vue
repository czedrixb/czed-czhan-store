<script setup lang="ts">
import type { Product } from '~/types'

const search = ref('')
const lowStockOnly = ref(false)
const products = ref<Product[]>([])
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  loading.value = true
  try {
    products.value = await $fetch<Product[]>('/api/products', {
      query: {
        active: 'true',
        q: search.value.trim() || undefined,
        lowStock: lowStockOnly.value ? 'true' : undefined,
      },
    })
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 200)
})
watch(lowStockOnly, load)
onMounted(load)

function status(p: Product) {
  return p.stock <= p.lowStockThreshold ? 'Low' : 'Normal'
}
</script>

<template>
  <div>
    <PageHeader title="Inventory">
      <template #actions>
        <NuxtLink to="/products/new" class="absolute right-4 top-4 text-sm font-semibold text-brand-600">+ Add Product</NuxtLink>
      </template>
    </PageHeader>

    <div class="space-y-3 px-4 py-4">
      <input
        v-model="search"
        type="search"
        placeholder="Search inventory..."
        class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
      />

      <label class="flex items-center gap-2 text-sm text-gray-600">
        <input v-model="lowStockOnly" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
        Low stock only
      </label>

      <div v-if="loading" class="py-12 text-center text-gray-400">Loading…</div>
      <p v-else-if="!products.length" class="py-12 text-center text-gray-400">No products found.</p>

      <ul v-else class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
        <li v-for="p in products" :key="p.id">
          <NuxtLink :to="`/products/${p.id}`" class="flex items-center justify-between px-4 py-3 active:bg-gray-50">
            <div>
              <p class="font-medium text-gray-900">{{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></p>
              <p v-if="p.costPrice === null || p.sellingPrice === null" class="text-xs text-warn-600">Needs pricing</p>
            </div>
            <div class="text-right">
              <p class="font-semibold tabular-nums text-gray-900">{{ p.stock }}</p>
              <p class="text-xs" :class="status(p) === 'Low' ? 'text-danger-600' : 'text-gray-400'">{{ status(p) }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
