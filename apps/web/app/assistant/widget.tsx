import type { SiteActionView, SiteConversationView } from '@basis/shared';
import { cn } from '@basis/ui';
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router';
import { call } from '../account/data';
import { PortalLocale, useLocale, useT } from '../account/i18n';
import { IN_APP } from '../native/platform';

// The assistant on the brand site (docs/CUSTOMER_PORTAL_PLAN.md §9): a quiet
// tab at the edge of every page that opens a conversation. It says it is an
// AI; anything it would send waits on a card for the visitor's own click.
// Firebase loads only when it is opened.

const KEY = 'basis.site.assistant';

interface Stored {
  readonly conversationId: string;
  readonly sessionKey?: string;
}

function remembered(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function remember(value: Stored | null) {
  try {
    if (value) window.sessionStorage.setItem(KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Without storage the conversation lasts as long as the page.
  }
}

// Before anything is sent to the model, the person agrees to it (App Store
// guideline 5.1.2(i): personal data shared with a third-party AI needs
// explicit permission). Kept on the device; asked again if storage is cleared.
const CONSENT = 'basis.site.assistant.consent';

function consented(): boolean {
  try {
    return window.localStorage.getItem(CONSENT) === '1';
  } catch {
    return false;
  }
}

function giveConsent() {
  try {
    window.localStorage.setItem(CONSENT, '1');
  } catch {
    // Without storage the agreement lasts as long as the page.
  }
}

function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) parts.push(<strong key={match.index} className="font-semibold">{token.slice(2, -2)}</strong>);
    else {
      const [, label = '', href = ''] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      parts.push(href.startsWith('/') ? <Link key={match.index} to={href} className="underline decoration-nude-deep underline-offset-4">{label}</Link> : <a key={match.index} href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{label}</a>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Prose({ text }: { text: string }) {
  return (
    <div dir="auto" className="space-y-2 text-[0.9375rem] leading-relaxed">
      {text.trim().split(/\n{2,}/).map((block, index) => {
        const lines = block.split('\n');
        if (lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line))) {
          return (
            <ul key={index} className="list-disc space-y-1 ps-5 marker:text-ink-muted">
              {lines.map((line, item) => (
                <li key={item} dir="auto">{inline(line.replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} dir="auto">
            {lines.map((line, item) => (
              <Fragment key={item}>
                {item > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = { name: 'Name', company: 'Company', email: 'Email', country: 'Country', customerType: 'What you make', address: 'Address', products: 'Fabrics', shades: 'Shades', message: 'Note', question: 'Question', number: 'Quote', decision: 'Answer', reason: 'Why', requestedDelivery: 'Wanted by' };

function ActionCard({ action, onDecide, busy }: { action: SiteActionView; onDecide: (decision: 'confirm' | 'dismiss') => void; busy: boolean }) {
  const t = useT();
  const fields = Object.entries(action.input).filter(([key, value]) => key !== 'addressId' && value !== undefined && value !== null && !(Array.isArray(value) && value.length === 0));
  const reference = action.result && typeof action.result === 'object' ? ((action.result as { reference?: string; orderNumber?: string }).reference ?? (action.result as { orderNumber?: string }).orderNumber) : undefined;
  return (
    <div className="border border-charcoal/70 bg-bone">
      <p className="border-b border-charcoal/70 px-3 py-2 text-sm font-medium" dir="auto">
        {action.summary}
      </p>
      <dl className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] gap-x-3 gap-y-1 px-3 py-2 text-sm">
        {fields.map(([key, value]) => (
          <Fragment key={key}>
            <dt className="text-ink-muted">{t(FIELD_LABEL[key] ?? key)}</dt>
            <dd className="break-words" dir="auto">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </dd>
          </Fragment>
        ))}
      </dl>
      {action.state === 'proposed' ? (
        <div className="flex gap-2 border-t border-line px-3 py-2">
          <button type="button" disabled={busy} onClick={() => onDecide('confirm')} className="h-10 bg-charcoal px-4 text-sm font-medium text-milk hover:bg-cocoa disabled:opacity-60">
            {action.kind === 'answer_quote' ? t('Confirm') : t('Send')}
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide('dismiss')} className="h-10 px-3 text-sm text-ink-soft underline underline-offset-4 disabled:opacity-60">
            {t('Not now')}
          </button>
        </div>
      ) : (
        <p className={cn('border-t border-line px-3 py-2 text-sm', action.state === 'failed' ? 'text-critical' : 'text-ink-soft')}>
          {action.state === 'executed' ? `${t('Sent')}${reference ? ` · ${reference}` : ''}` : action.state === 'rejected' ? t('Not sent') : action.error || t('It could not be sent.')}
        </p>
      )}
    </div>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { locale, dir } = useLocale();
  const location = useLocation();
  const [view, setView] = useState<SiteConversationView | null>(null);
  const [text, setText] = useState('');
  const [asked, setAsked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(consented);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (consented()) input.current?.focus();
    const stored = remembered();
    if (!stored) return;
    call<object, SiteConversationView>('siteAssistantHistory', stored)
      .then(setView)
      .catch(() => remember(null));
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [view, busy]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const question = text.trim();
    if (!question || busy || !agreed) return;
    setBusy(true);
    setError('');
    setAsked(question);
    setText('');
    try {
      const stored = remembered();
      const next = await call<object, SiteConversationView>('siteAssistant', { ...(stored ?? {}), text: question, locale: locale === 'he' ? 'he' : navigator.language, page: location.pathname });
      if (next.sessionKey || !stored) remember({ conversationId: next.conversationId, ...(next.sessionKey ? { sessionKey: next.sessionKey } : stored?.sessionKey ? { sessionKey: stored.sessionKey } : {}) });
      setView(next);
    } catch (caught) {
      setText(question);
      setError(caught instanceof Error ? caught.message : t('The assistant cannot answer just now.'));
      if (caught instanceof Error && /not available/.test(caught.message)) remember(null);
    } finally {
      setAsked('');
      setBusy(false);
    }
  };

  const decide = async (action: SiteActionView, decision: 'confirm' | 'dismiss') => {
    const stored = remembered();
    if (!stored) return;
    setBusy(true);
    setError('');
    try {
      setView(await call<object, SiteConversationView>('siteAssistantDecide', { ...stored, actionId: action.id, decision }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('It could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const actions = new Map((view?.actions ?? []).map((action) => [action.toolUseId, action]));
  const restart = () => {
    remember(null);
    setView(null);
    setError('');
  };

  return (
    <section dir={dir} lang={locale} aria-label={t('BASIS assistant')} className={cn('fixed inset-x-2 z-40 flex flex-col border border-charcoal/70 bg-milk text-ink shadow-[0_18px_48px_-24px_rgb(43_39_36/0.45)]', IN_APP ? 'bottom-[calc(0.5rem+env(safe-area-inset-bottom))] h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-4rem),42rem)]' : 'bottom-2 h-[min(85dvh,42rem)] md:inset-x-auto md:bottom-6 md:end-6 md:w-[26rem]')}>
      <header className="flex items-start justify-between gap-3 border-b border-charcoal/70 px-4 py-3">
        <div>
          <p className="code uppercase tracking-[0.18em]">{t('BASIS assistant')}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {t('An AI. It can be wrong; a person in sales is a message away.')}{' '}
            <Link to="/legal/privacy" className="underline underline-offset-2">
              {t('Privacy')}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view && (
            <button type="button" onClick={restart} className="code h-9 px-1 uppercase tracking-[0.14em] text-ink-muted hover:text-ink">
              {t('New')}
            </button>
          )}
          <button type="button" onClick={onClose} className="code h-9 px-2 uppercase tracking-[0.14em] hover:text-ink">
            {t('Close')}
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {!view && !asked && (
          <div className="text-ink-soft">
            <p className="font-display text-[1.75rem] leading-none text-ink">{t('How can we help?')}</p>
            <p className="mt-3 text-sm">{t('Ask about the fabrics, the shades, how they behave in a gown, or samples.')}</p>
          </div>
        )}
        {!agreed && (
          <div className="mt-6 border border-charcoal/70 bg-bone p-4">
            <p className="code uppercase tracking-[0.18em] text-ink">{t('Before you ask')}</p>
            <p className="mt-2 text-sm text-ink-soft">
              {t('What you write here, and the records of your account the assistant reads to answer you, are sent to Anthropic, the company whose AI model the assistant runs on. Anthropic does not use them to train its models. BASIS keeps the conversation so that a person in sales can pick it up.')}{' '}
              <Link to="/legal/privacy" className="underline underline-offset-2">
                {t('Privacy')}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => {
                giveConsent();
                setAgreed(true);
                window.setTimeout(() => input.current?.focus(), 0);
              }}
              className="mt-4 h-11 bg-charcoal px-4 text-sm font-medium text-milk hover:bg-cocoa"
            >
              {t('Agree and continue')}
            </button>
          </div>
        )}
        <ol className="space-y-4">
          {view?.turns.map((turn) =>
            turn.items.map((item, index) => {
              if (item.kind === 'text' && item.role === 'user') {
                return (
                  <li key={`${turn.seq}-${index}`} className="border-s-2 border-charcoal ps-3 text-[0.9375rem]" dir="auto">
                    {item.text}
                  </li>
                );
              }
              if (item.kind === 'text') {
                return (
                  <li key={`${turn.seq}-${index}`}>
                    <Prose text={item.text} />
                  </li>
                );
              }
              if (item.kind === 'action') {
                const action = actions.get(item.toolUseId);
                return action ? (
                  <li key={`${turn.seq}-${index}`}>
                    <ActionCard action={action} busy={busy} onDecide={(decision) => void decide(action, decision)} />
                  </li>
                ) : null;
              }
              return (
                <li key={`${turn.seq}-${index}`} className="code text-ink-muted uppercase tracking-[0.14em]">
                  {t('Looked it up')}
                </li>
              );
            }),
          )}
          {asked && (
            <li className="border-s-2 border-charcoal ps-3 text-[0.9375rem]" dir="auto">
              {asked}
            </li>
          )}
          {busy && (
            <li role="status" className="code text-nude-deep uppercase tracking-[0.14em]">
              {t('Thinking')}…
            </li>
          )}
        </ol>
        <div ref={end} />
      </div>
      <form onSubmit={(event) => void send(event)} className="border-t border-charcoal/70 p-3">
        {error && (
          <p role="alert" className="mb-2 text-sm text-critical">
            {t(error)}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="site-assistant-input" className="sr-only">
            {t('Your question')}
          </label>
          <textarea id="site-assistant-input" ref={input} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={onKey} rows={2} dir="auto" disabled={!agreed} placeholder={t('Write your question')} className="max-h-40 min-h-[2.75rem] flex-1 resize-none border border-charcoal/40 bg-milk px-3 py-2 text-base outline-none focus:border-charcoal disabled:opacity-50" />
          <button type="submit" disabled={busy || !agreed || !text.trim()} className="h-11 bg-charcoal px-4 text-sm font-medium text-milk hover:bg-cocoa disabled:opacity-50">
            {t('Ask')}
          </button>
        </div>
      </form>
    </section>
  );
}

function Launcher({ placement }: { placement: 'float' | 'bar' }) {
  const t = useT();
  const { dir, locale } = useLocale();
  const [open, setOpen] = useState(false);
  // In the app the assistant is a word in the top bar, beside Index; on the site, a tab at the edge.
  if (placement === 'bar') {
    return (
      <>
        <button type="button" dir={dir} lang={locale} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className="code h-11 px-2 uppercase tracking-[0.18em]">
          {t('Ask BASIS')}
        </button>
        {/* Out of the bar's stacking context, so it lies over the tabs. */}
        {open && createPortal(<Panel onClose={() => setOpen(false)} />, document.body)}
      </>
    );
  }
  return open ? (
    <Panel onClose={() => setOpen(false)} />
  ) : (
    <button type="button" dir={dir} onClick={() => setOpen(true)} aria-haspopup="dialog" className={cn('fixed end-3 z-30 flex h-11 items-center gap-2 border border-charcoal bg-milk px-4 text-[0.875rem] font-medium text-ink shadow-[0_10px_30px_-18px_rgb(43_39_36/0.5)] hover:bg-bone', IN_APP ? 'bottom-[calc(4.25rem+env(safe-area-inset-bottom))]' : 'bottom-[5.5rem] md:bottom-6 md:end-6')}>
      <span aria-hidden="true" className="size-2.5 bg-nude-deep" />
      {t('Ask BASIS')}
    </button>
  );
}

/** Mounted once by the site shell (or the app's top bar); renders only in the browser. */
export function SiteAssistant({ placement = 'float' }: { placement?: 'float' | 'bar' }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return (
    <PortalLocale>
      <Launcher placement={placement} />
    </PortalLocale>
  );
}
