import { CHECK_CATEGORY_LABEL, INSPECTION_RESULT_LABEL, INSPECTION_RESULT_TONE, INSPECTION_STATE_LABEL, INSPECTION_STATE_TONE, INSPECTION_TYPES, INSPECTION_TYPE_LABEL, formatLocalDate, todayIn, type InspectionType } from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, ShadeDot, StatusChip, Td, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useCreateInspection, useInspectionTemplates, useInspections } from '../../data/quality';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 05 QC: the inspection queue, corrective actions and templates.

export function QcTabs({ active }: { active: 'inspections' | 'actions' | 'templates' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('QC sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('inspections', '/qc', t('Inspections'))}
      {tab('actions', '/qc/corrective-actions', t('Corrective actions'))}
      {tab('templates', '/qc/templates', t('Inspection templates'))}
    </nav>
  );
}

export function NewInspectionDialog({ open, onClose, subject = '' }: { open: boolean; onClose: () => void; subject?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateInspection();
  const templates = useInspectionTemplates();
  const [form, setForm] = useState({ type: 'pre_shipment' as InspectionType, subject, templateId: '', scheduledOn: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string, location: '', inspectorName: '', sampleSize: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^(LOT|RUN)-\d{2}-\d{4}$/.test(form.subject.trim())) return setError(t('Give the lot or run number, like LOT-26-0012.'));
    try {
      const { number } = await create.mutateAsync({ type: form.type, subject: form.subject.trim(), templateId: form.templateId || undefined, scheduledOn: form.scheduledOn || undefined, location: form.location.trim() || undefined, inspectorName: form.inspectorName.trim() || undefined, sampleSize: form.sampleSize.trim() || undefined });
      onClose();
      navigate(`/qc/inspections/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The inspection could not be opened.'));
    }
  };
  const matching = (templates.data ?? []).filter((template) => template.type === form.type);
  return (
    <Dialog open={open} onClose={onClose} title={t('New inspection')} description={t('Opens from the template for its type; the checks are copied so they can be recorded on a phone at the mill.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Type')} value={form.type} onChange={(event) => setForm((f) => ({ ...f, type: event.target.value as InspectionType, templateId: '' }))}>
          {INSPECTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(INSPECTION_TYPE_LABEL[type])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Lot or run')} required value={form.subject} onChange={set('subject')} placeholder="LOT-26-0012" />
        <SelectField label={t('Template')} value={form.templateId} onChange={set('templateId')} className="sm:col-span-2">
          <option value="">{t('Default for the type')}</option>
          {matching.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Scheduled')} type="date" value={form.scheduledOn} onChange={set('scheduledOn')} />
        <TextField label={t('Sample')} value={form.sampleSize} onChange={set('sampleSize')} placeholder={t('9 rolls')} />
        <TextField label={t('Location')} value={form.location} onChange={set('location')} />
        <TextField label={t('Inspector')} value={form.inspectorName} onChange={set('inspectorName')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Opening')}>
            {t('Open inspection')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Inspections() {
  const t = useT();
  const session = useRequiredSession();
  const inspections = useInspections();
  const [creating, setCreating] = useState(false);
  const manage = ['owner', 'operations', 'qc'].includes(session.role);
  const rows = inspections.data ?? [];
  const open = rows.filter((inspection) => inspection.state !== 'signed_off' && inspection.state !== 'cancelled');
  const order = { submitted: 0, in_progress: 1, scheduled: 2, signed_off: 3, cancelled: 4 } as const;
  const sorted = [...rows].sort((a, b) => order[a.state] - order[b.state] || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <ModuleTitle
        number="05"
        title={t('QC')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('New inspection')}
            </Button>
          )
        }
      >
        {t('Inspections awaiting work first, then sign-off, then the record. A lot moves only on a signed-off disposition.')}
      </ModuleTitle>
      <QcTabs active="inspections" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Inspections')} count={open.length} flush>
          {inspections.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading inspections')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No inspections yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New inspection')}</Button> : undefined}>
                {t('An inspection opens on a lot or a run from a template; its checks are recorded, its result is read from them, and its sign-off moves the lot.')}
              </EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Inspections')}>
              <thead>
                <tr>
                  <Th>{t('Inspection')}</Th>
                  <Th>{t('Type')}</Th>
                  <Th>{t('Subject')}</Th>
                  <Th>{t('Supplier')}</Th>
                  <Th>{t('Scheduled')}</Th>
                  <Th>{t('Inspector')}</Th>
                  <Th>{t('Result')}</Th>
                  <Th>{t('State')}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inspection) => (
                  <Tr key={inspection.id}>
                    <Td>
                      <Link to={`/qc/inspections/${inspection.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {inspection.number}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">{t(INSPECTION_TYPE_LABEL[inspection.type])}</Td>
                    <Td>
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        {inspection.shadeHex && <ShadeDot hex={inspection.shadeHex} name={inspection.subjectTitle} size="sm" />}
                        <span className="font-medium">{inspection.subjectTitle}</span>
                        <span className="code text-ink-muted">{inspection.entityId}</span>
                      </span>
                    </Td>
                    <Td className="text-ink-soft">{inspection.supplierName || '—'}</Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{inspection.scheduledOn ? formatLocalDate(inspection.scheduledOn) : '—'}</Td>
                    <Td className="text-ink-soft">{inspection.inspectorName || '—'}</Td>
                    <Td>{inspection.result ? <StatusChip tone={INSPECTION_RESULT_TONE[inspection.result]}>{t(INSPECTION_RESULT_LABEL[inspection.result])}</StatusChip> : <span className="text-ink-muted">{'—'}</span>}</Td>
                    <Td>
                      <StatusChip tone={INSPECTION_STATE_TONE[inspection.state]}>{t(INSPECTION_STATE_LABEL[inspection.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <NewInspectionDialog key={creating ? 'open' : 'closed'} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

export function InspectionTemplates() {
  const t = useT();
  const templates = useInspectionTemplates();
  return (
    <>
      <ModuleTitle number="05" title={t('QC')}>
        {t('Inspection templates: the checks, sampling and thresholds an inspection opens with.')}
      </ModuleTitle>
      <QcTabs active="templates" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {(templates.data ?? []).map((template) => (
          <Panel
            key={template.id}
            title={template.name}
            count={template.checks.length}
            flush
            action={
              <span className="text-[0.8125rem] text-ink-muted">
                {t(INSPECTION_TYPE_LABEL[template.type])}
                {template.familyName ? ` · ${template.familyName}` : ''}
                {template.samplingRule ? ` · ${template.samplingRule}` : ''}
                {template.maxDeltaE !== null ? ` · ΔE ≤ ${(template.maxDeltaE / 100).toFixed(2)}` : ''}
                {template.maxDefectPointsPer100m !== null ? ` · ≤ ${template.maxDefectPointsPer100m} pts/100 m` : ''}
              </span>
            }
          >
            <Ledger caption={template.name}>
              <thead>
                <tr>
                  <Th className="w-14">{t('No.')}</Th>
                  <Th>{t('Check')}</Th>
                  <Th>{t('Category')}</Th>
                  <Th>{t('Method')}</Th>
                  <Th>{t('Kind')}</Th>
                  <Th>{t('Critical')}</Th>
                </tr>
              </thead>
              <tbody>
                {template.checks.map((check, index) => (
                  <Tr key={check.key}>
                    <Td className="code text-ink-muted">{String(index + 1).padStart(2, '0')}</Td>
                    <Td className="font-medium">{check.parameter}</Td>
                    <Td className="text-ink-soft">{t(CHECK_CATEGORY_LABEL[check.category])}</Td>
                    <Td className="text-ink-soft">{check.method || '—'}</Td>
                    <Td className="text-ink-soft">{check.kind === 'measurement' ? `${t('Measurement')}${check.unit ? ` (${check.unit})` : ''}` : check.kind === 'count' ? t('Count') : t('Pass / fail')}</Td>
                    <Td>{check.isCritical ? <StatusChip tone="critical">{t('Critical')}</StatusChip> : <span className="text-ink-muted">{'—'}</span>}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          </Panel>
        ))}
      </div>
    </>
  );
}
