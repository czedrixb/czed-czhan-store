import { and, desc, eq, gte, isNull, lt, sql } from 'drizzle-orm'
import type { DateRange } from './dates'
import { products, sales, saleTransactions } from '../db/schema'

export async function getSalesTotals(range: DateRange) {
  const db = useDb()
  const [totals] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${saleTransactions.revenue}), 0)`,
      profit: sql<number>`coalesce(sum(${saleTransactions.profit}), 0)`,
      transactions: sql<number>`count(*)`,
    })
    .from(saleTransactions)
    .where(
      and(
        gte(saleTransactions.soldAt, range.start),
        lt(saleTransactions.soldAt, range.end),
        isNull(saleTransactions.voidedAt),
      ),
    )

  const [itemTotals] = await db
    .select({
      itemsSold: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
    })
    .from(sales)
    .innerJoin(saleTransactions, eq(saleTransactions.id, sales.transactionId))
    .where(
      and(
        gte(saleTransactions.soldAt, range.start),
        lt(saleTransactions.soldAt, range.end),
        isNull(saleTransactions.voidedAt),
      ),
    )

  const revenue = Number(totals?.revenue ?? 0)
  const profit = Number(totals?.profit ?? 0)

  return {
    revenue,
    cost: revenue - profit,
    profit,
    itemsSold: Number(itemTotals?.itemsSold ?? 0),
    transactions: Number(totals?.transactions ?? 0),
  }
}

export async function getTopProducts(range: DateRange, limit = 5) {
  const db = useDb()
  return db
    .select({
      productId: products.id,
      name: products.name,
      variant: products.variant,
      quantitySold: sql<number>`coalesce(sum(${sales.quantity}), 0)`.as('quantity_sold'),
    })
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .innerJoin(saleTransactions, eq(saleTransactions.id, sales.transactionId))
    .where(
      and(
        gte(saleTransactions.soldAt, range.start),
        lt(saleTransactions.soldAt, range.end),
        isNull(saleTransactions.voidedAt),
      ),
    )
    .groupBy(products.id)
    .orderBy(desc(sql`quantity_sold`))
    .limit(limit)
}

export async function getLowestStockProducts(limit = 5) {
  const db = useDb()
  return db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(products.stock)
    .limit(limit)
}
