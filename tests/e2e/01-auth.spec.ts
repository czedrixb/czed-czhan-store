import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('unauthenticated visitors are redirected to the PIN screen', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Enter Store PIN')).toBeVisible()
})

test('an incorrect PIN is rejected', async ({ page }) => {
  await page.goto('/login')
  for (const digit of ['9', '9', '9', '9']) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page.getByText('Incorrect PIN')).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})

test('the correct PIN admits the user to the dashboard', async ({ page }) => {
  await page.goto('/login')
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Enter' }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByText("Today's Summary")).toBeVisible()
})
