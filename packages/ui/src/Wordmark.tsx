import { cn } from './cn';

// BASIS in the architectural sans, wide and tracked. Stands in for the drawn
// wordmark until the brand artwork is supplied.

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      dir="ltr"
      className={cn('inline-flex items-baseline gap-[0.5em] font-brand uppercase leading-none', className)}
      aria-label="BASIS INC."
    >
      <span aria-hidden="true" className="font-bold tracking-[0.3em] [font-stretch:118%]">
        Basis
      </span>
      <span aria-hidden="true" className="text-[0.62em] font-medium tracking-[0.26em] opacity-70">
        Inc.
      </span>
    </span>
  );
}
