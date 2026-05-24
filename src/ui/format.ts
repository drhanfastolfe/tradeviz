import type { TableCell } from '../domain/types';
import { escapeHtml } from './html';

export const MONEY = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
export const PERCENT = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
export const DECIMAL = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 });

export function money(value: number): string {
  return MONEY.format(Number.isFinite(value) ? value : 0);
}

export function pct(value: number): string {
  return `${PERCENT.format(Number.isFinite(value) ? value : 0)}%`;
}

export function decimals(value: number): string {
  return DECIMAL.format(Number.isFinite(value) ? value : 0);
}

export function signed(value: number): TableCell {
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  const content = `${value > 0 ? '+' : ''}${money(value)}`;
  return { html: `<span class="${className}">${escapeHtml(content)}</span>`, search: content };
}
