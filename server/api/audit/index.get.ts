import { desc, eq } from 'drizzle-orm'
import { auditLogs, users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 250)
  const db = useDb()

  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      description: auditLogs.description,
      createdAt: auditLogs.createdAt,
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
    })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.userId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit)
})
