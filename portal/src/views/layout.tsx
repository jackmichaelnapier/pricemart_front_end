import type { Child, FC } from 'hono/jsx';
import { raw } from 'hono/html';
import type { SessionUser } from '../types';

export interface PageCtx {
  site: string;
  session: SessionUser | null;
  path: string;
  /** Google Analytics on public pages only, never in dev. */
  ga: boolean;
  counts?: { applications: number; items: number };
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
  return (
    <>
      {raw('<!doctype html>')}
      <html lang="en">
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
          <a class="pm-skip" href="#main">Skip to content</a>
          <header class="topbar">
            <div class="wrap">
              <a class="logo" href={area === 'public' ? ctx.site : area === 'admin' ? '/admin' : '/account'} aria-label="PriceMart home">
                <img src={`${ctx.site}/assets/img/logo.png`} alt="PriceMart" height="56" />
              </a>
              <nav aria-label="Primary">
                <ul>
                  {area === 'public' ? (
                    <>
                      <li><a href={ctx.site}>pricemart.eu</a></li>
                      <NavLink href="/signin" path={ctx.path}>Sign in</NavLink>
                      <li>
                        <a class="btn btn-coral pm-nav-btn" href="/register" aria-current={ctx.path.startsWith('/register') ? 'page' : undefined}>
                          Register
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
            {children}
          </main>
          <footer class="pm-footer">
            <div class="wrap">
              <span>© PriceMart SL · Barcelona</span>
              <span>
                <a href={`${ctx.site}/terms/`}>Terms</a> · <a href={`${ctx.site}/privacy-policy-en/`}>Privacy</a> ·{' '}
                <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>
              </span>
            </div>
          </footer>
        </body>
      </html>
    </>
  );
};
