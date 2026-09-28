import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createLoginToken, createSession, deleteSession, loadSession } from './db';
import { emailList } from './lib/email';
import { addMinutes, nowIso } from './lib/time';
import { randomToken, sha256Hex } from './lib/tokens';
import type { AppEnv, Env } from './types';

export const SESSION_COOKIE = 'pm_session';
const SESSION_DAYS = 30;

export function isAdminEmail(env: Env, email: string): boolean {
  return emailList(env.ADMIN_EMAILS).includes(email);
}

/** Creates a one-time sign-in link. Only the token's hash is stored. */
export async function issueLoginLink(env: Env, email: string, purpose: string, minutes: number): Promise<string> {
  const token = randomToken();
  const now = nowIso();
  await createLoginToken(env.DB, { hash: await sha256Hex(token), email, purpose, expiresAt: addMinutes(now, minutes), now });
  return `${env.APP_URL}/auth?token=${encodeURIComponent(token)}`;
}

export async function startSession(c: Context<AppEnv>, userId: string) {
  const token = randomToken();
  const now = nowIso();
  await createSession(c.env.DB, {
    hash: await sha256Hex(token),
    userId,
    expiresAt: addMinutes(now, SESSION_DAYS * 24 * 60),
    now,
  });
  setCookie(c, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(c: Context<AppEnv>) {
  const s = c.get('session');
  if (s) await deleteSession(c.env.DB, s.sessionHash);
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true });
}

/**
 * Loads the signed-in user, if any. A customer only counts as signed in while their company
 * is approved; an admin only while their email is still in ADMIN_EMAILS.
 */
export const loadSessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('session', null);
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const s = await loadSession(c.env.DB, await sha256Hex(token), nowIso());
    if (s) {
      const isAdmin = Boolean(s.user.is_admin) && isAdminEmail(c.env, s.user.email);
      const activeCustomer = !s.user.is_admin && s.company?.status === 'approved';
      if (isAdmin || activeCustomer) c.set('session', { ...s, isAdmin });
    }
  }
  await next();
};

export const requireCustomer: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = c.get('session');
  if (!s) return c.redirect('/signin', 303);
  if (s.isAdmin || !s.company) return c.redirect('/admin', 303);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = c.get('session');
  if (!s) return c.redirect('/signin', 303);
  if (!s.isAdmin) return c.text('Not found', 404);
  await next();
};
