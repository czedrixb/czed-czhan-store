import { asc, eq } from 'drizzle-orm'
import { inventoryCountItems, inventoryCounts, products } from '../../../db/schema'

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const db = useDb()

  const [count] = await db.select().from(inventoryCounts).where(eq(inventoryCounts.id, id))
  if (!count) throw createError({ statusCode: 404, statusMessage: 'Inventory count not found' })

  const rows = await db
    .select({
      productName: products.name,
      productVariant: products.variant,
      expectedQuantity: inventoryCountItems.expectedQuantity,
      actualQuantity: inventoryCountItems.actualQuantity,
      difference: inventoryCountItems.difference,
    })
    .from(inventoryCountItems)
    .innerJoin(products, eq(products.id, inventoryCountItems.productId))
    .where(eq(inventoryCountItems.inventoryCountId, id))
    .orderBy(asc(products.name), asc(products.variant))

  const workbook = await buildCountWorkbook(rows)
  const buffer = await workbook.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="inventory-count-${id}.xlsx"`)
  return buffer
})
