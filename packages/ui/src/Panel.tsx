import type { ReactNode } from 'react';
import { cn } from './cn';

// A ruled region on the grid: hairline frame, title in tracked capitals,
// one optional action on the right. No shadow, no elevation.

export function Panel({
  title,
  count,
  action,
  children,
  className,
  id,
  flush = false,
}: {
  title: string;
  /** Shown beside the title, e.g. the number of open items. */
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  /** Body runs edge to edge (tables, ledgers). */
  flush?: boolean;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('rounded-[var(--radius-panel)] border border-line bg-panel', className)}>
      <header className="flex min-h-[3.25rem] items-center justify-between gap-4 border-b border-line px-5">
        <h2 id={headingId} className="caps flex items-baseline gap-2.5 text-ink">
          {title}
          {count !== undefined && <span className="code text-ink-muted">{String(count).padStart(2, '0')}</span>}
        </h2>
        {action}
      </header>
      <div className={flush ? undefined : 'p-5'}>{children}</div>
    </section>
  );
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-ink-muted">{children}</p>;
}
