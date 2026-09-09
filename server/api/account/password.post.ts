import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { users } from '../../db/schema'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(6).max(200),
})

export default defineEventHandler(async (event) => {
  const data = await readValidated(event, changePasswordSchema)
  const actor = requireUser(event)
  const db = useDb()

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id))
  if (!row || !verifyPassword(data.currentPassword, row.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Current password is incorrect' })
  }
  if (data.newPassword === data.currentPassword) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a password different from your current one' })
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: hashPassword(data.newPassword), mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, actor.id))

    await recordAudit(tx, {
      userId: actor.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: actor.id,
      description: `${actor.displayName} changed their password`,
    })
  })

  return { ok: true }
})
