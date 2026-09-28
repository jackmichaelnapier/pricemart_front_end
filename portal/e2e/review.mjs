// Viewport-only screenshots of key screens on a phone, for design review. Needs `npm run dev` running.
// Usage: node e2e/review.mjs
import { chromium, devices } from '@playwright/test';

const base = 'http://127.0.0.1:8787';
const out = (n) => `e2e/.screens/review-${n}.png`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone SE'] });
const page = await ctx.newPage();

await page.goto(`${base}/admin`);
await page.getByLabel('Work email').fill('admin@example.test');
const before = Date.now();
await page.getByRole('button', { name: 'Send me a sign-in link' }).click();
await page.waitForTimeout(800);
const mails = await (await page.request.get(`${base}/__dev/outbox?to=admin%40example.test`)).json();
const fresh = mails.find((m) => m.template === 'signin_link' && Date.parse(m.created_at) >= before - 2000);
await page.goto(fresh.body_text.match(/https?:\/\/\S+\/auth\?token=[A-Za-z0-9_%-]+/)[0]);
await page.getByRole('button', { name: 'Sign in' }).click();

await page.goto(`${base}/admin/applications`);
await page.screenshot({ path: out('phone-admin-list') });
await page.locator('.pm-table tbody tr').nth(0).getByRole('link', { name: 'Review' }).click();
await page.screenshot({ path: out('phone-admin-company') });
await page.goto(`${base}/admin/items`);
await page.screenshot({ path: out('phone-admin-items') });

const d = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dp = await d.newPage();
await dp.goto(`${base}/register/seller`);
await dp.getByLabel(/Enter lots/).check();
await dp.screenshot({ path: out('desktop-lots') });
await dp.goto(`${base}/register/buyer`);
await dp.getByLabel(/Pick from options/).check();
await dp.screenshot({ path: out('desktop-buyer-options'), fullPage: true });

await browser.close();
console.log('ok');
