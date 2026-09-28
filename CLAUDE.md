# pricemart-site

The public www.pricemart.eu website for **PriceMart SL** (Barcelona, the legal entity that owns FitnessNord). Wholesale / B2B distribution front for snack and confectionery brands (Haribo, Ferrero, Mars, etc.) to Northern European retailers.

## TL;DR

- **Live:** https://www.pricemart.eu (apex `pricemart.eu` 301s to www)
- **Repo:** `jackmichaelnapier/pricemart_front_end` (default branch `main`)
- **Deploy:** GitHub Pages via `.github/workflows/pages.yml`, push to `main`, the `site/` folder ships within ~1 min
- **Stack:** static HTML + one shared CSS file, no build step
- **Languages:** English at the root plus DE, ES, PL, CS, SV mirrors under `/de/`, `/es/`, ... (policy pages are English only; the `-en` suffix on their URLs is a Wix-era artefact retained for backward-compat)
- **GA4:** `G-K7SHZYB10Z`, marker-fenced block in every page's `<head>`
- **Trade portal:** https://app.pricemart.eu, source in `portal/` (Cloudflare Worker + D1 + R2), see below

## Trade portal (`portal/`)

Buyers and sellers register, an admin approves them, and they send stock or requests from an account. Phase one, built 2026-09-28. Full detail in `portal/README.md`.

- **Runs alongside the email forms, on purpose.** Jack's decision: the FormSubmit forms and `contact@pricemart.eu` stay the primary route while leads are qualified through both. The site only offers registration as a secondary option (header "Sign in" + "Register", one line above the forms on /sellers, /buyers, /contact, one line on /thanks, in all 6 languages). Do not remove or demote the email forms without Jack saying so.
- **Least friction first.** Step 1 is what they have (describe it, upload any file, or enter lots), step 2 is contact details with only company, name and email required. VAT is a plain optional field, no VIES check.
- **In all six languages** (since 2026-09-28): the public pages (register, forms, errors, thanks, sign in) and the emails a customer gets (confirmation, sign-in link, approval, question, rejection) follow `?lang=xx`, then the `pm_lang` cookie, then the browser language. Every portal link on the site carries its page language (`?lang=de`), so "Trade with us" on /de/ opens the German page. Texts live in `portal/src/i18n/{en,de,es,pl,cs,sv}.ts` (English is the source; `test/i18n.test.ts` fails on a missing key or an em dash). Stored data, the account pages and the admin stay in English; the admin company page shows "registered in German" etc. The `users.lang` column came with migration 0002.
- **Deploy is separate from the site:** `cd portal && npx wrangler deploy`. Pushing to `main` does not deploy it (the Pages workflow only watches `site/**`).
- **Email goes through Resend, free plan** (3,000 a month, 100 a day), chosen over the paid Cloudflare plan. Needs pricemart.eu verified in Resend and the `RESEND_API_KEY` Worker secret. Without it, sign-in links and team alerts do not go out. The Worker itself runs on the Cloudflare free plan (a 14 MB upload was tested live).
- Header on every page: "Trade with us" (`li.nav-trade`, filled aubergine, links to app.pricemart.eu/register) next to the coral Contact. Below 960px the header collapses to one bar (logo, a copy of Trade with us `a.topbar-cta`, menu button `details.nav-toggle`); the menu is the `nav` right after the button, opens via `.nav-toggle[open] ~ nav` with no JavaScript, and holds Contact as a big coral button plus "Already have an account? Sign in" (`li.nav-signin-row`, menu only). `site/assets/site.js` (deferred) only adds closing on a tap outside or Escape. The footer Company column has a "Trade account sign in" link. Button widths were measured per language (Spanish uses "Opere con nosotros" to fit), so re-measure all 6 if labels change. The portal header shares the stylesheet and has no menu button, so the collapse rules only apply where `.nav-toggle` exists.
- Tests: `npm test` (unit) and `npm run e2e` (Playwright, desktop + phone, all three roles). Run both before deploying.

## Skills (load when needed)

This project's behaviour is documented in three skills at `~/.claude/skills/`. Read the relevant one when working on PriceMart:

- **pricemart-project**, master orientation map. Where everything is, how it deploys, sub-skills index.
- **pricemart-design**, visual system. Palette (aubergine + coral from the logo), typography, component vocabulary.
- **pricemart-structure**, page templates, URL conventions (folder/index.html for clean Wix-matching URLs), internal-link rules, AND the canonical GA marker-fenced block + audit script. **Read this any time you add a new page or change anything site-wide.**

## Layout

```
site/                  ← what GitHub Pages serves
  CNAME                www.pricemart.eu
  index.html           home
  about/index.html
  company/index.html
  terms/index.html
  privacy-policy-en/index.html
  cookie-policy-en/index.html
  assets/
    styles.css
    img/{logo.png, logo.avif}

portal/                Trade portal at app.pricemart.eu (Cloudflare Worker, NOT served by Pages)
content/               VERBATIM live-Wix capture, reference only (NOT deployed)
assets/                Source assets (logo from Jack)
.github/workflows/pages.yml   Deploy workflow
```

## Conventions (the short list, see skills for detail)

- **No em dashes anywhere** (Jack-wide rule). Applies to body copy, headings, meta tags, JSON-LD descriptions, alt text, commit messages, translations, everything. Use a comma, period, colon, or new sentence instead. Before committing, run `grep -rn $'\u2014' site/` (searches for the em dash character) and confirm zero hits.
- Every page in `<head>` carries the **GA block** between `<!-- BEGIN GA -->` and `<!-- END GA -->` markers, byte-identical, indented 2 spaces. Adding a new page? Copy from `pricemart-structure` template; do not strip the markers.
- Internal hrefs are **absolute** (`/about/`, `/assets/styles.css`), never relative.
- The **phone number is only on `/company`**, keep it off home, about, terms, privacy, cookie.
- **`PriceMart SL`** spelling and **B72584592** registration number must match the company page exactly.

## Cross-project links

- `~/Projects/Work/fitnessnord/`, the ops/data side of the business (BigQuery, Intercom, ads). PriceMart SL owns FitnessNord.
- `~/Projects/Work/wildbreeze/`, the WildBreeze portal at portal.wildbreeze.io has a customer named "pricemart" that receives weekly finance / Sweden / Watchtower reports. Same legal entity, separate deliverable.

## Session journal

See `NOTES.md` for what was done when.
