import { z } from 'zod'

const restockSchema = z.object({
  quantity: z.number().int().positive(),
  reason: z.string().trim().max(500).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const productId = parseIdParam(event)
  const { quantity, reason } = await readValidated(event, restockSchema)
  const db = useDb()
  const user = requireUser(event)

  const result = await db.transaction(async (tx) => {
    const stock = await applyStockChange(tx, {
      productId,
      delta: quantity,
      type: 'RESTOCK',
      reason: reason ?? 'New stock',
    })
    await recordAudit(tx, {
      userId: user.id,
      action: 'RESTOCK',
      entityType: 'PRODUCT',
      entityId: productId,
      description: `Received ${quantity} item${quantity === 1 ? '' : 's'} (stock ${stock.previousStock} → ${stock.newStock})`,
    })
    return stock
  })

  return result
})
