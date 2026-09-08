<script setup lang="ts">
import type { InventoryCount } from '~/types'

const counts = ref<InventoryCount[]>([])
const starting = ref(false)

async function load() {
  counts.value = await $fetch<InventoryCount[]>('/api/counts')
}
onMounted(load)

async function startCount() {
  starting.value = true
  try {
    const created = await $fetch<InventoryCount>('/api/counts', { method: 'POST' })
    await navigateTo(`/inventory/count/${created.id}`)
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Inventory Count" />

    <div class="space-y-4 px-4 py-4">
      <button
        type="button"
        class="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="starting"
        @click="startCount"
      >
        {{ starting ? 'Starting…' : '+ Start New Count' }}
      </button>

      <ul v-if="counts.length" class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
        <li v-for="c in counts" :key="c.id">
          <NuxtLink :to="`/inventory/count/${c.id}`" class="flex items-center justify-between px-4 py-3 active:bg-gray-50">
            <div>
              <p class="font-medium text-gray-900">{{ formatDateLabel(c.countDate) }}</p>
              <p class="text-xs text-gray-400">{{ c.status === 'COMPLETED' ? 'Completed' : 'In progress' }}</p>
            </div>
            <span
              class="rounded-full px-2 py-1 text-xs font-medium"
              :class="c.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-brand-50 text-brand-700'"
            >
              {{ c.status === 'COMPLETED' ? 'Done' : 'Open' }}
            </span>
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="py-12 text-center text-gray-400">No inventory counts yet.</p>
    </div>
  </div>
</template>
