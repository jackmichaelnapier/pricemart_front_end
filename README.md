# pricemart_front_end

Static front end for **www.pricemart.eu**. Pure HTML + one shared CSS file, no build step.

```
site/
  index.html
  about.html
  company.html
  terms.html
  privacy-policy.html
  cookie-policy.html
  assets/
    styles.css
    img/
      logo.png
      logo.avif
content/        Captured copy from the previous Wix site, kept for reference
assets/         Source assets (logo files etc.)
```

## Local preview

Any static server will do. From the repo root:

```
python3 -m http.server -d site 8000
# open http://localhost:8000
```

## Notes

- Final visual design is still TBD. The current CSS is intentionally neutral and just leans on the logo palette (`--aubergine` and `--coral`).
- See `content/INVENTORY.md` for the list of legal-template cleanups already applied vs. the previous Wix site (Germany→Spain references, +35→+34 phone typo, etc.).
