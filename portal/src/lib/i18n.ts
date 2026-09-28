import { cs } from '../i18n/cs';
import { de } from '../i18n/de';
import { en, type Messages } from '../i18n/en';
import { es } from '../i18n/es';
import { pl } from '../i18n/pl';
import { sv } from '../i18n/sv';

// The site's six languages. The public pages and the emails a customer gets are translated;
// stored data, the account pages and the admin stay in English.

export const LANGS = ['en', 'de', 'es', 'pl', 'cs', 'sv'] as const;
export type Lang = (typeof LANGS)[number];
export type { Messages };

export const LANG_COOKIE = 'pm_lang';

/** Each language in its own name, for the switcher. */
export const LANG_NATIVE: Record<Lang, string> = {
  en: 'English', de: 'Deutsch', es: 'Español', pl: 'Polski', cs: 'Čeština', sv: 'Svenska',
};

/** For the team: the language someone registered in. */
export const LANG_ENGLISH: Record<Lang, string> = {
  en: 'English', de: 'German', es: 'Spanish', pl: 'Polish', cs: 'Czech', sv: 'Swedish',
};

const MESSAGES: Record<Lang, Messages> = { en, de, es, pl, cs, sv };

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

export function messagesFor(lang: Lang): Messages {
  return MESSAGES[lang];
}

/** "de-DE,de;q=0.9,en;q=0.8": the highest-weighted language we have, else English. */
export function fromAcceptLanguage(header: string | undefined): Lang {
  if (!header) return 'en';
  const ranked = header
    .split(',')
    .map((part, i) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      const weight = q ? Number(q.slice(2)) : 1;
      return { lang: tag.trim().toLowerCase().split('-')[0], weight: Number.isFinite(weight) ? weight : 0, i };
    })
    .filter((r) => r.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.i - b.i);
  for (const r of ranked) if (isLang(r.lang)) return r.lang;
  return 'en';
}

/** A link or the switcher (?lang=) wins, then the remembered choice, then the browser. */
export function pickLang(query: string | undefined, cookie: string | undefined, acceptLanguage: string | undefined): Lang {
  if (isLang(query)) return query;
  if (isLang(cookie)) return cookie;
  return fromAcceptLanguage(acceptLanguage);
}

/** A page on www.pricemart.eu in this language: English is at the root, the others under /xx/. */
export function sitePath(site: string, lang: Lang, path = ''): string {
  return `${site}/${lang === 'en' ? '' : `${lang}/`}${path}`;
}

/** Keeps the language on emailed links, so the page opens in it on any device. */
export function withLang(url: string, lang: Lang): string {
  if (lang === 'en') return url;
  return `${url}${url.includes('?') ? '&' : '?'}lang=${lang}`;
}

// Country option values are stored as English names; each language shows its own name for them.
const COUNTRY_CODES: Record<string, string> = {
  Austria: 'AT', Belgium: 'BE', Bulgaria: 'BG', Croatia: 'HR', Cyprus: 'CY', Czechia: 'CZ', Denmark: 'DK',
  Estonia: 'EE', Finland: 'FI', France: 'FR', Germany: 'DE', Greece: 'GR', Hungary: 'HU', Iceland: 'IS',
  Ireland: 'IE', Italy: 'IT', Latvia: 'LV', Lithuania: 'LT', Luxembourg: 'LU', Malta: 'MT', Netherlands: 'NL',
  Norway: 'NO', Poland: 'PL', Portugal: 'PT', Romania: 'RO', Slovakia: 'SK', Slovenia: 'SI', Spain: 'ES',
  Sweden: 'SE', Switzerland: 'CH', 'United Kingdom': 'GB',
};

const regionNames = new Map<Lang, Intl.DisplayNames | null>();
function regions(lang: Lang): Intl.DisplayNames | null {
  if (!regionNames.has(lang)) {
    try {
      regionNames.set(lang, new Intl.DisplayNames([lang], { type: 'region' }));
    } catch {
      regionNames.set(lang, null);
    }
  }
  return regionNames.get(lang) ?? null;
}

/** What to show for a stored option value (a category, a unit, a country) in this language. */
export function optionLabel(lang: Lang, value: string): string {
  if (lang === 'en') return value;
  const own = MESSAGES[lang].options[value];
  if (own) return own;
  const code = COUNTRY_CODES[value];
  if (code) {
    const name = regions(lang)?.of(code);
    if (name && name !== code) return name;
  }
  return value;
}

/** Countries in alphabetical order for this language, with "Other" kept last. */
export function sortedCountries(lang: Lang, values: readonly string[]): string[] {
  if (lang === 'en') return [...values];
  const rest = values.filter((v) => v !== 'Other');
  rest.sort((a, b) => optionLabel(lang, a).localeCompare(optionLabel(lang, b), lang));
  return values.includes('Other') ? [...rest, 'Other'] : rest;
}
