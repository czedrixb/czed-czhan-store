import { asc } from 'drizzle-orm'
import { users } from '../../db/schema'

export default defineEventHandler(async () => {
  return useDb()
    .select({ id: users.id, username: users.username, displayName: users.displayName, isActive: users.isActive, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.displayName))
})
