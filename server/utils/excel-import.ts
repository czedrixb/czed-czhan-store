import ExcelJS from 'exceljs'

export interface ParsedImportRow {
  rowNumber: number
  name: string
  variant: string
  quantity: number
  costPrice: number | null
  sellingPrice: number | null
  warning?: string
}

export interface ParsedImportResult {
  hasHeader: boolean
  hasPrices: boolean
  rows: ParsedImportRow[]
}

const NAME_HEADERS = ['product', 'name', 'item']
const VARIANT_HEADERS = ['variant', 'size', 'flavor', 'type']
const QUANTITY_HEADERS = ['qty', 'quantity', 'stock']
const COST_HEADERS = ['cost']
const SELLING_HEADERS = ['sell', 'price', 'srp']

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return ''
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String((cell.value as { result?: unknown }).result ?? '').trim()
  }
  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return String((cell.value as { text?: unknown }).text ?? '').trim()
  }
  return String(cell.value).trim()
}

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some((k) => lower.includes(k))
}

function findHeaderRow(sheet: ExcelJS.Worksheet): { rowNumber: number; columns: Record<string, number> } | null {
  const searchLimit = Math.min(sheet.rowCount, 5)
  for (let r = 1; r <= searchLimit; r++) {
    const row = sheet.getRow(r)
    const columns: Record<string, number> = {}
    let matchCount = 0

    for (let c = 1; c <= row.cellCount; c++) {
      const text = cellText(row.getCell(c))
      if (!text) continue
      if (!columns.name && matchesAny(text, NAME_HEADERS)) {
        columns.name = c
        matchCount++
      } else if (!columns.variant && matchesAny(text, VARIANT_HEADERS)) {
        columns.variant = c
        matchCount++
      } else if (!columns.quantity && matchesAny(text, QUANTITY_HEADERS)) {
        columns.quantity = c
        matchCount++
      } else if (!columns.cost && matchesAny(text, COST_HEADERS)) {
        columns.cost = c
        matchCount++
      } else if (!columns.selling && matchesAny(text, SELLING_HEADERS)) {
        columns.selling = c
        matchCount++
      }
    }

    if (matchCount >= 2 && columns.name) {
      return { rowNumber: r, columns }
    }
  }
  return null
}

function parseQuantity(text: string): { quantity: number; warning?: string } {
  const cleaned = text.replace(/[,\s]/g, '')
  if (!cleaned) return { quantity: 0 }
  const value = Number(cleaned)
  if (!Number.isFinite(value)) {
    return { quantity: 0, warning: `Could not parse quantity "${text}", defaulted to 0` }
  }
  return { quantity: Math.round(value) }
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[₱,\s]/g, '')
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return pesosToCentavos(value)
}

/**
 * Parses a supplier/inventory spreadsheet into product rows. Handles two shapes:
 *
 * - Header-based: a header row naming Product/Variant/Quantity(/Cost/Selling) columns.
 * - Headerless (the store's actual export): no header row, data starting on any
 *   row, columns positionally A=name, B=variant, C=quantity. A blank name cell
 *   means "same product as the row above" and is forward-filled.
 */
export async function parseInventoryWorkbook(buffer: Buffer): Promise<ParsedImportResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) {
    throw createError({ statusCode: 400, statusMessage: 'Workbook has no worksheets' })
  }

  const header = findHeaderRow(sheet)
  const nameCol = header?.columns.name ?? 1
  const variantCol = header?.columns.variant ?? 2
  const quantityCol = header?.columns.quantity ?? 3
  const costCol = header?.columns.cost
  const sellingCol = header?.columns.selling
  const startRow = header ? header.rowNumber + 1 : 1
  const hasPrices = Boolean(costCol || sellingCol)

  const rows: ParsedImportRow[] = []
  let currentName = ''

  for (let r = startRow; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    const nameText = cellText(row.getCell(nameCol))
    const variantText = cellText(row.getCell(variantCol))
    const quantityText = cellText(row.getCell(quantityCol))

    if (nameText) currentName = nameText
    if (!currentName && !variantText) continue // blank separator/title row

    const { quantity, warning } = parseQuantity(quantityText)

    rows.push({
      rowNumber: r,
      name: currentName,
      variant: variantText,
      quantity,
      costPrice: costCol ? parsePrice(cellText(row.getCell(costCol))) : null,
      sellingPrice: sellingCol ? parsePrice(cellText(row.getCell(sellingCol))) : null,
      warning,
    })
  }

  return { hasHeader: Boolean(header), hasPrices, rows }
}
