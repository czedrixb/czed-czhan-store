import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import * as schema from '../db/schema'

type PgliteDb = ReturnType<typeof drizzlePglite<typeof schema>>
type PostgresDb = ReturnType<typeof drizzlePostgres<typeof schema>>
type Db = PgliteDb | PostgresDb

let _db: Db | undefined
let _kind: 'pglite' | 'postgres' | undefined

// Resolved relative to process.cwd() (the repo root when running `nuxt dev`,
// `nuxt preview`, or any of the tsx scripts) rather than import.meta.url, which
// would point into Nitro's bundled output and not the source migrations folder.
const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'server/db/migrations')

/**
 * Picks the driver at startup: a real Postgres connection string (Supabase in
 * production) uses postgres-js, otherwise falls back to an embedded PGlite
 * database on disk — no external service required for local dev.
 * Both drivers speak the same Drizzle query API, so no calling code branches on this.
 */
export function useDb(): Db {
  if (_db) return _db

  const config = useRuntimeConfig()

  if (config.databaseUrl) {
    const client = postgres(config.databaseUrl, { prepare: false })
    _db = drizzlePostgres(client, { schema })
    _kind = 'postgres'
  } else {
    const dataDir = path.resolve(process.cwd(), config.pgliteDir || '.data/pglite')
    mkdirSync(dataDir, { recursive: true })
    const client = new PGlite(dataDir)
    _db = drizzlePglite(client, { schema })
    _kind = 'pglite'
  }

  return _db
}

/** Applies pending SQL migrations to the singleton database. */
export async function runMigrations() {
  const db = useDb()
  if (_kind === 'postgres') {
    await migratePostgres(db as PostgresDb, { migrationsFolder: MIGRATIONS_FOLDER })
  } else {
    await migratePglite(db as PgliteDb, { migrationsFolder: MIGRATIONS_FOLDER })
  }
}

/** Test-only: a fresh, migrated, in-memory PGlite instance, bypassing the singleton. */
export async function createInMemoryDb() {
  const client = new PGlite()
  const db = drizzlePglite(client, { schema })
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER })
  return db
}
