import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthFrame, Button, PortalRoot, portalMeta } from './frame';
import { Alert, Field } from './fields';
import { LocaleSwitch, useT } from './i18n';
import { useSession } from './session';

export const meta = () => portalMeta('Sign in');

const safeNext = (next: string | null) => (next && next.startsWith('/account') ? next : '/account');

function SignIn() {
  const t = useT();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));

  useEffect(() => {
    if (session.status === 'ready') navigate(next, { replace: true });
  }, [session.status, navigate, next]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    try {
      const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      await signInWithEmailAndPassword(auth, String(form.get('email') ?? '').trim(), String(form.get('password') ?? ''));
    } catch (caught) {
      const code = typeof caught === 'object' && caught && 'code' in caught ? String((caught as { code: unknown }).code) : '';
      setError(code === 'auth/user-disabled' ? t('This login is suspended. Ask your account admin or BASIS.') : code === 'auth/too-many-requests' ? t('Too many attempts. Wait a few minutes or reset your password.') : t('The email or the password is not right.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('Your BASIS account')}>
      <form onSubmit={submit} className="grid gap-5 border border-charcoal/70 bg-milk p-6">
        <div className="flex items-center justify-between">
          <p className="code uppercase tracking-[0.18em]">{t('Sign in')}</p>
          <LocaleSwitch className="flex" />
        </div>
        <Field label={t('Email')} name="email" type="email" required autoComplete="email" dir="ltr" />
        <Field label={t('Password')} name="password" type="password" required autoComplete="current-password" dir="ltr" />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" busy={busy}>
          {busy ? t('Signing in') : t('Sign in')}
        </Button>
        <Link to="/account/reset" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
          {t('Forgot your password?')}
        </Link>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        {t('Trade accounts are opened by invitation.')}{' '}
        <Link to="/wholesale" className="underline underline-offset-4">
          {t('Apply for a trade account')}
        </Link>
      </p>
    </AuthFrame>
  );
}

export default function SignInPage() {
  return (
    <PortalRoot>
      <SignIn />
    </PortalRoot>
  );
}
