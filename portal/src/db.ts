import { emailDomain } from './lib/email';
import { submissionSummary } from './lib/summary';
import { normalizeCompanyName, normalizeVat } from './lib/text';
import {
  type ContactInput, type ItemInput, type Kind, type Role, type WantDetails, isLotStarted,
} from './lib/validate';
import type {
  CompanyRow, EventRow, FileRow, FullSubmission, LotRow, SessionUser, SubmissionRow, UserRow,
} from './types';

const uuid = () => crypto.randomUUID();

// ---------- companies and users ----------

export async function createCompanyWithUser(
  db: D1Database,
  args: { role: Role; contact: ContactInput; now: string; status: CompanyRow['status']; source: CompanyRow['source'] },
): Promise<{ companyId: string; userId: string }> {
  const { role, contact: c, now } = args;
  const companyId = uuid();
  const userId = uuid();
  const vatNorm = c.vat_number ? normalizeVat(c.vat_number) : null;
  await db.batch([
    db
      .prepare(
        `INSERT INTO companies (id, role, name, name_norm, vat_number, vat_norm, country, website,
           business_type, email_domain, status, source, created_at, updated_at, decided_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        companyId, role, c.company, normalizeCompanyName(c.company), c.vat_number || null, vatNorm || null,
        c.country || null, c.website || null, c.business_type || null, emailDomain(c.email), args.status,
        args.source, now, now, args.status === 'approved' ? now : null,
      ),
    db
      .prepare(
        `INSERT INTO users (id, company_id, email, name, job_title, phone, is_admin, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .bind(userId, companyId, c.email, c.name, c.job_title || null, c.phone || null, now),
  ]);
  return { companyId, userId };
}

export function getUserByEmail(db: D1Database, email: string) {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

export function getCompany(db: D1Database, id: string) {
  return db.prepare('SELECT * FROM companies WHERE id = ?').bind(id).first<CompanyRow>();
}

export async function listCompanyUsers(db: D1Database, companyId: string): Promise<UserRow[]> {
  const r = await db
    .prepare('SELECT * FROM users WHERE company_id = ? ORDER BY created_at')
    .bind(companyId)
    .all<UserRow>();
  return r.results;
}

export async function getOrCreateAdminUser(db: D1Database, email: string, now: string): Promise<UserRow> {
  const existing = await getUserByEmail(db, email);
  if (existing) {
    if (!existing.is_admin) {
      await db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(existing.id).run();
      existing.is_admin = 1;
    }
    return existing;
  }
  const id = uuid();
  await db
    .prepare('INSERT INTO users (id, company_id, email, is_admin, created_at) VALUES (?, NULL, ?, 1, ?)')
    .bind(id, email, now)
    .run();
  return (await getUserByEmail(db, email))!;
}

export async function updateCompanyProfile(
  db: D1Database,
  companyId: string,
  userId: string,
  p: Omit<ContactInput, 'email'>,
  now: string,
) {
  const vatNorm = p.vat_number ? normalizeVat(p.vat_number) : null;
  await db.batch([
    db
      .prepare(
        `UPDATE companies SET name = ?, name_norm = ?, vat_number = ?, vat_norm = ?, country = ?, website = ?,
           business_type = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(
        p.company, normalizeCompanyName(p.company), p.vat_number || null, vatNorm, p.country || null,
        p.website || null, p.business_type || null, now, companyId,
      ),
    db
      .prepare('UPDATE users SET name = ?, job_title = ?, phone = ? WHERE id = ?')
      .bind(p.name, p.job_title || null, p.phone || null, userId),
  ]);
}

export async function setCompanyStatus(
  db: D1Database,
  companyId: string,
  status: CompanyRow['status'],
  now: string,
  adminNote?: string,
) {
  if (adminNote !== undefined) {
    await db
      .prepare('UPDATE companies SET status = ?, decided_at = ?, updated_at = ?, admin_note = ? WHERE id = ?')
      .bind(status, now, now, adminNote || null, companyId)
      .run();
  } else {
    await db
      .prepare('UPDATE companies SET status = ?, decided_at = ?, updated_at = ? WHERE id = ?')
      .bind(status, now, now, companyId)
      .run();
  }
}

export async function setCompanyNote(db: D1Database, companyId: string, note: string, now: string) {
  await db
    .prepare('UPDATE companies SET admin_note = ?, updated_at = ? WHERE id = ?')
    .bind(note || null, now, companyId)
    .run();
}

export async function countCompaniesByStatus(db: D1Database): Promise<Record<string, number>> {
  const r = await db
    .prepare('SELECT status, COUNT(*) AS n FROM companies GROUP BY status')
    .all<{ status: string; n: number }>();
  return Object.fromEntries(r.results.map((x) => [x.status, x.n]));
}

export interface CompanyListRow extends CompanyRow {
  contact_email: string | null;
  contact_name: string | null;
}

export async function listCompanies(db: D1Database, status: string, limit = 200): Promise<CompanyListRow[]> {
  const r = await db
    .prepare(
      `SELECT c.*,
         (SELECT email FROM users u WHERE u.company_id = c.id ORDER BY u.created_at LIMIT 1) AS contact_email,
         (SELECT name FROM users u WHERE u.company_id = c.id ORDER BY u.created_at LIMIT 1) AS contact_name
       FROM companies c WHERE c.status = ?
       ORDER BY c.created_at DESC
       LIMIT ?`,
    )
    .bind(status, limit)
    .all<CompanyListRow>();
  return r.results;
}

export interface Duplicate {
  id: string;
  name: string;
  status: string;
  reason: string;
}

/**
 * Other companies that share a VAT number, email domain or name with each of `ids`, in one query.
 * Email domains are only compared for companies in `companyDomainIds` (not Gmail and the like).
 */
export async function duplicatesFor(
  db: D1Database,
  ids: string[],
  companyDomainIds: string[],
): Promise<Map<string, Duplicate[]>> {
  const out = new Map<string, Duplicate[]>();
  if (!ids.length) return out;
  const r = await db
    .prepare(
      `SELECT c.id AS company_id, d.id, d.name, d.status,
         CASE
           WHEN c.vat_norm IS NOT NULL AND d.vat_norm = c.vat_norm THEN 'same VAT number'
           WHEN c.name_norm != '' AND d.name_norm = c.name_norm THEN 'same company name'
           ELSE 'same email domain'
         END AS reason
       FROM companies c JOIN companies d ON d.id != c.id AND (
         (c.vat_norm IS NOT NULL AND d.vat_norm = c.vat_norm) OR
         (c.name_norm != '' AND d.name_norm = c.name_norm) OR
         (c.id IN (SELECT value FROM json_each(?)) AND d.email_domain = c.email_domain)
       )
       WHERE c.id IN (SELECT value FROM json_each(?))
       ORDER BY d.created_at`,
    )
    .bind(JSON.stringify(companyDomainIds), JSON.stringify(ids))
    .all<{ company_id: string } & Duplicate>();
  for (const row of r.results) {
    const list = out.get(row.company_id) ?? [];
    if (list.length < 5) list.push({ id: row.id, name: row.name, status: row.status, reason: row.reason });
    out.set(row.company_id, list);
  }
  return out;
}

// ---------- submissions ----------

export async function createSubmission(
  db: D1Database,
  args: { companyId: string; userId: string | null; kind: Kind; item: ItemInput; now: string },
): Promise<string> {
  const { item, now } = args;
  const id = uuid();
  const details = args.kind === 'want' && item.mode === 'details' ? JSON.stringify(item.want) : null;
  const stmts: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO submissions (id, company_id, user_id, kind, mode, body, details, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
      )
      .bind(id, args.companyId, args.userId, args.kind, item.mode, item.body || null, details, now, now),
  ];
  if (args.kind === 'stock' && item.mode === 'details') {
    item.lots.filter(isLotStarted).forEach((l, i) => {
      stmts.push(
        db
          .prepare(
            `INSERT INTO lots (id, submission_id, position, product, quantity, unit, best_before, brand, ean,
               category, stock_country, packaging_languages, storage, asking_price, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            uuid(), id, i, l.product, l.quantity, l.unit || null, l.best_before || null, l.brand || null,
            l.ean || null, l.category || null, l.stock_country || null, l.packaging_languages || null,
            l.storage || null, l.asking_price || null, l.notes || null,
          ),
      );
    });
  }
  await db.batch(stmts);
  return id;
}

export async function insertFile(
  db: D1Database,
  f: { id: string; submissionId: string; r2Key: string; filename: string; contentType: string; size: number; now: string },
) {
  await db
    .prepare(
      `INSERT INTO files (id, submission_id, r2_key, filename, content_type, size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(f.id, f.submissionId, f.r2Key, f.filename, f.contentType, f.size, f.now)
    .run();
}

async function attachChildren(db: D1Database, subs: FullSubmission[]): Promise<FullSubmission[]> {
  if (!subs.length) return subs;
  const ids = JSON.stringify(subs.map((s) => s.id));
  const [lots, files] = await db.batch([
    db
      .prepare('SELECT * FROM lots WHERE submission_id IN (SELECT value FROM json_each(?)) ORDER BY position')
      .bind(ids),
    db
      .prepare('SELECT * FROM files WHERE submission_id IN (SELECT value FROM json_each(?)) ORDER BY created_at')
      .bind(ids),
  ]);
  const byId = new Map(subs.map((s) => [s.id, s]));
  for (const l of lots.results as unknown as LotRow[]) byId.get(l.submission_id)?.lots.push(l);
  for (const f of files.results as unknown as FileRow[]) byId.get(f.submission_id)?.files.push(f);
  return subs;
}

export async function listSubmissionsForCompany(db: D1Database, companyId: string): Promise<FullSubmission[]> {
  const r = await db
    .prepare('SELECT * FROM submissions WHERE company_id = ? ORDER BY created_at DESC')
    .bind(companyId)
    .all<SubmissionRow>();
  return attachChildren(db, r.results.map((s) => ({ ...s, lots: [], files: [] })));
}

export async function listSubmissions(
  db: D1Database,
  f: { kind?: string; status?: string },
  limit = 200,
): Promise<FullSubmission[]> {
  const where: string[] = ["c.status != 'rejected'"];
  const binds: unknown[] = [];
  if (f.kind) {
    where.push('s.kind = ?');
    binds.push(f.kind);
  }
  if (f.status) {
    where.push('s.status = ?');
    binds.push(f.status);
  }
  const r = await db
    .prepare(
      `SELECT s.*, c.name AS company_name, c.role AS company_role FROM submissions s
       JOIN companies c ON c.id = s.company_id
       WHERE ${where.join(' AND ')} ORDER BY s.created_at DESC LIMIT ?`,
    )
    .bind(...binds, limit)
    .all<SubmissionRow & { company_name: string; company_role: Role }>();
  return attachChildren(db, r.results.map((s) => ({ ...s, lots: [], files: [] })));
}

export async function countNewSubmissions(db: D1Database): Promise<number> {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM submissions s JOIN companies c ON c.id = s.company_id
       WHERE s.status = 'new' AND c.status != 'rejected'`,
    )
    .first<{ n: number }>();
  return r?.n ?? 0;
}

export async function getSubmission(db: D1Database, id: string): Promise<FullSubmission | null> {
  const s = await db
    .prepare(
      `SELECT s.*, c.name AS company_name, c.role AS company_role FROM submissions s
       JOIN companies c ON c.id = s.company_id WHERE s.id = ?`,
    )
    .bind(id)
    .first<SubmissionRow & { company_name: string; company_role: Role }>();
  if (!s) return null;
  const [full] = await attachChildren(db, [{ ...s, lots: [], files: [] }]);
  return full;
}

export async function updateSubmissionAdmin(
  db: D1Database,
  id: string,
  u: { status: string; admin_summary: string; admin_note: string },
  now: string,
) {
  await db
    .prepare('UPDATE submissions SET status = ?, admin_summary = ?, admin_note = ?, updated_at = ? WHERE id = ?')
    .bind(u.status, u.admin_summary || null, u.admin_note || null, now, id)
    .run();
}

export function getFile(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT f.*, s.company_id AS company_id FROM files f JOIN submissions s ON s.id = f.submission_id
       WHERE f.id = ?`,
    )
    .bind(id)
    .first<FileRow & { company_id: string }>();
}

export function wantDetails(s: SubmissionRow): WantDetails | null {
  if (!s.details) return null;
  try {
    return JSON.parse(s.details) as WantDetails;
  } catch {
    return null;
  }
}

export function summarize(s: FullSubmission): string {
  return submissionSummary({
    kind: s.kind,
    mode: s.mode,
    body: s.body,
    lots: s.lots,
    fileNames: s.files.map((f) => f.filename),
    want: wantDetails(s),
  });
}

/** First submission for each company, for the applications queue. */
export async function firstSubmissions(db: D1Database, companyIds: string[]): Promise<Map<string, FullSubmission>> {
  const out = new Map<string, FullSubmission>();
  if (!companyIds.length) return out;
  const r = await db
    .prepare(
      `SELECT s.* FROM submissions s
       WHERE s.company_id IN (SELECT value FROM json_each(?))
         AND s.created_at = (SELECT MIN(created_at) FROM submissions s2 WHERE s2.company_id = s.company_id)`,
    )
    .bind(JSON.stringify(companyIds))
    .all<SubmissionRow>();
  const subs = await attachChildren(db, r.results.map((s) => ({ ...s, lots: [], files: [] })));
  for (const s of subs) if (!out.has(s.company_id)) out.set(s.company_id, s);
  return out;
}

// ---------- events ----------

export async function logEvent(
  db: D1Database,
  e: { companyId?: string | null; submissionId?: string | null; actor: string; type: string; detail?: string; now: string },
) {
  await db
    .prepare(
      'INSERT INTO events (id, company_id, submission_id, actor, type, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(uuid(), e.companyId ?? null, e.submissionId ?? null, e.actor, e.type, e.detail ?? null, e.now)
    .run();
}

export async function listEvents(db: D1Database, f: { companyId?: string; submissionId?: string }): Promise<EventRow[]> {
  const r = f.submissionId
    ? await db
        .prepare('SELECT * FROM events WHERE submission_id = ? ORDER BY created_at DESC LIMIT 50')
        .bind(f.submissionId)
        .all<EventRow>()
    : await db
        .prepare('SELECT * FROM events WHERE company_id = ? ORDER BY created_at DESC LIMIT 50')
        .bind(f.companyId ?? '')
        .all<EventRow>();
  return r.results;
}

// ---------- sign-in tokens and sessions ----------

export async function createLoginToken(
  db: D1Database,
  t: { hash: string; email: string; purpose: string; expiresAt: string; now: string },
) {
  await db
    .prepare('INSERT INTO login_tokens (token_hash, email, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(t.hash, t.email, t.purpose, t.expiresAt, t.now)
    .run();
}

/** Marks the token used and returns it, or null if it is unknown, used or expired. */
export async function consumeLoginToken(db: D1Database, hash: string, now: string) {
  return db
    .prepare(
      `UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?
       RETURNING email, purpose`,
    )
    .bind(now, hash, now)
    .first<{ email: string; purpose: string }>();
}

export async function isLoginTokenUsable(db: D1Database, hash: string, now: string): Promise<boolean> {
  const r = await db
    .prepare('SELECT 1 AS ok FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?')
    .bind(hash, now)
    .first<{ ok: number }>();
  return Boolean(r);
}

export async function createSession(db: D1Database, s: { hash: string; userId: string; expiresAt: string; now: string }) {
  await db.batch([
    db
      .prepare('INSERT INTO sessions (id_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(s.hash, s.userId, s.expiresAt, s.now),
    db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(s.now, s.userId),
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(s.now),
  ]);
}

export async function loadSession(db: D1Database, hash: string, now: string): Promise<Omit<SessionUser, 'isAdmin'> | null> {
  const user = await db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = ? AND s.expires_at > ?`,
    )
    .bind(hash, now)
    .first<UserRow>();
  if (!user) return null;
  const company = user.company_id ? await getCompany(db, user.company_id) : null;
  return { user, company, sessionHash: hash };
}

export async function deleteSession(db: D1Database, hash: string) {
  await db.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(hash).run();
}

// ---------- rate limiting and email log ----------

export async function hitRateLimit(db: D1Database, key: string, max: number, windowMinutes: number, now: string) {
  const since = new Date(Date.parse(now) - windowMinutes * 60_000).toISOString();
  const r = await db
    .prepare('SELECT COUNT(*) AS n FROM rate_events WHERE key = ? AND created_at > ?')
    .bind(key, since)
    .first<{ n: number }>();
  if ((r?.n ?? 0) >= max) return true;
  const dayAgo = new Date(Date.parse(now) - 86_400_000).toISOString();
  await db.batch([
    db.prepare('INSERT INTO rate_events (key, created_at) VALUES (?, ?)').bind(key, now),
    db.prepare('DELETE FROM rate_events WHERE created_at < ?').bind(dayAgo),
  ]);
  return false;
}

export async function logEmail(
  db: D1Database,
  e: { to: string; template: string; subject: string; status: string; error?: string; bodyText?: string; now: string },
) {
  await db
    .prepare(
      `INSERT INTO email_log (id, to_email, template, subject, status, error, body_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(uuid(), e.to, e.template, e.subject, e.status, e.error ?? null, e.bodyText ?? null, e.now)
    .run();
}

export async function devOutbox(db: D1Database, to: string) {
  const r = await db
    .prepare(
      `SELECT to_email, template, subject, body_text, created_at FROM email_log
       WHERE to_email = ? ORDER BY created_at DESC, rowid DESC LIMIT 20`,
    )
    .bind(to)
    .all();
  return r.results;
}
