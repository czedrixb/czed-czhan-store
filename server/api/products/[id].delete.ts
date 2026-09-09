import { eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()
  const user = requireUser(event)

  const updated = await db.transaction(async (tx) => {
    const [product] = await tx
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    await recordAudit(tx, {
      userId: user.id,
      action: 'DEACTIVATE',
      entityType: 'PRODUCT',
      entityId: product.id,
      description: `Deactivated product ${product.name}${product.variant ? ` · ${product.variant}` : ''}`,
    })
    return product
  })
  return updated
})
