import { normalizeTransaction } from '../csv/normalizeTransaction';
import { parseCsv } from '../csv/parseCsv';
import { EXPECTED_COLUMNS } from '../domain/constants';
import { analyse } from '../domain/analyse';
import { applyPriceOverrides } from '../domain/priceOverrides';
import { clearStoredCsv, loadStoredCsv, saveCsvToStorage } from '../storage/localStorageCsv';
import { loadPriceOverrides, savePriceOverrides } from '../storage/localStoragePrices';
import { renderDashboard } from '../ui/dashboard';
import { escapeHtml, requireElement } from '../ui/html';
import { renderShell, type ShellElements } from '../ui/shell';
import type { AppState } from './appState';
import { attachDashboardInteractions, type DashboardEventContext } from './events';

export function initApp(): void {
  const app = requireElement<HTMLDivElement>('#app');
  const elements = renderShell(app);
  const state: AppState = { currentDataset: null };
  const context: DashboardEventContext = { state, ...elements };

  bindImport(elements, state, context);
  bindClear(elements, state);
  restoreStoredCsv(elements, state, context);
}

function bindImport(elements: ShellElements, state: AppState, context: DashboardEventContext): void {
  elements.input.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    hideWarning(elements.warning);

    try {
      const text = await file.text();
      importCsvText(text, file.name, { persist: true, scroll: true }, elements, state, context);
    } catch (error) {
      showCsvError(elements.warning, error);
    } finally {
      elements.input.value = '';
    }
  });
}

function bindClear(elements: ShellElements, state: AppState): void {
  elements.clearDataButton.addEventListener('click', () => {
    clearStoredCsv();
    savePriceOverrides({});
    resetDashboard(elements, state);
    elements.warning.classList.remove('hidden', 'notice-error');
    elements.warning.innerHTML = '<strong>Datos limpiados.</strong> Ya puedes subir un CSV nuevo cuando quieras.';
  });
}

function importCsvText(
  text: string,
  fileName: string,
  options: { persist: boolean; scroll: boolean; restored?: boolean },
  elements: ShellElements,
  state: AppState,
  context: DashboardEventContext,
): void {
  const { rows, headers } = parseCsv(text);
  const missing = EXPECTED_COLUMNS.filter((column) => !headers.includes(column));
  const transactions = rows.map(normalizeTransaction).filter((transaction) => transaction.date || transaction.datetime);

  if (!transactions.length) {
    throw new Error('No se encontraron filas con fecha o fecha/hora válidas.');
  }

  state.currentDataset = { transactions, fileName };
  const analysis = applyPriceOverrides(analyse(transactions), loadPriceOverrides());
  let storageWarning = '';

  if (options.persist) {
    storageWarning = saveCsvToStorage(text, fileName);
  }

  renderDashboard(elements.dashboard, elements.emptyState, analysis, fileName);
  attachDashboardInteractions(context);
  renderWarning(elements.warning, missing, transactions.length, options.restored ? 'restored' : 'loaded', storageWarning);
  elements.clearDataButton.classList.remove('hidden');

  if (options.scroll) {
    elements.dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function restoreStoredCsv(elements: ShellElements, state: AppState, context: DashboardEventContext): void {
  const stored = loadStoredCsv();
  if (!stored) return;

  try {
    importCsvText(stored.text, stored.fileName, { persist: false, scroll: false, restored: true }, elements, state, context);
  } catch (error) {
    clearStoredCsv();
    showCsvError(elements.warning, error, 'No se pudo restaurar el CSV guardado.');
  }
}

function resetDashboard(elements: ShellElements, state: AppState): void {
  elements.dashboard.classList.add('hidden');
  elements.dashboard.innerHTML = '';
  elements.emptyState.classList.remove('hidden');
  elements.clearDataButton.classList.add('hidden');
  state.currentDataset = null;
}

function hideWarning(warning: HTMLElement): void {
  warning.classList.add('hidden');
  warning.classList.remove('notice-error');
  warning.innerHTML = '';
}

function showCsvError(warning: HTMLElement, error: unknown, prefix = 'No se pudo leer el CSV.'): void {
  warning.classList.remove('hidden');
  warning.classList.add('notice-error');
  warning.innerHTML = `<strong>${escapeHtml(prefix)}</strong> ${escapeHtml(error instanceof Error ? error.message : String(error))}`;
}

function renderWarning(warning: HTMLElement, missing: string[], count: number, mode: 'loaded' | 'restored', storageWarning = ''): void {
  warning.classList.remove('hidden', 'notice-error');
  const status = mode === 'restored' ? 'CSV restaurado desde este navegador' : 'CSV cargado y guardado en este navegador';
  const details = missing.length
    ? ` Faltan columnas esperadas: ${missing.map(escapeHtml).join(', ')}. Se han usado las disponibles.`
    : '';
  warning.innerHTML = `<strong>${status} con ${count} filas.</strong>${details}${escapeHtml(storageWarning)}`;
}
