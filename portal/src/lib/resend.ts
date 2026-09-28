// Resend (resend.com) email API: request building and error handling, kept pure so it can be tested.

export const RESEND_URL = 'https://api.resend.com/emails';

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Sender {
  from: string;
  fromName: string;
  replyTo: string;
}

/**
 * The fetch arguments for one email. The idempotency key makes a retry of the same email safe:
 * Resend sends it once even if the first attempt actually got through.
 */
export function resendRequest(apiKey: string, sender: Sender, mail: OutgoingMail, idempotencyKey: string) {
  const name = sender.fromName.replace(/["<>]/g, '');
  return {
    url: RESEND_URL,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: `${name} <${sender.from}>`,
        to: [mail.to],
        reply_to: sender.replyTo,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    } satisfies RequestInit,
  };
}

/** Worth one more try: rate limited (Resend allows a few requests a second) or a server error. */
export function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/** A short, readable reason for the email log. */
export function describeResendError(status: number, body: string): string {
  let detail = body.trim();
  try {
    const parsed = JSON.parse(body) as { name?: string; message?: string };
    detail = [parsed.name, parsed.message].filter(Boolean).join(': ') || detail;
  } catch {
    // not JSON, keep the raw text
  }
  const hint =
    status === 401 || status === 403
      ? ' (check RESEND_API_KEY and that pricemart.eu is verified in Resend)'
      : status === 429
        ? ' (rate or daily limit reached; the free plan allows 100 emails a day)'
        : '';
  return `HTTP ${status}: ${detail || 'no details'}${hint}`.slice(0, 500);
}
