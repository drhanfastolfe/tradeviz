import { describe, expect, it } from 'vitest';
import { analyse } from './analyse';
import { applyPriceOverrides } from './priceOverrides';
import type { Transaction } from './types';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    datetime: overrides.datetime ?? `${overrides.date ?? '2025-01-01'}T10:00:00Z`,
    date: overrides.date ?? '2025-01-01',
    accountType: 'SECURITIES',
    category: 'TRADING',
    type: 'BUY',
    assetClass: 'STOCK',
    name: 'Acme Corp',
    symbol: 'ACME',
    shares: 0,
    price: 0,
    amount: 0,
    fee: 0,
    tax: 0,
    currency: 'EUR',
    originalAmount: 0,
    originalCurrency: '',
    fxRate: 0,
    description: '',
    transactionId: '',
    counterpartyName: '',
    counterpartyIban: '',
    paymentReference: '',
    mccCode: '',
    ...overrides,
  };
}

describe('analyse', () => {
  it('creates an open position from a single BUY using the latest CSV price', () => {
    const result = analyse([tx({ shares: 2, price: 10, amount: -20 })]);

    expect(result.positions[0]).toMatchObject({ symbol: 'ACME', shares: 2, invested: 20, value: 20, unrealized: 0 });
    expect(result.totals.currentValue).toBe(20);
  });

  it('consumes partial SELL FIFO cost basis and leaves open invested amount', () => {
    const result = analyse([
      tx({ date: '2025-01-01', datetime: '2025-01-01T10:00:00Z', shares: 10, price: 10, amount: -100 }),
      tx({ date: '2025-01-02', datetime: '2025-01-02T10:00:00Z', type: 'SELL', shares: -4, price: 15, amount: 60 }),
    ]);

    expect(result.realizedTrades[0]).toMatchObject({ shares: 4, proceeds: 60, costBasis: 40, pnl: 20 });
    expect(result.positions[0]).toMatchObject({ shares: 6, invested: 60, value: 90, unrealized: 30 });
  });

  it('removes a position after a full SELL', () => {
    const result = analyse([
      tx({ date: '2025-01-01', datetime: '2025-01-01T10:00:00Z', shares: 2, price: 10, amount: -20 }),
      tx({ date: '2025-01-02', datetime: '2025-01-02T10:00:00Z', type: 'SELL', shares: -2, price: 12, amount: 24 }),
    ]);

    expect(result.positions).toHaveLength(0);
    expect(result.totals.realizedPnl).toBe(4);
  });

  it('consumes the oldest BUY lot first across multiple lots', () => {
    const result = analyse([
      tx({ date: '2025-01-01', datetime: '2025-01-01T10:00:00Z', shares: 5, price: 10, amount: -50 }),
      tx({ date: '2025-01-02', datetime: '2025-01-02T10:00:00Z', shares: 5, price: 20, amount: -100 }),
      tx({ date: '2025-01-03', datetime: '2025-01-03T10:00:00Z', type: 'SELL', shares: -7, price: 30, amount: 210 }),
    ]);

    expect(result.realizedTrades[0]?.costBasis).toBe(90);
    expect(result.realizedTrades[0]?.pnl).toBe(120);
    expect(result.positions[0]).toMatchObject({ shares: 3, invested: 60, value: 90 });
  });

  it('includes buy fees/taxes in cost and subtracts sell fees/taxes from proceeds', () => {
    const result = analyse([
      tx({ date: '2025-01-01', datetime: '2025-01-01T10:00:00Z', shares: 1, price: 10, amount: -10, fee: 1, tax: 2 }),
      tx({ date: '2025-01-02', datetime: '2025-01-02T10:00:00Z', type: 'SELL', shares: -1, price: 20, amount: 20, fee: 1, tax: 3 }),
    ]);

    expect(result.realizedTrades[0]).toMatchObject({ proceeds: 16, costBasis: 13, pnl: 3 });
    expect(result.totals.fees).toBe(2);
    expect(result.totals.taxes).toBe(5);
  });

  it('keeps existing dividend tax and fee behavior', () => {
    const result = analyse([
      tx({ category: 'CASH', type: 'CUSTOMER_INPAYMENT', amount: 100, shares: 0 }),
      tx({ category: 'INCOME', type: 'DIVIDEND', amount: 10, fee: 1, tax: 2, shares: 0 }),
    ]);

    expect(result.totals.dividends).toBe(10);
    expect(result.totals.fees).toBe(1);
    expect(result.totals.taxes).toBe(2);
    expect(result.totals.totalPnl).toBe(10);
    expect(result.timeline.at(-1)?.netCash).toBe(107);
  });

  it('adds realized, unrealized, dividends, and perks into total P&L', () => {
    const result = analyse([
      tx({ shares: 1, price: 10, amount: -10 }),
      tx({ category: 'INCOME', type: 'DIVIDEND', amount: 2, shares: 0 }),
      tx({ category: 'INCOME', type: 'STOCKPERK', amount: 3, shares: 0 }),
      tx({ date: '2025-01-04', datetime: '2025-01-04T10:00:00Z', type: 'SELL', shares: -1, price: 12, amount: 12 }),
    ]);

    expect(result.totals.realizedPnl).toBe(2);
    expect(result.totals.unrealizedPnl).toBe(0);
    expect(result.totals.totalPnl).toBe(7);
  });
});

describe('applyPriceOverrides', () => {
  it('recalculates position, totals, byAssetClass, and bySymbol values', () => {
    const base = analyse([tx({ shares: 2, price: 10, amount: -20 })]);
    const overridden = applyPriceOverrides(base, { ACME: 15 });

    expect(overridden.positions[0]).toMatchObject({ lastPrice: 15, lastDate: 'manual', value: 30, unrealized: 10 });
    expect(overridden.totals.currentValue).toBe(30);
    expect(overridden.totals.unrealizedPnl).toBe(10);
    expect(overridden.totals.totalPnl).toBe(10);
    expect(overridden.byAssetClass).toEqual([{ label: 'STOCK', value: 30 }]);
    expect(overridden.bySymbol).toEqual([{ label: 'Acme Corp', value: 30, subtitle: 'ACME' }]);
  });
});
