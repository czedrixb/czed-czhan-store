<script setup lang="ts">
import type { ImportPreview } from '~/types'

interface Account {
  id: number
  username: string
  displayName: string
  isActive: boolean
}

const { data: session } = await useFetch<{ authenticated: boolean; user: Account | null }>('/api/auth/session')
const { data: accounts, refresh: refreshAccounts } = await useFetch<Account[]>('/api/users')
const showAccountForm = ref(false)
const accountForm = reactive({ displayName: '', username: '', password: '' })
const accountError = ref('')
const creatingAccount = ref(false)

async function createAccount() {
  creatingAccount.value = true
  accountError.value = ''
  try {
    await $fetch('/api/users', { method: 'POST', body: accountForm })
    Object.assign(accountForm, { displayName: '', username: '', password: '' })
    showAccountForm.value = false
    await refreshAccounts()
  } catch (err: unknown) {
    accountError.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not create account'
  } finally {
    creatingAccount.value = false
  }
}

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const preview = ref<ImportPreview | null>(null)
const committing = ref(false)
const result = ref<{ created: number; updated: number; skipped: number } | null>(null)
const error = ref('')

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  result.value = null
  try {
    const formData = new FormData()
    formData.append('file', file)
    preview.value = await $fetch<ImportPreview>('/api/import/excel', { method: 'POST', body: formData })
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not read file'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function commitImport() {
  if (!preview.value) return
  committing.value = true
  error.value = ''
  try {
    result.value = await $fetch('/api/import/commit', { method: 'POST', body: { rows: preview.value.rows } })
    preview.value = null
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Import failed'
  } finally {
    committing.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <PageHeader title="More" />

    <div class="space-y-6 px-4 py-4">
      <section class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700">Account</h2>
        <div class="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p class="text-sm font-medium text-gray-900">{{ session?.user?.displayName }}</p>
          <p class="text-xs text-gray-500">@{{ session?.user?.username }}</p>
        </div>
        <NuxtLink to="/settings/audit" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
          <span>View Audit Log</span><span aria-hidden="true" class="text-gray-400">›</span>
        </NuxtLink>
      </section>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">Store Accounts</h2>
          <button type="button" class="text-sm font-semibold text-brand-600" @click="showAccountForm = !showAccountForm">{{ showAccountForm ? 'Cancel' : '+ Add' }}</button>
        </div>
        <div v-if="showAccountForm" class="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <input v-model="accountForm.displayName" type="text" placeholder="Display name" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input v-model="accountForm.username" type="text" placeholder="Username" autocomplete="off" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input v-model="accountForm.password" type="password" placeholder="Password (at least 6 characters)" autocomplete="new-password" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <p v-if="accountError" class="text-sm text-danger-600">{{ accountError }}</p>
          <button type="button" class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="creatingAccount || !accountForm.displayName || !accountForm.username || accountForm.password.length < 6" @click="createAccount">
            {{ creatingAccount ? 'Creating…' : 'Create Account' }}
          </button>
        </div>
        <ul class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
          <li v-for="account in accounts" :key="account.id" class="px-4 py-3">
            <p class="text-sm font-medium text-gray-900">{{ account.displayName }}</p>
            <p class="text-xs text-gray-500">@{{ account.username }}</p>
          </li>
        </ul>
      </section>

      <section class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700">Products</h2>
        <NuxtLink to="/products/new" class="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
          Add Product
        </NuxtLink>
        <NuxtLink to="/products/pricing" class="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
          Needs Pricing Queue
        </NuxtLink>
      </section>

      <section class="space-y-2">
        <h2 class="text-sm font-semibold text-gray-700">Excel</h2>

        <a href="/api/export/inventory" class="block rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
          Export Current Inventory
        </a>

        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-sm font-medium text-gray-700">Import Inventory Spreadsheet</p>
          <p class="mt-1 text-xs text-gray-500">
            Upload the store's Excel inventory. New products are created; existing products (matched by name + variant) have their stock reconciled.
          </p>
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx"
            class="mt-3 block w-full text-sm"
            data-testid="import-file-input"
            @change="onFileChange"
          />

          <p v-if="uploading" class="mt-2 text-sm text-gray-400">Reading file…</p>
          <p v-if="error" class="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{{ error }}</p>

          <div v-if="preview" class="mt-3 space-y-2 rounded-lg bg-gray-50 p-3 text-sm" data-testid="import-preview">
            <p>{{ preview.totalRows }} rows found — {{ preview.toCreate }} new, {{ preview.toUpdate }} to update.</p>
            <p v-if="!preview.hasPrices" class="text-warn-600">No prices found in this file — imported products will need pricing.</p>
            <button
              type="button"
              class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="committing"
              data-testid="confirm-import"
              @click="commitImport"
            >
              {{ committing ? 'Importing…' : 'Confirm Import' }}
            </button>
          </div>

          <p v-if="result" class="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700" data-testid="import-result">
            Created {{ result.created }}, updated {{ result.updated }}, skipped {{ result.skipped }}.
          </p>
        </div>
      </section>

      <section>
        <button type="button" class="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-danger-600" @click="logout">
          Log Out
        </button>
      </section>
    </div>
  </div>
</template>
