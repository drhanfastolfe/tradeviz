import { expect, test } from '@playwright/test';

const sampleCsv = `datetime,date,account_type,category,type,asset_class,name,symbol,shares,price,amount,fee,tax,currency,original_amount,original_currency,fx_rate,description,transaction_id,counterparty_name,counterparty_iban,payment_reference,mcc_code
2025-01-01T10:00:00Z,2025-01-01,SECURITIES,TRADING,BUY,STOCK,Acme Corp,ACME,2,10,-20,1,0,EUR,,,,Compra,t1,,,,
2025-01-02T10:00:00Z,2025-01-02,CASH,CUSTOMER_INPAYMENT,,,,,,100,0,0,EUR,,,,Ingreso,t2,,,,
`;

test('la aplicación renderiza la home en móvil', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto('./');

  await expect(page).toHaveTitle(/TradeViz/);
  await expect(page.getByRole('heading', { name: /Visualiza tu cartera desde un CSV privado/i })).toBeVisible();
  await expect(page.getByText(/Seleccionar CSV/i)).toBeVisible();
  await expect(page.locator('#app')).not.toBeEmpty();
  expect(pageErrors).toEqual([]);
});

test('guarda, restaura y limpia el último CSV en localStorage', async ({ page }) => {
  await page.goto('./');

  await page.locator('#csv-input').setInputFiles({
    name: 'movimientos.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(sampleCsv),
  });

  await expect(page.getByRole('heading', { name: 'movimientos.csv' })).toBeVisible();
  await expect(page.getByText(/CSV cargado y guardado en este navegador con 2 filas/i)).toBeVisible();
  await expect(page.getByText(/2 transacciones/i)).toBeVisible();

  await page.reload();

  await expect(page.getByRole('heading', { name: 'movimientos.csv' })).toBeVisible();
  await expect(page.getByText(/CSV restaurado desde este navegador con 2 filas/i)).toBeVisible();

  await page.getByRole('button', { name: /Limpiar datos/i }).first().click();
  await expect(page.getByText(/Datos limpiados/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'movimientos.csv' })).toBeHidden();

  await page.reload();
  await expect(page.getByRole('heading', { name: /Qué podrás analizar/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'movimientos.csv' })).toHaveCount(0);
});
