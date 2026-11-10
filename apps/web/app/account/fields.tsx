import type { ReactNode } from 'react';

// Form fields in the site's register: mono caps labels, square inputs.

const field = 'h-12 w-full border border-charcoal/40 bg-milk px-3 text-base text-ink outline-none transition-colors duration-300 placeholder:text-ink-muted focus:border-charcoal';

export function Field({ label, name, type = 'text', required, autoComplete, defaultValue, value, onChange, help, dir, minLength, readOnly }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string; defaultValue?: string; value?: string; onChange?: (value: string) => void; help?: string; dir?: 'ltr' | 'rtl' | 'auto'; minLength?: number; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        dir={dir}
        minLength={minLength}
        readOnly={readOnly}
        className={`${field} ${readOnly ? 'bg-bone text-ink-soft' : ''}`}
      />
      {help && <span className="mt-1.5 block text-sm text-ink-muted">{help}</span>}
    </label>
  );
}

export function Choice({ label, name, value, onChange, children, required }: { label: string; name: string; value?: string; onChange?: (value: string) => void; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>
      <select name={name} value={value} required={required} onChange={onChange ? (event) => onChange(event.target.value) : undefined} className={field}>
        {children}
      </select>
    </label>
  );
}

export function Area({ label, name, rows = 4, value, onChange }: { label: string; name: string; rows?: number; value?: string; onChange?: (value: string) => void }) {
  return (
    <label className="block">
      <span className="code mb-1.5 block uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      <textarea name={name} rows={rows} value={value} onChange={onChange ? (event) => onChange(event.target.value) : undefined} dir="auto" className={`${field} h-auto py-3`} />
    </label>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-critical">
      {children}
    </p>
  );
}
