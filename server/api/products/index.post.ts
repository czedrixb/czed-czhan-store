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

  try {
    const [created] = await db.insert(products).values(data).returning()
    return created
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw createError({ statusCode: 409, statusMessage: 'A product with this name and variant already exists' })
    }
    throw err
  }
})
