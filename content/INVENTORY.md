# Live-site inventory, www.pricemart.eu

Captured: 2026-05-13

## Pages

| # | Page | Live URL | Captured to |
|---|------|----------|-------------|
| 1 | Home | https://www.pricemart.eu/ | content/01-home.md |
| 2 | About | https://www.pricemart.eu/about | content/02-about.md |
| 3 | Company (imprint / legal) | https://www.pricemart.eu/company | content/03-company.md |
| 4 | Terms and Conditions | https://www.pricemart.eu/terms | content/04-terms.md |
| 5 | Privacy Policy (EN) | https://www.pricemart.eu/privacy-policy-en | content/05-privacy-policy.md |
| 6 | Cookie Policy (EN) | https://www.pricemart.eu/cookie-policy-en | content/06-cookie-policy.md |

The "Contact" nav item is an in-page anchor on the home page (footer contact block + contact form), not a separate page.
No `sitemap.xml` is published (404).

## Site stack
- Hosted on **Wix** (confirmed by contact-form "Thanks! Message sent." pattern, "More" nav item, and the `logo_transparent_edited.png` filename convention).
- No e-commerce / shop pages live, despite Terms referencing an "Online Shop".
- Only "EN" pages exist; no DE/ES versions even though copy is bilingual-template-style.

## Company / contact facts to carry forward
- Legal entity: **PriceMart SL**
- Address: Carrer Rosa Sensat 3, Barcelona, Spain 08005
- Registration No: **B72584592**
- Phone: **(+34) 651 761 330**  (cookie policy mistypes "+35")
- Email: **contact@pricemart.eu**

## Brand mentions on the site
- Haribo
- Ferrero (Nutella)
- Mars

## Testimonials (with names, likely placeholder or template)
- Jonas Christiansen, "owns several stores in Sweden"
- Sia Ahmed
- Lukas Steensgard

> Worth confirming with Jack whether these are real customers or template names, keep, replace, or remove.

## Assets pulled from /Downloads
- `logo_transparent_edited.avif` → `assets/logo/logo.avif`
  - 12.7 KB AVIF, transparent background, edited version of the live site's `logo_transparent_edited.png`.

## Things to FIX in the rebuild (caught while reading the live copy)
1. Cookie policy says "governed by the law of **Germany**", should be **Spain**.
2. Privacy policy section 8 references the **German** data-protection authority, should be **AEPD** (Spain).
3. Cookie policy phone typo: `(+35) 651761330`, correct is `(+34)`.
4. Cookie policy "List of cookies and their description" is empty.
5. Cookie policy placeholder `[SPECIFY LINK HERE]` is unresolved.
6. Privacy policy still mentions German "DSGVO" interchangeably with GDPR, pick one (GDPR), localise.
7. Terms reference an "Online Shop" that doesn't exist on the site, either rebuild it as a shop or rewrite the terms to a B2B-wholesale model (which is what the home copy implies).
8. Home brand copy has grammar slips ("arrises", "in a quick maner", "the worlds most selling"), clean up.
9. Footer "Sales" link is dead.
10. No SEO basics: no sitemap.xml, no meta description (verify on rebuild).
