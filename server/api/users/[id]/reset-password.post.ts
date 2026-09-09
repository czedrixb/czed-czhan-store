import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../../db/schema'

const resetSchema = z.object({
  password: z.string().min(6).max(200),
})

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const data = await readValidated(event, resetSchema)
  const actor = requireAdmin(event)

  if (id === actor.id) {
    throw createError({ statusCode: 403, statusMessage: 'Use Change Password to update your own password' })
  }

  const db = useDb()

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ passwordHash: hashPassword(data.password), mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, username: users.username, displayName: users.displayName })

    if (!updated) throw createError({ statusCode: 404, statusMessage: 'Account not found' })

    await recordAudit(tx, {
      userId: actor.id,
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: updated.id,
      description: `Reset access for ${updated.displayName} (@${updated.username})`,
    })

    return { ok: true }
  })
})
