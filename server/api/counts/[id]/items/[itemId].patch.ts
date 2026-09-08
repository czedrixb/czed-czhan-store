import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { inventoryCountItems, inventoryCounts } from '../../../../db/schema'

const patchSchema = z.object({
  actualQuantity: z.number().int().min(0),
})

export default defineEventHandler(async (event) => {
  const countId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  if (!Number.isInteger(countId) || !Number.isInteger(itemId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  }

  const { actualQuantity } = await readValidated(event, patchSchema)
  const db = useDb()

  const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, countId))
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Inventory count not found' })
  if (count.status !== 'IN_PROGRESS') {
    throw createError({ statusCode: 400, statusMessage: 'Inventory count is already completed' })
  }

  const [item] = await db
    .select()
    .from(inventoryCountItems)
    .where(and(eq(inventoryCountItems.id, itemId), eq(inventoryCountItems.inventoryCountId, countId)))
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Count item not found' })

  const [updated] = await db
    .update(inventoryCountItems)
    .set({ actualQuantity, difference: actualQuantity - item.expectedQuantity })
    .where(eq(inventoryCountItems.id, itemId))
    .returning()

  return updated
})
