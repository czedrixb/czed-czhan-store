<script setup lang="ts">
import type { DashboardSummary } from '~/types'

const { data, refresh, pending } = await useFetch<DashboardSummary>('/api/dashboard/today')

onActivated(() => refresh())
</script>

<template>
  <div>
    <PageHeader title="Today's Summary" :subtitle="data ? formatDateLabel(data.date) : undefined" />

    <div class="space-y-6 px-4 py-4">
      <div v-if="pending && !data" class="py-12 text-center text-gray-400">Loading…</div>

      <template v-else-if="data">
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Sales" :value="formatPeso(data.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(data.cost)" />
          <StatTile label="Profit" :value="formatPeso(data.profit)" tone="brand" />
          <StatTile label="Items Sold" :value="String(data.itemsSold)" />
        </div>
        <StatTile label="Transactions" :value="String(data.transactions)" />

        <section>
          <h2 class="mb-2 text-sm font-semibold text-gray-700">Quick Actions</h2>
          <div class="grid grid-cols-2 gap-3">
            <NuxtLink to="/sales/new" class="rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white active:bg-brand-700">
              Add Sale
            </NuxtLink>
            <NuxtLink to="/inventory" class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 active:bg-gray-50">
              View Inventory
            </NuxtLink>
            <NuxtLink to="/sales" class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 active:bg-gray-50">
              Sales History
            </NuxtLink>
            <NuxtLink to="/inventory/count" class="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 active:bg-gray-50">
              Inventory Count
            </NuxtLink>
          </div>
        </section>

        <section v-if="data.lowStock.length">
          <h2 class="mb-2 text-sm font-semibold text-gray-700">Low Stock</h2>
          <ul class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
            <li v-for="p in data.lowStock" :key="p.id" class="flex items-center justify-between px-4 py-3">
              <div>
                <p class="font-medium text-gray-900">{{ p.name }}<span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span></p>
                <p class="text-xs text-warn-600">{{ p.stock }} remaining</p>
              </div>
              <NuxtLink :to="`/products/${p.id}`" class="rounded-lg bg-warn-50 px-3 py-1.5 text-xs font-semibold text-warn-600">
                Restock
              </NuxtLink>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>
