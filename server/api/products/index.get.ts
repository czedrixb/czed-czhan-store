import { and, asc, ilike, isNull, or, sql } from 'drizzle-orm'
import { products } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDb()

  const conditions = []

  if (query.q && typeof query.q === 'string' && query.q.trim()) {
    const term = `%${query.q.trim()}%`
    // Match name or variant individually (e.g. searching just "Blanca"), and also
    // the two combined (e.g. searching the full "Kopiko Blanca" as shown in the UI).
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.variant, term),
        ilike(sql`(${products.name} || ' ' || ${products.variant})`, term),
      ),
    )
  }

  if (query.active === 'true') conditions.push(sql`${products.isActive} = true`)
  if (query.active === 'false') conditions.push(sql`${products.isActive} = false`)

  if (query.lowStock === 'true') {
    conditions.push(sql`${products.stock} <= ${products.lowStockThreshold}`)
  }

  if (query.needsPricing === 'true') {
    conditions.push(or(isNull(products.costPrice), isNull(products.sellingPrice)))
  }

  const rows = await db
    .select()
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(products.name), asc(products.variant))

  return rows
})
