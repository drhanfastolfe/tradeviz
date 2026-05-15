export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const europeanMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (europeanMatch) return `${europeanMatch[3]}-${europeanMatch[2].padStart(2, '0')}-${europeanMatch[1].padStart(2, '0')}`;
  return trimmed.slice(0, 10);
}
