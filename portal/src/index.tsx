import { type Context, Hono } from 'hono';
import {
  endSession, isAdminEmail, issueLoginLink, loadSessionMiddleware, requireAdmin, requireCustomer, startSession,
} from './auth';
import {
  consumeLoginToken, countCompaniesByStatus, countNewSubmissions, createCompanyWithUser, createSubmission, devOutbox,
  duplicatesFor, firstSubmissions, getCompany, getFile, getOrCreateAdminUser, getSubmission, getUserByEmail,
  hitRateLimit, insertFile, isLoginTokenUsable, listCompanies, listCompanyUsers, listEvents, listSubmissions,
  listSubmissionsForCompany, logEvent, setCompanyNote, setCompanyStatus, summarize, updateCompanyProfile,
  updateSubmissionAdmin,
} from './db';
import { emailList, isFreeEmail, isValidEmail, normalizeEmail } from './lib/email';
import { safeFilename } from './lib/files';
import { COMPANY_STATUSES, isSubmissionStatus, statusLabel } from './lib/labels';
import { clean, truncate } from './lib/text';
import { nowIso } from './lib/time';
import { sha256Hex } from './lib/tokens';
import {
  type Errors, type FormLike, type Mode, type Role, emptyContact, emptyItem, isRole, kindFor, parseContact, parseItem,
  parseMode, parseProfile,
} from './lib/validate';
import { sendMail, sendToMany, templates } from './mail';
import type { AppEnv, Env } from './types';
import { AccountAdd, AccountHome, AccountItem, ProfilePage } from './views/account';
import { AdminApplications, AdminCompany, AdminInvite, AdminItem, AdminItems } from './views/admin';
import type { PageCtx } from './views/layout';
import {
  AuthPage, CheckEmailPage, ChoosePage, DonePage, MessagePage, RegisterPage, SignInPage,
} from './views/public';

const app = new Hono<AppEnv>();

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' https://www.pricemart.eu https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data: https://www.pricemart.eu https://www.googletagmanager.com https://*.google-analytics.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const FLASH: Record<string, string> = {
  approved: 'Approved. They have been emailed a sign-in link.',
  info: 'Question sent. They are now under Waiting for info.',
  rejected: 'Rejected.',
  closed: 'Account closed.',
  note: 'Note saved.',
  resent: 'A new sign-in link has been sent.',
  invited: 'Account created and invite sent.',
  saved: 'Saved.',
  sent: "Thanks, we've got it. We'll be in touch.",
  signed_out: "You've signed out.",
};

// ---------- middleware ----------

app.use('*', async (c, next) => {
  await next();
  const h = c.res.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('X-Frame-Options', 'DENY');
  h.set('Strict-Transport-Security', 'max-age=31536000');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if ((h.get('Content-Type') ?? '').includes('text/html')) {
    h.set('Content-Security-Policy', CSP);
    h.set('Cache-Control', 'no-store');
  }
});

// Cookies are SameSite=Lax; this also refuses cross-site form posts outright.
app.use('*', async (c, next) => {
  if (c.req.method === 'POST') {
    const origin = c.req.header('Origin');
    if (origin && origin !== new URL(c.req.url).origin) return c.text('Forbidden', 403);
  }
  await next();
});

app.use('*', loadSessionMiddleware);

// ---------- helpers ----------

async function pageCtx(c: Context<AppEnv>): Promise<PageCtx> {
  const session = c.get('session');
  const ctx: PageCtx = {
    site: c.env.SITE_URL,
    session,
    path: new URL(c.req.url).pathname,
    ga: c.env.DEV_MODE !== 'true',
  };
  if (session?.isAdmin) {
    const [counts, items] = await Promise.all([countCompaniesByStatus(c.env.DB), countNewSubmissions(c.env.DB)]);
    ctx.counts = { applications: counts.pending ?? 0, items };
  }
  return ctx;
}

function formLike(fd: FormData): FormLike {
  return {
    get: (n) => {
      const v = fd.get(n);
      return typeof v === 'string' ? v : '';
    },
    getAll: (n) => fd.getAll(n).filter((v): v is string => typeof v === 'string'),
  };
}

function filesFor(fd: FormData, mode: Mode): File[] {
  return fd
    .getAll(`files_${mode}`)
    .filter((v): v is File => typeof v !== 'string' && v.size > 0 && v.name !== '');
}

async function storeFiles(env: Env, submissionId: string, files: File[], now: string) {
  for (const f of files) {
    const id = crypto.randomUUID();
    const name = safeFilename(f.name);
    const key = `submissions/${submissionId}/${id}/${name}`;
    const contentType = f.type || 'application/octet-stream';
    await env.FILES.put(key, await f.arrayBuffer(), { httpMetadata: { contentType } });
    await insertFile(env.DB, { id, submissionId, r2Key: key, filename: f.name.slice(0, 200), contentType, size: f.size, now });
  }
}

const flash = (c: Context<AppEnv>) => FLASH[c.req.query('msg') ?? ''] ?? undefined;

function limit(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function ipKey(c: Context<AppEnv>): Promise<string> {
  return sha256Hex(c.req.header('cf-connecting-ip') ?? 'local');
}

function background(c: Context<AppEnv>, work: Promise<unknown>) {
  c.executionCtx.waitUntil(work.catch((err) => console.error('background task failed', err)));
}

// ---------- public ----------

app.get('/health', (c) => c.text('ok'));

app.get('/', async (c) => {
  const s = c.get('session');
  if (s) return c.redirect(s.isAdmin ? '/admin' : '/account', 303);
  return c.html(<ChoosePage ctx={await pageCtx(c)} />);
});

app.get('/register', async (c) => c.html(<ChoosePage ctx={await pageCtx(c)} />));

app.get('/register/done', async (c) => {
  const role = c.req.query('role');
  return c.html(<DonePage ctx={await pageCtx(c)} role={role === 'buyer' ? 'buyer' : 'seller'} />);
});

app.get('/register/:role', async (c) => {
  const role = c.req.param('role');
  if (!isRole(role)) return c.notFound();
  return c.html(
    <RegisterPage ctx={await pageCtx(c)} role={role} item={emptyItem()} contact={emptyContact()} errors={{}} startStep={1} />,
  );
});

app.post('/register/:role', async (c) => {
  const role = c.req.param('role');
  if (!isRole(role)) return c.notFound();
  const env = c.env;
  const fd = await c.req.formData();
  const form = formLike(fd);
  const done = `/register/done?role=${role}`;

  // Honeypot: bots fill every field. Pretend it worked.
  if (form.get('hp_website')) return c.redirect(done, 303);

  const now = nowIso();
  if (await hitRateLimit(env.DB, `register:${await ipKey(c)}`, limit(env.REGISTER_LIMIT_PER_HOUR, 10), 60, now)) {
    return c.html(
      <MessagePage ctx={await pageCtx(c)} title="Please try again later">
        <p class="lead">
          There have been a lot of registrations from your network in the last hour. Try again later, or email{' '}
          <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>.
        </p>
      </MessagePage>,
      429,
    );
  }

  const files = filesFor(fd, parseMode(form.get('mode')));
  const item = parseItem(role, form, files.map((f) => ({ name: f.name, size: f.size })));
  const contact = parseContact(form);
  const errors: Errors = { ...item.errors, ...contact.errors };

  const existing = contact.input.email && !contact.errors.email ? await getUserByEmail(env.DB, contact.input.email) : null;
  if (existing && (existing.is_admin || !existing.company_id || isAdminEmail(env, contact.input.email))) {
    errors.email = 'This email belongs to a PriceMart team account. Please use another one.';
  }

  if (Object.keys(errors).length) {
    return c.html(
      <RegisterPage
        ctx={await pageCtx(c)}
        role={role}
        item={item.input}
        contact={contact.input}
        errors={errors}
        startStep={Object.keys(item.errors).length ? 1 : 2}
        fileNote={files.length > 0}
      />,
      422,
    );
  }

  const kind = kindFor(role);
  const c0 = contact.input;
  const actor = `user:${c0.email}`;
  let companyId: string;
  let userId: string;
  let companyName = c0.company;
  const signedOut = Boolean(existing);

  if (existing?.company_id) {
    // Someone with an account used the public form. Keep the stock, but don't touch their company details.
    companyId = existing.company_id;
    userId = existing.id;
    companyName = (await getCompany(env.DB, companyId))?.name ?? c0.company;
  } else {
    ({ companyId, userId } = await createCompanyWithUser(env.DB, { role, contact: c0, now, status: 'pending', source: 'register' }));
    await logEvent(env.DB, { companyId, actor, type: 'registered', detail: `Registered as a ${role}`, now });
  }

  const submissionId = await createSubmission(env.DB, { companyId, userId, kind, item: item.input, now });
  await storeFiles(env, submissionId, files, now);
  await logEvent(env.DB, {
    companyId,
    submissionId,
    actor,
    type: 'submission_created',
    detail: signedOut
      ? 'Sent through the registration form by an existing account'
      : `First ${kind === 'stock' ? 'stock' : 'request'} sent with the registration`,
    now,
  });

  const full = await getSubmission(env.DB, submissionId);
  const summary = full ? summarize(full) : '';
  const alerts = emailList(env.ALERT_EMAILS);

  background(
    c,
    (async () => {
      if (signedOut) {
        await sendToMany(env, alerts, (to) =>
          templates.teamNewSubmission(to, { company: companyName, kind, summary, url: `${env.APP_URL}/admin/items/${submissionId}`, signedOut: true }),
        );
        return;
      }
      await sendMail(env, templates.registrationReceived(c0.email, { name: c0.name, role, company: c0.company, summary }));
      const notes: string[] = [];
      if (!c0.vat_number) notes.push('no VAT given');
      if (isFreeEmail(c0.email)) notes.push('free email address');
      await sendToMany(env, alerts, (to) =>
        templates.teamNewRegistration(to, {
          company: c0.company, role, name: c0.name, email: c0.email, summary, notes,
          url: `${env.APP_URL}/admin/companies/${companyId}`,
        }),
      );
    })(),
  );

  return c.redirect(done, 303);
});

// ---------- sign in ----------

app.get('/signin', async (c) => {
  const s = c.get('session');
  if (s) return c.redirect(s.isAdmin ? '/admin' : '/account', 303);
  return c.html(<SignInPage ctx={await pageCtx(c)} message={flash(c)} />);
});

async function sendSignIn(env: Env, email: string) {
  if (isAdminEmail(env, email)) {
    const url = await issueLoginLink(env, email, 'signin', 30);
    await sendMail(env, templates.signInLink(email, { url, minutes: 30 }));
    return;
  }
  const user = await getUserByEmail(env.DB, email);
  if (!user?.company_id) return;
  const company = await getCompany(env.DB, user.company_id);
  if (company?.status === 'approved') {
    const url = await issueLoginLink(env, email, 'signin', 30);
    await sendMail(env, templates.signInLink(email, { url, minutes: 30 }));
  } else if (company?.status === 'pending' || company?.status === 'info_requested') {
    await sendMail(env, templates.signInNotActive(email));
  }
}

app.post('/signin', async (c) => {
  const form = formLike(await c.req.formData());
  const email = normalizeEmail(clean(form.get('email'), 254));
  if (!isValidEmail(email)) {
    return c.html(<SignInPage ctx={await pageCtx(c)} email={email} error="Check the email address." />, 422);
  }
  const now = nowIso();
  const perEmail = limit(c.env.SIGNIN_LIMIT_PER_HOUR, 5);
  const limited =
    (await hitRateLimit(c.env.DB, `signin:${email}`, perEmail, 60, now)) ||
    (await hitRateLimit(c.env.DB, `signin-ip:${await ipKey(c)}`, perEmail * 6, 60, now));
  if (!limited) background(c, sendSignIn(c.env, email));
  return c.html(<CheckEmailPage ctx={await pageCtx(c)} email={email} />);
});

app.get('/auth', async (c) => {
  const token = c.req.query('token') ?? '';
  const valid = token ? await isLoginTokenUsable(c.env.DB, await sha256Hex(token), nowIso()) : false;
  return c.html(<AuthPage ctx={await pageCtx(c)} token={token} valid={valid} />);
});

app.post('/auth', async (c) => {
  const form = formLike(await c.req.formData());
  const token = form.get('token');
  const now = nowIso();
  const used = token ? await consumeLoginToken(c.env.DB, await sha256Hex(token), now) : null;
  if (!used) return c.html(<AuthPage ctx={await pageCtx(c)} token="" valid={false} />, 400);

  if (isAdminEmail(c.env, used.email)) {
    const admin = await getOrCreateAdminUser(c.env.DB, used.email, now);
    await startSession(c, admin.id);
    return c.redirect('/admin', 303);
  }
  const user = await getUserByEmail(c.env.DB, used.email);
  const company = user?.company_id ? await getCompany(c.env.DB, user.company_id) : null;
  if (!user || company?.status !== 'approved') {
    return c.html(
      <MessagePage ctx={await pageCtx(c)} title="Your account isn't open yet">
        <p class="lead">
          We'll email you as soon as it is. Questions? Email <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>.
        </p>
      </MessagePage>,
      403,
    );
  }
  await startSession(c, user.id);
  return c.redirect('/account', 303);
});

app.post('/signout', async (c) => {
  await endSession(c);
  return c.redirect('/signin?msg=signed_out', 303);
});

// ---------- files ----------

app.get('/files/:id', async (c) => {
  const s = c.get('session');
  if (!s) return c.redirect('/signin', 303);
  const f = await getFile(c.env.DB, c.req.param('id'));
  if (!f || (!s.isAdmin && f.company_id !== s.company?.id)) return c.notFound();
  const obj = await c.env.FILES.get(f.r2_key);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      'Content-Type': f.content_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFilename(f.filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
});

// ---------- customer account ----------

const account = new Hono<AppEnv>();
account.use('*', requireCustomer);

account.get('/', async (c) => {
  const company = c.get('session')!.company!;
  const subs = await listSubmissionsForCompany(c.env.DB, company.id);
  return c.html(<AccountHome ctx={await pageCtx(c)} company={company} subs={subs} flash={flash(c)} />);
});

account.get('/add', async (c) => {
  const role = c.get('session')!.company!.role;
  return c.html(<AccountAdd ctx={await pageCtx(c)} role={role} item={emptyItem()} errors={{}} />);
});

account.post('/add', async (c) => {
  const { user, company } = c.get('session')!;
  const role = company!.role;
  const fd = await c.req.formData();
  const form = formLike(fd);
  const files = filesFor(fd, parseMode(form.get('mode')));
  const { input, errors } = parseItem(role, form, files.map((f) => ({ name: f.name, size: f.size })));
  if (Object.keys(errors).length) {
    return c.html(<AccountAdd ctx={await pageCtx(c)} role={role} item={input} errors={errors} fileNote={files.length > 0} />, 422);
  }
  const now = nowIso();
  const kind = kindFor(role);
  const submissionId = await createSubmission(c.env.DB, { companyId: company!.id, userId: user.id, kind, item: input, now });
  await storeFiles(c.env, submissionId, files, now);
  await logEvent(c.env.DB, {
    companyId: company!.id, submissionId, actor: `user:${user.email}`, type: 'submission_created',
    detail: `New ${kind === 'stock' ? 'stock' : 'request'} sent from the account`, now,
  });
  const full = await getSubmission(c.env.DB, submissionId);
  const env = c.env;
  background(
    c,
    sendToMany(env, emailList(env.ALERT_EMAILS), (to) =>
      templates.teamNewSubmission(to, {
        company: company!.name, kind, summary: full ? summarize(full) : '', url: `${env.APP_URL}/admin/items/${submissionId}`, signedOut: false,
      }),
    ),
  );
  return c.redirect('/account?msg=sent', 303);
});

account.get('/items/:id', async (c) => {
  const company = c.get('session')!.company!;
  const s = await getSubmission(c.env.DB, c.req.param('id'));
  if (!s || s.company_id !== company.id) return c.notFound();
  return c.html(<AccountItem ctx={await pageCtx(c)} s={s} />);
});

account.get('/profile', async (c) => {
  const { user, company } = c.get('session')!;
  const values = {
    company: company!.name, name: user.name ?? '', vat_number: company!.vat_number ?? '', country: company!.country ?? '',
    phone: user.phone ?? '', website: company!.website ?? '', business_type: company!.business_type ?? '', job_title: user.job_title ?? '',
  };
  return c.html(<ProfilePage ctx={await pageCtx(c)} company={company!} user={user} values={values} errors={{}} flash={flash(c)} />);
});

account.post('/profile', async (c) => {
  const { user, company } = c.get('session')!;
  const { input, errors } = parseProfile(formLike(await c.req.formData()));
  if (Object.keys(errors).length) {
    return c.html(<ProfilePage ctx={await pageCtx(c)} company={company!} user={user} values={input} errors={errors} />, 422);
  }
  const now = nowIso();
  await updateCompanyProfile(c.env.DB, company!.id, user.id, input, now);
  await logEvent(c.env.DB, { companyId: company!.id, actor: `user:${user.email}`, type: 'profile_updated', detail: 'Updated company details', now });
  return c.redirect('/account/profile?msg=saved', 303);
});

app.route('/account', account);

// ---------- admin ----------

const admin = new Hono<AppEnv>();
admin.use('*', requireAdmin);

admin.get('/', (c) => c.redirect('/admin/applications', 303));

admin.get('/applications', async (c) => {
  const q = c.req.query('status') ?? 'pending';
  const status = (COMPANY_STATUSES as readonly string[]).includes(q) ? q : 'pending';
  const db = c.env.DB;
  const [counts, rows] = await Promise.all([countCompaniesByStatus(db), listCompanies(db, status)]);
  const ids = rows.map((r) => r.id);
  const domainIds = rows.filter((r) => r.contact_email && !isFreeEmail(r.contact_email)).map((r) => r.id);
  const [firsts, dups] = await Promise.all([firstSubmissions(db, ids), duplicatesFor(db, ids, domainIds)]);
  return c.html(
    <AdminApplications ctx={await pageCtx(c)} status={status} counts={counts} rows={rows} firsts={firsts} dups={dups} flash={flash(c)} />,
  );
});

async function renderCompany(c: Context<AppEnv>, id: string, opts: { flash?: string; error?: string; status?: number } = {}) {
  const db = c.env.DB;
  const company = await getCompany(db, id);
  if (!company) return c.notFound();
  const [users, subs, events] = await Promise.all([
    listCompanyUsers(db, id),
    listSubmissionsForCompany(db, id),
    listEvents(db, { companyId: id }),
  ]);
  const domainIds = users[0] && !isFreeEmail(users[0].email) ? [id] : [];
  const dups = (await duplicatesFor(db, [id], domainIds)).get(id) ?? [];
  return c.html(
    <AdminCompany ctx={await pageCtx(c)} company={company} users={users} subs={subs} events={events} dups={dups} flash={opts.flash} error={opts.error} />,
    (opts.status ?? 200) as 200,
  );
}

admin.get('/companies/:id', (c) => renderCompany(c, c.req.param('id'), { flash: flash(c) }));

admin.post('/companies/:id/decision', async (c) => {
  const env = c.env;
  const id = c.req.param('id');
  const fd = await c.req.formData();
  const form = formLike(fd);
  const action = form.get('action');
  const message = clean(form.get('message'), 3000);
  const note = fd.has('admin_note') ? clean(form.get('admin_note'), 3000) : undefined;
  const company = await getCompany(env.DB, id);
  if (!company) return c.notFound();
  const primary = (await listCompanyUsers(env.DB, id))[0];
  const actor = `admin:${c.get('session')!.user.email}`;
  const now = nowIso();
  const back = (msg: string) =>
    form.get('from') === 'list'
      ? `/admin/applications?status=${company.status}&msg=${msg}`
      : `/admin/companies/${id}?msg=${msg}`;

  if (action === 'approve') {
    await setCompanyStatus(env.DB, id, 'approved', now, note);
    if (primary) {
      const url = await issueLoginLink(env, primary.email, 'approval', 72 * 60);
      await sendMail(env, templates.approved(primary.email, { name: primary.name ?? 'there', url, hours: 72 }));
    }
    await logEvent(env.DB, { companyId: id, actor, type: 'approved', detail: 'Approved, sign-in link emailed', now });
    return c.redirect(back('approved'), 303);
  }
  if (action === 'resend' && company.status === 'approved' && primary) {
    const url = await issueLoginLink(env, primary.email, 'approval', 72 * 60);
    await sendMail(env, templates.approved(primary.email, { name: primary.name ?? 'there', url, hours: 72 }));
    if (note !== undefined) await setCompanyNote(env.DB, id, note, now);
    await logEvent(env.DB, { companyId: id, actor, type: 'link_sent', detail: 'New sign-in link emailed', now });
    return c.redirect(back('resent'), 303);
  }
  if (action === 'info') {
    if (!message) return renderCompany(c, id, { error: 'Write the question you want to ask them.', status: 422 });
    await setCompanyStatus(env.DB, id, 'info_requested', now, note);
    if (primary) await sendMail(env, templates.infoRequested(primary.email, { name: primary.name ?? 'there', message }));
    await logEvent(env.DB, { companyId: id, actor, type: 'info_requested', detail: `Asked for info: ${truncate(message, 140)}`, now });
    return c.redirect(back('info'), 303);
  }
  if (action === 'reject') {
    const wasApproved = company.status === 'approved';
    await setCompanyStatus(env.DB, id, 'rejected', now, note);
    const email = form.get('email_reject') === '1';
    if (email && primary) await sendMail(env, templates.rejected(primary.email, { name: primary.name ?? 'there', message }));
    await logEvent(env.DB, {
      companyId: id, actor, type: 'rejected',
      detail: `${wasApproved ? 'Account closed' : 'Rejected'}${email ? ', email sent' : ''}`, now,
    });
    return c.redirect(back(wasApproved ? 'closed' : 'rejected'), 303);
  }
  if (action === 'note' && note !== undefined) {
    await setCompanyNote(env.DB, id, note, now);
    return c.redirect(back('note'), 303);
  }
  return c.redirect(`/admin/companies/${id}`, 303);
});

admin.get('/items', async (c) => {
  const kind = ['stock', 'want'].includes(c.req.query('kind') ?? '') ? c.req.query('kind')! : '';
  const status = isSubmissionStatus(c.req.query('status') ?? '') ? c.req.query('status')! : '';
  const subs = await listSubmissions(c.env.DB, { kind, status });
  return c.html(<AdminItems ctx={await pageCtx(c)} kind={kind} status={status} subs={subs} />);
});

admin.get('/items/:id', async (c) => {
  const s = await getSubmission(c.env.DB, c.req.param('id'));
  if (!s) return c.notFound();
  const [company, events] = await Promise.all([getCompany(c.env.DB, s.company_id), listEvents(c.env.DB, { submissionId: s.id })]);
  return c.html(<AdminItem ctx={await pageCtx(c)} s={s} company={company!} events={events} flash={flash(c)} />);
});

admin.post('/items/:id', async (c) => {
  const env = c.env;
  const s = await getSubmission(env.DB, c.req.param('id'));
  if (!s) return c.notFound();
  const form = formLike(await c.req.formData());
  const status = isSubmissionStatus(form.get('status')) ? form.get('status') : s.status;
  const now = nowIso();
  await updateSubmissionAdmin(
    env.DB, s.id,
    { status, admin_summary: clean(form.get('admin_summary'), 300), admin_note: clean(form.get('admin_note'), 3000) },
    now,
  );
  const actor = `admin:${c.get('session')!.user.email}`;
  if (status !== s.status) {
    const label = statusLabel(s.kind, status);
    let emailed = false;
    if (form.get('notify') === '1') {
      const company = await getCompany(env.DB, s.company_id);
      const primary = (await listCompanyUsers(env.DB, s.company_id))[0];
      if (company?.status === 'approved' && primary) {
        emailed = await sendMail(
          env,
          templates.statusChanged(primary.email, { name: primary.name ?? 'there', summary: summarize(s), status: label, url: `${env.APP_URL}/account/items/${s.id}` }),
        );
      }
    }
    await logEvent(env.DB, {
      companyId: s.company_id, submissionId: s.id, actor, type: 'status_changed',
      detail: `Status: ${statusLabel(s.kind, s.status)} → ${label}${emailed ? ', customer emailed' : ''}`, now,
    });
  }
  return c.redirect(`/admin/items/${s.id}?msg=saved`, 303);
});

admin.get('/invite', async (c) =>
  c.html(<AdminInvite ctx={await pageCtx(c)} values={{ role: 'seller', company: '', name: '', email: '' }} errors={{}} />),
);

admin.post('/invite', async (c) => {
  const env = c.env;
  const form = formLike(await c.req.formData());
  const role: Role = form.get('role') === 'buyer' ? 'buyer' : 'seller';
  const values = {
    role,
    company: clean(form.get('company'), 200),
    name: clean(form.get('name'), 120),
    email: normalizeEmail(clean(form.get('email'), 254)),
  };
  const errors: Errors = {};
  if (!values.company) errors.company = 'Add the company name.';
  if (!values.name) errors.name = 'Add the contact name.';
  if (!isValidEmail(values.email)) errors.email = 'Check the email address.';
  else if (await getUserByEmail(env.DB, values.email)) errors.email = 'This email already has an account.';
  else if (isAdminEmail(env, values.email)) errors.email = 'This is a PriceMart team email.';
  if (Object.keys(errors).length) return c.html(<AdminInvite ctx={await pageCtx(c)} values={values} errors={errors} />, 422);

  const now = nowIso();
  const { companyId } = await createCompanyWithUser(env.DB, {
    role,
    contact: { ...emptyContact(), company: values.company, name: values.name, email: values.email },
    now,
    status: 'approved',
    source: 'invite',
  });
  const url = await issueLoginLink(env, values.email, 'invite', 72 * 60);
  await sendMail(env, templates.invite(values.email, { name: values.name, company: values.company, url, hours: 72, role }));
  await logEvent(env.DB, {
    companyId, actor: `admin:${c.get('session')!.user.email}`, type: 'invited', detail: 'Account created by PriceMart, invite emailed', now,
  });
  return c.redirect(`/admin/companies/${companyId}?msg=invited`, 303);
});

app.route('/admin', admin);

// ---------- development only ----------

app.get('/__dev/outbox', async (c) => {
  if (c.env.DEV_MODE !== 'true') return c.notFound();
  return c.json(await devOutbox(c.env.DB, normalizeEmail(c.req.query('to') ?? '')));
});

// ---------- fallbacks ----------

app.notFound(async (c) =>
  c.html(
    <MessagePage ctx={await pageCtx(c)} title="Page not found">
      <p class="lead">
        That page doesn't exist. <a href="/">Go to the start</a>.
      </p>
    </MessagePage>,
    404,
  ),
);

app.onError(async (err, c) => {
  console.error('unhandled error', err);
  return c.html(
    <MessagePage ctx={{ site: c.env.SITE_URL, session: null, path: '', ga: false }} title="Something went wrong">
      <p class="lead">
        Sorry, that didn't work. Please try again, or email <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>.
      </p>
    </MessagePage>,
    500,
  );
});

export default app;
