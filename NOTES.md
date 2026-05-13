# pricemart-site — session notes

## 2026-05-13 — Project bootstrapped, live site captured

Jack asked for a full rebuild of www.pricemart.eu and supplied a transparent-background AVIF logo (`~/Downloads/logo_transparent_edited.avif`).

Captured the live site (currently on Wix) into `content/*.md`:
- 01-home.md, 02-about.md, 03-company.md, 04-terms.md, 05-privacy-policy.md, 06-cookie-policy.md
- Six pages total; "Contact" in nav is an anchor on the home page, not a separate page.
- No sitemap.xml; no shop despite Terms referencing one.

Logo copied to `assets/logo/logo.avif`.

Tried to grab the original PNG from the Wix CDN — 403. Not needed; the AVIF is the cleaned-up version Jack wants used.

### Cleanup list for the rebuild (also in INVENTORY.md)
Live site has a number of template leftovers and typos that should NOT be carried into the rebuild:
- Cookie policy says it's governed by **German** law; privacy policy section 8 names the **German** DPA. Both should be Spain / AEPD.
- Cookie policy phone is `(+35) 651761330`; correct is `(+34)`.
- Cookie policy "List of cookies and their description" is empty.
- Cookie policy `[SPECIFY LINK HERE]` placeholder still in copy.
- Footer "Sales" link is dead.
- Home copy has grammar slips ("arrises", "in a quick maner", "the worlds most selling").
- Terms reference an "Online Shop" that doesn't exist publicly — probably should be rewritten as B2B-wholesale terms.

### Open scoping questions
Listed in CLAUDE.md; need answers before writing any HTML.

---

## 2026-05-13 (later) — Structure shipped, live on www.pricemart.eu

Scoping answered:
- **Style:** neutral for now, match the logo, finalise after structure is up.
- **Stack:** GitHub repo `jackmichaelnapier/pricemart_front_end`. Static HTML + GitHub Pages.
- **Languages:** English only.
- **Testimonials:** dropped pending real, attributable quotes.
- **Legal cleanup:** all INVENTORY.md items applied (Germany → Spain, +35 → +34, populated cookie table, removed dead links).

Built six pages with a neutral CSS pulling colours from the logo (aubergine `#2D1B4F` + coral `#F4A989`):
- `/`, `/about`, `/company`, `/terms`, `/privacy-policy-en`, `/cookie-policy-en`
- Folder-per-page with `index.html` inside, so URLs are extensionless and match the live Wix paths byte-for-byte (so external bookmarks survive).
- Internal links are absolute. The contact-form action is `mailto:` for now — replace with Formspree/Netlify/etc. when ready.

GitHub Pages enabled via `.github/workflows/pages.yml` (Actions deploy from `site/`). Custom domain configured:
- Cloudflare DNS: CNAME `pricemart.eu` and `www` both → `jackmichaelnapier.github.io`, DNS-only (no orange cloud).
- `site/CNAME` contains `www.pricemart.eu` (canonical). Apex 301s to www.
- HTTPS cert issuance via Let's Encrypt was pending at end of session; the toggle to `https_enforced` should be flipped once the cert lands.

### Phone removed from non-company pages
Phone `+34 651 761 330` is now ONLY on `/company`. Other five pages show email only (both body and footer). Reason: phone is reserved for legal-imprint disclosure on the company page.

---

## 2026-05-13 (end of day) — Skills + GA wired up

Created three project skills at `~/.claude/skills/`:
- **pricemart-project** — master orientation index
- **pricemart-design** — visual system (palette, type, components)
- **pricemart-structure** — page templates, URL conventions, and the marker-fenced GA block convention

Wired up Google Analytics (GA4 `G-K7SHZYB10Z`). Canonical snippet sits in every page's `<head>`, fenced by `<!-- BEGIN GA -->` / `<!-- END GA -->` so it can be audited or batch-rotated.

Audit script (in `pricemart-structure` skill) confirms presence across all six pages.

CLAUDE.md rewritten — old "open scoping questions" section retired now that they're all answered. New CLAUDE.md is a tight orientation pointing to the three skills.

### Open follow-ups
- Flip `https_enforced` on GitHub Pages once Let's Encrypt issues the cert for `www.pricemart.eu`.
- Design pass with Jack (typography decision, hero treatment, imagery).
- Contact form handler: decide between mailto, Formspree, Netlify Forms, or custom endpoint.
