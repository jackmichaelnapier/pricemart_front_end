import { logEmail } from './db';
import { type Lang, messagesFor } from './lib/i18n';
import { describeResendError, isRetryable, resendRequest } from './lib/resend';
import { escapeHtml } from './lib/text';
import { nowIso } from './lib/time';
import type { Env } from './types';

export interface Mail {
  to: string;
  subject: string;
  template: string;
  text: string;
  html: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Send one email through Resend. In DEV_MODE nothing leaves the machine: the message goes to
 * email_log (with its body) so tests can read sign-in links. Failures are logged, never thrown.
 */
export async function sendMail(env: Env, mail: Mail): Promise<boolean> {
  const log = (status: string, extra: { error?: string; bodyText?: string } = {}) =>
    logEmail(env.DB, { to: mail.to, template: mail.template, subject: mail.subject, status, now: nowIso(), ...extra });

  if (env.DEV_MODE === 'true') {
    await log('dev', { bodyText: mail.text });
    return true;
  }
  if (!env.RESEND_API_KEY) {
    console.error('sendMail: RESEND_API_KEY is not set');
    await log('failed', { error: 'RESEND_API_KEY is not set' });
    return false;
  }
  const sender = { from: env.MAIL_FROM, fromName: env.MAIL_FROM_NAME, replyTo: env.REPLY_TO };
  const idempotencyKey = crypto.randomUUID();
  let error = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { url, init } = resendRequest(env.RESEND_API_KEY, sender, mail, idempotencyKey);
      const res = await fetch(url, init);
      if (res.ok) {
        await log('sent');
        return true;
      }
      error = describeResendError(res.status, await res.text());
      if (!isRetryable(res.status)) break;
    } catch (err) {
      error = `network: ${err instanceof Error ? err.message : String(err)}`.slice(0, 500);
    }
    if (attempt === 0) await sleep(1100);
  }
  console.error('sendMail failed', mail.template, error);
  await log('failed', { error });
  return false;
}

export async function sendToMany(env: Env, recipients: string[], build: (to: string) => Mail) {
  for (const to of recipients) await sendMail(env, build(to));
}

// ---------- templates ----------

type Block = { p: string } | { button: { href: string; label: string } } | { quote: string } | { small: string };

/** Plain, readable email. Every string passed in is escaped here. */
function render(heading: string, blocks: Block[], lang: Lang = 'en'): { html: string; text: string } {
  const htmlParts: string[] = [];
  const textParts: string[] = [heading, ''];
  for (const b of blocks) {
    if ('p' in b) {
      htmlParts.push(`<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#1A1410">${escapeHtml(b.p)}</p>`);
      textParts.push(b.p, '');
    } else if ('button' in b) {
      htmlParts.push(
        `<p style="margin:24px 0"><a href="${escapeHtml(b.button.href)}" style="display:inline-block;background:#F4A989;color:#2D1B4F;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:10px">${escapeHtml(b.button.label)}</a></p>`,
      );
      textParts.push(`${b.button.label}: ${b.button.href}`, '');
    } else if ('quote' in b) {
      htmlParts.push(
        `<div style="margin:0 0 16px;padding:14px 16px;background:#F4EDDC;border-radius:10px;font-size:15px;line-height:1.55;color:#1A1410;white-space:pre-wrap">${escapeHtml(b.quote)}</div>`,
      );
      textParts.push(b.quote, '');
    } else {
      htmlParts.push(`<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6B6258">${escapeHtml(b.small)}</p>`);
      textParts.push(b.small, '');
    }
  }
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#FBF7EE;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#2D1B4F">PriceMart</p>
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#2D1B4F">${escapeHtml(heading)}</h1>
${htmlParts.join('\n')}
<p style="margin:32px 0 0;font-size:12px;color:#6B6258">PriceMart SL · Barcelona · contact@pricemart.eu</p>
</div></body></html>`;
  return { html, text: `${textParts.join('\n').trim()}\n\nPriceMart SL, Barcelona. contact@pricemart.eu\n` };
}

function mail(to: string, template: string, subject: string, heading: string, blocks: Block[], lang: Lang = 'en'): Mail {
  return { to, template, subject, ...render(heading, blocks, lang) };
}

const roleWord = (role: string) => (role === 'seller' ? 'seller' : 'buyer');

export const templates = {
  // Emails to customers are in the language they registered in; emails to the team stay in English.

  registrationReceived(to: string, a: { name: string; role: string; company: string; summary: string }, lang: Lang = 'en') {
    const t = messagesFor(lang).email.registrationReceived;
    const seller = a.role === 'seller';
    return mail(to, 'registration_received', t.subject, t.heading(a.name), [
      { p: `${t.intro(a.company, seller)} ${seller ? t.whatSeller : t.whatBuyer}` },
      { quote: a.summary },
      { p: t.check },
      { small: t.questions },
    ], lang);
  },

  teamNewRegistration(
    to: string,
    a: { company: string; role: string; name: string; email: string; summary: string; notes: string[]; url: string },
  ) {
    return mail(to, 'team_new_registration', `New ${roleWord(a.role)}: ${a.company}`, `New ${roleWord(a.role)} registration`, [
      { p: `${a.company}, ${a.name} (${a.email})` },
      { quote: a.summary },
      ...(a.notes.length ? [{ p: `Notes: ${a.notes.join('; ')}.` }] : []),
      { button: { href: a.url, label: 'Review in admin' } },
    ]);
  },

  teamNewSubmission(to: string, a: { company: string; kind: string; summary: string; url: string; signedOut: boolean }) {
    const what = a.kind === 'stock' ? 'New stock' : 'New request';
    return mail(to, 'team_new_submission', `${what} from ${a.company}`, `${what} from ${a.company}`, [
      { quote: a.summary },
      ...(a.signedOut ? [{ p: 'Sent through the registration form by an existing account (not signed in).' }] : []),
      { button: { href: a.url, label: 'Open in admin' } },
    ]);
  },

  signInLink(to: string, a: { url: string; minutes: number }, lang: Lang = 'en') {
    const t = messagesFor(lang).email.signInLink;
    return mail(to, 'signin_link', t.subject, t.heading, [
      { p: t.body(a.minutes) },
      { button: { href: a.url, label: t.button } },
      { small: t.ignore },
    ], lang);
  },

  signInNotActive(to: string, lang: Lang = 'en') {
    const t = messagesFor(lang).email.signInNotActive;
    return mail(to, 'signin_not_active', t.subject, t.heading, [{ p: t.body }, { small: t.questions }], lang);
  },

  approved(to: string, a: { name: string | null; url: string; hours: number }, lang: Lang = 'en') {
    const t = messagesFor(lang).email.approved;
    return mail(to, 'approved', t.subject, t.heading(a.name), [
      { p: t.body },
      { button: { href: a.url, label: t.button } },
      { small: t.expiry(a.hours) },
    ], lang);
  },

  invite(to: string, a: { name: string; company: string; url: string; hours: number; role: string }) {
    const what = a.role === 'seller' ? 'send us stock and follow our offers' : 'tell us what you buy and follow your requests';
    return mail(to, 'invite', 'Your PriceMart account', `Hi ${a.name}`, [
      { p: `We've opened a PriceMart account for ${a.company}. You can use it to ${what}, instead of email.` },
      { button: { href: a.url, label: 'Sign in' } },
      { small: `The link works once and expires in ${a.hours} hours. After that, sign in at app.pricemart.eu with your email.` },
    ]);
  },

  infoRequested(to: string, a: { name: string | null; message: string }, lang: Lang = 'en') {
    const t = messagesFor(lang).email;
    return mail(to, 'info_requested', t.infoRequested.subject, t.hi(a.name), [
      { p: t.infoRequested.body },
      { quote: a.message },
      { p: t.infoRequested.reply },
    ], lang);
  },

  rejected(to: string, a: { name: string | null; message: string }, lang: Lang = 'en') {
    const t = messagesFor(lang).email;
    return mail(to, 'rejected', t.rejected.subject, t.hi(a.name), [
      { p: a.message || t.rejected.fallback },
      { small: t.rejected.mistake },
    ], lang);
  },

  statusChanged(to: string, a: { name: string; summary: string; status: string; url: string }) {
    return mail(to, 'status_changed', `Update: ${a.status}`, `Hi ${a.name}`, [
      { p: `There's an update on "${a.summary}". New status: ${a.status}.` },
      { button: { href: a.url, label: 'View in your account' } },
    ]);
  },
};
