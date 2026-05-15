export const EXPECTED_COLUMNS = [
  'datetime', 'date', 'account_type', 'category', 'type', 'asset_class', 'name', 'symbol', 'shares', 'price', 'amount', 'fee', 'tax', 'currency',
  'original_amount', 'original_currency', 'fx_rate', 'description', 'transaction_id', 'counterparty_name', 'counterparty_iban', 'payment_reference', 'mcc_code',
];

export const DEPOSIT_TYPES = new Set(['CUSTOMER_INPAYMENT', 'CUSTOMER_INBOUND', 'TRANSFER_INSTANT_INBOUND', 'TRANSFER_INBOUND']);
export const EPSILON = 0.000001;
export const STORAGE_KEY = 'tradeviz.csv.v1';
export const PRICE_OVERRIDES_KEY = 'tradeviz.priceOverrides.v1';
