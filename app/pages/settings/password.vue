<script setup lang="ts">
import type { SessionResponse } from '~/types'

const { data: session } = await useFetch<SessionResponse>('/api/auth/session')
const forced = computed(() => Boolean(session.value?.user?.mustChangePassword))
const toast = useToast()

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
    toast.success('Password changed.')
    await navigateTo(forced.value ? '/' : '/settings')
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Could not change password')
    error.value = message
    toast.error(message)
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

      <form class="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 text-ink shadow-[var(--shadow-raised)]" @submit.prevent="submit">
        <AppField label="Current (temporary) password" for="current-password">
          <input id="current-password" v-model="currentPassword" data-testid="current-password" type="password" autocomplete="current-password" class="field-input" />
        </AppField>
        <AppField label="New password" for="new-password">
          <input id="new-password" v-model="newPassword" data-testid="new-password" type="password" autocomplete="new-password" class="field-input" />
        </AppField>
        <AppField label="Confirm new password" for="confirm-password">
          <input id="confirm-password" v-model="confirmPassword" data-testid="confirm-password" type="password" autocomplete="new-password" class="field-input" />
        </AppField>

        <p v-if="mismatch" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">Those passwords do not match</p>
        <p v-if="error" data-testid="password-error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{{ error }}</p>

        <AppButton type="submit" block size="lg" data-testid="submit-password" :loading="loading" :disabled="!canSubmit">
          {{ loading ? 'Saving' : 'Set Password' }}
        </AppButton>
      </form>
    </div>
  </div>

  <div v-else>
    <PageHeader title="Change Password" />
    <div class="px-4 py-4">
      <form class="space-y-4 rounded-[var(--radius-card)] border border-line bg-surface p-4" @submit.prevent="submit">
        <AppField label="Current password" for="current-password">
          <input id="current-password" v-model="currentPassword" data-testid="current-password" type="password" autocomplete="current-password" class="field-input text-sm" />
        </AppField>
        <AppField label="New password" for="new-password">
          <input id="new-password" v-model="newPassword" data-testid="new-password" type="password" autocomplete="new-password" class="field-input text-sm" />
        </AppField>
        <AppField label="Confirm new password" for="confirm-password">
          <input id="confirm-password" v-model="confirmPassword" data-testid="confirm-password" type="password" autocomplete="new-password" class="field-input text-sm" />
        </AppField>

        <p v-if="mismatch" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">Those passwords do not match</p>
        <p v-if="error" data-testid="password-error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600">{{ error }}</p>

        <AppButton type="submit" block size="sm" data-testid="submit-password" :loading="loading" :disabled="!canSubmit">
          {{ loading ? 'Saving' : 'Change Password' }}
        </AppButton>
        <NuxtLink to="/settings" class="focus-ring block text-center text-sm font-medium text-ink-subtle">Cancel</NuxtLink>
      </form>
    </div>
  </div>
</template>
