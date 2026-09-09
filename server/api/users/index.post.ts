import { z } from 'zod'
import { users } from '../../db/schema'

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Use letters, numbers, dots, dashes, or underscores'),
  displayName: z.string().trim().min(1).max(100),
  password: z.string().min(6).max(200),
})

export default defineEventHandler(async (event) => {
  const data = await readValidated(event, createUserSchema)
  const actor = requireUser(event)
  const db = useDb()

  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ username: data.username.toLowerCase(), displayName: data.displayName, passwordHash: hashPassword(data.password) })
        .returning({ id: users.id, username: users.username, displayName: users.displayName, isActive: users.isActive, createdAt: users.createdAt })
      await recordAudit(tx, {
        userId: actor.id,
        action: 'CREATE',
        entityType: 'USER',
        entityId: created.id,
        description: `Created account for ${created.displayName} (@${created.username})`,
      })
      return created
    })
  } catch (error) {
    if (isUniqueViolation(error)) throw createError({ statusCode: 409, statusMessage: 'That username is already in use' })
    throw error
  }
})
