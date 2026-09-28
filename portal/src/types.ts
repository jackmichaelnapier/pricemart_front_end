import type { Lang } from './lib/i18n';
import type { Kind, Mode, Role } from './lib/validate';

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  /** Secret (`npx wrangler secret put RESEND_API_KEY`): a Resend "sending access" key for pricemart.eu. */
  RESEND_API_KEY?: string;
  APP_URL: string;
  SITE_URL: string;
  MAIL_FROM: string;
  MAIL_FROM_NAME: string;
  REPLY_TO: string;
  ADMIN_EMAILS: string;
  ALERT_EMAILS: string;
  /** "true" only in local development: emails go to the outbox table instead of being sent. */
  DEV_MODE?: string;
  /** Anti-spam limits. Defaults: 10 registrations per network per hour, 5 sign-in emails per address per hour. */
  REGISTER_LIMIT_PER_HOUR?: string;
  SIGNIN_LIMIT_PER_HOUR?: string;
}

export interface CompanyRow {
  id: string;
  role: Role;
  name: string;
  name_norm: string;
  vat_number: string | null;
  vat_norm: string | null;
  country: string | null;
  website: string | null;
  business_type: string | null;
  email_domain: string | null;
  status: 'pending' | 'info_requested' | 'approved' | 'rejected';
  source: 'register' | 'invite';
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

export interface UserRow {
  id: string;
  company_id: string | null;
  email: string;
  name: string | null;
  job_title: string | null;
  phone: string | null;
  is_admin: number;
  created_at: string;
  last_login_at: string | null;
  /** Language they registered in: their emails from the portal use it. */
  lang: string;
}

export interface SubmissionRow {
  id: string;
  company_id: string;
  user_id: string | null;
  kind: Kind;
  mode: Mode;
  body: string | null;
  details: string | null;
  status: string;
  admin_summary: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface LotRow {
  id: string;
  submission_id: string;
  position: number;
  product: string;
  quantity: string;
  unit: string | null;
  best_before: string | null;
  brand: string | null;
  ean: string | null;
  category: string | null;
  stock_country: string | null;
  packaging_languages: string | null;
  storage: string | null;
  asking_price: string | null;
  notes: string | null;
}

export interface FileRow {
  id: string;
  submission_id: string;
  r2_key: string;
  filename: string;
  content_type: string | null;
  size: number;
  created_at: string;
}

export interface EventRow {
  id: string;
  company_id: string | null;
  submission_id: string | null;
  actor: string;
  type: string;
  detail: string | null;
  created_at: string;
}

export interface SessionUser {
  user: UserRow;
  company: CompanyRow | null;
  isAdmin: boolean;
  sessionHash: string;
}

/** A submission with everything needed to show or summarise it. */
export interface FullSubmission extends SubmissionRow {
  lots: LotRow[];
  files: FileRow[];
  company_name?: string;
  company_role?: Role;
}

export type AppEnv = { Bindings: Env; Variables: { session: SessionUser | null; lang: Lang } };
