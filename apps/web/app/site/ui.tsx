import { Structure, cn } from '@basis/ui';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Shade } from './catalog';

// The editorial component set: the hand, the index number, the round shade
// swatch, the label block, the material window. Tokens only.

/** A product name in the marker hand, as on the roll. */
export function Hand({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-hand leading-[0.95] tracking-[-0.01em] text-ink', className)}>{children}</span>;
}

/** Two-digit index in mono, as on a swatch book. */
export function Index({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('code text-ink-muted', className)}>{children}</span>;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('code uppercase tracking-[0.18em] text-ink-muted', className)}>{children}</p>;
}

/** A shade drawn as a circle: a circle is always a colour or a material. */
export function ShadeCircle({ shade, size = 'md', className }: { shade: Pick<Shade, 'name' | 'code' | 'hex'>; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizes = { sm: 'size-6', md: 'size-10', lg: 'size-20 md:size-28', xl: 'size-40 md:size-64' };
  return <span role="img" aria-label={`${shade.name} (${shade.code})`} className={cn('inline-block shrink-0 rounded-full border border-charcoal/10', sizes[size], className)} style={{ backgroundColor: shade.hex }} />;
}

/** A bordered block of facts in mono and caps, like a roll label. */
export function Label({ title, rows, className }: { title: string; rows: readonly { k: string; v: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('border border-charcoal/70 bg-milk', className)}>
      <div className="border-b border-charcoal/70 px-4 py-2">
        <span className="code uppercase tracking-[0.18em]">{title}</span>
      </div>
      {rows.map((row) => (
        <div key={row.k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
          <dt className="code uppercase tracking-[0.12em] text-ink-muted">{row.k}</dt>
          <dd className="text-sm text-ink">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The material, drawn from its construction over a shade. */
export function Material({ kind, hex = '#E6DBC8', scale = 2.2, className, label }: { kind: 'mesh' | 'lining' | 'tulle'; hex?: string; scale?: number; className?: string; label?: string }) {
  return (
    <div className={cn('relative overflow-hidden text-charcoal/60', className)} style={{ backgroundColor: hex }} role={label ? 'img' : undefined} aria-label={label}>
      <div aria-hidden="true" className="absolute inset-0">
        <Structure kind={kind} scale={scale} />
      </div>
    </div>
  );
}

export function Selvedge({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block w-[3px] self-stretch bg-nude-deep', className)} />;
}

export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn('px-4 py-16 md:px-12 md:py-28 lg:px-24', className)}>
      {children}
    </section>
  );
}

export function Display({ children, className, as: Tag = 'h2' }: { children: ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3' | 'p' }) {
  return <Tag className={cn('font-display font-normal leading-[0.92] tracking-[-0.02em] text-ink', className)}>{children}</Tag>;
}

export function Cta({ to, children, variant = 'primary', className }: { to: string; children: ReactNode; variant?: 'primary' | 'secondary'; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex h-12 items-center justify-center px-6 text-[0.9375rem] font-medium transition-colors duration-300',
        variant === 'primary' ? 'bg-charcoal text-milk hover:bg-cocoa' : 'border border-charcoal text-ink hover:bg-sand/60',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-charcoal/70', className)} />;
}
