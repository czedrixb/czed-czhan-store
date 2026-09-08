import { asc } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const rows = await db.select().from(products).orderBy(asc(products.name), asc(products.variant))

  const workbook = await buildInventoryWorkbook(rows)
  const buffer = await workbook.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="inventory-${storeDateKey()}.xlsx"`)
  return buffer
})
