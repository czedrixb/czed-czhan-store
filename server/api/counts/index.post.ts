import { eq } from 'drizzle-orm'
import { inventoryCountItems, inventoryCounts, products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const user = requireUser(event)

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

    await recordAudit(tx, {
      userId: user.id,
      action: 'CREATE',
      entityType: 'INVENTORY_COUNT',
      entityId: created.id,
      description: `Started inventory count #${created.id} with ${activeProducts.length} products`,
    })

    return created
  })

  return count
})
