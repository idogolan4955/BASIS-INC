import { Wordmark } from '@basis/ui';

// Shown outside sample mode until sign-in is wired to Firebase Auth.

export function NotConnected() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-5">
      <div className="w-full max-w-md">
        <Wordmark className="text-lg text-ink" />
        <h1 className="mt-10 font-display text-[2.25rem] leading-tight">Sign-in is not connected yet</h1>
        <p className="mt-4 text-ink-soft">
          Accounts and the data connection arrive with the next step of the foundation. Until then the interface runs
          on sample records.
        </p>
        <p className="mt-6 border-t border-line pt-5 text-ink-muted">
          Start it with <code className="code bg-sunken px-1.5 py-0.5 text-ink">pnpm --filter @basis/platform dev:sample</code>
        </p>
      </div>
    </main>
  );
}
