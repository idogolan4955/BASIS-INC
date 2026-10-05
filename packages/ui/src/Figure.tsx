import type { ReactNode } from 'react';
import { cn } from './cn';

// One business figure: what it is, the number, what the number means, and a
// small drawing of the data behind it. The figure is set in the display face.

export function FigureTile({
  label,
  value,
  note,
  visual,
  className,
}: {
  label: string;
  value: string;
  note: ReactNode;
  visual?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn('@container flex min-h-32 flex-col justify-between rounded-[var(--radius-panel)] border border-line bg-panel px-5 py-4', className)}>
      <h3 className="caps text-ink">{label}</h3>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[2.375rem] font-medium leading-none tracking-[-0.005em] text-ink">{value}</p>
          <p className="mt-2 text-[0.875rem] leading-snug text-ink-soft">{note}</p>
        </div>
        {visual && <div className="shrink-0">{visual}</div>}
      </div>
    </article>
  );
}

export function FigureTileSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-32 rounded-[var(--radius-panel)] border border-line bg-panel px-5 py-4">
      <div className="h-3 w-20 bg-sunken" />
      <div className="mt-6 h-8 w-24 bg-sunken" />
      <div className="mt-3 h-3 w-32 bg-sunken" />
    </div>
  );
}
