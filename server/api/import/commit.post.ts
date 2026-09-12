import { inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { inventoryTransactions, products } from '../../db/schema'

const commitSchema = z.object({
  importStock: z.boolean().default(true),
  rows: z
    .array(
      z.object({
        name: z.string(),
        variant: z.string().default(''),
        quantity: z.number().default(0),
        costPrice: z.number().int().min(0).nullable().optional(),
        sellingPrice: z.number().int().min(0).nullable().optional(),
      }),
    )
    .min(1),
})

/**
 * Imports run against Supabase over the network, so per-row round trips (the
 * naive select-then-write-then-write-again loop) make a few hundred rows take
 * minutes. Everything here is batched into a handful of bulk statements
 * instead, regardless of row count.
 */
export default defineEventHandler(async (event) => {
  const { rows: inputRows, importStock } = await readValidated(event, commitSchema)
  const db = useDb()
  requireUser(event)

  const rows = inputRows
    .map((row) => ({
      name: row.name.trim(),
      variant: row.variant.trim(),
      quantity: Number.isInteger(row.quantity) ? row.quantity : 0,
      costPrice: row.costPrice ?? null,
      sellingPrice: row.sellingPrice ?? null,
    }))
    .filter((row) => row.name.length > 0)

  const skipped = inputRows.length - rows.length
  let created = 0
  let updated = 0

  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: products.id, name: products.name, variant: products.variant, stock: products.stock })
      .from(products)
    const existingMap = new Map(existing.map((p) => [`${p.name.toLowerCase()}|${p.variant.toLowerCase()}`, p]))

    const toCreate: typeof rows = []
    const toUpdate: { id: number; previousStock: number; row: (typeof rows)[number] }[] = []

    for (const row of rows) {
      const match = existingMap.get(`${row.name.toLowerCase()}|${row.variant.toLowerCase()}`)
      if (match) toUpdate.push({ id: match.id, previousStock: match.stock, row })
      else toCreate.push(row)
    }

    if (toCreate.length) {
      const createdRows = await tx
        .insert(products)
        .values(
          toCreate.map((row) => ({
            name: row.name,
            variant: row.variant,
            costPrice: row.costPrice,
            sellingPrice: row.sellingPrice,
            stock: importStock ? Math.max(row.quantity, 0) : 0,
            // Product-only imports stay out of low-stock alerts until their
            // stock count is entered.
            lowStockThreshold: importStock ? 5 : -1,
          })),
        )
        .returning({ id: products.id })
      created = createdRows.length

      const restocks = importStock
        ? createdRows
            .map((p, i) => ({ id: p.id, quantity: toCreate[i].quantity }))
            .filter((r) => r.quantity > 0)
            .map((r) => ({
              productId: r.id,
              type: 'RESTOCK' as const,
              quantity: r.quantity,
              previousStock: 0,
              newStock: r.quantity,
              reason: 'Excel import (initial stock)',
            }))
        : []
      if (restocks.length) await tx.insert(inventoryTransactions).values(restocks)
    }

    if (toUpdate.length) {
      updated = toUpdate.length
      const ids = toUpdate.map((u) => u.id)

      const costCases = toUpdate
        .filter((u) => u.row.costPrice !== null)
        .map((u) => sql`when ${u.id} then ${u.row.costPrice}`)
      const sellingCases = toUpdate
        .filter((u) => u.row.sellingPrice !== null)
        .map((u) => sql`when ${u.id} then ${u.row.sellingPrice}`)
      const stockChanges = importStock ? toUpdate.filter((u) => u.row.quantity !== u.previousStock) : []
      const stockCases = stockChanges.map((u) => sql`when ${u.id} then ${u.row.quantity}`)

      const setValues: Record<string, unknown> = { updatedAt: new Date() }
      if (costCases.length) {
        setValues.costPrice = sql`case ${products.id} ${sql.join(costCases, sql` `)} else ${products.costPrice} end`
      }
      if (sellingCases.length) {
        setValues.sellingPrice = sql`case ${products.id} ${sql.join(sellingCases, sql` `)} else ${products.sellingPrice} end`
      }
      if (stockCases.length) {
        setValues.stock = sql`case ${products.id} ${sql.join(stockCases, sql` `)} else ${products.stock} end`
      }

      await tx.update(products).set(setValues).where(inArray(products.id, ids))

      if (stockChanges.length) {
        await tx.insert(inventoryTransactions).values(
          stockChanges.map((u) => ({
            productId: u.id,
            type: 'ADJUSTMENT' as const,
            quantity: u.row.quantity - u.previousStock,
            previousStock: u.previousStock,
            newStock: u.row.quantity,
            reason: 'Excel import',
          })),
        )
      }
    }
  })

  return { created, updated, skipped }
})
