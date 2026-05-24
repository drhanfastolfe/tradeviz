import type { Analysis } from '../domain/types';
import { barList, donutChart, lineChart, stackedBars } from './charts';
import { kpi } from './components';
import { money, pct } from './format';
import { escapeHtml } from './html';
import { editablePositions, realizedTable, transactionsTable } from './tables';

export function homeScreen(analysis: Analysis): string {
  const { totals } = analysis;
  const bestPosition = analysis.positions[0];
  const cashEfficiency = totals.netCashAdded ? (totals.currentValue / Math.max(1, totals.netCashAdded)) * 100 : 0;

  return `<section class="app-screen" data-app-screen="inicio">
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
  </section>`;
}

export function portfolioScreen(analysis: Analysis): string {
  return `<section class="app-screen hidden" data-app-screen="cartera">
    <div class="section-title compact-title">
      <div><p class="eyebrow">Cartera</p><h3>Posiciones abiertas</h3></div>
      <span class="pill-note">Edita precio y recalcula</span>
    </div>
    ${editablePositions(analysis.positions)}
  </section>`;
}

export function analysisScreen(analysis: Analysis): string {
  const { totals } = analysis;
  return `<section class="app-screen hidden" data-app-screen="analisis">
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
  </section>`;
}

export function activityScreen(analysis: Analysis): string {
  return `<section class="app-screen hidden" data-app-screen="actividad">
    <section class="panel"><h3>Ganancias/pérdidas realizadas por venta</h3>${realizedTable(analysis.realizedTrades)}</section>
    <section class="panel"><h3>Transacciones importadas</h3>${transactionsTable(analysis.transactions)}</section>
    <div class="screen-end-sentinel" data-screen-end="actividad" aria-hidden="true"></div>
  </section>`;
}

export function settingsScreen(): string {
  return `<section class="app-screen hidden" data-app-screen="ajustes">
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
  </section>`;
}
