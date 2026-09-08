import { eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()

  const [updated] = await db
    .update(products)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return updated
})
