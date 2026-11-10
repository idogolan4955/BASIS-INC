import { CUSTOMER_ROLE_LABEL } from '@basis/shared';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { IN_APP } from '../native/platform';
import { call } from './data';
import { Alert } from './fields';
import { Button, Facts, PageTitle, portalMeta } from './frame';
import { LocaleSwitch, useLocale, useT } from './i18n';
import { signOut, useMe } from './session';

export const meta = () => portalMeta('Profile');

// The person's own login: who they are in the account, their language, the
// app's notifications, signing out, and deleting the login. Deleting removes
// the person; the company's records with BASIS stay with the company.

export default function Profile() {
  const t = useT();
  const { me, role } = useMe();
  return (
    <div className="grid max-w-2xl gap-12">
      <div>
        <PageTitle title={t('Profile')}>{t('Your own login to {account}.', { account: me.account.displayName })}</PageTitle>
        <Facts
          rows={[
            { k: t('Name'), v: me.name },
            { k: t('Email'), v: <span dir="ltr">{me.email}</span> },
            { k: t('Role'), v: t(CUSTOMER_ROLE_LABEL[role]) },
            { k: t('Member'), v: <span className="code" dir="ltr">{me.account.memberNumber}</span> },
          ]}
        />
      </div>
      <section>
        <h3 className="code uppercase tracking-[0.18em] text-ink-muted">{t('Language')}</h3>
        <div className="mt-3 flex items-center justify-between gap-4 border-y border-line py-3">
          <p className="text-ink-soft">{t('The account in English or in Hebrew.')}</p>
          <LocaleSwitch className="flex" />
        </div>
      </section>
      {IN_APP && <Notifications />}
      <section>
        <h3 className="code uppercase tracking-[0.18em] text-ink-muted">{t('Signing out')}</h3>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
          <p className="text-ink-soft">{IN_APP ? t('This iPhone stops receiving your notifications.') : t('This browser forgets your sign-in.')}</p>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('Sign out')}
          </Button>
        </div>
      </section>
      <DeleteLogin />
    </div>
  );
}

function Notifications() {
  const t = useT();
  const { locale } = useLocale();
  const [state, setState] = useState<'granted' | 'denied' | 'prompt' | 'loading'>('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void import('../native/push').then(({ pushState }) => pushState()).then(setState).catch(() => setState('prompt'));
  }, []);
  const enable = async () => {
    setBusy(true);
    try {
      const { enablePush } = await import('../native/push');
      setState(await enablePush(locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h3 className="code uppercase tracking-[0.18em] text-ink-muted">{t('Notifications')}</h3>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
        <p className="max-w-md text-ink-soft">
          {state === 'granted'
            ? t('On. This iPhone is told when BASIS sends you a quote and when a shipment arrives.')
            : state === 'denied'
              ? t('Off. Turn them on in the iPhone’s Settings, under Notifications, BASIS.')
              : t('Be told on this iPhone when BASIS sends you a quote and when a shipment arrives.')}
        </p>
        {state === 'prompt' && (
          <Button variant="secondary" busy={busy} onClick={() => void enable()}>
            {t('Turn on notifications')}
          </Button>
        )}
      </div>
    </section>
  );
}

function DeleteLogin() {
  const t = useT();
  const { me } = useMe();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remove = async () => {
    setError('');
    setBusy(true);
    try {
      await call<object, { deleted: boolean }>('deleteMyLogin', {});
      // The login no longer exists; what this device still holds of it goes too.
      await signOut().catch(() => undefined);
      navigate('/account/sign-in?deleted=1', { replace: true });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setError(/^You are the last admin of /.test(message) ? t('You are the last admin of {account}. Make a colleague admin on the Team page first, then delete your login.', { account: me.account.displayName }) : message || t('Your login could not be deleted. Write to BASIS.'));
      setBusy(false);
    }
  };
  return (
    <section>
      <h3 className="code uppercase tracking-[0.18em] text-critical">{t('Delete my login')}</h3>
      <div className="mt-3 border-y border-line py-4">
        <p className="text-ink-soft">
          {t('Deleting your login removes your access, your name and email from BASIS’s list of logins, your conversations with the assistant and your devices’ notifications. The quotes, orders, invoices and documents of {account} stay with the company, as its business records with BASIS.', { account: me.account.displayName })}
        </p>
        {error && (
          <div className="mt-4">
            <Alert>{error}</Alert>
          </div>
        )}
        {confirming ? (
          <div role="alertdialog" aria-label={t('Delete my login')} className="mt-5 border border-critical p-4">
            <p className="font-medium">{t('Delete the login of {email}? This cannot be undone.', { email: me.email })}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void remove()} disabled={busy} aria-busy={busy || undefined} className="inline-flex h-12 items-center bg-critical px-6 text-[0.9375rem] font-medium text-milk disabled:opacity-60">
                {busy ? t('Deleting') : t('Delete my login')}
              </button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
                {t('Keep my login')}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="mt-5 inline-flex h-12 items-center border border-critical px-6 text-[0.9375rem] font-medium text-critical">
            {t('Delete my login')}
          </button>
        )}
      </div>
    </section>
  );
}
