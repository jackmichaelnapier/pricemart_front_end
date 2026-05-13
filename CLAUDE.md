# pricemart-site

Rebuild of **www.pricemart.eu** — the Pricemart SL public-facing site.
Pricemart SL is the Barcelona-based legal entity that owns FitnessNord; this site is the wholesale / B2B-distribution front for the snack & confectionery side of the business.

## Status — 2026-05-13

- **Live site captured** to `content/*.md` (six pages: home, about, company, terms, privacy, cookie).
- **Logo** (AVIF, transparent) at `assets/logo/logo.avif`.
- **Inventory + cleanup notes** in `content/INVENTORY.md` — lists every typo, broken link, and template leftover (Germany-instead-of-Spain references, empty cookie table, dead "Sales" footer link, etc.) so the rebuild can fix them in place.
- **Stack for the rebuild is not yet decided** — see open questions in NOTES.md.

## Layout

```
content/      Verbatim markdown of the live site, one page per file
assets/       Logo and any product/brand imagery for the rebuild
  logo/       logo.avif (Jack-supplied, transparent)
reference/    Anything reference-only (screenshots of old site, etc.)
```

## Conventions

- No em dashes (Jack-wide).
- Currency: not relevant here — Pricemart's public site is B2B and doesn't show prices.
- Languages: live site is English-only. Whether the rebuild is EN-only, EN+ES, or EN+ES+DA is an open question.
- Legal entity name on every page: **PriceMart SL** (with the lower-case `art`). Address and registration number must match the company page exactly.

## Cross-project links

- The FitnessNord business sells **through** PriceMart SL — see `~/Projects/fitnessnord/CLAUDE.md` for context on the broader operation.
- PriceMart is also the customer for the weekly finance / Sweden / Watchtower reports published into the WildBreeze portal (see `~/Projects/wildbreeze/CLAUDE.md`).

## Open scoping questions (need Jack)

1. Visual direction — WildBreeze dark/futuristic? FitnessNord-style coastal/Mediterranean? Or a clean B2B-distributor look distinct from both?
2. Stack — static HTML + GitHub Pages (matches the rest of `~/Projects/`)? Or something else?
3. Languages — EN only, or add ES / DA / SV?
4. Keep all six pages, or trim (e.g. merge About + Company into one)?
5. Fix the legal-template Germany references and other typos listed in INVENTORY.md?
6. Are the three testimonials real customers or template filler — keep, swap for real ones, or drop?
