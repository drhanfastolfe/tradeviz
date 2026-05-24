export type CsvRow = Record<string, string>;
export type ChartColor = `var(--chart-${1 | 2 | 3 | 4 | 5 | 6})` | 'var(--positive)' | 'var(--negative)';
export type TableCell = string | { html: string; search: string };

export type Transaction = {
  datetime: string;
  date: string;
  accountType: string;
  category: string;
  type: string;
  assetClass: string;
  name: string;
  symbol: string;
  shares: number;
  price: number;
  amount: number;
  fee: number;
  tax: number;
  currency: string;
  originalAmount: number;
  originalCurrency: string;
  fxRate: number;
  description: string;
  transactionId: string;
  counterpartyName: string;
  counterpartyIban: string;
  paymentReference: string;
  mccCode: string;
};

export type Lot = { shares: number; cost: number };
export type Position = {
  symbol: string;
  name: string;
  assetClass: string;
  shares: number;
  invested: number;
  lastPrice: number;
  lastDate: string;
  value: number;
  unrealized: number;
  returnPct: number;
};

export type RealizedTrade = {
  date: string;
  symbol: string;
  name: string;
  shares: number;
  proceeds: number;
  costBasis: number;
  pnl: number;
};

export type MonthlyPoint = { month: string; deposits: number; invested: number; realized: number; dividends: number; fees: number };
export type TimelinePoint = { date: string; netCash: number; investedOpen: number; marketValue: number; realizedPnl: number };

export type Analysis = {
  transactions: Transaction[];
  positions: Position[];
  realizedTrades: RealizedTrade[];
  totals: {
    deposits: number;
    withdrawals: number;
    buys: number;
    sells: number;
    fees: number;
    taxes: number;
    dividends: number;
    perks: number;
    netCashAdded: number;
    currentValue: number;
    investedOpen: number;
    realizedPnl: number;
    unrealizedPnl: number;
    totalPnl: number;
    totalReturnPct: number;
    tradeCount: number;
  };
  byAssetClass: { label: string; value: number }[];
  bySymbol: { label: string; value: number; subtitle: string }[];
  monthly: MonthlyPoint[];
  timeline: TimelinePoint[];
};

export type StoredCsv = {
  version: 1;
  fileName: string;
  text: string;
  savedAt: string;
};

export type CurrentDataset = {
  transactions: Transaction[];
  fileName: string;
};
