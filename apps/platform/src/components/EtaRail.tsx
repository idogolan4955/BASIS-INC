import { daysBetween, entityPath, formatLocalDate, railFrom, type CalendarEntry, type LocalDate } from '@basis/shared';
import { StatusChip, cn } from '@basis/ui';
import { Link } from 'react-router';
import { useT } from '../i18n';

// The next thirty days as a rail with a mark per day that carries something,
// and the dates beneath, grouped by day. Overdue open items lead.

const KIND_LABEL: Record<CalendarEntry['kind'], string> = { milestone: 'Milestone', run_end: 'Run end', ex_factory: 'Ex-factory', payment: 'Payment', task: 'Task', departure: 'Departure', arrival: 'Arrival' };
const short = (date: LocalDate) => formatLocalDate(date).slice(0, 6);

export function EtaRail({ entries, asOf, horizonDays = 30, limit }: { entries: readonly CalendarEntry[]; asOf: LocalDate; horizonDays?: number; limit?: number }) {
  const t = useT();
  const days = railFrom(entries, asOf, horizonDays);
  const overdue = entries.filter((entry) => entry.overdue);
  const upcoming = entries.filter((entry) => !entry.overdue);
  const shown = limit ? [...overdue, ...upcoming].slice(0, limit) : [...overdue, ...upcoming];
  const groups = [...new Set(shown.map((entry) => entry.date))].map((date) => ({ date, entries: shown.filter((entry) => entry.date === date) }));
  return (
    <div>
      <ol aria-label={t('The next {days} days', { days: horizonDays })} className="flex items-end gap-px border-b border-charcoal pb-1">
        {days.map((day, index) => {
          const weekStart = new Date(`${day.date}T00:00:00Z`).getUTCDay() === 1;
          return (
            <li key={day.date} className="flex flex-1 flex-col items-center gap-1" title={`${formatLocalDate(day.date)}: ${day.count} ${day.count === 1 ? 'item' : 'items'}`}>
              <span className={cn('block rounded-full', day.count === 0 ? 'size-1.5 bg-line-strong' : day.count === 1 ? 'size-2.5 bg-nude-deep' : 'size-3.5 bg-cocoa')} />
              <span className={cn('code text-[0.5625rem] text-ink-muted', !(index === 0 || weekStart) && 'invisible')}>{index === 0 ? t('Today') : short(day.date).slice(0, 2)}</span>
            </li>
          );
        })}
      </ol>
      {groups.length === 0 ? (
        <p className="mt-4 text-ink-muted">{t('Nothing falls due in the next {days} days.', { days: horizonDays })}</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {groups.map((group) => (
            <li key={group.date} className="grid gap-x-6 py-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
              <span className={cn('code', daysBetween(group.date, asOf) > 0 ? 'text-critical' : 'text-ink-soft')}>
                {formatLocalDate(group.date)}
                {daysBetween(group.date, asOf) > 0 && <span className="ms-2">{t('{days}d late', { days: daysBetween(group.date, asOf) })}</span>}
              </span>
              <ul className="space-y-2">
                {group.entries.map((entry) => (
                  <li key={`${entry.kind}-${entry.entityId}-${entry.title}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <StatusChip tone={entry.overdue ? 'critical' : entry.moved ? 'caution' : entry.kind === 'payment' || entry.kind === 'arrival' || entry.kind === 'departure' ? 'transit' : 'neutral'}>{t(KIND_LABEL[entry.kind])}</StatusChip>
                    <Link to={entityPath(entry.entityType, entry.entityId)} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {entry.title}
                    </Link>
                    <span className="text-[0.8125rem] text-ink-muted">{entry.detail}</span>
                    {entry.moved && <span className="code text-caution">{t('moved')}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
