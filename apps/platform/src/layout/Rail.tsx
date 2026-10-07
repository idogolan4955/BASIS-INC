import { ROLES, ROLE_LABELS, isRole } from '@basis/shared';
import { Wordmark, cn } from '@basis/ui';
import { HouseSimple, type Icon } from '@phosphor-icons/react';
import { NavLink } from 'react-router';
import { useRequiredSession } from '../session';
import { MODULE_ICONS, railGroupsFor } from './sections';
import { LOCALES, useLocale } from '../i18n';

function RailLink({ to, icon: IconMark, label, number, end }: { to: string; icon: Icon; label: string; number?: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex h-[2.125rem] items-center gap-3 px-5 text-sm transition-colors duration-150',
          isActive ? 'bg-rail-raised text-rail-ink' : 'text-rail-ink/80 hover:bg-rail-raised/60 hover:text-rail-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* The selvedge: the open page is marked along its edge. */}
          {isActive && <span aria-hidden="true" className="absolute inset-y-0 start-0 w-[3px] bg-nude" />}
          <IconMark size={18} weight="light" aria-hidden="true" className="shrink-0" />
          <span className="flex-1 truncate">{label}</span>
          {number && <span className="code text-[0.625rem] text-rail-muted">{number}</span>}
        </>
      )}
    </NavLink>
  );
}

export function Rail({ className }: { className?: string }) {
  const session = useRequiredSession();
  const groups = railGroupsFor(session.role);
  const { t, locale, setLocale } = useLocale();

  return (
    <aside className={cn('on-rail flex h-dvh flex-col bg-rail text-rail-ink', className)}>
      <div className="flex h-16 shrink-0 items-center border-b border-rail-line px-5">
        <Wordmark className="text-[0.9375rem]" />
      </div>

      <nav aria-label={t('Modules')} className="flex-1 overflow-y-auto py-3 [scrollbar-color:var(--color-rail-line)_transparent] [scrollbar-width:thin]">
        <RailLink to="/" end icon={HouseSimple} label={t('Gateway')} />
        {groups.map((group) => (
          <div key={group.label} className="mt-3.5">
            <p className="caps px-5 pb-1.5 text-[0.625rem] text-rail-muted">{t(group.label)}</p>
            {group.modules.map((definition) => (
              <RailLink
                key={definition.key}
                to={definition.path}
                icon={MODULE_ICONS[definition.key]}
                label={t(definition.name)}
                number={definition.number}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-rail-line px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-nude text-xs font-semibold text-rail">
            {session.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm">{session.name}</p>
            <p className="code text-[0.625rem] uppercase text-rail-muted">{session.setRole ? t('Sample session') : t(ROLE_LABELS[session.role])}</p>
          </div>
        </div>
        {!session.setRole && (
          <button
            type="button"
            onClick={() => void session.signOut()}
            className="mt-3 h-8 w-full rounded-xs border border-rail-line text-[0.8125rem] text-rail-ink/85 transition-colors duration-150 hover:bg-rail-raised hover:text-rail-ink"
          >
            {t('Sign out')}
          </button>
        )}
        {session.setRole && (
          <label className="mt-3 block">
            <span className="caps text-[0.625rem] text-rail-muted">{t('View as')}</span>
            <select
              value={session.role}
              onChange={(event) => isRole(event.target.value) && session.setRole?.(event.target.value)}
              className="mt-1 h-8 w-full rounded-xs border border-rail-line bg-rail-raised px-2 text-[0.8125rem] text-rail-ink"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_LABELS[role])}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="mt-3 block">
          <span className="caps text-[0.625rem] text-rail-muted">{t('Language')}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value === 'he' ? 'he' : 'en')}
            className="mt-1 h-8 w-full rounded-xs border border-rail-line bg-rail-raised px-2 text-[0.8125rem] text-rail-ink"
          >
            {LOCALES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
