import type { FC } from 'hono/jsx';
import { summarize } from '../db';
import { modeLabel } from '../lib/labels';
import { formatDate } from '../lib/time';
import type { ContactInput, Errors, ItemInput, Role } from '../lib/validate';
import type { CompanyRow, FullSubmission, UserRow } from '../types';
import { ErrorSummary, Flash, StatusChip } from './components';
import { ItemFields, OptionalCompanyFields } from './forms';
import { Layout, type PageCtx } from './layout';
import { SubmissionContent, SubmissionListItem } from './submission';

export const AccountHome: FC<{ ctx: PageCtx; company: CompanyRow; subs: FullSubmission[]; flash?: string }> = ({
  ctx, company, subs, flash,
}) => {
  const seller = company.role === 'seller';
  const incomplete = !company.vat_number || !company.country;
  return (
    <Layout ctx={ctx} title={seller ? 'Your stock' : 'Your requests'} area="account">
      <div class="pm-page">
        <div class="pm-head">
          <div>
            <p class="pm-kicker">{company.name}</p>
            <h1>{seller ? 'Your stock' : 'Your requests'}</h1>
          </div>
          <a class="btn btn-coral" href="/account/add">
            {seller ? '+ Add stock' : '+ Add a request'}
          </a>
        </div>
        <Flash message={flash} />
        {subs.length ? (
          <ul class="pm-list">
            {subs.map((s) => (
              <SubmissionListItem s={s} href={`/account/items/${s.id}`} />
            ))}
          </ul>
        ) : (
          <div class="pm-card pm-empty">
            <p>{seller ? "You haven't sent us any stock yet." : "You haven't sent us any requests yet."}</p>
            <a class="btn btn-coral" href="/account/add">
              {seller ? 'Add stock' : 'Add a request'}
            </a>
          </div>
        )}
        <div class="pm-grid-2 pm-mt">
          {incomplete ? (
            <div class="pm-card">
              <h2 class="pm-card-title">Complete your company details</h2>
              <p class="pm-muted">A VAT number and country help us work with you faster. It takes a minute.</p>
              <a href="/account/profile">Add company details</a>
            </div>
          ) : null}
          <div class="pm-card">
            <h2 class="pm-card-title">Questions?</h2>
            <p class="pm-muted">
              Email <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>. We send offers by email and track them
              here.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export const AccountAdd: FC<{ ctx: PageCtx; role: Role; item: ItemInput; errors: Errors; fileNote?: boolean }> = ({
  ctx, role, item, errors, fileNote,
}) => {
  const seller = role === 'seller';
  return (
    <Layout ctx={ctx} title={seller ? 'Add stock' : 'Add a request'} area="account">
      <div class="pm-page pm-narrow">
        <p class="pm-back">
          <a href="/account">← {seller ? 'Your stock' : 'Your requests'}</a>
        </p>
        <h1>{seller ? 'What do you have?' : 'What are you looking for?'}</h1>
        <ErrorSummary errors={errors} />
        {fileNote ? <Flash tone="warn" message="Files have to be chosen again after an error. Please re-attach them." /> : null}
        <form method="post" action="/account/add" enctype="multipart/form-data" novalidate class="pm-form" data-single data-role={role}>
          <ItemFields role={role} item={item} errors={errors} />
          <div class="pm-actions">
            <button type="submit" class="btn btn-coral" data-submit>
              Send
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export const AccountItem: FC<{ ctx: PageCtx; s: FullSubmission }> = ({ ctx, s }) => (
  <Layout ctx={ctx} title={summarize(s)} area="account">
    <div class="pm-page pm-narrow">
      <p class="pm-back">
        <a href="/account">← {s.kind === 'stock' ? 'Your stock' : 'Your requests'}</a>
      </p>
      <div class="pm-head">
        <div>
          <p class="pm-kicker">
            {modeLabel(s.kind, s.mode)} · sent {formatDate(s.created_at)}
          </p>
          <h1 class="pm-h1-small">{summarize(s)}</h1>
        </div>
        <StatusChip kind={s.kind} status={s.status} />
      </div>
      <SubmissionContent s={s} />
      <p class="pm-muted pm-mt">
        Something changed? Email <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a> and we'll update it.
      </p>
    </div>
  </Layout>
);

export const ProfilePage: FC<{
  ctx: PageCtx;
  company: CompanyRow;
  user: UserRow;
  values: Omit<ContactInput, 'email'>;
  errors: Errors;
  flash?: string;
}> = ({ ctx, user, values, errors, flash }) => (
  <Layout ctx={ctx} title="Company details" area="account">
    <div class="pm-page pm-narrow">
      <h1>Company details</h1>
      <Flash message={flash} />
      <ErrorSummary errors={errors} />
      <form method="post" action="/account/profile" class="pm-form" novalidate>
        <div class="field-row">
          <div class="field">
            <label for="company">Company name</label>
            <input id="company" name="company" type="text" value={values.company} required />
            {errors.company ? <p class="pm-field-error">{errors.company}</p> : null}
          </div>
          <div class="field">
            <label for="name">Your name</label>
            <input id="name" name="name" type="text" value={values.name} required />
            {errors.name ? <p class="pm-field-error">{errors.name}</p> : null}
          </div>
        </div>
        <div class="field">
          <span class="pm-label">Email</span>
          <p class="pm-static">{user.email}</p>
          <p class="pm-hint">To change it, email contact@pricemart.eu.</p>
        </div>
        <OptionalCompanyFields values={values} />
        <div class="pm-actions">
          <button type="submit" class="btn btn-coral">
            Save
          </button>
        </div>
      </form>
      <p class="pm-muted pm-mt">
        To close your account and delete your data, email <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>.
      </p>
    </div>
  </Layout>
);
