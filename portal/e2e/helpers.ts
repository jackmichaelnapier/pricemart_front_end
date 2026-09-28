import { type APIRequestContext, type Page, expect, test } from '@playwright/test';

export const ADMIN = 'admin@example.test';
export const TEAM = 'team@example.test';

let n = 0;
/** A unique id per call, so every run and every test uses fresh companies and domains. */
export function uid(): string {
  n += 1;
  return `${Date.now().toString(36)}${n}${Math.random().toString(36).slice(2, 6)}`;
}

export interface OutboxMail {
  to_email: string;
  template: string;
  subject: string;
  body_text: string;
  created_at: string;
}

/** Waits until an email with this template reaches this address, then returns it. */
export async function waitForMail(request: APIRequestContext, to: string, template: string): Promise<OutboxMail> {
  let found: OutboxMail | undefined;
  await expect
    .poll(
      async () => {
        const res = await request.get(`/__dev/outbox?to=${encodeURIComponent(to)}`);
        const mails = (await res.json()) as OutboxMail[];
        found = mails.find((m) => m.template === template);
        return Boolean(found);
      },
      { timeout: 15_000, message: `email "${template}" to ${to}` },
    )
    .toBe(true);
  return found!;
}

export async function mailsTo(request: APIRequestContext, to: string): Promise<OutboxMail[]> {
  const res = await request.get(`/__dev/outbox?to=${encodeURIComponent(to)}`);
  return (await res.json()) as OutboxMail[];
}

export function linkIn(mail: OutboxMail): string {
  const m = mail.body_text.match(/https?:\/\/\S+\/auth\?token=[A-Za-z0-9_%-]+(?:&lang=[a-z]{2})?/);
  if (!m) throw new Error(`no sign-in link in ${mail.template}`);
  return m[0];
}

/** Follows an emailed link and presses the one Sign in button. */
export async function followLink(page: Page, url: string) {
  await page.goto(url);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signIn(page: Page, email: string) {
  await page.goto('/signin');
  await page.getByLabel('Work email').fill(email);
  const before = await mailsTo(page.request, email);
  await page.getByRole('button', { name: 'Send me a sign-in link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  let link = '';
  await expect
    .poll(async () => {
      const mails = await mailsTo(page.request, email);
      const fresh = mails.find((m) => m.template === 'signin_link' && !before.some((b) => b.created_at === m.created_at && b.template === m.template));
      if (fresh) link = linkIn(fresh);
      return link;
    }, { timeout: 15_000 })
    .not.toBe('');
  await followLink(page, link);
}

export async function signOut(page: Page) {
  const menuButton = page.getByRole('button', { name: 'Sign out' });
  await menuButton.click();
  await expect(page).toHaveURL(/\/signin\?msg=signed_out/);
}

/** The page must fit the screen: nothing wider than the viewport. */
export async function expectNoSideScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `page is ${overflow}px wider than the screen`).toBeLessThanOrEqual(1);
}

/** Full-page screenshot for eyeballing the design, per device. */
export async function snap(page: Page, name: string) {
  await page.screenshot({ path: `e2e/.screens/${test.info().project.name}-${name}.png`, fullPage: true });
}

export interface Contact {
  company: string;
  name: string;
  email: string;
}

export function newContact(label: string): Contact {
  const id = uid();
  return { company: `${label} ${id}`, name: `Anna ${id}`, email: `anna@${label.toLowerCase().replace(/\s+/g, '-')}-${id}.test` };
}

export async function fillContact(page: Page, c: Contact) {
  await page.getByLabel('Company name').fill(c.company);
  await page.getByLabel('Your name').fill(c.name);
  await page.getByLabel('Work email').fill(c.email);
}

/** Registers a seller with the quickest option and lands on the thank-you page. */
export async function registerSellerQuick(page: Page, c: Contact, text = '12 pallets of gummy bears 200 g, best before November') {
  await page.goto('/register/seller');
  await page.getByLabel('Describe your stock').fill(text);
  await page.getByRole('button', { name: 'Continue' }).click();
  await fillContact(page, c);
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page).toHaveURL(/\/register\/done\?role=seller/);
}
