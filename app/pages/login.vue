<script setup lang="ts">
import type { SessionResponse } from '~/types'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  if (!username.value.trim() || !password.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<SessionResponse>('/api/auth/login', {
      method: 'POST',
      body: { username: username.value.trim(), password: password.value },
    })
    await navigateTo(res.user?.role === 'MEMBER' ? '/sales/new' : '/')
  } catch (err: unknown) {
    error.value = (err as { data?: { statusMessage?: string } })?.data?.statusMessage || 'Incorrect username or password'
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
        <h1 class="text-2xl font-bold">Sari-Sari Store</h1>
        <p class="mt-1 text-brand-100">Sign in to your account</p>
      </div>

      <form class="space-y-4 rounded-2xl bg-white p-5 text-gray-900 shadow-xl" @submit.prevent="submit">
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Username</span>
          <input v-model="username" name="username" type="text" autocomplete="username" autofocus class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base" />
        </label>
        <label class="block text-sm font-medium">
          <span class="text-gray-700">Password</span>
          <input v-model="password" name="password" type="password" autocomplete="current-password" class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-base" />
        </label>

        <p v-if="error" class="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{{ error }}</p>

        <button type="submit" class="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white disabled:opacity-50" :disabled="!username.trim() || !password || loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>
