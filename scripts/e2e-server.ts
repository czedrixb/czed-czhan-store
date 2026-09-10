import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { hashPassword } from '../server/utils/auth'

// E2E tests run against a real production build rather than `nuxt dev` —
// dev mode lazily compiles each route on first request, which raced with
// Playwright's interactions and intermittently wiped in-progress form state.
// A disposable, migrated PGlite database per run keeps tests off the
// developer's real .data/pglite database and starting from a clean slate.
const dataDir = mkdtempSync(path.join(tmpdir(), 'sari-sari-e2e-'))

export const E2E_PASSWORD = '1234test'

const env = {
  ...process.env,
  PORT: '3211',
  PGLITE_DIR: dataDir,
  STORE_USERNAME: 'admin',
  STORE_DISPLAY_NAME: 'Test Administrator',
  STORE_PASSWORD_HASH: hashPassword(E2E_PASSWORD),
  STORE_PIN_HASH: '',
  SESSION_SECRET: 'e2e-test-secret-not-for-production',
  DATABASE_URL: '',
  NODE_OPTIONS: '',
}

const build = spawnSync(process.execPath, [path.resolve(process.cwd(), 'node_modules/nuxt/bin/nuxt.mjs'), 'build'], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
})

if (build.status !== 0) {
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(build.status ?? 1)
}

const migration = spawnSync(process.execPath, ['--import', 'tsx', path.resolve(process.cwd(), 'scripts/migrate.ts')], {
  cwd: process.cwd(),
  env: { ...env, NODE_OPTIONS: process.env.NODE_OPTIONS || '' },
  stdio: 'inherit',
})

if (migration.status !== 0) {
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(migration.status ?? 1)
}

const serverEntry = path.resolve(process.cwd(), '.output/server/index.mjs')
const child = spawn(process.execPath, [serverEntry], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
})

function shutdown() {
  child.kill()
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
child.on('exit', (code) => {
  rmSync(dataDir, { recursive: true, force: true })
  process.exit(code ?? 0)
})
