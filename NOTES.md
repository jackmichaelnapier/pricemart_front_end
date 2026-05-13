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
