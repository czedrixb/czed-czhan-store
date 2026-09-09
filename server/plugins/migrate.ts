import { sql } from 'drizzle-orm'
import { users } from '../db/schema'

export default defineNitroPlugin(async () => {
  await runMigrations()

  const config = useRuntimeConfig()
  if (config.storePasswordHash) {
    const db = useDb()
    const username = String(config.storeUsername).trim().toLowerCase()
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1)
    if (!existing) {
      await db.insert(users).values({
        username,
        displayName: String(config.storeDisplayName).trim() || username,
        passwordHash: config.storePasswordHash,
      })
    } else {
      await db
        .update(users)
        .set({ passwordHash: config.storePasswordHash, updatedAt: new Date() })
        .where(sql`lower(${users.username}) = lower(${username})`)
    }
  }
})
