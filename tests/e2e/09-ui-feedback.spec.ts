import { test, expect } from '@playwright/test'
import { createProduct } from './helpers'

// Covers only what this change adds on top of the existing suite: the
// confirm-before-destructive-action sheet, the toast feedback system, and
// that both keep working with prefers-reduced-motion enabled.

test('voiding a receipt from Sales History requires confirmation, and can be cancelled', async ({ page, request: adminRequest }) => {
  const product = await createProduct(adminRequest, { name: 'HistVoidPay', costPrice: 500, sellingPrice: 1000, stock: 5 })
  await adminRequest.post('/api/sales', {
    data: { items: [{ productId: product.id, quantity: 1 }], cashReceived: 1000, submissionKey: `hist-void-${Date.now()}` },
  })

  await page.goto('/sales')
  const receipt = page.locator('li', { hasText: 'HistVoidPay' })
  await expect(receipt).toBeVisible()

  await receipt.getByText('Void', { exact: true }).click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()

  // Cancelling leaves the sale untouched.
  await page.getByTestId('confirm-cancel').click()
  await expect(page.getByTestId('confirm-dialog')).toBeHidden()
  await expect(receipt).not.toHaveClass(/opacity-40/)
  await expect(receipt.getByText('Void', { exact: true })).toBeVisible()

  // Accepting voids it and confirms with a success toast. The history list
  // only requests today's non-voided receipts, so it drops off the list on
  // reload rather than staying visible grayed out.
  await receipt.getByText('Void', { exact: true }).click()
  await page.getByTestId('confirm-accept').click()
  await expect(page.getByTestId('toast')).toHaveAttribute('data-tone', 'success')
  await expect(receipt).toHaveCount(0)
})

test('deactivating a product requires confirmation, then redirects with a success toast', async ({ page, request: adminRequest }) => {
  const product = await createProduct(adminRequest, { name: 'DeactivateMePlease', stock: 3 })
  await page.goto(`/products/${product.id}`)

  await page.getByRole('button', { name: 'Deactivate Product' }).click()
  await expect(page.getByTestId('confirm-dialog')).toContainText('DeactivateMePlease')

  // Cancelling stays on the product page and leaves it active.
  await page.getByTestId('confirm-cancel').click()
  await expect(page.getByTestId('confirm-dialog')).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`/products/${product.id}$`))

  await page.getByRole('button', { name: 'Deactivate Product' }).click()
  await page.getByTestId('confirm-accept').click()
  await expect(page).toHaveURL('/inventory')
  await expect(page.getByTestId('toast')).toHaveAttribute('data-tone', 'success')

  const refreshed = await (await adminRequest.get(`/api/products/${product.id}`)).json()
  expect(refreshed.isActive).toBe(false)
})

test('voiding an already-voided sale surfaces an error toast instead of failing silently', async ({ page, request: adminRequest }) => {
  const product = await createProduct(adminRequest, { name: 'ErrVoidPay', costPrice: 500, sellingPrice: 1000, stock: 5 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ErrVoidPay')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('10')
  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')

  // Void it out from under the page, so the UI is stale when the cashier taps Void.
  const sales = await (await adminRequest.get('/api/sales', { params: { range: 'today' } })).json()
  const sale = sales.find((s: { productName: string }) => s.productName === 'ErrVoidPay')
  await adminRequest.delete(`/api/sales/${sale.transactionId}`)

  await page.getByTestId('void-sale').click()
  await page.getByTestId('confirm-accept').click()

  const toast = page.getByTestId('toast')
  await expect(toast).toHaveAttribute('data-tone', 'error')
  await expect(page.getByTestId('sale-error')).toBeVisible()
})

test('completing an inventory count warns with the counted total before applying it', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'WarnCountMe', stock: 12 })

  await page.goto('/inventory/count')
  await page.getByRole('button', { name: '+ Start New Count' }).click()
  await expect(page).toHaveURL(/\/inventory\/count\/\d+$/)

  const row = page.locator('tr', { hasText: 'WarnCountMe' })
  await row.getByTestId('count-actual-input').fill('10')
  await row.getByTestId('count-actual-input').blur()

  await page.getByTestId('complete-count').click()
  await expect(page.getByTestId('confirm-dialog')).toContainText('1 product')
  await expect(page.getByTestId('confirm-dialog')).toContainText('cannot be undone')

  await page.getByTestId('confirm-accept').click()
  await expect(page.getByText('Completed')).toBeVisible()
  await expect(page.getByTestId('toast')).toHaveAttribute('data-tone', 'success')
})

test('a success toast auto-dismisses on its own', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'ToastTimeout', costPrice: 500, sellingPrice: 1000, stock: 5 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ToastTimeout')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('10')
  await page.getByTestId('save-sale').click()
  await page.getByTestId('void-sale').click()
  await page.getByTestId('confirm-accept').click()

  const toast = page.getByTestId('toast')
  await expect(toast).toBeVisible()
  await expect(toast).toBeHidden({ timeout: 6000 })
})

test('the confirm dialog and toast still work with prefers-reduced-motion enabled', async ({ page, request: adminRequest }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await createProduct(adminRequest, { name: 'ReducedMotionPay', costPrice: 500, sellingPrice: 1000, stock: 5 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ReducedMotionPay')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('10')
  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')

  await page.getByTestId('void-sale').click()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-accept').click()

  await expect(page.getByTestId('sale-summary')).toContainText('Voided. Stock restored.')
  await expect(page.getByTestId('toast')).toHaveAttribute('data-tone', 'success')
})
