import { readFile, writeFile } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'

const source = process.argv[2]
const destination = process.argv[3]

if (!source || !destination) {
  throw new Error('Usage: node scripts/repair-import-workbook.mjs <source.xlsx> <destination.xlsx>')
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function cellValue(cellXml) {
  const text = cellXml.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/)?.[1]
  if (text !== undefined) return decodeXml(text)
  const number = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1]
  return number === undefined ? null : Number(number)
}

const archive = await JSZip.loadAsync(await readFile(source))
const worksheetXml = await archive.file('xl/worksheets/sheet1.xml')?.async('string')
if (!worksheetXml) throw new Error('The source workbook has no first worksheet')

const rows = [...worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].slice(1).map(([, rowXml]) => {
  const cells = [...rowXml.matchAll(/<c\b[^>]*r="([A-Z]+)\d+"[^>]*>([\s\S]*?)<\/c>/g)]
  const values = new Map(cells.map(([, column, xml]) => [column, cellValue(xml)]))
  return {
    product: String(values.get('A') ?? '').trim(),
    variant: String(values.get('B') ?? '').trim(),
    sellingPrice: values.get('D'),
  }
}).filter(({ product, variant }) => product || variant)

const workbook = new ExcelJS.Workbook()
workbook.creator = 'CZED Store'
workbook.created = new Date()
const sheet = workbook.addWorksheet('Inventory', {
  views: [{ state: 'frozen', ySplit: 1 }],
})

sheet.columns = [
  { header: 'Product', key: 'product', width: 28 },
  { header: 'Variant', key: 'variant', width: 34 },
  { header: 'Quantity', key: 'quantity', width: 12 },
  { header: 'Selling Price', key: 'sellingPrice', width: 14 },
]

for (const row of rows) {
  sheet.addRow({ ...row, quantity: 99 })
}

sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
sheet.getColumn('quantity').numFmt = '0'
sheet.getColumn('sellingPrice').numFmt = '#,##0.00'
sheet.addTable({
  name: 'InventoryImport',
  ref: `A1:D${rows.length + 1}`,
  headerRow: true,
  style: { theme: 'TableStyleMedium2', showRowStripes: true },
  columns: ['Product', 'Variant', 'Quantity', 'Selling Price'].map(name => ({ name })),
  rows: rows.map(({ product, variant, sellingPrice }) => [product, variant, 99, sellingPrice]),
})

await writeFile(destination, await workbook.xlsx.writeBuffer())
console.log(JSON.stringify({ source, destination, productRows: rows.length }))
