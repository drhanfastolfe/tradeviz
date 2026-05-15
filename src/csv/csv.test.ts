import { describe, expect, it } from 'vitest';
import { parseCsv } from './parseCsv';
import { normalizeDate } from './normalizeDate';
import { normalizeNumber } from './normalizeNumber';

describe('parseCsv', () => {
  it('parses comma-delimited CSV', () => {
    expect(parseCsv('name,symbol\nAcme,ACME').rows).toEqual([{ name: 'Acme', symbol: 'ACME' }]);
  });

  it('parses semicolon-delimited CSV', () => {
    expect(parseCsv('name;symbol\nAcme;ACME').rows).toEqual([{ name: 'Acme', symbol: 'ACME' }]);
  });

  it('preserves quoted fields with commas and semicolons', () => {
    const parsed = parseCsv('name,description\n"Acme, Inc.","growth; value"');
    expect(parsed.rows[0]).toMatchObject({ name: 'Acme, Inc.', description: 'growth; value' });
  });

  it('unescapes doubled quotes', () => {
    expect(parseCsv('name\n"Acme ""Prime"""').rows[0]?.name).toBe('Acme "Prime"');
  });

  it('removes a UTF-8 BOM from the first header', () => {
    expect(parseCsv('\uFEFFname,symbol\nAcme,ACME').headers).toEqual(['name', 'symbol']);
  });

  it('throws on empty files', () => {
    expect(() => parseCsv('')).toThrow('El archivo está vacío.');
  });

  it('throws on unclosed quotes', () => {
    expect(() => parseCsv('name\n"Acme')).toThrow('Hay comillas sin cerrar');
  });
});

describe('normalizeNumber', () => {
  it.each([
    ['1234.56', 1234.56],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['€ 1 234,56', 1234.56],
    ['not a number', 0],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeNumber(input)).toBe(expected);
  });
});

describe('normalizeDate', () => {
  it.each([
    ['2025-01-31', '2025-01-31'],
    ['31/01/2025', '2025-01-31'],
    ['31.01.2025', '2025-01-31'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeDate(input)).toBe(expected);
  });
});
