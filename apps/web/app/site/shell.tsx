import { Wordmark, cn } from '@basis/ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { SITE, families, shades } from './catalog';
import { Eyebrow, Index } from './ui';

// The site's frame: a quiet top bar, the fabrics index as the menu, and the
// single primary action, within thumb reach on phones.

const PRIMARY = [
  { to: '/fabrics', label: 'Fabrics' },
  { to: '/shades', label: 'Shade System' },
  { to: '/applications', label: 'Applications' },
  { to: '/material', label: 'Material' },
  { to: '/about', label: 'About' },
];
const SECONDARY = [
  { to: '/wholesale', label: 'Wholesale' },
  { to: '/contact', label: 'Contact' },
];

function IndexMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);
  return (
    <dialog ref={dialog} onClose={onClose} aria-label="Site index" className="m-0 h-dvh max-h-none w-screen max-w-none bg-bone p-0 text-ink backdrop:bg-charcoal/30">
      <div className="flex min-h-dvh flex-col px-4 pb-28 pt-5 md:px-12">
        <div className="flex items-center justify-between">
          <Wordmark className="text-base" />
          <button type="button" onClick={onClose} className="code h-11 px-3 uppercase tracking-[0.18em]">
            Close
          </button>
        </div>
        <nav aria-label="Fabrics" className="mt-12">
          <Eyebrow>Fabrics</Eyebrow>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {families.map((family) => (
              <li key={family.code}>
                <Link to={`/fabrics/${family.slug}`} className="flex flex-col gap-1 py-4 md:flex-row md:items-baseline md:justify-between">
                  <span className="font-display text-[2.25rem] leading-none tracking-[-0.02em] md:text-[3.5rem]">{family.name}</span>
                  <span className="text-sm text-ink-muted">{family.products.map((product) => product.name).join(' · ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Pages" className="mt-10 grid gap-x-12 gap-y-3 sm:grid-cols-2">
          {[...PRIMARY.slice(1), ...SECONDARY].map((item) => (
            <Link key={item.to} to={item.to} className="font-display text-[1.75rem] leading-none tracking-[-0.01em]">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          <Eyebrow>Shade System</Eyebrow>
          <div className="mt-3 flex gap-3">
            {shades.map((shade) => (
              <Link key={shade.code} to={`/shades/${shade.slug}`} aria-label={shade.name} className="size-9 rounded-full border border-charcoal/10" style={{ backgroundColor: shade.hex }} />
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-panel focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bone/90 backdrop-blur-[2px]">
        <div className="flex h-16 items-center justify-between px-4 md:px-12 lg:px-24">
          <Link to="/" aria-label="BASIS INC. home" className="flex items-center">
            <Wordmark className="text-base" />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {PRIMARY.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('text-[0.9375rem] transition-colors duration-300', isActive ? 'text-ink underline decoration-nude-deep underline-offset-[10px]' : 'text-ink-soft hover:text-ink')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/samples" className="hidden h-10 items-center bg-charcoal px-5 text-[0.9375rem] font-medium text-milk transition-colors duration-300 hover:bg-cocoa md:inline-flex">
              Request samples
            </Link>
            <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" className="code h-11 px-2 uppercase tracking-[0.18em] md:hidden">
              Index
            </button>
            <button type="button" onClick={() => setMenu(true)} aria-haspopup="dialog" className="code hidden h-11 px-2 uppercase tracking-[0.18em] md:inline-flex md:items-center">
              Index
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-24 md:pb-0">
        {children}
      </main>

      <footer className="border-t border-charcoal/70 bg-bone px-4 py-12 md:px-12 lg:px-24">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark className="text-base" />
            <p className="mt-4 max-w-xs text-sm text-ink-soft">{SITE.tagline}. Powermesh, stretch mesh, lining and tulle, in one Shade System, supplied to designers, ateliers and manufacturers worldwide.</p>
          </div>
          <div>
            <Eyebrow>Fabrics</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              {families.flatMap((family) => family.products).map((product) => (
                <li key={product.code}>
                  <Link to={`/fabrics/${families.find((family) => family.code === product.family)!.slug}/${product.slug}`} className="hover:underline">
                    <Index className="mr-2">{String(product.index).padStart(2, '0')}</Index>
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>Pages</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              {[...PRIMARY, ...SECONDARY, { to: '/samples', label: 'Request samples' }].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Eyebrow>Legal</Eyebrow>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/legal/privacy" className="hover:underline">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/legal/terms" className="hover:underline">
                  Terms
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="hover:underline">
                  Cookies
                </Link>
              </li>
            </ul>
            <p className="code mt-8 text-ink-muted">© {new Date().getFullYear()} BASIS INC.</p>
          </div>
        </div>
      </footer>

      {/* Phones: the single primary action within thumb reach. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bone/95 p-3 backdrop-blur-[2px] md:hidden">
        <Link to="/samples" className="flex h-12 items-center justify-center bg-charcoal text-[0.9375rem] font-medium text-milk">
          Request samples
        </Link>
      </div>

      <IndexMenu open={menu} onClose={() => setMenu(false)} />
    </div>
  );
}

export function meta(title: string, description: string, path = '') {
  const full = title === SITE.name ? title : `${title} · ${SITE.name}`;
  return [
    { title: full },
    { name: 'description', content: description },
    { property: 'og:title', content: full },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `${SITE.url}${path}` },
    { property: 'og:site_name', content: SITE.name },
    { tagName: 'link', rel: 'canonical', href: `${SITE.url}${path}` },
  ];
}
