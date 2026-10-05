import { modulesFor } from '@basis/shared';
import { cn } from '@basis/ui';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useRequiredSession } from '../session';

// Jump anywhere by name or index number. Records join the list as their
// modules are built; today it reaches the Gateway and every module.

interface Destination {
  readonly number: string;
  readonly name: string;
  readonly summary: string;
  readonly path: string;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const session = useRequiredSession();
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const destinations = useMemo<Destination[]>(
    () => [
      { number: '00', name: 'Gateway', summary: 'What needs attention, what is moving', path: '/' },
      ...modulesFor(session.role).map(({ number, name, summary, path }) => ({ number, name, summary, path })),
    ],
    [session.role],
  );

  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return destinations;
    return destinations.filter(
      (destination) =>
        destination.name.toLowerCase().includes(text) ||
        destination.number.includes(text) ||
        destination.summary.toLowerCase().includes(text),
    );
  }, [destinations, query]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setQuery('');
      setCursor(0);
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const go = (destination: Destination | undefined) => {
    if (!destination) return;
    onClose();
    navigate(destination.path);
  };

  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Jump to"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
    >
      <div className="flex h-12 items-center gap-3 border-b border-line px-4">
        <MagnifyingGlass size={18} weight="light" aria-hidden="true" className="text-ink-muted" />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((value) => Math.min(value + 1, matches.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((value) => Math.max(value - 1, 0));
            } else if (event.key === 'Enter') {
              event.preventDefault();
              go(matches[cursor]);
            }
          }}
          placeholder="Module name or index number"
          aria-label="Module name or index number"
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted"
        />
        <kbd className="code rounded-xs border border-line px-1.5 py-0.5 text-ink-muted">esc</kbd>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto py-1.5">
        {matches.map((destination, index) => (
          <li key={destination.path}>
            <button
              type="button"
              onClick={() => go(destination)}
              onMouseEnter={() => setCursor(index)}
              className={cn('flex h-11 w-full items-center gap-4 px-4 text-left', index === cursor && 'bg-bone')}
            >
              <span className="code w-5 text-ink-muted">{destination.number}</span>
              <span className="w-32 shrink-0 text-sm font-medium">{destination.name}</span>
              <span className="truncate text-[0.8125rem] text-ink-muted">{destination.summary}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && (
          <li className="px-4 py-6 text-[0.8125rem] text-ink-muted">
            Nothing matches. Try a module name such as Logistics, or its number, 07.
          </li>
        )}
      </ul>
    </dialog>
  );
}
