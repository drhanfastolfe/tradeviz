import { expect, test } from '@playwright/test';

test('la aplicación carga sin errores en móvil', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.goto('./');

  await expect(page).toHaveTitle(/TradeViz/);
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Visualiza tu cartera desde un CSV privado/i })).toBeVisible();
  await expect(page.locator('#csv-input')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
