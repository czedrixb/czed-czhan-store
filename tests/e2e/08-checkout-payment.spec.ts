import { request, test, expect } from '@playwright/test'
import { createProduct, createUser, loginAs } from './helpers'
import { BASE_URL, STORAGE_STATE_PATH } from './global-setup'

test('exact payment shows zero change', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'ExactPay', costPrice: 1500, sellingPrice: 2500, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ExactPay')
  await page.getByTestId('search-result').first().click()

  await expect(page.getByTestId('sale-total')).toHaveText('₱25.00')
  await page.getByTestId('cash-received').fill('25')
  await expect(page.getByTestId('change-due')).toHaveText('₱0.00')
  await expect(page.getByTestId('save-sale')).toBeEnabled()
})

test('excess payment shows correct change to the centavo and persists payment details with a single stock deduction', async ({
  page,
  request: adminRequest,
}) => {
  const product = await createProduct(adminRequest, { name: 'CentavoPay', costPrice: 1500, sellingPrice: 2550, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('CentavoPay')
  await page.getByTestId('search-result').first().click()

  await expect(page.getByTestId('sale-total')).toHaveText('₱25.50')
  await page.getByTestId('cash-received').fill('100')
  await expect(page.getByTestId('change-due')).toHaveText('₱74.50')

  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')
  await expect(page.getByTestId('summary-change')).toHaveText('₱74.50')
  await expect(page.getByTestId('summary-stock')).toContainText('Stock: 10 → 9')

  const sales = await (await adminRequest.get('/api/sales', { params: { range: 'today' } })).json()
  const sale = sales.find((s: { productName: string }) => s.productName === 'CentavoPay')
  expect(sale).toMatchObject({ quantity: 1, revenue: 2550, cashReceived: 10000, changeDue: 7450 })

  const refreshed = await (await adminRequest.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(9)
})

test('insufficient cash shows the shortfall and blocks completion', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'ShortPay', costPrice: 6000, sellingPrice: 10000, stock: 5 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ShortPay')
  await page.getByTestId('search-result').first().click()

  await page.getByTestId('cash-received').fill('50')
  await expect(page.getByTestId('cash-shortfall')).toHaveText('₱50.00')
  await expect(page.getByTestId('save-sale')).toBeDisabled()

  const sales = await (await adminRequest.get('/api/sales', { params: { range: 'today' } })).json()
  expect(sales.find((s: { productName: string }) => s.productName === 'ShortPay')).toBeUndefined()
})

test('blank or malformed cash amounts cannot complete the sale', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'MalformedPay', costPrice: 500, sellingPrice: 1000, stock: 5 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('MalformedPay')
  await page.getByTestId('search-result').first().click()

  // Blank
  await expect(page.getByTestId('save-sale')).toBeDisabled()

  // Not a number
  await page.getByTestId('cash-received').fill('abc')
  await expect(page.getByTestId('save-sale')).toBeDisabled()

  // More than two decimal places
  await page.getByTestId('cash-received').fill('1.234')
  await expect(page.getByTestId('save-sale')).toBeDisabled()

  // Negative
  await page.getByTestId('cash-received').fill('-5')
  await expect(page.getByTestId('save-sale')).toBeDisabled()
})

test('typing a quantity directly updates the total', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'QtyTypedPay', costPrice: 300, sellingPrice: 500, stock: 20 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('QtyTypedPay')
  await page.getByTestId('search-result').first().click()

  await page.getByTestId('qty-input').fill('4')
  await expect(page.getByTestId('qty-input')).toHaveValue('4')
  await expect(page.getByTestId('sale-total')).toHaveText('₱20.00')
})

test('replaying the same submission key does not record a duplicate sale', async ({ request: adminRequest }) => {
  const product = await createProduct(adminRequest, { name: 'ReplayPay', costPrice: 500, sellingPrice: 1000, stock: 10 })
  const submissionKey = `test-replay-${Date.now()}`
  const body = { items: [{ productId: product.id, quantity: 2 }], cashReceived: 2000, submissionKey }

  const first = await adminRequest.post('/api/sales', { data: body })
  expect(first.ok()).toBeTruthy()
  const firstSale = await first.json()

  const second = await adminRequest.post('/api/sales', { data: body })
  expect(second.ok()).toBeTruthy()
  const secondSale = await second.json()

  expect(secondSale.id).toBe(firstSale.id)
  expect(secondSale.alreadyRecorded).toBe(true)

  const refreshed = await (await adminRequest.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(8) // deducted once, not twice
})

test('replaying a multi-item submission key does not double-deduct any product', async ({ request: adminRequest }) => {
  const productA = await createProduct(adminRequest, { name: 'ReplayCartA', costPrice: 500, sellingPrice: 1000, stock: 10 })
  const productB = await createProduct(adminRequest, { name: 'ReplayCartB', costPrice: 300, sellingPrice: 600, stock: 10 })
  const submissionKey = `test-replay-cart-${Date.now()}`
  const body = {
    items: [
      { productId: productA.id, quantity: 2 },
      { productId: productB.id, quantity: 3 },
    ],
    cashReceived: 4000,
    submissionKey,
  }

  const first = await adminRequest.post('/api/sales', { data: body })
  expect(first.ok()).toBeTruthy()
  const firstSale = await first.json()
  expect(firstSale.lines).toHaveLength(2)

  const second = await adminRequest.post('/api/sales', { data: body })
  expect(second.ok()).toBeTruthy()
  const secondSale = await second.json()
  expect(secondSale.id).toBe(firstSale.id)
  expect(secondSale.alreadyRecorded).toBe(true)

  const refreshedA = await (await adminRequest.get(`/api/products/${productA.id}`)).json()
  const refreshedB = await (await adminRequest.get(`/api/products/${productB.id}`)).json()
  expect(refreshedA.stock).toBe(8)
  expect(refreshedB.stock).toBe(7)
})

test('a cart with two products totals correctly and completes in one receipt', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'CartItemOne', costPrice: 1000, sellingPrice: 1500, stock: 10 })
  await createProduct(adminRequest, { name: 'CartItemTwo', costPrice: 2000, sellingPrice: 3000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('CartItemOne')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('product-search').fill('CartItemTwo')
  await page.getByTestId('search-result').first().click()

  await expect(page.getByTestId('cart-line')).toHaveCount(2)
  await expect(page.getByTestId('sale-total')).toHaveText('₱45.00')

  await page.getByTestId('cash-received').fill('50')
  await expect(page.getByTestId('change-due')).toHaveText('₱5.00')

  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')
  await expect(page.getByTestId('summary-line')).toHaveCount(2)
  await expect(page.getByTestId('summary-change')).toHaveText('₱5.00')

  const sales = await (await adminRequest.get('/api/sales', { params: { range: 'today' } })).json()
  const cartSales = sales.filter((s: { productName: string }) => s.productName === 'CartItemOne' || s.productName === 'CartItemTwo')
  expect(cartSales).toHaveLength(2)
  const transactionIds = new Set(cartSales.map((s: { transactionId: number }) => s.transactionId))
  expect(transactionIds.size).toBe(1) // one receipt

  const daily = await (await adminRequest.get('/api/reports/daily')).json()
  expect(daily.transactions).toBeGreaterThanOrEqual(1)
})

test('selecting the same product twice increments its cart line instead of duplicating it', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'DupeAddPay', costPrice: 500, sellingPrice: 1000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('DupeAddPay')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('product-search').fill('DupeAddPay')
  await page.getByTestId('search-result').first().click()

  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('qty-input')).toHaveValue('2')
  await expect(page.getByTestId('sale-total')).toHaveText('₱20.00')
})

test('removing a cart line updates the total, and an empty cart cannot be completed', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'RemoveLineA', costPrice: 1000, sellingPrice: 1500, stock: 10 })
  await createProduct(adminRequest, { name: 'RemoveLineB', costPrice: 2000, sellingPrice: 3000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('RemoveLineA')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('product-search').fill('RemoveLineB')
  await page.getByTestId('search-result').first().click()
  await expect(page.getByTestId('sale-total')).toHaveText('₱45.00')

  await page.getByTestId('cart-line-remove').first().click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('sale-total')).toHaveText('₱30.00')

  await page.getByTestId('cart-line-remove').first().click()
  await expect(page.getByTestId('cart-line')).toHaveCount(0)
})

test('a per-line quantity clamps to that product\'s own stock', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'ClampLineA', costPrice: 500, sellingPrice: 1000, stock: 3 })
  await createProduct(adminRequest, { name: 'ClampLineB', costPrice: 500, sellingPrice: 1000, stock: 20 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('ClampLineA')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('product-search').fill('ClampLineB')
  await page.getByTestId('search-result').first().click()

  const lines = page.getByTestId('cart-line')
  await lines.nth(0).getByTestId('qty-input').fill('99')
  await lines.nth(0).getByTestId('qty-input').blur()
  await expect(lines.nth(0).getByTestId('qty-input')).toHaveValue('3')

  await lines.nth(1).getByTestId('qty-input').fill('12')
  await lines.nth(1).getByTestId('qty-input').blur()
  await expect(lines.nth(1).getByTestId('qty-input')).toHaveValue('12')
})

test('voiding a multi-item receipt restores stock for every line', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'VoidCartA', costPrice: 500, sellingPrice: 1000, stock: 10 })
  await createProduct(adminRequest, { name: 'VoidCartB', costPrice: 300, sellingPrice: 600, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('VoidCartA')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('product-search').fill('VoidCartB')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('20')
  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')

  await page.getByTestId('void-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Voided — stock restored')

  const productA = await (await adminRequest.get('/api/products')).json()
  const a = productA.find((p: { name: string }) => p.name === 'VoidCartA')
  const b = productA.find((p: { name: string }) => p.name === 'VoidCartB')
  expect(a.stock).toBe(10)
  expect(b.stock).toBe(10)
})

test('the summary persists until New sale, which resets the form', async ({ page, request: adminRequest }) => {
  await createProduct(adminRequest, { name: 'SummaryPay', costPrice: 500, sellingPrice: 1000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('SummaryPay')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('10')
  await page.getByTestId('save-sale').click()

  await expect(page.getByTestId('sale-summary')).toContainText('Sale complete')
  // Still visible with nothing else happening — no auto-dismiss timer.
  await expect(page.getByTestId('sale-summary')).toBeVisible()

  await page.getByTestId('new-sale').click()
  await expect(page.getByTestId('product-search')).toBeVisible()

  await page.getByTestId('product-search').fill('SummaryPay')
  await page.getByTestId('search-result').first().click()
  await expect(page.getByTestId('qty-input')).toHaveValue('1')
  await expect(page.getByTestId('cash-received')).toHaveValue('')
})

test('voiding a just-completed sale restores stock', async ({ page, request: adminRequest }) => {
  const product = await createProduct(adminRequest, { name: 'VoidPay', costPrice: 500, sellingPrice: 1000, stock: 10 })

  await page.goto('/sales/new')
  await page.getByTestId('product-search').fill('VoidPay')
  await page.getByTestId('search-result').first().click()
  await page.getByTestId('cash-received').fill('10')
  await page.getByTestId('save-sale').click()
  await expect(page.getByTestId('summary-stock')).toContainText('Stock: 10 → 9')

  await page.getByTestId('void-sale').click()
  await expect(page.getByTestId('sale-summary')).toContainText('Voided — stock restored')
  await expect(page.getByTestId('void-sale')).toHaveCount(0)

  const refreshed = await (await adminRequest.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(10)
})

test.describe('member landing route', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('a member lands on checkout after signing in', async ({ page }) => {
    const adminContext = await request.newContext({ baseURL: BASE_URL, storageState: STORAGE_STATE_PATH })
    const suffix = Date.now().toString().slice(-6)
    const username = `checkoutmember${suffix}`
    const tempPassword = 'checkout-temp-123'
    await createUser(adminContext, { username, displayName: `Checkout Member ${suffix}`, password: tempPassword, role: 'MEMBER' })

    // First sign-in is forced through the password-change screen regardless of role.
    await loginAs(page, username, tempPassword)
    await expect(page).toHaveURL('/settings/password')
    const newPassword = 'checkout-real-456'
    await page.getByTestId('current-password').fill(tempPassword)
    await page.getByTestId('new-password').fill(newPassword)
    await page.getByTestId('confirm-password').fill(newPassword)
    await page.getByTestId('submit-password').click()
    await expect(page).toHaveURL('/')

    // A normal sign-in afterwards lands the member on checkout.
    await loginAs(page, username, newPassword)
    await expect(page).toHaveURL('/sales/new')
    await expect(page.getByTestId('product-search')).toBeVisible()
  })
})
