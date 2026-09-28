import { expect, test } from '@playwright/test';
import {
  TEAM, expectNoSideScroll, fillContact, mailsTo, newContact, snap, waitForMail,
} from './helpers';

test('seller: describe it (the default) in two steps, with checks at each step', async ({ page }) => {
  const c = newContact('Nordic Snacks');

  await test.step('choose seller', async () => {
    await page.goto('/register');
    await expectNoSideScroll(page);
    await snap(page, '01-choose');
    await page.getByRole('link', { name: /Register as a seller/ }).click();
    await expect(page).toHaveURL(/\/register\/seller$/);
  });

  await test.step('step 1 defaults to the quickest option and needs a few words', async () => {
    await expect(page.getByLabel(/Describe it/)).toBeChecked();
    await expect(page.getByLabel('Company name')).toBeHidden();
    await snap(page, '02-seller-step1');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Tell us a little about what you have.')).toBeVisible();
    await expect(page.getByLabel('Company name')).toBeHidden();
    await page.getByLabel('Describe your stock').fill('12 pallets of gummy bears 200 g, best before November, stock in Hamburg.');
    await page.getByRole('button', { name: 'Continue' }).click();
  });

  await test.step('step 2 only needs company, name and email', async () => {
    await expect(page.getByLabel('Company name')).toBeVisible();
    await expect(page.getByLabel('Describe your stock')).toBeHidden();
    await expect(page.getByText('By registering you agree to the Terms and Privacy Policy.')).toBeVisible();
    await expectNoSideScroll(page);
    await snap(page, '03-seller-step2');
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Add your company name.')).toBeVisible();
    await expect(page.getByText('Add your work email.')).toBeVisible();
    await fillContact(page, { ...c, email: 'not-an-email' });
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Check the email address.')).toBeVisible();
    await page.getByLabel('Work email').fill(c.email);
    // Back keeps what was typed.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByLabel('Describe your stock')).toHaveValue(/gummy bears/);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Send' }).click();
  });

  await test.step('thank-you page and emails', async () => {
    await expect(page).toHaveURL(/\/register\/done\?role=seller/);
    await expect(page.getByRole('heading', { name: "Thanks, we've got it" })).toBeVisible();
    await expectNoSideScroll(page);
    await snap(page, '04-done');
    const toSeller = await waitForMail(page.request, c.email, 'registration_received');
    expect(toSeller.body_text).toContain('12 pallets of gummy bears 200 g');
    const toTeam = (await mailsTo(page.request, TEAM)).find((m) => m.subject.includes(c.company));
    expect(toTeam?.template).toBe('team_new_registration');
    expect(toTeam?.body_text).toContain('no VAT given');
  });
});

test('seller: upload a stock list', async ({ page }) => {
  const c = newContact('Upload Foods');
  await page.goto('/register/seller');
  await page.getByLabel(/Upload a stock list/).check();
  await expect(page.getByRole('link', { name: 'Download one' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Choose at least one file.')).toBeVisible();
  await page.getByLabel('Your stock list').setInputFiles({
    name: 'Lager Liste Oktober.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Product,Quantity,Best before\nGummy bears 200 g,12 pallets,2026-11-14\n'),
  });
  await expect(page.getByText('Lager Liste Oktober.csv')).toBeVisible();
  await snap(page, '05-seller-upload');
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillContact(page, c);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/register\/done\?role=seller/);
  const mail = await waitForMail(page.request, c.email, 'registration_received');
  expect(mail.body_text).toContain('Stock list: Lager Liste Oktober.csv');
});

test('seller: enter lots, add and remove rows', async ({ page }) => {
  const c = newContact('Lots Trading');
  await page.goto('/register/seller');
  await page.getByLabel(/Enter lots/).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Add at least one lot: product, quantity and best-before date.')).toBeVisible();

  const lots = page.locator('[data-lot]');
  await lots.nth(0).getByLabel('Product').fill('Gummy bears 200 g');
  await lots.nth(0).getByLabel('Quantity').fill('12');
  await page.getByRole('button', { name: '+ Add another lot' }).click();
  await page.getByRole('button', { name: '+ Add another lot' }).click();
  await expect(lots).toHaveCount(3);
  await lots.nth(1).getByRole('button', { name: 'Remove' }).click();
  await expect(lots).toHaveCount(2);
  await expect(lots.nth(1).locator('legend')).toHaveText('Lot 2');

  await lots.nth(1).getByLabel('Product').fill('Wafer rolls 125 g');
  await lots.nth(1).getByLabel('Quantity').fill('6');
  await lots.nth(1).getByLabel('Best before').fill('2026-12-01');
  await page.getByRole('button', { name: 'Continue' }).click();
  // Lot 1 has no best-before date yet.
  await expect(page.getByText('Add the best-before date.')).toBeVisible();
  await lots.nth(0).getByLabel('Best before').fill('2026-11-14');
  await lots.nth(0).getByText('More details (optional)').click();
  await lots.nth(0).getByLabel('Brand').fill('Example brand');
  await lots.nth(0).getByLabel('Category').selectOption('Confectionery');
  await expectNoSideScroll(page);
  await snap(page, '06-seller-lots');
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillContact(page, c);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/register\/done\?role=seller/);
  const mail = await waitForMail(page.request, c.email, 'registration_received');
  expect(mail.body_text).toContain('Gummy bears 200 g, 12 pallets and 1 more lot');
});

test('buyer: pick from options', async ({ page }) => {
  const c = newContact('Swe Discount');
  await page.goto('/register');
  await page.getByRole('link', { name: /Register as a buyer/ }).click();
  await expect(page.getByLabel(/Describe it/)).toBeChecked();
  await page.getByLabel(/Pick from options/).check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Pick at least one category, or name a brand.')).toBeVisible();
  await page.getByLabel('Confectionery').check();
  await page.getByLabel('Snacks').check();
  await page.getByLabel('Sweden').check();
  await page.getByLabel('Shelf life left, at least').selectOption('At least 30 days');
  await expectNoSideScroll(page);
  await snap(page, '07-buyer-options');
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillContact(page, c);
  await page.getByText('Add more details (optional)').click();
  await page.getByLabel('VAT number').fill('SE556677889901');
  await page.getByLabel('Country').selectOption('Sweden');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/register\/done\?role=buyer/);
  const mail = await waitForMail(page.request, c.email, 'registration_received');
  expect(mail.body_text).toContain('Confectionery, Snacks to Sweden');
});

test('buyer: describe it', async ({ page }) => {
  const c = newContact('Food Rescue');
  await page.goto('/register/buyer');
  await page.getByLabel('Describe what you need').fill('Snacks and drinks for Denmark, any brand, 1 pallet a month.');
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillContact(page, c);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/register\/done\?role=buyer/);
  await waitForMail(page.request, c.email, 'registration_received');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  // Playwright's "is it stable" check never settles with JavaScript off, so clicks are forced here.
  test('both steps show, the server checks the form and keeps what was typed', async ({ page }) => {
    const c = newContact('No Script');
    await page.goto('/register/seller');
    await expect(page.getByLabel('Company name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeHidden();
    await page.getByLabel('Company name').fill(c.company);
    await page.getByRole('button', { name: 'Send' }).click({ force: true });
    await expect(page.getByText('Please check the form.')).toBeVisible();
    await expect(page.getByLabel('Company name')).toHaveValue(c.company);
    await page.getByLabel('Describe your stock').fill('Mixed chocolate, about 5 pallets');
    await page.getByLabel('Your name').fill(c.name);
    await page.getByLabel('Work email').fill(c.email);
    await page.getByRole('button', { name: 'Send' }).click({ force: true });
    await expect(page).toHaveURL(/\/register\/done\?role=seller/);
  });
});

test('bots filling the hidden field get the thank-you page but nothing is stored', async ({ page, request }) => {
  const c = newContact('Spam Bot');
  const res = await request.post('/register/seller', {
    multipart: {
      mode: 'describe', body_describe: 'cheap pills', company: c.company, name: c.name, email: c.email, hp_website: 'http://spam.example',
    },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(303);
  expect(res.headers().location).toContain('/register/done');
  await page.waitForTimeout(1000);
  expect(await mailsTo(request, c.email)).toHaveLength(0);
});

test('cross-site form posts are refused', async ({ request }) => {
  const res = await request.post('/register/seller', {
    headers: { Origin: 'https://evil.example' },
    multipart: { mode: 'describe', body_describe: 'x' },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(403);
});
