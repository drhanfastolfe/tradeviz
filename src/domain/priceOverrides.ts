import { groupPositions } from './positions';
import type { Analysis } from './types';

export function applyPriceOverrides(analysis: Analysis, overrides: Record<string, number>): Analysis {
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
