import { cn } from '@basis/ui';
import { CaretLeft, CaretRight, DotsThreeOutline, FileText, House, Package, Truck, type Icon } from '@phosphor-icons/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router';
import { SiteAssistant } from '../assistant/widget';
import { PortalLocale, useLocale, useT } from '../account/i18n';
import { BarProvider, isTabRoot, type BarBack } from './ui';

// The app's frame (docs/APP_STORE.md §1.1, docs/DESIGN_SYSTEM.md §15): an
// iOS navigation bar over a scrolling screen and a tab bar under it. No site
// header, no index, no footer: the brand's pages live under More. Screens
// slide in when pushed, the scroll position returns with the back button,
// and a pull from the top reloads the screen.

const TABS: readonly { to: string; label: string; icon: Icon; end?: boolean }[] = [
  { to: '/account', label: 'Overview', icon: House, end: true },
  { to: '/account/quotes', label: 'Quotes', icon: FileText },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/shipments', label: 'Shipments', icon: Truck },
  { to: '/account/more', label: 'More', icon: DotsThreeOutline },
];

/** The brand's pages under More name themselves in the bar too; deeper pages leave it to their own heading. */
const SITE_TITLES: Record<string, string> = {
  '/fabrics': 'The fabrics',
  '/shades': 'The Shade System',
  '/applications': 'Applications',
  '/contact': 'Write to BASIS',
  '/legal/privacy': 'Privacy',
  '/legal/terms': 'Terms',
  '/legal/cookies': 'Cookies',
};

/** Pages that are a door into the account, drawn without the tabs. */
const isDoor = (path: string) => path.startsWith('/account/sign-in') || path.startsWith('/account/reset') || path.startsWith('/account/invite');
const depth = (path: string) => path.split('/').filter(Boolean).length;

function haptic(kind: 'select' | 'tap' | 'success') {
  void import('./bridge').then(({ haptic: run }) => run(kind)).catch(() => undefined);
}

function TabBar({ pathname }: { pathname: string }) {
  const t = useT();
  const { dir } = useLocale();
  const owner = TABS.slice(0, 4).find((tab) => (tab.end ? pathname === tab.to : pathname.startsWith(tab.to)));
  return (
    <nav dir={dir} aria-label={t('Your account')} className="app-tab-bar">
      <ul className="grid h-[49px] grid-cols-5">
        {TABS.map((tab) => {
          const active = owner ? owner.to === tab.to : tab.to === '/account/more';
          const Glyph = tab.icon;
          return (
            <li key={tab.to}>
              <Link to={tab.to} aria-current={active ? 'page' : undefined} onClick={() => !active && haptic('select')} className={cn('app-tab', active ? 'text-ink' : 'text-ink-muted')}>
                <Glyph aria-hidden="true" size={26} weight={active ? 'fill' : 'light'} />
                <span className={cn('text-[10px] leading-none', active ? 'font-semibold' : 'font-medium')}>{t(tab.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavBar({ title, back, root, door, largeVisible, scrolled, onBack }: { title: string; back: BarBack | null; root: boolean; door: boolean; largeVisible: boolean; scrolled: boolean; onBack: () => void }) {
  const { dir } = useLocale();
  const Chevron = dir === 'rtl' ? CaretRight : CaretLeft;
  const showTitle = !root || !largeVisible;
  return (
    <header dir={dir} className={cn('app-nav-bar', (scrolled || !largeVisible) && !door && 'app-nav-bar-edge')}>
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2">
        <div className="min-w-0 justify-self-start">
          {back && (
            <button type="button" onClick={onBack} className="app-bar-button flex max-w-full items-center gap-0.5 ps-0">
              <Chevron aria-hidden="true" size={24} weight="bold" className="shrink-0" />
              <span className="truncate">{back.label}</span>
            </button>
          )}
        </div>
        <h1 className={cn('max-w-[60vw] truncate text-[17px] font-semibold transition-opacity duration-200', showTitle ? 'opacity-100' : 'opacity-0')} aria-hidden={!showTitle}>
          {title}
        </h1>
        <div className="min-w-0 justify-self-end">{root && !door && <SiteAssistant placement="bar" />}</div>
      </div>
    </header>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const t = useT();
  const { dir } = useLocale();
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const scroller = useRef<HTMLElement | null>(null);
  const [title, setTitle] = useState<{ id: string; value: string } | null>(null);
  const [back, setBack] = useState<{ id: string; value: BarBack } | null>(null);
  const [largeVisible, setLargeVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [motion, setMotion] = useState<'push' | 'pop' | 'fade' | 'none'>('none');
  const [refresh, setRefresh] = useState(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const positions = useRef(new Map<string, number>());
  const previous = useRef(pathname);
  const backTapped = useRef(false);
  const pullStart = useRef<number | null>(null);
  const door = isDoor(pathname);
  const root = isTabRoot(pathname);

  // Links that open the app, tapped notifications, the launch screen.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import('./bridge').then(({ startApp }) =>
      startApp((path) => navigate(path)).then((release) => {
        if (cancelled) release();
        else stop = release;
      }),
    );
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [navigate]);

  // A pushed screen slides in, a tab fades, the back button slides back; the
  // system's swipe-back draws its own motion, so nothing is added to it.
  useLayoutEffect(() => {
    const from = previous.current;
    if (from === pathname) return;
    previous.current = pathname;
    const tabs = isTabRoot(pathname) && isTabRoot(from);
    setMotion(backTapped.current ? 'pop' : navigationType === 'POP' ? 'none' : tabs ? 'fade' : depth(pathname) > depth(from) ? 'push' : 'fade');
    backTapped.current = false;
    const element = scroller.current;
    if (element) element.scrollTop = navigationType === 'POP' ? (positions.current.get(pathname) ?? 0) : 0;
    setScrolled(false);
  }, [pathname, navigationType]);

  const defaultBack: BarBack | null = door || root ? null : { to: '/account/more', label: t('More') };
  const shownBack = back?.value ?? defaultBack;
  const goBack = useCallback(() => {
    if (!shownBack) return;
    backTapped.current = true;
    const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (index > 0) navigate(-1);
    else navigate(shownBack.to, { replace: true });
  }, [navigate, shownBack]);

  const onScroll = () => {
    const top = scroller.current?.scrollTop ?? 0;
    positions.current.set(pathname, top);
    setScrolled(top > 2);
  };

  // Pull to refresh: from the very top, past 64 pt, the screen reloads.
  const onTouchStart = (event: React.TouchEvent) => {
    pullStart.current = (scroller.current?.scrollTop ?? 0) <= 0 && !door ? (event.touches[0]?.clientY ?? null) : null;
  };
  const onTouchMove = (event: React.TouchEvent) => {
    if (pullStart.current === null || refreshing) return;
    const distance = (event.touches[0]?.clientY ?? pullStart.current) - pullStart.current;
    setPull(distance > 0 ? Math.min(distance * 0.5, 84) : 0);
  };
  const onTouchEnd = () => {
    if (pull > 64) {
      haptic('tap');
      setRefreshing(true);
      setRefresh((value) => value + 1);
      window.setTimeout(() => setRefreshing(false), 700);
    }
    setPull(0);
    pullStart.current = null;
  };

  return (
    <BarProvider value={{ title, back, setTitle, setBack, largeVisible, setLargeVisible, scroller }}>
      <div className="app-frame">
        <main
          id="main"
          ref={scroller}
          onScroll={onScroll}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={cn('app-scroll', door && 'app-scroll-door')}
        >
          <div aria-hidden="true" className="app-pull" style={{ height: refreshing ? 44 : pull, opacity: refreshing ? 1 : Math.min(pull / 64, 1) }}>
            <span className={cn('app-spinner', refreshing && 'app-spinner-run')} style={refreshing ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
          </div>
          <div key={`${pathname}:${refresh}`} className="app-screen" data-motion={motion} data-dir={dir}>
            {children}
          </div>
        </main>
        <NavBar title={title?.value ?? (SITE_TITLES[pathname.replace(/\/+$/, '')] ? t(SITE_TITLES[pathname.replace(/\/+$/, '')]!) : '')} back={shownBack} root={root} door={door} largeVisible={largeVisible} scrolled={scrolled} onBack={goBack} />
        {!door && <TabBar pathname={pathname} />}
      </div>
    </BarProvider>
  );
}

/** The whole app: the portal's language around the frame, so the bars speak it too. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PortalLocale>
      <Frame>{children}</Frame>
    </PortalLocale>
  );
}
