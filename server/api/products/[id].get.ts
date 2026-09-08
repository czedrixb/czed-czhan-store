import { eq } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()
  const [product] = await db.select().from(products).where(eq(products.id, id))
  if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  return product
})
