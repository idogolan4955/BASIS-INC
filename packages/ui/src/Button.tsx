import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

// Square geometry, one primary action per view. Pressing nudges the button
// down a pixel; a busy button keeps its size and says what it is doing.

type Variant = 'primary' | 'secondary' | 'quiet' | 'destructive';
type Size = 'sm' | 'md';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-charcoal text-milk hover:bg-black',
  secondary: 'border border-line-strong bg-panel text-ink hover:border-charcoal',
  quiet: 'text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink hover:decoration-ink',
  destructive: 'border border-critical text-critical hover:bg-critical/10',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-10 px-4 text-sm',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  busyLabel,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  busy?: boolean;
  busyLabel?: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
        VARIANT[variant],
        variant === 'quiet' ? 'px-0' : SIZE[size],
        className,
      )}
      {...rest}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
