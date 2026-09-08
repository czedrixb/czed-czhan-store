import { test, expect } from '@playwright/test'
import { createProduct } from './helpers'

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
  await expect(page.getByText('Completed')).toBeVisible()

  const refreshed = await (await request.get(`/api/products/${product.id}`)).json()
  expect(refreshed.stock).toBe(25)
})
