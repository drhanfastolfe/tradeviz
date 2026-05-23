import { expect, test } from '@playwright/test';

function buildMobileCsv(): string {
  const header = 'datetime,date,account_type,category,type,asset_class,name,symbol,shares,price,amount,fee,tax,currency,original_amount,original_currency,fx_rate,description,transaction_id,counterparty_name,counterparty_iban,payment_reference,mcc_code';
  const rows: string[] = [];

  rows.push('2025-01-01T10:00:00Z,2025-01-01,CASH,CUSTOMER_INPAYMENT,,,,,,12000,0,0,EUR,,,,Ingreso inicial,t0,,,,');

  for (let month = 1; month <= 12; month += 1) {
    const mm = String(month).padStart(2, '0');
    rows.push(`2025-${mm}-03T10:00:00Z,2025-${mm}-03,SECURITIES,TRADING,BUY,STOCK,Acme Corp,ACME,2,${10 + month},-${(10 + month) * 2},0.5,0,EUR,,,,Compra ACME,tb${month},,,,'`);
    rows.push(`2025-${mm}-06T10:00:00Z,2025-${mm}-06,SECURITIES,TRADING,BUY,ETF,Beta Index,BETA,1.4,${20 + month},-${((20 + month) * 1.4).toFixed(2)},0.5,0,EUR,,,,Compra BETA,tc${month},,,,'`);
    if (month % 2 === 0) {
      rows.push(`2025-${mm}-11T10:00:00Z,2025-${mm}-11,SECURITIES,TRADING,SELL,STOCK,Acme Corp,ACME,1,${12 + month},${12 + month},0.5,0,EUR,,,,Venta ACME,ts${month},,,,'`);
    }
  }

  return `${header}\n${rows.join('\n')}\n`;
}

test('mobile: análisis y actividad hacen scroll vertical sin overflow horizontal global', async ({ page }) => {
  await page.goto('./');

  await page.locator('#csv-input').setInputFiles({
    name: 'mobile-scroll.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(buildMobileCsv()),
  });

  await page.locator('[data-open-screen="analisis"]').last().click();
  await expect(page.locator('[data-app-screen="analisis"]')).toBeVisible();

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(120);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  expect(scrollAfter).toBeGreaterThan(scrollBefore);

  const hasNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
  expect(hasNoHorizontalOverflow).toBeTruthy();

  await page.locator('[data-open-screen="actividad"]').last().click();
  const activityScreen = page.locator('[data-app-screen="actividad"]');
  await expect(activityScreen).toBeVisible();

  const activityBottomVisible = await page.evaluate(() => {
    const activity = document.querySelector<HTMLElement>('[data-app-screen="actividad"]');
    const nav = document.querySelector<HTMLElement>('.bottom-nav');
    if (!activity || !nav) return false;

    activity.scrollIntoView({ block: 'start' });
    window.scrollBy({ top: 100000, behavior: 'auto' });

    const rect = activity.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    return rect.bottom <= navRect.top + 1;
  });
  expect(activityBottomVisible).toBeTruthy();

  const tableHasInternalScroll = await page.evaluate(() => {
    const tableWrap = document.querySelector<HTMLElement>('[data-app-screen="actividad"] .table-wrap');
    if (!tableWrap) return false;
    return tableWrap.scrollWidth > tableWrap.clientWidth;
  });
  expect(tableHasInternalScroll).toBeTruthy();
});
