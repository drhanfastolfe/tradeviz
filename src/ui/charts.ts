import type { ChartColor, MonthlyPoint, TimelinePoint } from '../domain/types';
import { emptyChart } from './components';
import { money, pct } from './format';
import { escapeHtml } from './html';

export function donutChart(data: { label: string; value: number }[]): string {
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

export function barList(data: { label: string; value: number; subtitle?: string }[]): string {
  if (!data.length) return emptyChart('No hay posiciones abiertas.');
  const max = Math.max(...data.map((item) => item.value), 1);
  return `<div class="bar-list">${data.map((item) => `<div><span><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.subtitle ?? '')}</small></span><div class="bar"><i style="width:${Math.max(2, (item.value / max) * 100)}%"></i></div><strong>${money(item.value)}</strong></div>`).join('')}</div>`;
}

export function lineChart(data: TimelinePoint[], keys: Array<'marketValue' | 'investedOpen' | 'realizedPnl'>): string {
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

export function stackedBars(data: MonthlyPoint[]): string {
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
