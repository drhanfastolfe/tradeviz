import { defineConfig, devices } from '@playwright/test';

const defaultBaseURL = 'http://127.0.0.1:4173/tradeviz/';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? defaultBaseURL;
const shouldStartLocalPreview = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  webServer: shouldStartLocalPreview
    ? {
        command: 'npm run preview -- --host 127.0.0.1',
        url: defaultBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      }
    : undefined,
  projects: [
    {
      name: 'pixel-6a-chromium',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 412, height: 915 },
        deviceScaleFactor: 2,
      },
    },
  ],
});
