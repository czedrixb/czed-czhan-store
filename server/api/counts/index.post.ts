import { eq } from 'drizzle-orm'
import { inventoryCountItems, inventoryCounts, products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  requireUser(event)

  const count = await db.transaction(async (tx) => {
    const [created] = await tx.insert(inventoryCounts).values({}).returning()

    const activeProducts = await tx
      .select({ id: products.id, stock: products.stock })
      .from(products)
      .where(eq(products.isActive, true))

    if (activeProducts.length > 0) {
      await tx.insert(inventoryCountItems).values(
        activeProducts.map((p) => ({
          inventoryCountId: created.id,
          productId: p.id,
          expectedQuantity: p.stock,
        })),
      )
    }

    return created
  })

  return count
})
