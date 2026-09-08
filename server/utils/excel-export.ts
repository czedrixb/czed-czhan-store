import ExcelJS from 'exceljs'

function pesoColumn(ws: ExcelJS.Worksheet, colKey: string) {
  ws.getColumn(colKey).numFmt = '#,##0.00'
}

export async function buildInventoryWorkbook(
  rows: Array<{ name: string; variant: string; costPrice: number | null; sellingPrice: number | null; stock: number; lowStockThreshold: number }>,
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Inventory')

  sheet.columns = [
    { header: 'Product', key: 'name', width: 28 },
    { header: 'Variant', key: 'variant', width: 28 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Low Stock Threshold', key: 'threshold', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const p of rows) {
    sheet.addRow({
      name: p.name,
      variant: p.variant,
      cost: p.costPrice === null ? '' : centavosToPesos(p.costPrice),
      sellingPrice: p.sellingPrice === null ? '' : centavosToPesos(p.sellingPrice),
      stock: p.stock,
      threshold: p.lowStockThreshold,
      status: p.stock <= p.lowStockThreshold ? 'Low' : 'Normal',
    })
  }

  pesoColumn(sheet, 'cost')
  pesoColumn(sheet, 'sellingPrice')

  return workbook
}

export async function buildSalesWorkbook(
  rows: Array<{
    soldAt: Date
    productName: string
    productVariant: string
    quantity: number
    sellingPrice: number
    revenue: number
    profit: number
  }>,
  title: string,
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Sales')

  sheet.columns = [
    { header: 'Date/Time', key: 'soldAt', width: 20 },
    { header: 'Product', key: 'name', width: 28 },
    { header: 'Variant', key: 'variant', width: 24 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 },
    { header: 'Revenue', key: 'revenue', width: 14 },
    { header: 'Profit', key: 'profit', width: 14 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const s of rows) {
    sheet.addRow({
      soldAt: s.soldAt,
      name: s.productName,
      variant: s.productVariant,
      quantity: s.quantity,
      sellingPrice: centavosToPesos(s.sellingPrice),
      revenue: centavosToPesos(s.revenue),
      profit: centavosToPesos(s.profit),
    })
  }

  pesoColumn(sheet, 'sellingPrice')
  pesoColumn(sheet, 'revenue')
  pesoColumn(sheet, 'profit')
  sheet.getColumn('soldAt').numFmt = 'yyyy-mm-dd hh:mm'

  const totalsRow = sheet.addRow({
    name: 'TOTAL',
    quantity: rows.reduce((sum, r) => sum + r.quantity, 0),
    revenue: centavosToPesos(rows.reduce((sum, r) => sum + r.revenue, 0)),
    profit: centavosToPesos(rows.reduce((sum, r) => sum + r.profit, 0)),
  })
  totalsRow.font = { bold: true }

  workbook.title = title
  return workbook
}

export async function buildCountWorkbook(
  rows: Array<{ productName: string; productVariant: string; expectedQuantity: number; actualQuantity: number | null; difference: number | null }>,
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Inventory Count')

  sheet.columns = [
    { header: 'Product', key: 'name', width: 28 },
    { header: 'Variant', key: 'variant', width: 24 },
    { header: 'Expected', key: 'expected', width: 12 },
    { header: 'Actual', key: 'actual', width: 12 },
    { header: 'Difference', key: 'difference', width: 12 },
  ]
  sheet.getRow(1).font = { bold: true }

  for (const r of rows) {
    sheet.addRow({
      name: r.productName,
      variant: r.productVariant,
      expected: r.expectedQuantity,
      actual: r.actualQuantity ?? '',
      difference: r.difference ?? '',
    })
  }

  return workbook
}
