import type { Child, FC } from 'hono/jsx';
import { sitePath } from '../lib/i18n';
import type { ContactInput, Errors, ItemInput, Role } from '../lib/validate';
import { ErrorSummary, Flash } from './components';
import { ContactFields, ItemFields } from './forms';
import { Layout, type PageCtx } from './layout';

// Public pages are in the visitor's language (ctx.lang / ctx.t).

export const ChoosePage: FC<{ ctx: PageCtx }> = ({ ctx }) => {
  const t = ctx.t.choose;
  return (
    <Layout ctx={ctx} title={t.title} area="public">
      <div class="pm-page pm-center">
        <span class="eyebrow">{t.eyebrow}</span>
        <h1>{t.h1}</h1>
        <p class="lead pm-lead">{t.lead}</p>
        <div class="pm-choose">
          <a class="pm-choice" href="/register/seller">
            <span class="pm-choice-tag">{t.sellerTag}</span>
            <span class="pm-choice-title">{t.sellerTitle}</span>
            <span class="pm-choice-text">{t.sellerText}</span>
            <span class="btn btn-coral">{t.sellerButton}</span>
          </a>
          <a class="pm-choice" href="/register/buyer">
            <span class="pm-choice-tag">{t.buyerTag}</span>
            <span class="pm-choice-title">{t.buyerTitle}</span>
            <span class="pm-choice-text">{t.buyerText}</span>
            <span class="btn">{t.buyerButton}</span>
          </a>
        </div>
        <p class="pm-muted">
          {t.already} <a href="/signin">{t.signIn}</a>
          <span class="pm-sep"> · </span>
          {t.preferEmail} <a href={sitePath(ctx.site, ctx.lang, 'contact/')}>{t.contactForm}</a>
        </p>
      </div>
    </Layout>
  );
};

/** Browser-side checks show the same messages as the server, in the same language. */
function clientMessages(ctx: PageCtx): string {
  const e = ctx.t.errors;
  return JSON.stringify({
    describe_seller: e.describeSeller,
    describe_buyer: e.describeBuyer,
    files_upload: e.filesUpload,
    lots: e.lots,
    product: e.product,
    quantity: e.quantity,
    best_before: e.bestBefore,
    want: e.want,
    company: e.company,
    name: e.name,
    email_missing: e.emailMissing,
    email_invalid: e.emailInvalid,
  });
}

export const RegisterPage: FC<{
  ctx: PageCtx;
  role: Role;
  item: ItemInput;
  contact: ContactInput;
  errors: Errors;
  startStep: 1 | 2;
  fileNote?: boolean;
}> = ({ ctx, role, item, contact, errors, startStep, fileNote }) => {
  const seller = role === 'seller';
  const t = ctx.t.register;
  const title = seller ? t.titleSeller : t.titleBuyer;
  return (
    <Layout ctx={ctx} title={title} area="public">
      <div class="pm-page pm-narrow">
        <p class="pm-back">
          <a href="/register">{t.backLink}</a>
        </p>
        <h1>{title}</h1>
        <ErrorSummary errors={errors} title={ctx.t.errors.summary} />
        {fileNote ? <Flash tone="warn" message={t.fileNote} /> : null}
        <form
          method="post"
          action={`/register/${role}`}
          enctype="multipart/form-data"
          novalidate
          class="pm-form"
          data-steps
          data-current={String(startStep)}
          data-role={role}
          data-msgs={clientMessages(ctx)}
        >
          <input type="hidden" name="lang" value={ctx.lang} />
          <ol class="pm-stepper" aria-label={t.steps}>
            <li data-step-ind="1">{seller ? t.stepHave : t.stepNeed}</li>
            <li data-step-ind="2">{t.stepReach}</li>
          </ol>
          <section class="pm-step" data-step="1" aria-labelledby="step1-title">
            <h2 id="step1-title">
              <span class="pm-step-num">1</span>
              {seller ? t.h2Have : t.h2Need}
            </h2>
            <ItemFields role={role} item={item} errors={errors} lang={ctx.lang} />
            <div class="pm-actions pm-js-only">
              <button type="button" class="btn btn-coral" data-next>
                {t.continue}
              </button>
            </div>
          </section>

          <section class="pm-step" data-step="2" aria-labelledby="step2-title">
            <h2 id="step2-title">
              <span class="pm-step-num">2</span>
              {t.h2Reach}
            </h2>
            <ContactFields contact={contact} errors={errors} lang={ctx.lang} />
            <div class="pm-hp" aria-hidden="true">
              <label for="hp_website">Leave this empty</label>
              <input id="hp_website" name="hp_website" type="text" tabindex={-1} autocomplete="off" />
            </div>
            <p class="form-note">
              {t.agreeBefore}
              <a href={`${ctx.site}/terms/`}>{t.terms}</a>
              {t.agreeAnd}
              <a href={`${ctx.site}/privacy-policy-en/`}>{t.privacy}</a>
              {t.agreeAfter}
            </p>
            <div class="pm-actions">
              <button type="button" class="btn btn-ghost pm-js-only" data-back>
                {t.backButton}
              </button>
              <button type="submit" class="btn btn-coral" data-submit data-sending={t.sending}>
                {t.send}
              </button>
            </div>
          </section>
        </form>
      </div>
    </Layout>
  );
};

export const DonePage: FC<{ ctx: PageCtx; role: Role }> = ({ ctx, role }) => {
  const t = ctx.t.done;
  const seller = role === 'seller';
  return (
    <Layout ctx={ctx} title={t.title} area="public" gaEvent="sign_up" gaRole={role}>
      <div class="pm-page pm-narrow">
        <span class="pm-done-icon" aria-hidden="true">✓</span>
        <h1>{t.h1}</h1>
        <p class="lead">{seller ? t.leadSeller : t.leadBuyer}</p>
        <div class="pm-card">
          <h2 class="pm-card-title">{t.nextTitle}</h2>
          <ol class="pm-next">
            <li>
              <strong>{t.step1Strong}</strong> {t.step1}
            </li>
            <li>
              <strong>{t.step2Strong}</strong> {t.step2}
            </li>
            <li>
              <strong>{t.step3Strong}</strong> {seller ? t.step3Seller : t.step3Buyer}
            </li>
          </ol>
        </div>
        <p>
          <a href={sitePath(ctx.site, ctx.lang)}>{t.back}</a>
        </p>
      </div>
    </Layout>
  );
};

export const SignInPage: FC<{ ctx: PageCtx; email?: string; error?: string; message?: string }> = ({ ctx, email, error, message }) => {
  const t = ctx.t.signin;
  return (
    <Layout ctx={ctx} title={t.title} area="public">
      <div class="pm-page pm-narrow pm-slim">
        <h1>{t.h1}</h1>
        <p class="lead">{t.lead}</p>
        <Flash message={message} />
        <form method="post" action="/signin" class="pm-form" novalidate>
          <input type="hidden" name="lang" value={ctx.lang} />
          <div class="field">
            <label for="email">{t.email}</label>
            <input id="email" name="email" type="email" value={email ?? ''} autocomplete="email" required />
            {error ? <p class="pm-field-error">{error}</p> : null}
          </div>
          <button type="submit" class="btn btn-coral">
            {t.button}
          </button>
        </form>
        <p class="pm-muted pm-mt">
          {t.notRegistered} <a href="/register">{t.register}</a>
        </p>
      </div>
    </Layout>
  );
};

export const CheckEmailPage: FC<{ ctx: PageCtx; email: string }> = ({ ctx, email }) => {
  const t = ctx.t.checkEmail;
  return (
    <Layout ctx={ctx} title={t.title} area="public">
      <div class="pm-page pm-narrow pm-slim">
        <h1>{t.title}</h1>
        <p class="lead">
          {t.leadBefore}
          <strong>{email}</strong>
          {t.leadAfter}
        </p>
        <p class="pm-muted">
          {t.nothing}
          <a href="/signin">{t.tryAgain}</a>
          {t.end}
        </p>
      </div>
    </Layout>
  );
};

export const AuthPage: FC<{ ctx: PageCtx; token: string; valid: boolean }> = ({ ctx, token, valid }) => {
  const t = ctx.t.auth;
  return (
    <Layout ctx={ctx} title={t.title} area="public">
      <div class="pm-page pm-narrow pm-slim">
        {valid ? (
          <>
            <h1>{t.h1}</h1>
            <p class="lead">{t.lead}</p>
            <form method="post" action="/auth" class="pm-form">
              <input type="hidden" name="token" value={token} />
              <button type="submit" class="btn btn-coral">
                {t.button}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>{t.expiredH1}</h1>
            <p class="lead">{t.expiredLead}</p>
            <p>
              <a class="btn btn-coral" href="/signin">
                {t.newLink}
              </a>
            </p>
          </>
        )}
      </div>
    </Layout>
  );
};

export const MessagePage: FC<{ ctx: PageCtx; title: string; area?: 'public' | 'account' | 'admin'; children?: Child }> = ({
  ctx, title, area = 'public', children,
}) => (
  <Layout ctx={ctx} title={title} area={area}>
    <div class="pm-page pm-narrow pm-slim">
      <h1>{title}</h1>
      {children}
    </div>
  </Layout>
);

/** "... or email contact@pricemart.eu." in the page language. */
export const EmailUs: FC<{ before: string; end: string }> = ({ before, end }) => (
  <p class="lead">
    {before}
    <a href="mailto:contact@pricemart.eu">contact@pricemart.eu</a>
    {end}
  </p>
);
