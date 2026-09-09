<script setup lang="ts">
import type { SessionResponse } from '~/types'

const { data: session } = await useFetch<SessionResponse>('/api/auth/session')
const forced = computed(() => Boolean(session.value?.user?.mustChangePassword))

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const mismatch = computed(() => Boolean(newPassword.value && confirmPassword.value && newPassword.value !== confirmPassword.value))
const canSubmit = computed(
  () => currentPassword.value.length > 0 && newPassword.value.length >= 6 && newPassword.value === confirmPassword.value,
)

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/account/password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    })
    await navigateTo(forced.value ? '/' : '/settings')
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Could not change password'
    currentPassword.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="forced" class="flex min-h-screen flex-col justify-center bg-brand-700 px-6 text-white">
    <div class="mx-auto w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold">Set your password</h1>
        <p class="mt-1 text-brand-100">Choose your own password before using the store app.</p>
      </div>

      <form class="space-y-4 rounded-2xl bg-white p-5 text-gray-900 shadow-xl" @submit.prevent="submit">
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Current (temporary) password</span>
          <input v-model="currentPassword" data-testid="current-password" type="password" autocomplete="current-password" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base" />
        </label>
        <label class="block text-sm font-medium">
          <span class="text-gray-700">New password</span>
          <input v-model="newPassword" data-testid="new-password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base" />
        </label>
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Confirm new password</span>
          <input v-model="confirmPassword" data-testid="confirm-password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base" />
        </label>

        <p v-if="mismatch" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">Those passwords do not match</p>
        <p v-if="error" data-testid="password-error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{{ error }}</p>

        <button type="submit" data-testid="submit-password" class="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-50" :disabled="!canSubmit || loading">
          {{ loading ? 'Saving…' : 'Set Password' }}
        </button>
      </form>
    </div>
  </div>

  <div v-else>
    <PageHeader title="Change Password" />
    <div class="px-4 py-4">
      <form class="space-y-4 rounded-2xl border border-gray-100 bg-white p-4" @submit.prevent="submit">
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Current password</span>
          <input v-model="currentPassword" data-testid="current-password" type="password" autocomplete="current-password" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
        <label class="block text-sm font-medium">
          <span class="text-gray-700">New password</span>
          <input v-model="newPassword" data-testid="new-password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Confirm new password</span>
          <input v-model="confirmPassword" data-testid="confirm-password" type="password" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </label>

        <p v-if="mismatch" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">Those passwords do not match</p>
        <p v-if="error" data-testid="password-error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{{ error }}</p>

        <button type="submit" data-testid="submit-password" class="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="!canSubmit || loading">
          {{ loading ? 'Saving…' : 'Change Password' }}
        </button>
        <NuxtLink to="/settings" class="block text-center text-sm font-medium text-gray-500">Cancel</NuxtLink>
      </form>
    </div>
  </div>
</template>
