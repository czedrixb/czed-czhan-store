import path from 'node:path'
import { mkdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), 'server/db/migrations')

async function main() {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    console.log(`Applying migrations to Postgres at ${new URL(databaseUrl).host} ...`)
    const client = postgres(databaseUrl, { max: 1 })
    const db = drizzlePostgres(client)
    await migratePostgres(db, { migrationsFolder: MIGRATIONS_FOLDER })
    await client.end()
  } else {
    const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DIR || '.data/pglite')
    mkdirSync(dataDir, { recursive: true })
    console.log(`Applying migrations to embedded PGlite at ${dataDir} ...`)
    const client = new PGlite(dataDir)
    const db = drizzlePglite(client)
    await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER })
    await client.close()
  }

  console.log('Migrations applied.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
