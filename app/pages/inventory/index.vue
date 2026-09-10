<script setup lang="ts">
import { PhMagnifyingGlass, PhPackage, PhPlus } from '@phosphor-icons/vue'
import type { Product } from '~/types'

const toast = useToast()

const search = ref('')
const lowStockOnly = ref(false)
const products = ref<Product[]>([])
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
let latestRequest = 0

async function load() {
  const requestId = ++latestRequest
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = ''
  try {
    const result = await $fetch<Product[]>('/api/products', {
      signal: controller.signal,
      query: {
        active: 'true',
        q: search.value.trim() || undefined,
        lowStock: lowStockOnly.value ? 'true' : undefined,
      },
    })
    if (requestId === latestRequest) products.value = result
  } catch (err: unknown) {
    if (requestId !== latestRequest || (err instanceof DOMException && err.name === 'AbortError')) return
    error.value = apiErrorMessage(err, 'Could not load inventory')
    toast.error(error.value)
  } finally {
    if (requestId === latestRequest) loading.value = false
  }
}

watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 200)
})
watch(lowStockOnly, load)
onMounted(load)
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})

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
      <div class="sticky-search -mx-4 space-y-3 border-b border-line bg-surface-sunken px-4 pb-3">
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
      </div>

      <AppSkeleton v-if="loading" variant="list" />
      <div v-else-if="error" class="space-y-2 rounded-[var(--radius-card)] border border-danger-200 bg-danger-50 p-4 text-sm text-danger-600">
        <p>{{ error }}</p>
        <AppButton size="sm" variant="secondary" @click="load">Try again</AppButton>
      </div>
      <AppEmpty v-else-if="!products.length" :icon="PhPackage" message="No products found." />

      <ul v-else class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <li v-for="(p, i) in products" :key="p.id" class="list-enter-item" :style="{ '--i': i }">
          <NuxtLink
            :to="`/products/${p.id}`"
            class="focus-ring relative z-10 flex touch-manipulation items-center justify-between px-4 py-3 active:bg-neutral-50"
            @touchend.prevent="navigateTo(`/products/${p.id}`)"
          >
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
