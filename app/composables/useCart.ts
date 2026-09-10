import type { EffectScope } from 'vue'
import type { Product } from '~/types'

export interface CartLine {
  product: Product
  quantity: number
}

interface StoredCart {
  lines: CartLine[]
  cash: string
  submissionKey: string
}

const STORAGE_KEY = 'sari-sari:cart'

// useState makes the cart a true cross-page singleton (same pattern as
// useToast/useSession) - it used to be a plain ref() owned by
// pages/sales/new.vue, so any unmount (a bottom-nav tap, a forced
// auth/password redirect) silently destroyed an in-progress sale.
function useCartLines() {
  return useState<CartLine[]>('cart:lines', () => [])
}
function useCartCash() {
  return useState<string>('cart:cash', () => '')
}
function useCartSubmissionKey() {
  return useState<string>('cart:submission-key', () => '')
}

// Module-level, client-only guards. Mutated only inside `import.meta.client`
// branches below, which are dead-code-eliminated from the server bundle, so
// this is never shared across SSR requests - it's effectively per-browser-tab.
let hydrated = false
let persistScope: EffectScope | null = null

function persist(lines: CartLine[], cash: string, submissionKey: string) {
  try {
    if (lines.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY)
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ lines, cash, submissionKey } satisfies StoredCart))
    }
  } catch {
    // Storage can be unavailable (private browsing, quota) - the cart still
    // works for the current tab via useState, it just won't survive a reload.
  }
}

export function useCart() {
  const lines = useCartLines()
  const cash = useCartCash()
  const submissionKey = useCartSubmissionKey()

  if (import.meta.client) {
    // Hydrate from sessionStorage once per browser tab, after mount - never
    // during setup(), or the client's pre-mount render would disagree with
    // the server-rendered (always-empty) HTML and trigger a hydration
    // mismatch. onMounted() here runs synchronously inside the calling
    // component's setup(), which is the one Vue requires.
    onMounted(() => {
      if (hydrated) return
      hydrated = true
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return
        const parsed = JSON.parse(raw) as Partial<StoredCart>
        lines.value = Array.isArray(parsed.lines) ? parsed.lines : []
        cash.value = typeof parsed.cash === 'string' ? parsed.cash : ''
        submissionKey.value = typeof parsed.submissionKey === 'string' ? parsed.submissionKey : ''
      } catch {
        // Corrupt or inaccessible storage - start with an empty cart.
      }
    })

    // A plain watch() here would be owned by whichever component first calls
    // useCart() and disposed when that component unmounts - exactly the
    // moment this needs to keep running. A detached scope, created once,
    // keeps the persistence watcher alive for the life of the tab.
    if (!persistScope) {
      persistScope = effectScope(true)
      persistScope.run(() => {
        watch([lines, cash, submissionKey], ([l, c, k]) => persist(l, c, k), { deep: true })
      })
    }
  }

  function clear() {
    lines.value = []
    cash.value = ''
    submissionKey.value = ''
  }

  return { lines, cash, submissionKey, clear }
}
