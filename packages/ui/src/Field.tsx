import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { cn } from './cn';

// Form language: label above, help beneath, the error attached to the field
// and announced. Units are part of the field, not free text.

const CONTROL =
  'w-full rounded-xs border bg-milk text-sm text-ink outline-none transition-colors duration-150 placeholder:text-ink-muted focus:border-charcoal disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-70';

function Frame({
  id,
  label,
  help,
  error,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  help?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('block', className)}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-ink-muted">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-critical">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-1.5 text-xs text-ink-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, help?: ReactNode): string | undefined {
  if (error) return `${id}-error`;
  if (help) return `${id}-help`;
  return undefined;
}

export function TextField({
  label,
  help,
  error,
  unit,
  className,
  id: givenId,
  required,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode; error?: string; unit?: string }) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <Frame id={id} label={label} help={help} error={error} required={required} className={className}>
      <div className="relative">
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, help)}
          className={cn(CONTROL, 'h-10 px-3', unit && 'pr-12', error ? 'border-critical' : 'border-line-strong')}
          {...rest}
        />
        {unit && <span className="code pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-muted">{unit}</span>}
      </div>
    </Frame>
  );
}

export function SelectField({
  label,
  help,
  error,
  className,
  id: givenId,
  required,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; help?: ReactNode; error?: string }) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <Frame id={id} label={label} help={help} error={error} required={required} className={className}>
      <select
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, help)}
        className={cn(CONTROL, 'h-10 px-3', error ? 'border-critical' : 'border-line-strong')}
        {...rest}
      >
        {children}
      </select>
    </Frame>
  );
}

export function TextArea({
  label,
  help,
  error,
  className,
  id: givenId,
  required,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; help?: ReactNode; error?: string }) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <Frame id={id} label={label} help={help} error={error} required={required} className={className}>
      <textarea
        id={id}
        required={required}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, help)}
        className={cn(CONTROL, 'px-3 py-2 leading-relaxed', error ? 'border-critical' : 'border-line-strong')}
        {...rest}
      />
    </Frame>
  );
}

export function CheckField({
  label,
  help,
  className,
  id: givenId,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; help?: ReactNode }) {
  const generated = useId();
  const id = givenId ?? generated;
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-3 text-sm', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-charcoal" {...rest} />
      <span>
        <span className="font-medium">{label}</span>
        {help && <span className="block text-xs text-ink-muted">{help}</span>}
      </span>
    </label>
  );
}
