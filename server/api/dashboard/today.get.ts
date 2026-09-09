import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import { products, sales, saleTransactions } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const { start, end } = storeDayRange()

  const [totals] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${saleTransactions.revenue}), 0)`,
      profit: sql<number>`coalesce(sum(${saleTransactions.profit}), 0)`,
      transactions: sql<number>`count(*)`,
    })
    .from(saleTransactions)
    .where(and(gte(saleTransactions.soldAt, start), lt(saleTransactions.soldAt, end), isNull(saleTransactions.voidedAt)))

  const [itemTotals] = await db
    .select({
      itemsSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
    })
    .from(sales)
    .innerJoin(saleTransactions, eq(saleTransactions.id, sales.transactionId))
    .where(and(gte(saleTransactions.soldAt, start), lt(saleTransactions.soldAt, end), isNull(saleTransactions.voidedAt)))

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
    itemsSold: Number(itemTotals?.itemsSold ?? 0),
    transactions: Number(totals?.transactions ?? 0),
    lowStock,
  }
})
