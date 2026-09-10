import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = 'D:/Downloads/aug_15_simplified.xlsx';
const outputDir = 'C:/Users/czedr/AppData/Local/Temp/codex-import-products-99';
const outputPath = `${outputDir}/aug_15_simplified_import_99.xlsx`;

const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem('Inventory');
const used = sheet.getUsedRange(true);
const values = used.values;

// Make the existing columns match the app's header-based importer. The source
// Category column is the product name and its Product column is the variant.
sheet.getRange('A1:D1').values = [['Product', 'Variant', 'Quantity', 'Selling Price']];

const quantities = values.slice(1).map((row) => [String(row[0] ?? '').trim() || String(row[1] ?? '').trim() ? 99 : null]);
sheet.getRangeByIndexes(1, 2, quantities.length, 1).values = quantities;

workbook.recalculate();

const check = await workbook.inspect({
  kind: 'table',
  range: 'Inventory!A1:E12',
  include: 'values,formulas',
  tableMaxRows: 12,
  tableMaxCols: 5,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',
  options: { useRegex: true, maxResults: 50 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

const preview = await workbook.render({ sheetName: 'Inventory', range: 'A1:E18', scale: 2, format: 'png' });
await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(`${outputDir}/import-preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(JSON.stringify({ outputPath, rowsWith99: quantities.filter(([value]) => value === 99).length }));
