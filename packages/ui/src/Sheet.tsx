import type { ReactNode } from 'react';
import { cn } from './cn';

// The label header: a record's identity presented like a roll label.
// Number or code in mono, name, the status words, and the facts that matter.

export function LabelHeader({
  code,
  index,
  title,
  subtitle,
  status,
  facts,
  actions,
  visual,
}: {
  code: string;
  /** Brand index such as 01, when the record has one. */
  index?: string;
  title: string;
  subtitle?: ReactNode;
  status?: ReactNode;
  facts?: readonly { readonly label: string; readonly value: ReactNode }[];
  actions?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-panel">
      <div className="flex flex-col gap-6 px-5 py-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="flex min-w-0 gap-5">
          {visual && <div className="hidden size-24 shrink-0 overflow-hidden rounded-xs border border-line sm:block">{visual}</div>}
          <div className="min-w-0">
            <p className="code flex items-center gap-3 text-ink-muted">
              {index && <span className="text-ink">{index}</span>}
              <span>{code}</span>
            </p>
            <h1 className="mt-1.5 font-display text-[2.375rem] font-medium leading-none tracking-[-0.01em] text-ink lg:text-[2.875rem]">{title}</h1>
            {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
            {status && <div className="mt-3 flex flex-wrap items-center gap-4">{status}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {facts && facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-panel px-5 py-3 lg:px-8">
              <dt className="caps text-ink-muted">{fact.label}</dt>
              <dd className="mt-1 truncate text-sm text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

export function SheetTabs({ children }: { children: ReactNode }) {
  return (
    <nav aria-label="Sections" className="flex gap-6 overflow-x-auto border-b border-line bg-panel px-5 lg:px-8">
      {children}
    </nav>
  );
}

export function sheetTabClass(active: boolean): string {
  return cn(
    '-mb-px flex h-11 shrink-0 items-center border-b-2 text-sm transition-colors duration-150',
    active ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink',
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-line bg-panel px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-[0.8125rem] text-ink-muted">{children}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** A shade is always a circle: the one round swatch, as the brand booklet draws it. */
export function ShadeDot({ hex, name, code, size = 'md', className }: { hex: string; name: string; code?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dimension = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-14' : 'size-6';
  return (
    <span
      role="img"
      aria-label={code ? `${name} (${code})` : name}
      title={code ? `${name} · ${code}` : name}
      className={cn('inline-block shrink-0 rounded-full border border-charcoal/15', dimension, className)}
      style={{ backgroundColor: hex }}
    />
  );
}
