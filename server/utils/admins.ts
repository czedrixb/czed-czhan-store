import { and, eq, ne, sql } from 'drizzle-orm'
import { users } from '../db/schema'

// PGlite and postgres-js expose compatible transaction methods with different
// concrete types, so this accepts either through the same shared surface used
// by recordAudit (server/utils/audit.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminDb = any

/**
 * Throws a 409 unless at least one *other* active admin remains — guards
 * against an admin demoting or deactivating the last active admin, whether
 * that admin is themselves or someone else.
 */
export async function assertNotLastActiveAdmin(tx: AdminDb, userId: number) {
  const [row] = await tx
    .select({ others: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, 'ADMIN'), eq(users.isActive, true), ne(users.id, userId)))

  if ((row?.others ?? 0) < 1) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This is the last active admin - promote another admin first',
    })
  }
}
