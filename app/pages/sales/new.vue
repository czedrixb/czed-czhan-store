<script setup lang="ts">
import type { Product, SaleReceipt } from '~/types'

interface CartLine {
  product: Product
  quantity: number
}

const search = ref('')
const results = ref<Product[]>([])
const cart = ref<CartLine[]>([])
const cashInput = ref('')
const saving = ref(false)
const voiding = ref(false)
const errorMessage = ref('')
const submissionKey = ref('')
const completedSale = ref<SaleReceipt | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
// Bumped every time a load is *requested* (not when it starts fetching), so
// an older request already in flight — e.g. the initial full-list load still
// pending when the cashier starts typing — is invalidated immediately rather
// than at some later, unpredictable point. Without this, a slow early
// response can land after a newer, narrower search has already rendered,
// silently replacing the correct results with the wrong ones.
let loadGen = 0

async function loadProducts() {
  const gen = loadGen
  const data = await $fetch<Product[]>('/api/products', {
    query: search.value.trim() ? { q: search.value.trim(), active: 'true' } : { active: 'true' },
  })
  if (gen === loadGen) results.value = data
}

function requestLoad(immediate = false) {
  loadGen++
  clearTimeout(searchTimer)
  if (immediate) {
    loadProducts()
  } else {
    searchTimer = setTimeout(loadProducts, 200)
  }
}

watch(search, (value) => {
  // Clear stale matches the instant typing starts so a fast click can't land
  // on a result left over from before the keystroke (e.g. the full default
  // list, or a previous query) while the debounced search is still in flight.
  if (value.trim()) results.value = []
  requestLoad()
})

onMounted(() => requestLoad(true))

function addToCart(product: Product) {
  if (product.costPrice === null || product.sellingPrice === null) {
    errorMessage.value = 'This product needs pricing before it can be sold.'
    return
  }
  if (product.stock <= 0) {
    errorMessage.value = 'Out of stock.'
    return
  }
  errorMessage.value = ''

  const existing = cart.value.find((line) => line.product.id === product.id)
  if (existing) {
    if (existing.quantity < product.stock) existing.quantity++
  } else {
    if (cart.value.length === 0) submissionKey.value = crypto.randomUUID()
    cart.value.push({ product, quantity: 1 })
  }

  search.value = ''
  results.value = []
}

function clampLineQuantity(line: CartLine) {
  if (typeof line.quantity !== 'number' || Number.isNaN(line.quantity) || line.quantity < 1) {
    line.quantity = 1
  } else if (line.quantity > line.product.stock) {
    line.quantity = line.product.stock
  }
}
watch(cart, () => { for (const line of cart.value) clampLineQuantity(line) }, { deep: true })

function incLine(line: CartLine) {
  if (line.quantity < line.product.stock) line.quantity++
}
function decLine(line: CartLine) {
  if (line.quantity > 1) line.quantity--
}
function removeLine(index: number) {
  cart.value.splice(index, 1)
}

function clearCart() {
  cart.value = []
  cashInput.value = ''
  submissionKey.value = ''
  errorMessage.value = ''
  requestLoad(true)
}

const total = computed(() => cart.value.reduce((sum, line) => sum + (line.product.sellingPrice ?? 0) * line.quantity, 0))

// Accepts whole pesos or up to two decimal places; anything else (blank,
// letters, three-plus decimals, negative) is not a valid amount.
const CASH_PATTERN = /^\d+(\.\d{1,2})?$/
const cashValid = computed(() => CASH_PATTERN.test(cashInput.value.trim()))
const cashCentavos = computed(() => (cashValid.value ? pesosToCentavos(parseFloat(cashInput.value.trim())) : null))
const changeDue = computed(() => (cashCentavos.value === null ? null : cashCentavos.value - total.value))
const hasShortfall = computed(() => changeDue.value !== null && changeDue.value < 0)

const canComplete = computed(
  () =>
    cart.value.length > 0 &&
    cart.value.every(
      (line) =>
        line.product.costPrice !== null &&
        line.product.sellingPrice !== null &&
        line.quantity > 0 &&
        line.quantity <= line.product.stock,
    ) &&
    cashValid.value &&
    changeDue.value !== null &&
    changeDue.value >= 0 &&
    !saving.value,
)

async function saveSale() {
  if (!canComplete.value || saving.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const receipt = await $fetch<SaleReceipt>('/api/sales', {
      method: 'POST',
      body: {
        items: cart.value.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        cashReceived: cashCentavos.value,
        submissionKey: submissionKey.value,
      },
    })
    completedSale.value = receipt
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message || 'Could not save sale'
  } finally {
    saving.value = false
  }
}

async function voidCompletedSale() {
  if (!completedSale.value || completedSale.value.voidedAt || voiding.value) return
  voiding.value = true
  errorMessage.value = ''
  try {
    const voided = await $fetch<SaleReceipt>(`/api/sales/${completedSale.value.id}`, { method: 'DELETE' })
    completedSale.value = { ...completedSale.value, voidedAt: voided.voidedAt }
  } catch (err: unknown) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message || 'Could not void sale'
  } finally {
    voiding.value = false
  }
}

async function startNewSale() {
  completedSale.value = null
  clearCart()
  await nextTick()
  searchInput.value?.focus()
}
</script>

<template>
  <div>
    <PageHeader title="Checkout" />

    <div class="space-y-4 px-4 py-4">
      <div
        v-if="errorMessage"
        class="rounded-xl bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600"
        data-testid="sale-error"
      >
        {{ errorMessage }}
      </div>

      <template v-if="completedSale">
        <div class="rounded-2xl border border-gray-100 bg-white p-5" data-testid="sale-summary">
          <p
            class="mb-3 rounded-lg px-3 py-2 text-center text-sm font-semibold"
            :class="completedSale.voidedAt ? 'bg-gray-100 text-gray-500' : 'bg-brand-50 text-brand-700'"
          >
            {{ completedSale.voidedAt ? 'Voided — stock restored' : 'Sale complete' }}
          </p>

          <ul class="divide-y divide-gray-100">
            <li v-for="line in completedSale.lines" :key="line.id" class="py-2" data-testid="summary-line">
              <p class="font-semibold text-gray-900">
                {{ line.productName
                }}<span v-if="line.productVariant" class="font-normal text-gray-500"> · {{ line.productVariant }}</span>
              </p>
              <p class="text-sm text-gray-500">
                {{ line.quantity }} × {{ formatPeso(line.sellingPrice) }} = {{ formatPeso(line.revenue) }}
              </p>
              <p class="text-xs text-gray-400" data-testid="summary-stock">
                Stock: {{ line.previousStock }} → {{ line.newStock }}
              </p>
            </li>
          </ul>

          <div class="mt-4 grid grid-cols-2 gap-3 text-center">
            <div class="rounded-xl bg-gray-50 py-3">
              <p class="text-xs uppercase text-gray-500">Total</p>
              <p class="text-xl font-bold tabular-nums">{{ formatPeso(completedSale.revenue) }}</p>
            </div>
            <div class="rounded-xl bg-gray-50 py-3">
              <p class="text-xs uppercase text-gray-500">Cash received</p>
              <p class="text-xl font-bold tabular-nums">{{ formatPeso(completedSale.cashReceived ?? 0) }}</p>
            </div>
          </div>

          <div class="mt-3 rounded-xl bg-brand-50 py-3 text-center">
            <p class="text-xs uppercase text-brand-700">Change due</p>
            <p class="text-2xl font-bold tabular-nums text-brand-700" data-testid="summary-change">
              {{ formatPeso(completedSale.changeDue ?? 0) }}
            </p>
          </div>

          <button
            v-if="!completedSale.voidedAt"
            type="button"
            class="mt-5 w-full rounded-xl border border-danger-600 py-3 text-base font-semibold text-danger-600 active:bg-danger-50 disabled:opacity-50"
            :disabled="voiding"
            data-testid="void-sale"
            @click="voidCompletedSale"
          >
            {{ voiding ? 'Voiding…' : 'Void this sale' }}
          </button>

          <button
            type="button"
            class="mt-3 w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white active:bg-brand-700"
            data-testid="new-sale"
            @click="startNewSale"
          >
            New sale
          </button>
        </div>
      </template>

      <template v-else>
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          placeholder="Search product..."
          class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base"
          data-testid="product-search"
        />

        <ul v-if="results.length" class="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white">
          <li v-for="p in results" :key="p.id">
            <button
              type="button"
              class="flex w-full items-center justify-between px-4 py-3 text-left active:bg-gray-50"
              data-testid="search-result"
              @click="addToCart(p)"
            >
              <span>
                <span class="font-medium text-gray-900">{{ p.name }}</span>
                <span v-if="p.variant" class="text-gray-500"> · {{ p.variant }}</span>
              </span>
              <span class="text-xs text-gray-400">{{ p.stock }} in stock</span>
            </button>
          </li>
        </ul>
        <p v-else-if="search.trim()" class="py-6 text-center text-sm text-gray-400">No matching products.</p>

        <div v-if="cart.length" class="rounded-2xl border border-gray-100 bg-white p-5">
          <div
            v-for="(line, i) in cart"
            :key="line.product.id"
            class="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
            :class="{ 'mb-3': i < cart.length - 1 }"
            data-testid="cart-line"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-gray-900">
                  {{ line.product.name
                  }}<span v-if="line.product.variant" class="font-normal text-gray-500"> · {{ line.product.variant }}</span>
                </p>
                <p class="text-xs text-gray-400">{{ formatPeso(line.product.sellingPrice ?? 0) }} each · {{ line.product.stock }} in stock</p>
              </div>
              <button
                type="button"
                class="text-xs font-medium text-danger-600"
                data-testid="cart-line-remove"
                @click="removeLine(i)"
              >
                Remove
              </button>
            </div>

            <div class="mt-2 flex items-center gap-4">
              <button
                type="button"
                class="h-9 w-9 rounded-full bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
                data-testid="qty-decrement"
                @click="decLine(line)"
              >
                −
              </button>
              <input
                v-model.number="line.quantity"
                type="number"
                inputmode="numeric"
                min="1"
                :max="line.product.stock"
                class="w-14 rounded-lg border border-gray-200 text-center text-xl font-bold tabular-nums"
                data-testid="qty-input"
                @blur="clampLineQuantity(line)"
              />
              <button
                type="button"
                class="h-9 w-9 rounded-full bg-gray-100 text-xl font-bold text-gray-700 active:bg-gray-200"
                data-testid="qty-increment"
                @click="incLine(line)"
              >
                +
              </button>
              <span class="ml-auto font-semibold tabular-nums text-gray-900">
                {{ formatPeso((line.product.sellingPrice ?? 0) * line.quantity) }}
              </span>
            </div>
          </div>

          <div class="mt-4 rounded-xl bg-gray-50 py-3 text-center">
            <p class="text-xs uppercase text-gray-500">Total</p>
            <p class="text-xl font-bold tabular-nums" data-testid="sale-total">{{ formatPeso(total) }}</p>
          </div>

          <label class="mt-4 block text-sm font-medium text-gray-700">
            Cash received
            <input
              v-model="cashInput"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              class="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-lg tabular-nums"
              data-testid="cash-received"
            />
          </label>

          <div v-if="cashInput.trim()" class="mt-3 rounded-xl py-3 text-center" :class="hasShortfall ? 'bg-danger-50' : 'bg-brand-50'">
            <template v-if="!cashValid">
              <p class="text-sm font-medium text-danger-600">Enter a valid amount.</p>
            </template>
            <template v-else-if="hasShortfall">
              <p class="text-xs uppercase text-danger-600">Still needed</p>
              <p class="text-xl font-bold tabular-nums text-danger-600" data-testid="cash-shortfall">
                {{ formatPeso(Math.abs(changeDue ?? 0)) }}
              </p>
            </template>
            <template v-else>
              <p class="text-xs uppercase text-brand-700">Change due</p>
              <p class="text-xl font-bold tabular-nums text-brand-700" data-testid="change-due">
                {{ formatPeso(changeDue ?? 0) }}
              </p>
            </template>
          </div>

          <button
            type="button"
            class="mt-5 w-full rounded-xl bg-brand-600 py-3 text-base font-semibold text-white active:bg-brand-700 disabled:opacity-50"
            :disabled="!canComplete"
            data-testid="save-sale"
            @click="saveSale"
          >
            {{ saving ? 'Saving…' : 'Complete sale' }}
          </button>
        </div>

        <p v-else-if="!search.trim()" class="py-6 text-center text-sm text-gray-400">Search for a product to add it to the cart.</p>
      </template>
    </div>
  </div>
</template>
