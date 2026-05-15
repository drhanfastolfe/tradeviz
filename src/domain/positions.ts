import { EPSILON } from './constants';
import type { Lot, Position } from './types';

export function snapshotPositions(lots: Map<string, Lot[]>, meta: Map<string, Pick<Position, 'symbol' | 'name' | 'assetClass' | 'lastPrice' | 'lastDate'>>): Position[] {
  return [...lots.entries()].map(([symbol, symbolLots]) => {
    const shares = symbolLots.reduce((sum, lot) => sum + lot.shares, 0);
    const invested = symbolLots.reduce((sum, lot) => sum + lot.cost, 0);
    const info = meta.get(symbol) ?? { symbol, name: symbol, assetClass: 'Sin clase', lastPrice: 0, lastDate: '' };
    const value = shares * info.lastPrice;
    const unrealized = value - invested;
    return { ...info, shares, invested, value, unrealized, returnPct: invested ? (unrealized / invested) * 100 : 0 };
  }).filter((position) => position.shares > EPSILON);
}

export function groupPositions(positions: Position[], labelFor: (position: Position) => string): { label: string; value: number }[] {
  const groups = new Map<string, number>();
  for (const position of positions) {
    const label = labelFor(position) || 'Sin clasificar';
    groups.set(label, (groups.get(label) ?? 0) + position.value);
  }
  return [...groups.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}
