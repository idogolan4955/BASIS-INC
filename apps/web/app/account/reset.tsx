import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AuthFrame, Button, PortalRoot, portalMeta } from './frame';
import { Field } from './fields';
import { useLocale, useT } from './i18n';
import { siteOrigin } from '../native/platform';

export const meta = () => portalMeta('Reset your password');

function Reset() {
  const t = useT();
  const { locale } = useLocale();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true);
    try {
      const [{ auth }, { sendPasswordResetEmail }] = await Promise.all([import('./firebase'), import('firebase/auth')]);
      auth.languageCode = locale;
      await sendPasswordResetEmail(auth, email, { url: `${siteOrigin()}/account/sign-in` });
    } catch {
      // The answer is the same whether or not the address has an account.
    } finally {
      setBusy(false);
      setSent(true);
    }
  };
  return (
    <AuthFrame title={t('Reset your password')}>
      {sent ? (
        <div className="border border-charcoal/70 bg-milk p-6">
          <p>{t('If that address has a BASIS account, a link to choose a new password is on its way.')}</p>
          <Link to="/account/sign-in" className="mt-6 inline-flex h-12 items-center bg-charcoal px-6 font-medium text-milk hover:bg-cocoa">
            {t('Back to sign in')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-5 border border-charcoal/70 bg-milk p-6">
          <Field label={t('Email')} name="email" type="email" required autoComplete="email" dir="ltr" />
          <Button type="submit" busy={busy}>
            {t('Send the link')}
          </Button>
          <Link to="/account/sign-in" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            {t('Back to sign in')}
          </Link>
        </form>
      )}
    </AuthFrame>
  );
}

export default function ResetPage() {
  return (
    <PortalRoot>
      <Reset />
    </PortalRoot>
  );
}
