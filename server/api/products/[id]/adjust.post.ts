import { z } from 'zod'

const adjustSchema = z
  .object({
    type: z.enum(['ADJUSTMENT', 'DAMAGE', 'EXPIRED', 'MISSING']),
    delta: z.number().int().refine((n) => n !== 0, 'delta must not be zero'),
    reason: z.string().trim().min(1).max(500),
  })
  .refine((body) => body.type === 'ADJUSTMENT' || body.delta < 0, {
    message: 'DAMAGE, EXPIRED, and MISSING must reduce stock (delta < 0)',
    path: ['delta'],
  })

export default defineEventHandler(async (event) => {
  const productId = parseIdParam(event)
  const { type, delta, reason } = await readValidated(event, adjustSchema)
  const db = useDb()
  const user = requireUser(event)

  const result = await db.transaction(async (tx) => {
    const stock = await applyStockChange(tx, { productId, delta, type, reason })
    await recordAudit(tx, {
      userId: user.id,
      action: type,
      entityType: 'PRODUCT',
      entityId: productId,
      description: `${type.replace('_', ' ')} ${delta > 0 ? '+' : ''}${delta}: ${reason} (stock ${stock.previousStock} → ${stock.newStock})`,
    })
    return stock
  })

  return result
})
