import { CUSTOMER_ROLE_LABEL, type StatusTone } from '@basis/shared';
import { StatusChip, Wordmark, cn } from '@basis/ui';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Display, Eyebrow } from '../site/ui';
import { IN_APP } from '../native/platform';
import { LocaleSwitch, PortalLocale, useLocale, useT } from './i18n';
import { PortalSession, signOut, useSession } from './session';

// The account frame inside the brand site: the account named large, its
// member number on a label, and the index of what the customer has with
// BASIS, numbered as on a swatch book.

export const SECTIONS = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/account/quotes', label: 'Quotes' },
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/shipments', label: 'Shipments' },
  { to: '/account/invoices', label: 'Invoices' },
  { to: '/account/documents', label: 'Documents' },
  { to: '/account/samples', label: 'Samples' },
  { to: '/account/team', label: 'Team' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/profile', label: 'Profile' },
] as const;

export const portalMeta = (title: string) => [{ title: `${title} · BASIS INC.` }, { name: 'robots', content: 'noindex, nofollow' }];

/** The language and the session for every page under /account. */
export function PortalRoot({ children }: { children: ReactNode }) {
  return (
    <PortalLocale>
      <PortalSession>
        <Directed>{children}</Directed>
      </PortalSession>
    </PortalLocale>
  );
}

function Directed({ children }: { children: ReactNode }) {
  const { dir, locale } = useLocale();
  return (
    <div dir={dir} lang={locale} className="min-h-[60dvh]">
      {children}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useT();
  return (
    <div role="status" className="px-4 py-24 md:px-12 lg:px-24">
      <span className="code uppercase tracking-[0.18em] text-ink-muted">{label ?? t('Loading')}…</span>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="px-4 py-20 md:px-12 lg:px-24">
      <Display as="h1" className="max-w-3xl text-[clamp(2.25rem,6vw,4.5rem)]">
        {title}
      </Display>
      <div className="mt-6 max-w-xl text-lg text-ink-soft">{children}</div>
    </section>
  );
}

function AccountGate() {
  const { session } = useSession();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (session.status === 'signed_out') navigate(`/account/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
  }, [session.status, location.pathname, location.search, navigate]);
  if (session.status === 'loading' || session.status === 'signed_out') return <Loading />;
  if (session.status === 'not_customer') {
    return (
      <Notice title={t('This is a BASIS staff login.')}>
        <p>{t('The account pages are for BASIS customers. Staff work in the platform.')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="https://basis-inc-hq.web.app" className="inline-flex h-12 items-center bg-charcoal px-6 font-medium text-milk hover:bg-cocoa">
            {t('Open the platform')}
          </a>
          <button type="button" onClick={() => void signOut()} className="inline-flex h-12 items-center border border-charcoal px-6 font-medium hover:bg-sand/60">
            {t('Sign out')}
          </button>
        </div>
      </Notice>
    );
  }
  if (session.status === 'inactive') {
    return (
      <Notice title={t('This account is not open.')}>
        <p>{t('{email} has no active place in a BASIS customer account. If you were invited, use the link in the invitation; otherwise write to us.', { email: session.email })}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/contact" className="inline-flex h-12 items-center bg-charcoal px-6 font-medium text-milk hover:bg-cocoa">
            {t('Write to BASIS')}
          </Link>
          <button type="button" onClick={() => void signOut()} className="inline-flex h-12 items-center border border-charcoal px-6 font-medium hover:bg-sand/60">
            {t('Sign out')}
          </button>
        </div>
      </Notice>
    );
  }
  return <AccountFrame />;
}

function AccountFrame() {
  const { session } = useSession();
  const t = useT();
  const nav = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // On a phone the index scrolls sideways: keep the current page's entry in view.
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);
  if (session.status !== 'ready') return null;
  const { me } = session;
  const company = me.account.company;
  // In the app the account is named large on the overview; deeper pages keep a single line.
  const slim = IN_APP && pathname !== '/account';
  return (
    <div className={cn('px-4 pb-20 md:px-12 md:pt-14 lg:px-24', slim ? 'pt-5' : 'pt-10')}>
      {slim ? (
        <header className="flex items-baseline justify-between gap-4 border-b border-charcoal/70 pb-3">
          <p className="min-w-0 truncate font-display text-[1.375rem] leading-none">{me.account.displayName}</p>
          <span className="code shrink-0 text-ink-muted" dir="ltr">
            {me.account.memberNumber}
          </span>
        </header>
      ) : (
        <header className="grid gap-8 border-b border-charcoal/70 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <Eyebrow>{me.account.kind === 'trade' ? t('Trade account') : t('Account')}</Eyebrow>
            <Display as="h1" className="mt-3 break-words text-[clamp(2.5rem,7vw,5.5rem)]">
              {me.account.displayName}
            </Display>
            <p className="mt-4 text-ink-soft">
              {t('Signed in as {name}', { name: me.name })} · {t(CUSTOMER_ROLE_LABEL[me.role as unknown as keyof typeof CUSTOMER_ROLE_LABEL])}
            </p>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <dl className="border border-charcoal/70 bg-milk">
              <div className="border-b border-charcoal/70 px-4 py-1.5">
                <dt className="code uppercase tracking-[0.18em] text-ink-muted">{t('Member')}</dt>
              </div>
              <dd className="code px-4 py-2 text-lg text-ink" dir="ltr">
                {me.account.memberNumber}
              </dd>
              {company?.country && (
                <dd className="border-t border-line px-4 py-1.5 text-sm text-ink-soft">
                  {company.legalName} · {company.country.name}
                </dd>
              )}
            </dl>
            {/* In the app the language and signing out live in Profile. */}
            {!IN_APP && (
              <div className="flex items-center gap-4">
                <LocaleSwitch className="flex" />
                <button type="button" onClick={() => void signOut()} className="code h-9 uppercase tracking-[0.14em] text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {t('Sign out')}
                </button>
              </div>
            )}
          </div>
        </header>
      )}
      <div className={cn('grid gap-10', slim ? 'mt-6' : 'mt-8', !IN_APP && 'lg:grid-cols-[13rem_minmax(0,1fr)]')}>
        {/* In the app the tabs and More carry the index. */}
        {!IN_APP && (
          <nav ref={nav} aria-label={t('Your account')} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
            <ol className="flex gap-1 lg:flex-col lg:gap-0 lg:border-t lg:border-line">
              {SECTIONS.map((section, index) => (
                <li key={section.to} className="shrink-0">
                  <NavLink
                    to={section.to}
                    end={'end' in section}
                    className={({ isActive }) =>
                      cn(
                        'flex h-11 items-center gap-3 whitespace-nowrap border-b-2 px-2 text-[0.9375rem] lg:h-12 lg:border-b lg:border-s-[3px] lg:border-b-line lg:ps-3',
                        isActive ? 'border-b-charcoal text-ink lg:border-s-nude-deep lg:border-b-line' : 'border-transparent text-ink-soft hover:text-ink lg:border-s-transparent',
                      )
                    }
                  >
                    <span className="code text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
                    {t(section.label)}
                  </NavLink>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function AccountLayout() {
  return (
    <PortalRoot>
      <AccountGate />
    </PortalRoot>
  );
}

// ---------------------------------------------------------------- page parts

export function PageTitle({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] font-normal leading-none tracking-[-0.02em]">{title}</h2>
        {children && <p className="mt-3 max-w-2xl text-ink-soft">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border-y border-line py-10 text-ink-soft">{children}</p>;
}

export function Failed({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div role="alert" className="border-y border-critical/40 py-6">
      <p className="text-critical">{t(message)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm underline underline-offset-4">
          {t('Try again')}
        </button>
      )}
    </div>
  );
}

export function Chip({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <StatusChip tone={tone}>{children}</StatusChip>;
}

/** A ruled ledger: rows link to the record; numbers in mono. */
export function Ledger({ head, children }: { head: readonly string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-[0.9375rem]">
        <thead>
          <tr className="border-y border-charcoal/70">
            {head.map((cell, index) => (
              <th key={index} scope="col" className="code px-3 py-2.5 text-start font-normal uppercase tracking-[0.14em] text-ink-muted first:ps-0">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ to, children }: { to?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <tr
      className={cn('border-b border-line', to && 'cursor-pointer hover:bg-sand/40')}
      onClick={to ? () => navigate(to) : undefined}
    >
      {children}
    </tr>
  );
}

export function Cell({ children, className, code }: { children: ReactNode; className?: string; code?: boolean }) {
  return (
    <td className={cn('px-3 py-3 align-top first:ps-0', code && 'code whitespace-nowrap', className)} dir={code ? 'ltr' : undefined}>
      {children}
    </td>
  );
}

export function Facts({ rows }: { rows: readonly { k: string; v: ReactNode }[] }) {
  return (
    <dl className="border border-charcoal/70 bg-milk">
      {rows.map((row) => (
        <div key={row.k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
          <dt className="code uppercase tracking-[0.12em] text-ink-muted">{row.k}</dt>
          <dd className="text-sm text-ink">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Back({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="code mb-6 inline-flex h-9 items-center uppercase tracking-[0.14em] text-ink-muted hover:text-ink">
      <span aria-hidden="true" className="me-2 inline-block rtl:-scale-x-100">
        ←
      </span>
      {children}
    </Link>
  );
}

export function Button({ children, onClick, variant = 'primary', busy, disabled, type = 'button', className }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'quiet'; busy?: boolean; disabled?: boolean; type?: 'button' | 'submit'; className?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'inline-flex h-12 items-center justify-center px-6 text-[0.9375rem] font-medium transition-colors duration-300 disabled:opacity-60',
        variant === 'primary' && 'bg-charcoal text-milk hover:bg-cocoa',
        variant === 'secondary' && 'border border-charcoal text-ink hover:bg-sand/60',
        variant === 'quiet' && 'h-9 px-0 text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-12 px-4 py-14 md:px-12 md:py-20 lg:grid-cols-[1fr_minmax(0,28rem)] lg:px-24">
      <div>
        {/* The app's own bar already carries the wordmark. */}
        {!IN_APP && <Wordmark className="mb-8 text-base" />}
        <Display as="h1" className="text-[clamp(2.5rem,7vw,5.5rem)]">
          {title}
        </Display>
      </div>
      <div>{children}</div>
    </section>
  );
}
