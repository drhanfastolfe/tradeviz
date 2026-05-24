import { PRICE_OVERRIDES_KEY } from '../domain/constants';

export function loadPriceOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRICE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) as Record<string, number>;
  } catch {
    return {};
  }
}

export function savePriceOverrides(overrides: Record<string, number>): void {
  try {
    localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // La edición sigue funcionando en memoria aunque el navegador bloquee localStorage.
  }
}
