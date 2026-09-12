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
  requireAdmin(event)
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

      return updated
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'That username is already in use' })
    throw error
  }
})
