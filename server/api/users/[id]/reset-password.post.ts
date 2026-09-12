import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../../db/schema'

const resetSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const data = await readValidated(event, resetSchema)
  const actor = requireAdmin(event)

  if (id === actor.id) {
    throw createError({ statusCode: 403, statusMessage: 'Use Change Password to update your own password' })
  }

  const db = useDb()

  // Bumping session_epoch invalidates every token minted before this write -
  // the target's existing cookie stops verifying on their very next request,
  // regardless of how much of its 30-day TTL was left.
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: hashPassword(data.password),
      mustChangePassword: true,
      sessionEpoch: sql`${users.sessionEpoch} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning({ id: users.id, username: users.username, displayName: users.displayName })

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Account not found' })

  return { ok: true }
})
