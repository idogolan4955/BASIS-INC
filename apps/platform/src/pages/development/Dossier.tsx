import {
  APPROVAL_DECISIONS,
  COSTING_BASES,
  COSTING_BASIS_LABEL,
  DEVELOPMENT_HEALTH_LABEL,
  DEVELOPMENT_HEALTH_TONE,
  DEVELOPMENT_STAGE_LABEL,
  DEVELOPMENT_STAGE_TONE,
  FILE_ROLES,
  FILE_ROLE_LABEL,
  GATES,
  MONEY_DECIMALS,
  OPEN_DEVELOPMENT_STAGES,
  PART_STATUSES,
  PART_STATUS_LABEL,
  PART_STATUS_TONE,
  QUANTITY_DECIMALS,
  SAMPLE_KINDS,
  SAMPLE_KIND_LABEL,
  SAMPLE_VERDICTS,
  SAMPLE_VERDICT_LABEL,
  SAMPLE_VERDICT_TONE,
  SOURCING_KINDS,
  SOURCING_KIND_LABEL,
  SOURCING_STATUSES,
  SOURCING_STATUS_LABEL,
  SOURCING_STATUS_TONE,
  budgetSpent,
  canViewCosts,
  compareSourcing,
  costingMargin,
  developmentLandedCost,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  moneyFromStored,
  nextStages,
  parseFixed,
  quantityFromStored,
  type ApprovalDecision,
  type CostingBasis,
  type DevelopmentCostingView,
  type DevelopmentProductDetail,
  type DevelopmentSampleView,
  type DevelopmentSourcingView,
  type DevelopmentStage,
  type FileRole,
  type PartStatus,
  type SampleKind,
  type SampleVerdict,
  type SourcingKind,
  type SourcingStatus,
} from '@basis/shared';
import { Button, Dialog, EmptyState, LabelHeader, Ledger, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Swatch, Td, TextArea, TextField, Th, Timeline, Tr, Track, cn, sheetTabClass, type TrackStep } from '@basis/ui';
import { Plus, UploadSimple } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { DocumentRows } from '../../components/DocumentsPanel';
import { useShades } from '../../data/catalog';
import { useDevelopmentCosting, useDevelopmentProduct, useDevelopmentSourcing, useRecordDevelopmentDecision, useSaveDevelopmentCosting, useSaveDevelopmentPart, useSaveDevelopmentSample, useSaveDevelopmentSourcing, useTransitionDevelopment, useUploadFile } from '../../data/development';
import { useDocumentsFor, type FiledDocument } from '../../data/documents';
import { useCompanies, useFactories } from '../../data/parties';
import { isSample } from '../../data/source';
import { useCreateTask, useOpenTasks, useStaff } from '../../data/tasks';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { ProductDialog, useManageDevelopment } from './Development';

// The dossier: everything a product in development is, by tab. Files carry
// a role; sourcing and costing open for the cost roles; the gate records
// who passed it.

type Tab = 'overview' | 'files' | 'samples' | 'sourcing' | 'costing' | 'tasks' | 'decisions';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'CNY'];
const money = (stored: string, currency: string, digits = 2) => formatMoney(moneyFromStored(stored, currency), digits);
const amountOrNull = (text: string): string | null | 'invalid' => {
  if (!text.trim()) return null;
  try {
    return parseFixed(text, MONEY_DECIMALS).toString();
  } catch {
    return 'invalid';
  }
};
const amountField = (stored: string | null, currency: string) => (stored ? formatMoney(moneyFromStored(stored, currency), 2).replace(/,/g, '') : '');

// ---------------------------------------------------------------- the gate

function GateDialog({ product, to, open, onClose }: { product: DevelopmentProductDetail; to: DevelopmentStage | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const transition = useTransitionDevelopment();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<ApprovalDecision>('approved');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setNote('');
      setDecision('approved');
      setError(null);
    }
  }, [open]);
  if (!to) return null;
  const gate = GATES[to];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await transition.mutateAsync({ number: product.number, to, note, decision: gate ? decision : 'approved' });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The stage could not be changed.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={`${t(DEVELOPMENT_STAGE_LABEL[product.stage])} → ${t(DEVELOPMENT_STAGE_LABEL[to])}`} description={gate ? t('A gate: the entry conditions are checked on the record, and your decision is kept with your name.') : t('A move without a gate. The reason stays on the timeline.')}>
      <form onSubmit={submit} className="grid gap-4">
        {gate && (
          <SelectField label={t('Decision')} value={decision} onChange={(event) => setDecision(event.target.value as ApprovalDecision)}>
            {APPROVAL_DECISIONS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {t(candidate === 'approved' ? 'Approve' : candidate === 'returned' ? 'Return for work' : 'Reject')}
              </option>
            ))}
          </SelectField>
        )}
        <TextArea label={t('Note')} rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={transition.isPending} busyLabel={t('Saving')}>{gate ? t('Record decision') : t('Move')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------- parts

type PartKind = 'material' | 'variant' | 'packaging';

function PartDialog({ product, kind, part, open, onClose }: { product: DevelopmentProductDetail; kind: PartKind; part: DevelopmentProductDetail['materials'][number] | DevelopmentProductDetail['variants'][number] | DevelopmentProductDetail['packaging'][number] | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveDevelopmentPart();
  const companies = useCompanies();
  const shades = useShades();
  const suppliers = (companies.data ?? []).filter((company) => company.roles.some((role) => role === 'supplier' || role === 'odm'));
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (!part) setForm({ status: 'proposed' });
    else if (kind === 'material') {
      const m = part as DevelopmentProductDetail['materials'][number];
      setForm({ role: m.role, name: m.name, specification: m.specification, skuCode: m.skuCode ?? '', supplierId: m.supplierId ?? '', status: m.status, notes: m.notes });
    } else if (kind === 'variant') {
      const v = part as DevelopmentProductDetail['variants'][number];
      setForm({ code: v.code, name: v.name, shadeCode: v.shadeCode ?? '', colourHex: v.colourHex ?? '', colourName: v.colourName, sizeLabel: v.sizeLabel, sizes: v.dimensions['sizes'] ?? '', status: v.status, sort: String(v.sort) });
    } else {
      const p = part as DevelopmentProductDetail['packaging'][number];
      setForm({ component: p.component, specification: p.specification, material: p.material, dims: Object.entries(p.dimensions).map(([key, value]) => `${key}=${value}`).join(', '), supplierId: p.supplierId ?? '', status: p.status });
    }
  }, [open, part, kind]);
  const set = (key: string) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const f = (key: string) => form[key] ?? '';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const status = (f('status') || 'proposed') as PartStatus;
    try {
      if (kind === 'material') {
        if (!f('name').trim()) return setError(t('Name the material.'));
        await save.mutateAsync({ kind, id: part?.id, number: product.number, role: f('role') || 'component', name: f('name'), specification: f('specification'), skuCode: f('skuCode') || null, supplierId: f('supplierId') || null, status, notes: f('notes') });
      } else if (kind === 'variant') {
        if (!f('code').trim() || !f('name').trim()) return setError(t('A variant needs a code and a name.'));
        if (f('colourHex') && !/^#[0-9A-Fa-f]{6}$/.test(f('colourHex').trim())) return setError(t('A colour needs a six-digit hex.'));
        await save.mutateAsync({ kind, id: part?.id, number: product.number, code: f('code'), name: f('name'), shadeCode: f('shadeCode') || null, colourHex: f('colourHex').trim() || null, colourName: f('colourName'), sizeLabel: f('sizeLabel'), dimensions: f('sizes').trim() ? { sizes: f('sizes').trim() } : {}, status, sort: Number(f('sort')) || product.variants.length + 1 });
      } else {
        if (!f('component').trim()) return setError(t('Name the component.'));
        const dimensions = Object.fromEntries(f('dims').split(',').map((pair) => pair.split('=').map((piece) => piece.trim())).filter((pair) => pair[0] && pair[1]) as [string, string][]);
        await save.mutateAsync({ kind, id: part?.id, number: product.number, component: f('component'), specification: f('specification'), material: f('material'), dimensions, supplierId: f('supplierId') || null, status });
      }
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('It could not be saved.'));
    }
  };
  const title = kind === 'material' ? t('Material') : kind === 'variant' ? t('Variant') : t('Packaging component');
  return (
    <Dialog open={open} onClose={onClose} title={part ? title : `${t('New')} ${title.toLowerCase()}`} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {kind === 'material' && (
          <>
            <TextField label={t('Role')} value={f('role')} onChange={set('role')} placeholder={t('shell, lining, trim, hardware, bottle, cap')} />
            <TextField label={t('Name')} required value={f('name')} onChange={set('name')} />
            <TextArea label={t('Specification')} rows={2} value={f('specification')} onChange={set('specification')} className="sm:col-span-2" />
            <TextField label={t('Our SKU')} value={f('skuCode')} onChange={set('skuCode')} placeholder="SHL-160-MLK" help={t('When the material is one of our own fabrics.')} className="font-mono" />
            <SelectField label={t('Supplier')} value={f('supplierId')} onChange={set('supplierId')}>
              <option value="">{t('Not known yet')}</option>
              {suppliers.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </SelectField>
            <TextArea label={t('Notes')} rows={2} value={f('notes')} onChange={set('notes')} className="sm:col-span-2" />
          </>
        )}
        {kind === 'variant' && (
          <>
            <TextField label={t('Code')} required value={f('code')} onChange={set('code')} placeholder="MLK" className="font-mono" />
            <TextField label={t('Name')} required value={f('name')} onChange={set('name')} />
            <SelectField label={t('BASIS shade')} value={f('shadeCode')} onChange={set('shadeCode')} help={t('When the colourway is one of ours.')}>
              <option value="">{t('Own colour')}</option>
              {shades.data?.map((shade) => (
                <option key={shade.code} value={shade.code}>
                  {shade.code} · {shade.name}
                </option>
              ))}
            </SelectField>
            <TextField label={t('Own colour hex')} value={f('colourHex')} onChange={set('colourHex')} placeholder="#E5C9BA" className="font-mono" />
            <TextField label={t('Colour name')} value={f('colourName')} onChange={set('colourName')} />
            <TextField label={t('Size label')} value={f('sizeLabel')} onChange={set('sizeLabel')} placeholder={t('XS–XL, 50 ml, One size')} />
            <TextField label={t('Sizes')} value={f('sizes')} onChange={set('sizes')} placeholder="XS, S, M, L, XL" className="sm:col-span-2" help={t('Decided per category at handover; recorded here.')} />
          </>
        )}
        {kind === 'packaging' && (
          <>
            <TextField label={t('Component')} required value={f('component')} onChange={set('component')} placeholder={t('box, pouch, hangtag, label, insert, carton')} />
            <TextField label={t('Material')} value={f('material')} onChange={set('material')} />
            <TextArea label={t('Specification')} rows={2} value={f('specification')} onChange={set('specification')} className="sm:col-span-2" />
            <TextField label={t('Dimensions')} value={f('dims')} onChange={set('dims')} placeholder="w=32, d=24, h=8, unit=cm" className="font-mono" />
            <SelectField label={t('Supplier')} value={f('supplierId')} onChange={set('supplierId')}>
              <option value="">{t('Not known yet')}</option>
              {suppliers.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </SelectField>
          </>
        )}
        <SelectField label={t('Status')} value={f('status') || 'proposed'} onChange={set('status')}>
          {PART_STATUSES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(PART_STATUS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Overview({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const [dialog, setDialog] = useState<{ kind: PartKind; part: Parameters<typeof PartDialog>[0]['part'] } | null>(null);
  const specRows = product.specSchema.map((field) => ({ field, value: product.specs[field.key] ?? '' }));
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={t('About')} className="xl:col-span-7">
        {product.description ? <p className="max-w-prose whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{product.description}</p> : <p className="text-ink-muted">{t('No description yet. The concept gate asks for one.')}</p>}
        {product.intent && (
          <>
            <p className="caps mt-6 text-ink-muted">{t('Intent')}</p>
            <p className="mt-1 max-w-prose text-[0.9375rem] leading-relaxed text-ink-soft">{product.intent}</p>
          </>
        )}
      </Panel>
      <Panel title={`${t(product.categoryName)} ${t('specification')}`} className="xl:col-span-5" flush>
        {specRows.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('This category has no specification fields yet.')}</p>
        ) : (
          <dl>
            {specRows.map(({ field, value }) => (
              <div key={field.key} className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                <dt className="text-[0.8125rem] text-ink-muted">{t(field.label)}</dt>
                <dd className="text-end text-sm">
                  {value || <span className="text-ink-muted">{t('Not set')}</span>}
                  {value && field.unit && <span className="code ms-1 text-ink-muted">{field.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>

      <Panel title={t('Variants')} count={product.variants.length} className="xl:col-span-12" flush action={manage && <Button size="sm" onClick={() => setDialog({ kind: 'variant', part: null })}><Plus size={14} aria-hidden="true" />{t('Add variant')}</Button>}>
        {product.variants.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No variants yet: the colourways, sizes or volumes it will come in.')}</p>
        ) : (
          <Ledger caption={t('Variants')}>
            <thead>
              <tr>
                <Th>{t('Code')}</Th>
                <Th>{t('Variant')}</Th>
                <Th>{t('Colour')}</Th>
                <Th>{t('Sizes')}</Th>
                <Th>{t('Status')}</Th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <Tr key={variant.id} onClick={manage ? () => setDialog({ kind: 'variant', part: variant }) : undefined}>
                  <Td className="code">{variant.code}</Td>
                  <Td className="font-medium">{variant.name}</Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      {(variant.colourHex || variant.shadeCode) && <ShadeDot hex={variant.colourHex ?? '#CCCCCC'} name={variant.shadeName || variant.colourName} code={variant.shadeCode ?? undefined} size="sm" />}
                      {variant.shadeCode ? `${variant.shadeName} (${variant.shadeCode})` : variant.colourName || '—'}
                    </span>
                  </Td>
                  <Td className="text-ink-soft">{variant.sizeLabel || variant.dimensions['sizes'] || '—'}</Td>
                  <Td>
                    <StatusChip tone={PART_STATUS_TONE[variant.status]}>{t(PART_STATUS_LABEL[variant.status])}</StatusChip>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>

      <Panel title={t('Materials')} count={product.materials.length} className="xl:col-span-7" flush action={manage && <Button size="sm" onClick={() => setDialog({ kind: 'material', part: null })}><Plus size={14} aria-hidden="true" />{t('Add material')}</Button>}>
        {product.materials.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('What it is made of: shell, lining, trims, hardware, bottle, cap.')}</p>
        ) : (
          <Ledger caption={t('Materials')}>
            <thead>
              <tr>
                <Th>{t('Role')}</Th>
                <Th>{t('Material')}</Th>
                <Th>{t('Source')}</Th>
                <Th>{t('Status')}</Th>
              </tr>
            </thead>
            <tbody>
              {product.materials.map((material) => (
                <Tr key={material.id} onClick={manage ? () => setDialog({ kind: 'material', part: material }) : undefined}>
                  <Td className="caps text-ink-muted">{material.role}</Td>
                  <Td>
                    <span className="font-medium">{material.name}</span>
                    {material.specification && <span className="ms-3 text-ink-muted">{material.specification}</span>}
                  </Td>
                  <Td className="text-ink-soft">{material.skuCode ? <Link to={`/products/skus/${material.skuCode}`} className="code underline decoration-line-strong underline-offset-4">{material.skuCode}</Link> : material.supplierName || '—'}</Td>
                  <Td>
                    <StatusChip tone={PART_STATUS_TONE[material.status]}>{t(PART_STATUS_LABEL[material.status])}</StatusChip>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>

      <Panel title={t('Packaging')} count={product.packaging.length} className="xl:col-span-5" flush action={manage && <Button size="sm" onClick={() => setDialog({ kind: 'packaging', part: null })}><Plus size={14} aria-hidden="true" />{t('Add component')}</Button>}>
        {product.packaging.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('Box, pouch, hangtag, label, insert, carton.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {product.packaging.map((component) => (
              <li key={component.id} className={cn('px-5 py-3', manage && 'cursor-pointer hover:bg-sunken')} onClick={manage ? () => setDialog({ kind: 'packaging', part: component }) : undefined}>
                <p className="flex items-center justify-between gap-3">
                  <span className="font-medium capitalize">{component.component}</span>
                  <StatusChip tone={PART_STATUS_TONE[component.status]}>{t(PART_STATUS_LABEL[component.status])}</StatusChip>
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-ink-soft">
                  {[component.material, component.specification, Object.entries(component.dimensions).filter(([key]) => key !== 'unit').map(([, value]) => value).join(' × ') + (component.dimensions['unit'] ? ` ${component.dimensions['unit']}` : '')].filter(Boolean).join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {manage && dialog && <PartDialog product={product} kind={dialog.kind} part={dialog.part} open onClose={() => setDialog(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- files

function Files({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const documents = useDocumentsFor('development_product', product.number);
  const upload = useUploadFile();
  const input = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<FileRole>('inspiration');
  const [error, setError] = useState<string | null>(null);
  const [sampleFiles, setSampleFiles] = useState<FiledDocument[] | null>(null);
  useEffect(() => {
    if (!isSample) return;
    void import('../../data/sample-development').then((m) => setSampleFiles(m.sampleDevelopment.filesFor(product.number)));
  }, [product.number, upload.isSuccess]);
  const rows = isSample ? (sampleFiles ?? []) : (documents.data ?? []);
  const byRole = (candidate: FileRole) => rows.filter((document) => document.links.some((link) => link.entityId === product.number && (link.role ?? 'other') === candidate));
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      await upload.mutateAsync({ entityType: 'development_product', entityId: product.number, role, file });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The file could not be uploaded.'));
    } finally {
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="flex flex-col gap-4">
      {manage && (
        <Panel title={t('Add a file')}>
          <div className="flex flex-wrap items-end gap-3">
            <SelectField label={t('What it is')} value={role} onChange={(event) => setRole(event.target.value as FileRole)} className="min-w-56">
              {FILE_ROLES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {t(FILE_ROLE_LABEL[candidate])}
                </option>
              ))}
            </SelectField>
            <input ref={input} type="file" className="sr-only" onChange={(event) => void pick(event.target.files?.[0])} aria-label={t('Choose a file')} />
            <Button onClick={() => input.current?.click()} busy={upload.isPending} busyLabel={t('Uploading')}>
              <UploadSimple size={16} aria-hidden="true" />{t('Upload')}</Button>
            <p className="text-[0.8125rem] text-ink-muted">{t('Inspiration, proposal, sample and approved design are kept apart. Uploading a file again with the same title adds a version.')}</p>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-[0.8125rem] font-medium text-critical">
              {error}
            </p>
          )}
        </Panel>
      )}
      {FILE_ROLES.map((candidate) => {
        const own = byRole(candidate);
        if (own.length === 0 && candidate === 'other') return null;
        return (
          <Panel key={candidate} title={t(FILE_ROLE_LABEL[candidate])} count={own.length} flush>
            {own.length === 0 ? <p className="px-5 py-4 text-ink-muted">{t('Nothing filed under this role.')}</p> : <DocumentRows documents={own} shareText={(document) => `${product.name}: ${document.title}`} />}
          </Panel>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- samples

function SampleDialog({ product, sample, open, onClose, canJudge }: { product: DevelopmentProductDetail; sample: DevelopmentSampleView | null; open: boolean; onClose: () => void; canJudge: boolean }) {
  const t = useT();
  const save = useSaveDevelopmentSample();
  const companies = useCompanies();
  const suppliers = (companies.data ?? []).filter((company) => company.roles.some((role) => role === 'supplier' || role === 'odm'));
  const [form, setForm] = useState({ kind: 'proto' as SampleKind, supplierId: '', requestedOn: '', receivedOn: '', verdict: 'pending' as SampleVerdict, findings: '', cost: '', currency: 'USD' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(sample ? { kind: sample.kind, supplierId: sample.supplierId ?? '', requestedOn: sample.requestedOn ?? '', receivedOn: sample.receivedOn ?? '', verdict: sample.verdict, findings: sample.findings, cost: amountField(sample.costAmount, sample.costCurrency), currency: sample.costCurrency } : { kind: 'proto', supplierId: '', requestedOn: '', receivedOn: '', verdict: 'pending', findings: '', cost: '', currency: 'USD' });
  }, [open, sample]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const cost = amountOrNull(form.cost);
    if (cost === 'invalid') return setError(t('The cost is not an amount.'));
    if (form.verdict !== 'pending' && !form.receivedOn) return setError(t('A verdict needs the date the sample was received.'));
    try {
      await save.mutateAsync({ id: sample?.id, number: product.number, kind: form.kind, supplierId: form.supplierId || null, factoryId: null, requestedOn: form.requestedOn || null, receivedOn: form.receivedOn || null, verdict: form.verdict, findings: form.findings, costAmount: cost, costCurrency: form.currency });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The sample round could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={sample ? `${t('Sample round')} ${sample.round}` : t('Request a sample round')} description={t('A physical round: requested, received, judged. A verdict of revise moves the product to revision; approving the latest round opens the production gate.')} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          {SAMPLE_KINDS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(SAMPLE_KIND_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Supplier')} value={form.supplierId} onChange={set('supplierId')}>
          <option value="">{t('Not known yet')}</option>
          {suppliers.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Requested on')} type="date" value={form.requestedOn} onChange={set('requestedOn')} />
        <TextField label={t('Received on')} type="date" value={form.receivedOn} onChange={set('receivedOn')} />
        <TextField label={t('Cost of the round')} inputMode="decimal" value={form.cost} onChange={set('cost')} placeholder="180" />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        {canJudge && (
          <SelectField label={t('Verdict')} value={form.verdict} onChange={set('verdict')} className="sm:col-span-2">
            {SAMPLE_VERDICTS.map((candidate) => (
              <option key={candidate} value={candidate}>
                {t(SAMPLE_VERDICT_LABEL[candidate])}
              </option>
            ))}
          </SelectField>
        )}
        <TextArea label={t('Findings')} rows={4} value={form.findings} onChange={set('findings')} className="sm:col-span-2" help={t('What to change, measured where it can be measured.')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Samples({ product, manage, canJudge }: { product: DevelopmentProductDetail; manage: boolean; canJudge: boolean }) {
  const t = useT();
  const [dialog, setDialog] = useState<{ sample: DevelopmentSampleView | null } | null>(null);
  const rounds = [...product.samples].sort((a, b) => b.round - a.round);
  return (
    <>
      <Panel title={t('Sample rounds')} count={rounds.length} flush action={manage && <Button size="sm" onClick={() => setDialog({ sample: null })}><Plus size={14} aria-hidden="true" />{t('Request a round')}</Button>}>
        {rounds.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No sample round yet. Requesting one opens the sampling gate.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rounds.map((sample) => (
              <li key={sample.id} className={cn('px-5 py-4', (manage || canJudge) && 'cursor-pointer hover:bg-sunken')} onClick={manage || canJudge ? () => setDialog({ sample }) : undefined}>
                <p className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-[1.25rem] font-medium">{t('Round')} {sample.round}</span>
                  <span className="text-[0.8125rem] text-ink-soft">{t(SAMPLE_KIND_LABEL[sample.kind])}</span>
                  {sample.supplierName && <span className="text-[0.8125rem] text-ink-soft">· {sample.supplierName}</span>}
                  <StatusChip tone={SAMPLE_VERDICT_TONE[sample.verdict]}>{t(SAMPLE_VERDICT_LABEL[sample.verdict])}</StatusChip>
                  <span className="code ms-auto text-[0.75rem] text-ink-muted">
                    {sample.requestedOn && `${t('requested')} ${formatLocalDate(sample.requestedOn)}`}
                    {sample.receivedOn && ` · ${t('received')} ${formatLocalDate(sample.receivedOn)}`}
                    {sample.costAmount && ` · ${money(sample.costAmount, sample.costCurrency, 0)} ${sample.costCurrency}`}
                  </span>
                </p>
                {sample.findings && <p className="mt-2 max-w-prose whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{sample.findings}</p>}
                {sample.verdictByName && <p className="mt-1 text-[0.75rem] text-ink-muted">{sample.verdictByName}{sample.verdictOn && `, ${formatLocalDate(sample.verdictOn)}`}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {(manage || canJudge) && dialog && <SampleDialog product={product} sample={dialog.sample} open onClose={() => setDialog(null)} canJudge={canJudge} />}
    </>
  );
}

// ---------------------------------------------------------------- sourcing

function SourcingDialog({ product, row, open, onClose }: { product: DevelopmentProductDetail; row: DevelopmentSourcingView | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveDevelopmentSourcing();
  const companies = useCompanies();
  const factories = useFactories();
  const suppliers = (companies.data ?? []).filter((company) => company.roles.some((role) => role === 'supplier' || role === 'odm'));
  const [form, setForm] = useState({ supplierId: '', factoryId: '', kind: 'odm' as SourcingKind, status: 'candidate' as SourcingStatus, moq: '', leadTimeDays: '', sampleLeadDays: '', unitCost: '', currency: 'USD', sampleCost: '', developmentCost: '', toolingCost: '', paymentTerms: '', incoterm: '', namedPlace: '', quotedOn: '', validUntil: '', notes: '', select: false });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(row
      ? { supplierId: row.supplierId, factoryId: row.factoryId ?? '', kind: row.kind, status: row.status, moq: row.moq ? formatQuantity(quantityFromStored(row.moq, 'pcs')).replace(/[^\d.]/g, '') : '', leadTimeDays: row.leadTimeDays === null ? '' : String(row.leadTimeDays), sampleLeadDays: row.sampleLeadDays === null ? '' : String(row.sampleLeadDays), unitCost: amountField(row.unitCost, row.currency), currency: row.currency, sampleCost: amountField(row.sampleCost, row.currency), developmentCost: amountField(row.developmentCost, row.currency), toolingCost: amountField(row.toolingCost, row.currency), paymentTerms: row.paymentTerms, incoterm: row.incoterm, namedPlace: row.namedPlace, quotedOn: row.quotedOn ?? '', validUntil: row.validUntil ?? '', notes: row.notes, select: row.isSelected }
      : { supplierId: '', factoryId: '', kind: 'odm', status: 'candidate', moq: '', leadTimeDays: '', sampleLeadDays: '', unitCost: '', currency: 'USD', sampleCost: '', developmentCost: '', toolingCost: '', paymentTerms: '', incoterm: '', namedPlace: '', quotedOn: '', validUntil: '', notes: '', select: false });
  }, [open, row]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.supplierId) return setError(t('Choose the supplier.'));
    const amounts = { unitCost: amountOrNull(form.unitCost), sampleCost: amountOrNull(form.sampleCost), developmentCost: amountOrNull(form.developmentCost), toolingCost: amountOrNull(form.toolingCost) };
    if (Object.values(amounts).includes('invalid')) return setError(t('An amount is not a number.'));
    let moq: string | null = null;
    if (form.moq.trim()) {
      try {
        moq = parseFixed(form.moq, QUANTITY_DECIMALS).toString();
      } catch {
        return setError(t('The MOQ is not a quantity.'));
      }
    }
    try {
      await save.mutateAsync({ id: row?.id, number: product.number, supplierId: form.supplierId, factoryId: form.factoryId || null, kind: form.kind, status: form.status, moq, leadTimeDays: form.leadTimeDays ? Number(form.leadTimeDays) : null, sampleLeadDays: form.sampleLeadDays ? Number(form.sampleLeadDays) : null, unitCost: amounts.unitCost as string | null, currency: form.currency, sampleCost: amounts.sampleCost as string | null, developmentCost: amounts.developmentCost as string | null, toolingCost: amounts.toolingCost as string | null, paymentTerms: form.paymentTerms, incoterm: form.incoterm || null, namedPlace: form.namedPlace, quotationDocumentId: null, quotedOn: form.quotedOn || null, validUntil: form.validUntil || null, notes: form.notes, select: form.select });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The candidate could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={row ? t('Sourcing candidate') : t('New sourcing candidate')} description={t('A supplier that could make it: their quote, MOQ, lead times and terms. Compare them side by side, then select one.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <SelectField label={t('Supplier')} required value={form.supplierId} onChange={set('supplierId')} className="sm:col-span-2">
          <option value="">{t('Choose a supplier')}</option>
          {suppliers.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Factory')} value={form.factoryId} onChange={set('factoryId')}>
          <option value="">{t('Any')}</option>
          {factories.data?.filter((factory) => factory.companyId === form.supplierId).map((factory) => (
            <option key={factory.id} value={factory.id}>
              {factory.name}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          {SOURCING_KINDS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(SOURCING_KIND_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {SOURCING_STATUSES.filter((candidate) => candidate !== 'selected').map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(SOURCING_STATUS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Unit cost at MOQ')} inputMode="decimal" value={form.unitCost} onChange={set('unitCost')} placeholder="42.00" />
        <TextField label={t('MOQ')} inputMode="decimal" unit="pcs" value={form.moq} onChange={set('moq')} placeholder="300" />
        <TextField label={t('Lead time')} type="number" unit="d" value={form.leadTimeDays} onChange={set('leadTimeDays')} />
        <TextField label={t('Sample cost')} inputMode="decimal" value={form.sampleCost} onChange={set('sampleCost')} />
        <TextField label={t('Development cost')} inputMode="decimal" value={form.developmentCost} onChange={set('developmentCost')} />
        <TextField label={t('Tooling cost')} inputMode="decimal" value={form.toolingCost} onChange={set('toolingCost')} />
        <TextField label={t('Sample lead')} type="number" unit="d" value={form.sampleLeadDays} onChange={set('sampleLeadDays')} />
        <TextField label={t('Incoterm')} value={form.incoterm} onChange={set('incoterm')} placeholder="FOB" className="font-mono" />
        <TextField label={t('Named place')} value={form.namedPlace} onChange={set('namedPlace')} placeholder="Ningbo" />
        <TextField label={t('Payment terms')} value={form.paymentTerms} onChange={set('paymentTerms')} className="sm:col-span-3" />
        <TextField label={t('Quoted on')} type="date" value={form.quotedOn} onChange={set('quotedOn')} />
        <TextField label={t('Valid until')} type="date" value={form.validUntil} onChange={set('validUntil')} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" checked={form.select} onChange={(event) => setForm((current) => ({ ...current, select: event.target.checked }))} className="size-4 accent-charcoal" />
          {t('Select this supplier')}
        </label>
        <TextArea label={t('Notes')} rows={2} value={form.notes} onChange={set('notes')} className="sm:col-span-3" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Sourcing({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const sourcing = useDevelopmentSourcing(product.id, true);
  const [dialog, setDialog] = useState<{ row: DevelopmentSourcingView | null } | null>(null);
  const rows = useMemo(() => compareSourcing(sourcing.data ?? [], (amount, currency) => (currency === (sourcing.data?.find((row) => row.isSelected)?.currency ?? sourcing.data?.[0]?.currency) ? amount : null)), [sourcing.data]);
  return (
    <>
      <Panel title={t('Sourcing candidates')} count={rows.length} flush action={manage && <Button size="sm" onClick={() => setDialog({ row: null })}><Plus size={14} aria-hidden="true" />{t('Add candidate')}</Button>}>
        {sourcing.isPending ? (
          <p className="px-5 py-6 text-ink-muted">{t('Loading sourcing')}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No candidate yet. The feasibility gate asks for at least one.')}</p>
        ) : (
          <Ledger caption={t('Sourcing candidates')}>
            <thead>
              <tr>
                <Th>{t('Supplier')}</Th>
                <Th>{t('Kind')}</Th>
                <Th>{t('Status')}</Th>
                <Th numeric>{t('Unit cost')}</Th>
                <Th numeric>{t('MOQ')}</Th>
                <Th numeric>{t('Lead')}</Th>
                <Th numeric>{t('Sample')}</Th>
                <Th numeric>{t('Development')}</Th>
                <Th>{t('Terms')}</Th>
                <Th>{t('Valid until')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.id} onClick={manage ? () => setDialog({ row }) : undefined}>
                  <Td>
                    <span className={cn('font-medium', row.isSelected && 'underline decoration-cocoa decoration-2 underline-offset-4')}>{row.supplierName}</span>
                    {row.factoryName && <span className="ms-2 text-[0.8125rem] text-ink-muted">{row.factoryName}</span>}
                    {row.rank === 1 && <span className="caps ms-2 text-positive">{t('lowest')}</span>}
                  </Td>
                  <Td className="text-ink-soft">{t(SOURCING_KIND_LABEL[row.kind])}</Td>
                  <Td>
                    <StatusChip tone={SOURCING_STATUS_TONE[row.status]}>{t(SOURCING_STATUS_LABEL[row.status])}</StatusChip>
                  </Td>
                  <Td numeric>{row.unitCost ? `${money(row.unitCost, row.currency)} ${row.currency}` : '—'}</Td>
                  <Td numeric>{row.moq ? formatQuantity(quantityFromStored(row.moq, 'pcs')) : '—'}</Td>
                  <Td numeric>{row.leadTimeDays === null ? '—' : `${row.leadTimeDays} d`}</Td>
                  <Td numeric>{row.sampleCost ? money(row.sampleCost, row.currency, 0) : '—'}</Td>
                  <Td numeric>{row.developmentCost || row.toolingCost ? money((BigInt(row.developmentCost ?? '0') + BigInt(row.toolingCost ?? '0')).toString(), row.currency, 0) : '—'}</Td>
                  <Td className="text-[0.8125rem] text-ink-soft">{[row.incoterm, row.namedPlace, row.paymentTerms].filter(Boolean).join(' · ') || '—'}</Td>
                  <Td className="code text-ink-soft">{row.validUntil ? formatLocalDate(row.validUntil) : '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>
      {manage && dialog && <SourcingDialog product={product} row={dialog.row} open onClose={() => setDialog(null)} />}
    </>
  );
}

// ---------------------------------------------------------------- costing

function CostingDialog({ product, row, sourcing, open, onClose }: { product: DevelopmentProductDetail; row: DevelopmentCostingView | null; sourcing: readonly DevelopmentSourcingView[]; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveDevelopmentCosting();
  const [form, setForm] = useState({ basis: 'estimate' as CostingBasis, currency: 'USD', unitCost: '', packagingCost: '', freightCost: '', dutyCost: '', otherCost: '', quantity: '', plannedPrice: '', wholesalePrice: '', sourcingId: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(row ? { basis: row.basis, currency: row.currency, unitCost: amountField(row.unitCost, row.currency), packagingCost: amountField(row.packagingCost, row.currency), freightCost: amountField(row.freightCost, row.currency), dutyCost: amountField(row.dutyCost, row.currency), otherCost: amountField(row.otherCost, row.currency), quantity: row.quantity ? formatQuantity(quantityFromStored(row.quantity, 'pcs')).replace(/[^\d.]/g, '') : '', plannedPrice: amountField(row.plannedPrice, row.currency), wholesalePrice: amountField(row.wholesalePrice, row.currency), sourcingId: row.sourcingId ?? '', notes: row.notes } : { basis: 'estimate', currency: 'USD', unitCost: '', packagingCost: '', freightCost: '', dutyCost: '', otherCost: '', quantity: '', plannedPrice: '', wholesalePrice: '', sourcingId: sourcing.find((candidate) => candidate.isSelected)?.id ?? '', notes: '' });
  }, [open, row, sourcing]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = { unitCost: amountOrNull(form.unitCost), packagingCost: amountOrNull(form.packagingCost), freightCost: amountOrNull(form.freightCost), dutyCost: amountOrNull(form.dutyCost), otherCost: amountOrNull(form.otherCost), plannedPrice: amountOrNull(form.plannedPrice), wholesalePrice: amountOrNull(form.wholesalePrice) };
    if (Object.values(parsed).includes('invalid')) return setError(t('An amount is not a number.'));
    if (!parsed.unitCost) return setError(t('The unit cost is needed.'));
    let quantity: string | null = null;
    if (form.quantity.trim()) {
      try {
        quantity = parseFixed(form.quantity, QUANTITY_DECIMALS).toString();
      } catch {
        return setError(t('The quantity is not a number.'));
      }
    }
    try {
      await save.mutateAsync({ id: row?.id, number: product.number, basis: form.basis, currency: form.currency, unitCost: parsed.unitCost as string, packagingCost: (parsed.packagingCost as string | null) ?? '0', freightCost: (parsed.freightCost as string | null) ?? '0', dutyCost: (parsed.dutyCost as string | null) ?? '0', otherCost: (parsed.otherCost as string | null) ?? '0', quantity, plannedPrice: parsed.plannedPrice as string | null, wholesalePrice: parsed.wholesalePrice as string | null, sourcingId: form.sourcingId || null, notes: form.notes });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The costing could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={row ? t('Costing') : t('New costing')} description={t('Per unit, in one currency. An estimate before quotes, a quotation on a supplier\'s numbers, and the approved figures. Landed cost and margin are read from them.')} className="w-[min(44rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <SelectField label={t('Basis')} value={form.basis} onChange={set('basis')}>
          {COSTING_BASES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(COSTING_BASIS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Rests on')} value={form.sourcingId} onChange={set('sourcingId')} help={t('Required for a quotation basis.')}>
          <option value="">{t('No quotation')}</option>
          {sourcing.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.supplierName}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Unit cost')} required inputMode="decimal" value={form.unitCost} onChange={set('unitCost')} />
        <TextField label={t('Packaging')} inputMode="decimal" value={form.packagingCost} onChange={set('packagingCost')} />
        <TextField label={t('Freight')} inputMode="decimal" value={form.freightCost} onChange={set('freightCost')} />
        <TextField label={t('Duty')} inputMode="decimal" value={form.dutyCost} onChange={set('dutyCost')} />
        <TextField label={t('Other')} inputMode="decimal" value={form.otherCost} onChange={set('otherCost')} />
        <TextField label={t('Quantity assumed')} inputMode="decimal" unit="pcs" value={form.quantity} onChange={set('quantity')} />
        <TextField label={t('Planned retail price')} inputMode="decimal" value={form.plannedPrice} onChange={set('plannedPrice')} />
        <TextField label={t('Wholesale price')} inputMode="decimal" value={form.wholesalePrice} onChange={set('wholesalePrice')} />
        <TextArea label={t('Notes')} rows={2} value={form.notes} onChange={set('notes')} className="sm:col-span-3" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Costing({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const costing = useDevelopmentCosting(product.id, true);
  const sourcing = useDevelopmentSourcing(product.id, true);
  const [dialog, setDialog] = useState<{ row: DevelopmentCostingView | null } | null>(null);
  const rows = costing.data ?? [];
  const spent = budgetSpent(product.samples, sourcing.data ?? [], product.budgetCurrency);
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={t('Budget')} className="xl:col-span-4">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="caps text-ink-muted">{t('Planned')}</dt>
            <dd className="mt-1 font-display text-[1.75rem] leading-none">{product.budgetAmount ? money(product.budgetAmount, product.budgetCurrency, 0) : '—'}</dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">{t('Spent')}</dt>
            <dd className="mt-1 font-display text-[1.75rem] leading-none">{money(spent.spent, product.budgetCurrency, 0)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[0.8125rem] text-ink-muted">
          {product.budgetCurrency} · {t('sample rounds and the selected supplier\'s development and tooling')}
          {spent.otherCurrencies > 0 && ` · ${spent.otherCurrencies} ${t('in other currencies')}`}
        </p>
      </Panel>
      <Panel title={t('Costings')} count={rows.length} className="xl:col-span-8" flush action={manage && <Button size="sm" onClick={() => setDialog({ row: null })}><Plus size={14} aria-hidden="true" />{t('Add costing')}</Button>}>
        {costing.isPending ? (
          <p className="px-5 py-6 text-ink-muted">{t('Loading costings')}</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No costing yet. Start with an estimate; the production gate wants a quotation.')}</p>
        ) : (
          <Ledger caption={t('Costings')}>
            <thead>
              <tr>
                <Th>{t('Basis')}</Th>
                <Th numeric>{t('Unit')}</Th>
                <Th numeric>{t('Packaging')}</Th>
                <Th numeric>{t('Freight')}</Th>
                <Th numeric>{t('Duty')}</Th>
                <Th numeric>{t('Landed')}</Th>
                <Th numeric>{t('Price')}</Th>
                <Th numeric>{t('Margin')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const margin = costingMargin(row);
                return (
                  <Tr key={row.id} onClick={manage ? () => setDialog({ row }) : undefined}>
                    <Td>
                      <span className="font-medium">{t(COSTING_BASIS_LABEL[row.basis])}</span>
                      <span className="ms-2 text-[0.75rem] text-ink-muted">{row.currency}{row.quantity ? ` · ${formatQuantity(quantityFromStored(row.quantity, 'pcs'))}` : ''}</span>
                    </Td>
                    <Td numeric>{money(row.unitCost, row.currency)}</Td>
                    <Td numeric className="text-ink-soft">{money(row.packagingCost, row.currency)}</Td>
                    <Td numeric className="text-ink-soft">{money(row.freightCost, row.currency)}</Td>
                    <Td numeric className="text-ink-soft">{money(row.dutyCost, row.currency)}</Td>
                    <Td numeric className="font-medium">{money(developmentLandedCost(row), row.currency)}</Td>
                    <Td numeric>{row.plannedPrice ? money(row.plannedPrice, row.currency) : '—'}</Td>
                    <Td numeric>{margin ? <span className={cn(margin.marginBasisPoints < 3000 && 'text-critical')}>{(margin.marginBasisPoints / 100).toFixed(1)}%</span> : '—'}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Ledger>
        )}
      </Panel>
      {manage && dialog && <CostingDialog product={product} row={dialog.row} sourcing={sourcing.data ?? []} open onClose={() => setDialog(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- tasks and decisions

function Tasks({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const session = useRequiredSession();
  const tasks = useOpenTasks();
  const staff = useStaff();
  const create = useCreateTask();
  const [form, setForm] = useState({ title: '', dueOn: '', assigneeUid: session.uid });
  const [error, setError] = useState<string | null>(null);
  const own = (tasks.data ?? []).filter((task) => task.entityType === 'development_product' && task.entityId === product.number);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError(t('Say what to do.'));
    try {
      await create.mutateAsync({ title: form.title.trim(), details: '', assigneeUid: form.assigneeUid, dueOn: form.dueOn, entityType: 'development_product', entityId: product.number });
      setForm((current) => ({ ...current, title: '', dueOn: '' }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The task could not be created.'));
    }
  };
  return (
    <Panel title={t('Open tasks')} count={own.length} flush>
      {manage && (
        <form onSubmit={submit} className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <TextField label={t('Task')} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t('Send the fit comments to the mill')} />
          <SelectField label={t('For')} value={form.assigneeUid} onChange={(event) => setForm((current) => ({ ...current, assigneeUid: event.target.value }))}>
            {(staff.data ?? []).map((person) => (
              <option key={person.uid} value={person.uid}>
                {person.name}
              </option>
            ))}
          </SelectField>
          <TextField label={t('Due')} type="date" value={form.dueOn} onChange={(event) => setForm((current) => ({ ...current, dueOn: event.target.value }))} />
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Add')}</Button>
          {error && (
            <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-4">
              {error}
            </p>
          )}
        </form>
      )}
      {own.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">{t('No open tasks on this product.')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {own.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <span>
                <span className="font-medium">{task.title}</span>
                <span className="ms-3 text-[0.8125rem] text-ink-muted">{task.assigneeName}</span>
              </span>
              <span className="code text-[0.75rem] text-ink-muted">{task.dueOn ? formatLocalDate(task.dueOn) : ''}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Decisions({ product, manage }: { product: DevelopmentProductDetail; manage: boolean }) {
  const t = useT();
  const timeline = useTimeline('development_product', product.number);
  const note = useRecordNote('development_product', product.number);
  const decide = useRecordDevelopmentDecision();
  const [text, setText] = useState('');
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={t('Approvals')} count={product.approvals.length} className="xl:col-span-4" flush>
        {product.approvals.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No gate passed yet.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {product.approvals.map((approval) => (
              <li key={approval.id} className="px-5 py-3">
                <p className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t(DEVELOPMENT_STAGE_LABEL[approval.gate])}</span>
                  <StatusChip tone={approval.decision === 'approved' ? 'positive' : approval.decision === 'returned' ? 'caution' : 'critical'}>{t(approval.decision === 'approved' ? 'Approved' : approval.decision === 'returned' ? 'Returned' : 'Rejected')}</StatusChip>
                </p>
                <p className="code mt-0.5 text-[0.75rem] text-ink-muted">{approval.decidedByName} · {new Date(approval.decidedAt).toLocaleDateString()}</p>
                {approval.note && <p className="mt-1 text-[0.875rem] text-ink-soft">{approval.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('Decisions and timeline')} count={timeline.data?.length} className="xl:col-span-8">
        {manage && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              void decide.mutateAsync({ number: product.number, note: text.trim() }).then(() => setText(''));
            }}
            className="mb-5 flex flex-wrap items-end gap-3"
          >
            <TextField label={t('Record a decision')} value={text} onChange={(event) => setText(event.target.value)} placeholder={t('We drop the leather version; the canvas one goes to sampling.')} className="min-w-0 flex-1" />
            <Button type="submit" variant="primary" busy={decide.isPending} busyLabel={t('Saving')}>{t('Record')}</Button>
          </form>
        )}
        <Timeline events={timeline.data ?? []} onAddNote={manage ? (value) => note.mutateAsync(value) : undefined} busy={note.isPending} canNote={manage} />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- the sheet

export function Dossier({ tab }: { tab: Tab }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const product = useDevelopmentProduct(number);
  const manage = useManageDevelopment();
  const costs = canViewCosts(session.role);
  const canJudge = manage || session.role === 'qc';
  const [dialog, setDialog] = useState<'edit' | { to: DevelopmentStage } | null>(null);

  if (product.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading the dossier')}</p>;
  if (product.error) return <p className="px-5 py-10 text-critical lg:px-8">The dossier could not be loaded. {product.error.message}</p>;
  if (!product.data) return <NotFound what={t('development product')} />;
  const data = product.data;
  const base = `/development/products/${data.number}`;
  const moves = nextStages(data.stage).filter((stage) => stage !== 'commercial');
  const steps: TrackStep[] = OPEN_DEVELOPMENT_STAGES.map((stage) => {
    const index = OPEN_DEVELOPMENT_STAGES.indexOf(stage);
    const current = OPEN_DEVELOPMENT_STAGES.indexOf(data.stage);
    const approval = data.approvals.find((candidate) => candidate.gate === stage && candidate.decision === 'approved');
    const state = data.stage === 'commercial' || index < current ? 'done' : index === current ? 'active' : 'pending';
    return { key: stage, label: t(DEVELOPMENT_STAGE_LABEL[stage]), state, caption: approval ? `${approval.decidedByName}, ${new Date(approval.decidedAt).toLocaleDateString()}` : state === 'active' ? t(DEVELOPMENT_HEALTH_LABEL[data.health]) : '' };
  });

  return (
    <>
      <LabelHeader
        code={data.number}
        title={data.name}
        subtitle={[data.workingTitle, t(data.categoryName), data.collectionName].filter(Boolean).join(' · ')}
        status={
          <>
            <StatusChip tone={DEVELOPMENT_STAGE_TONE[data.stage]}>{t(DEVELOPMENT_STAGE_LABEL[data.stage])}</StatusChip>
            <span className="flex items-center gap-1.5 text-[0.8125rem] text-ink-soft">
              <Swatch tone={DEVELOPMENT_HEALTH_TONE[data.health]} />
              {t(DEVELOPMENT_HEALTH_LABEL[data.health])}
            </span>
            {data.catalogProductCode && (
              <Link to={`/products/${data.catalogProductCode}`} className="code text-[0.8125rem] underline decoration-line-strong underline-offset-4">
                {data.catalogProductCode}
              </Link>
            )}
          </>
        }
        facts={[
          { label: t('Owner'), value: data.ownerName || '—' },
          { label: t('Priority'), value: t(data.priority === 'high' ? 'High' : data.priority === 'low' ? 'Low' : 'Normal') },
          { label: t('Target launch'), value: data.targetLaunch ? formatLocalDate(data.targetLaunch) : '—' },
          { label: t('Budget'), value: data.budgetAmount ? `${money(data.budgetAmount, data.budgetCurrency, 0)} ${data.budgetCurrency}` : '—' },
          { label: t('Variants'), value: data.variants.length },
          { label: t('Sample rounds'), value: data.samples.length },
        ]}
        actions={
          manage && (
            <>
              {moves.filter((stage) => !['on_hold', 'dropped'].includes(stage)).map((stage) => (
                <Button key={stage} variant={GATES[stage] && OPEN_DEVELOPMENT_STAGES.indexOf(stage) > OPEN_DEVELOPMENT_STAGES.indexOf(data.stage) ? 'primary' : undefined} onClick={() => setDialog({ to: stage })}>
                  {t(DEVELOPMENT_STAGE_LABEL[stage])}
                </Button>
              ))}
              {moves.includes('on_hold') && <Button variant="quiet" onClick={() => setDialog({ to: 'on_hold' })}>{t('Hold')}</Button>}
              {moves.includes('dropped') && <Button variant="quiet" onClick={() => setDialog({ to: 'dropped' })}>{t('Drop')}</Button>}
              <Button onClick={() => setDialog('edit')}>{t('Edit')}</Button>
            </>
          )
        }
      />
      <div className="border-b border-line bg-panel px-5 py-4 lg:px-8">
        <Track steps={steps} />
      </div>
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Overview')}</NavLink>
        <NavLink to={`${base}/files`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Files')}</NavLink>
        <NavLink to={`${base}/samples`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Samples')}</NavLink>
        {costs && <NavLink to={`${base}/sourcing`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Sourcing')}</NavLink>}
        {costs && <NavLink to={`${base}/costing`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Costing')}</NavLink>}
        <NavLink to={`${base}/tasks`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Tasks')}</NavLink>
        <NavLink to={`${base}/decisions`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Decisions')}</NavLink>
      </SheetTabs>
      <div className="px-5 py-6 lg:px-8">
        {tab === 'overview' && <Overview product={data} manage={manage} />}
        {tab === 'files' && <Files product={data} manage={manage} />}
        {tab === 'samples' && <Samples product={data} manage={manage} canJudge={canJudge} />}
        {tab === 'sourcing' && (costs ? <Sourcing product={data} manage={manage || session.role === 'purchasing'} /> : <EmptyState title={t('Not available to this role')} />)}
        {tab === 'costing' && (costs ? <Costing product={data} manage={manage || session.role === 'finance'} /> : <EmptyState title={t('Not available to this role')} />)}
        {tab === 'tasks' && <Tasks product={data} manage={manage} />}
        {tab === 'decisions' && <Decisions product={data} manage={manage} />}
      </div>
      {manage && (
        <>
          <ProductDialog product={data} open={dialog === 'edit'} onClose={() => setDialog(null)} />
          <GateDialog product={data} to={dialog && dialog !== 'edit' ? dialog.to : null} open={dialog !== null && dialog !== 'edit'} onClose={() => setDialog(null)} />
        </>
      )}
    </>
  );
}
