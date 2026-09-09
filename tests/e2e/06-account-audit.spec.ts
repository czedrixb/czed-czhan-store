import path from 'node:path'
import { test, expect } from '@playwright/test'

const screenshotDir = process.env.AUDIT_SCREENSHOT_DIR

test('a named account is shown on actions in the audit log', async ({ page, request }) => {
  const suffix = Date.now().toString().slice(-6)
  const username = `clerk${suffix}`
  const displayName = `Clerk ${suffix}`
  const password = 'clerk-pass-123'

  const account = await request.post('/api/users', { data: { username, displayName, password } })
  expect(account.ok()).toBeTruthy()

  await page.context().clearCookies()
  await page.goto('/login')
  await expect(page.getByText('Sign in to your account')).toBeVisible()
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, 'after-account-login.png'), fullPage: true })

  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/')

  const productName = `Audit Product ${suffix}`
  const product = await page.request.post('/api/products', {
    data: { name: productName, variant: '', costPrice: 100, sellingPrice: 150, stock: 0, lowStockThreshold: 5 },
  })
  expect(product.ok()).toBeTruthy()

  await page.goto('/settings/audit')
  const entry = page.getByRole('listitem').filter({ hasText: `Created product ${productName}` })
  await expect(entry).toContainText(displayName)
  await expect(entry).toContainText(`@${username}`)
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, 'after-audit-log.png'), fullPage: true })
})
