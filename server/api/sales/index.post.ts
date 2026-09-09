import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { products, sales } from '../../db/schema'

const createSaleSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
})

export default defineEventHandler(async (event) => {
  const { productId, quantity } = await readValidated(event, createSaleSchema)
  const db = useDb()
  const user = requireUser(event)

  const sale = await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, productId))
    if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    if (!product.isActive) {
      throw createError({ statusCode: 400, statusMessage: 'Product is not active' })
    }
    if (product.costPrice === null || product.sellingPrice === null) {
      throw createError({ statusCode: 400, statusMessage: 'Product needs pricing before it can be sold' })
    }

    const { revenue, cost, profit } = calculateSale(product.costPrice, product.sellingPrice, quantity)

    const [created] = await tx
      .insert(sales)
      .values({
        productId,
        quantity,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        revenue,
        profit,
      })
      .returning()

    const { previousStock, newStock } = await applyStockChange(tx, {
      productId,
      delta: -quantity,
      type: 'SALE',
      saleId: created.id,
    })

    await recordAudit(tx, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'SALE',
      entityId: created.id,
      description: `Recorded sale of ${quantity} × ${product.name}${product.variant ? ` · ${product.variant}` : ''}`,
    })

    return { ...created, cost, previousStock, newStock, productName: product.name, productVariant: product.variant }
  })

  return sale
})
