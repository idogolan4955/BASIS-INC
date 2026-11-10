import { CUSTOMER_ROLE_LABEL, CUSTOMER_ROLE_SUMMARY, type CustomerUserRole } from '@basis/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { call } from './data';
import { AuthFrame, Button, Loading, PortalRoot, portalMeta } from './frame';
import { Alert, Field } from './fields';
import { LocaleSwitch, useT } from './i18n';

export const meta = () => portalMeta('Your invitation');

interface Info {
  readonly state: 'open' | 'accepted' | 'revoked' | 'expired' | 'unknown';
  readonly email?: string;
  readonly name?: string;
  readonly role?: CustomerUserRole;
  readonly accountName?: string;
}

function Invite() {
  const t = useT();
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ token: string }, Info>('customerInvitationInfo', { token })
      .then(setInfo)
      .catch(() => setInfo({ state: 'unknown' }));
  }, [token]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== String(form.get('confirm') ?? '')) {
      setError(t('The two passwords are not the same.'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { email } = await call<{ token: string; name: string; password: string }, { email: string }>('acceptCustomerInvitation', { token, name: String(form.get('name') ?? '').trim(), password });
      const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/account', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The invitation could not be accepted.'));
      setBusy(false);
    }
  };

  if (!info) return <Loading />;
  if (info.state !== 'open') {
    const message = info.state === 'accepted' ? t('This invitation has been used. Sign in with your email and password.') : info.state === 'expired' ? t('This invitation has expired. Ask BASIS or your account admin for a new one.') : info.state === 'revoked' ? t('This invitation was withdrawn. Ask BASIS or your account admin for a new one.') : t('This invitation link is not valid. Check that it was copied whole.');
    return (
      <AuthFrame title={t('Your invitation')}>
        <div className="border border-charcoal/70 bg-milk p-6">
          <p>{message}</p>
          <Link to="/account/sign-in" className="mt-6 inline-flex h-12 items-center bg-charcoal px-6 font-medium text-milk hover:bg-cocoa">
            {t('Sign in')}
          </Link>
        </div>
      </AuthFrame>
    );
  }
  const role = info.role ?? 'buyer';
  return (
    <AuthFrame title={t('Welcome to BASIS')}>
      <form onSubmit={submit} className="grid gap-5 border border-charcoal/70 bg-milk p-6">
        <div className="flex items-center justify-between gap-4">
          <p className="code uppercase tracking-[0.18em]">{t('Your invitation')}</p>
          <LocaleSwitch className="flex" />
        </div>
        <p className="text-ink-soft">
          {t('You are invited to the {account} account at BASIS as {role}: {summary}', { account: info.accountName ?? '', role: t(CUSTOMER_ROLE_LABEL[role]).toLowerCase(), summary: t(CUSTOMER_ROLE_SUMMARY[role]) })}
        </p>
        <Field label={t('Email')} name="email" type="email" value={info.email ?? ''} readOnly dir="ltr" />
        <Field label={t('Your name')} name="name" required autoComplete="name" defaultValue={info.name ?? ''} />
        <Field label={t('Choose a password')} name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" help={t('At least 8 characters.')} />
        <Field label={t('The password again')} name="confirm" type="password" required minLength={8} autoComplete="new-password" dir="ltr" />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" busy={busy}>
          {busy ? t('Opening your account') : t('Open my account')}
        </Button>
      </form>
    </AuthFrame>
  );
}

export default function InvitePage() {
  return (
    <PortalRoot>
      <Invite />
    </PortalRoot>
  );
}
