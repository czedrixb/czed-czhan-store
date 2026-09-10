import { test, expect } from '@playwright/test'
import { createProduct } from './helpers'

test('product search placeholder clears its leading icon', async ({ page }) => {
  await page.goto('/sales/new')

  const search = page.getByPlaceholder('Search product...')
  await expect(search).toBeVisible()

  await expect(search).toHaveCSS('padding-left', '52px')
  const [searchBox, iconBox] = await Promise.all([search.boundingBox(), page.locator('.relative > svg').boundingBox()])
  expect(searchBox).not.toBeNull()
  expect(iconBox).not.toBeNull()
  expect(searchBox!.x + 52).toBeGreaterThan(iconBox!.x + iconBox!.width + 12)
})

test('products and bottom navigation stay tappable on a populated mobile inventory', async ({ page, request }) => {
  const product = await createProduct(request, { name: `Nav Tap ${Date.now()}`, stock: 12 })
  await Promise.all(Array.from({ length: 12 }, (_, index) => createProduct(request, {
    name: `Scrollable Inventory ${Date.now()} ${index}`,
    stock: 12,
  })))

  await page.goto('/inventory')
  const productLink = page.getByRole('link', { name: new RegExp(product.name) })
  await expect(productLink).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect(page.getByPlaceholder('Search inventory...')).toBeInViewport()
  const screenshotPath = process.env.NAV_SCREENSHOT_PATH
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true })

  await productLink.tap()
  await expect(page).toHaveURL(`/products/${product.id}`)

  await page.goto('/inventory')
  await expect(page.getByRole('link', { name: new RegExp(product.name) })).toBeVisible()
  await nav.getByRole('link', { name: 'Home' }).tap()

  await expect(page).toHaveURL('/')
})

test('receiving stock increases the product quantity', async ({ page, request }) => {
  const product = await createProduct(request, { name: 'RestockMe', stock: 5 })

  await page.goto(`/products/${product.id}`)
  await expect(page.getByText('5', { exact: true })).toBeVisible()

  await page.getByPlaceholder('Quantity received').fill('24')
  await page.getByRole('button', { name: '+ Add' }).click()
  await expect(page.getByText('Stock received.')).toBeVisible()

  const refreshed = await (await request.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(29)
})

test('a weekly inventory count computes differences and applies them on completion', async ({ page, request }) => {
  const product = await createProduct(request, { name: 'CountMe', stock: 28 })

  await page.goto('/inventory/count')
  await page.getByRole('button', { name: '+ Start New Count' }).click()
  await expect(page).toHaveURL(/\/inventory\/count\/\d+$/)

  const row = page.locator('tr', { hasText: 'CountMe' })
  await expect(row).toBeVisible()
  await expect(row.locator('td').nth(1)).toHaveText('28')

  await row.getByTestId('count-actual-input').fill('25')
  await row.getByTestId('count-actual-input').blur()
  await expect(row.locator('td').nth(3)).toHaveText('-3')

  await page.getByTestId('complete-count').click()
  await page.getByTestId('confirm-accept').click()
  await expect(page.getByText('Completed')).toBeVisible()

  const refreshed = await (await request.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(25)
})
