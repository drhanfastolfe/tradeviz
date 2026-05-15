export function normalizeNumber(value: string | undefined): number {
  if (!value) return 0;

  const compact = value.trim().replace(/\s/g, '').replace(/[^\d,.-]/g, '');
  if (!compact || compact === '-' || compact === ',') return 0;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot > lastComma ? '.' : '';
  let normalized = compact;

  if (decimalSeparator === ',') {
    normalized = compact.replace(/\./g, '').replace(',', '.');
  } else if (decimalSeparator === '.') {
    normalized = compact.replace(/,/g, '');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
