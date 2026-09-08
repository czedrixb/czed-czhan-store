<script setup lang="ts">
import type { InventoryCountDetail } from '~/types'

const route = useRoute()
const id = Number(route.params.id)

const { data: count, refresh } = await useFetch<InventoryCountDetail>(`/api/counts/${id}`)
const completing = ref(false)
const savingItemId = ref<number | null>(null)

async function saveActual(itemId: number, value: number | null) {
  if (value === null || value < 0 || !Number.isInteger(value)) return
  savingItemId.value = itemId
  try {
    await $fetch(`/api/counts/${id}/items/${itemId}`, { method: 'PATCH', body: { actualQuantity: value } })
    await refresh()
  } finally {
    savingItemId.value = null
  }
}

async function completeCount() {
  completing.value = true
  try {
    await $fetch(`/api/counts/${id}/complete`, { method: 'POST' })
    await refresh()
  } finally {
    completing.value = false
  }
}

const isInProgress = computed(() => count.value?.status === 'IN_PROGRESS')
const countedItems = computed(() => count.value?.items.filter((i) => i.actualQuantity !== null).length ?? 0)
</script>

<template>
  <div v-if="count">
    <PageHeader title="Inventory Count" :subtitle="formatDateLabel(count.countDate)" />

    <div class="space-y-4 px-4 py-4">
      <div class="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
        <span>{{ countedItems }} / {{ count.items.length }} counted</span>
        <span
          class="rounded-full px-2 py-1 text-xs font-medium"
          :class="count.status === 'COMPLETED' ? 'bg-gray-200 text-gray-600' : 'bg-brand-50 text-brand-700'"
        >
          {{ count.status === 'COMPLETED' ? 'Completed' : 'In Progress' }}
        </span>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-gray-100 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">Product</th>
              <th class="px-3 py-2 text-right">Expected</th>
              <th class="px-3 py-2 text-right">Actual</th>
              <th class="px-3 py-2 text-right">Diff</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="item in count.items" :key="item.id">
              <td class="px-3 py-2">
                {{ item.productName }}<span v-if="item.productVariant" class="text-gray-500"> · {{ item.productVariant }}</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums">{{ item.expectedQuantity }}</td>
              <td class="px-3 py-2 text-right">
                <input
                  v-if="isInProgress"
                  type="number"
                  min="0"
                  class="w-16 rounded border border-gray-200 px-1 py-1 text-right tabular-nums"
                  :value="item.actualQuantity ?? ''"
                  :disabled="savingItemId === item.id"
                  data-testid="count-actual-input"
                  @change="saveActual(item.id, ($event.target as HTMLInputElement).valueAsNumber)"
                />
                <span v-else class="tabular-nums">{{ item.actualQuantity ?? '—' }}</span>
              </td>
              <td
                class="px-3 py-2 text-right tabular-nums font-medium"
                :class="{ 'text-danger-600': (item.difference ?? 0) < 0, 'text-brand-600': (item.difference ?? 0) > 0 }"
              >
                {{ item.difference ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        v-if="isInProgress"
        type="button"
        class="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="completing"
        data-testid="complete-count"
        @click="completeCount"
      >
        {{ completing ? 'Saving…' : 'Save Count & Apply Adjustments' }}
      </button>

      <a
        :href="`/api/export/count/${id}`"
        class="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-700"
      >
        Export to Excel
      </a>
    </div>
  </div>
</template>
