import { expect, test } from '@playwright/test'

const INVENTORY_XLSX = 'D:/Downloads/inventory-071326.xlsx'

test('Excel upload returns an import preview without a server error', async ({ page }) => {
  await page.goto('/settings')

  await page.screenshot({ path: 'test-results/import-serverless-runtime-before.png', fullPage: true })

  await page.getByTestId('import-file-input').setInputFiles(INVENTORY_XLSX)

  const preview = page.getByTestId('import-preview')
  await expect(preview).toBeVisible()
  await expect(preview).toContainText('296 rows found')
  await expect(preview).toContainText('296 new')
  await expect(page.getByText('Could not read file')).not.toBeVisible()

  await page.screenshot({ path: 'test-results/import-serverless-runtime-after.png', fullPage: true })
})
