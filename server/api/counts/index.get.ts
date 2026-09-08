import { desc } from 'drizzle-orm'
import { inventoryCounts } from '../../db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  return db.select().from(inventoryCounts).orderBy(desc(inventoryCounts.countDate))
})
