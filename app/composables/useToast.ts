export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

const DURATIONS: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
}

const MAX_TOASTS = 3

let counter = 0
const timers = new Map<number, ReturnType<typeof setTimeout>>()

// useState makes this a true cross-page singleton queue: any page can push
// a toast and ToastHost (mounted once in the default layout) renders it.
function useToastState() {
  return useState<Toast[]>('toasts', () => [])
}

function dismiss(id: number) {
  const toasts = useToastState()
  toasts.value = toasts.value.filter((t) => t.id !== id)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function push(tone: ToastTone, message: string) {
  const toasts = useToastState()
  const id = ++counter
  toasts.value = [...toasts.value, { id, tone, message }].slice(-MAX_TOASTS)
  timers.set(
    id,
    setTimeout(() => dismiss(id), DURATIONS[tone]),
  )
  return id
}

export function useToast() {
  return {
    toasts: useToastState(),
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
    dismiss,
  }
}
