import { escapeHtml } from './html';

export function kpi(label: string, value: string, hint: string, trend = 0): string {
  const className = trend > 0 ? 'positive' : trend < 0 ? 'negative' : '';
  const icon = trend > 0 ? '↗' : trend < 0 ? '↘' : '•';
  return `<article class="kpi"><span>${escapeHtml(label)}</span><strong class="${className}">${escapeHtml(value)}</strong><small><i aria-hidden="true">${icon}</i>${escapeHtml(hint)}</small></article>`;
}

export function emptyChart(message: string): string {
  return `<div class="empty-chart">${escapeHtml(message)}</div>`;
}
