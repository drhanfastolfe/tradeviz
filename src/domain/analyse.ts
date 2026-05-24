import { DEPOSIT_TYPES, EPSILON } from './constants';
import { consumeLots } from './fifo';
import { groupPositions, snapshotPositions } from './positions';
import { compressTimeline } from './timeline';
import type { Analysis, Lot, MonthlyPoint, Position, RealizedTrade, TimelinePoint, Transaction } from './types';

export function analyse(transactions: Transaction[]): Analysis {
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
