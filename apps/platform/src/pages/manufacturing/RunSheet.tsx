import {
  HEALTH_LABEL,
  HEALTH_TONE,
  LOT_QUALITY_LABEL,
  LOT_QUALITY_TONE,
  MILESTONE_STATES,
  MILESTONE_STATE_LABEL,
  RUN_STATE_LABEL,
  RUN_STATE_TONE,
  daysBetween,
  formatLocalDate,
  formatQuantity,
  quantityFromStored,
  todayIn,
  type MilestoneRecord,
  type MilestoneState,
  type RunDetail,
} from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Meter, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, Track, cn, sheetTabClass, type TrackStep } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useProductionRun, useUpdateMilestone } from '../../data/manufacturing';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const short = (date: string | null) => (date ? formatLocalDate(date as never).slice(0, 6) : '—');
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

const DELAY_REASONS = ['Yarn late', 'Machine capacity', 'Dyehouse backlog', 'Lab dip rejected', 'Shade re-dye', 'Holiday closure', 'Quality rework', 'Other'];

function toTrackSteps(run: RunDetail, today: string): TrackStep[] {
  return run.milestones.map((milestone) => {
    const expected = milestone.actualEnd ?? milestone.forecastEnd ?? milestone.plannedEnd;
    const slipped = daysBetween(milestone.plannedEnd, expected) > 0;
    const overdue = milestone.state !== 'done' && milestone.state !== 'skipped' && daysBetween(expected, today as never) > 0;
    return {
      key: milestone.key,
      label: milestone.name,
      state: milestone.state === 'done' || milestone.state === 'skipped' ? 'done' : milestone.state === 'in_progress' ? 'active' : milestone.state === 'blocked' ? 'blocked' : 'pending',
      caption: milestone.actualEnd ? short(milestone.actualEnd) : slipped ? `${short(milestone.plannedEnd)} → ${short(expected)}` : short(milestone.plannedEnd),
      late: milestone.state !== 'done' && milestone.state !== 'skipped' && (slipped || overdue),
    };
  });
}

function UpdateDialog({ run, milestone, onClose }: { run: RunDetail; milestone: MilestoneRecord | null; onClose: () => void }) {
  const update = useUpdateMilestone();
  const [form, setForm] = useState({ state: milestone?.state ?? 'pending', forecastEnd: milestone?.forecastEnd ?? '', actualStart: milestone?.actualStart ?? '', actualEnd: milestone?.actualEnd ?? '', delayReason: milestone?.delayReason ?? '', note: milestone?.note ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!milestone) return;
    setError(null);
    try {
      await update.mutateAsync({
        runNumber: run.number,
        milestoneId: milestone.id,
        state: form.state as MilestoneState,
        forecastEnd: form.state === 'pending' ? null : form.forecastEnd || null,
        actualStart: form.actualStart || null,
        actualEnd: form.actualEnd || null,
        delayReason: form.delayReason || null,
        note: form.note.trim() || null,
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The milestone could not be updated.');
    }
  };

  return (
    <Dialog open={milestone !== null} onClose={onClose} title={milestone ? `${milestone.name}` : 'Milestone'} description={milestone ? `Planned ${formatLocalDate(milestone.plannedStart)} to ${formatLocalDate(milestone.plannedEnd)}. The run's health follows from what is recorded here.` : undefined}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label="State" value={form.state} onChange={set('state')}>
          {MILESTONE_STATES.map((state) => (
            <option key={state} value={state}>
              {MILESTONE_STATE_LABEL[state]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Now expected to end"
          type="date"
          value={form.state === 'pending' ? '' : form.forecastEnd}
          onChange={set('forecastEnd')}
          disabled={form.state === 'pending'}
          help={form.state === 'pending' ? 'A pending step follows the steps before it.' : 'Leave empty when the plan holds.'}
        />
        <TextField label="Actual start" type="date" value={form.actualStart} onChange={set('actualStart')} />
        <TextField label="Actual end" type="date" value={form.actualEnd} onChange={set('actualEnd')} help="Filled in when the step is done." />
        <SelectField label="Delay reason" value={form.delayReason} onChange={set('delayReason')}>
          <option value="">None</option>
          {DELAY_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </SelectField>
        <TextArea label="Note" value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel="Saving">
            Save milestone
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RunTimelinePanel({ number }: { number: string }) {
  const timeline = useTimeline('production_run', number);
  const note = useRecordNote('production_run', number);
  return (
    <Panel title="Timeline" count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function RunSheet({ tab }: { tab: 'milestones' | 'lots' | 'timeline' }) {
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const run = useProductionRun(number);
  const [editing, setEditing] = useState<MilestoneRecord | null>(null);
  const manage = ['owner', 'operations', 'purchasing', 'qc'].includes(session.role);
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

  if (run.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">Loading run</p>;
  if (run.error) return <p className="px-5 py-10 text-critical lg:px-8">The run could not be loaded. {run.error.message}</p>;
  if (!run.data) return <NotFound what="production run" />;
  const data = run.data;
  const base = `/manufacturing/runs/${data.number}`;
  const expectedEnd = data.forecastEnd ?? data.plannedEnd;
  const slip = daysBetween(data.plannedEnd, expectedEnd);

  return (
    <>
      <LabelHeader
        code={data.number}
        title={data.products.join('; ')}
        subtitle={
          <>
            Purchase order{' '}
            <Link to={`/manufacturing/purchase-orders/${data.purchaseOrderNumber}`} className="code underline decoration-line-strong underline-offset-4">
              {data.purchaseOrderNumber}
            </Link>
            {' · '}
            {data.supplierName}
            {data.factoryName ? `, ${data.factoryName}` : ''}
          </>
        }
        status={
          <>
            <StatusChip tone={RUN_STATE_TONE[data.state]}>{RUN_STATE_LABEL[data.state]}</StatusChip>
            <StatusChip tone={HEALTH_TONE[data.health]}>{HEALTH_LABEL[data.health]}</StatusChip>
          </>
        }
        facts={[
          { label: 'Quantity', value: metres(data.totalQuantity) },
          { label: 'Process', value: data.templateName || '—' },
          { label: 'Planned', value: `${short(data.plannedStart)} to ${short(data.plannedEnd)}` },
          { label: 'Expected end', value: <span className={cn(slip > 0 && 'text-critical')}>{dateOrDash(expectedEnd)}{slip > 0 ? ` (+${slip}d)` : ''}</span> },
          { label: 'Progress', value: <Meter value={data.progress} /> },
          { label: 'Lots', value: data.lots.length },
        ]}
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>
          Milestones
        </NavLink>
        <NavLink to={`${base}/lots`} className={({ isActive }) => sheetTabClass(isActive)}>
          Lots
        </NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>
          Timeline
        </NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'milestones' && (
          <>
            <Panel title="Production timeline">
              <Track steps={toTrackSteps(data, today)} />
            </Panel>
            <Panel title="Milestones" count={data.milestones.length} flush>
              <Ledger caption={`Milestones of ${data.number}`}>
                <thead>
                  <tr>
                    <Th className="w-14">No.</Th>
                    <Th>Step</Th>
                    <Th>Planned</Th>
                    <Th>Expected</Th>
                    <Th>Actual</Th>
                    <Th>State</Th>
                    <Th>Reason</Th>
                    {manage && <Th>Update</Th>}
                  </tr>
                </thead>
                <tbody>
                  {data.milestones.map((milestone) => {
                    const expected = milestone.forecastEnd ?? milestone.plannedEnd;
                    const slipped = daysBetween(milestone.plannedEnd, expected) > 0;
                    const open = milestone.state !== 'done' && milestone.state !== 'skipped';
                    return (
                      <Tr key={milestone.id}>
                        <Td className="code text-ink-muted">{String(milestone.sequence).padStart(2, '0')}</Td>
                        <Td className="font-medium">
                          {milestone.name}
                          {milestone.gate !== 'none' && <span className="code ml-2 text-ink-muted">{milestone.gate === 'inspection' ? 'QC GATE' : 'APPROVAL'}</span>}
                        </Td>
                        <Td className="code whitespace-nowrap text-ink-soft">
                          {short(milestone.plannedStart)} – {short(milestone.plannedEnd)}
                        </Td>
                        <Td className={cn('code whitespace-nowrap', open && slipped ? 'text-critical' : 'text-ink-soft')}>{open ? short(expected) : '—'}</Td>
                        <Td className="code whitespace-nowrap text-ink-soft">
                          {milestone.actualStart || milestone.actualEnd ? `${short(milestone.actualStart)} – ${short(milestone.actualEnd)}` : '—'}
                        </Td>
                        <Td>
                          <StatusChip tone={milestone.state === 'done' ? 'positive' : milestone.state === 'in_progress' ? 'transit' : milestone.state === 'blocked' ? 'critical' : milestone.state === 'skipped' ? 'neutral' : open && slipped ? 'caution' : 'neutral'}>
                            {MILESTONE_STATE_LABEL[milestone.state]}
                          </StatusChip>
                        </Td>
                        <Td className="text-ink-soft">{milestone.delayReason || '—'}</Td>
                        {manage && (
                          <Td>
                            <Button size="sm" variant="quiet" onClick={() => setEditing(milestone)} disabled={data.state === 'cancelled'}>
                              Update
                            </Button>
                          </Td>
                        )}
                      </Tr>
                    );
                  })}
                </tbody>
              </Ledger>
            </Panel>
            <Panel title="Lines" count={data.lines.length} flush>
              <Ledger caption={`Lines of ${data.number}`}>
                <thead>
                  <tr>
                    <Th>SKU</Th>
                    <Th>Product</Th>
                    <Th>Shade</Th>
                    <Th numeric>Planned</Th>
                    <Th numeric>Produced</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => (
                    <Tr key={line.id}>
                      <Td>
                        <Link to={`/products/skus/${line.skuCode}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {line.skuCode}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap font-medium">
                        {line.productName} <span className="font-normal text-ink-muted">{line.variantName}</span>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <ShadeDot hex={line.shadeHex} name={line.shadeName} code={line.shadeCode} size="sm" />
                          {line.shadeName}
                        </span>
                      </Td>
                      <Td numeric>{metres(line.plannedQuantity)}</Td>
                      <Td numeric>{metres(line.producedQuantity)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            </Panel>
          </>
        )}
        {tab === 'lots' && (
          <Panel title="Lots" count={data.lots.length} flush>
            {data.lots.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">No lots recorded yet. Lots are recorded as the run produces them and released by QC.</p>
            ) : (
              <Ledger caption={`Lots of ${data.number}`}>
                <thead>
                  <tr>
                    <Th>Lot</Th>
                    <Th>SKU</Th>
                    <Th>Mill reference</Th>
                    <Th numeric>Quantity</Th>
                    <Th>Produced</Th>
                    <Th>Quality</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.lots.map((lot) => (
                    <Tr key={lot.id}>
                      <Td className="code">{lot.number}</Td>
                      <Td className="code">{lot.skuCode}</Td>
                      <Td className="code text-ink-soft">{lot.millLotRef || '—'}</Td>
                      <Td numeric>{metres(lot.producedQuantity)}</Td>
                      <Td className="code text-ink-soft">{dateOrDash(lot.producedOn)}</Td>
                      <Td>
                        <StatusChip tone={LOT_QUALITY_TONE[lot.qualityState]}>{LOT_QUALITY_LABEL[lot.qualityState]}</StatusChip>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
        {tab === 'timeline' && <RunTimelinePanel number={data.number} />}
      </div>
      {manage && <UpdateDialog key={editing?.id ?? 'none'} run={data} milestone={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
