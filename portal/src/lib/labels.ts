import type { Kind, Mode } from './validate';

export const SUBMISSION_STATUSES = ['new', 'reviewing', 'offer_sent', 'done', 'closed'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

const STATUS_LABELS: Record<Kind, Record<SubmissionStatus, string>> = {
  stock: {
    new: 'Received',
    reviewing: 'Under review',
    offer_sent: 'Offer sent',
    done: 'Sold',
    closed: 'Closed',
  },
  want: {
    new: 'Received',
    reviewing: 'Under review',
    offer_sent: 'Offers sent',
    done: 'Supplied',
    closed: 'Closed',
  },
};

export function statusLabel(kind: Kind, status: string): string {
  return STATUS_LABELS[kind][status as SubmissionStatus] ?? status;
}

export function isSubmissionStatus(value: string): value is SubmissionStatus {
  return (SUBMISSION_STATUSES as readonly string[]).includes(value);
}

export const COMPANY_STATUSES = ['pending', 'info_requested', 'approved', 'rejected'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  pending: 'Pending',
  info_requested: 'Waiting for info',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function modeLabel(kind: Kind, mode: Mode): string {
  if (mode === 'describe') return 'Written description';
  if (mode === 'upload') return kind === 'stock' ? 'Stock list' : 'Uploaded list';
  return kind === 'stock' ? 'Lots' : 'Details';
}

export function kindNoun(kind: Kind): string {
  return kind === 'stock' ? 'stock' : 'request';
}
