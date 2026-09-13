import path from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'
import { sql } from 'drizzle-orm'
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

export interface MigrationJournalEntry {
  tag: string
  when: number
}

/**
 * Pure diff: which journal entries (shipped in this build's migrations folder)
 * have no matching applied-migration timestamp. No I/O, so it's unit-testable
 * without a database - see findUnappliedRemoteMigrations for the impure wrapper.
 */
export function findUnappliedMigrations(journalEntries: MigrationJournalEntry[], appliedTimestamps: number[]): string[] {
  const applied = new Set(appliedTimestamps)
  return journalEntries.filter((entry) => !applied.has(entry.when)).map((entry) => entry.tag)
}

/**
 * For a remote (Postgres) database, where runMigrations() is never called on boot
 * (see the Nitro-bundle comment on the plugin that calls this), checks whether the
 * database has fallen behind the migrations shipped in this build - so drift is
 * logged loudly instead of surfacing later as an opaque "column does not exist"
 * query error. Returns null, rather than throwing, if the check can't be completed
 * (e.g. the migrations folder isn't present in this bundle); the caller should
 * still wrap this in try/catch, since the schema/table it queries could itself be
 * missing or unreachable.
 */
export async function findUnappliedRemoteMigrations(): Promise<string[] | null> {
  const db = useDb()
  if (_kind !== 'postgres') return null

  let journal: { entries: MigrationJournalEntry[] }
  try {
    const journalPath = path.join(MIGRATIONS_FOLDER, 'meta/_journal.json')
    journal = JSON.parse(readFileSync(journalPath, 'utf-8'))
  } catch {
    return null
  }

  const rows = await (db as PostgresDb).execute<{ created_at: string | number }>(
    sql`select created_at from drizzle.__drizzle_migrations`,
  )
  const appliedTimestamps = Array.from(rows).map((row) => Number(row.created_at))
  return findUnappliedMigrations(journal.entries, appliedTimestamps)
}
