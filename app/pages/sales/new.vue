<script setup lang="ts">
import { PhMagnifyingGlass, PhMinus, PhPlus, PhX } from '@phosphor-icons/vue'
import type { Product, SaleReceipt } from '~/types'

interface CartLine {
  product: Product
  quantity: number
}

const toast = useToast()
const { confirm } = useConfirm()

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
    const message = apiErrorMessage(err, 'Could not save sale')
    errorMessage.value = message
    toast.error(message)
  } finally {
    saving.value = false
  }
}

async function voidCompletedSale() {
  if (!completedSale.value || completedSale.value.voidedAt || voiding.value) return

  const qty = completedSale.value.lines.reduce((sum, line) => sum + line.quantity, 0)
  const ok = await confirm({
    title: 'Void this sale?',
    body: `The ${qty} item${qty === 1 ? '' : 's'} go back into stock and ${formatPeso(completedSale.value.revenue)} stops counting toward revenue.`,
    confirmLabel: 'Void sale',
    tone: 'danger',
  })
  if (!ok) return

  voiding.value = true
  errorMessage.value = ''
  try {
    const voided = await $fetch<SaleReceipt>(`/api/sales/${completedSale.value.id}`, { method: 'DELETE' })
    completedSale.value = { ...completedSale.value, voidedAt: voided.voidedAt }
    toast.success('Sale voided. Stock restored.')
  } catch (err: unknown) {
    const message = apiErrorMessage(err, 'Could not void sale')
    errorMessage.value = message
    toast.error(message)
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

// Navigating away with an unsaved cart silently discarded it before. Warn
// once there's something to lose; a completed sale is already saved, so it
// never blocks navigation.
onBeforeRouteLeave(async () => {
  if (completedSale.value || cart.value.length === 0) return true
  return confirm({
    title: 'Leave without saving this sale?',
    body: 'The cart items are not saved yet. Leaving this screen clears them.',
    confirmLabel: 'Leave without saving',
    cancelLabel: 'Stay',
    tone: 'warn',
  })
})
</script>

<template>
  <div>
    <PageHeader title="Checkout" />

    <div class="space-y-4 px-4 py-4">
      <div
        v-if="errorMessage"
        class="rounded-[var(--radius-control)] bg-danger-50 px-4 py-3 text-center text-sm font-semibold text-danger-600"
        data-testid="sale-error"
      >
        {{ errorMessage }}
      </div>

      <template v-if="completedSale">
        <AppCard data-testid="sale-summary">
          <p
            class="mb-3 rounded-lg px-3 py-2 text-center text-sm font-semibold"
            :class="completedSale.voidedAt ? 'bg-neutral-100 text-ink-subtle' : 'bg-brand-50 text-brand-700'"
          >
            {{ completedSale.voidedAt ? 'Voided. Stock restored.' : 'Sale complete' }}
          </p>

          <ul class="divide-y divide-line">
            <li v-for="line in completedSale.lines" :key="line.id" class="py-2" data-testid="summary-line">
              <p class="font-semibold text-ink">
                {{ line.productName
                }}<span v-if="line.productVariant" class="font-normal text-ink-subtle"> · {{ line.productVariant }}</span>
              </p>
              <p class="text-sm text-ink-subtle">
                {{ line.quantity }} × {{ formatPeso(line.sellingPrice) }} = {{ formatPeso(line.revenue) }}
              </p>
              <p class="text-xs text-ink-subtle" data-testid="summary-stock">
                Stock: {{ line.previousStock }} → {{ line.newStock }}
              </p>
            </li>
          </ul>

          <div class="mt-4 grid grid-cols-2 gap-3 text-center">
            <div class="rounded-[var(--radius-control)] bg-surface-sunken py-3">
              <p class="text-xs uppercase text-ink-subtle">Total</p>
              <p class="text-xl font-bold tabular-nums">{{ formatPeso(completedSale.revenue) }}</p>
            </div>
            <div class="rounded-[var(--radius-control)] bg-surface-sunken py-3">
              <p class="text-xs uppercase text-ink-subtle">Cash received</p>
              <p class="text-xl font-bold tabular-nums">{{ formatPeso(completedSale.cashReceived ?? 0) }}</p>
            </div>
          </div>

          <div class="pop-in mt-3 rounded-[var(--radius-control)] bg-brand-50 py-3 text-center">
            <p class="text-xs uppercase text-brand-700">Change due</p>
            <p class="text-2xl font-bold tabular-nums text-brand-700" data-testid="summary-change">
              {{ formatPeso(completedSale.changeDue ?? 0) }}
            </p>
          </div>

          <AppButton
            v-if="!completedSale.voidedAt"
            variant="danger"
            block
            class="mt-5"
            :loading="voiding"
            data-testid="void-sale"
            @click="voidCompletedSale"
          >
            {{ voiding ? 'Voiding' : 'Void this sale' }}
          </AppButton>

          <AppButton block class="mt-3" data-testid="new-sale" @click="startNewSale">
            New sale
          </AppButton>
        </AppCard>
      </template>

      <template v-else>
        <div class="sticky-search -mx-4 border-b border-line bg-surface-sunken px-4 pb-3">
          <div class="relative">
          <PhMagnifyingGlass class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
          <input
            ref="searchInput"
            v-model="search"
            type="search"
            placeholder="Search product..."
            class="field-input field-input--with-leading-icon"
            data-testid="product-search"
          />
          </div>
        </div>

        <ul v-if="results.length" class="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
          <li v-for="(p, i) in results" :key="p.id" class="list-enter-item" :style="{ '--i': i }">
            <button
              type="button"
              class="relative z-10 flex w-full touch-manipulation items-center justify-between px-4 py-3 text-left active:bg-neutral-50"
              data-testid="search-result"
              @click="addToCart(p)"
              @touchend.prevent="addToCart(p)"
            >
              <span>
                <span class="font-medium text-ink">{{ p.name }}</span>
                <span v-if="p.variant" class="text-ink-subtle"> · {{ p.variant }}</span>
              </span>
              <span class="text-xs text-ink-subtle">{{ p.stock }} in stock</span>
            </button>
          </li>
        </ul>
        <p v-else-if="search.trim()" class="py-6 text-center text-sm text-ink-subtle">No matching products.</p>

        <AppCard v-if="cart.length">
          <div
            v-for="(line, i) in cart"
            :key="line.product.id"
            class="list-enter-item border-b border-line pb-3 last:border-0 last:pb-0"
            :class="{ 'mb-3': i < cart.length - 1 }"
            :style="{ '--i': i }"
            data-testid="cart-line"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-semibold text-ink">
                  {{ line.product.name
                  }}<span v-if="line.product.variant" class="font-normal text-ink-subtle"> · {{ line.product.variant }}</span>
                </p>
                <p class="text-xs text-ink-subtle">{{ formatPeso(line.product.sellingPrice ?? 0) }} each · {{ line.product.stock }} in stock</p>
              </div>
              <button
                type="button"
                class="focus-ring flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-danger-600 active:bg-danger-50"
                data-testid="cart-line-remove"
                @click="removeLine(i)"
              >
                <PhX class="h-3.5 w-3.5" weight="bold" />
                Remove
              </button>
            </div>

            <div class="mt-2 flex items-center gap-4">
              <button
                type="button"
                class="press focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-ink-muted active:bg-neutral-200"
                data-testid="qty-decrement"
                @click="decLine(line)"
              >
                <PhMinus class="h-4 w-4" weight="bold" />
              </button>
              <input
                v-model.number="line.quantity"
                type="number"
                inputmode="numeric"
                min="1"
                :max="line.product.stock"
                class="field-input w-14 px-1 py-1.5 text-center text-xl font-bold tabular-nums"
                data-testid="qty-input"
                @blur="clampLineQuantity(line)"
              />
              <button
                type="button"
                class="press focus-ring flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-ink-muted active:bg-neutral-200"
                data-testid="qty-increment"
                @click="incLine(line)"
              >
                <PhPlus class="h-4 w-4" weight="bold" />
              </button>
              <span class="ml-auto font-semibold tabular-nums text-ink">
                {{ formatPeso((line.product.sellingPrice ?? 0) * line.quantity) }}
              </span>
            </div>
          </div>

          <div class="mt-4 rounded-[var(--radius-control)] bg-surface-sunken py-3 text-center">
            <p class="text-xs uppercase text-ink-subtle">Total</p>
            <p class="text-xl font-bold tabular-nums" data-testid="sale-total">{{ formatPeso(total) }}</p>
          </div>

          <AppField label="Cash received" for="cash-received" class="mt-4">
            <input
              id="cash-received"
              v-model="cashInput"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              class="field-input text-lg tabular-nums"
              data-testid="cash-received"
            />
          </AppField>

          <div v-if="cashInput.trim()" class="mt-3 rounded-[var(--radius-control)] py-3 text-center" :class="hasShortfall ? 'bg-danger-50' : 'bg-brand-50'">
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

          <AppButton block class="mt-5" :loading="saving" :disabled="!canComplete" data-testid="save-sale" @click="saveSale">
            {{ saving ? 'Saving' : 'Complete sale' }}
          </AppButton>
        </AppCard>

        <p v-else-if="!search.trim()" class="py-6 text-center text-sm text-ink-subtle">Search for a product to add it to the cart.</p>
      </template>
    </div>
  </div>
</template>
