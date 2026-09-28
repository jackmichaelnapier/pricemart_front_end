import { describe, expect, it } from 'vitest';
import {
  LANGS, fromAcceptLanguage, messagesFor, optionLabel, pickLang, sitePath, sortedCountries, withLang,
} from '../src/lib/i18n';
import {
  BUSINESS_TYPES, CATEGORIES, COUNTRIES, DELIVERY, FREQUENCIES, ORDER_SIZES, SHELF_LIFE, STORAGE, UNITS,
} from '../src/lib/options';
import { checkFiles } from '../src/lib/files';
import { parseContact, parseItem } from '../src/lib/validate';
import { templates } from '../src/mail';

/** Every leaf of a message tree as "path: text", calling message functions with sample values. */
function leaves(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (typeof node === 'function') {
    const args = node.length === 2 ? ['Acme GmbH', true] : [node.name === 'hi' ? 'Anna' : 7];
    return [[path, String((node as (...a: unknown[]) => unknown)(...args))]];
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

const keysOf = (node: unknown): string[] => leaves(node).map(([p]) => p).filter((p) => !p.startsWith('options.')).sort();

const EM_DASH = String.fromCharCode(0x2014);
const translated = LANGS.filter((l) => l !== 'en');
const optionValues = [...CATEGORIES, ...BUSINESS_TYPES, ...UNITS, ...STORAGE, ...SHELF_LIFE, ...ORDER_SIZES, ...FREQUENCIES, ...DELIVERY];

describe('translations', () => {
  it.each(translated)('%s has exactly the English messages', (lang) => {
    expect(keysOf(messagesFor(lang))).toEqual(keysOf(messagesFor('en')));
  });

  it.each(translated)('%s translates every option label', (lang) => {
    const missing = optionValues.filter((v) => !messagesFor(lang).options[v]);
    expect(missing).toEqual([]);
  });

  it.each(LANGS)('%s has no empty text and no em dashes', (lang) => {
    for (const [path, text] of leaves(messagesFor(lang))) {
      if (path === 'register.agreeAfter' || path.endsWith('.end')) continue; // may be just "."
      expect(text.trim(), `${lang} ${path}`).not.toBe('');
      expect(text, `${lang} ${path}`).not.toContain(EM_DASH);
    }
  });

  it('shows countries in the page language, sorted, with Other last', () => {
    expect(optionLabel('de', 'Germany')).toBe('Deutschland');
    expect(optionLabel('sv', 'Czechia')).toBe('Tjeckien');
    expect(optionLabel('de', 'Other')).toBe('Sonstiges');
    expect(optionLabel('en', 'Germany')).toBe('Germany');
    const de = sortedCountries('de', COUNTRIES);
    expect(de.at(-1)).toBe('Other');
    expect(de.indexOf('Denmark')).toBeLessThan(de.indexOf('Germany')); // Dänemark before Deutschland
    expect(sortedCountries('en', COUNTRIES)).toEqual([...COUNTRIES]);
  });
});

describe('choosing the language', () => {
  it('a link wins, then the remembered choice, then the browser', () => {
    expect(pickLang('de', 'sv', 'pl')).toBe('de');
    expect(pickLang(undefined, 'sv', 'pl')).toBe('sv');
    expect(pickLang('xx', 'nope', 'cs-CZ,cs;q=0.9')).toBe('cs');
    expect(pickLang(undefined, undefined, undefined)).toBe('en');
  });

  it('reads the browser preference by weight', () => {
    expect(fromAcceptLanguage('fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7')).toBe('de');
    expect(fromAcceptLanguage('en-GB,en;q=0.9,sv;q=0.8')).toBe('en');
    expect(fromAcceptLanguage('pl;q=0.5,es;q=0.9')).toBe('es');
    expect(fromAcceptLanguage('fr,it')).toBe('en');
    expect(fromAcceptLanguage('')).toBe('en');
  });

  it('links back to the right site language and keeps it on emailed links', () => {
    expect(sitePath('https://www.pricemart.eu', 'en', 'contact/')).toBe('https://www.pricemart.eu/contact/');
    expect(sitePath('https://www.pricemart.eu', 'de', 'contact/')).toBe('https://www.pricemart.eu/de/contact/');
    expect(withLang('https://app.pricemart.eu/auth?token=abc', 'sv')).toBe('https://app.pricemart.eu/auth?token=abc&lang=sv');
    expect(withLang('https://app.pricemart.eu/auth?token=abc', 'en')).toBe('https://app.pricemart.eu/auth?token=abc');
  });
});

describe('localized checks and emails', () => {
  const empty = { get: () => '', getAll: () => [] };

  it('form errors come in the page language', () => {
    expect(parseContact(empty, messagesFor('de').errors).errors.company).toBe('Geben Sie Ihren Firmennamen an.');
    expect(parseContact(empty).errors.company).toBe('Add your company name.');
    expect(parseItem('seller', empty, [], messagesFor('es').errors).errors.body_describe).toBe('Cuéntenos un poco sobre lo que tiene.');
    expect(checkFiles([{ name: 'a.exe', size: 10 }], messagesFor('cs').errors)).toContain('a.exe');
  });

  it('customer emails are in their language, team emails stay in English', () => {
    const de = templates.registrationReceived('a@b.de', { name: 'Anna', role: 'seller', company: 'Acme', summary: 'Gummibärchen' }, 'de');
    expect(de.subject).toBe('Wir haben Ihre Angaben erhalten');
    expect(de.html).toContain('<html lang="de">');
    expect(de.text).toContain('als Verkäufer');
    const sv = templates.approved('a@b.se', { name: null, url: 'https://x/auth?token=1&lang=sv', hours: 72 }, 'sv');
    expect(sv.subject).toBe('Godkänd: logga in på PriceMart');
    expect(sv.text).toContain('Välkommen');
    const en = templates.signInLink('a@b.com', { url: 'https://x', minutes: 30 });
    expect(en.subject).toBe('Your PriceMart sign-in link');
    const team = templates.teamNewRegistration('t@p.eu', { company: 'Acme', role: 'seller', name: 'Anna', email: 'a@b.de', summary: 's', notes: [], url: 'u' });
    expect(team.subject).toBe('New seller: Acme');
  });
});
