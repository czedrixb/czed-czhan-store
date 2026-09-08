import { request } from '@playwright/test'
import path from 'node:path'

export const STORAGE_STATE_PATH = path.resolve(process.cwd(), 'tests/e2e/.auth/storage-state.json')
export const E2E_PIN = '1234'
export const BASE_URL = 'http://localhost:3211'

export default async function globalSetup() {
  const context = await request.newContext({ baseURL: BASE_URL })
  const response = await context.post('/api/auth/login', { data: { pin: E2E_PIN } })
  if (!response.ok()) {
    throw new Error(`E2E login failed: ${response.status()} ${await response.text()}`)
  }
  await context.storageState({ path: STORAGE_STATE_PATH })
  await context.dispose()
}
