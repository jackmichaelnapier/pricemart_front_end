const FREE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'gmx.net', 'gmx.de', 'gmx.at',
  'web.de', 't-online.de', 'freenet.de', 'mail.com', 'mail.ru', 'yandex.com', 'yandex.ru',
  'o2.pl', 'wp.pl', 'interia.pl', 'onet.pl', 'seznam.cz', 'email.cz', 'centrum.cz', 'libero.it',
  'virgilio.it', 'orange.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'telia.com', 'live.se',
  'zoho.com', 'tutanota.com', 'fastmail.com',
]);

// Provider families with many country domains (hotmail.de, outlook.es, yahoo.co.uk, ...).
const FREE_PATTERNS = [/^(hotmail|outlook|live|msn|windowslive)\.[a-z.]+$/, /^yahoo\.[a-z.]+$/];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

export function isFreeEmail(email: string): boolean {
  const domain = emailDomain(email);
  return FREE_DOMAINS.has(domain) || FREE_PATTERNS.some((p) => p.test(domain));
}

/** Parse a comma-separated env var of email addresses. */
export function emailList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((e) => normalizeEmail(e))
    .filter(Boolean);
}
