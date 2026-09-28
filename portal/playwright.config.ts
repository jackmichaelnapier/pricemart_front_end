import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against `wrangler dev` with DEV_MODE=true (.dev.vars): local D1 and R2,
// and emails land in the email_log table, read back through /__dev/outbox.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8787',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { ...devices['iPhone SE'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx wrangler dev --port 8787 --ip 127.0.0.1',
    url: 'http://127.0.0.1:8787/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
