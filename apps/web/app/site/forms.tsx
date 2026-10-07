import { useState, type FormEvent, type ReactNode } from 'react';

// Intake forms post to the api function (same origin in production, the
// emulator in development). Context travels with every submission: the page
// it came from and what was selected.

const API = import.meta.env.DEV ? 'http://127.0.0.1:5001/basis-inc/europe-west1/api' : '/api';

export type InquiryKind = 'sample_request' | 'wholesale' | 'contact';

export async function submitInquiry(kind: InquiryKind, fields: Record<string, string | string[]>): Promise<{ reference: string }> {
  const response = await fetch(`${API}/inquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...fields, context: { page: window.location.pathname + window.location.search, referrer: document.referrer || null } }),
  });
  const body = (await response.json().catch(() => ({}))) as { reference?: string; message?: string };
  if (!response.ok) throw new Error(body.message ?? 'The request could not be sent. Write to us instead.');
  return { reference: body.reference ?? '' };
}

const field = 'h-12 w-full border border-charcoal/40 bg-milk px-3 text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink-muted focus:border-charcoal';

export function Input({ label, name, type = 'text', required, placeholder, autoComplete, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; autoComplete?: string; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input name={name} type={type} required={required} placeholder={placeholder} autoComplete={autoComplete} defaultValue={defaultValue} className={field} />
    </label>
  );
}

export function Select({ label, name, required, children, defaultValue }: { label: string; name: string; required?: boolean; children: ReactNode; defaultValue?: string }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <select name={name} required={required} defaultValue={defaultValue} className={field}>
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, name, rows = 4, placeholder }: { label: string; name: string; rows?: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      <textarea name={name} rows={rows} placeholder={placeholder} className={`${field} h-auto py-3`} />
    </label>
  );
}

export function Checks({ label, name, options }: { label: string; name: string; options: readonly { value: string; label: ReactNode; checked?: boolean }[] }) {
  return (
    <fieldset>
      <legend className="code mb-2 uppercase tracking-[0.14em] text-ink-muted">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-3 border border-line bg-milk px-3 py-2.5 text-sm has-checked:border-charcoal">
            <input type="checkbox" name={name} value={option.value} defaultChecked={option.checked} className="size-4 accent-charcoal" />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Wraps a form: collects fields, posts, reports; a honeypot field is left for bots. */
export function IntakeForm({ kind, children, submitLabel, onDone }: { kind: InquiryKind; children: ReactNode; submitLabel: string; onDone: (reference: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const fields: Record<string, string | string[]> = {};
    for (const [key, value] of data.entries()) {
      if (typeof value !== 'string') continue;
      const existing = fields[key];
      fields[key] = existing === undefined ? value : Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
    setBusy(true);
    try {
      const { reference } = await submitInquiry(kind, fields);
      onDone(reference);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The request could not be sent.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-5">
      {children}
      <div className="absolute -start-[9999px] top-0" aria-hidden="true">
        <label>
          Leave this empty <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-critical">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="inline-flex h-12 items-center bg-charcoal px-6 text-[0.9375rem] font-medium text-milk transition-colors duration-300 hover:bg-cocoa disabled:opacity-60">
          {busy ? 'Sending' : submitLabel}
        </button>
        <span className="text-sm text-ink-muted">* required</span>
      </div>
    </form>
  );
}
