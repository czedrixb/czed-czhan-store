import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = 'D:/Downloads/aug_15_simplified.xlsx';
const input = await FileBlob.load(source);
const workbook = await SpreadsheetFile.importXlsx(input);
const overview = await workbook.inspect({
  kind: 'workbook,sheet,table',
  maxChars: 6000,
  tableMaxRows: 12,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log(overview.ndjson);
