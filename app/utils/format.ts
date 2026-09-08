export const STORE_TZ = 'Asia/Manila'

export function formatPeso(centavos: number): string {
  const pesos = centavos / 100
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100
}

export function formatDateLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('en-PH', { timeZone: STORE_TZ, month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatDateTimeLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('en-PH', {
    timeZone: STORE_TZ,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTimeLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleTimeString('en-PH', { timeZone: STORE_TZ, hour: 'numeric', minute: '2-digit' })
}
