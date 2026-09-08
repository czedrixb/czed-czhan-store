import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: './tests/e2e/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3211',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], storageState: './tests/e2e/.auth/storage-state.json' },
    },
  ],
  webServer: {
    command: 'npx tsx scripts/e2e-server.ts',
    url: 'http://localhost:3211/api/auth/session',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
