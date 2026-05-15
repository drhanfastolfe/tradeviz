import type { CsvRow } from '../domain/types';

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = detectDelimiter(normalized);
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    const next = normalized[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      row.push(field.trim());
      field = '';
    } else if (char === '\n' && !inQuotes) {
      row.push(field.trim());
      if (row.some(Boolean)) records.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error('Hay comillas sin cerrar en el archivo CSV.');
  }

  row.push(field.trim());
  if (row.some(Boolean)) records.push(row);

  if (records.length === 0) throw new Error('El archivo está vacío.');

  const headers = records[0].map((header) => header.trim().toLowerCase());
  if (!headers.some(Boolean)) throw new Error('No se encontraron cabeceras en el CSV.');

  const rows = records.slice(1).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
  return { headers, rows };
}

function detectDelimiter(text: string): ',' | ';' {
  const firstDataLine = text.split('\n').find((line) => line.trim());
  if (!firstDataLine) return ',';
  const commaCount = countDelimiter(firstDataLine, ',');
  const semicolonCount = countDelimiter(firstDataLine, ';');
  return semicolonCount > commaCount ? ';' : ',';
}

function countDelimiter(line: string, delimiter: ',' | ';'): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    if (char === delimiter && !inQuotes) count += 1;
  }
  return count;
}
