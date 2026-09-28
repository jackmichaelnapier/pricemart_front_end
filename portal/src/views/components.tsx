import type { Child, FC } from 'hono/jsx';
import { COMPANY_STATUS_LABELS, type CompanyStatus, statusLabel } from '../lib/labels';
import type { Errors, Kind } from '../lib/validate';

export const StatusChip: FC<{ kind: Kind; status: string }> = ({ kind, status }) => (
  <span class={`pm-status pm-status-${status}`}>{statusLabel(kind, status)}</span>
);

export const CompanyStatusChip: FC<{ status: string }> = ({ status }) => (
  <span class={`pm-status pm-cstatus-${status}`}>{COMPANY_STATUS_LABELS[status as CompanyStatus] ?? status}</span>
);

export const FieldError: FC<{ errors: Errors; name: string }> = ({ errors, name }) =>
  errors[name] ? (
    <p class="pm-field-error" id={`${name}-error`}>
      {errors[name]}
    </p>
  ) : null;

export const ErrorSummary: FC<{ errors: Errors; title?: string }> = ({ errors, title = 'Please check the form.' }) => {
  const messages = [...new Set(Object.values(errors))];
  if (!messages.length) return null;
  return (
    <div class="pm-error-summary" role="alert" tabindex={-1}>
      <p>
        <strong>{title}</strong>
      </p>
      <ul>
        {messages.map((m) => (
          <li>{m}</li>
        ))}
      </ul>
    </div>
  );
};

export const Flash: FC<{ message?: string | null; tone?: 'ok' | 'warn' }> = ({ message, tone = 'ok' }) =>
  message ? (
    <div class={`pm-flash pm-flash-${tone}`} role="status">
      {message}
    </div>
  ) : null;

export const Card: FC<{ title?: string; children?: Child; class?: string }> = ({ title, children, class: cls }) => (
  <div class={`pm-card ${cls ?? ''}`}>
    {title ? <h2 class="pm-card-title">{title}</h2> : null}
    {children}
  </div>
);

/** A definition list row that is skipped when the value is empty. */
export const Row: FC<{ label: string; value?: Child | null }> = ({ label, value }) =>
  value === null || value === undefined || value === '' ? null : (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );

export const Check: FC<{ tone: 'ok' | 'warn' | 'bad'; children?: Child }> = ({ tone, children }) => (
  <span class={`pm-check pm-check-${tone}`}>
    <span class="pm-check-icon" aria-hidden="true">
      {tone === 'ok' ? '✓' : tone === 'warn' ? '!' : '×'}
    </span>
    <span class="pm-check-text">{children}</span>
  </span>
);
