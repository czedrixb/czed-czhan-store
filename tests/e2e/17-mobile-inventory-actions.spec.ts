import { test, expect } from '@playwright/test'

test('mobile inventory add-product and search-clear controls work', async ({ page }) => {
  await page.goto('/inventory')

  const addProduct = page.getByRole('link', { name: 'Add Product' })
  await expect(addProduct).toBeVisible()

  const search = page.getByPlaceholder('Search inventory...')
  await search.fill('mobile search')

  const screenshotPath = process.env.MOBILE_INVENTORY_SCREENSHOT_PATH
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true })

  const tapSize = await addProduct.boundingBox()
  expect(tapSize).not.toBeNull()
  expect(tapSize!.height).toBeGreaterThanOrEqual(44)

  const clearSearch = page.getByRole('button', { name: 'Clear inventory search' })
  await expect(clearSearch).toBeVisible()
  await clearSearch.tap()
  await expect(search).toHaveValue('')
  await expect(clearSearch).toBeHidden()

  await addProduct.tap()
  await expect(page).toHaveURL('/products/new')
  await expect(page.getByRole('heading', { name: 'Add Product' })).toBeVisible()
})
