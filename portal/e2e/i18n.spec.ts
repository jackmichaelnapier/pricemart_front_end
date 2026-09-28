import { expect, test } from '@playwright/test';
import { ADMIN, TEAM, expectNoSideScroll, linkIn, newContact, signIn, snap, waitForMail } from './helpers';

// The page that "Trade with us" opens, in the visitor's language: German from www.pricemart.eu/de/, and so on.

test('German visitor: register, emails and approval in German', async ({ browser, page }) => {
  const c = newContact('Bonbon Werk');

  await test.step('the link from the German site opens the page in German and remembers it', async () => {
    await page.goto('/register?lang=de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { name: 'Mit PriceMart handeln' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Anmelden' }).first()).toBeVisible();
    await expectNoSideScroll(page);
    await snap(page, '20-register-de');
    const cookies = await page.context().cookies();
    expect(cookies.find((k) => k.name === 'pm_lang')?.value).toBe('de');
  });

  await test.step('the form, its options and its checks are in German', async () => {
    await page.getByRole('link', { name: /Als Verkäufer registrieren/ }).click();
    await expect(page).toHaveURL(/\/register\/seller$/);
    await expect(page.getByRole('heading', { name: 'Als Verkäufer registrieren' })).toBeVisible();
    await page.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.getByText('Beschreiben Sie kurz, was Sie haben.')).toBeVisible();
    await page.getByLabel('Beschreiben Sie Ihre Ware').fill('12 Paletten Gummibärchen 200 g, MHD November');
    await page.getByRole('button', { name: 'Weiter' }).click();
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(page.getByText('Geben Sie Ihren Firmennamen an.')).toBeVisible();
    await page.getByText('Weitere Angaben hinzufügen (optional)').click();
    await expect(page.getByLabel('Land').locator('option', { hasText: 'Deutschland' })).toHaveCount(1);
    await page.getByLabel('Firmenname').fill(c.company);
    await page.getByLabel('Ihr Name').fill(c.name);
    await page.getByLabel('Geschäftliche E-Mail').fill(c.email);
    await expectNoSideScroll(page);
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(page).toHaveURL(/\/register\/done\?role=seller&lang=de/);
    await expect(page.getByRole('heading', { name: 'Danke, wir haben es erhalten' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zurück zu pricemart.eu' })).toHaveAttribute('href', /\/de\/$/);
  });

  await test.step('their confirmation is in German; the team alert stays in English and says so', async () => {
    const mail = await waitForMail(page.request, c.email, 'registration_received');
    expect(mail.subject).toBe('Wir haben Ihre Angaben erhalten');
    expect(mail.body_text).toContain('als Verkäufer');
    const team = await waitForMail(page.request, TEAM, 'team_new_registration');
    expect(team.subject).toMatch(/^New seller: /);
  });

  await test.step('approval email is in German and its link opens the German sign-in page', async () => {
    const adminCtx = await browser.newContext();
    const admin = await adminCtx.newPage();
    await signIn(admin, ADMIN);
    await admin.goto('/admin/applications?status=pending');
    await admin.getByRole('link', { name: c.company, exact: true }).click();
    await expect(admin.getByText('registered in German')).toBeVisible();
    await admin.getByRole('button', { name: 'Approve' }).click();
    await expect(admin.getByText('Approved. They have been emailed a sign-in link.')).toBeVisible();
    const approved = await waitForMail(admin.request, c.email, 'approved');
    expect(approved.subject).toBe('Freigegeben: Melden Sie sich bei PriceMart an');
    const fresh = await browser.newContext();
    const visitor = await fresh.newPage();
    expect(linkIn(approved)).toMatch(/&lang=de$/);
    await visitor.goto(linkIn(approved));
    await expect(visitor.getByRole('heading', { name: 'Bei PriceMart anmelden' })).toBeVisible();
    await fresh.close();
    await adminCtx.close();
  });
});

test('server checks answer in the language the form was filled in (no JavaScript)', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/register/buyer?lang=es');
  await expect(page.getByRole('heading', { name: 'Registro como comprador' })).toBeVisible();
  await page.getByRole('button', { name: 'Enviar' }).click({ force: true });
  await expect(page.getByText('Revise el formulario, por favor.')).toBeVisible();
  await expect(page.getByText('Indique el nombre de su empresa.').first()).toBeVisible();
  await expect(page.getByText('Cuéntenos un poco sobre lo que busca.').first()).toBeVisible();
  await ctx.close();
});

test('the switcher changes language and the choice sticks across pages', async ({ page }) => {
  await page.goto('/register?lang=de');
  await page.getByRole('navigation', { name: 'Sprache' }).getByRole('link', { name: 'Svenska' }).click();
  await expect(page.getByRole('heading', { name: 'Handla med PriceMart' })).toBeVisible();
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: 'Logga in' })).toBeVisible();
  await expect(page.getByLabel('E-post (arbete)')).toBeVisible();
});

test('without a link, the browser language decides', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'pl-PL' });
  const page = await ctx.newPage();
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Handluj z PriceMart' })).toBeVisible();
  await ctx.close();
  const en = await browser.newContext({ locale: 'fr-FR' });
  const enPage = await en.newPage();
  await enPage.goto('/register');
  await expect(enPage.getByRole('heading', { name: 'Trade with PriceMart' })).toBeVisible();
  await en.close();
});
