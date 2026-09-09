import { z } from 'zod'
import { products } from '../../db/schema'

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  variant: z.string().trim().default(''),
  costPrice: z.number().int().min(0).nullable().default(null),
  sellingPrice: z.number().int().min(0).nullable().default(null),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
})

export default defineEventHandler(async (event) => {
  const data = await readValidated(event, createProductSchema)
  const db = useDb()
  const user = requireUser(event)

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(products).values(data).returning()
      await recordAudit(tx, {
        userId: user.id,
        action: 'CREATE',
        entityType: 'PRODUCT',
        entityId: created.id,
        description: `Created product ${created.name}${created.variant ? ` · ${created.variant}` : ''}`,
      })
      return created
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createError({ statusCode: 409, statusMessage: 'A product with this name and variant already exists' })
    }
    throw err
  }
})
