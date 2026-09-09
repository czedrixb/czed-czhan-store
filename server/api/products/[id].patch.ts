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
  const user = requireUser(event)

  try {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(products)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning()

      if (!updated) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
      await recordAudit(tx, {
        userId: user.id,
        action: 'UPDATE',
        entityType: 'PRODUCT',
        entityId: updated.id,
        description: `Updated product ${updated.name}${updated.variant ? ` · ${updated.variant}` : ''}`,
      })
      return updated
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createError({ statusCode: 409, statusMessage: 'A product with this name and variant already exists' })
    }
    throw err
  }
})
