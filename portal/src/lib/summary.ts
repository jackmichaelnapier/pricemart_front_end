import { truncate } from './text';
import type { Kind, Mode, WantDetails } from './validate';

export interface SummaryInput {
  kind: Kind;
  mode: Mode;
  body: string | null;
  lots: { product: string; quantity: string; unit: string | null }[];
  fileNames: string[];
  want: WantDetails | null;
}

/** One line that says what a submission is about, for lists and emails. */
export function submissionSummary(s: SummaryInput): string {
  if (s.mode === 'details' && s.kind === 'stock' && s.lots.length) {
    const first = s.lots[0];
    const qty = [first.quantity, first.unit?.toLowerCase()].filter(Boolean).join(' ');
    const head = truncate(`${first.product}${qty ? `, ${qty}` : ''}`, 80);
    const more = s.lots.length - 1;
    return more > 0 ? `${head} and ${more} more lot${more === 1 ? '' : 's'}` : head;
  }
  if (s.mode === 'details' && s.kind === 'want' && s.want) {
    const what = s.want.categories.length ? s.want.categories.join(', ') : s.want.brands;
    const where = [...s.want.countries, s.want.other_countries].filter(Boolean).join(', ');
    return truncate(where ? `${what} to ${where}` : what, 90);
  }
  if (s.mode === 'upload' && s.fileNames.length) {
    const label = s.kind === 'stock' ? 'Stock list' : 'List';
    const more = s.fileNames.length - 1;
    return truncate(`${label}: ${s.fileNames[0]}${more > 0 ? ` and ${more} more` : ''}`, 90);
  }
  const text = (s.body ?? '').split('\n').find((l) => l.trim()) ?? '';
  return text ? truncate(text, 90) : '(no description)';
}
