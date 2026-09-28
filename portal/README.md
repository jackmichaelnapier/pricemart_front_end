# PriceMart trade portal (app.pricemart.eu)

Buyers and sellers register, PriceMart approves them, and they send stock or requests from an account
instead of by email. Phase one. It runs **alongside** the email forms on www.pricemart.eu, which stay
the primary route until the portal has proven itself.

## What it does

- **Register** (`/register`): two steps. Step 1 "What do you have?" (or "What are you looking for?") with
  three options, simplest first: *Describe it* (default), *Upload a list* (any file, no template),
  *Enter lots* / *Pick from options*. Step 2 "How do we reach you?": only company, name and work email are
  required. VAT, country, phone, website, business type and job title are optional (VAT is a plain field,
  not checked against VIES).
- **Sign in** by emailed one-time link, no passwords. Links expire (30 min for sign-in, 72 h for approval
  and invites) and work once. The link opens a page with a button, so email scanners can't use it up.
- **Seller / buyer account** (`/account`): list with statuses, add more (same three options), item detail
  with file downloads, company details.
- **Admin** (`/admin`, emails listed in `ADMIN_EMAILS`): applications queue with quick checks (VAT given,
  company vs free email, possible duplicates by VAT, name or email domain), approve / ask for info /
  reject, internal notes, every submission with status and key facts, invite a company that emailed.
- **Emails**: registration received, team alerts, sign-in links, approval, info request, rejection
  (optional), status change (optional), invite.

Not in phase one: in-portal offers and matching, Pipedrive sync, messaging, translations.

## Stack

Cloudflare Worker (Hono, server-rendered JSX) + **D1** database + **R2** file storage, both restricted to
the EU jurisdiction + **Resend** for sending email (free plan). Runs on the Cloudflare Workers free plan:
a 14 MB upload was tested live and goes through. Styles come from the public site's
`https://www.pricemart.eu/assets/styles.css`, so the portal always matches it; `public/portal.css` only
adds portal components. Every form works without JavaScript; `public/portal.js` adds the one-step-at-a-time
view, adding lots and inline checks.

```
src/index.tsx      routes
src/auth.ts        sign-in links, sessions
src/db.ts          all SQL
src/mail.ts        sending + email templates
src/lib/           pure logic, unit tested (validation, summaries, dates, files, email checks)
src/views/         pages
migrations/        D1 schema
test/              unit tests (vitest)
e2e/               browser tests (Playwright), desktop and phone
```

## Run and test locally

```bash
npm install
npm run db:migrate:local
npm run dev                    # http://127.0.0.1:8787, uses .dev.vars
npm test                       # unit tests
npm run e2e                    # browser tests, desktop + phone; starts wrangler dev itself
```

`.dev.vars` (gitignored) for local runs:

```
DEV_MODE=true
APP_URL=http://127.0.0.1:8787
ADMIN_EMAILS=admin@example.test
ALERT_EMAILS=team@example.test
REGISTER_LIMIT_PER_HOUR=100000
SIGNIN_LIMIT_PER_HOUR=100000
```

With `DEV_MODE=true` no email is sent: messages land in the `email_log` table and are readable at
`/__dev/outbox?to=<email>` (404 in production). Sign in locally as `admin@example.test` and copy the link
from the outbox.

## Deploy

```bash
npm run typecheck && npm test && npm run e2e
npm run db:migrate:remote      # only when migrations/ changed
npx wrangler deploy
```

Settings live in `wrangler.jsonc` → `vars`: `ADMIN_EMAILS` (who can open /admin) and `ALERT_EMAILS`
(who gets the team alerts), both comma-separated. Anti-spam: 10 registrations per network per hour and
5 sign-in emails per address per hour (override with `REGISTER_LIMIT_PER_HOUR`, `SIGNIN_LIMIT_PER_HOUR`).

**Email goes through Resend** (resend.com, free plan: 3,000 emails a month, 100 a day). Setup:
pricemart.eu added and verified in Resend (DNS records on a `send.` subdomain plus a DKIM record, so
Google Workspace mail is untouched), then a "Sending access" API key for pricemart.eu stored as a secret:

```bash
npx wrangler secret put RESEND_API_KEY
```

Every send is recorded in `email_log` (`sent` or `failed` with the reason). Admin pages show a warning
when any email failed in the last 24 hours, for example when the daily limit is reached.
