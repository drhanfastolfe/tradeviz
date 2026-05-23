import type { Analysis } from '../domain/types';
import { money } from './format';
import { escapeHtml } from './html';
import { activityScreen, analysisScreen, homeScreen, portfolioScreen, settingsScreen } from './screens';

export function renderDashboard(dashboard: HTMLElement, emptyState: HTMLElement, analysis: Analysis, fileName: string): void {
  emptyState.classList.add('hidden');
  dashboard.classList.remove('hidden');
  const { totals } = analysis;

  dashboard.innerHTML = `
    <div class="app-dashboard" data-active-screen="inicio">
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

      ${homeScreen(analysis)}
      ${portfolioScreen(analysis)}
      ${analysisScreen(analysis)}
      ${activityScreen(analysis)}
      ${settingsScreen()}

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
