import { describe, expect, it } from 'vitest';
import { emailDomain, emailList, isFreeEmail, isValidEmail, normalizeEmail } from '../src/lib/email';
import { checkFiles, extension, formatBytes, safeFilename } from '../src/lib/files';
import { RESEND_URL, describeResendError, isRetryable, resendRequest } from '../src/lib/resend';
import { statusLabel } from '../src/lib/labels';
import { submissionSummary } from '../src/lib/summary';
import { escapeHtml, normalizeCompanyName, normalizeVat, normalizeWebsite, truncate } from '../src/lib/text';
import { daysUntil, formatDate, formatDateTime, isValidDate, relativeTime } from '../src/lib/time';
import { randomToken, sha256Hex } from '../src/lib/tokens';
import { type FormLike, emptyWant, parseContact, parseItem, parseMode, parseProfile } from '../src/lib/validate';

/** Build a FormLike from a plain object; arrays become repeated fields. */
function form(values: Record<string, string | string[]>): FormLike {
  return {
    get: (n) => {
      const v = values[n];
      return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
    },
    getAll: (n) => {
      const v = values[n];
      return v === undefined ? [] : Array.isArray(v) ? v : [v];
    },
  };
}

describe('email', () => {
  it('normalizes and validates', () => {
    expect(normalizeEmail('  Anna@Example.COM ')).toBe('anna@example.com');
    expect(isValidEmail('anna@example.com')).toBe(true);
    expect(isValidEmail('anna@example')).toBe(false);
    expect(isValidEmail('anna example.com')).toBe(false);
    expect(emailDomain('anna@shop.example.se')).toBe('shop.example.se');
  });

  it('spots free email providers, including country variants', () => {
    expect(isFreeEmail('a@gmail.com')).toBe(true);
    expect(isFreeEmail('a@hotmail.de')).toBe(true);
    expect(isFreeEmail('a@outlook.es')).toBe(true);
    expect(isFreeEmail('a@yahoo.co.uk')).toBe(true);
    expect(isFreeEmail('a@wp.pl')).toBe(true);
    expect(isFreeEmail('a@haribo.com')).toBe(false);
    expect(isFreeEmail('a@outlookfoods.com')).toBe(false);
  });

  it('parses the comma-separated admin list', () => {
    expect(emailList(' Contact@PriceMart.eu, jack@example.com ,,')).toEqual(['contact@pricemart.eu', 'jack@example.com']);
    expect(emailList(undefined)).toEqual([]);
  });
});

describe('text', () => {
  it('reduces company names to comparable words', () => {
    expect(normalizeCompanyName('Nordic Snacks AB')).toBe('nordic snacks');
    expect(normalizeCompanyName('NORDIC SNACKS, ab.')).toBe('nordic snacks');
    expect(normalizeCompanyName('Süßwaren Müller GmbH & Co. KG')).toBe('susswaren muller');
    expect(normalizeCompanyName('Price Mart S.L.')).toBe('price mart');
    expect(normalizeCompanyName('Firma Sp. z o.o.')).toBe('firma');
    expect(normalizeCompanyName('Słodycze Łódź')).toBe('slodycze lodz');
    expect(normalizeCompanyName('Søtt og Godt AS')).toBe('sott og godt');
  });

  it('normalizes VAT numbers as typed', () => {
    expect(normalizeVat('de 123.456-789')).toBe('DE123456789');
    expect(normalizeVat('B72584592')).toBe('B72584592');
  });

  it('adds https to bare websites', () => {
    expect(normalizeWebsite('example.com')).toBe('https://example.com');
    expect(normalizeWebsite('http://example.com')).toBe('http://example.com');
    expect(normalizeWebsite('  ')).toBe('');
  });

  it('escapes html and truncates', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(truncate('one   two\nthree', 50)).toBe('one two three');
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('time', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it('formats dates', () => {
    expect(formatDate('2026-11-14')).toBe('14 Nov 2026');
    expect(formatDate('2026-09-28T09:12:00.000Z')).toBe('28 Sep 2026');
    expect(formatDateTime('2026-09-28T09:05:00.000Z')).toBe('28 Sep 2026, 09:05 UTC');
    expect(formatDate(null)).toBe('');
  });

  it('counts days to a best-before date', () => {
    expect(daysUntil('2026-11-14', now)).toBe(47);
    expect(daysUntil('2027-01-02', now)).toBe(96);
    expect(daysUntil('2026-09-28', now)).toBe(0);
    expect(daysUntil('2026-09-15', now)).toBe(-13);
    expect(daysUntil('not a date', now)).toBeNull();
  });

  it('validates real calendar dates only', () => {
    expect(isValidDate('2026-11-14')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('14/11/2026')).toBe(false);
  });

  it('describes recency', () => {
    expect(relativeTime('2026-09-28T11:59:40Z', now)).toBe('just now');
    expect(relativeTime('2026-09-28T11:15:00Z', now)).toBe('45 min ago');
    expect(relativeTime('2026-09-28T07:00:00Z', now)).toBe('5 h ago');
    expect(relativeTime('2026-09-27T10:00:00Z', now)).toBe('1 day ago');
    expect(relativeTime('2026-09-20T10:00:00Z', now)).toBe('8 days ago');
    expect(relativeTime('2026-07-01T10:00:00Z', now)).toBe('01 Jul 2026');
  });
});

describe('tokens', () => {
  it('makes url-safe random tokens', () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes with sha-256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('files', () => {
  it('accepts common stock-list formats and rejects others', () => {
    expect(checkFiles([{ name: 'stock.xlsx', size: 1000 }, { name: 'label.JPG', size: 2000 }])).toBeNull();
    expect(checkFiles([{ name: 'virus.exe', size: 10 }])).toMatch(/isn't a file type/);
    expect(checkFiles([{ name: 'big.pdf', size: 16 * 1024 * 1024 }])).toMatch(/over 15 MB/);
    expect(checkFiles([{ name: 'empty.csv', size: 0 }])).toMatch(/empty/);
    expect(checkFiles(Array.from({ length: 11 }, (_, i) => ({ name: `${i}.pdf`, size: 1 })))).toMatch(/at most 10/);
    expect(
      checkFiles([
        { name: 'a.pdf', size: 14 * 1024 * 1024 },
        { name: 'b.pdf', size: 14 * 1024 * 1024 },
        { name: 'c.pdf', size: 14 * 1024 * 1024 },
      ]),
    ).toMatch(/30 MB/);
  });

  it('makes safe file names', () => {
    expect(safeFilename('../../etc/passwd')).toBe('passwd');
    expect(safeFilename('Lager Liste (Okt).xlsx')).toBe('Lager_Liste_Okt_.xlsx');
    expect(safeFilename('C:\\Users\\a\\stock.csv')).toBe('stock.csv');
    expect(extension('Stock.List.XLSX')).toBe('xlsx');
    expect(formatBytes(2048)).toBe('2 KB');
  });
});

describe('labels', () => {
  it('uses words that fit sellers and buyers', () => {
    expect(statusLabel('stock', 'done')).toBe('Sold');
    expect(statusLabel('want', 'done')).toBe('Supplied');
    expect(statusLabel('stock', 'offer_sent')).toBe('Offer sent');
    expect(statusLabel('want', 'new')).toBe('Received');
  });
});

describe('parseItem: sellers', () => {
  it('defaults to the quickest option', () => {
    expect(parseMode('')).toBe('describe');
    expect(parseMode('nonsense')).toBe('describe');
    expect(parseMode('upload')).toBe('upload');
  });

  it('accepts a short description and nothing else', () => {
    const { input, errors } = parseItem('seller', form({ mode: 'describe', body_describe: '12 pallets of gummy bears' }), []);
    expect(errors).toEqual({});
    expect(input.body).toBe('12 pallets of gummy bears');
  });

  it('asks for a description when it is empty', () => {
    const { errors } = parseItem('seller', form({ mode: 'describe', body_describe: ' ' }), []);
    expect(errors.body_describe).toMatch(/what you have/);
  });

  it('only reads the text box of the chosen option', () => {
    const { input } = parseItem('seller', form({ mode: 'upload', body_describe: 'ignored', body_upload: 'see list' }), [
      { name: 'stock.xlsx', size: 10 },
    ]);
    expect(input.body).toBe('see list');
  });

  it('needs a file to upload', () => {
    expect(parseItem('seller', form({ mode: 'upload' }), []).errors.files_upload).toBe('Choose at least one file.');
    expect(parseItem('seller', form({ mode: 'upload' }), [{ name: 'x.exe', size: 5 }]).errors.files_upload).toMatch(/file type/);
  });

  it('checks optional attachments too', () => {
    const { errors } = parseItem('seller', form({ mode: 'describe', body_describe: 'hello there' }), [{ name: 'x.exe', size: 5 }]);
    expect(errors.files_describe).toMatch(/file type/);
  });

  it('needs product, quantity and best-before for each lot, and skips blank rows', () => {
    const f = form({
      mode: 'details',
      lot_product: ['Gummy bears 200 g', '', 'Wafer rolls'],
      lot_quantity: ['12', '', ''],
      lot_unit: ['Pallets', 'Pallets', 'Cases'],
      lot_best_before: ['2026-11-14', '', '2026-02-30'],
      lot_brand: ['', '', ''],
      lot_ean: ['', '', ''],
      lot_category: ['Confectionery', '', 'Nonsense'],
      lot_stock_country: ['Germany', '', ''],
      lot_packaging_languages: ['DE, EN', '', ''],
      lot_storage: ['Ambient', 'Ambient', 'Ambient'],
      lot_asking_price: ['', '', ''],
      lot_notes: ['', '', ''],
    });
    const { input, errors } = parseItem('seller', f, []);
    expect(input.lots).toHaveLength(3);
    expect(input.lots[0]).toMatchObject({ product: 'Gummy bears 200 g', quantity: '12', category: 'Confectionery', stock_country: 'Germany' });
    expect(input.lots[2].category).toBe('');
    expect(errors).toEqual({ lot_2_quantity: 'Add the quantity.', lot_2_best_before: 'Use a date like 2026-11-14.' });
  });

  it('needs at least one lot', () => {
    const { errors } = parseItem('seller', form({ mode: 'details', lot_product: [''], lot_quantity: [''], lot_best_before: [''] }), []);
    expect(errors.lots).toMatch(/at least one lot/);
  });
});

describe('parseItem: buyers', () => {
  it('reads the options and drops values that are not on the lists', () => {
    const f = form({
      mode: 'details',
      want_categories: ['Confectionery', 'Snacks', 'Weapons'],
      want_countries: ['Sweden', 'Atlantis'],
      want_other_countries: 'Iceland',
      want_min_shelf_life: 'At least 30 days',
      want_order_size: '1 to 5 pallets',
      want_delivery: 'nope',
      body_details: 'Swedish packaging preferred',
    });
    const { input, errors } = parseItem('buyer', f, []);
    expect(errors).toEqual({});
    expect(input.want).toMatchObject({
      categories: ['Confectionery', 'Snacks'],
      countries: ['Sweden'],
      other_countries: 'Iceland',
      min_shelf_life: 'At least 30 days',
      order_size: '1 to 5 pallets',
      delivery: '',
    });
    expect(input.body).toBe('Swedish packaging preferred');
  });

  it('needs a category or a brand', () => {
    expect(parseItem('buyer', form({ mode: 'details' }), []).errors.want).toMatch(/category/);
    expect(parseItem('buyer', form({ mode: 'details', want_brands: 'Any Haribo' }), []).errors).toEqual({});
  });

  it('never reads seller lots for a buyer', () => {
    const { input } = parseItem('buyer', form({ mode: 'details', want_brands: 'x', lot_product: ['Sneaky'] }), []);
    expect(input.lots[0].product).toBe('');
  });
});

describe('parseContact', () => {
  it('only needs company, name and work email', () => {
    const { input, errors } = parseContact(form({ company: 'Nordic Snacks AB', name: 'Anna', email: ' Anna@Nordic.SE ' }));
    expect(errors).toEqual({});
    expect(input.email).toBe('anna@nordic.se');
    expect(input.vat_number).toBe('');
  });

  it('reports each missing required field', () => {
    const { errors } = parseContact(form({}));
    expect(Object.keys(errors).sort()).toEqual(['company', 'email', 'name']);
    expect(parseContact(form({ company: 'x', name: 'y', email: 'nope' })).errors.email).toBe('Check the email address.');
  });

  it('keeps the optional fields, cleaned', () => {
    const { input } = parseContact(
      form({
        company: 'x', name: 'y', email: 'a@b.se', vat_number: 'SE556', country: 'Sweden', website: 'nordic.se',
        business_type: 'Retailer or discounter', phone: '+46 1', job_title: 'Buyer',
      }),
    );
    expect(input).toMatchObject({ country: 'Sweden', website: 'https://nordic.se', business_type: 'Retailer or discounter' });
    expect(parseContact(form({ company: 'x', name: 'y', email: 'a@b.se', country: 'Narnia' })).input.country).toBe('');
  });

  it('edits the profile without touching the email', () => {
    const { input, errors } = parseProfile(form({ company: 'x', name: 'y', email: 'evil@else.com' }));
    expect(errors).toEqual({});
    expect('email' in input).toBe(false);
  });
});

describe('resend', () => {
  const sender = { from: 'portal@pricemart.eu', fromName: 'PriceMart', replyTo: 'contact@pricemart.eu' };
  const mail = { to: 'anna@nordic.se', subject: 'Hi', text: 'Hello', html: '<p>Hello</p>' };

  it('builds the API request with reply-to and an idempotency key', () => {
    const { url, init } = resendRequest('re_test', sender, mail, 'key-1');
    expect(url).toBe(RESEND_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer re_test', 'Content-Type': 'application/json', 'Idempotency-Key': 'key-1' });
    expect(JSON.parse(init.body)).toEqual({
      from: 'PriceMart <portal@pricemart.eu>',
      to: ['anna@nordic.se'],
      reply_to: 'contact@pricemart.eu',
      subject: 'Hi',
      text: 'Hello',
      html: '<p>Hello</p>',
    });
  });

  it('keeps the sender name from breaking the From header', () => {
    const { init } = resendRequest('k', { ...sender, fromName: 'Price"Mart <x>' }, mail, 'k');
    expect(JSON.parse(init.body).from).toBe('PriceMart x <portal@pricemart.eu>');
  });

  it('retries only rate limits and server errors', () => {
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(500)).toBe(true);
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(403)).toBe(false);
    expect(isRetryable(422)).toBe(false);
  });

  it('explains failures in plain words for the email log', () => {
    expect(describeResendError(403, '{"statusCode":403,"name":"validation_error","message":"The pricemart.eu domain is not verified."}')).toBe(
      'HTTP 403: validation_error: The pricemart.eu domain is not verified. (check RESEND_API_KEY and that pricemart.eu is verified in Resend)',
    );
    expect(describeResendError(429, '{"name":"daily_quota_exceeded","message":"You have reached your daily email sending quota."}')).toContain(
      'free plan allows 100 emails a day',
    );
    expect(describeResendError(502, 'Bad Gateway')).toBe('HTTP 502: Bad Gateway');
    expect(describeResendError(500, '')).toBe('HTTP 500: no details');
  });
});

describe('submissionSummary', () => {
  const base = { body: null, lots: [], fileNames: [], want: null };

  it('summarises each kind of submission in one line', () => {
    expect(submissionSummary({ ...base, kind: 'stock', mode: 'describe', body: '\n12 pallets of gummies\nmore text' })).toBe(
      '12 pallets of gummies',
    );
    expect(
      submissionSummary({
        ...base, kind: 'stock', mode: 'details',
        lots: [{ product: 'Gummy bears 200 g', quantity: '12', unit: 'Pallets' }, { product: 'Wafers', quantity: '3', unit: 'Cases' }],
      }),
    ).toBe('Gummy bears 200 g, 12 pallets and 1 more lot');
    expect(submissionSummary({ ...base, kind: 'stock', mode: 'upload', fileNames: ['stock.xlsx', 'b.pdf', 'c.jpg'] })).toBe(
      'Stock list: stock.xlsx and 2 more',
    );
    expect(
      submissionSummary({
        ...base, kind: 'want', mode: 'details',
        want: { ...emptyWant(), categories: ['Confectionery', 'Snacks'], countries: ['Sweden'], other_countries: 'Iceland' },
      }),
    ).toBe('Confectionery, Snacks to Sweden, Iceland');
    expect(submissionSummary({ ...base, kind: 'want', mode: 'describe', body: '' })).toBe('(no description)');
  });
});
