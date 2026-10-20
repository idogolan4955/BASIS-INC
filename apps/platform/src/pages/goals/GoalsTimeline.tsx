import { GOAL_SECTIONS, GOAL_SECTION_LABEL, GOAL_STATUS_TONE, addDays, dateAtPosition, formatLocalDate, pinDate, timelinePosition, timelineRange, todayIn, type GoalSection, type GoalView, type LocalDate } from '@basis/shared';
import { Button, Swatch, cn } from '@basis/ui';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useSaveGoal } from '../../data/boards';
import { useT } from '../../i18n';
import { inputOf } from './Goals';

// The goals on a line of time: a year or a quarter, one lane per section,
// each goal pinned by its due date (achieved goals by their completion).
// Dragging a pin moves the date; goals without a date wait below the axis.

type Quarter = 1 | 2 | 3 | 4 | null;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function Pin({ goal, position, manage, onOpen, onDate, onDragging }: { goal: GoalView; position: number; manage: boolean; onOpen: () => void; onDate: (date: LocalDate) => void; onDragging: (position: number | null) => void }) {
  const t = useT();
  const lane = useRef<HTMLElement | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; moved: boolean; cancelled: boolean }>({ pointerId: -1, startX: 0, moved: false, cancelled: false });
  const [preview, setPreview] = useState<number | null>(null);
  const movable = manage && goal.status !== 'achieved';

  const fractionAt = (clientX: number) => {
    const rect = lane.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return position;
    const rtl = document.documentElement.dir === 'rtl';
    const offset = rtl ? rect.right - clientX : clientX - rect.left;
    return Math.min(0.9999, Math.max(0, offset / rect.width));
  };

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (!movable) return;
    lane.current = event.currentTarget.parentElement;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, moved: false, cancelled: false };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A stale pointer cannot be captured; the drag still follows the events it gets.
    }
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (state.pointerId !== event.pointerId || state.cancelled) return;
    if (!state.moved && Math.abs(event.clientX - state.startX) < 4) return;
    state.moved = true;
    const next = fractionAt(event.clientX);
    setPreview(next);
    onDragging(next);
  };
  const up = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current;
    if (state.pointerId !== event.pointerId) return;
    state.pointerId = -1;
    onDragging(null);
    if (state.cancelled || !state.moved) {
      setPreview(null);
      if (!state.moved && !state.cancelled) onOpen();
      return;
    }
    const next = preview ?? position;
    setPreview(null);
    onDate(dateAtPosition(next, rangeOf(lane.current)));
  };
  const keys = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && drag.current.pointerId !== -1) {
      drag.current.cancelled = true;
      setPreview(null);
      onDragging(null);
      return;
    }
    if (!movable || !goal.due) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const rtl = document.documentElement.dir === 'rtl';
      const forward = (event.key === 'ArrowRight') !== rtl;
      onDate(addDays(goal.due, (forward ? 1 : -1) * (event.shiftKey ? 7 : 1)));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onOpen();
    }
  };

  const at = preview ?? position;
  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={keys}
      onClick={(event) => {
        // The pointer handlers open the goal on a click without movement.
        event.preventDefault();
      }}
      aria-label={`${goal.title}, ${pinDate(goal) ? formatLocalDate(pinDate(goal)!) : t('No date')}`}
      title={goal.title}
      style={{ insetInlineStart: `${at * 100}%` }}
      className={cn('group absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center rtl:translate-x-1/2', movable ? 'cursor-ew-resize' : 'cursor-pointer', preview !== null && 'z-20')}
    >
      <span className={cn('grid size-5 place-items-center rounded-full border-2 border-charcoal bg-panel', goal.overdue && 'border-critical')}>
        <Swatch tone={GOAL_STATUS_TONE[goal.status]} />
      </span>
      <span className="code pointer-events-none mt-1 max-w-36 truncate rounded-[2px] bg-panel/90 px-1 text-[0.6875rem] text-ink-soft group-hover:text-ink">{goal.title}</span>
    </button>
  );
}

const rangeOf = (lane: HTMLElement | null) => {
  const year = Number(lane?.dataset['year'] ?? new Date().getFullYear());
  const quarter = lane?.dataset['quarter'] ? (Number(lane.dataset['quarter']) as Quarter) : null;
  return timelineRange(year, quarter);
};

export function GoalsTimeline({ goals, manage, onOpen, onError }: { goals: readonly GoalView[]; manage: boolean; onOpen: (goal: GoalView) => void; onError: (message: string) => void }) {
  const t = useT();
  const save = useSaveGoal();
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [quarter, setQuarter] = useState<Quarter>(null);
  const [hover, setHover] = useState<LocalDate | null>(null);
  const range = useMemo(() => timelineRange(year, quarter), [year, quarter]);
  const todayAt = timelinePosition(today, range);

  const step = (direction: -1 | 1) => {
    if (quarter === null) setYear(year + direction);
    else {
      const next = quarter + direction;
      if (next < 1) {
        setYear(year - 1);
        setQuarter(4);
      } else if (next > 4) {
        setYear(year + 1);
        setQuarter(1);
      } else setQuarter(next as Quarter);
    }
  };

  const months = useMemo(() => {
    const first = Number(range.start.slice(5, 7)) - 1;
    const count = quarter === null ? 12 : 3;
    return Array.from({ length: count }, (_, index) => MONTHS[first + index]!);
  }, [range, quarter]);

  const setDate = (goal: GoalView, due: LocalDate) => save.mutateAsync({ ...inputOf(goal), due }).catch((failure) => onError(failure instanceof Error ? failure.message : 'The date could not be changed.'));
  const undated = goals.filter((goal) => pinDate(goal) === null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => step(-1)} aria-label={t('Earlier')}>
          <CaretLeft size={14} aria-hidden="true" className="rtl:-scale-x-100" />
        </Button>
        <span className="font-display text-[1.375rem] font-medium">
          {year}
          {quarter !== null && <span className="code ms-2 text-ink-muted">Q{quarter}</span>}
        </span>
        <Button size="sm" onClick={() => step(1)} aria-label={t('Later')}>
          <CaretRight size={14} aria-hidden="true" className="rtl:-scale-x-100" />
        </Button>
        <span className="ms-auto flex gap-1" role="group" aria-label={t('Zoom')}>
          <Button size="sm" variant={quarter === null ? 'primary' : 'secondary'} onClick={() => setQuarter(null)}>{t('Year')}</Button>
          {([1, 2, 3, 4] as const).map((candidate) => (
            <Button key={candidate} size="sm" variant={quarter === candidate ? 'primary' : 'secondary'} onClick={() => setQuarter(candidate)}>
              Q{candidate}
            </Button>
          ))}
        </span>
        {hover && <span className="code text-[0.75rem] text-ink-soft">{formatLocalDate(hover)}</span>}
      </div>
      {/* Phones scroll the line sideways; the page never does. */}
      <div className="overflow-x-auto rounded-[6px] border border-line bg-panel">
        <div className={cn('min-w-[40rem]', quarter === null && 'min-w-[56rem] md:min-w-0')}>
        <div className="flex border-b border-line">
          <span aria-hidden="true" className="w-24 shrink-0 border-e border-line sm:w-32" />
          <div className="relative grid flex-1" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
            {months.map((month) => (
              <span key={month} className="caps border-e border-line px-2 py-1.5 text-[0.625rem] text-ink-muted last:border-e-0">
                {t(month)}
              </span>
            ))}
          </div>
        </div>
        {GOAL_SECTIONS.map((section) => (
          <Lane key={section} section={section} year={year} quarter={quarter} todayAt={todayAt} manage={manage} goals={goals.filter((goal) => goal.section === section && pinDate(goal) !== null)} range={range} onOpen={onOpen} onDate={setDate} onHover={setHover} />
        ))}
        </div>
      </div>
      {undated.length > 0 && (
        <div>
          <p className="caps mb-2 text-ink-muted">{t('No date')}</p>
          <ul className="flex flex-wrap gap-2">
            {undated.map((goal) => (
              <li key={goal.id}>
                <button type="button" onClick={() => onOpen(goal)} className="flex items-center gap-2 rounded-xs border border-line-strong bg-panel px-3 py-1.5 text-[0.8125rem] hover:border-charcoal">
                  <Swatch tone={GOAL_STATUS_TONE[goal.status]} />
                  {goal.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Lane({ section, year, quarter, todayAt, manage, goals, range, onOpen, onDate, onHover }: { section: GoalSection; year: number; quarter: Quarter; todayAt: number | null; manage: boolean; goals: readonly GoalView[]; range: ReturnType<typeof timelineRange>; onOpen: (goal: GoalView) => void; onDate: (goal: GoalView, due: LocalDate) => void; onHover: (date: LocalDate | null) => void }) {
  const t = useT();
  const pinned = goals.map((goal) => ({ goal, position: timelinePosition(pinDate(goal)!, range) })).filter((entry): entry is { goal: GoalView; position: number } => entry.position !== null);
  return (
    <div className="flex items-stretch border-b border-line last:border-b-0">
      <div className="caps w-24 shrink-0 border-e border-line px-3 py-3 text-[0.625rem] text-ink-muted sm:w-32">{t(GOAL_SECTION_LABEL[section])}</div>
      <div data-year={year} data-quarter={quarter ?? ''} className="relative h-24 flex-1">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
        {todayAt !== null && (
          <span aria-label={t('Today')} style={{ insetInlineStart: `${todayAt * 100}%` }} className="absolute inset-y-0 w-px bg-madder/70">
            <span className="code absolute -top-0.5 start-1 text-[0.5625rem] text-critical">{t('today')}</span>
          </span>
        )}
        {pinned.map(({ goal, position }) => (
          <Pin key={goal.id} goal={goal} position={position} manage={manage} onOpen={() => onOpen(goal)} onDate={(date) => onDate(goal, date)} onDragging={(at) => onHover(at === null ? null : dateAtPosition(at, range))} />
        ))}
        {pinned.length === 0 && <span className="absolute inset-0 grid place-items-center text-[0.75rem] text-ink-muted">{t('Nothing due in this range')}</span>}
      </div>
    </div>
  );
}
