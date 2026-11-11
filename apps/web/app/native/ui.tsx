import { cn } from '@basis/ui';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Children, createContext, isValidElement, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { useLocale } from '../account/i18n';

// The app's register (docs/DESIGN_SYSTEM.md §15, docs/APP_STORE.md §1.1): the
// portal's pages drawn as an iPhone app. A navigation bar per screen with a
// large title on the five tabs and the record on pushed screens, grouped
// cells instead of ledgers, a sheet instead of a floating panel. Rendered only
// in the app's bundle; the site never mounts any of it.

/** The tabs' own screens: a large title, no back button. */
export const TAB_ROOTS = ['/account', '/account/quotes', '/account/orders', '/account/shipments', '/account/more'] as const;
export const isTabRoot = (path: string) => (TAB_ROOTS as readonly string[]).includes(path.replace(/\/+$/, '') || '/');

export interface BarBack {
  readonly to: string;
  readonly label: string;
}

interface Registered<T> {
  readonly id: string;
  readonly value: T;
}

interface BarContextValue {
  readonly title: Registered<string> | null;
  readonly back: Registered<BarBack> | null;
  readonly setTitle: (update: (current: Registered<string> | null) => Registered<string> | null) => void;
  readonly setBack: (update: (current: Registered<BarBack> | null) => Registered<BarBack> | null) => void;
  readonly largeVisible: boolean;
  readonly setLargeVisible: (visible: boolean) => void;
  readonly scroller: RefObject<HTMLElement | null>;
}

const BarContext = createContext<BarContextValue | null>(null);
export const BarProvider = BarContext.Provider;
export const useBar = () => useContext(BarContext);

/** A screen names itself in the navigation bar; the name goes when the screen does. */
export function useBarTitle(title: string): void {
  const bar = useBar();
  const id = useId();
  const setTitle = bar?.setTitle;
  useEffect(() => {
    if (!setTitle) return;
    setTitle(() => ({ id, value: title }));
    return () => setTitle((current) => (current?.id === id ? null : current));
  }, [setTitle, id, title]);
}

/** A pushed screen's way back: "‹ Quotes". */
export function useBarBack({ to, label }: BarBack): void {
  const bar = useBar();
  const id = useId();
  const setBack = bar?.setBack;
  useEffect(() => {
    if (!setBack) return;
    setBack(() => ({ id, value: { to, label } }));
    return () => setBack((current) => (current?.id === id ? null : current));
  }, [setBack, id, to, label]);
}

/** The tab's large title, at the top of its screen; under the bar it hands over to the inline title. */
export function LargeTitle({ children }: { children: string }) {
  const bar = useBar();
  const ref = useRef<HTMLHeadingElement>(null);
  const setLargeVisible = bar?.setLargeVisible;
  const scroller = bar?.scroller;
  useEffect(() => {
    const element = ref.current;
    const root = scroller?.current;
    if (!element || !root || !setLargeVisible) return;
    // Measured against the bar on every scroll: the title is "large" while any of it shows below the bar.
    const check = () => {
      const bar = root.parentElement?.querySelector('.app-nav-bar');
      const edge = bar ? bar.getBoundingClientRect().bottom : 0;
      setLargeVisible(element.getBoundingClientRect().bottom > edge + 4);
    };
    check();
    const frame = requestAnimationFrame(check);
    root.addEventListener('scroll', check, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener('scroll', check);
      setLargeVisible(false);
    };
  }, [setLargeVisible, scroller]);
  return (
    <h1 ref={ref} className="app-large-title">
      {children}
    </h1>
  );
}

/** A section of grouped cells, as in Settings: an optional header and footer around a rounded milk group. */
export function Group({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('app-section', className)}>
      {header && <h2 className="app-section-header">{header}</h2>}
      <div className="app-group">{children}</div>
      {footer && <div className="app-section-footer">{footer}</div>}
    </section>
  );
}

function Chevron() {
  const { dir } = useLocale();
  const Icon = dir === 'rtl' ? CaretLeft : CaretRight;
  return <Icon aria-hidden="true" size={14} weight="bold" className="shrink-0 text-ink-muted/70" />;
}

/**
 * One cell: a title, a secondary line, a trailing value and, when it leads
 * somewhere, a chevron. Pressed state on touch, 44 pt at least.
 */
export function GroupRow({ to, onClick, title, subtitle, trailing, leading, destructive, chevron, children }: { to?: string; onClick?: () => void; title?: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; leading?: ReactNode; destructive?: boolean; chevron?: boolean; children?: ReactNode }) {
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        {title !== undefined && <span className={cn('app-row-title', destructive && 'text-critical')}>{title}</span>}
        {subtitle !== undefined && subtitle !== null && subtitle !== '' && <span className="app-row-subtitle">{subtitle}</span>}
        {children}
      </span>
      {trailing !== undefined && trailing !== null && <span className="app-row-trailing">{trailing}</span>}
      {(chevron ?? Boolean(to)) && <Chevron />}
    </>
  );
  if (to) {
    return (
      <Link to={to} className="app-row" data-pressable="">
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="app-row w-full text-start" data-pressable="">
        {body}
      </button>
    );
  }
  return <div className="app-row">{body}</div>;
}

/** Label at the start, value at the end: the rows of a record's facts. */
export function ValueRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="app-row">
      <span className="min-w-0 flex-1 text-ink-soft">{label}</span>
      <span className="app-row-value">
        <bdi>{value}</bdi>
      </span>
    </div>
  );
}

/**
 * A ledger row turned into a cell: the first column is the title, the last
 * the trailing value, the ones between the secondary line.
 */
export function RowCell({ to, children }: { to?: string; children: ReactNode }) {
  const cells = Children.toArray(children).filter(isValidElement);
  const first = cells[0];
  const last = cells.length > 1 ? cells[cells.length - 1] : undefined;
  const middle = cells.slice(1, cells.length > 1 ? -1 : undefined);
  return (
    <GroupRow
      to={to}
      title={first}
      subtitle={middle.length > 0 ? <span className="flex flex-wrap items-center gap-x-2 gap-y-1">{middle}</span> : undefined}
      trailing={last}
    />
  );
}

/** Placeholder cells while a screen loads, instead of a "Loading" line. */
export function SkeletonGroup({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="app-section">
      <div className="app-group">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="app-row">
            <span className="min-w-0 flex-1">
              <span className="app-skeleton block h-4 w-2/5" />
              <span className="app-skeleton mt-2 block h-3 w-3/5" />
            </span>
            <span className="app-skeleton block h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A page sheet: slides up over a scrim, a grabber on top, swiped down or
 * "Done" to close. The assistant lives in one.
 */
export function Sheet({ title, onClose, leading, children, labelledBy }: { title: ReactNode; onClose: () => void; leading?: ReactNode; children: ReactNode; labelledBy?: string }) {
  const { dir, locale, t } = useLocale();
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const onTouchStart = (event: React.TouchEvent) => {
    start.current = event.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (event: React.TouchEvent) => {
    if (start.current === null) return;
    setDrag(Math.max(0, (event.touches[0]?.clientY ?? start.current) - start.current));
  };
  const onTouchEnd = () => {
    if (drag > 110) onClose();
    setDrag(0);
    start.current = null;
  };
  return (
    <div className="fixed inset-0 z-50" dir={dir} lang={locale}>
      <button type="button" aria-label={t('Close')} onClick={onClose} className="app-scrim absolute inset-0" />
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="app-sheet" style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}>
        <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="shrink-0 touch-none">
          <span aria-hidden="true" className="mx-auto mt-2 block h-[5px] w-9 rounded-full bg-line-strong" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-2 pt-2">
            <div className="justify-self-start">{leading}</div>
            <h2 id={labelledBy} className="text-[17px] font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="app-bar-button justify-self-end font-semibold">
              {t('Done')}
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
