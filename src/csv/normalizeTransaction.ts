import type { CsvRow, Transaction } from '../domain/types';
import { normalizeDate } from './normalizeDate';
import { normalizeNumber } from './normalizeNumber';

export function normalizeTransaction(row: CsvRow): Transaction {
  const datetime = row.datetime ?? '';
  const rawDate = row.date || (datetime ? datetime.slice(0, 10) : '');

  return {
    datetime,
    date: normalizeDate(rawDate),
    accountType: row.account_type ?? '',
    category: normalizeToken(row.category),
    type: normalizeToken(row.type),
    assetClass: row.asset_class?.trim() ?? '',
    name: row.name?.trim() ?? '',
    symbol: row.symbol?.trim().toUpperCase() ?? '',
    shares: normalizeNumber(row.shares),
    price: normalizeNumber(row.price),
    amount: normalizeNumber(row.amount),
    fee: normalizeNumber(row.fee),
    tax: normalizeNumber(row.tax),
    currency: row.currency?.trim().toUpperCase() || 'EUR',
    originalAmount: normalizeNumber(row.original_amount),
    originalCurrency: row.original_currency?.trim().toUpperCase() ?? '',
    fxRate: normalizeNumber(row.fx_rate),
    description: row.description?.trim() ?? '',
    transactionId: row.transaction_id?.trim() ?? '',
    counterpartyName: row.counterparty_name?.trim() ?? '',
    counterpartyIban: row.counterparty_iban?.trim() ?? '',
    paymentReference: row.payment_reference?.trim() ?? '',
    mccCode: row.mcc_code?.trim() ?? '',
  };
}

function normalizeToken(value = ''): string {
  return value.trim().toUpperCase();
}
