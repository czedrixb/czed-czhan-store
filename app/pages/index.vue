<script setup lang="ts">
import type { DashboardSummary } from '~/types'

const { data, refresh, pending } = await useFetch<DashboardSummary>('/api/dashboard/today')

onActivated(() => refresh())
</script>

<template>
  <div>
    <PageHeader title="Today's Summary" :subtitle="data ? formatDateLabel(data.date) : undefined" />

    <div class="space-y-6 px-4 py-4">
      <AppSkeleton v-if="pending && !data" variant="stat-grid" />

      <template v-else-if="data">
        <div class="grid grid-cols-2 gap-3">
          <StatTile label="Sales" :value="formatPeso(data.revenue)" tone="brand" />
          <StatTile label="Cost" :value="formatPeso(data.cost)" />
          <StatTile label="Profit" :value="formatPeso(data.profit)" tone="brand" />
          <StatTile label="Items Sold" :value="String(data.itemsSold)" />
        </div>
        <StatTile label="Transactions" :value="String(data.transactions)" />

        <section>
          <h2 class="mb-2 text-sm font-semibold text-ink-muted">Quick Actions</h2>
          <div class="grid grid-cols-2 gap-3">
            <NuxtLink to="/sales/new" class="press focus-ring rounded-[var(--radius-control)] bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white active:bg-brand-700">
              Add Sale
            </NuxtLink>
            <NuxtLink to="/inventory" class="press focus-ring rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink active:bg-neutral-50">
              View Inventory
            </NuxtLink>
            <NuxtLink to="/sales" class="press focus-ring rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink active:bg-neutral-50">
              Sales History
            </NuxtLink>
            <NuxtLink to="/inventory/count" class="press focus-ring rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-center text-sm font-semibold text-ink active:bg-neutral-50">
              Inventory Count
            </NuxtLink>
          </div>
        </section>

        <section v-if="data.lowStock.length">
          <h2 class="mb-2 text-sm font-semibold text-ink-muted">Low Stock</h2>
          <ul class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            <li
              v-for="(p, i) in data.lowStock"
              :key="p.id"
              class="list-enter-item flex items-center justify-between px-4 py-3"
              :style="{ '--i': i }"
            >
              <div>
                <p class="font-medium text-ink">{{ p.name }}<span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span></p>
                <p class="text-xs text-warn-600">{{ p.stock }} remaining</p>
              </div>
              <NuxtLink :to="`/products/${p.id}`" class="press focus-ring rounded-[var(--radius-control)] bg-warn-50 px-3 py-1.5 text-xs font-semibold text-warn-600">
                Restock
              </NuxtLink>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>
