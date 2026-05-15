import type { Position, RealizedTrade, TableCell, Transaction } from '../domain/types';
import { emptyChart } from './components';
import { decimals, money, pct, signed } from './format';
import { escapeHtml, renderCell, searchableCellValue } from './html';

export function table(headers: string[], rows: TableCell[][]): string {
  return `<div class="table-wrap" tabindex="0"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => {
    const searchValue = row.map(searchableCellValue).join(' ').toLowerCase();
    return `<tr data-search="${escapeHtml(searchValue)}">${row.map((cell) => `<td>${renderCell(cell)}</td>`).join('')}</tr>`;
  }).join('')}</tbody></table></div>`;
}

export function editablePositions(positions: Position[]): string {
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

export function realizedTable(trades: RealizedTrade[]): string {
  if (!trades.length) return emptyChart('No hay ventas con P&L realizado.');
  return table(['Fecha', 'Activo', 'Símbolo', 'Participaciones', 'Ingreso neto', 'Coste FIFO', 'P&L'], trades.map((trade) => [trade.date, trade.name, trade.symbol, decimals(trade.shares), money(trade.proceeds), money(trade.costBasis), signed(trade.pnl)]));
}

export function transactionsTable(transactions: Transaction[]): string {
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
