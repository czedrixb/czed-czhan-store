import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('unauthenticated visitors are redirected to the account sign-in screen', async ({ page }) => {
  await page.goto('/')
  // The intended destination round-trips through ?redirect= so sign-in can
  // send the user back where they meant to go.
  await expect(page).toHaveURL(/\/login\?redirect=%2F$|\/login\?redirect=\/$/)
  await expect(page.getByText('Sign in to your account')).toBeVisible()
})

test('incorrect account credentials are rejected', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page.getByText('Incorrect username or password')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('the correct account credentials admit the user to the dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('1234test')
  if (process.env.AUTH_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.AUTH_SCREENSHOT_DIR}/before-http-login.png`, fullPage: true })
  }
  await page.getByRole('button', { name: 'Sign In' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByText("Today's Summary")).toBeVisible()

  if (process.env.AUTH_SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.AUTH_SCREENSHOT_DIR}/after-http-login.png`, fullPage: true })
  }

  const sessionCookie = (await page.context().cookies()).find(({ name }) => name === 'sari_session')
  expect(sessionCookie).toMatchObject({ httpOnly: true, secure: false, sameSite: 'Lax' })

  const dashboardResponse = await page.request.get('/api/dashboard/today')
  expect(dashboardResponse.status()).toBe(200)
})
