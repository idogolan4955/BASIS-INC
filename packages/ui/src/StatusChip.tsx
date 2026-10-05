import type { StatusTone } from '@basis/shared';
import type { ReactNode } from 'react';
import { cn } from './cn';

// A status is a dot and a word. The word carries the meaning; the dot's
// pigment repeats it, so nothing depends on colour alone.

const TONE_TEXT: Record<StatusTone, string> = {
  positive: 'text-positive',
  caution: 'text-caution',
  critical: 'text-critical',
  transit: 'text-transit',
  neutral: 'text-neutral',
};

const TONE_DOT: Record<StatusTone, string> = {
  positive: 'bg-positive',
  caution: 'bg-caution',
  critical: 'bg-critical',
  transit: 'bg-transit',
  neutral: 'border border-neutral bg-transparent',
};

export function Swatch({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', TONE_DOT[tone], className)} />;
}

export function StatusChip({ tone, children, className }: { tone: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap text-[0.875rem]', className)}>
      <Swatch tone={tone} />
      <span className={cn('font-medium', TONE_TEXT[tone])}>{children}</span>
    </span>
  );
}
