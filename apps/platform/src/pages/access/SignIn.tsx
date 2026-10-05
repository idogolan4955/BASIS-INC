import { Wordmark, cn } from '@basis/ui';
import { useId, useState, type FormEvent } from 'react';

// Accounts are created by invitation. The form asks for exactly what it needs
// and names the problem when something is wrong.

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'error'; message: string } | { kind: 'reset_sent' };

function messageFor(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is not right.';
    case 'auth/invalid-email':
      return 'That is not a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check the network and try again.';
    case 'auth/user-disabled':
      return 'This account is suspended. Ask an owner.';
    default:
      return 'Sign-in failed. Try again, and ask an owner if it keeps failing.';
  }
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  type: 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid: boolean;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        className={cn(
          'h-10 w-full rounded-xs border bg-milk px-3 text-sm text-ink outline-none transition-colors duration-150',
          'placeholder:text-ink-muted focus:border-charcoal',
          invalid ? 'border-critical' : 'border-line-strong',
        )}
      />
    </label>
  );
}

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const emailId = useId();
  const passwordId = useId();
  const busy = status.kind === 'busy';
  const invalid = status.kind === 'error';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus({ kind: 'busy' });
    try {
      const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([import('../../lib/firebase'), import('firebase/auth')]);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // The session provider takes over from here.
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: unknown }).code) : '';
      setStatus({ kind: 'error', message: messageFor(code) });
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setStatus({ kind: 'error', message: 'Enter the email address first, then choose reset.' });
      return;
    }
    setStatus({ kind: 'busy' });
    try {
      const [{ auth }, { sendPasswordResetEmail }] = await Promise.all([import('../../lib/firebase'), import('firebase/auth')]);
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      // The outcome is the same message either way, so an address cannot be probed.
    }
    setStatus({ kind: 'reset_sent' });
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <Wordmark className="text-lg text-ink" />
        <h1 className="mt-10 font-display text-[2.5rem] font-medium leading-none tracking-[-0.01em]">Sign in</h1>
        <p className="mt-3 text-ink-muted">Accounts are created by invitation from an owner.</p>

        <form onSubmit={submit} noValidate className="mt-8 space-y-4" aria-busy={busy}>
          <Field id={emailId} label="Email" type="email" value={email} onChange={setEmail} autoComplete="username" invalid={invalid} />
          <Field
            id={passwordId}
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            invalid={invalid}
          />

          {status.kind === 'error' && (
            <p role="alert" className="text-[0.8125rem] font-medium text-critical">
              {status.message}
            </p>
          )}
          {status.kind === 'reset_sent' && (
            <p role="status" className="text-[0.8125rem] text-ink-soft">
              If an account exists for that address, a link to set a new password is on its way.
            </p>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-[0.8125rem] text-ink-soft underline decoration-line-strong underline-offset-4 hover:decoration-ink disabled:opacity-50"
            >
              Reset password
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-xs bg-charcoal px-5 text-sm font-medium text-milk transition-[transform,opacity] duration-150 active:translate-y-px disabled:opacity-60"
            >
              {busy ? 'Signing in' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export function NoRole({ email, signOut }: { email: string; signOut: () => Promise<void> }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-5">
      <div className="w-full max-w-md">
        <Wordmark className="text-lg text-ink" />
        <h1 className="mt-10 font-display text-[2.25rem] font-medium leading-tight">No role assigned yet</h1>
        <p className="mt-4 text-ink-soft">
          {email} is signed in, but an owner has not given this account a role. Nothing can be opened until one is set.
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-8 h-10 rounded-xs border border-line-strong px-5 text-sm font-medium hover:border-charcoal"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}

export function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface" aria-busy="true" aria-label="Loading">
      <Wordmark className="text-lg text-ink-muted" />
    </main>
  );
}
