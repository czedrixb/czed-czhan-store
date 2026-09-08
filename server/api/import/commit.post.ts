import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { products } from '../../db/schema'

const commitSchema = z.object({
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

export default defineEventHandler(async (event) => {
  const { rows } = await readValidated(event, commitSchema)
  const db = useDb()

  let created = 0
  let updated = 0
  let skipped = 0

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const name = row.name.trim()
      const variant = row.variant.trim()
      const quantity = Number.isInteger(row.quantity) ? row.quantity : 0

      if (!name) {
        skipped++
        continue
      }

      const [existing] = await tx
        .select()
        .from(products)
        .where(sql`lower(${products.name}) = lower(${name}) and lower(${products.variant}) = lower(${variant})`)

      if (existing) {
        const priceUpdate: Record<string, number> = {}
        if (row.costPrice !== null && row.costPrice !== undefined) priceUpdate.costPrice = row.costPrice
        if (row.sellingPrice !== null && row.sellingPrice !== undefined) priceUpdate.sellingPrice = row.sellingPrice
        if (Object.keys(priceUpdate).length) {
          await tx
            .update(products)
            .set({ ...priceUpdate, updatedAt: new Date() })
            .where(sql`${products.id} = ${existing.id}`)
        }
        if (quantity !== existing.stock) {
          await setAbsoluteStock(tx, {
            productId: existing.id,
            target: quantity,
            type: 'ADJUSTMENT',
            reason: 'Excel import',
          })
        }
        updated++
      } else {
        const [createdProduct] = await tx
          .insert(products)
          .values({
            name,
            variant,
            costPrice: row.costPrice ?? null,
            sellingPrice: row.sellingPrice ?? null,
            stock: 0,
          })
          .returning()

        if (quantity > 0) {
          await applyStockChange(tx, {
            productId: createdProduct.id,
            delta: quantity,
            type: 'RESTOCK',
            reason: 'Excel import (initial stock)',
          })
        }
        created++
      }
    }
  })

  return { created, updated, skipped }
})
