import { eq } from 'drizzle-orm'
import { sales } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()

  const result = await db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, id))
    if (!sale) throw createError({ statusCode: 404, statusMessage: 'Sale not found' })
    if (sale.voidedAt) throw createError({ statusCode: 400, statusMessage: 'Sale is already voided' })

    await tx.update(sales).set({ voidedAt: new Date() }).where(eq(sales.id, id))

    await applyStockChange(tx, {
      productId: sale.productId,
      delta: sale.quantity,
      type: 'ADJUSTMENT',
      reason: `Voided sale #${sale.id}`,
      saleId: sale.id,
    })

    return { ...sale, voidedAt: new Date() }
  })

  return result
})
