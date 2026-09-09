import { sql } from 'drizzle-orm'
import { users } from '../db/schema'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // Only auto-migrate the embedded PGlite database (local dev/preview). The
  // migrations SQL folder isn't traced into the Nitro serverless bundle, so
  // this would crash on Vercel; production Postgres is migrated ahead of
  // deploy via `npm run db:migrate` (see README).
  if (!config.databaseUrl) {
    await runMigrations()
  }

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
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      })
    } else {
      // Re-pinned on every boot: this account is the documented owner-recovery
      // path (set STORE_PASSWORD_HASH and restart), so it must always come
      // back as an active, unflagged admin — it cannot be demoted,
      // deactivated, or left flagged from the UI while this env var is set.
      await db
        .update(users)
        .set({
          passwordHash: config.storePasswordHash,
          role: 'ADMIN',
          isActive: true,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(sql`lower(${users.username}) = lower(${username})`)
    }
  }
})
