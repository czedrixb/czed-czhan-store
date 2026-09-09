import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { userRoles, users } from '../../db/schema'

const updateUserSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional(),
    username: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dots, dashes, or underscores')
      .optional(),
    role: z.enum(userRoles).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })

export default defineEventHandler(async (event) => {
  const id = parseIdParam(event)
  const data = await readValidated(event, updateUserSchema)
  const actor = requireAdmin(event)
  const db = useDb()

  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(users).where(eq(users.id, id))
      if (!before) throw createError({ statusCode: 404, statusMessage: 'Account not found' })

      const losesAdmin =
        before.role === 'ADMIN' &&
        before.isActive &&
        (data.role === 'MEMBER' || data.isActive === false)
      if (losesAdmin) await assertNotLastActiveAdmin(tx, id)

      const [updated] = await tx
        .update(users)
        .set({
          ...data,
          username: data.username ? data.username.toLowerCase() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
          mustChangePassword: users.mustChangePassword,
          createdAt: users.createdAt,
        })

      const profileChanges: string[] = []
      if (data.displayName && data.displayName !== before.displayName) profileChanges.push(`name to ${updated.displayName}`)
      if (data.username && updated.username !== before.username) profileChanges.push(`username to @${updated.username}`)
      if (profileChanges.length > 0) {
        await recordAudit(tx, {
          userId: actor.id,
          action: 'UPDATE',
          entityType: 'USER',
          entityId: updated.id,
          description: `Updated ${profileChanges.join(' and ')} for ${before.displayName} (@${before.username})`,
        })
      }

      if (data.role && data.role !== before.role) {
        await recordAudit(tx, {
          userId: actor.id,
          action: 'ROLE_CHANGE',
          entityType: 'USER',
          entityId: updated.id,
          description: `Changed ${updated.displayName} (@${updated.username}) from ${before.role} to ${updated.role}`,
        })
      }

      if (typeof data.isActive === 'boolean' && data.isActive !== before.isActive) {
        await recordAudit(tx, {
          userId: actor.id,
          action: data.isActive ? 'REACTIVATE' : 'DEACTIVATE',
          entityType: 'USER',
          entityId: updated.id,
          description: data.isActive
            ? `Reactivated account for ${updated.displayName} (@${updated.username})`
            : `Deactivated account for ${updated.displayName} (@${updated.username})`,
        })
      }

      return updated
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'That username is already in use' })
    throw error
  }
})
