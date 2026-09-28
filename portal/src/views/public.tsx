import type { Child, FC } from 'hono/jsx';
import type { ContactInput, Errors, ItemInput, Role } from '../lib/validate';
import { ErrorSummary, Flash } from './components';
import { ContactFields, ItemFields } from './forms';
import { Layout, type PageCtx } from './layout';

export const ChoosePage: FC<{ ctx: PageCtx }> = ({ ctx }) => (
  <Layout ctx={ctx} title="Register" area="public">
    <div class="pm-page pm-center">
      <span class="eyebrow">Register</span>
      <h1>Trade with PriceMart</h1>
      <p class="lead pm-lead">
        Tell us what you have, or what you need. It takes a minute, and afterwards you can send us stock or requests from
        your account instead of by email.
      </p>
      <div class="pm-choose">
        <a class="pm-choice" href="/register/seller">
          <span class="pm-choice-tag">For sellers</span>
          <span class="pm-choice-title">I have stock to sell</span>
          <span class="pm-choice-text">Overstock, short-dated, discontinued lines or surplus production.</span>
          <span class="btn btn-coral">Register as a seller →</span>
        </a>
        <a class="pm-choice" href="/register/buyer">
          <span class="pm-choice-tag">For buyers</span>
          <span class="pm-choice-title">I'm looking for stock</span>
          <span class="pm-choice-text">Retailers, discounters, wholesalers and food-rescue groups.</span>
          <span class="btn">Register as a buyer →</span>
        </a>
      </div>
      <p class="pm-muted">
        Already registered? <a href="/signin">Sign in</a>
        <span class="pm-sep"> · </span>
        Prefer email? <a href={`${ctx.site}/contact/`}>Use the contact form</a>
      </p>
    </div>
  </Layout>
);

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
  return (
    <Layout ctx={ctx} title={seller ? 'Register as a seller' : 'Register as a buyer'} area="public">
      <div class="pm-page pm-narrow">
        <p class="pm-back">
          <a href="/register">← Seller or buyer</a>
        </p>
        <h1>{seller ? 'Register as a seller' : 'Register as a buyer'}</h1>
        <ErrorSummary errors={errors} />
        {fileNote ? (
          <Flash tone="warn" message="For your security, files have to be chosen again after an error. Please re-attach them." />
        ) : null}
        <form
          method="post"
          action={`/register/${role}`}
          enctype="multipart/form-data"
          novalidate
          class="pm-form"
          data-steps
          data-current={String(startStep)}
          data-role={role}
        >
          <ol class="pm-stepper" aria-label="Steps">
            <li data-step-ind="1">{seller ? 'What you have' : 'What you need'}</li>
            <li data-step-ind="2">How to reach you</li>
          </ol>
          <section class="pm-step" data-step="1" aria-labelledby="step1-title">
            <h2 id="step1-title">
              <span class="pm-step-num">1</span>
              {seller ? 'What do you have?' : 'What are you looking for?'}
            </h2>
            <ItemFields role={role} item={item} errors={errors} />
            <div class="pm-actions pm-js-only">
              <button type="button" class="btn btn-coral" data-next>
                Continue
              </button>
            </div>
          </section>

          <section class="pm-step" data-step="2" aria-labelledby="step2-title">
            <h2 id="step2-title">
              <span class="pm-step-num">2</span>
              How do we reach you?
            </h2>
            <ContactFields contact={contact} errors={errors} />
            <div class="pm-hp" aria-hidden="true">
              <label for="hp_website">Leave this empty</label>
              <input id="hp_website" name="hp_website" type="text" tabindex={-1} autocomplete="off" />
            </div>
            <p class="form-note">
              By registering you agree to the <a href={`${ctx.site}/terms/`}>Terms</a> and{' '}
              <a href={`${ctx.site}/privacy-policy-en/`}>Privacy Policy</a>.
            </p>
            <div class="pm-actions">
              <button type="button" class="btn btn-ghost pm-js-only" data-back>
                Back
              </button>
              <button type="submit" class="btn btn-coral" data-submit>
                Send
              </button>
            </div>
          </section>
        </form>
      </div>
    </Layout>
  );
};

export const DonePage: FC<{ ctx: PageCtx; role: Role }> = ({ ctx, role }) => (
  <Layout ctx={ctx} title="Thanks" area="public" gaEvent="sign_up" gaRole={role}>
    <div class="pm-page pm-narrow">
      <span class="pm-done-icon" aria-hidden="true">✓</span>
      <h1>Thanks, we've got it</h1>
      <p class="lead">
        {role === 'seller'
          ? "Your details are with our team and we're already looking at your stock, so you may hear from us before your account is approved."
          : "Your details are with our team and we're already looking at what you need, so you may hear from us before your account is approved."}
      </p>
      <div class="pm-card">
        <h2 class="pm-card-title">What happens next</h2>
        <ol class="pm-next">
          <li>
            <strong>We check your company.</strong> Usually within one working day.
          </li>
          <li>
            <strong>You get an email.</strong> It has a sign-in link, so there's no password to remember.
          </li>
          <li>
            <strong>You use your account.</strong>{' '}
            {role === 'seller'
              ? 'Send more stock and follow each offer in one place.'
              : 'Add requests and follow them in one place.'}
          </li>
        </ol>
      </div>
      <p>
        <a href={ctx.site}>Back to pricemart.eu</a>
      </p>
    </div>
  </Layout>
);

export const SignInPage: FC<{ ctx: PageCtx; email?: string; error?: string; message?: string }> = ({ ctx, email, error, message }) => (
  <Layout ctx={ctx} title="Sign in" area="public">
    <div class="pm-page pm-narrow pm-slim">
      <h1>Sign in</h1>
      <p class="lead">Enter the email you registered with. We'll send you a sign-in link. No password needed.</p>
      <Flash message={message} />
      <form method="post" action="/signin" class="pm-form" novalidate>
        <div class="field">
          <label for="email">Work email</label>
          <input id="email" name="email" type="email" value={email ?? ''} autocomplete="email" required />
          {error ? <p class="pm-field-error">{error}</p> : null}
        </div>
        <button type="submit" class="btn btn-coral">
          Send me a sign-in link
        </button>
      </form>
      <p class="pm-muted pm-mt">
        Not registered yet? <a href="/register">Register</a>
      </p>
    </div>
  </Layout>
);

export const CheckEmailPage: FC<{ ctx: PageCtx; email: string }> = ({ ctx, email }) => (
  <Layout ctx={ctx} title="Check your email" area="public">
    <div class="pm-page pm-narrow pm-slim">
      <h1>Check your email</h1>
      <p class="lead">
        If <strong>{email}</strong> has a PriceMart account, a sign-in link is on its way. It works once and expires in 30
        minutes.
      </p>
      <p class="pm-muted">
        Nothing arrived? Check your spam folder, or <a href="/signin">try again</a>.
      </p>
    </div>
  </Layout>
);

export const AuthPage: FC<{ ctx: PageCtx; token: string; valid: boolean }> = ({ ctx, token, valid }) => (
  <Layout ctx={ctx} title="Sign in" area="public">
    <div class="pm-page pm-narrow pm-slim">
      {valid ? (
        <>
          <h1>Sign in to PriceMart</h1>
          <p class="lead">One click and you're in.</p>
          <form method="post" action="/auth" class="pm-form">
            <input type="hidden" name="token" value={token} />
            <button type="submit" class="btn btn-coral">
              Sign in
            </button>
          </form>
        </>
      ) : (
        <>
          <h1>This link has expired</h1>
          <p class="lead">Sign-in links work once and expire after a while. Ask for a new one below.</p>
          <p>
            <a class="btn btn-coral" href="/signin">
              Get a new link
            </a>
          </p>
        </>
      )}
    </div>
  </Layout>
);

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
