import { test, expect } from '@playwright/test'
import { createProduct } from './helpers'

test('standalone mobile product rows and bottom navigation remain tappable', async ({ page, request }) => {
  const product = await createProduct(request, {
    name: `Standalone Tap ${Date.now()}`,
    costPrice: 500,
    sellingPrice: 800,
    stock: 12,
  })

  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      const result = nativeMatchMedia(query)
      if (query === '(display-mode: standalone)') {
        Object.defineProperty(result, 'matches', { configurable: true, value: true })
      }
      return result
    }
  })

  await page.goto('/sales/new')
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0)
  await page.getByTestId('product-search').fill(product.name)
  await page.getByTestId('search-result').tap()
  await expect(page.getByTestId('cart-line')).toContainText(product.name)

  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Stock' }).tap()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-accept').tap()
  await expect(page).toHaveURL('/inventory')
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0)

  // The cart is shared state now - leaving mid-sale no longer discards it.
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sale' }).tap()
  await expect(page).toHaveURL('/sales/new')
  await expect(page.getByTestId('cart-line')).toContainText(product.name)

  // Back to /inventory to continue the original tap-target checks below; the
  // cart still has an item, so the leave prompt fires again.
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Stock' }).tap()
  await expect(page.getByTestId('confirm-dialog')).toBeVisible()
  await page.getByTestId('confirm-accept').tap()
  await expect(page).toHaveURL('/inventory')
  await expect(page.getByTestId('confirm-dialog')).toHaveCount(0)

  const productLink = page.getByRole('link', { name: new RegExp(product.name) })
  await productLink.tap()
  await expect(page).toHaveURL(`/products/${product.id}`)

  await page.goBack()
  await expect(page).toHaveURL('/inventory')
  const screenshotPath = process.env.PWA_TAP_SCREENSHOT_PATH
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true })

  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Sale' }).tap()
  await expect(page).toHaveURL('/sales/new')
})
