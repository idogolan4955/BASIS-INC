import { canOpenModule } from '@basis/shared';
import { Wordmark, cn } from '@basis/ui';
import { Bell, HouseSimple, List, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useGateway } from '../data/source';
import { useRequiredSession } from '../session';
import { CommandPalette } from './CommandPalette';
import { Rail } from './Rail';

function useAttentionCount(): number {
  const session = useRequiredSession();
  const { data } = useGateway();
  return data?.attention.filter((item) => canOpenModule(session.role, item.module)).length ?? 0;
}

function AlertsLink({ count, className }: { count: number; className?: string }) {
  return (
    <Link
      to="/#attention"
      aria-label={count === 0 ? 'Nothing requires attention' : `${count} items require attention`}
      className={cn('relative grid size-10 place-items-center rounded-xs transition-colors duration-150 hover:bg-sunken', className)}
    >
      <Bell size={20} weight="light" aria-hidden="true" />
      {count > 0 && (
        <span className="code absolute right-0.5 top-1 min-w-4 bg-critical px-1 text-center text-[0.625rem] leading-4 text-milk">
          {count}
        </span>
      )}
    </Link>
  );
}

/** The rail as a drawer on phones: the same index, opened from the bottom bar, closed by navigating. */
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    else if (!open && element.open) element.close();
  }, [open]);
  useEffect(() => {
    onClose();
    // Close whenever the route changes, which is what a tap on a module does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      aria-label="Modules"
      className="m-0 h-dvh max-h-none w-[min(18rem,85vw)] max-w-none -translate-x-full bg-rail p-0 text-rail-ink transition-transform duration-200 ease-out open:translate-x-0 backdrop:bg-charcoal/45 starting:open:-translate-x-full lg:hidden"
    >
      <Rail className="h-dvh" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close menu"
        className="absolute right-2 top-3 grid size-10 place-items-center rounded-xs text-rail-ink/80 hover:bg-rail-raised hover:text-rail-ink"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </dialog>
  );
}

export function Shell() {
  const session = useRequiredSession();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const attention = useAttentionCount();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-panel focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <Rail className="sticky top-0 hidden lg:flex" />

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-5 lg:px-8">
          <Link to="/" className="lg:hidden" aria-label="Gateway">
            <Wordmark className="text-[0.9375rem] text-ink" />
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-panel)] border border-line bg-panel px-3 text-left text-ink-muted transition-colors duration-150 hover:border-line-strong md:flex"
          >
            <MagnifyingGlass size={16} aria-hidden="true" />
            <span className="flex-1 truncate">Jump to a module, product, SKU or company</span>
            <kbd className="code rounded-xs border border-line px-1.5 py-0.5">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <AlertsLink count={attention} />
            <span
              title={session.name}
              className="grid size-9 place-items-center rounded-full bg-nude text-xs font-semibold text-charcoal lg:hidden"
            >
              {session.initials}
            </span>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Phones: four thumb-reach destinations; the full index opens as a drawer. */}
      <nav
        aria-label="Primary"
        className="on-rail fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-rail-line bg-rail text-rail-ink lg:hidden"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) => cn('flex flex-col items-center justify-center gap-1 text-xs', !isActive && 'text-rail-ink/75')}
        >
          <HouseSimple size={20} weight="light" aria-hidden="true" />
          Gateway
        </NavLink>
        <Link to="/#attention" className="flex flex-col items-center justify-center gap-1 text-xs text-rail-ink/75">
          <span className="relative">
            <Bell size={20} weight="light" aria-hidden="true" />
            {attention > 0 && (
              <span className="code absolute -right-3 -top-1 min-w-4 bg-nude px-1 text-center text-[0.625rem] leading-4 text-rail">
                {attention}
              </span>
            )}
          </span>
          Attention
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex flex-col items-center justify-center gap-1 text-xs text-rail-ink/75"
        >
          <MagnifyingGlass size={20} weight="light" aria-hidden="true" />
          Search
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
          className="flex flex-col items-center justify-center gap-1 text-xs text-rail-ink/75"
        >
          <List size={20} weight="light" aria-hidden="true" />
          Menu
        </button>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
