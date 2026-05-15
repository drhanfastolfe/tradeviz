import type { TableCell } from '../domain/types';

export function escapeHtml(value: string): string {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));
}

export function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró el elemento ${selector}.`);
  return element;
}

export function renderCell(cell: TableCell): string {
  return typeof cell === 'string' ? escapeHtml(cell) : cell.html;
}

export function searchableCellValue(cell: TableCell): string {
  return typeof cell === 'string' ? cell : cell.search;
}
