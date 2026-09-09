<script setup lang="ts">
import { PhMagnifyingGlass, PhPackage, PhPlus } from '@phosphor-icons/vue'
import type { Product } from '~/types'

const toast = useToast()

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
  } catch (err: unknown) {
    toast.error(apiErrorMessage(err, 'Could not load inventory'))
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
        <NuxtLink to="/products/new" class="focus-ring absolute right-4 top-4 flex items-center gap-1 text-sm font-semibold text-brand-600">
          <PhPlus class="h-4 w-4" weight="bold" />
          Add Product
        </NuxtLink>
      </template>
    </PageHeader>

    <div class="space-y-3 px-4 py-4">
      <div class="relative">
        <PhMagnifyingGlass class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
        <input
          v-model="search"
          type="search"
          placeholder="Search inventory..."
          class="field-input field-input--with-leading-icon"
        />
      </div>

      <label class="flex items-center gap-2 text-sm text-ink-muted">
        <input v-model="lowStockOnly" type="checkbox" class="h-4 w-4 rounded border-line-strong text-brand-600 focus-ring" />
        Low stock only
      </label>

      <AppSkeleton v-if="loading" variant="list" />
      <AppEmpty v-else-if="!products.length" :icon="PhPackage" message="No products found." />

      <ul v-else class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <li v-for="(p, i) in products" :key="p.id" class="list-enter-item" :style="{ '--i': i }">
          <NuxtLink :to="`/products/${p.id}`" class="focus-ring flex items-center justify-between px-4 py-3 active:bg-neutral-50">
            <div>
              <p class="font-medium text-ink">{{ p.name }}<span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span></p>
              <p v-if="p.costPrice === null || p.sellingPrice === null" class="text-xs text-warn-600">Needs pricing</p>
            </div>
            <div class="text-right">
              <p class="font-semibold tabular-nums text-ink">{{ p.stock }}</p>
              <p class="text-xs" :class="status(p) === 'Low' ? 'text-danger-600' : 'text-ink-subtle'">{{ status(p) }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
