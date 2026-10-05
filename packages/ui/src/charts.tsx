import { cn } from './cn';

// Small data graphics for figure tiles. Each one carries a text alternative,
// and none depends on colour alone.

export function Sparkline({
  values,
  label,
  className,
}: {
  values: readonly number[];
  /** Read by assistive technology in place of the drawing. */
  label: string;
  className?: string;
}) {
  const width = 72;
  const height = 36;
  const pad = 3;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = pad + (index * (width - pad * 2)) / (values.length - 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = points[points.length - 1] ?? [0, 0];
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-9 w-[4.5rem] overflow-visible', className)}
    >
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} className="stroke-line" strokeWidth="1" />
      <path d={path} fill="none" className="stroke-accent" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <rect x={last[0] - 2.5} y={last[1] - 2.5} width="5" height="5" className="fill-ink" />
    </svg>
  );
}

export function Ring({ percent, label, className }: { percent: number; label: string; className?: string }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return (
    <svg role="img" aria-label={label} viewBox="0 0 48 48" className={cn('size-11 -rotate-90', className)}>
      <circle cx="24" cy="24" r={radius} fill="none" className="stroke-line" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        className="stroke-accent"
        strokeWidth="5"
        strokeDasharray={`${filled} ${circumference}`}
      />
    </svg>
  );
}

export function Bars({
  items,
  label,
  className,
}: {
  items: readonly { readonly code: string; readonly value: number; readonly title: string }[];
  label: string;
  className?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div role="img" aria-label={label} className={cn('flex h-11 items-end gap-1.5', className)}>
      {items.map((item) => (
        <div key={item.code} title={item.title} className="flex h-full w-5 flex-col items-center justify-end gap-1">
          <div className="w-full bg-accent" style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
          <span className="code text-[0.5625rem] leading-none text-ink-muted">{item.code}</span>
        </div>
      ))}
    </div>
  );
}

/** One thin lane per shipment, with a mark at its position along the route. */
export function Lanes({ progress, label, className }: { progress: readonly number[]; label: string; className?: string }) {
  return (
    <div role="img" aria-label={label} className={cn('flex h-9 w-16 flex-col justify-center gap-[7px]', className)}>
      {progress.map((value, index) => (
        <div key={index} className="relative h-px bg-line-strong">
          <span
            className="absolute top-1/2 size-[5px] -translate-x-1/2 -translate-y-1/2 bg-ink"
            style={{ left: `${Math.max(0, Math.min(1, value)) * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** A thin fulfilment bar for table cells, with its value written beside it. */
export function Meter({ value, className }: { value: number; className?: string }) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative block h-[3px] w-12 bg-line">
        <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${percent}%` }} />
      </span>
      <span className="code w-8 text-ink-muted">{percent}%</span>
    </span>
  );
}
