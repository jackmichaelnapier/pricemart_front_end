import type { FC } from 'hono/jsx';
import { summarize, wantDetails } from '../db';
import { formatBytes } from '../lib/files';
import { modeLabel } from '../lib/labels';
import { daysUntil, formatDate } from '../lib/time';
import type { FullSubmission } from '../types';
import { Row, StatusChip } from './components';

/** Everything the company sent in one submission. Shared by the account and admin pages. */
export const SubmissionContent: FC<{ s: FullSubmission }> = ({ s }) => {
  const want = wantDetails(s);
  return (
    <div class="pm-stack">
      {s.body ? (
        <div class="pm-card">
          <h2 class="pm-card-title">{s.mode === 'describe' ? 'Description' : 'Notes'}</h2>
          <p class="pm-pre">{s.body}</p>
        </div>
      ) : null}

      {s.lots.length ? (
        <div class="pm-card">
          <h2 class="pm-card-title">
            {s.lots.length} lot{s.lots.length === 1 ? '' : 's'}
          </h2>
          <div class="pm-lot-list">
            {s.lots.map((l) => {
              const days = l.best_before ? daysUntil(l.best_before) : null;
              return (
                <div class="pm-lot-item">
                  <p class="pm-lot-title">{l.product}</p>
                  <dl class="pm-dl pm-dl-compact">
                    <Row label="Quantity" value={[l.quantity, l.unit?.toLowerCase()].filter(Boolean).join(' ')} />
                    <Row
                      label="Best before"
                      value={
                        l.best_before
                          ? `${formatDate(l.best_before)}${days !== null ? (days >= 0 ? ` (${days} days left)` : ' (passed)') : ''}`
                          : null
                      }
                    />
                    <Row label="Brand" value={l.brand} />
                    <Row label="EAN" value={l.ean} />
                    <Row label="Category" value={l.category} />
                    <Row label="Stock is in" value={l.stock_country} />
                    <Row label="Packaging" value={l.packaging_languages} />
                    <Row label="Storage" value={l.storage} />
                    <Row label="Asking price" value={l.asking_price ? `€${l.asking_price} per case` : null} />
                    <Row label="Notes" value={l.notes} />
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {want ? (
        <div class="pm-card">
          <h2 class="pm-card-title">What they're looking for</h2>
          <dl class="pm-dl">
            <Row label="Categories" value={want.categories.join(', ')} />
            <Row label="Brands" value={want.brands || 'Any brand'} />
            <Row label="Deliver to" value={[...want.countries, want.other_countries].filter(Boolean).join(', ')} />
            <Row label="Shelf life left" value={want.min_shelf_life} />
            <Row label="Packaging" value={want.packaging_languages} />
            <Row label="Typical order" value={want.order_size} />
            <Row label="How often" value={want.frequency} />
            <Row label="Delivery" value={want.delivery} />
          </dl>
        </div>
      ) : null}

      {s.files.length ? (
        <div class="pm-card">
          <h2 class="pm-card-title">Files</h2>
          <ul class="pm-files">
            {s.files.map((f) => (
              <li>
                <a href={`/files/${f.id}`}>{f.filename}</a> <span class="pm-muted">{formatBytes(f.size)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

/** One line in a list of submissions. */
export const SubmissionListItem: FC<{ s: FullSubmission; href: string; showCompany?: boolean }> = ({ s, href, showCompany }) => (
  <li class="pm-list-item">
    <a href={href} class="pm-list-link">
      <span class="pm-list-main">
        <span class="pm-list-title">{summarize(s)}</span>
        <span class="pm-list-meta">
          {showCompany && s.company_name ? `${s.company_name} · ` : ''}
          {s.kind === 'stock' ? 'Stock' : 'Request'} · {modeLabel(s.kind, s.mode)} · {formatDate(s.created_at)}
        </span>
      </span>
      <StatusChip kind={s.kind} status={s.status} />
    </a>
  </li>
);
