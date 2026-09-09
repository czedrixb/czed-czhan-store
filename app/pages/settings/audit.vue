<script setup lang="ts">
definePageMeta({ middleware: 'admin' })

interface AuditEntry {
  id: number
  action: string
  entityType: string
  entityId: string | null
  description: string
  createdAt: string
  username: string
  displayName: string
}

const { data: entries, status } = await useFetch<AuditEntry[]>('/api/audit')

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
</script>

<template>
  <div>
    <PageHeader title="Audit Log" subtitle="Who did what, and when" />
    <div class="px-4 py-4">
      <p v-if="status === 'pending'" class="py-12 text-center text-gray-400">Loading…</p>
      <p v-else-if="!entries?.length" class="py-12 text-center text-gray-400">No activity recorded yet.</p>
      <ol v-else class="space-y-3" data-testid="audit-log">
        <li v-for="entry in entries" :key="entry.id" class="rounded-2xl border border-gray-100 bg-white p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium text-gray-900">{{ entry.description }}</p>
              <p class="mt-1 text-sm font-semibold text-brand-700" data-testid="audit-actor">
                {{ entry.displayName }} <span class="font-normal text-gray-500">@{{ entry.username }}</span>
              </p>
            </div>
            <span class="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold tracking-wide text-gray-600">{{ entry.action }}</span>
          </div>
          <time class="mt-2 block text-xs text-gray-400" :datetime="entry.createdAt">{{ formatTime(entry.createdAt) }}</time>
        </li>
      </ol>
    </div>
  </div>
</template>
