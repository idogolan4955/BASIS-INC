import { X } from '@phosphor-icons/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

// A native dialog: escapes every container, traps focus, closes on Escape.
// Used for short forms that need protected focus; longer tasks get a flow page.

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-xs border border-line-strong bg-panel p-0 text-ink shadow-[0_24px_60px_-24px_rgb(43_39_36/0.45)] backdrop:bg-[rgb(43_37_34/0.42)]',
        className,
      )}
    >
      <form method="dialog" className="contents">
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 id="dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            {description && <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p>}
          </div>
          <button
            type="submit"
            aria-label="Close"
            className="-me-2 -mt-1 grid size-9 place-items-center rounded-xs text-ink-muted hover:bg-sunken hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
      </form>
      <div className="px-6 py-5">{children}</div>
      {footer && <footer className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">{footer}</footer>}
    </dialog>
  );
}
