import type { APIRequestContext } from '@playwright/test'

export interface ProductInput {
  name: string
  variant?: string
  costPrice?: number | null
  sellingPrice?: number | null
  stock?: number
  lowStockThreshold?: number
}

export async function createProduct(request: APIRequestContext, input: ProductInput) {
  const response = await request.post('/api/products', {
    data: {
      variant: '',
      costPrice: null,
      sellingPrice: null,
      stock: 0,
      lowStockThreshold: 5,
      ...input,
    },
  })
  if (!response.ok()) {
    throw new Error(`createProduct failed: ${response.status()} ${await response.text()}`)
  }
  return response.json()
}
