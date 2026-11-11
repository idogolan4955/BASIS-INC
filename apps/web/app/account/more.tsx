import { AddressBook, Books, Dress, EnvelopeSimple, Files, Palette, Receipt, Scales, ShieldCheck, Swatches, UserCircle, Users, type Icon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { IN_APP } from '../native/platform';
import { Group, GroupRow } from '../native/ui';
import { PageTitle, SECTIONS, portalMeta } from './frame';
import { useT } from './i18n';

export const meta = () => portalMeta('More');

// The app's fifth tab: the rest of the account's index, then the brand's own
// pages. In the app it is a settings list: grouped cells, an icon with every
// label, the version of the app at the foot.

const BRAND = [
  { to: '/fabrics', label: 'The fabrics' },
  { to: '/shades', label: 'The Shade System' },
  { to: '/applications', label: 'Applications' },
  { to: '/contact', label: 'Write to BASIS' },
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/terms', label: 'Terms' },
] as const;

const ICON: Record<string, Icon> = {
  '/account/invoices': Receipt,
  '/account/documents': Files,
  '/account/samples': Swatches,
  '/account/team': Users,
  '/account/addresses': AddressBook,
  '/account/profile': UserCircle,
  '/fabrics': Books,
  '/shades': Palette,
  '/applications': Dress,
  '/contact': EnvelopeSimple,
  '/legal/privacy': ShieldCheck,
  '/legal/terms': Scales,
};

function Leading({ to }: { to: string }) {
  const Glyph = ICON[to];
  return Glyph ? <Glyph aria-hidden="true" size={24} weight="light" className="block text-ink-soft" /> : null;
}

function AppMore() {
  const t = useT();
  const [version, setVersion] = useState('');
  useEffect(() => {
    void import('../native/bridge').then(({ appVersion }) => appVersion()).then(setVersion).catch(() => undefined);
  }, []);
  const rest = SECTIONS.slice(4);
  const groups = [rest.slice(0, 3), rest.slice(3)];
  return (
    <div>
      <PageTitle title={t('More')} />
      {groups.map((group, index) => (
        <Group key={index}>
          {group.map((section) => (
            <GroupRow key={section.to} to={section.to} leading={<Leading to={section.to} />} title={t(section.label)} />
          ))}
        </Group>
      ))}
      <Group header={<span dir="ltr">BASIS INC.</span>}>
        {BRAND.slice(0, 4).map((item) => (
          <GroupRow key={item.to} to={item.to} leading={<Leading to={item.to} />} title={t(item.label)} />
        ))}
      </Group>
      <Group footer={version ? <span dir="ltr">BASIS {version}</span> : undefined}>
        {BRAND.slice(4).map((item) => (
          <GroupRow key={item.to} to={item.to} leading={<Leading to={item.to} />} title={t(item.label)} />
        ))}
      </Group>
    </div>
  );
}

export default function More() {
  const t = useT();
  if (IN_APP) return <AppMore />;
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
