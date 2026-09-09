import { test, expect } from '@playwright/test'

test.use({ screenshot: 'off' })

test('favicon, Apple touch icon and installed PWA use the storefront logo artwork', async ({ page, request }) => {
  await page.goto('/')
  for (const size of [16, 32]) {
    await expect(page.locator(`link[rel="icon"][sizes="${size}x${size}"]`)).toHaveAttribute('href', `/icons/storefront-${size}.png`)
  }
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/storefront-180.png')

  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()
  const manifestUrl = new URL(manifestHref!, page.url()).href
  const response = await request.get(manifestUrl)
  expect(response.ok()).toBeTruthy()
  const manifest = await response.json()
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: 'icons/storefront-192.png', sizes: '192x192' }),
    expect.objectContaining({ src: 'icons/storefront-512.png', sizes: '512x512' }),
    expect.objectContaining({ src: 'icons/storefront-512.png', purpose: 'maskable' }),
  ]))

  for (const size of [16, 32, 180, 192, 512]) {
    const url = new URL(`/icons/storefront-${size}.png`, page.url()).href
    const asset = await request.get(url)
    expect(asset.ok()).toBeTruthy()
    expect(asset.headers()['content-type']).toContain('image/png')
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image()
      image.src = src
      await image.decode()
      return [image.naturalWidth, image.naturalHeight]
    }, url)
    expect(dimensions).toEqual([size, size])
  }
})
