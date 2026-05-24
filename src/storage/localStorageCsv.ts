import { STORAGE_KEY } from '../domain/constants';
import type { StoredCsv } from '../domain/types';

export function saveCsvToStorage(text: string, fileName: string): string {
  const stored: StoredCsv = { version: 1, fileName, text, savedAt: new Date().toISOString() };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return '';
  } catch (error) {
    return ` No se pudo guardar en localStorage: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

export function loadStoredCsv(): StoredCsv | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredCsv>;
    if (parsed.version !== 1 || typeof parsed.text !== 'string' || typeof parsed.fileName !== 'string') {
      throw new Error('El formato guardado no es compatible.');
    }

    return { version: 1, text: parsed.text, fileName: parsed.fileName || 'CSV guardado', savedAt: parsed.savedAt ?? '' };
  } catch {
    clearStoredCsv();
    return null;
  }
}

export function clearStoredCsv(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el navegador bloquea localStorage, la limpieza visual sigue siendo suficiente.
  }
}
