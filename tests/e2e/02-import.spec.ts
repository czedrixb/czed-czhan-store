import { test, expect } from '@playwright/test'

const INVENTORY_XLSX = 'D:/Downloads/inventory-071326.xlsx'

test('importing the real store spreadsheet creates products with forward-filled names and no prices', async ({ page, request }) => {
  await page.goto('/settings')

  const fileInput = page.getByTestId('import-file-input')
  await fileInput.setInputFiles(INVENTORY_XLSX)

  const preview = page.getByTestId('import-preview')
  await expect(preview).toContainText('296 rows found')
  await expect(preview).toContainText('296 new')
  await expect(preview).toContainText('No prices found in this file')

  await page.getByTestId('confirm-import').click()
  const result = page.getByTestId('import-result')
  await expect(result).toContainText('Created 296, updated 0, skipped 0')

  // Forward-fill: rows 4-5 (blank name cells) belong to the "Alcohol" group from row 3.
  const alcohol = await request.get('/api/products', { params: { q: 'ethyl' } })
  const alcoholRows = await alcohol.json()
  expect(alcoholRows).toHaveLength(1)
  expect(alcoholRows[0].name.toLowerCase()).toBe('alcohol')
  expect(alcoholRows[0].variant.toLowerCase()).toBe('ethyl')

  // A row with a blank variant cell (anlene) must import with an empty variant, not "undefined".
  const anlene = await request.get('/api/products', { params: { q: 'anlene' } })
  const anleneRows = await anlene.json()
  expect(anleneRows).toHaveLength(1)
  expect(anleneRows[0].variant).toBe('')
  expect(anleneRows[0].stock).toBe(14)

  // No prices were in the sheet, so every imported product needs pricing.
  const needsPricing = await request.get('/api/products', { params: { needsPricing: 'true' } })
  expect((await needsPricing.json())).toHaveLength(296)
})
