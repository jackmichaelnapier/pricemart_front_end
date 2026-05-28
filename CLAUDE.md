# pricemart-site

The public www.pricemart.eu website for **PriceMart SL** (Barcelona, the legal entity that owns FitnessNord). Wholesale / B2B distribution front for snack and confectionery brands (Haribo, Ferrero, Mars, etc.) to Northern European retailers.

## TL;DR

- **Live:** https://www.pricemart.eu (apex `pricemart.eu` 301s to www)
- **Repo:** `jackmichaelnapier/pricemart_front_end` (default branch `main`)
- **Deploy:** GitHub Pages via `.github/workflows/pages.yml`, push to `main`, the `site/` folder ships within ~1 min
- **Stack:** static HTML + one shared CSS file, no build step
- **Languages:** English only (deliberate decision; the `-en` suffix on policy URLs is a Wix-era artefact retained for backward-compat)
- **GA4:** `G-K7SHZYB10Z`, marker-fenced block in every page's `<head>`

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

content/               VERBATIM live-Wix capture, reference only (NOT deployed)
assets/                Source assets (logo from Jack)
.github/workflows/pages.yml   Deploy workflow
```

## Conventions (the short list, see skills for detail)

- **No em dashes anywhere** (Jack-wide rule). Applies to body copy, headings, meta tags, JSON-LD descriptions, alt text, commit messages, translations, everything. Use a comma, period, colon, or new sentence instead. Before committing, run `grep -rn '—' site/` and confirm zero hits.
- Every page in `<head>` carries the **GA block** between `<!-- BEGIN GA -->` and `<!-- END GA -->` markers, byte-identical, indented 2 spaces. Adding a new page? Copy from `pricemart-structure` template; do not strip the markers.
- Internal hrefs are **absolute** (`/about/`, `/assets/styles.css`), never relative.
- The **phone number is only on `/company`**, keep it off home, about, terms, privacy, cookie.
- **`PriceMart SL`** spelling and **B72584592** registration number must match the company page exactly.

## Cross-project links

- `~/Projects/Work/fitnessnord/`, the ops/data side of the business (BigQuery, Intercom, ads). PriceMart SL owns FitnessNord.
- `~/Projects/Work/wildbreeze/`, the WildBreeze portal at portal.wildbreeze.io has a customer named "pricemart" that receives weekly finance / Sweden / Watchtower reports. Same legal entity, separate deliverable.

## Session journal

See `NOTES.md` for what was done when.
