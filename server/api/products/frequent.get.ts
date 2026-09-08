import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm'
import { products, sales } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 6, 20)
  const db = useDb()

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      product: products,
      totalSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`.as('total_sold'),
    })
    .from(products)
    .leftJoin(
      sales,
      and(eq(sales.productId, products.id), gte(sales.soldAt, since), isNull(sales.voidedAt)),
    )
    .where(and(eq(products.isActive, true), sql`${products.costPrice} is not null`, sql`${products.sellingPrice} is not null`))
    .groupBy(products.id)
    .orderBy(desc(sql`total_sold`))
    .limit(limit)

  return rows
    .filter((r) => r.totalSold > 0)
    .map((r) => r.product)
})
