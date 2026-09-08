import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { products, sales } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const { start, end } = storeDayRange()

  const [totals] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${sales.revenue}), 0)`,
      profit: sql<number>`coalesce(sum(${sales.profit}), 0)`,
      itemsSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
      transactions: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(gte(sales.soldAt, start), lt(sales.soldAt, end), isNull(sales.voidedAt)))

  const lowStock = await db
    .select()
    .from(products)
    .where(and(eq(products.isActive, true), sql`${products.stock} <= ${products.lowStockThreshold}`))
    .orderBy(asc(products.stock))
    .limit(20)

  const revenue = Number(totals?.revenue ?? 0)
  const profit = Number(totals?.profit ?? 0)

  return {
    date: storeDateKey(),
    revenue,
    cost: revenue - profit,
    profit,
    itemsSold: Number(totals?.itemsSold ?? 0),
    transactions: Number(totals?.transactions ?? 0),
    lowStock,
  }
})
