import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { products } from '../../db/schema'

const updateProductSchema = z.object({
  name: z.string().trim().min(1).optional(),
  variant: z.string().trim().optional(),
  costPrice: z.number().int().min(0).nullable().optional(),
  sellingPrice: z.number().int().min(0).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const data = await readValidated(event, updateProductSchema)
  const db = useDb()

  try {
    const [updated] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    return updated
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createError({ statusCode: 409, statusMessage: 'A product with this name and variant already exists' })
    }
    throw err
  }
})
