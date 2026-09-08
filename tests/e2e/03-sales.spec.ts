import { test, expect } from '@playwright/test'
import { createProduct } from './helpers'

test('an unpriced product becomes sellable after being priced from the Needs Pricing queue', async ({ page, request }) => {
  const product = await createProduct(request, { name: 'Unpriced Snack', stock: 10 })

  await page.goto('/products/pricing')
  const row = page.locator('li', { hasText: 'Unpriced Snack' })
  await expect(row).toBeVisible()
  await row.getByPlaceholder('Cost ₱').fill('5')
  await row.getByPlaceholder('Sell ₱').fill('8')
  await row.getByRole('button', { name: 'Save' }).click()
  await expect(row).toHaveCount(0)

  const refreshed = await (await request.get(`/api/products/${product.id}`)).json()
  expect(refreshed.costPrice).toBe(500)
  expect(refreshed.sellingPrice).toBe(800)
})

test('recording a sale calculates revenue/profit and deducts stock (critical path)', async ({ page, request }) => {
  await createProduct(request, { name: 'CandyBar', variant: 'TestSKU', costPrice: 800, sellingPrice: 1000, stock: 28 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('CandyBar TestSKU')
  await page.getByTestId('search-result').first().click()

  await page.getByTestId('qty-increment').click()
  await page.getByTestId('qty-increment').click()
  await expect(page.getByTestId('qty-value')).toHaveText('3')

  await expect(page.getByTestId('sale-subtotal')).toHaveText('₱30.00')
  await expect(page.getByTestId('sale-profit')).toHaveText('₱6.00')

  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-toast')).toContainText('Stock: 28 → 25')

  const sales = await (await request.get('/api/sales', { params: { range: 'today' } })).json()
  const sale = sales.find((s: { productName: string }) => s.productName === 'CandyBar')
  expect(sale).toMatchObject({ quantity: 3, revenue: 3000, profit: 600 })
})

test('a later price change does not recalculate an already-recorded sale', async ({ page, request }) => {
  const product = await createProduct(request, { name: 'HistPrice', costPrice: 500, sellingPrice: 1000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('HistPrice')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('qty-increment').click()
  await expect(page.getByTestId('sale-subtotal')).toHaveText('₱20.00')
  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-toast')).toContainText('Stock: 10 → 8')

  await page.goto(`/products/${product.id}`)
  const sellingInput = page.getByLabel('Selling Price (₱)')
  await sellingInput.fill('12')
  await page.getByRole('button', { name: 'Save Details' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.goto('/sales')
  const entry = page.locator('li', { hasText: 'HistPrice' })
  await expect(entry).toContainText('₱20.00')
})

test('the bottom tab bar is reachable on a phone-sized viewport', async ({ page }) => {
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav).toBeVisible()
  for (const label of ['Home', 'Sale', 'Stock', 'Reports', 'More']) {
    await expect(nav.getByText(label, { exact: true })).toBeVisible()
  }
  await nav.getByText('Stock', { exact: true }).click()
  await expect(page).toHaveURL(/\/inventory$/)
})
