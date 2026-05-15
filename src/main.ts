import './styles.css';

type CsvRow = Record<string, string>;
type ChartColor = `var(--chart-${1 | 2 | 3 | 4 | 5 | 6})` | 'var(--positive)' | 'var(--negative)';
type TableCell = string | { html: string; search: string };

type Transaction = {
  datetime: string;
  date: string;
  accountType: string;
  category: string;
  type: string;
  assetClass: string;
  name: string;
  symbol: string;
  shares: number;
  price: number;
  amount: number;
  fee: number;
  tax: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  fxRate: number;
  description: string;
  transactionId: string;
  counterpartyName: string;
  counterpartyIban: string;
  paymentReference: string;
  mccCode: string;
};

type Lot = { shares: number; cost: number };
type Position = {
  symbol: string;
  name: string;
  assetClass: string;
  shares: number;
  invested: number;
  lastPrice: number;
  lastDate: string;
  value: number;
  unrealized: number;
  returnPct: number;
};

type RealizedTrade = {
  date: string;
  symbol: string;
  name: string;
  shares: number;
  proceeds: number;
  costBasis: number;
  pnl: number;
};

type MonthlyPoint = { month: string; deposits: number; invested: number; realized: number; dividends: number; fees: number };
type TimelinePoint = { date: string; netCash: number; investedOpen: number; marketValue: number; realizedPnl: number };

type Analysis = {
  transactions: Transaction[];
  positions: Position[];
  realizedTrades: RealizedTrade[];
  totals: {
    deposits: number;
    withdrawals: number;
    buys: number;
    sells: number;
    fees: number;
    taxes: number;
    dividends: number;
    perks: number;
    netCashAdded: number;
    currentValue: number;
    investedOpen: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    totalReturnPct: number;
    tradeCount: number;
  };
  byAssetClass: { label: string; value: number }[];
  bySymbol: { label: string; value: number; subtitle: string }[];
  monthly: MonthlyPoint[];
  timeline: TimelinePoint[];
};

const EXPECTED_COLUMNS = [
  'datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol', 'shares', 'price', 'amount', 'fee', 'tax', 'currency',
  'original_amount', 'original_currency', 'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban', 'payment_reference', 'mcc_code',
];

const DEPOSIT_TYPES = new Set(['CUSTOMER_INPAYMENT', 'CUSTOMER_INBOUND', 'TRANSFER_INSTANT_INBOUND', 'TRANSFER_INBOUND']);
const EPSILON = 0.000001;
const MONEY = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const DECIMAL = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 });
const STORAGE_KEY = 'tradeviz.csv.v1';
const PRICE_OVERRIDES_KEY = 'tradeviz.priceOverrides.v1';

type StoredCsv = {
  version: 1;
  fileName: string;
  text: string;
  savedAt: string;
};

type CurrentDataset = {
  transactions: Transaction[];
  fileName: string;
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('No se encontró el contenedor principal #app.');
}

app.innerHTML = `
  <div class="phone-stage">
    <div class="app-shell">
      <header class="mobile-chrome">
        <nav class="topbar" aria-label="Resumen de la aplicación">
          <a class="brand" href="#app" aria-label="TradeViz inicio"><span class="brand-mark">TV</span><span>TradeViz</span></a>
          <div class="top-actions">
            <span class="privacy-pill">100% local</span>
            <button id="clear-data" class="icon-button hidden" type="button" aria-label="Limpiar datos">🧹</button>
          </div>
        </nav>
      </header>
      <main class="app-viewport">
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-content app-card">
            <p class="eyebrow">Dashboard móvil para tus inversiones</p>
            <h1 id="hero-title">Visualiza tu cartera desde un CSV privado.</h1>
            <p class="hero-copy">Importa tus movimientos de Trade Republic o un CSV similar y conviértelos en una experiencia de app: pestañas, acciones rápidas, edición de precios y navegación táctil.</p>
            <div class="hero-actions">
              <label class="primary-action" for="csv-input">Subir CSV</label>
              <a class="ghost-action" href="#empty-state">Ver demo</a>
            </div>
            <div class="trust-row" aria-label="Características">
              <span>🔒 Datos locales</span>
              <span>📱 App embebida</span>
              <span>✏️ Precios editables</span>
            </div>
          </div>
          <label class="upload-card app-card" for="csv-input">
            <span class="upload-icon" aria-hidden="true">📄</span>
            <strong>Seleccionar CSV</strong>
            <small>Compatible con coma o punto y coma, importes ES/EN y columnas parciales. Se guarda en este navegador para que no tengas que volver a subirlo.</small>
            <input id="csv-input" type="file" accept=".csv,text/csv" />
          </label>
        </section>
        <section id="empty-state" class="panel empty app-view">
          <div class="section-heading">
            <p class="eyebrow">Antes de importar</p>
            <h2>Qué podrás analizar</h2>
          </div>
          <div class="feature-grid">
            <article><span aria-hidden="true">📊</span><b>Inicio ejecutivo</b><small>KPIs, P&L, aportaciones, dividendos y costes en tarjetas táctiles.</small></article>
            <article><span aria-hidden="true">🧭</span><b>Navegación tipo app</b><small>Menús inferiores, pestañas y accesos rápidos para saltar entre secciones.</small></article>
            <article><span aria-hidden="true">✏️</span><b>Precio editable</b><small>Actualiza manualmente el precio de las posiciones abiertas y recalcula la cartera.</small></article>
            <article><span aria-hidden="true">🎯</span><b>Concentración</b><small>Asignación por clase de activo y ranking de posiciones con barras responsive.</small></article>
            <article><span aria-hidden="true">💾</span><b>Persistencia local</b><small>El último CSV y tus precios personalizados quedan guardados en este navegador.</small></article>
          </div>
        </section>
        <section id="format-warning" class="notice hidden" aria-live="polite"></section>
        <section id="dashboard" class="hidden"></section>
      </main>
      <footer>Hecho para GitHub Pages · Sin backend · Sin tracking</footer>
    </div>
  </div>
`;

const input = requireElement<HTMLInputElement>('#csv-input');
const dashboard = requireElement<HTMLElement>('#dashboard');
const emptyState = requireElement<HTMLElement>('#empty-state');
const warning = requireElement<HTMLElement>('#format-warning');
const clearDataButton = requireElement<HTMLButtonElement>('#clear-data');
let currentDataset: CurrentDataset | null = null;

input.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  hideWarning();

  try {
    const text = await file.text();
    importCsvText(text, file.name, { persist: true, scroll: true });
  } catch (error) {
    showCsvError(error);
  } finally {
    input.value = '';
  }
});

clearDataButton.addEventListener('click', () => {
  clearStoredCsv();
  savePriceOverrides({});
  resetDashboard();
  warning.classList.remove('hidden', 'notice-error');
  warning.innerHTML = '<strong>Datos limpiados.</strong> Ya puedes subir un CSV nuevo cuando quieras.';
});

restoreStoredCsv();

function importCsvText(text: string, fileName: string, options: { persist: boolean; scroll: boolean; restored?: boolean }): void {
  const { rows, headers } = parseCsv(text);
  const missing = EXPECTED_COLUMNS.filter((column) => !headers.includes(column));
  const transactions = rows.map(normalizeTransaction).filter((transaction) => transaction.date || transaction.datetime);

  if (!transactions.length) {
    throw new Error('No se encontraron filas con fecha o fecha/hora válidas.');
  }

  currentDataset = { transactions, fileName };
  const analysis = applyPriceOverrides(analyse(transactions), loadPriceOverrides());
  let storageWarning = '';

  if (options.persist) {
    storageWarning = saveCsvToStorage(text, fileName);
  }

  renderDashboard(analysis, fileName);
  attachDashboardInteractions();
  renderWarning(missing, transactions.length, options.restored ? 'restored' : 'loaded', storageWarning);
  clearDataButton.classList.remove('hidden');

  if (options.scroll) {
    dashboard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function restoreStoredCsv(): void {
  const stored = loadStoredCsv();
  if (!stored) return;

  try {
    importCsvText(stored.text, stored.fileName, { persist: false, scroll: false, restored: true });
  } catch (error) {
    clearStoredCsv();
    showCsvError(error, 'No se pudo restaurar el CSV guardado.');
  }
}

function saveCsvToStorage(text: string, fileName: string): string {
  const stored: StoredCsv = { version: 1, fileName, text, savedAt: new Date().toISOString() };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return '';
  } catch (error) {
    return ` No se pudo guardar en localStorage: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

function loadStoredCsv(): StoredCsv | null {
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

function clearStoredCsv(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el navegador bloquea localStorage, la limpieza visual sigue siendo suficiente.
  }
}


function loadPriceOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRICE_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)) as Record<string, number>;
  } catch {
    return {};
  }
}

function savePriceOverrides(overrides: Record<string, number>): void {
  try {
    localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // La edición sigue funcionando en memoria aunque el navegador bloquee localStorage.
  }
}

function applyPriceOverrides(analysis: Analysis, overrides: Record<string, number>): Analysis {
  const positions = analysis.positions.map((position) => {
    const override = overrides[position.symbol];
    if (override === undefined) return position;

    const value = position.shares * override;
    const unrealized = value - position.invested;
    return {
      ...position,
      lastPrice: override,
      lastDate: 'manual',
      value,
      unrealized,
      returnPct: position.invested ? (unrealized / position.invested) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);

  const currentValue = positions.reduce((sum, position) => sum + position.value, 0);
  const investedOpen = positions.reduce((sum, position) => sum + position.invested, 0);
  const unrealizedPnl = currentValue - investedOpen;
  const totalPnl = analysis.totals.realizedPnl + unrealizedPnl + analysis.totals.dividends + analysis.totals.perks;
  const denominator = analysis.totals.buys || analysis.totals.deposits || 1;

  return {
    ...analysis,
    positions,
    totals: {
      ...analysis.totals,
      currentValue,
      investedOpen,
      unrealizedPnl,
      totalPnl,
      totalReturnPct: (totalPnl / denominator) * 100,
    },
    byAssetClass: groupPositions(positions, (position) => position.assetClass),
    bySymbol: positions.map((position) => ({ label: position.name || position.symbol, value: position.value, subtitle: position.symbol })),
  };
}

function rerenderFromCurrentDataset(): void {
  if (!currentDataset) return;
  renderDashboard(applyPriceOverrides(analyse(currentDataset.transactions), loadPriceOverrides()), currentDataset.fileName);
  attachDashboardInteractions();
}

function resetDashboard(): void {
  dashboard.classList.add('hidden');
  dashboard.innerHTML = '';
  emptyState.classList.remove('hidden');
  clearDataButton.classList.add('hidden');
  currentDataset = null;
}

function hideWarning(): void {
  warning.classList.add('hidden');
  warning.classList.remove('notice-error');
  warning.innerHTML = '';
}

function showCsvError(error: unknown, prefix = 'No se pudo leer el CSV.'): void {
  warning.classList.remove('hidden');
  warning.classList.add('notice-error');
  warning.innerHTML = `<strong>${escapeHtml(prefix)}</strong> ${escapeHtml(error instanceof Error ? error.message : String(error))}`;
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
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

function normalizeTransaction(row: CsvRow): Transaction {
  const datetime = row.datetime ?? '';
  const rawDate = row.date || (datetime ? datetime.slice(0, 10) : '');

  return {
    datetime,
    date: normalizeDate(rawDate),
    accountType: row.account_type ?? '',
    category: normalizeToken(row.category),
    type: normalizeToken(row.type),
    assetClass: row.asset_class?.trim() ?? '',
    name: row.name?.trim() ?? '',
    symbol: row.symbol?.trim().toUpperCase() ?? '',
    shares: number(row.shares),
    price: number(row.price),
    amount: number(row.amount),
    fee: number(row.fee),
    tax: number(row.tax),
    currency: row.currency?.trim().toUpperCase() || 'EUR',
    originalAmount: number(row.original_amount),
    originalCurrency: row.original_currency?.trim().toUpperCase() ?? '',
    fxRate: number(row.fx_rate),
    description: row.description?.trim() ?? '',
    transactionId: row.transaction_id?.trim() ?? '',
    counterpartyName: row.counterparty_name?.trim() ?? '',
    counterpartyIban: row.counterparty_iban?.trim() ?? '',
    paymentReference: row.payment_reference?.trim() ?? '',
    mccCode: row.mcc_code?.trim() ?? '',
  };
}

function analyse(transactions: Transaction[]): Analysis {
  const sorted = [...transactions].sort((a, b) => (a.datetime || a.date).localeCompare(b.datetime || b.date));
  const lots = new Map<string, Lot[]>();
  const meta = new Map<string, Pick<Position, 'symbol' | 'name' | 'assetClass' | 'lastPrice' | 'lastDate'>>();
  const realizedTrades: RealizedTrade[] = [];
  const monthly = new Map<string, MonthlyPoint>();
  const timeline: TimelinePoint[] = [];
  let deposits = 0;
  let withdrawals = 0;
  let buys = 0;
  let sells = 0;
  let fees = 0;
  let taxes = 0;
  let dividends = 0;
  let perks = 0;
  let realizedPnl = 0;
  let netCash = 0;

  for (const transaction of sorted) {
    const amount = transaction.amount || 0;
    const fee = Math.abs(transaction.fee || 0);
    const tax = Math.abs(transaction.tax || 0);
    fees += fee;
    taxes += tax;

    const month = transaction.date.slice(0, 7) || 'Sin fecha';
    const monthRow = monthly.get(month) ?? { month, deposits: 0, invested: 0, realized: 0, dividends: 0, fees: 0 };

    if (transaction.category === 'CASH' && DEPOSIT_TYPES.has(transaction.type)) {
      deposits += Math.abs(amount);
      netCash += amount;
      monthRow.deposits += Math.abs(amount);
    } else if (transaction.category === 'CASH' && amount < 0 && !transaction.symbol) {
      withdrawals += Math.abs(amount);
      netCash += amount;
    }

    if (transaction.type === 'DIVIDEND') {
      const netDividend = amount - fee - tax;
      dividends += amount;
      netCash += netDividend;
      monthRow.dividends += amount;
    }

    if (transaction.type === 'STOCKPERK') {
      const netPerk = amount - fee - tax;
      perks += amount;
      netCash += netPerk;
    }

    if (transaction.symbol && transaction.price > 0) {
      meta.set(transaction.symbol, {
        symbol: transaction.symbol,
        name: transaction.name || transaction.symbol,
        assetClass: transaction.assetClass || 'Sin clase',
        lastPrice: transaction.price,
        lastDate: transaction.date,
      });
    }

    if (transaction.category === 'TRADING' && transaction.symbol) {
      const symbolLots = lots.get(transaction.symbol) ?? [];

      if (transaction.type === 'BUY' && Math.abs(transaction.shares) > EPSILON) {
        const sharesBought = Math.abs(transaction.shares);
        const cost = Math.abs(amount) + fee + tax;
        buys += cost;
        netCash -= cost;
        monthRow.invested += cost;
        symbolLots.push({ shares: sharesBought, cost });
      }

      if (transaction.type === 'SELL' && Math.abs(transaction.shares) > EPSILON) {
        const sharesSold = Math.abs(transaction.shares);
        const proceeds = Math.max(0, Math.abs(amount) - fee - tax);
        const costBasis = consumeLots(symbolLots, sharesSold);
        const pnl = proceeds - costBasis;
        sells += proceeds;
        realizedPnl += pnl;
        netCash += proceeds;
        monthRow.realized += pnl;
        realizedTrades.push({ date: transaction.date, symbol: transaction.symbol, name: transaction.name || transaction.symbol, shares: sharesSold, proceeds, costBasis, pnl });
      }

      lots.set(transaction.symbol, symbolLots.filter((lot) => lot.shares > EPSILON));
    }

    monthRow.fees += fee + tax;
    monthly.set(month, monthRow);

    const snapshot = snapshotPositions(lots, meta);
    timeline.push({
      date: transaction.date,
      netCash,
      investedOpen: snapshot.reduce((sum, position) => sum + position.invested, 0),
      marketValue: snapshot.reduce((sum, position) => sum + position.value, 0),
      realizedPnl,
    });
  }

  const positions = snapshotPositions(lots, meta).sort((a, b) => b.value - a.value);
  const currentValue = positions.reduce((sum, position) => sum + position.value, 0);
  const investedOpen = positions.reduce((sum, position) => sum + position.invested, 0);
  const unrealizedPnl = currentValue - investedOpen;
  const totalPnl = realizedPnl + unrealizedPnl + dividends + perks;
  const denominator = buys || deposits || 1;

  return {
    transactions: sorted,
    positions,
    realizedTrades,
    totals: {
      deposits,
      withdrawals,
      buys,
      sells,
      fees,
      taxes,
      dividends,
      perks,
      netCashAdded: deposits - withdrawals,
      currentValue,
      investedOpen,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      totalReturnPct: (totalPnl / denominator) * 100,
      tradeCount: sorted.filter((transaction) => transaction.category === 'TRADING').length,
    },
    byAssetClass: groupPositions(positions, (position) => position.assetClass),
    bySymbol: positions.map((position) => ({ label: position.name || position.symbol, value: position.value, subtitle: position.symbol })),
    monthly: [...monthly.values()].sort((a, b) => a.month.localeCompare(b.month)),
    timeline: compressTimeline(timeline),
  };
}

function consumeLots(lots: Lot[], sharesSold: number): number {
  let remaining = sharesSold;
  let costBasis = 0;

  while (remaining > EPSILON && lots.length > 0) {
    const lot = lots[0];
    const used = Math.min(remaining, lot.shares);
    const unitCost = lot.shares ? lot.cost / lot.shares : 0;
    costBasis += used * unitCost;
    lot.shares -= used;
    lot.cost -= used * unitCost;
    remaining -= used;
    if (lot.shares <= EPSILON) lots.shift();
  }

  return costBasis;
}

function snapshotPositions(lots: Map<string, Lot[]>, meta: Map<string, Pick<Position, 'symbol' | 'name' | 'assetClass' | 'lastPrice' | 'lastDate'>>): Position[] {
  return [...lots.entries()].map(([symbol, symbolLots]) => {
    const shares = symbolLots.reduce((sum, lot) => sum + lot.shares, 0);
    const invested = symbolLots.reduce((sum, lot) => sum + lot.cost, 0);
    const info = meta.get(symbol) ?? { symbol, name: symbol, assetClass: 'Sin clase', lastPrice: 0, lastDate: '' };
    const value = shares * info.lastPrice;
    const unrealized = value - invested;
    return { ...info, shares, invested, value, unrealized, returnPct: invested ? (unrealized / invested) * 100 : 0 };
  }).filter((position) => position.shares > EPSILON);
}

function groupPositions(positions: Position[], labelFor: (position: Position) => string): { label: string; value: number }[] {
  const groups = new Map<string, number>();
  for (const position of positions) {
    const label = labelFor(position) || 'Sin clasificar';
    groups.set(label, (groups.get(label) ?? 0) + position.value);
  }
  return [...groups.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function compressTimeline(timeline: TimelinePoint[]): TimelinePoint[] {
  const byDate = new Map<string, TimelinePoint>();
  for (const point of timeline) byDate.set(point.date, point);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function renderWarning(missing: string[], count: number, mode: 'loaded' | 'restored', storageWarning = ''): void {
  warning.classList.remove('hidden', 'notice-error');
  const status = mode === 'restored' ? 'CSV restaurado desde este navegador' : 'CSV cargado y guardado en este navegador';
  const details = missing.length
    ? ` Faltan columnas esperadas: ${missing.map(escapeHtml).join(', ')}. Se han usado las disponibles.`
    : '';
  warning.innerHTML = `<strong>${status} con ${count} filas.</strong>${details}${escapeHtml(storageWarning)}`;
}

function renderDashboard(analysis: Analysis, fileName: string): void {
  emptyState.classList.add('hidden');
  dashboard.classList.remove('hidden');
  const { totals } = analysis;
  const bestPosition = analysis.positions[0];
  const cashEfficiency = totals.netCashAdded ? (totals.currentValue / Math.max(1, totals.netCashAdded)) * 100 : 0;

  dashboard.innerHTML = `
    <div class="app-dashboard">
      <section class="screen-hero app-card" id="screen-home" data-screen="inicio">
        <div>
          <p class="eyebrow">Archivo importado</p>
          <h2>${escapeHtml(fileName)}</h2>
          <p class="muted">La valoración usa el último precio disponible en el CSV o el precio manual que edites para cada posición.</p>
        </div>
        <div class="portfolio-orb" aria-label="Valor total"><span>${money(totals.currentValue)}</span><small>Valor cartera</small></div>
      </section>

      <nav class="quick-menu" aria-label="Acciones rápidas">
        <button class="quick-chip active" type="button" data-open-screen="inicio">🏠 Inicio</button>
        <button class="quick-chip" type="button" data-open-screen="cartera">💼 Cartera</button>
        <button class="quick-chip" type="button" data-open-screen="analisis">📈 Análisis</button>
        <button class="quick-chip" type="button" data-open-screen="actividad">🧾 Actividad</button>
        <button class="quick-chip" type="button" data-open-screen="ajustes">⚙️ Ajustes</button>
      </nav>

      <section class="summary-strip" aria-label="Resumen rápido">
        <span><b>${analysis.transactions.length}</b> transacciones</span>
        <span><b>${analysis.positions.length}</b> posiciones</span>
        <span><b>${totals.tradeCount}</b> movimientos trading</span>
      </section>

      <section class="app-screen" data-app-screen="inicio">
        <div class="hero-metrics">
          ${kpi('Valor posiciones', money(totals.currentValue), 'Abiertas al precio actual')}
          ${kpi('P&L total estimado', money(totals.totalPnl), `${pct(totals.totalReturnPct)} sobre compras`, totals.totalPnl)}
          ${kpi('Aportado neto', money(totals.netCashAdded), `${money(totals.deposits)} entradas · ${money(totals.withdrawals)} salidas`)}
        </div>
        <div class="insight-grid">
          <article class="panel insight-card"><span>🔥</span><b>${escapeHtml(bestPosition?.name ?? 'Sin posiciones')}</b><small>${bestPosition ? `Mayor posición: ${money(bestPosition.value)} · ${pct(bestPosition.returnPct)}` : 'Sube movimientos de compra para ver tu cartera.'}</small></article>
          <article class="panel insight-card"><span>💸</span><b>${money(totals.dividends + totals.perks)}</b><small>Dividendos y perks recibidos.</small></article>
          <article class="panel insight-card"><span>🧮</span><b>${pct(cashEfficiency)}</b><small>Valor actual sobre aportación neta.</small></article>
        </div>
      </section>

      <section class="app-screen hidden" data-app-screen="cartera">
        <div class="section-title compact-title">
          <div><p class="eyebrow">Cartera</p><h3>Posiciones abiertas</h3></div>
          <span class="pill-note">Edita precio y recalcula</span>
        </div>
        ${editablePositions(analysis.positions)}
      </section>

      <section class="app-screen hidden" data-app-screen="analisis">
        <section class="kpi-grid dense">
          ${kpi('Invertido abierto', money(totals.investedOpen), 'Coste FIFO pendiente')}
          ${kpi('P&L realizado', money(totals.realizedPnl), `${analysis.realizedTrades.length} ventas`, totals.realizedPnl)}
          ${kpi('P&L no realizado', money(totals.unrealizedPnl), 'Sobre posiciones abiertas', totals.unrealizedPnl)}
          ${kpi('Costes', money(totals.fees + totals.taxes), `${money(totals.fees)} comisiones · ${money(totals.taxes)} impuestos`, -(totals.fees + totals.taxes))}
        </section>
        <section class="charts-grid">
          <article class="panel"><h3>Asignación por clase de activo</h3>${donutChart(analysis.byAssetClass)}</article>
          <article class="panel"><h3>Concentración por posición</h3>${barList(analysis.bySymbol.slice(0, 10))}</article>
          <article class="panel wide"><h3>Evolución de cartera</h3>${lineChart(analysis.timeline, ['marketValue', 'investedOpen', 'realizedPnl'])}</article>
          <article class="panel wide"><h3>Actividad mensual</h3>${stackedBars(analysis.monthly)}</article>
        </section>
      </section>

      <section class="app-screen hidden" data-app-screen="actividad">
        <section class="panel"><h3>Ganancias/pérdidas realizadas por venta</h3>${realizedTable(analysis.realizedTrades)}</section>
        <section class="panel"><h3>Transacciones importadas</h3>${transactionsTable(analysis.transactions)}</section>
      </section>

      <section class="app-screen hidden" data-app-screen="ajustes">
        <section class="panel settings-panel">
          <p class="eyebrow">Ajustes locales</p>
          <h3>Datos y experiencia</h3>
          <div class="settings-actions">
            <label class="primary-action" for="csv-input">Importar otro CSV</label>
            <button class="ghost-button" type="button" data-reset-prices>Restablecer precios manuales</button>
            <button class="danger-action compact" type="button" data-clear-csv>Limpiar datos</button>
          </div>
          <p class="muted">Todo vive en tu navegador: CSV en localStorage y precios manuales por símbolo.</p>
        </section>
      </section>

      <nav class="bottom-nav" aria-label="Navegación principal">
        <button class="active" type="button" data-open-screen="inicio"><span>🏠</span>Inicio</button>
        <button type="button" data-open-screen="cartera"><span>💼</span>Cartera</button>
        <button type="button" data-open-screen="analisis"><span>📈</span>Análisis</button>
        <button type="button" data-open-screen="actividad"><span>🧾</span>Actividad</button>
        <button type="button" data-open-screen="ajustes"><span>⚙️</span>Ajustes</button>
      </nav>
    </div>
  `;
}

function kpi(label: string, value: string, hint: string, trend = 0): string {
  const className = trend > 0 ? 'positive' : trend < 0 ? 'negative' : '';
  const icon = trend > 0 ? '↗' : trend < 0 ? '↘' : '•';
  return `<article class="kpi"><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(value)}</strong><small><i aria-hidden="true">${icon}</i>${escapeHtml(hint)}</small></article>`;
}

function donutChart(data: { label: string; value: number }[]): string {
  const visibleData = data.filter((item) => item.value > 0);
  if (!visibleData.length) return emptyChart('No hay posiciones abiertas.');

  const total = visibleData.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;
  const circles = visibleData.map((item, index) => {
    const dash = (item.value / total) * 100;
    const circle = `<circle r="15.915" cx="18" cy="18" fill="transparent" stroke="var(--chart-${(index % 6) + 1})" stroke-width="6" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${offset}" />`;
    offset -= dash;
    return circle;
  }).join('');

  return `<div class="donut-wrap"><div class="donut-frame"><svg viewBox="0 0 36 36" class="donut" role="img" aria-label="Asignación por clase de activo">${circles}</svg><strong>${pct(100)}</strong></div><div class="legend">${visibleData.map((item, index) => `<span><i style="background:var(--chart-${(index % 6) + 1})"></i>${escapeHtml(item.label)} · ${money(item.value)}</span>`).join('')}</div></div>`;
}

function barList(data: { label: string; value: number; subtitle?: string }[]): string {
  if (!data.length) return emptyChart('No hay posiciones abiertas.');
  const max = Math.max(...data.map((item) => item.value), 1);
  return `<div class="bar-list">${data.map((item) => `<div><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.subtitle ?? '')}</small></span><div class="bar"><i style="width:${Math.max(2, (item.value / max) * 100)}%"></i></div><strong>${money(item.value)}</strong></div>`).join('')}</div>`;
}

function lineChart(data: TimelinePoint[], keys: Array<'marketValue' | 'investedOpen' | 'realizedPnl'>): string {
  if (data.length < 2) return emptyChart('Se necesitan al menos dos fechas.');
  const width = 720;
  const height = 280;
  const values = data.flatMap((point) => keys.map((key) => point[key]));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const x = (index: number) => 44 + (index / Math.max(1, data.length - 1)) * (width - 80);
  const y = (value: number) => height - 40 - ((value - min) / (max - min || 1)) * (height - 70);
  const labels = { marketValue: 'Valor mercado', investedOpen: 'Invertido abierto', realizedPnl: 'P&L realizado' };

  return `<div class="chart-scroll"><svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de cartera">
    <line x1="44" y1="${y(0)}" x2="${width - 24}" y2="${y(0)}" class="axis" />
    ${keys.map((key, index) => `<polyline points="${data.map((point, pointIndex) => `${x(pointIndex)},${y(point[key])}`).join(' ')}" fill="none" stroke="var(--chart-${index + 1})" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />`).join('')}
    ${data.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.marketValue)}" r="3.5"><title>${escapeHtml(point.date)}: ${money(point.marketValue)}</title></circle>`).join('')}
    <text x="44" y="22">${money(max)}</text><text x="44" y="${height - 10}">${money(min)}</text>
  </svg></div><div class="legend inline">${keys.map((key, index) => `<span><i style="background:var(--chart-${index + 1})"></i>${labels[key]}</span>`).join('')}</div>`;
}

function stackedBars(data: MonthlyPoint[]): string {
  if (!data.length) return emptyChart('No hay actividad mensual.');
  const max = Math.max(...data.map((item) => Math.abs(item.deposits) + Math.abs(item.invested) + Math.abs(item.realized) + Math.abs(item.dividends)), 1);

  return `<div class="month-bars">${data.map((item) => {
    const segments: Array<[string, number, ChartColor]> = [
      ['Aportado', Math.abs(item.deposits), 'var(--chart-1)'],
      ['Invertido', Math.abs(item.invested), 'var(--chart-2)'],
      ['Realizado', Math.abs(item.realized), item.realized >= 0 ? 'var(--positive)' : 'var(--negative)'],
      ['Dividendos', Math.abs(item.dividends), 'var(--chart-4)'],
    ];
    return `<div class="month"><span>${escapeHtml(item.month)}</span><div class="stack" title="${escapeHtml(item.month)}">${segments.map(([label, value, color]) => `<i title="${escapeHtml(label)}: ${money(value)}" style="height:${Math.max(2, (value / max) * 100)}%;background:${color}"></i>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

function editablePositions(positions: Position[]): string {
  if (!positions.length) return emptyChart('No hay posiciones abiertas.');

  return `<div class="position-cards">${positions.map((position) => `
    <article class="position-card" data-symbol="${escapeHtml(position.symbol)}">
      <div class="position-main">
        <span class="asset-avatar">${escapeHtml((position.symbol || '?').slice(0, 2))}</span>
        <div>
          <b>${escapeHtml(position.name || position.symbol)}</b>
          <small>${escapeHtml(position.symbol)} · ${escapeHtml(position.assetClass)} · ${decimals(position.shares)} uds.</small>
        </div>
        <strong>${money(position.value)}</strong>
      </div>
      <div class="position-stats">
        <span><small>Invertido</small><b>${money(position.invested)}</b></span>
        <span><small>P&L</small><b class="${position.unrealized > 0 ? 'positive' : position.unrealized < 0 ? 'negative' : ''}">${position.unrealized > 0 ? '+' : ''}${money(position.unrealized)}</b></span>
        <span><small>Rent.</small><b class="${position.returnPct > 0 ? 'positive' : position.returnPct < 0 ? 'negative' : ''}">${pct(position.returnPct)}</b></span>
      </div>
      <form class="price-editor" data-price-form>
        <label>Precio actual
          <input type="number" min="0" step="0.000001" inputmode="decimal" value="${Number.isFinite(position.lastPrice) ? position.lastPrice : 0}" data-price-input="${escapeHtml(position.symbol)}" aria-label="Editar precio de ${escapeHtml(position.symbol)}" />
        </label>
        <button type="submit">Aplicar</button>
        <small>Origen: ${escapeHtml(position.lastDate || 'sin fecha')}</small>
      </form>
    </article>
  `).join('')}</div>`;
}

function realizedTable(trades: RealizedTrade[]): string {
  if (!trades.length) return emptyChart('No hay ventas con P&L realizado.');
  return table(['Fecha', 'Activo', 'Símbolo', 'Participaciones', 'Ingreso neto', 'Coste FIFO', 'P&L'], trades.map((trade) => [trade.date, trade.name, trade.symbol, decimals(trade.shares), money(trade.proceeds), money(trade.costBasis), signed(trade.pnl)]));
}

function transactionsTable(transactions: Transaction[]): string {
  return `<label class="filter">Buscar transacciones<input id="tx-filter" type="search" placeholder="Ej. NVIDIA, DIVIDEND, 2025-06..." /></label>` + table(['Fecha', 'Categoría', 'Tipo', 'Activo', 'Símbolo', 'Participaciones', 'Precio', 'Importe', 'Comisión', 'Impuesto'], transactions.slice().reverse().map((transaction) => [
    transaction.date,
    transaction.category,
    transaction.type,
    transaction.name,
    transaction.symbol,
    transaction.shares ? decimals(transaction.shares) : '',
    transaction.price ? money(transaction.price) : '',
    money(transaction.amount),
    transaction.fee ? money(transaction.fee) : '',
    transaction.tax ? money(transaction.tax) : '',
  ]));
}

function attachDashboardInteractions(): void {
  attachClearButtons();
  attachTransactionFilter();
  attachMobileNavigation();
  attachPriceEditors();
  attachResetPrices();
}

function attachClearButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-clear-csv]')) {
    button.addEventListener('click', () => clearDataButton.click());
  }
}

function attachMobileNavigation(): void {
  const openScreen = (target: string): void => {
    for (const screen of document.querySelectorAll<HTMLElement>('[data-app-screen]')) {
      screen.classList.toggle('hidden', screen.dataset.appScreen !== target);
    }
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-screen]')) {
      button.classList.toggle('active', button.dataset.openScreen === target);
    }
    document.querySelector<HTMLElement>('.app-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-open-screen]')) {
    button.addEventListener('click', () => openScreen(button.dataset.openScreen ?? 'inicio'));
  }
}

function attachPriceEditors(): void {
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
      rerenderFromCurrentDataset();
      showInlineNotice(`Precio de ${symbol} actualizado a ${money(nextPrice)}.`);
    });
  }
}

function attachResetPrices(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-reset-prices]')) {
    button.addEventListener('click', () => {
      savePriceOverrides({});
      rerenderFromCurrentDataset();
      showInlineNotice('Precios manuales restablecidos.');
    });
  }
}

function showInlineNotice(message: string): void {
  warning.classList.remove('hidden', 'notice-error');
  warning.innerHTML = `<strong>${escapeHtml(message)}</strong>`;
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

function table(headers: string[], rows: TableCell[][]): string {
  return `<div class="table-wrap" tabindex="0"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => {
    const searchValue = row.map(searchableCellValue).join(' ').toLowerCase();
    return `<tr data-search="${escapeHtml(searchValue)}">${row.map((cell) => `<td>${renderCell(cell)}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div>`;
}

function renderCell(cell: TableCell): string {
  return typeof cell === 'string' ? escapeHtml(cell) : cell.html;
}

function searchableCellValue(cell: TableCell): string {
  return typeof cell === 'string' ? cell : cell.search;
}

function emptyChart(message: string): string {
  return `<div class="empty-chart">${escapeHtml(message)}</div>`;
}

function number(value: string | undefined): number {
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

function normalizeToken(value = ''): string {
  return value.trim().toUpperCase();
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const europeanMatch = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
  if (europeanMatch) return `${europeanMatch[3]}-${europeanMatch[2].padStart(2, '0')}-${europeanMatch[1].padStart(2, '0')}`;
  return trimmed.slice(0, 10);
}

function money(value: number): string {
  return MONEY.format(Number.isFinite(value) ? value : 0);
}

function pct(value: number): string {
  return `${PERCENT.format(Number.isFinite(value) ? value : 0)}%`;
}

function decimals(value: number): string {
  return DECIMAL.format(Number.isFinite(value) ? value : 0);
}

function signed(value: number): TableCell {
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  const content = `${value > 0 ? '+' : ''}${money(value)}`;
  return { html: `<span class="${className}">${escapeHtml(content)}</span>`, search: content };
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`No se encontró el elemento ${selector}.`);
  return element;
}
