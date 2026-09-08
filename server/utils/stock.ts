import { eq } from 'drizzle-orm'
import type { TransactionType } from '../db/schema'
import { products, inventoryTransactions } from '../db/schema'

// The concrete transaction type differs between the PGlite and postgres-js
// drivers; both expose the same Drizzle query builder API used here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any

export interface ApplyStockChangeInput {
  productId: number
  /** Signed change to apply to stock. Negative for sales/damage/etc, positive for restocks. */
  delta: number
  type: TransactionType
  reason?: string | null
  saleId?: number | null
}

/** Locks the product row and writes the resulting stock + audit transaction. Shared core. */
async function writeStockChange(
  tx: Tx,
  productId: number,
  computeDelta: (previousStock: number) => number,
  type: TransactionType,
  reason: string | null,
  saleId: number | null,
) {
  const [product] = await tx
    .select({ stock: products.stock })
    .from(products)
    .where(eq(products.id, productId))
    .for('update')

  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  const previousStock = product.stock
  const delta = computeDelta(previousStock)
  const newStock = previousStock + delta

  if (newStock < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Insufficient stock' })
  }

  await tx
    .update(products)
    .set({ stock: newStock, updatedAt: new Date() })
    .where(eq(products.id, productId))

  await tx.insert(inventoryTransactions).values({
    productId,
    type,
    quantity: delta,
    previousStock,
    newStock,
    reason,
    saleId,
  })

  return { previousStock, newStock, delta }
}

/**
 * The single write path for product stock. Every caller that needs to change
 * `products.stock` must go through this (or `setAbsoluteStock` below) — it is
 * what makes every stock change auditable via `inventory_transactions`.
 * Must be called inside a db transaction.
 */
export async function applyStockChange(tx: Tx, input: ApplyStockChangeInput) {
  const { productId, delta, type, reason = null, saleId = null } = input
  return writeStockChange(tx, productId, () => delta, type, reason, saleId)
}

export interface SetAbsoluteStockInput {
  productId: number
  /** The stock value the product should end up at, e.g. a physical count. */
  target: number
  type: TransactionType
  reason?: string | null
}

/**
 * Sets stock to an absolute value (e.g. `new_stock = actual_count` from a
 * physical inventory count) rather than a relative delta, computing the delta
 * against whatever the current stock is at the moment of the lock — not a
 * possibly-stale earlier snapshot.
 */
export async function setAbsoluteStock(tx: Tx, input: SetAbsoluteStockInput) {
  const { productId, target, type, reason = null } = input
  return writeStockChange(tx, productId, (previousStock) => target - previousStock, type, reason, null)
}
