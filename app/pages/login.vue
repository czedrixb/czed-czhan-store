<script setup lang="ts">
const pin = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  if (!pin.value) return
  loading.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { pin: pin.value } })
    await navigateTo('/')
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    error.value = message || 'Incorrect PIN'
    pin.value = ''
  } finally {
    loading.value = false
  }
}

function press(digit: string) {
  if (digit === 'back') {
    pin.value = pin.value.slice(0, -1)
    return
  }
  if (pin.value.length >= 8) return
  pin.value += digit
  error.value = ''
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-8 bg-brand-700 px-6 text-white">
    <div class="text-center">
      <h1 class="text-2xl font-bold">Sari-Sari Store</h1>
      <p class="mt-1 text-brand-100">Enter Store PIN</p>
    </div>

    <div class="flex items-center gap-3" aria-live="polite">
      <span
        v-for="i in 4"
        :key="i"
        class="h-4 w-4 rounded-full border-2 border-white"
        :class="pin.length >= i ? 'bg-white' : 'bg-transparent'"
      />
    </div>

    <p v-if="error" class="text-sm font-medium text-red-200">{{ error }}</p>

    <div class="grid w-full max-w-xs grid-cols-3 gap-3">
      <button
        v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
        :key="n"
        type="button"
        class="rounded-xl bg-white/10 py-4 text-xl font-semibold active:bg-white/20"
        @click="press(n)"
      >
        {{ n }}
      </button>
      <button type="button" class="rounded-xl py-4 text-sm font-medium text-brand-100 active:bg-white/10" @click="press('back')">
        Delete
      </button>
      <button type="button" class="rounded-xl bg-white/10 py-4 text-xl font-semibold active:bg-white/20" @click="press('0')">
        0
      </button>
      <button
        type="button"
        class="rounded-xl bg-white py-4 text-sm font-semibold text-brand-700 active:bg-brand-50 disabled:opacity-50"
        :disabled="!pin || loading"
        @click="submit"
      >
        {{ loading ? '...' : 'Enter' }}
      </button>
    </div>
  </div>
</template>
