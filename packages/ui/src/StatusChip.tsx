import type { StatusTone } from '@basis/shared';
import type { ReactNode } from 'react';
import { cn } from './cn';

// A status is a swatch plus a word. The swatch differs by shape and fill as
// well as by colour, so it still reads in greyscale.

const TONE_TEXT: Record<StatusTone, string> = {
  positive: 'text-positive',
  caution: 'text-caution',
  critical: 'text-critical',
  transit: 'text-transit',
  neutral: 'text-neutral',
};

export function Swatch({ tone, className }: { tone: StatusTone; className?: string }) {
  const shape: Record<StatusTone, string> = {
    positive: 'bg-current',
    transit: 'border border-current [background:linear-gradient(90deg,currentColor_50%,transparent_50%)]',
    caution:
      'border border-current [background:repeating-linear-gradient(135deg,currentColor_0_1.5px,transparent_1.5px_3.5px)]',
    critical: 'bg-current rotate-45 scale-[0.82]',
    neutral: 'border border-current',
  };
  return (
    <span aria-hidden="true" className={cn('inline-block size-2.5 shrink-0', TONE_TEXT[tone], shape[tone], className)} />
  );
}

export function StatusChip({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[0.8125rem]', className)}>
      <Swatch tone={tone} />
      <span className={cn('font-medium', TONE_TEXT[tone])}>{children}</span>
    </span>
  );
}
