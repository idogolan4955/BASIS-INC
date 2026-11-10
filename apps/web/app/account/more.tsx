import { Link } from 'react-router';
import { PageTitle, SECTIONS, portalMeta } from './frame';
import { useT } from './i18n';

export const meta = () => portalMeta('More');

// The app's fifth tab: the rest of the account's index, numbered as on the
// site, then the brand's own pages.

const BRAND = [
  { to: '/fabrics', label: 'The fabrics' },
  { to: '/shades', label: 'The Shade System' },
  { to: '/applications', label: 'Applications' },
  { to: '/contact', label: 'Write to BASIS' },
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/terms', label: 'Terms' },
] as const;

export default function More() {
  const t = useT();
  const rest = SECTIONS.map((section, index) => ({ ...section, index })).slice(4);
  return (
    <div>
      <PageTitle title={t('More')} />
      <ol className="border-t border-charcoal/70">
        {rest.map((section) => (
          <li key={section.to}>
            <Link to={section.to} className="flex h-14 items-center gap-4 border-b border-line text-[1.0625rem]">
              <span className="code text-ink-muted">{String(section.index + 1).padStart(2, '0')}</span>
              {t(section.label)}
            </Link>
          </li>
        ))}
      </ol>
      <p className="code mt-12 uppercase tracking-[0.18em] text-ink-muted">BASIS INC.</p>
      <ul className="mt-3 border-t border-charcoal/70">
        {BRAND.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="flex h-12 items-center border-b border-line text-ink-soft">
              {t(item.label)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
