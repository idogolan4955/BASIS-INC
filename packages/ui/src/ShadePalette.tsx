import type { ReactNode } from 'react';
import { cn } from './cn';

// The shade palette: every shade of the Shade System as a large, numbered
// chip, grouped by collection, laid out like a colour card. Used wherever a
// person chooses the shades an item is offered in. One shade, one chip; a
// chosen chip carries a ring and a tick, a chip already taken says why.

export interface PaletteShade {
  readonly code: string;
  readonly name: string;
  readonly hex: string;
  readonly collection: string;
  readonly sort: number;
}

export interface ShadePaletteProps {
  readonly shades: readonly PaletteShade[];
  readonly selected: ReadonlySet<string>;
  readonly onToggle: (code: string) => void;
  /** Codes that cannot be chosen, with the word shown on the chip. */
  readonly taken?: ReadonlyMap<string, string>;
  /** What the chip shows under the shade when chosen, such as the SKU code it would make. */
  readonly captionFor?: (code: string) => ReactNode;
  /** Words the host supplies: the group action and the counts. */
  readonly words?: { readonly all: string; readonly none: string; readonly chosen: string };
  readonly className?: string;
}

const isLight = (hex: string) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
};

export function ShadePalette({ shades, selected, onToggle, taken, captionFor, words, className }: ShadePaletteProps) {
  const ordered = [...shades].sort((a, b) => a.collection.localeCompare(b.collection) || a.sort - b.sort || a.code.localeCompare(b.code));
  const collections = [...new Set(ordered.map((shade) => shade.collection))];
  const number = new Map(ordered.map((shade, index) => [shade.code, String(index + 1).padStart(2, '0')]));
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {collections.map((collection) => {
        const own = ordered.filter((shade) => shade.collection === collection);
        const free = own.filter((shade) => !taken?.has(shade.code));
        const allChosen = free.length > 0 && free.every((shade) => selected.has(shade.code));
        return (
          <section key={collection || 'shades'} aria-label={collection || 'Shades'}>
            <header className="mb-3 flex items-baseline justify-between gap-4">
              <h3 className="caps text-ink-muted">{collection || 'Shades'}</h3>
              {words && free.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    for (const shade of free) if (allChosen === selected.has(shade.code)) onToggle(shade.code);
                  }}
                  className="text-[0.8125rem] text-ink-soft underline decoration-line-strong underline-offset-4 hover:text-ink"
                >
                  {allChosen ? words.none : words.all}
                </button>
              )}
            </header>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {own.map((shade) => {
                const reason = taken?.get(shade.code);
                const chosen = selected.has(shade.code);
                const light = isLight(shade.hex);
                return (
                  <li key={shade.code}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={chosen}
                      aria-disabled={Boolean(reason)}
                      disabled={Boolean(reason)}
                      onClick={() => onToggle(shade.code)}
                      className={cn(
                        'group flex w-full flex-col overflow-hidden rounded-[6px] border bg-panel text-start transition-[box-shadow,border-color,transform] duration-150 active:translate-y-px disabled:cursor-not-allowed',
                        chosen ? 'border-charcoal shadow-[0_0_0_2px_var(--color-charcoal)]' : 'border-line hover:border-line-strong',
                        reason && 'opacity-60',
                      )}
                    >
                      <span className="relative block h-20" style={{ backgroundColor: shade.hex }}>
                        <span className={cn('code absolute start-2 top-2 rounded-[3px] px-1.5 py-0.5 text-[0.6875rem]', light ? 'bg-milk/90 text-charcoal' : 'bg-charcoal/70 text-milk')}>{number.get(shade.code)}</span>
                        {chosen && (
                          <span aria-hidden="true" className="absolute end-2 top-2 grid size-6 place-items-center rounded-full bg-charcoal text-milk">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2.5 6.5 5 9l4.5-5.5" />
                            </svg>
                          </span>
                        )}
                        <span className={cn('absolute inset-x-0 bottom-0 h-px', light ? 'bg-charcoal/10' : 'bg-milk/10')} />
                      </span>
                      <span className="block px-2.5 pb-2.5 pt-2">
                        <span className="block truncate text-sm font-medium">{shade.name}</span>
                        <span className="code block text-ink-muted">
                          {shade.code} · {shade.hex.toUpperCase()}
                        </span>
                        {reason ? <span className="mt-1 block text-[0.75rem] text-ink-muted">{reason}</span> : chosen && captionFor ? <span className="code mt-1 block text-ink-soft">{captionFor(shade.code)}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {words && (
        <p className="code text-ink-muted" aria-live="polite">
          {selected.size} {words.chosen}
        </p>
      )}
    </div>
  );
}
