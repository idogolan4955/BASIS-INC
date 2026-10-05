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
    <article className={cn('@container flex min-h-32 flex-col justify-between rounded-xs border border-line bg-panel px-4 py-4', className)}>
      <h3 className="caps text-ink-soft">{label}</h3>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[2rem] leading-none tracking-[-0.01em] text-ink">{value}</p>
          <p className="mt-2.5 text-[0.8125rem] leading-snug text-ink-muted">{note}</p>
        </div>
        {visual && <div className="shrink-0">{visual}</div>}
      </div>
    </article>
  );
}

export function FigureTileSkeleton() {
  return (
    <div aria-hidden="true" className="min-h-32 rounded-xs border border-line bg-panel px-5 py-4">
      <div className="h-3 w-20 bg-sunken" />
      <div className="mt-6 h-8 w-24 bg-sunken" />
      <div className="mt-3 h-3 w-32 bg-sunken" />
    </div>
  );
}
