export type ConfirmTone = 'danger' | 'warn'

export interface ConfirmRequest {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

interface ConfirmState extends ConfirmRequest {
  id: number
  confirmLabel: string
  cancelLabel: string
  tone: ConfirmTone
}

let counter = 0
// The resolver lives outside reactive state - it's a function, not data,
// and only ConfirmDialog (the single mounted instance) ever needs it.
let resolver: ((accepted: boolean) => void) | null = null

function useConfirmState() {
  return useState<ConfirmState | null>('confirm-request', () => null)
}

export function useConfirm() {
  const state = useConfirmState()

  function confirm(request: ConfirmRequest): Promise<boolean> {
    // Resolve any still-open prior request as cancelled before replacing it,
    // so a stray promise never hangs forever.
    if (resolver) resolver(false)
    return new Promise<boolean>((resolve) => {
      resolver = resolve
      state.value = {
        id: ++counter,
        title: request.title,
        body: request.body,
        confirmLabel: request.confirmLabel ?? 'Confirm',
        cancelLabel: request.cancelLabel ?? 'Cancel',
        tone: request.tone ?? 'danger',
      }
    })
  }

  function resolve(accepted: boolean) {
    state.value = null
    const r = resolver
    resolver = null
    r?.(accepted)
  }

  return { request: state, confirm, resolve }
}
