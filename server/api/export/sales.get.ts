import { and, asc, eq, gte, isNull, lt } from 'drizzle-orm'
import { products, sales } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDb()
  const range = resolveDateRangeFromQuery(query)

  const rows = await db
    .select({
      soldAt: sales.soldAt,
      productName: products.name,
      productVariant: products.variant,
      quantity: sales.quantity,
      sellingPrice: sales.sellingPrice,
      revenue: sales.revenue,
      profit: sales.profit,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(and(gte(sales.soldAt, range.start), lt(sales.soldAt, range.end), isNull(sales.voidedAt)))
    .orderBy(asc(sales.soldAt))

  const title = `Sales ${storeDateKey(range.start)} to ${storeDateKey(new Date(range.end.getTime() - 1))}`
  const workbook = await buildSalesWorkbook(rows, title)
  const buffer = await workbook.xlsx.writeBuffer()

  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="sales-${storeDateKey(range.start)}.xlsx"`)
  return buffer
})
