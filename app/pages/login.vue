<script setup lang="ts">
import type { SessionResponse } from '~/types'

useHead({ title: 'Sign In' })

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { set } = useSession()
const route = useRoute()

// Preserve the page the user was headed to before auth.global.ts bounced them
// here, so signing in lands them back where they intended instead of always
// falling through to the role default.
const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
})

async function submit() {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<SessionResponse>('/api/auth/login', {
      method: 'POST',
      body: { username: username.value.trim(), password: password.value },
    })
    set(res)
    await navigateTo(redirectTarget.value ?? (res.user?.role === 'MEMBER' ? '/sales/new' : '/'))
  } catch (err: unknown) {
    error.value = apiErrorMessage(err, 'Incorrect username or password')
    password.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col justify-center bg-brand-700 px-6 text-white">
    <div class="mx-auto w-full max-w-sm">
      <div class="mb-8 text-center">
        <BrandMark :size="64" class="mx-auto mb-3" />
        <h1 class="text-2xl font-bold">Tindahan</h1>
        <p class="mt-1 text-brand-100">Sign in to your account</p>
      </div>

      <form class="space-y-4 rounded-[var(--radius-card)] bg-surface p-5 text-ink shadow-[var(--shadow-raised)]" @submit.prevent="submit">
        <AppField label="Username" for="username">
          <input
            id="username"
            v-model="username"
            name="username"
            type="text"
            autocomplete="username"
            autofocus
            class="field-input"
          />
        </AppField>
        <AppField label="Password" for="password">
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            class="field-input"
          />
        </AppField>

        <p v-if="error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{{ error }}</p>

        <AppButton type="submit" block size="lg" :loading="loading" :disabled="!username.trim() || !password">
          {{ loading ? 'Signing in' : 'Sign In' }}
        </AppButton>
      </form>
    </div>
  </div>
</template>
