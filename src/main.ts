import './styles.css';

type CsvRow = Record<string, string>;

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
  monthly: { month: string; deposits: number; invested: number; realized: number; dividends: number; fees: number }[];
  timeline: { date: string; netCash: number; investedOpen: number; marketValue: number; realizedPnl: number }[];
};

const EXPECTED_COLUMNS = [
  'datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol', 'shares', 'price', 'amount', 'fee', 'tax', 'currency',
  'original_amount', 'original_currency', 'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban', 'payment_reference', 'mcc_code',
];

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <header class="hero">
    <div>
      <p class="eyebrow">TradeViz · CSV local y privado</p>
      <h1>Visualiza tus transacciones, posiciones y rentabilidad.</h1>
      <p class="hero-copy">Sube un CSV con columnas como <code>datetime,date,account_type,category,type,asset_class,name,symbol,shares,price,amount,fee,tax,currency</code>. Todo se calcula en tu navegador; no se envía nada a ningún servidor.</p>
    </div>
    <label class="upload-card" for="csv-input">
      <span>📄</span>
      <strong>Seleccionar CSV</strong>
      <small>Formato Trade Republic / exportación similar</small>
      <input id="csv-input" type="file" accept=".csv,text/csv" />
    </label>
  </header>
  <main>
    <section id="empty-state" class="panel empty">
      <h2>Qué podrás analizar</h2>
      <div class="feature-grid">
        <article><b>KPIs globales</b><span>aportaciones, ventas, dividendos, comisiones, impuestos y P&L.</span></article>
        <article><b>Posiciones abiertas</b><span>acciones/ETFs por símbolo, coste FIFO estimado y valoración al último precio del CSV.</span></article>
        <article><b>Visualizaciones</b><span>asignación por activo, concentración por posición y evolución mensual.</span></article>
        <article><b>Auditoría</b><span>tabla completa y buscable de todas las transacciones importadas.</span></article>
      </div>
    </section>
    <section id="format-warning" class="notice hidden"></section>
    <section id="dashboard" class="hidden"></section>
  </main>
  <footer>Hecho para GitHub Pages · Sin backend · Sin tracking</footer>
`;

const input = document.querySelector<HTMLInputElement>('#csv-input')!;
const dashboard = document.querySelector<HTMLElement>('#dashboard')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;
const warning = document.querySelector<HTMLElement>('#format-warning')!;

input.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const { rows, headers } = parseCsv(text);
    const missing = EXPECTED_COLUMNS.filter((column) => !headers.includes(column));
    const transactions = rows.map(normalizeTransaction).filter((transaction) => transaction.date || transaction.datetime);
    const analysis = analyse(transactions);
    renderDashboard(analysis, file.name);
    attachTransactionFilter();
    renderWarning(missing, transactions.length);
  } catch (error) {
    warning.classList.remove('hidden');
    warning.innerHTML = `<strong>No se pudo leer el CSV.</strong> ${escapeHtml(error instanceof Error ? error.message : String(error))}`;
  }
});

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
    } else if (char === ',' && !inQuotes) {
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
  row.push(field.trim());
  if (row.some(Boolean)) records.push(row);

  if (records.length === 0) throw new Error('El archivo está vacío.');
  const headers = records[0].map((header) => header.trim());
  const rows = records.slice(1).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
  return { headers, rows };
}

function normalizeTransaction(row: CsvRow): Transaction {
  return {
    datetime: row.datetime ?? '',
    date: row.date || (row.datetime ? row.datetime.slice(0, 10) : ''),
    accountType: row.account_type ?? '',
    category: row.category ?? '',
    type: row.type ?? '',
    assetClass: row.asset_class ?? '',
    name: row.name ?? '',
    symbol: row.symbol ?? '',
    shares: number(row.shares),
    price: number(row.price),
    amount: number(row.amount),
    fee: number(row.fee),
    tax: number(row.tax),
    currency: row.currency || 'EUR',
    originalAmount: number(row.original_amount),
    originalCurrency: row.original_currency ?? '',
    fxRate: number(row.fx_rate),
    description: row.description ?? '',
    transactionId: row.transaction_id ?? '',
    counterpartyName: row.counterparty_name ?? '',
    counterpartyIban: row.counterparty_iban ?? '',
    paymentReference: row.payment_reference ?? '',
    mccCode: row.mcc_code ?? '',
  };
}

function analyse(transactions: Transaction[]): Analysis {
  const sorted = [...transactions].sort((a, b) => (a.datetime || a.date).localeCompare(b.datetime || b.date));
  const lots = new Map<string, Lot[]>();
  const meta = new Map<string, Pick<Position, 'symbol' | 'name' | 'assetClass' | 'lastPrice' | 'lastDate'>>();
  const realizedTrades: RealizedTrade[] = [];
  const monthly = new Map<string, Analysis['monthly'][number]>();
  const timeline: Analysis['timeline'] = [];
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
    const fee = transaction.fee || 0;
    const tax = transaction.tax || 0;
    fees += Math.abs(fee);
    taxes += Math.abs(tax);
    const month = transaction.date.slice(0, 7) || 'Sin fecha';
    const monthRow = monthly.get(month) ?? { month, deposits: 0, invested: 0, realized: 0, dividends: 0, fees: 0 };

    if (transaction.category === 'CASH' && ['CUSTOMER_INPAYMENT', 'CUSTOMER_INBOUND', 'TRANSFER_INSTANT_INBOUND'].includes(transaction.type)) {
      deposits += amount;
      netCash += amount;
      monthRow.deposits += amount;
    } else if (transaction.category === 'CASH' && amount < 0 && !transaction.symbol) {
      withdrawals += Math.abs(amount);
      netCash += amount;
    }

    if (transaction.type === 'DIVIDEND') {
      dividends += amount;
      netCash += amount + fee + tax;
      monthRow.dividends += amount;
    }
    if (transaction.type === 'STOCKPERK') {
      perks += amount;
      netCash += amount + fee + tax;
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
      if (transaction.type === 'BUY' && transaction.shares > 0) {
        const cost = Math.abs(amount) + Math.abs(fee) + Math.abs(tax);
        buys += cost;
        netCash -= cost;
        monthRow.invested += cost;
        symbolLots.push({ shares: transaction.shares, cost });
      }
      if (transaction.type === 'SELL' && transaction.shares < 0) {
        const sharesSold = Math.abs(transaction.shares);
        const proceeds = Math.max(0, amount - Math.abs(fee) - Math.abs(tax));
        const costBasis = consumeLots(symbolLots, sharesSold);
        const pnl = proceeds - costBasis;
        sells += proceeds;
        realizedPnl += pnl;
        netCash += proceeds;
        monthRow.realized += pnl;
        realizedTrades.push({ date: transaction.date, symbol: transaction.symbol, name: transaction.name || transaction.symbol, shares: sharesSold, proceeds, costBasis, pnl });
      }
      lots.set(transaction.symbol, symbolLots.filter((lot) => lot.shares > 0.000001));
    }

    monthRow.fees += Math.abs(fee);
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
  const totalPnl = realizedPnl + unrealizedPnl + dividends + perks - taxes;
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
  while (remaining > 0.000001 && lots.length > 0) {
    const lot = lots[0];
    const used = Math.min(remaining, lot.shares);
    const unitCost = lot.cost / lot.shares;
    costBasis += used * unitCost;
    lot.shares -= used;
    lot.cost -= used * unitCost;
    remaining -= used;
    if (lot.shares <= 0.000001) lots.shift();
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
  }).filter((position) => position.shares > 0.000001);
}

function groupPositions(positions: Position[], labelFor: (position: Position) => string): { label: string; value: number }[] {
  const groups = new Map<string, number>();
  for (const position of positions) groups.set(labelFor(position), (groups.get(labelFor(position)) ?? 0) + position.value);
  return [...groups.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function compressTimeline(timeline: Analysis['timeline']): Analysis['timeline'] {
  const byDate = new Map<string, Analysis['timeline'][number]>();
  for (const point of timeline) byDate.set(point.date, point);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function renderWarning(missing: string[], count: number): void {
  warning.classList.remove('hidden');
  warning.innerHTML = missing.length
    ? `<strong>CSV cargado con ${count} filas.</strong> Faltan columnas esperadas: ${missing.map(escapeHtml).join(', ')}. Se han usado las disponibles.`
    : `<strong>CSV cargado correctamente.</strong> ${count} transacciones importadas.`;
}

function renderDashboard(analysis: Analysis, fileName: string): void {
  emptyState.classList.add('hidden');
  dashboard.classList.remove('hidden');
  const { totals } = analysis;
  dashboard.innerHTML = `
    <div class="section-title">
      <div><p class="eyebrow">Archivo</p><h2>${escapeHtml(fileName)}</h2></div>
      <p class="muted">La valoración usa el último precio disponible en el CSV, no cotizaciones en tiempo real.</p>
    </div>
    <section class="kpi-grid">
      ${kpi('Valor posiciones', money(totals.currentValue), 'Abiertas al último precio CSV')}
      ${kpi('Invertido abierto', money(totals.investedOpen), 'Coste FIFO pendiente')}
      ${kpi('P&L total estimado', money(totals.totalPnl), `${pct(totals.totalReturnPct)} sobre compras`, totals.totalPnl)}
      ${kpi('Aportado neto', money(totals.netCashAdded), `${money(totals.deposits)} entradas · ${money(totals.withdrawals)} salidas`)}
      ${kpi('P&L realizado', money(totals.realizedPnl), `${analysis.realizedTrades.length} ventas`, totals.realizedPnl)}
      ${kpi('P&L no realizado', money(totals.unrealizedPnl), 'Sobre posiciones abiertas', totals.unrealizedPnl)}
      ${kpi('Dividendos y perks', money(totals.dividends + totals.perks), `${money(totals.dividends)} dividendos`)}
      ${kpi('Costes', money(totals.fees + totals.taxes), `${money(totals.fees)} comisiones · ${money(totals.taxes)} impuestos`, -(totals.fees + totals.taxes))}
    </section>
    <section class="charts-grid">
      <article class="panel"><h3>Asignación por clase de activo</h3>${donutChart(analysis.byAssetClass)}</article>
      <article class="panel"><h3>Concentración por posición</h3>${barList(analysis.bySymbol.slice(0, 10))}</article>
      <article class="panel wide"><h3>Evolución de cartera</h3>${lineChart(analysis.timeline, ['marketValue', 'investedOpen', 'realizedPnl'])}</article>
      <article class="panel wide"><h3>Actividad mensual</h3>${stackedBars(analysis.monthly)}</article>
    </section>
    <section class="panel"><h3>Posiciones abiertas</h3>${positionsTable(analysis.positions)}</section>
    <section class="panel"><h3>Ganancias/pérdidas realizadas por venta</h3>${realizedTable(analysis.realizedTrades)}</section>
    <section class="panel"><h3>Transacciones importadas</h3>${transactionsTable(analysis.transactions)}</section>
  `;
}

function kpi(label: string, value: string, hint: string, trend = 0): string {
  const className = trend > 0 ? 'positive' : trend < 0 ? 'negative' : '';
  return `<article class="kpi"><span>${label}</span><strong class="${className}">${value}</strong><small>${hint}</small></article>`;
}

function donutChart(data: { label: string; value: number }[]): string {
  if (!data.length) return emptyChart('No hay posiciones abiertas.');
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 25;
  const circles = data.map((item, index) => {
    const dash = (item.value / total) * 100;
    const circle = `<circle r="15.915" cx="18" cy="18" fill="transparent" stroke="var(--chart-${(index % 6) + 1})" stroke-width="6" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${offset}" />`;
    offset -= dash;
    return circle;
  }).join('');
  return `<div class="donut-wrap"><svg viewBox="0 0 36 36" class="donut">${circles}</svg><div class="legend">${data.map((item, index) => `<span><i style="background:var(--chart-${(index % 6) + 1})"></i>${escapeHtml(item.label)} · ${money(item.value)}</span>`).join('')}</div></div>`;
}

function barList(data: { label: string; value: number; subtitle?: string }[]): string {
  if (!data.length) return emptyChart('No hay posiciones abiertas.');
  const max = Math.max(...data.map((item) => item.value), 1);
  return `<div class="bar-list">${data.map((item) => `<div><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.subtitle ?? '')}</small></span><div class="bar"><i style="width:${(item.value / max) * 100}%"></i></div><strong>${money(item.value)}</strong></div>`).join('')}</div>`;
}

function lineChart(data: Analysis['timeline'], keys: Array<'marketValue' | 'investedOpen' | 'realizedPnl'>): string {
  if (data.length < 2) return emptyChart('Se necesitan al menos dos fechas.');
  const width = 720;
  const height = 260;
  const values = data.flatMap((point) => keys.map((key) => point[key]));
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const x = (index: number) => 40 + (index / Math.max(1, data.length - 1)) * (width - 70);
  const y = (value: number) => height - 35 - ((value - min) / (max - min || 1)) * (height - 60);
  const labels = { marketValue: 'Valor mercado', investedOpen: 'Invertido abierto', realizedPnl: 'P&L realizado' };
  return `<svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolución de cartera">
    <line x1="40" y1="${y(0)}" x2="${width - 20}" y2="${y(0)}" class="axis" />
    ${keys.map((key, index) => `<polyline points="${data.map((point, pointIndex) => `${x(pointIndex)},${y(point[key])}`).join(' ')}" fill="none" stroke="var(--chart-${index + 1})" stroke-width="3" />`).join('')}
    ${data.map((point, index) => `<circle cx="${x(index)}" cy="${y(point.marketValue)}" r="3"><title>${point.date}: ${money(point.marketValue)}</title></circle>`).join('')}
    <text x="40" y="20">${money(max)}</text><text x="40" y="${height - 8}">${money(min)}</text>
  </svg><div class="legend inline">${keys.map((key, index) => `<span><i style="background:var(--chart-${index + 1})"></i>${labels[key]}</span>`).join('')}</div>`;
}

function stackedBars(data: Analysis['monthly']): string {
  if (!data.length) return emptyChart('No hay actividad mensual.');
  const max = Math.max(...data.map((item) => Math.abs(item.deposits) + Math.abs(item.invested) + Math.abs(item.realized) + Math.abs(item.dividends)), 1);
  return `<div class="month-bars">${data.map((item) => {
    const segments = [
      ['Aportado', item.deposits, 'var(--chart-1)'],
      ['Invertido', item.invested, 'var(--chart-2)'],
      ['Realizado', Math.abs(item.realized), item.realized >= 0 ? 'var(--positive)' : 'var(--negative)'],
      ['Dividendos', item.dividends, 'var(--chart-4)'],
    ];
    return `<div class="month"><span>${escapeHtml(item.month)}</span><div class="stack" title="${escapeHtml(item.month)}">${segments.map(([label, value, color]) => `<i title="${label}: ${money(Number(value))}" style="height:${(Number(value) / max) * 100}%;background:${color}"></i>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

function positionsTable(positions: Position[]): string {
  if (!positions.length) return emptyChart('No hay posiciones abiertas.');
  return table(['Activo', 'Símbolo', 'Clase', 'Participaciones', 'Invertido', 'Valor', 'P&L', 'Último precio'], positions.map((position) => [
    position.name,
    position.symbol,
    position.assetClass,
    decimals(position.shares),
    money(position.invested),
    money(position.value),
    signed(position.unrealized, true),
    `${money(position.lastPrice)} (${position.lastDate})`,
  ]));
}

function realizedTable(trades: RealizedTrade[]): string {
  if (!trades.length) return emptyChart('No hay ventas con P&L realizado.');
  return table(['Fecha', 'Activo', 'Símbolo', 'Participaciones', 'Ingreso neto', 'Coste FIFO', 'P&L'], trades.map((trade) => [trade.date, trade.name, trade.symbol, decimals(trade.shares), money(trade.proceeds), money(trade.costBasis), signed(trade.pnl, true)]));
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

function table(headers: string[], rows: string[][]): string {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr data-search="${escapeHtml(row.join(' ').toLowerCase())}">${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function emptyChart(message: string): string {
  return `<div class="empty-chart">${escapeHtml(message)}</div>`;
}

function number(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(/\s/g, '').replace(/,(?=\d{1,2}$)/, '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value || 0);
}

function pct(value: number): string {
  return `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(value || 0)}%`;
}

function decimals(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 6 }).format(value || 0);
}

function signed(value: number, withPctClass = false): string {
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  const content = `${value > 0 ? '+' : ''}${money(value)}`;
  return withPctClass ? `<span class="${className}">${content}</span>` : content;
}

function escapeHtml(value: string): string {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]!));
}
