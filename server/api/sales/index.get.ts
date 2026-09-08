import { and, desc, eq, gte, isNull, lt } from 'drizzle-orm'
import { products, sales } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDb()

  const range = resolveDateRangeFromQuery(query)
  const conditions = [gte(sales.soldAt, range.start), lt(sales.soldAt, range.end)]

  if (query.includeVoided !== 'true') {
    conditions.push(isNull(sales.voidedAt))
  }

  const rows = await db
    .select({
      id: sales.id,
      productId: sales.productId,
      productName: products.name,
      productVariant: products.variant,
      quantity: sales.quantity,
      costPrice: sales.costPrice,
      sellingPrice: sales.sellingPrice,
      revenue: sales.revenue,
      profit: sales.profit,
      voidedAt: sales.voidedAt,
      soldAt: sales.soldAt,
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(and(...conditions))
    .orderBy(desc(sales.soldAt))

  return rows
})
