import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { users } from '../db/schema'

export interface SessionUser {
  id: number
  username: string
  displayName: string
}

export async function resolveSessionUser(event: H3Event): Promise<SessionUser | null> {
  const config = useRuntimeConfig()
  const userId = verifySessionToken(getCookie(event, SESSION_COOKIE_NAME), config.sessionSecret)
  if (!userId) return null

  const db = useDb()
  const [user] = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
  return user ?? null
}

export function requireUser(event: H3Event): SessionUser {
  const user = event.context.user as SessionUser | undefined
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}
