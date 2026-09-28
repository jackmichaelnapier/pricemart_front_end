import { type Page, expect, test } from '@playwright/test';
import {
  ADMIN, TEAM, expectNoSideScroll, followLink, linkIn, mailsTo, newContact, registerSellerQuick, signIn, signOut, snap,
  uid, waitForMail,
} from './helpers';

async function openApplication(page: Page, company: string) {
  await page.goto('/admin/applications?status=pending');
  await page.getByRole('link', { name: company, exact: true }).click();
  await expect(page.getByRole('heading', { name: company })).toBeVisible();
}

test('seller, admin and buyer, end to end', async ({ browser, page }) => {
  const seller = newContact('Hamburg Sweets');
  const admin = page;
  const sellerCtx = await browser.newContext();
  const sellerPage = await sellerCtx.newPage();
  test.info().annotations.push({ type: 'seller', description: seller.email });

  await test.step('a seller registers', async () => {
    await registerSellerQuick(sellerPage, seller);
  });

  await test.step('the seller cannot sign in before approval', async () => {
    await sellerPage.goto('/signin');
    await sellerPage.getByLabel('Work email').fill(seller.email);
    await sellerPage.getByRole('button', { name: 'Send me a sign-in link' }).click();
    await expect(sellerPage.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await waitForMail(sellerPage.request, seller.email, 'signin_not_active');
    expect((await mailsTo(sellerPage.request, seller.email)).some((m) => m.template === 'signin_link')).toBe(false);
  });

  await test.step('the admin signs in and sees the application with its checks', async () => {
    await signIn(admin, ADMIN);
    await expect(admin).toHaveURL(/\/admin\/applications/);
    const row = admin.getByRole('row').filter({ hasText: seller.company });
    await expect(row).toContainText('No VAT given');
    await expect(row).toContainText('Company domain');
    await expect(row).toContainText('No duplicates');
    await expect(row).toContainText('12 pallets of gummy bears');
    await expectNoSideScroll(admin);
    await snap(admin, '10-admin-applications');
  });

  await test.step('ask for info needs a message, then emails it', async () => {
    await openApplication(admin, seller.company);
    await admin.getByRole('button', { name: 'Ask for info' }).click();
    await expect(admin.getByText('Write the question you want to ask them.')).toBeVisible();
    await admin.getByLabel('Message to them').fill('Could you send your VAT number?');
    await admin.getByRole('button', { name: 'Ask for info' }).click();
    await expect(admin.getByText('Question sent.')).toBeVisible();
    await expect(admin.locator('.pm-cstatus-info_requested')).toHaveText('Waiting for info');
    const mail = await waitForMail(admin.request, seller.email, 'info_requested');
    expect(mail.body_text).toContain('Could you send your VAT number?');
    await expectNoSideScroll(admin);
    await snap(admin, '11-admin-company');
  });

  let approvalLink = '';
  await test.step('approve emails a sign-in link', async () => {
    await admin.getByLabel('Internal note (admins only)').fill('Known from Gustavo, good lead.');
    await admin.getByRole('button', { name: 'Approve' }).click();
    await expect(admin.getByText('Approved. They have been emailed a sign-in link.')).toBeVisible();
    await expect(admin.getByLabel('Internal note (admins only)')).toHaveValue('Known from Gustavo, good lead.');
    approvalLink = linkIn(await waitForMail(admin.request, seller.email, 'approved'));
  });

  await test.step('the seller signs in from the email and sees their stock', async () => {
    await followLink(sellerPage, approvalLink);
    await expect(sellerPage).toHaveURL(/\/account$/);
    await expect(sellerPage.getByRole('heading', { name: 'Your stock' })).toBeVisible();
    await expect(sellerPage.getByText('12 pallets of gummy bears 200 g, best before November')).toBeVisible();
    await expect(sellerPage.locator('.pm-status').first()).toHaveText('Received');
    await expectNoSideScroll(sellerPage);
    await snap(sellerPage, '12-seller-home');
  });

  await test.step('the link works once only', async () => {
    const other = await browser.newContext();
    const p = await other.newPage();
    await p.goto(approvalLink);
    await expect(p.getByRole('heading', { name: 'This link has expired' })).toBeVisible();
    await other.close();
  });

  let itemUrl = '';
  await test.step('the seller adds stock from the account by uploading a list', async () => {
    await sellerPage.getByRole('link', { name: '+ Add stock' }).click();
    await expect(sellerPage.getByLabel(/Describe it/)).toBeChecked();
    await sellerPage.getByLabel(/Upload a stock list/).check();
    await sellerPage.getByLabel('Your stock list').setInputFiles({
      name: 'october.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Product,Quantity\nMilk chocolate 45 g,8 pallets\n'),
    });
    await sellerPage.getByLabel('Anything to add? (optional)').fill('Can ship from Hamburg next week.');
    await sellerPage.getByRole('button', { name: 'Send' }).click();
    await expect(sellerPage).toHaveURL(/\/account\?msg=sent/);
    await expect(sellerPage.getByText("Thanks, we've got it. We'll be in touch.")).toBeVisible();
    await expect(sellerPage.locator('.pm-list-item')).toHaveCount(2);
    const team = await mailsTo(sellerPage.request, TEAM);
    expect(team.some((m) => m.template === 'team_new_submission' && m.subject.includes(seller.company))).toBe(true);

    await sellerPage.getByRole('link', { name: /Stock list: october.csv/ }).click();
    itemUrl = sellerPage.url();
    await expect(sellerPage.getByText('Can ship from Hamburg next week.')).toBeVisible();
    const download = sellerPage.waitForEvent('download');
    await sellerPage.getByRole('link', { name: 'october.csv' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('october.csv');
    await expectNoSideScroll(sellerPage);
    await snap(sellerPage, '13-seller-item');
  });

  await test.step('the seller completes their company details', async () => {
    await sellerPage.goto('/account');
    await expect(sellerPage.getByText('Complete your company details')).toBeVisible();
    await sellerPage.getByRole('link', { name: 'Company details' }).first().click();
    await sellerPage.getByLabel('VAT number').fill('DE123456789');
    await sellerPage.getByLabel('Country').selectOption('Germany');
    await expectNoSideScroll(sellerPage);
    await snap(sellerPage, '14-seller-profile');
    await sellerPage.getByRole('button', { name: 'Save' }).click();
    await expect(sellerPage.getByText('Saved.')).toBeVisible();
    await sellerPage.goto('/account');
    await expect(sellerPage.getByText('Complete your company details')).toBeHidden();
  });

  await test.step('the admin updates the stock status and the seller sees it', async () => {
    await admin.goto('/admin/items?kind=stock');
    await expectNoSideScroll(admin);
    await snap(admin, '15-admin-items');
    await admin.getByRole('link', { name: /Stock list: october.csv/ }).first().click();
    await expect(admin.getByText(seller.company)).toBeVisible();
    await admin.getByLabel('Status', { exact: true }).selectOption({ label: 'Offer sent' });
    await admin.getByLabel('Email them about a status change').check();
    await admin.getByLabel('Key facts (admins only)').fill('Chocolate, 8 pallets, Hamburg');
    await admin.getByRole('button', { name: 'Save' }).click();
    await expect(admin.getByText('Saved.')).toBeVisible();
    await expect(admin.getByText('Status: Received → Offer sent, customer emailed')).toBeVisible();
    await expectNoSideScroll(admin);
    await snap(admin, '16-admin-item');
    const mail = await waitForMail(admin.request, seller.email, 'status_changed');
    expect(mail.body_text).toContain('Offer sent');
    await sellerPage.goto(itemUrl);
    await expect(sellerPage.locator('.pm-head .pm-status')).toHaveText('Offer sent');
    await expect(sellerPage.getByText('Chocolate, 8 pallets, Hamburg')).toBeHidden();
  });

  await test.step('the seller cannot see admin pages or other companies', async () => {
    const res = await sellerPage.goto('/admin/applications');
    expect(res?.status()).toBe(404);
    const other = newContact('Other Co');
    const otherCtx = await browser.newContext();
    const otherPage = await otherCtx.newPage();
    await registerSellerQuick(otherPage, other, 'Some biscuits');
    await openApplication(admin, other.company);
    await admin.getByRole('button', { name: 'Approve' }).click();
    await followLink(otherPage, linkIn(await waitForMail(admin.request, other.email, 'approved')));
    await expect(otherPage).toHaveURL(/\/account$/);
    const peek = await otherPage.goto(itemUrl);
    expect(peek?.status()).toBe(404);
    // The first seller's file cannot be fetched by the second seller either.
    await sellerPage.goto(itemUrl);
    const fileHref = (await sellerPage.getByRole('link', { name: 'october.csv' }).getAttribute('href'))!;
    // Fetch from inside each signed-in browser (Playwright's API client drops Secure cookies on http).
    const statusFor = (p: Page) => p.evaluate(async (href) => (await fetch(href, { redirect: 'manual' })).status, fileHref);
    expect(await statusFor(otherPage)).toBe(404);
    expect(await statusFor(sellerPage)).toBe(200);
    expect(await statusFor(admin)).toBe(200);
    // Signed out: sent to sign in.
    const anon = await sellerPage.request.fetch(fileHref, { maxRedirects: 0, headers: { cookie: '' } });
    expect(anon.status()).toBe(303);
    expect(anon.headers().location).toContain('/signin');
    await otherCtx.close();
  });

  await test.step('signing out ends the session', async () => {
    await signOut(sellerPage);
    const res = await sellerPage.goto('/account');
    expect(sellerPage.url()).toContain('/signin');
    expect(res?.status()).toBe(200);
  });

  await test.step('the admin invites a buyer who then uses the account', async () => {
    const buyer = newContact('Invited Buyer');
    await admin.goto('/admin/invite');
    await admin.getByLabel('Buyer').check();
    await admin.getByLabel('Company name').fill(buyer.company);
    await admin.getByLabel('Contact name').fill(buyer.name);
    await admin.getByLabel('Contact email').fill(buyer.email);
    await expectNoSideScroll(admin);
    await snap(admin, '17-admin-invite');
    await admin.getByRole('button', { name: 'Create account and send invite' }).click();
    await expect(admin.getByText('Account created and invite sent.')).toBeVisible();

    const buyerCtx = await browser.newContext();
    const buyerPage = await buyerCtx.newPage();
    await followLink(buyerPage, linkIn(await waitForMail(admin.request, buyer.email, 'invite')));
    await expect(buyerPage.getByRole('heading', { name: 'Your requests' })).toBeVisible();
    await expect(buyerPage.getByText("You haven't sent us any requests yet.")).toBeVisible();
    await buyerPage.getByRole('link', { name: '+ Add a request' }).click();
    await buyerPage.getByLabel(/Pick from options/).check();
    await buyerPage.getByLabel('Beverages').check();
    await buyerPage.getByLabel('Denmark').check();
    await buyerPage.getByRole('button', { name: 'Send' }).click();
    await expect(buyerPage.getByText('Beverages to Denmark')).toBeVisible();
    await expectNoSideScroll(buyerPage);
    await snap(buyerPage, '18-buyer-home');
    await buyerCtx.close();
  });

  await test.step('rejecting closes the door', async () => {
    const spam = newContact('Spam Shop');
    const spamCtx = await browser.newContext();
    const spamPage = await spamCtx.newPage();
    await registerSellerQuick(spamPage, spam, 'cheap stuff');
    await openApplication(admin, spam.company);
    await admin.getByRole('button', { name: 'Reject' }).click();
    await expect(admin.getByText('Rejected.')).toBeVisible();
    await spamPage.goto('/signin');
    await spamPage.getByLabel('Work email').fill(spam.email);
    await spamPage.getByRole('button', { name: 'Send me a sign-in link' }).click();
    await spamPage.waitForTimeout(1500);
    const mails = await mailsTo(spamPage.request, spam.email);
    expect(mails.map((m) => m.template)).toEqual(['registration_received']);
    await spamCtx.close();
  });

  await sellerCtx.close();
});

test('duplicates and free email addresses are flagged for the admin', async ({ browser, page }) => {
  const id = uid();
  const first = { company: `Dupe Foods ${id}`, name: 'Ola', email: `ola@dupe-${id}.test` };
  const second = { company: `Dupe Foods ${id} AB`, name: 'Kari', email: `kari@dupe-${id}.test` };
  const free = { company: `Gmail Trading ${id}`, name: 'Per', email: `per.${id}@gmail.com` };
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await registerSellerQuick(p, first, 'Crisps');
  await registerSellerQuick(p, second, 'More crisps');
  await registerSellerQuick(p, free, 'Candy');
  await ctx.close();

  await signIn(page, ADMIN);
  const row = page.getByRole('row').filter({ hasText: second.email });
  await expect(row).toContainText('Possible match');
  await expect(row).toContainText(first.company);
  await expect(page.getByRole('row').filter({ hasText: free.email })).toContainText('Free email');

  // The quick approve button on the list works too.
  await page.getByRole('row').filter({ hasText: free.email }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText('Approved. They have been emailed a sign-in link.')).toBeVisible();
  await waitForMail(page.request, free.email, 'approved');
});

test('pages are private: signed-out visitors are sent to sign in', async ({ page }) => {
  for (const path of ['/account', '/account/add', '/account/profile', '/admin', '/admin/items', '/admin/invite']) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/signin$/);
  }
  await expectNoSideScroll(page);
  await snap(page, '19-signin');
});
