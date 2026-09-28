const LEGAL_SUFFIXES = new Set([
  'gmbh', 'ag', 'kg', 'ab', 'ltd', 'limited', 'sl', 'slu', 'sa', 'sas', 'sarl', 'srl', 'spa',
  'bv', 'nv', 'as', 'asa', 'aps', 'oy', 'oyj', 'sp', 'zoo', 'z', 'o', 'oo', 'sro', 'spol',
  'kft', 'inc', 'llc', 'plc', 'co', 'company', 'the', 'and',
]);

/** Company name reduced to comparable words, for spotting duplicates. */
// Letters that Unicode normalization does not reduce to plain a-z.
const SPECIAL_LETTERS: Record<string, string> = { ß: 'ss', æ: 'ae', ø: 'o', œ: 'oe', ł: 'l', đ: 'd', þ: 'th' };

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[ßæøœłđþ]/g, (ch) => SPECIAL_LETTERS[ch] ?? ch)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\./g, '') // "S.L." -> "sl", "o.o." -> "oo"
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w && !LEGAL_SUFFIXES.has(w))
    .join(' ');
}

/** VAT number as typed, reduced to upper-case letters and digits. */
export function normalizeVat(vat: string): string {
  return vat.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeWebsite(url: string): string {
  const u = url.trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Trim and cap a free-text field. */
export function clean(value: unknown, max = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}
