import type { FC } from 'hono/jsx';
import type { CompanyListRow, Duplicate } from '../db';
import { summarize } from '../db';
import { isFreeEmail } from '../lib/email';
import { COMPANY_STATUSES, COMPANY_STATUS_LABELS, SUBMISSION_STATUSES, statusLabel } from '../lib/labels';
import { formatDate, formatDateTime, relativeTime } from '../lib/time';
import type { Errors, Role } from '../lib/validate';
import type { CompanyRow, EventRow, FullSubmission, UserRow } from '../types';
import { Check, CompanyStatusChip, ErrorSummary, Flash, Row, StatusChip } from './components';
import { Layout, type PageCtx } from './layout';
import { SubmissionContent, SubmissionListItem } from './submission';

const VatCheck: FC<{ vat: string | null }> = ({ vat }) =>
  vat ? <Check tone="ok">{vat}</Check> : <Check tone="warn">No VAT given</Check>;

const EmailCheck: FC<{ email: string | null }> = ({ email }) =>
  !email ? null : isFreeEmail(email) ? <Check tone="warn">Free email</Check> : <Check tone="ok">Company domain</Check>;

const DupCheck: FC<{ dups: Duplicate[] }> = ({ dups }) =>
  dups.length ? (
    <Check tone="warn">
      Possible match:{' '}
      {dups.map((d, i) => (
        <>
          {i ? ', ' : ''}
          <a href={`/admin/companies/${d.id}`}>{d.name}</a> ({d.reason})
        </>
      ))}
    </Check>
  ) : (
    <Check tone="ok">No duplicates</Check>
  );

export const AdminApplications: FC<{
  ctx: PageCtx;
  status: string;
  counts: Record<string, number>;
  rows: CompanyListRow[];
  firsts: Map<string, FullSubmission>;
  dups: Map<string, Duplicate[]>;
  flash?: string;
}> = ({ ctx, status, counts, rows, firsts, dups, flash }) => (
  <Layout ctx={ctx} title="Applications" area="admin">
    <div class="pm-page pm-wide">
      <h1>Applications</h1>
      <p class="pm-muted">Everyone who registered, with quick checks. VAT numbers are shown as entered, not verified.</p>
      <Flash message={flash} />
      <nav class="pm-tabs" aria-label="Application status">
        {COMPANY_STATUSES.map((s) => (
          <a href={`/admin/applications?status=${s}`} aria-current={s === status ? 'page' : undefined}>
            {COMPANY_STATUS_LABELS[s]} <span class="pm-tab-count">{counts[s] ?? 0}</span>
          </a>
        ))}
      </nav>
      {rows.length ? (
        <div class="pm-table-wrap">
          <table class="pm-table">
            <thead>
              <tr>
                <th scope="col">Company</th>
                <th scope="col">Registered</th>
                <th scope="col">Checks</th>
                <th scope="col">First stock or request</th>
                <th scope="col">
                  <span class="pm-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const first = firsts.get(c.id);
                return (
                  <tr>
                    <td data-label="Company">
                      <a class="pm-strong" href={`/admin/companies/${c.id}`}>
                        {c.name}
                      </a>
                      <span class="pm-sub">
                        {c.role === 'seller' ? 'Seller' : 'Buyer'}
                        {c.country ? ` · ${c.country}` : ''}
                        {c.source === 'invite' ? ' · invited' : ''}
                      </span>
                      <span class="pm-sub">
                        {c.contact_name} · {c.contact_email}
                      </span>
                    </td>
                    <td data-label="Registered">{relativeTime(c.created_at)}</td>
                    <td data-label="Checks">
                      <div class="pm-checklist">
                        <VatCheck vat={c.vat_number} />
                        <EmailCheck email={c.contact_email} />
                        <DupCheck dups={dups.get(c.id) ?? []} />
                      </div>
                    </td>
                    <td data-label="First stock or request">{first ? summarize(first) : <span class="pm-muted">None</span>}</td>
                    <td data-label="Actions" class="pm-cell-actions">
                      <a href={`/admin/companies/${c.id}`}>Review</a>
                      {status === 'pending' || status === 'info_requested' ? (
                        <form method="post" action={`/admin/companies/${c.id}/decision`} class="pm-inline">
                          <input type="hidden" name="action" value="approve" />
                          <input type="hidden" name="from" value="list" />
                          <button type="submit" class="btn pm-btn-sm">
                            Approve
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div class="pm-card pm-empty">
          <p>Nothing here.</p>
        </div>
      )}
    </div>
  </Layout>
);

const EventList: FC<{ events: EventRow[] }> = ({ events }) =>
  events.length ? (
    <ol class="pm-events">
      {events.map((e) => (
        <li>
          <span class="pm-event-time">{formatDateTime(e.created_at)}</span>
          <span>
            {e.detail ?? e.type} <span class="pm-muted">({e.actor})</span>
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <p class="pm-muted">No activity yet.</p>
  );

export const AdminCompany: FC<{
  ctx: PageCtx;
  company: CompanyRow;
  users: UserRow[];
  subs: FullSubmission[];
  events: EventRow[];
  dups: Duplicate[];
  flash?: string;
  error?: string;
}> = ({ ctx, company: c, users, subs, events, dups, flash, error }) => {
  const primary = users[0];
  const open = c.status === 'pending' || c.status === 'info_requested';
  return (
    <Layout ctx={ctx} title={c.name} area="admin">
      <div class="pm-page">
        <p class="pm-back">
          <a href={`/admin/applications?status=${c.status}`}>← Applications</a>
        </p>
        <div class="pm-head">
          <div>
            <p class="pm-kicker">
              {c.role === 'seller' ? 'Seller' : 'Buyer'} · registered {formatDateTime(c.created_at)}
              {c.source === 'invite' ? ' · invited by PriceMart' : ''}
            </p>
            <h1>{c.name}</h1>
          </div>
          <CompanyStatusChip status={c.status} />
        </div>
        <Flash message={flash} />
        <Flash message={error} tone="warn" />

        <form method="post" action={`/admin/companies/${c.id}/decision`} class="pm-form pm-card pm-decision">
          <h2 class="pm-card-title">Decision</h2>
          {open || c.status === 'rejected' ? (
            <div class="field">
              <label for="message">Message to them</label>
              <textarea id="message" name="message" rows={3} placeholder="Needed for Ask for info. Optional for Reject."></textarea>
            </div>
          ) : null}
          <div class="field">
            <label for="admin_note">Internal note (admins only)</label>
            <textarea id="admin_note" name="admin_note" rows={2}>
              {c.admin_note ?? ''}
            </textarea>
          </div>
          {open ? (
            <label class="pm-check-line">
              <input type="checkbox" name="email_reject" value="1" /> Email them if I reject
            </label>
          ) : null}
          <div class="pm-actions">
            {c.status !== 'approved' ? (
              <button type="submit" name="action" value="approve" class="btn">
                Approve
              </button>
            ) : (
              <button type="submit" name="action" value="resend" class="btn">
                Send a new sign-in link
              </button>
            )}
            {open ? (
              <button type="submit" name="action" value="info" class="btn btn-coral">
                Ask for info
              </button>
            ) : null}
            {c.status !== 'rejected' ? (
              <button type="submit" name="action" value="reject" class="btn btn-ghost">
                {c.status === 'approved' ? 'Close account' : 'Reject'}
              </button>
            ) : null}
            <button type="submit" name="action" value="note" class="pm-linkbtn">
              Save note only
            </button>
          </div>
          <p class="pm-hint">Approving emails them a sign-in link. Nothing is sent to Pipedrive in this phase.</p>
        </form>

        <div class="pm-grid-2">
          <div class="pm-card">
            <h2 class="pm-card-title">Checks</h2>
            <div class="pm-checklist">
              <VatCheck vat={c.vat_number} />
              <EmailCheck email={primary?.email ?? null} />
              <DupCheck dups={dups} />
            </div>
          </div>
          <div class="pm-card">
            <h2 class="pm-card-title">Company</h2>
            <dl class="pm-dl">
              <Row label="Name" value={c.name} />
              <Row label="VAT number" value={c.vat_number} />
              <Row label="Country" value={c.country} />
              <Row label="Website" value={c.website ? <a href={c.website} rel="noopener noreferrer" target="_blank">{c.website}</a> : null} />
              <Row label="Business type" value={c.business_type} />
            </dl>
          </div>
        </div>

        <div class="pm-card pm-mt">
          <h2 class="pm-card-title">People</h2>
          <dl class="pm-dl">
            {users.map((u) => (
              <>
                <dt>{u.name ?? 'Unnamed'}</dt>
                <dd>
                  <a href={`mailto:${u.email}`}>{u.email}</a>
                  {u.job_title ? ` · ${u.job_title}` : ''}
                  {u.phone ? ` · ${u.phone}` : ''}
                  {u.last_login_at ? <span class="pm-muted"> · last signed in {formatDate(u.last_login_at)}</span> : null}
                </dd>
              </>
            ))}
          </dl>
        </div>

        <h2 class="pm-mt">{c.role === 'seller' ? 'Stock' : 'Requests'}</h2>
        {subs.length ? (
          <ul class="pm-list">
            {subs.map((s) => (
              <SubmissionListItem s={s} href={`/admin/items/${s.id}`} />
            ))}
          </ul>
        ) : (
          <p class="pm-muted">Nothing yet.</p>
        )}

        <h2 class="pm-mt">Activity</h2>
        <EventList events={events} />
      </div>
    </Layout>
  );
};

export const AdminItems: FC<{ ctx: PageCtx; kind: string; status: string; subs: FullSubmission[] }> = ({ ctx, kind, status, subs }) => (
  <Layout ctx={ctx} title="Stock and requests" area="admin">
    <div class="pm-page">
      <h1>Stock and requests</h1>
      <form method="get" action="/admin/items" class="pm-filters">
        <div class="field">
          <label for="kind">Show</label>
          <select id="kind" name="kind">
            <option value="" selected={!kind}>Everything</option>
            <option value="stock" selected={kind === 'stock'}>Stock from sellers</option>
            <option value="want" selected={kind === 'want'}>Requests from buyers</option>
          </select>
        </div>
        <div class="field">
          <label for="status">Status</label>
          <select id="status" name="status">
            <option value="" selected={!status}>Any</option>
            {SUBMISSION_STATUSES.map((s) => (
              <option value={s} selected={status === s}>
                {statusLabel(kind === 'want' ? 'want' : 'stock', s)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" class="btn btn-ghost pm-btn-sm">
          Filter
        </button>
      </form>
      {subs.length ? (
        <ul class="pm-list">
          {subs.map((s) => (
            <SubmissionListItem s={s} href={`/admin/items/${s.id}`} showCompany />
          ))}
        </ul>
      ) : (
        <div class="pm-card pm-empty">
          <p>Nothing matches.</p>
        </div>
      )}
    </div>
  </Layout>
);

export const AdminItem: FC<{ ctx: PageCtx; s: FullSubmission; company: CompanyRow; events: EventRow[]; flash?: string }> = ({
  ctx, s, company, events, flash,
}) => (
  <Layout ctx={ctx} title={summarize(s)} area="admin">
    <div class="pm-page">
      <p class="pm-back">
        <a href="/admin/items">← Stock and requests</a>
      </p>
      <div class="pm-head">
        <div>
          <p class="pm-kicker">
            <a href={`/admin/companies/${company.id}`}>{company.name}</a> · {s.kind === 'stock' ? 'Stock' : 'Request'} · sent{' '}
            {formatDateTime(s.created_at)}
            {company.status !== 'approved' ? ` · company ${COMPANY_STATUS_LABELS[company.status].toLowerCase()}` : ''}
          </p>
          <h1 class="pm-h1-small">{summarize(s)}</h1>
        </div>
        <StatusChip kind={s.kind} status={s.status} />
      </div>
      <Flash message={flash} />
      <div class="pm-split">
        <SubmissionContent s={s} />
        <form method="post" action={`/admin/items/${s.id}`} class="pm-form pm-card">
          <h2 class="pm-card-title">Team</h2>
          <div class="field">
            <label for="status">Status</label>
            <select id="status" name="status">
              {SUBMISSION_STATUSES.map((st) => (
                <option value={st} selected={s.status === st}>
                  {statusLabel(s.kind, st)}
                </option>
              ))}
            </select>
          </div>
          <label class="pm-check-line">
            <input type="checkbox" name="notify" value="1" /> Email them about a status change
          </label>
          <div class="field">
            <label for="admin_summary">Key facts (admins only)</label>
            <input
              id="admin_summary"
              name="admin_summary"
              type="text"
              value={s.admin_summary ?? ''}
              placeholder="e.g. Confectionery, 12 pallets, BBD 14 Nov, DE packaging"
            />
          </div>
          <div class="field">
            <label for="admin_note">Internal note</label>
            <textarea id="admin_note" name="admin_note" rows={4}>
              {s.admin_note ?? ''}
            </textarea>
          </div>
          <button type="submit" class="btn">
            Save
          </button>
          <h3 class="pm-mt">Activity</h3>
          <EventList events={events} />
        </form>
      </div>
    </div>
  </Layout>
);

export const AdminInvite: FC<{
  ctx: PageCtx;
  values: { role: Role; company: string; name: string; email: string };
  errors: Errors;
}> = ({ ctx, values: v, errors }) => (
  <Layout ctx={ctx} title="Invite" area="admin">
    <div class="pm-page pm-narrow">
      <h1>Invite a company</h1>
      <p class="lead">
        For a good lead who emailed. This opens an approved account and emails them a sign-in link, so they can use the
        portal from now on.
      </p>
      <ErrorSummary errors={errors} />
      <form method="post" action="/admin/invite" class="pm-form" novalidate>
        <fieldset class="pm-fieldset">
          <legend>They are a</legend>
          <div class="pm-checks">
            <label class="pm-check-chip">
              <input type="radio" name="role" value="seller" checked={v.role === 'seller'} />
              <span>Seller</span>
            </label>
            <label class="pm-check-chip">
              <input type="radio" name="role" value="buyer" checked={v.role === 'buyer'} />
              <span>Buyer</span>
            </label>
          </div>
        </fieldset>
        <div class="field-row">
          <div class="field">
            <label for="company">Company name</label>
            <input id="company" name="company" type="text" value={v.company} required />
            {errors.company ? <p class="pm-field-error">{errors.company}</p> : null}
          </div>
          <div class="field">
            <label for="name">Contact name</label>
            <input id="name" name="name" type="text" value={v.name} required />
            {errors.name ? <p class="pm-field-error">{errors.name}</p> : null}
          </div>
        </div>
        <div class="field">
          <label for="email">Contact email</label>
          <input id="email" name="email" type="email" value={v.email} required />
          {errors.email ? <p class="pm-field-error">{errors.email}</p> : null}
        </div>
        <div class="pm-actions">
          <button type="submit" class="btn btn-coral">
            Create account and send invite
          </button>
        </div>
      </form>
    </div>
  </Layout>
);
