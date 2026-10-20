import {
  GOAL_CURRENCIES,
  GOAL_SECTIONS,
  GOAL_SECTION_LABEL,
  GOAL_STATUSES,
  GOAL_STATUS_LABEL,
  GOAL_STATUS_TONE,
  PAPER_TONES,
  PAPER_TONE_LABEL,
  amountFromInput,
  formatLocalDate,
  formatMoney,
  goalCheck,
  isLocalDate,
  moneyFromStored,
  sortGoals,
  type GoalInput,
  type GoalSection,
  type GoalStatus,
  type GoalView,
  type PaperTone,
} from '@basis/shared';
import { Button, Dialog, SelectField, Swatch, TextArea, TextField, cn, sheetTabClass } from '@basis/ui';
import { Check, Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { useDeleteGoal, useGoals, useReorderGoals, useSaveGoal } from '../../data/boards';
import { useT } from '../../i18n';
import { PAPER_CLASS, Paper } from '../board/Board';
import { ModuleTitle } from '../products/ProductsIndex';
import { useRequiredSession } from '../../session';
import { GoalsTimeline } from './GoalsTimeline';

// The goals board: the owner's goals as paper notes in two sections, in an
// order they keep by hand, with a timeline of what is due when. Starts empty.

const VIEW_KEY = 'basis.goals.view';
type View = 'board' | 'timeline';
const pad = (value: number) => String(value).padStart(2, '0');

export const inputOf = (goal: GoalView): GoalInput & { id: string } => ({
  id: goal.id,
  title: goal.title,
  body: goal.body,
  color: goal.color,
  status: goal.status,
  section: goal.section,
  due: goal.due,
  progress: goal.progress,
  targetAmount: goal.targetAmount,
  currentAmount: goal.currentAmount,
  currency: goal.currency,
});

function Progress({ goal }: { goal: GoalView }) {
  const t = useT();
  if (goal.progressPct === null && goal.targetAmount === null) return null;
  const pct = goal.progressPct ?? 0;
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-nude),var(--color-cocoa))]" style={{ width: `${pct}%` }} />
      </div>
      <p className="code mt-1 flex justify-between text-[0.6875rem] text-ink-soft">
        <span>{pct}%</span>
        {goal.targetAmount !== null && (
          <span dir="ltr">
            {formatMoney(moneyFromStored(goal.currentAmount ?? '0', goal.currency), 0)} / {formatMoney(moneyFromStored(goal.targetAmount, goal.currency), 0)} {goal.currency}
          </span>
        )}
        {goal.targetAmount === null && goal.progressPct !== null && <span>{t('progress')}</span>}
      </p>
    </div>
  );
}

function GoalNote({ goal, index, manage, onOpen, onAchieve, onDragStart, onDragOver, onDrop, onKeyMove, stamped }: {
  goal: GoalView;
  index: number;
  manage: boolean;
  onOpen: () => void;
  onAchieve: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onKeyMove: (direction: 'earlier' | 'later' | 'up' | 'down') => void;
  stamped: boolean;
}) {
  const t = useT();
  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      onOpen();
    } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      const rtl = document.documentElement.dir === 'rtl';
      onKeyMove((event.key === 'ArrowRight') !== rtl ? 'later' : 'earlier');
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      onKeyMove(event.key === 'ArrowUp' ? 'up' : 'down');
    }
  };
  return (
    <Paper
      id={goal.id}
      tone={goal.color}
      tabIndex={0}
      draggable={manage}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={keys}
      onClick={onOpen}
      aria-label={goal.title}
      className={cn('flex min-h-[15rem] cursor-pointer flex-col px-5 pb-4 pt-7 hover:-translate-y-px', manage && 'cursor-grab active:cursor-grabbing')}
    >
      <p className="flex items-center justify-between gap-3 text-[0.75rem] text-ink-soft">
        <span className="code">№ {pad(index)}</span>
        <span className="flex items-center gap-1.5">
          <Swatch tone={GOAL_STATUS_TONE[goal.status]} />
          {t(GOAL_STATUS_LABEL[goal.status])}
        </span>
      </p>
      <h3 className="mt-2 font-display text-[1.25rem] font-medium leading-tight">{goal.title}</h3>
      <span aria-hidden="true" className="mt-2 block h-px w-10 bg-charcoal/25" />
      {goal.body && <p className="mt-2 line-clamp-[7] whitespace-pre-wrap text-[0.875rem] leading-snug text-ink-soft">{goal.body}</p>}
      <footer className="mt-auto flex flex-col gap-2 pt-4">
        <Progress goal={goal} />
        <p className="flex items-center justify-between text-[0.75rem]">
          {goal.due ? <span className={cn('code', goal.overdue ? 'font-semibold text-critical' : 'text-ink-soft')}>{formatLocalDate(goal.due)}</span> : <span className="text-ink-muted">{t('No date')}</span>}
          {manage && goal.status !== 'achieved' && (
            <button
              type="button"
              aria-label={t('Mark achieved')}
              title={t('Mark achieved')}
              onClick={(event) => {
                event.stopPropagation();
                onAchieve();
              }}
              className="grid size-7 place-items-center rounded-full border border-charcoal/30 text-transparent transition-colors duration-150 hover:border-charcoal hover:bg-charcoal hover:text-milk"
            >
              <Check size={14} weight="bold" aria-hidden="true" />
            </button>
          )}
          {goal.status === 'achieved' && (
            <span className={cn('grid size-7 place-items-center rounded-full bg-positive text-milk', stamped && 'motion-safe:animate-[stamp_300ms_ease-out]')}>
              <Check size={14} weight="bold" aria-hidden="true" />
            </span>
          )}
        </p>
      </footer>
    </Paper>
  );
}

function GoalDialog({ goal, section, open, onClose, goalsInSection }: { goal: GoalView | null; section: GoalSection; open: boolean; onClose: () => void; goalsInSection: readonly GoalView[] }) {
  const t = useT();
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const reorder = useReorderGoals();
  const [form, setForm] = useState({ title: '', body: '', color: 'bone' as PaperTone, status: 'open' as GoalStatus, section, due: '', progress: '', target: '', current: '', currency: 'USD' as GoalInput['currency'] });
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirming(false);
    setForm(goal
      ? { title: goal.title, body: goal.body, color: goal.color, status: goal.status, section: goal.section, due: goal.due ?? '', progress: goal.progress === null ? '' : String(goal.progress), target: goal.targetAmount === null ? '' : formatMoney(moneyFromStored(goal.targetAmount, goal.currency), 2).replace(/,/g, ''), current: goal.currentAmount === null ? '' : formatMoney(moneyFromStored(goal.currentAmount, goal.currency), 2).replace(/,/g, ''), currency: goal.currency }
      : { title: '', body: '', color: 'bone', status: 'open', section, due: '', progress: '', target: '', current: '', currency: 'USD' });
  }, [open, goal, section]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const money = form.target.trim() !== '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const targetAmount = money ? amountFromInput(form.target) : null;
    const currentAmount = money ? (form.current.trim() ? amountFromInput(form.current) : '0') : null;
    if (money && targetAmount === null) return setError(t('The target is not an amount.'));
    if (money && currentAmount === null) return setError(t('The current amount is not an amount.'));
    const progress = money ? null : form.progress.trim() ? Number(form.progress) : null;
    const input: GoalInput = { title: form.title, body: form.body, color: form.color, status: form.status, section: form.section, due: form.due && isLocalDate(form.due) ? form.due : null, progress, targetAmount, currentAmount, currency: form.currency };
    if (form.due && !isLocalDate(form.due)) return setError(t('The due date is not a date.'));
    const problem = goalCheck(input);
    if (problem) return setError(t(problem));
    try {
      await save.mutateAsync(goal ? { ...input, id: goal.id } : input);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The goal could not be saved.');
    }
  };

  const position = goal ? goalsInSection.findIndex((candidate) => candidate.id === goal.id) : -1;
  const shift = async (direction: -1 | 1) => {
    if (!goal || position < 0) return;
    const ids = goalsInSection.map((candidate) => candidate.id);
    const target = position + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[position], ids[target]] = [ids[target]!, ids[position]!];
    await reorder.mutateAsync({ ids, section: goal.section });
  };

  return (
    <Dialog open={open} onClose={onClose} title={goal ? t('Goal') : t('New goal')} description={t('A goal is a paper note with a section, a status, a date and a measure of progress.')} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Title')} required maxLength={140} value={form.title} onChange={set('title')} className="sm:col-span-2" />
        <TextArea label={t('Text')} rows={4} maxLength={4000} value={form.body} onChange={set('body')} className="sm:col-span-2" />
        <SelectField label={t('Section')} value={form.section} onChange={set('section')}>
          {GOAL_SECTIONS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(GOAL_SECTION_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {GOAL_STATUSES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(GOAL_STATUS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <fieldset>
          <legend className="mb-1.5 block text-xs font-medium text-ink-soft">{t('Paper')}</legend>
          <div className="flex items-center gap-2">
            {PAPER_TONES.map((tone) => (
              <button key={tone} type="button" aria-label={t(PAPER_TONE_LABEL[tone])} aria-pressed={tone === form.color} onClick={() => setForm((current) => ({ ...current, color: tone }))} className={cn('size-7 rounded-full border border-charcoal/20', PAPER_CLASS[tone], tone === form.color && 'ring-2 ring-charcoal ring-offset-1')} />
            ))}
          </div>
        </fieldset>
        <TextField label={t('Due')} type="date" value={form.due} onChange={set('due')} />
        <TextField label={t('Target amount')} inputMode="decimal" value={form.target} onChange={set('target')} placeholder="0.00" help={t('Leave empty for a goal measured by hand.')} />
        {money ? (
          <TextField label={t('Current amount')} inputMode="decimal" value={form.current} onChange={set('current')} placeholder="0.00" />
        ) : (
          <TextField label={t('Progress')} type="number" min={0} max={100} unit="%" value={form.progress} onChange={set('progress')} />
        )}
        {money && (
          <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
            {GOAL_CURRENCIES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </SelectField>
        )}
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 sm:col-span-2">
          {goal && (
            <>
              <Button size="sm" onClick={() => void shift(-1)} disabled={position <= 0 || reorder.isPending}>{t('Move earlier')}</Button>
              <Button size="sm" onClick={() => void shift(1)} disabled={position < 0 || position >= goalsInSection.length - 1 || reorder.isPending}>{t('Move later')}</Button>
              {confirming ? (
                <span className="flex items-center gap-2 text-[0.8125rem]">
                  {t('Remove this goal?')}
                  <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>{t('Keep')}</Button>
                  <Button size="sm" onClick={() => remove.mutateAsync(goal.id).then(onClose).catch((failure) => setError(failure instanceof Error ? failure.message : 'The goal could not be removed.'))} busy={remove.isPending}>{t('Remove')}</Button>
                </span>
              ) : (
                <Button size="sm" variant="quiet" onClick={() => setConfirming(true)}>{t('Remove')}</Button>
              )}
            </>
          )}
          <span className="ms-auto flex gap-2">
            <Button onClick={onClose}>{t('Cancel')}</Button>
            <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{goal ? t('Save') : t('Create goal')}</Button>
          </span>
        </div>
      </form>
    </Dialog>
  );
}

export function Goals() {
  const t = useT();
  const session = useRequiredSession();
  const goals = useGoals();
  const save = useSaveGoal();
  const reorder = useReorderGoals();
  const manage = session.role === 'owner';
  const [view, setView] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'timeline' ? 'timeline' : 'board';
    } catch {
      return 'board';
    }
  });
  const [filter, setFilter] = useState<'all' | GoalStatus>('all');
  const [dialog, setDialog] = useState<{ goal: GoalView | null; section: GoalSection } | null>(null);
  const [openStrip, setOpenStrip] = useState<Record<GoalSection, boolean>>({ ops: false, finance: false });
  const [stamped, setStamped] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = (next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // Private mode: the choice lasts the session.
    }
  };

  const all = useMemo(() => sortGoals(goals.data ?? []), [goals.data]);
  const counts = useMemo(() => Object.fromEntries(GOAL_STATUSES.map((status) => [status, all.filter((goal) => goal.status === status).length])) as Record<GoalStatus, number>, [all]);
  const visible = filter === 'all' ? all : all.filter((goal) => goal.status === filter);
  const fail = (failure: unknown) => setError(failure instanceof Error ? failure.message : 'The goals could not be updated.');

  const achieve = (goal: GoalView) => {
    setStamped(goal.id);
    setOpenStrip((current) => ({ ...current, [goal.section]: true }));
    save.mutateAsync({ ...inputOf(goal), status: 'achieved' }).catch(fail);
    window.setTimeout(() => setStamped(null), 400);
  };

  /** The visible order of a section after a drop, merged with the goals a filter hides. */
  const dropInto = (section: GoalSection, beforeId: string | null) => {
    if (!dragId) return;
    const sectionAll = all.filter((goal) => goal.section === section && goal.id !== dragId).map((goal) => goal.id);
    const at = beforeId ? sectionAll.indexOf(beforeId) : sectionAll.length;
    const ids = [...sectionAll];
    ids.splice(at < 0 ? ids.length : at, 0, dragId);
    setDragId(null);
    reorder.mutateAsync({ ids, section }).catch(fail);
  };

  const keyMove = (goal: GoalView, direction: 'earlier' | 'later' | 'up' | 'down') => {
    if (!manage) return;
    const sectionIds = all.filter((candidate) => candidate.section === goal.section).map((candidate) => candidate.id);
    const index = sectionIds.indexOf(goal.id);
    if (direction === 'earlier' || direction === 'later') {
      const target = index + (direction === 'earlier' ? -1 : 1);
      if (target < 0 || target >= sectionIds.length) return;
      [sectionIds[index], sectionIds[target]] = [sectionIds[target]!, sectionIds[index]!];
      reorder.mutateAsync({ ids: sectionIds, section: goal.section }).catch(fail);
    } else {
      const other = GOAL_SECTIONS[(GOAL_SECTIONS.indexOf(goal.section) + (direction === 'up' ? -1 : 1) + GOAL_SECTIONS.length) % GOAL_SECTIONS.length]!;
      if (other === goal.section) return;
      const ids = [...all.filter((candidate) => candidate.section === other).map((candidate) => candidate.id), goal.id];
      reorder.mutateAsync({ ids, section: other }).catch(fail);
    }
  };

  return (
    <>
      <ModuleTitle
        number="17"
        title={t('Goals')}
        actions={
          <>
            <div className="flex border-b border-line" role="tablist" aria-label={t('View')}>
              <button type="button" role="tab" aria-selected={view === 'board'} onClick={() => choose('board')} className={sheetTabClass(view === 'board')}>{t('Board')}</button>
              <button type="button" role="tab" aria-selected={view === 'timeline'} onClick={() => choose('timeline')} className={sheetTabClass(view === 'timeline')}>{t('Timeline')}</button>
            </div>
            {manage && (
              <Button variant="primary" onClick={() => setDialog({ goal: null, section: 'ops' })}>
                <Plus size={16} aria-hidden="true" />{t('New goal')}</Button>
            )}
          </>
        }
      >{t('The company\'s goals, by section, in the order that matters. Drag to reorder; the timeline shows what is due when.')}</ModuleTitle>
      <div className="flex flex-col gap-6 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Filter by status')}>
          {(['all', ...GOAL_STATUSES] as const).map((status) => (
            <button key={status} type="button" aria-pressed={filter === status} onClick={() => setFilter(status)} className={cn('flex h-8 items-center gap-2 rounded-xs border px-3 text-[0.8125rem]', filter === status ? 'border-charcoal bg-charcoal text-milk' : 'border-line-strong bg-panel hover:border-charcoal')}>
              {status !== 'all' && <Swatch tone={GOAL_STATUS_TONE[status]} />}
              {status === 'all' ? t('All') : t(GOAL_STATUS_LABEL[status])}
              <span className="code text-[0.6875rem] opacity-70">{status === 'all' ? all.length : counts[status]}</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        {goals.isPending ? (
          <p className="text-ink-muted">{t('Loading goals')}</p>
        ) : view === 'timeline' ? (
          <GoalsTimeline goals={visible} manage={manage} onOpen={(goal) => setDialog({ goal, section: goal.section })} onError={setError} />
        ) : (
          GOAL_SECTIONS.map((section) => {
            const own = visible.filter((goal) => goal.section === section);
            const live = own.filter((goal) => goal.status !== 'achieved');
            const done = own.filter((goal) => goal.status === 'achieved');
            const stripOpen = openStrip[section] || filter === 'achieved';
            return (
              <section
                key={section}
                aria-label={t(GOAL_SECTION_LABEL[section])}
                onDragOver={(event) => {
                  if (dragId) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropInto(section, null);
                }}
                className="rounded-[6px] border border-dashed border-line-strong bg-[radial-gradient(var(--color-line-strong)_0.8px,transparent_0.8px)] p-5 [background-size:22px_22px]"
              >
                <header className="mb-5 flex items-baseline justify-between gap-4">
                  <h2 className="caps text-ink-muted">
                    {t(GOAL_SECTION_LABEL[section])} <span className="code ms-2">{own.length}</span>
                  </h2>
                  {manage && (
                    <Button size="sm" onClick={() => setDialog({ goal: null, section })}>
                      <Plus size={14} aria-hidden="true" />{t('New goal')}</Button>
                  )}
                </header>
                {own.length === 0 ? (
                  <Paper id={`empty-${section}`} tone="milk" className="mx-auto w-[232px] px-5 pb-4 pt-7">
                    <p className="font-display text-[1.0625rem] leading-snug [&::first-line]:font-semibold">
                      {section === 'ops' ? t('No operational goals yet.') : t('No financial targets yet.')}
                      {'\n'}
                      {manage ? t('Pin the first one.') : t('The owner pins them.')}
                    </p>
                  </Paper>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-6">
                    {live.map((goal) => (
                      <li key={goal.id} className="flex">
                        <GoalNote
                          goal={goal}
                          index={goal.order}
                          manage={manage}
                          stamped={stamped === goal.id}
                          onOpen={() => setDialog({ goal, section: goal.section })}
                          onAchieve={() => achieve(goal)}
                          onDragStart={(event) => {
                            setDragId(goal.id);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(event) => {
                            if (dragId && dragId !== goal.id) event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            dropInto(section, goal.id);
                          }}
                          onKeyMove={(direction) => keyMove(goal, direction)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                {done.length > 0 && filter !== 'achieved' && (
                  <details open={stripOpen} onToggle={(event) => setOpenStrip((current) => ({ ...current, [section]: (event.target as HTMLDetailsElement).open }))} className="mt-6 border-t border-line pt-4">
                    <summary className="cursor-pointer text-[0.8125rem] text-ink-soft">
                      {t('Achieved')} <span className="code ms-1">{done.length}</span>
                    </summary>
                    <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-6 opacity-90">
                      {done.map((goal) => (
                        <li key={goal.id} className="flex">
                          <GoalNote goal={goal} index={goal.order} manage={manage} stamped={stamped === goal.id} onOpen={() => setDialog({ goal, section: goal.section })} onAchieve={() => undefined} onDragStart={(event) => { setDragId(goal.id); event.dataTransfer.effectAllowed = 'move'; }} onDragOver={(event) => { if (dragId && dragId !== goal.id) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); dropInto(section, goal.id); }} onKeyMove={(direction) => keyMove(goal, direction)} />
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {filter === 'achieved' && done.length > 0 && (
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-6">
                    {done.map((goal) => (
                      <li key={goal.id} className="flex">
                        <GoalNote goal={goal} index={goal.order} manage={manage} stamped={false} onOpen={() => setDialog({ goal, section: goal.section })} onAchieve={() => undefined} onDragStart={() => undefined} onDragOver={() => undefined} onDrop={() => undefined} onKeyMove={() => undefined} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
      {manage && (
        <GoalDialog
          goal={dialog?.goal ?? null}
          section={dialog?.section ?? 'ops'}
          open={dialog !== null}
          onClose={() => setDialog(null)}
          goalsInSection={all.filter((goal) => goal.section === (dialog?.goal?.section ?? dialog?.section))}
        />
      )}
    </>
  );
}
