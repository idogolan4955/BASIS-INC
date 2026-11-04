import { MODULES, canOpenModule, type FabricStructure, type ModuleKey } from '@basis/shared';
import { Structure, Wordmark, cn } from '@basis/ui';
import { ArrowUpRight } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';

// The front door: one page from which every part of BASIS opens. The
// management platform, the development department, the brand site, the
// team's boards and the records. Doors are drawn as the fabrics are.

export const BRAND_SITE_URL = 'https://basis-inc.web.app';

interface Door {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly to: string;
  readonly external?: boolean;
  readonly structure: FabricStructure;
  readonly tone: string;
  readonly links: readonly { label: string; to: string; module?: ModuleKey; external?: boolean }[];
}

const DOORS: readonly Door[] = [
  { key: 'platform', title: 'Management', summary: 'Goods in motion: orders, production, quality, stock, shipments, customers.', to: '/', structure: 'mesh', tone: '#C4A88E', links: [{ label: 'Operations', to: '/operations', module: 'operations' }, { label: 'Products', to: '/products', module: 'products' }, { label: 'Manufacturing', to: '/manufacturing', module: 'manufacturing' }, { label: 'Inventory', to: '/inventory', module: 'inventory' }, { label: 'Orders', to: '/orders', module: 'orders' }, { label: 'Customers', to: '/customers', module: 'customers' }] },
  { key: 'development', title: 'Development', summary: 'The brand and its objects, from an idea to a product ready to make and sell.', to: '/development', structure: 'lining', tone: '#E5C9BA', links: [{ label: 'Board', to: '/development', module: 'development' }, { label: 'Products in development', to: '/development/products', module: 'development' }, { label: 'Brand Centre', to: '/development/brand', module: 'development' }, { label: 'Collections', to: '/development/collections', module: 'development' }] },
  { key: 'site', title: 'Brand site', summary: 'What the world sees: the fabrics, the Shade System, the story, the sample kit.', to: BRAND_SITE_URL, external: true, structure: 'tulle', tone: '#F0DFD5', links: [{ label: 'Fabrics', to: `${BRAND_SITE_URL}/fabrics`, external: true }, { label: 'Shade System', to: `${BRAND_SITE_URL}/shades`, external: true }, { label: 'Sample request', to: `${BRAND_SITE_URL}/samples`, external: true }, { label: 'Website content', to: '/website', module: 'website' }] },
  { key: 'team', title: 'Team', summary: 'The bulletin board and the goals.', to: '/board', structure: 'mesh', tone: '#E3D8C8', links: [{ label: 'Board', to: '/board', module: 'board' }, { label: 'Goals', to: '/goals', module: 'goals' }] },
  { key: 'records', title: 'Records', summary: 'Documents, costing, analytics and settings.', to: '/documents', structure: 'lining', tone: '#ECE5D9', links: [{ label: 'Documents', to: '/documents', module: 'documents' }, { label: 'Costing', to: '/costing', module: 'costing' }, { label: 'Analytics', to: '/analytics', module: 'analytics' }, { label: 'Settings', to: '/settings', module: 'settings' }] },
];

function DoorLink({ to, external, className, children }: { to: string; external?: boolean; className?: string; children: React.ReactNode }) {
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

export function Hub() {
  const t = useT();
  const session = useRequiredSession();
  const doors = DOORS.map((door) => ({ ...door, links: door.links.filter((link) => !link.module || canOpenModule(session.role, link.module)) })).filter((door) => door.links.length > 0 || door.external);

  return (
    <div className="min-h-full bg-surface">
      <header className="border-b border-line bg-panel px-5 py-10 lg:px-12 lg:py-14">
        <Wordmark className="text-[1.125rem] text-ink" />
        <h1 className="mt-6 font-display text-[2.75rem] font-medium leading-none tracking-[-0.01em] lg:text-[3.5rem]">{t('Everything BASIS, from one door.')}</h1>
        <p className="mt-4 max-w-2xl text-ink-soft">{t('The management platform, the development department, the brand site, the team\'s boards and the records. Open the one you need; the rail is always there once you are in.')}</p>
      </header>
      <section aria-label={t('Doors')} className="grid gap-5 px-5 py-8 lg:grid-cols-6 lg:px-12">
        {doors.map((door, index) => (
          <article key={door.key} className={cn('flex flex-col overflow-hidden rounded-[6px] border border-line bg-panel', index < 2 ? 'lg:col-span-3' : 'lg:col-span-2')}>
            <DoorLink to={door.to} external={door.external} className="group relative block aspect-[5/2] overflow-hidden border-b border-line">
              <Structure kind={door.structure} scale={index < 2 ? 1.4 : 1.1} tone={door.tone} />
              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-[linear-gradient(to_top,rgb(43_39_36/0.55),transparent)] px-5 pb-4 pt-10 text-milk">
                <span className="font-display text-[2rem] font-medium leading-none lg:text-[2.5rem]">{t(door.title)}</span>
                <span className="code flex items-center gap-1 text-[0.75rem] opacity-90 transition-transform duration-150 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                  {door.external ? t('opens the site') : t('open')}
                  <ArrowUpRight size={14} aria-hidden="true" className="rtl:-scale-x-100" />
                </span>
              </span>
            </DoorLink>
            <div className="flex flex-1 flex-col px-5 py-4">
              <p className="text-[0.9375rem] text-ink-soft">{t(door.summary)}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                {door.links.map((link) => (
                  <li key={link.to}>
                    <DoorLink to={link.to} external={link.external} className="text-[0.875rem] underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {t(link.label)}
                    </DoorLink>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
      <footer className="px-5 pb-10 text-[0.8125rem] text-ink-muted lg:px-12">
        {MODULES.filter((definition) => canOpenModule(session.role, definition.key)).length} {t('modules open to')} {session.name}.
      </footer>
    </div>
  );
}
