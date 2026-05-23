import { analyse } from '../domain/analyse';
import { applyPriceOverrides } from '../domain/priceOverrides';
import { loadPriceOverrides, savePriceOverrides } from '../storage/localStoragePrices';
import { renderDashboard } from '../ui/dashboard';
import { money } from '../ui/format';
import { escapeHtml } from '../ui/html';
import type { AppState } from './appState';

export type DashboardEventContext = {
  state: AppState;
  dashboard: HTMLElement;
  emptyState: HTMLElement;
  warning: HTMLElement;
  clearDataButton: HTMLButtonElement;
};

export function attachDashboardInteractions(context: DashboardEventContext): void {
  attachClearButtons(context.clearDataButton);
  attachTransactionFilter();
  attachMobileNavigation();
  attachPriceEditors(context);
  attachResetPrices(context);
}

export function showInlineNotice(warning: HTMLElement, message: string): void {
  warning.classList.remove('hidden', 'notice-error');
  warning.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
}

function rerenderFromCurrentDataset(context: DashboardEventContext): void {
  if (!context.state.currentDataset) return;
  renderDashboard(
    context.dashboard,
    context.emptyState,
    applyPriceOverrides(analyse(context.state.currentDataset.transactions), loadPriceOverrides()),
    context.state.currentDataset.fileName,
  );
  attachDashboardInteractions(context);
}

function attachClearButtons(clearDataButton: HTMLButtonElement): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-clear-csv]')) {
    button.addEventListener('click', () => clearDataButton.click());
  }
}

function attachMobileNavigation(): void {
  const openScreen = (target: string): void => {
    const dashboard = document.querySelector<HTMLElement>('.app-dashboard');
    dashboard?.setAttribute('data-active-screen', target);

    for (const screen of document.querySelectorAll<HTMLElement>('[data-app-screen]')) {
      screen.classList.toggle('hidden', screen.dataset.appScreen !== target);
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-screen]')) {
      button.classList.toggle('active', button.dataset.openScreen === target);
    }
    requestAnimationFrame(() => {
      if (target === 'inicio') {
        document.querySelector<HTMLElement>('.app-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      document
        .querySelector<HTMLElement>(`[data-app-screen="${target}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-screen]')) {
    button.addEventListener('click', () => openScreen(button.dataset.openScreen ?? 'inicio'));
  }
}

function attachPriceEditors(context: DashboardEventContext): void {
  for (const form of document.querySelectorAll<HTMLFormElement>('[data-price-form]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.querySelector<HTMLInputElement>('[data-price-input]');
      const symbol = input?.dataset.priceInput;
      const nextPrice = Number(input?.value);
      if (!symbol || !Number.isFinite(nextPrice) || nextPrice < 0) return;

      const overrides = loadPriceOverrides();
      overrides[symbol] = nextPrice;
      savePriceOverrides(overrides);
      rerenderFromCurrentDataset(context);
      showInlineNotice(context.warning, `Precio de ${symbol} actualizado a ${money(nextPrice)}.`);
    });
  }
}

function attachResetPrices(context: DashboardEventContext): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reset-prices]')) {
    button.addEventListener('click', () => {
      savePriceOverrides({});
      rerenderFromCurrentDataset(context);
      showInlineNotice(context.warning, 'Precios manuales restablecidos.');
    });
  }
}

function attachTransactionFilter(): void {
  const filter = document.querySelector<HTMLInputElement>('#tx-filter');
  if (!filter) return;

  filter.addEventListener('input', () => {
    const term = filter.value.trim().toLowerCase();
    for (const row of filter.closest('section')?.querySelectorAll<HTMLTableRowElement>('[data-search]') ?? []) {
      row.hidden = Boolean(term) && !row.dataset.search?.includes(term);
    }
  });
}
