import {
  ACTION_STATE_LABEL,
  ACTION_STATE_TONE,
  CHECK_CATEGORY_LABEL,
  DEFECT_TYPES,
  DISPOSITION_LABEL,
  INSPECTION_RESULT_LABEL,
  INSPECTION_RESULT_TONE,
  INSPECTION_STATE_LABEL,
  INSPECTION_STATE_TONE,
  INSPECTION_TYPE_LABEL,
  defectPointsPer100m,
  dispositionsFor,
  formatDeltaE,
  formatLab,
  formatLocalDate,
  formatQuantity,
  inspectionResult,
  measurementOutcome,
  quantityFromStored,
  type CheckOutcome,
  type Disposition,
} from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Panel, SelectField, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, cn, sheetTabClass } from '@basis/ui';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useCreateCorrectiveAction, useInspection, useRecordInspection, useSignOffInspection, useSubmitInspection, type CheckView, type InspectionDetail } from '../../data/quality';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';

// An inspection, built to be recorded on a phone at the mill: one check per
// row with large pass / fail targets, measurements typed in their unit,
// defects per roll, shade readings; the result reads itself from what is
// recorded, and a draft survives a lost connection in the browser.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const DRAFT_KEY = (number: string) => `basis.inspection.${number}`;

type Draft = { checks: Record<string, { outcome?: CheckOutcome; measured?: string | null; note?: string }>; };

function readDraft(number: string): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(number));
    return raw ? (JSON.parse(raw) as Draft) : { checks: {} };
  } catch {
    return { checks: {} };
  }
}
function writeDraft(number: string, draft: Draft) {
  try {
    if (Object.keys(draft.checks).length === 0) localStorage.removeItem(DRAFT_KEY(number));
    else localStorage.setItem(DRAFT_KEY(number), JSON.stringify(draft));
  } catch {
    // Private mode: the draft lasts the page.
  }
}

/** Thousandths of a unit, shown in the unit. */
const show = (stored: string | null, unit: string) => (stored === null ? '' : unit === 'dE' ? (Number(stored) / 100).toFixed(2) : `${Number(stored) / 1000}`);
const store = (text: string, unit: string): string | null => {
  const value = Number(text.replace(',', '.'));
  if (!text.trim() || Number.isNaN(value)) return null;
  return String(Math.round(value * (unit === 'dE' ? 100 : 1000)));
};

function Segment({ value, onChange, disabled }: { value: CheckOutcome; onChange: (outcome: CheckOutcome) => void; disabled: boolean }) {
  const t = useT();
  const options: { key: CheckOutcome; label: string; tone: string }[] = [
    { key: 'pass', label: t('Pass'), tone: 'bg-positive text-milk border-positive' },
    { key: 'fail', label: t('Fail'), tone: 'bg-critical text-milk border-critical' },
    { key: 'not_applicable', label: t('N/A'), tone: 'bg-charcoal text-milk border-charcoal' },
  ];
  return (
    <span role="radiogroup" className="inline-flex overflow-hidden rounded-xs border border-line-strong">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          disabled={disabled}
          onClick={() => onChange(option.key)}
          className={cn('h-11 min-w-16 px-3 text-sm font-medium transition-colors duration-150 disabled:opacity-60', value === option.key ? option.tone : 'bg-milk text-ink hover:bg-sunken')}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

function Checks({ inspection, editable }: { inspection: InspectionDetail; editable: boolean }) {
  const t = useT();
  const record = useRecordInspection();
  const [draft, setDraft] = useState<Draft>(() => readDraft(inspection.number));
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => writeDraft(inspection.number, draft), [draft, inspection.number]);
  const dirty = Object.keys(draft.checks).length;

  const merged = useMemo(
    () =>
      inspection.checks.map((check) => {
        const change = draft.checks[check.id];
        const measured = change?.measured !== undefined ? change.measured : check.measured;
        const outcome = check.kind === 'measurement' && measured !== null ? measurementOutcome({ measured, expected: check.expected, toleranceMinus: check.toleranceMinus, tolerancePlus: check.tolerancePlus }) : (change?.outcome ?? check.outcome);
        return { ...check, measured, outcome, note: change?.note ?? check.note };
      }),
    [inspection.checks, draft],
  );
  const result = inspectionResult(
    merged.map((check) => ({ key: check.key, category: check.category, kind: check.kind, isCritical: check.isCritical, outcome: check.outcome, measured: check.measured, expected: check.expected, toleranceMinus: check.toleranceMinus, tolerancePlus: check.tolerancePlus })),
    inspection.defects.map((defect) => ({ points: defect.points, rollNumber: defect.rollNumber })),
    inspection.readings,
    inspection.rolls.length > 0 ? inspection.rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString() : inspection.lotQuantity,
    { maxDefectPointsPer100m: inspection.maxDefectPointsPer100m, maxDeltaE: inspection.maxDeltaE },
  );
  const pending = merged.filter((check) => check.outcome === 'pending').length;

  const change = (check: CheckView, patch: Draft['checks'][string]) => setDraft((current) => ({ checks: { ...current.checks, [check.id]: { ...current.checks[check.id], ...patch } } }));
  const save = async () => {
    setSaved(null);
    try {
      await record.mutateAsync({ number: inspection.number, checks: Object.entries(draft.checks).map(([id, patch]) => ({ id, ...patch })) });
      setDraft({ checks: {} });
      setSaved(t('Saved'));
    } catch (failure) {
      setSaved(failure instanceof Error ? failure.message : t('Could not save.'));
    }
  };

  const groups = [...new Set(merged.map((check) => check.category))];
  return (
    <Panel
      title={t('Checks')}
      count={merged.length}
      action={
        <span className="flex items-center gap-3">
          {saved && <span className={cn('text-[0.8125rem]', saved === t('Saved') ? 'text-positive' : 'text-critical')}>{saved}</span>}
          {dirty > 0 && <span className="code text-ink-muted">{t('{count} unsaved', { count: dirty })}</span>}
          <span className="text-[0.8125rem] text-ink-muted">
            {pending > 0 ? t('{count} pending', { count: pending }) : result ? `${t('Reads as')} ${t(INSPECTION_RESULT_LABEL[result]).toLowerCase()}` : ''}
          </span>
          {editable && (
            <Button size="sm" variant="primary" onClick={() => void save()} disabled={dirty === 0} busy={record.isPending} busyLabel={t('Saving')}>
              {t('Save')}
            </Button>
          )}
        </span>
      }
    >
      <div className="space-y-6">
        {groups.map((category) => (
          <section key={category}>
            <h3 className="caps mb-2 text-ink-soft">{t(CHECK_CATEGORY_LABEL[category])}</h3>
            <ul className="divide-y divide-line border-y border-line">
              {merged
                .filter((check) => check.category === category)
                .map((check) => (
                  <li key={check.id} className="grid gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {check.parameter}
                        {check.isCritical && <span className="code ms-2 text-critical">{t('CRITICAL')}</span>}
                      </p>
                      {check.method && <p className="text-[0.8125rem] text-ink-muted">{check.method}</p>}
                      {check.kind === 'measurement' && check.expected !== null && (
                        <p className="code mt-0.5 text-ink-muted">
                          {t('Expected')} {show(check.expected, check.unit)} {check.unit} (−{show(check.toleranceMinus ?? '0', check.unit)} / +{show(check.tolerancePlus ?? '0', check.unit)})
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {check.kind === 'measurement' ? (
                        <>
                          <label className="flex items-center gap-2">
                            <span className="sr-only">{check.parameter}</span>
                            <input
                              inputMode="decimal"
                              defaultValue={show(check.measured, check.unit)}
                              disabled={!editable}
                              onBlur={(event) => change(check, { measured: store(event.target.value, check.unit) })}
                              className="h-11 w-28 rounded-xs border border-line-strong bg-milk px-3 text-end text-base tabular-nums outline-none focus:border-charcoal disabled:opacity-60"
                            />
                            <span className="code text-ink-muted">{check.unit}</span>
                          </label>
                          <StatusChip tone={check.outcome === 'pass' ? 'positive' : check.outcome === 'fail' ? 'critical' : 'neutral'}>{check.outcome === 'pending' ? t('Pending') : check.outcome === 'pass' ? t('Pass') : check.outcome === 'fail' ? t('Fail') : t('N/A')}</StatusChip>
                        </>
                      ) : (
                        <Segment value={check.outcome} onChange={(outcome) => change(check, { outcome })} disabled={!editable} />
                      )}
                    </div>
                    {(check.outcome === 'fail' || check.note) && (
                      <input
                        defaultValue={check.note}
                        placeholder={t('What was found')}
                        disabled={!editable}
                        onBlur={(event) => change(check, { note: event.target.value })}
                        className="h-10 w-full rounded-xs border border-line bg-milk px-3 text-sm outline-none focus:border-charcoal disabled:opacity-60 md:col-span-2"
                      />
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function Readings({ inspection, editable }: { inspection: InspectionDetail; editable: boolean }) {
  const t = useT();
  const record = useRecordInspection();
  const [form, setForm] = useState({ rollNumber: '', l: '', a: '', b: '', deltaE: '', visualGrade: '4-5', standardRef: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const add = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const num = (value: string, scale: number) => Math.round(Number(value.replace(',', '.')) * scale);
    if (!form.deltaE.trim() || Number.isNaN(Number(form.deltaE))) return setError(t('Give the ΔE against the standard.'));
    try {
      await record.mutateAsync({ number: inspection.number, readings: [{ rollNumber: form.rollNumber || undefined, lStar: num(form.l || '0', 1000), aStar: num(form.a || '0', 1000), bStar: num(form.b || '0', 1000), deltaE: num(form.deltaE, 100), visualGrade: form.visualGrade || undefined, standardRef: form.standardRef || undefined }] });
      setForm((f) => ({ ...f, l: '', a: '', b: '', deltaE: '' }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not save.'));
    }
  };
  const worst = inspection.readings.reduce((max, reading) => Math.max(max, reading.deltaE), 0);
  return (
    <Panel title={t('Shade readings')} count={inspection.readings.length} action={inspection.readings.length > 0 && <span className={cn('code', inspection.maxDeltaE !== null && worst > inspection.maxDeltaE ? 'text-critical' : 'text-ink-muted')}>{t('worst ΔE')} {formatDeltaE(worst)}{inspection.maxDeltaE !== null ? ` / ${formatDeltaE(inspection.maxDeltaE)}` : ''}</span>}>
      {inspection.readings.length > 0 && (
        <ul className="mb-4 divide-y divide-line border-y border-line">
          {inspection.readings.map((reading) => (
            <li key={reading.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
              <span className="code">{reading.rollNumber ?? t('Lot')}</span>
              <span className="code text-ink-soft">L* {formatLab(reading.lStar)} a* {formatLab(reading.aStar)} b* {formatLab(reading.bStar)}</span>
              <span className={cn('code font-medium', inspection.maxDeltaE !== null && reading.deltaE > inspection.maxDeltaE ? 'text-critical' : '')}>ΔE {formatDeltaE(reading.deltaE)}</span>
              <span className="text-ink-muted">{reading.illuminant}{reading.visualGrade ? ` · ${t('grade')} ${reading.visualGrade}` : ''}{reading.standardRef ? ` · ${reading.standardRef}` : ''}</span>
              {editable && (
                <Button size="sm" variant="quiet" onClick={() => record.mutate({ number: inspection.number, removeReadings: [reading.id] })}>
                  {t('Remove')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-6">
          <SelectField label={t('Roll')} value={form.rollNumber} onChange={set('rollNumber')} className="sm:col-span-2">
            <option value="">{t('Whole lot')}</option>
            {inspection.rolls.map((roll) => (
              <option key={roll.number} value={roll.number}>
                {roll.number}
              </option>
            ))}
          </SelectField>
          <TextField label="L*" inputMode="decimal" value={form.l} onChange={set('l')} />
          <TextField label="a*" inputMode="decimal" value={form.a} onChange={set('a')} />
          <TextField label="b*" inputMode="decimal" value={form.b} onChange={set('b')} />
          <TextField label="ΔE" inputMode="decimal" required value={form.deltaE} onChange={set('deltaE')} />
          <TextField label={t('Visual grade')} value={form.visualGrade} onChange={set('visualGrade')} />
          <TextField label={t('Standard')} value={form.standardRef} onChange={set('standardRef')} placeholder="MLK-02" className="sm:col-span-3" />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" busy={record.isPending} busyLabel={t('Saving')} className="h-11 w-full">
              {t('Add reading')}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-6">
              {error}
            </p>
          )}
        </form>
      )}
    </Panel>
  );
}

function Defects({ inspection, editable }: { inspection: InspectionDetail; editable: boolean }) {
  const t = useT();
  const record = useRecordInspection();
  const [form, setForm] = useState({ rollNumber: inspection.rolls[0]?.number ?? '', type: DEFECT_TYPES[0]!.type, points: String(DEFECT_TYPES[0]!.points), positionM: '', sizeCm: '', note: '' });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const add = async (event: FormEvent) => {
    event.preventDefault();
    await record.mutateAsync({ number: inspection.number, defects: [{ rollNumber: form.rollNumber || undefined, type: form.type, points: Number(form.points), positionM: form.positionM ? String(Math.round(Number(form.positionM) * 1000)) : undefined, sizeCm: form.sizeCm ? Number(form.sizeCm) : undefined, note: form.note || undefined }] });
    setForm((f) => ({ ...f, positionM: '', sizeCm: '', note: '' }));
  };
  const inspected = inspection.rolls.length > 0 ? inspection.rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString() : inspection.lotQuantity;
  const rate = defectPointsPer100m(inspection.defects.map((defect) => ({ points: defect.points, rollNumber: defect.rollNumber })), inspected);
  return (
    <Panel
      title={t('Defects')}
      count={inspection.defects.length}
      action={rate !== null && <span className={cn('code', inspection.maxDefectPointsPer100m !== null && rate > inspection.maxDefectPointsPer100m ? 'text-critical' : 'text-ink-muted')}>{rate} {t('pts/100 m')}{inspection.maxDefectPointsPer100m !== null ? ` / ${inspection.maxDefectPointsPer100m}` : ''}</span>}
    >
      {inspection.defects.length > 0 && (
        <ul className="mb-4 divide-y divide-line border-y border-line">
          {inspection.defects.map((defect) => (
            <li key={defect.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
              <span className="code">{defect.rollNumber ?? t('Lot')}</span>
              <span className="font-medium">{defect.type}</span>
              <span className="code text-ink-soft">{defect.points} {t('pts')}</span>
              {defect.positionM && <span className="code text-ink-muted">@ {metres(defect.positionM)}</span>}
              {defect.sizeCm && <span className="code text-ink-muted">{defect.sizeCm} cm</span>}
              {defect.note && <span className="text-ink-muted">{defect.note}</span>}
              {editable && (
                <Button size="sm" variant="quiet" onClick={() => record.mutate({ number: inspection.number, removeDefects: [defect.id] })}>
                  {t('Remove')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-6">
          <SelectField label={t('Roll')} value={form.rollNumber} onChange={set('rollNumber')} className="sm:col-span-2">
            <option value="">{t('Whole lot')}</option>
            {inspection.rolls.map((roll) => (
              <option key={roll.number} value={roll.number}>
                {roll.number}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('Defect')} value={form.type} onChange={(event) => setForm((f) => ({ ...f, type: event.target.value, points: String(DEFECT_TYPES.find((candidate) => candidate.type === event.target.value)?.points ?? f.points) }))} className="sm:col-span-2">
            {DEFECT_TYPES.map((type) => (
              <option key={type.type} value={type.type}>
                {t(type.type)}
              </option>
            ))}
          </SelectField>
          <SelectField label={t('Points')} value={form.points} onChange={set('points')}>
            {[1, 2, 3, 4].map((points) => (
              <option key={points} value={points}>
                {points}
              </option>
            ))}
          </SelectField>
          <TextField label={t('At')} inputMode="decimal" unit="m" value={form.positionM} onChange={set('positionM')} />
          <TextField label={t('Size')} inputMode="numeric" unit="cm" value={form.sizeCm} onChange={set('sizeCm')} />
          <TextField label={t('Note')} value={form.note} onChange={set('note')} className="sm:col-span-3" />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" busy={record.isPending} busyLabel={t('Saving')} className="h-11 w-full">
              {t('Add defect')}
            </Button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function SignOffDialog({ inspection, open, onClose }: { inspection: InspectionDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const signOff = useSignOffInspection();
  const options = inspection.result ? dispositionsFor(inspection.result) : [];
  const [form, setForm] = useState({ disposition: (options[0] ?? 'release') as Disposition, concession: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signOff.mutateAsync({ number: inspection.number, disposition: form.disposition, concession: form.concession.trim(), note: form.note.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not sign off.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Sign off {number}', { number: inspection.number })} description={inspection.result ? `${t('Result')}: ${t(INSPECTION_RESULT_LABEL[inspection.result])}. ${t('The disposition moves the lot; a release closes the gated milestone on the run.')}` : undefined}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField label={t('Disposition')} value={form.disposition} onChange={(event) => setForm((f) => ({ ...f, disposition: event.target.value as Disposition }))}>
          {options.map((disposition) => (
            <option key={disposition} value={disposition}>
              {t(DISPOSITION_LABEL[disposition])}
            </option>
          ))}
        </SelectField>
        {(form.disposition === 'accept_with_concession' || inspection.result === 'conditional_pass') && (
          <TextArea label={t('Concession')} value={form.concession} onChange={(event) => setForm((f) => ({ ...f, concession: event.target.value }))} rows={2} help={t('What is accepted as is, and on what terms. A conditional release needs this or an open corrective action.')} />
        )}
        <TextArea label={t('Note')} value={form.note} onChange={(event) => setForm((f) => ({ ...f, note: event.target.value }))} rows={2} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={signOff.isPending} busyLabel={t('Signing off')}>
            {t('Sign off')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function NewActionDialog({ inspection, open, onClose }: { inspection: InspectionDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const create = useCreateCorrectiveAction();
  const [form, setForm] = useState({ title: '', description: '', ownerName: inspection.supplierName, dueOn: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return setError(t('Say what has to happen.'));
    try {
      await create.mutateAsync({ title: form.title.trim(), description: form.description.trim() || undefined, inspectionNumber: inspection.number, ownerName: form.ownerName.trim() || undefined, dueOn: form.dueOn || undefined });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not save.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Corrective action')} description={t('What the supplier or BASIS must do about the finding, by whom, by when. It closes only on verification.')}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField label={t('Title')} required value={form.title} onChange={set('title')} placeholder={t('Relabel and re-roll the creased tails')} />
        <TextArea label={t('Description')} value={form.description} onChange={set('description')} rows={3} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t('Owner')} value={form.ownerName} onChange={set('ownerName')} />
          <TextField label={t('Due on')} type="date" value={form.dueOn} onChange={set('dueOn')} />
        </div>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Opening')}>
            {t('Open action')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function InspectionTimeline({ number }: { number: string }) {
  const t = useT();
  const timeline = useTimeline('inspection', number);
  const note = useRecordNote('inspection', number);
  return (
    <Panel title={t('Timeline')} count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function InspectionSheet({ tab }: { tab: 'checks' | 'findings' | 'actions' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const inspection = useInspection(number);
  const submit = useSubmitInspection();
  const [dialog, setDialog] = useState<'sign_off' | 'action' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const canRecord = ['owner', 'operations', 'qc'].includes(session.role);
  const canSign = session.role === 'owner' || session.role === 'qc';

  if (inspection.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading inspection')}</p>;
  if (inspection.error) return <p className="px-5 py-10 text-critical lg:px-8">{inspection.error.message}</p>;
  if (!inspection.data) return <NotFound what="inspection" />;
  const data = inspection.data;
  const base = `/qc/inspections/${data.number}`;
  const editable = canRecord && (data.state === 'scheduled' || data.state === 'in_progress');
  const pending = data.checks.filter((check) => check.outcome === 'pending').length;
  const inspected = data.rolls.length > 0 ? data.rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString() : data.lotQuantity;
  const rate = defectPointsPer100m(data.defects.map((defect) => ({ points: defect.points, rollNumber: defect.rollNumber })), inspected);

  return (
    <>
      <LabelHeader
        code={data.number}
        title={data.subjectTitle}
        subtitle={
          <>
            {t(INSPECTION_TYPE_LABEL[data.type])} · {data.templateName} ·{' '}
            <Link to={data.entityType === 'lot' ? `/inventory/lots/${data.entityId}` : `/manufacturing/runs/${data.entityId}`} className="code underline decoration-line-strong underline-offset-4">
              {data.entityId}
            </Link>
            {data.runNumber && data.entityType === 'lot' && (
              <>
                {' · '}
                <Link to={`/manufacturing/runs/${data.runNumber}`} className="code underline decoration-line-strong underline-offset-4">
                  {data.runNumber}
                </Link>
              </>
            )}
            {data.supplierName ? ` · ${data.supplierName}` : ''}
          </>
        }
        status={
          <>
            <StatusChip tone={INSPECTION_STATE_TONE[data.state]}>{t(INSPECTION_STATE_LABEL[data.state])}</StatusChip>
            {data.result && <StatusChip tone={INSPECTION_RESULT_TONE[data.result]}>{t(INSPECTION_RESULT_LABEL[data.result])}</StatusChip>}
            {data.disposition && <StatusChip tone={data.disposition === 'reject' ? 'critical' : data.disposition === 'rework' ? 'caution' : 'positive'}>{t(DISPOSITION_LABEL[data.disposition])}</StatusChip>}
            {actionError && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {actionError}
              </span>
            )}
          </>
        }
        facts={[
          { label: t('Scheduled'), value: data.scheduledOn ? formatLocalDate(data.scheduledOn) : '\u2014' },
          { label: t('Performed'), value: data.performedOn ? formatLocalDate(data.performedOn) : '\u2014' },
          { label: t('Inspector'), value: data.inspectorName || '\u2014' },
          { label: t('Sample'), value: data.sampleSize || data.samplingRule || '\u2014' },
          { label: t('Checks'), value: `${data.checks.length - pending} / ${data.checks.length}` },
          { label: t('Defects'), value: rate === null ? String(data.defects.length) : `${rate} ${t('pts/100 m')}` },
        ]}
        actions={
          <>
            {canRecord && (data.state === 'scheduled' || data.state === 'in_progress') && (
              <Button
                variant="primary"
                onClick={async () => {
                  setActionError(null);
                  try {
                    await submit.mutateAsync({ number: data.number });
                  } catch (failure) {
                    setActionError(failure instanceof Error ? failure.message : t('Could not submit.'));
                  }
                }}
                busy={submit.isPending}
                busyLabel={t('Submitting')}
                disabled={pending > 0}
                title={pending > 0 ? t('{count} pending', { count: pending }) : undefined}
              >
                {t('Submit for sign-off')}
              </Button>
            )}
            {canSign && data.state === 'submitted' && (
              <Button variant="primary" onClick={() => setDialog('sign_off')}>
                {t('Sign off')}
              </Button>
            )}
            {canRecord && data.state !== 'cancelled' && <Button onClick={() => setDialog('action')}>{t('Corrective action')}</Button>}
          </>
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>
          {t('Checks')}
        </NavLink>
        <NavLink to={`${base}/findings`} className={({ isActive }) => sheetTabClass(isActive)}>
          {t('Shade and defects')}
        </NavLink>
        <NavLink to={`${base}/actions`} className={({ isActive }) => sheetTabClass(isActive)}>
          {t('Actions')}
        </NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>
          {t('Timeline')}
        </NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'checks' && <Checks key={`${data.number}-${data.state}`} inspection={data} editable={editable} />}
        {tab === 'findings' && (
          <>
            <Readings inspection={data} editable={editable} />
            <Defects inspection={data} editable={editable} />
          </>
        )}
        {tab === 'actions' && (
          <Panel title={t('Corrective actions')} count={data.actions.length} flush action={canRecord && <Button size="sm" onClick={() => setDialog('action')}>{t('New action')}</Button>}>
            {data.actions.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">{t('No actions on this inspection.')}{data.concession ? ` ${t('Concession')}: ${data.concession}` : ''}</p>
            ) : (
              <Ledger caption={t('Corrective actions')}>
                <thead>
                  <tr>
                    <Th>{t('Action')}</Th>
                    <Th>{t('Title')}</Th>
                    <Th>{t('Owner')}</Th>
                    <Th>{t('Due on')}</Th>
                    <Th>{t('State')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.actions.map((action) => (
                    <Tr key={action.number}>
                      <Td>
                        <Link to={`/qc/corrective-actions/${action.number}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {action.number}
                        </Link>
                      </Td>
                      <Td className="font-medium">{action.title}</Td>
                      <Td className="text-ink-soft">{action.ownerName || '\u2014'}</Td>
                      <Td className="code text-ink-soft">{action.dueOn ? formatLocalDate(action.dueOn) : '\u2014'}</Td>
                      <Td>
                        <StatusChip tone={ACTION_STATE_TONE[action.state]}>{t(ACTION_STATE_LABEL[action.state])}</StatusChip>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
        {tab === 'timeline' && <InspectionTimeline number={data.number} />}
      </div>
      {canSign && <SignOffDialog key={dialog === 'sign_off' ? 'sign-open' : 'sign-closed'} inspection={data} open={dialog === 'sign_off'} onClose={() => setDialog(null)} />}
      {canRecord && <NewActionDialog key={dialog === 'action' ? 'action-open' : 'action-closed'} inspection={data} open={dialog === 'action'} onClose={() => setDialog(null)} />}
    </>
  );
}
