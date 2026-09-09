import { products } from '../../db/schema'

function productKey(name: string | null | undefined, variant: string | null | undefined) {
  return `${name?.trim().toLowerCase() ?? ''}|${variant?.trim().toLowerCase() ?? ''}`
}

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const file = formData?.find((p) => p.name === 'file')

  if (!file || !file.data?.length) {
    throw createError({ statusCode: 400, statusMessage: 'A file is required (multipart field "file")' })
  }

  const parsed = await parseInventoryWorkbook(file.data)
  if (parsed.rows.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No product rows were found in the workbook' })
  }

  const db = useDb()
  const existing = await db
    .select({ id: products.id, name: products.name, variant: products.variant, stock: products.stock })
    .from(products)

  // Older imports may contain incomplete product values. Treat those as an
  // empty identifier component instead of letting a null value abort the
  // whole preview with a server error.
  const existingMap = new Map(existing.map((p) => [productKey(p.name, p.variant), p]))

  const rows = parsed.rows.map((row) => {
    const match = existingMap.get(productKey(row.name, row.variant))
    return {
      ...row,
      action: match ? ('update' as const) : ('create' as const),
      existingProductId: match?.id ?? null,
      existingStock: match?.stock ?? null,
    }
  })

  return {
    hasHeader: parsed.hasHeader,
    hasPrices: parsed.hasPrices,
    totalRows: rows.length,
    toCreate: rows.filter((r) => r.action === 'create').length,
    toUpdate: rows.filter((r) => r.action === 'update').length,
    rows,
  }
})
