import { eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()
  requireUser(event)

  const [product] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return product
})
