import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import { LANGS, LANG_NATIVE, type Lang, type Messages, sitePath } from '../lib/i18n';
import type { SessionUser } from '../types';

export interface PageCtx {
  site: string;
  session: SessionUser | null;
  path: string;
  /** Google Analytics on public pages only, never in dev. */
  ga: boolean;
  counts?: { applications: number; items: number };
  /** Admin only: emails that failed to send in the last 24 hours. */
  failedEmails?: number;
  /** Language of the public pages (account and admin pages are in English). */
  lang: Lang;
  t: Messages;
  /** This page in another language, for the switcher. */
  langHref?: (lang: Lang) => string;
}

interface LayoutProps {
  ctx: PageCtx;
  title: string;
  area: 'public' | 'account' | 'admin';
  gaEvent?: string;
  gaRole?: string;
  children?: Child;
}

/** `also`: other path prefixes that belong to this menu item (a company page is part of Applications). */
const NavLink: FC<{ href: string; path: string; children?: Child; badge?: number; also?: string[] }> = ({
  href, path, children, badge, also = [],
}) => {
  const current = path === href || also.some((p) => path.startsWith(p));
  return (
    <li>
      <a href={href} aria-current={current ? 'page' : undefined}>
        {children}
        {badge ? <span class="pm-count">{badge}</span> : null}
      </a>
    </li>
  );
};

const SignOut: FC = () => (
  <li>
    <form method="post" action="/signout" class="pm-inline">
      <button type="submit" class="pm-linkbtn">Sign out</button>
    </form>
  </li>
);

export const Layout: FC<LayoutProps> = ({ ctx, title, area, gaEvent, gaRole, children }) => {
  const s = ctx.session;
  const seller = s?.company?.role === 'seller';
  const pub = area === 'public';
  const t = ctx.t;
  return (
    <>
      {raw('<!doctype html>')}
      <html lang={pub ? ctx.lang : 'en'}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>{`${title} | PriceMart`}</title>
          <meta name="robots" content={area === 'public' ? 'index,follow' : 'noindex,nofollow'} />
          <link rel="stylesheet" href={`${ctx.site}/assets/styles.css`} />
          <link rel="stylesheet" href="/portal.css" />
          <link rel="icon" type="image/png" href={`${ctx.site}/assets/img/logo.png`} />
          {ctx.ga && area === 'public' ? (
            <>
              <script async src="https://www.googletagmanager.com/gtag/js?id=G-K7SHZYB10Z"></script>
              <script src="/ga.js"></script>
            </>
          ) : null}
          {/* Not deferred: it marks <html> with .js before first paint so the steps don't flash. */}
          <script src="/portal.js"></script>
        </head>
        <body data-ga-event={gaEvent} data-ga-role={gaRole}>
          <a class="pm-skip" href="#main">{pub ? t.layout.skip : 'Skip to content'}</a>
          <header class="topbar">
            <div class="wrap">
              <a class="logo" href={pub ? sitePath(ctx.site, ctx.lang) : area === 'admin' ? '/admin' : '/account'} aria-label="PriceMart home">
                <img src={`${ctx.site}/assets/img/logo.png`} alt="PriceMart" height="56" />
              </a>
              <nav aria-label="Primary">
                <ul>
                  {area === 'public' ? (
                    <>
                      <li><a href={sitePath(ctx.site, ctx.lang)}>pricemart.eu</a></li>
                      <NavLink href="/signin" path={ctx.path}>{t.layout.signIn}</NavLink>
                      <li>
                        <a class="btn btn-coral pm-nav-btn" href="/register" aria-current={ctx.path.startsWith('/register') ? 'page' : undefined}>
                          {t.layout.register}
                        </a>
                      </li>
                    </>
                  ) : null}
                  {area === 'account' ? (
                    <>
                      <NavLink href="/account" path={ctx.path} also={['/account/items/']}>
                        {seller ? 'Your stock' : 'Your requests'}
                      </NavLink>
                      <NavLink href="/account/add" path={ctx.path}>{seller ? 'Add stock' : 'Add a request'}</NavLink>
                      <NavLink href="/account/profile" path={ctx.path}>Company details</NavLink>
                      <SignOut />
                    </>
                  ) : null}
                  {area === 'admin' ? (
                    <>
                      <NavLink href="/admin/applications" path={ctx.path} badge={ctx.counts?.applications} also={['/admin/companies/']}>
                        Applications
                      </NavLink>
                      <NavLink href="/admin/items" path={ctx.path} badge={ctx.counts?.items} also={['/admin/items/']}>
                        Stock and requests
                      </NavLink>
                      <NavLink href="/admin/invite" path={ctx.path}>Invite</NavLink>
                      <SignOut />
                    </>
                  ) : null}
                </ul>
              </nav>
            </div>
          </header>
          <main id="main" class="pm-main">
            {area === 'admin' && ctx.failedEmails ? (
              <div class="pm-page">
                <div class="pm-flash pm-flash-warn" role="alert">
                  {ctx.failedEmails} email{ctx.failedEmails === 1 ? '' : 's'} failed to send in the last 24 hours. Check the
                  Resend dashboard: the free plan allows 100 emails a day.
                </div>
              </div>
            ) : null}
            {children}
          </main>
          <footer class="pm-footer">
            <div class="wrap">
              <span>© PriceMart SL · Barcelona</span>
              <span>
                <a href={`${ctx.site}/terms/`}>{pub ? t.layout.terms : 'Terms'}</a> ·{' '}
                <a href={`${ctx.site}/privacy-policy-en/`}>{pub ? t.layout.privacy : 'Privacy'}</a> ·{' '}
                <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>
              </span>
              {pub && ctx.langHref ? (
                <nav class="pm-langs" aria-label={t.layout.language}>
                  {LANGS.map((l) => (
                    <a href={ctx.langHref!(l)} lang={l} hreflang={l} aria-current={l === ctx.lang ? 'true' : undefined}>
                      {LANG_NATIVE[l]}
                    </a>
                  ))}
                </nav>
              ) : null}
            </div>
          </footer>
        </body>
      </html>
    </>
  );
};
