import { requireElement } from './html';

export type ShellElements = {
  input: HTMLInputElement;
  dashboard: HTMLElement;
  emptyState: HTMLElement;
  warning: HTMLElement;
  clearDataButton: HTMLButtonElement;
};

export function renderShell(app: HTMLElement): ShellElements {
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

  return {
    input: requireElement<HTMLInputElement>('#csv-input'),
    dashboard: requireElement<HTMLElement>('#dashboard'),
    emptyState: requireElement<HTMLElement>('#empty-state'),
    warning: requireElement<HTMLElement>('#format-warning'),
    clearDataButton: requireElement<HTMLButtonElement>('#clear-data'),
  };
}
