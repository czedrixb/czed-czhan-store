/**
 * All money is stored and computed as integer centavos (1 peso = 100 centavos)
 * to avoid floating-point drift when summing thousands of sales.
 */

export function pesosToCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function centavosToPesos(centavos: number): number {
  return centavos / 100
}

export function formatPeso(centavos: number): string {
  const pesos = centavos / 100
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function calculateSale(costPrice: number, sellingPrice: number, quantity: number) {
  const revenue = sellingPrice * quantity
  const cost = costPrice * quantity
  const profit = revenue - cost
  return { revenue, cost, profit }
}
