<script setup lang="ts">
import type { StoreUser, UserRole } from '~/types'

definePageMeta({ middleware: 'admin' })

const { data: session } = await useFetch<{ authenticated: boolean; user: { id: number } | null }>('/api/auth/session')
const { data: users, refresh } = await useFetch<StoreUser[]>('/api/users')

const message = ref('')
const error = ref('')
const busy = ref(false)

const showAddForm = ref(false)
const form = reactive({ displayName: '', username: '', password: '', role: 'MEMBER' as UserRole })

const openId = ref<number | null>(null)
const resetOpenId = ref<number | null>(null)
const resetPassword = ref('')
const editOpenId = ref<number | null>(null)
const editForm = reactive({ displayName: '', username: '' })

const myId = computed(() => session.value?.user?.id)
const activeAdminCount = computed(() => users.value?.filter((u) => u.role === 'ADMIN' && u.isActive).length ?? 0)
const sorted = computed(() => [...(users.value ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive)))

function isLastActiveAdmin(u: StoreUser) {
  return u.role === 'ADMIN' && u.isActive && activeAdminCount.value <= 1
}

async function run(fn: () => Promise<unknown>, ok: string) {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    await fn()
    await refresh()
    message.value = ok
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not save'
  } finally {
    busy.value = false
  }
}

function createUser() {
  return run(async () => {
    await $fetch('/api/users', { method: 'POST', body: { ...form } })
    Object.assign(form, { displayName: '', username: '', password: '', role: 'MEMBER' })
    showAddForm.value = false
  }, 'Account created. Share the temporary password with them.')
}

function setRole(u: StoreUser, role: UserRole) {
  return run(() => $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { role } }), 'Role updated.')
}

function setActive(u: StoreUser, isActive: boolean) {
  openId.value = null
  return run(
    () => $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { isActive } }),
    isActive ? 'Account reactivated.' : 'Account deactivated.',
  )
}

function submitReset(u: StoreUser) {
  return run(async () => {
    await $fetch(`/api/users/${u.id}/reset-password`, { method: 'POST', body: { password: resetPassword.value } })
    resetPassword.value = ''
    resetOpenId.value = null
  }, 'Access reset. Share the new temporary password with them.')
}

function toggleEdit(u: StoreUser) {
  editOpenId.value = editOpenId.value === u.id ? null : u.id
  if (editOpenId.value === u.id) Object.assign(editForm, { displayName: u.displayName, username: u.username })
}

function submitEdit(u: StoreUser) {
  return run(async () => {
    await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { displayName: editForm.displayName, username: editForm.username } })
    editOpenId.value = null
  }, 'Account updated.')
}
</script>

<template>
  <div data-testid="users-page">
    <PageHeader title="Users" subtitle="Who can use the store app" />

    <div class="space-y-4 px-4 py-4">
      <p v-if="message" data-testid="users-message" class="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{{ message }}</p>
      <p v-if="error" data-testid="users-error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{{ error }}</p>

      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-700">Accounts</h2>
          <button type="button" data-testid="add-user-toggle" class="text-sm font-semibold text-brand-600" @click="showAddForm = !showAddForm">
            {{ showAddForm ? 'Cancel' : '+ Add' }}
          </button>
        </div>

        <div v-if="showAddForm" class="space-y-3 rounded-2xl border border-gray-100 bg-white p-4">
          <input v-model="form.displayName" data-testid="new-user-display-name" type="text" placeholder="Display name" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input v-model="form.username" data-testid="new-user-username" type="text" placeholder="Username" autocomplete="off" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input v-model="form.password" data-testid="new-user-password" type="password" placeholder="Temporary password (at least 6 characters)" autocomplete="new-password" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <select v-model="form.role" data-testid="new-user-role" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <p class="text-xs text-gray-500">They must change this password the first time they sign in.</p>
          <button
            type="button"
            data-testid="create-user"
            class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="busy || !form.displayName || !form.username || form.password.length < 6"
            @click="createUser"
          >
            {{ busy ? 'Creating…' : 'Create Account' }}
          </button>
        </div>

        <ul class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          <li v-for="u in sorted" :key="u.id" :data-testid="`user-row-${u.username}`" class="px-4 py-3" :class="u.isActive ? '' : 'opacity-60'">
            <button
              type="button"
              class="flex w-full items-start justify-between gap-3 text-left"
              :data-testid="`user-actions-toggle-${u.username}`"
              @click="openId = openId === u.id ? null : u.id"
            >
              <div>
                <p class="text-sm font-medium text-gray-900">{{ u.displayName }}</p>
                <p class="text-xs text-gray-500">@{{ u.username }}</p>
              </div>
              <div class="flex shrink-0 flex-wrap justify-end gap-1">
                <span
                  :data-testid="`user-role-${u.username}`"
                  class="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold tracking-wide"
                  :class="u.role === 'ADMIN' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'"
                >{{ u.role }}</span>
                <span v-if="!u.isActive" :data-testid="`user-status-${u.username}`" class="whitespace-nowrap rounded-full bg-danger-50 px-2 py-1 text-[10px] font-bold tracking-wide text-danger-600">INACTIVE</span>
                <span v-else-if="u.mustChangePassword" :data-testid="`user-temp-${u.username}`" class="whitespace-nowrap rounded-full bg-warn-50 px-2 py-1 text-[10px] font-bold tracking-wide text-warn-600">TEMP PASSWORD</span>
              </div>
            </button>

            <div v-if="openId === u.id" class="mt-3 space-y-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                data-testid="user-edit-toggle"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700"
                :disabled="busy"
                @click="toggleEdit(u)"
              >Edit Account</button>
              <div v-if="editOpenId === u.id" class="space-y-2">
                <input v-model="editForm.displayName" data-testid="user-edit-display-name" type="text" placeholder="Display name" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <input v-model="editForm.username" data-testid="user-edit-username" type="text" placeholder="Username" autocomplete="off" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <button
                  type="button"
                  data-testid="user-edit-submit"
                  class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="busy || !editForm.displayName || !editForm.username"
                  @click="submitEdit(u)"
                >Save Changes</button>
              </div>

              <button
                v-if="u.role === 'MEMBER'"
                type="button"
                data-testid="user-make-admin"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700"
                :disabled="busy"
                @click="setRole(u, 'ADMIN')"
              >Make Admin</button>
              <button
                v-else
                type="button"
                data-testid="user-make-member"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
                :disabled="busy || isLastActiveAdmin(u)"
                @click="setRole(u, 'MEMBER')"
              >Make Member</button>

              <button
                type="button"
                data-testid="user-reset-toggle"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700"
                :disabled="busy || u.id === myId"
                @click="resetOpenId = resetOpenId === u.id ? null : u.id"
              >Reset Access</button>
              <div v-if="resetOpenId === u.id" class="space-y-2">
                <input v-model="resetPassword" data-testid="user-reset-password-input" type="password" placeholder="New temporary password" autocomplete="new-password" class="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                <button
                  type="button"
                  data-testid="user-reset-submit"
                  class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  :disabled="busy || resetPassword.length < 6"
                  @click="submitReset(u)"
                >Reset Password</button>
              </div>

              <button
                v-if="u.isActive"
                type="button"
                data-testid="user-deactivate"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-danger-600 disabled:opacity-50"
                :disabled="busy || isLastActiveAdmin(u)"
                @click="setActive(u, false)"
              >Deactivate</button>
              <button
                v-else
                type="button"
                data-testid="user-reactivate"
                class="block w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-brand-600"
                :disabled="busy"
                @click="setActive(u, true)"
              >Reactivate</button>
            </div>
          </li>
        </ul>

        <p class="text-xs text-gray-500">Deactivating keeps the person's past activity in the audit log.</p>
      </section>
    </div>
  </div>
</template>
