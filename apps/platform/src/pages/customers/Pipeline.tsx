import {
  MONEY_DECIMALS,
  OPEN_STAGES,
  OPPORTUNITY_HEALTH_LABEL,
  OPPORTUNITY_HEALTH_TONE,
  OPPORTUNITY_SOURCES,
  OPPORTUNITY_SOURCE_LABEL,
  OPPORTUNITY_STAGES,
  OPPORTUNITY_STAGE_LABEL,
  OPPORTUNITY_STAGE_TONE,
  canManageModule,
  formatLocalDate,
  formatMoney,
  moneyFromStored,
  parseFixed,
  pipelineSummary,
  winRate,
  type OpportunitySource,
  type OpportunityStage,
  type OpportunityView,
} from '@basis/shared';
import { Button, Dialog, SelectField, Swatch, TextArea, TextField, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { useQuotes } from '../../data/commercial';
import { useOpportunities, useSaveOpportunity } from '../../data/relationships';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { CustomerSelect } from '../orders/Orders';
import { ModuleTitle } from '../products/ProductsIndex';

// The pipeline: every open opportunity in its stage, what each stage is
// worth, and the health read from the dates. A card drags to the next stage;
// losing one asks why.

const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency), 0);
const CURRENCIES = ['EUR', 'USD', 'GBP', 'ILS', 'CHF'];

export function CustomersTabs({ active }: { active: 'companies' | 'pipeline' | 'inquiries' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Customer sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('companies', '/customers', t('Customers'))}
      {tab('pipeline', '/customers/pipeline', t('Pipeline'))}
      {tab('inquiries', '/customers/inquiries', t('Inquiries'))}
    </nav>
  );
}

export function OpportunityDialog({ opportunity, customerId, stage, open, onClose }: { opportunity: OpportunityView | null; customerId?: string; stage?: OpportunityStage; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveOpportunity();
  const quotes = useQuotes();
  const [form, setForm] = useState({ customerId: '', title: '', stage: 'lead' as OpportunityStage, source: '' as OpportunitySource | '', value: '', currency: 'EUR', expectedClose: '', quoteNumber: '', lostReason: '', notes: '' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(opportunity
      ? { customerId: opportunity.customerId, title: opportunity.title, stage: stage ?? opportunity.stage, source: opportunity.source ?? '', value: opportunity.value === null ? '' : formatMoney(moneyFromStored(opportunity.value, opportunity.currency), 2).replace(/,/g, ''), currency: opportunity.currency, expectedClose: opportunity.expectedClose ?? '', quoteNumber: opportunity.quoteNumber ?? '', lostReason: opportunity.lostReason, notes: opportunity.notes }
      : { customerId: customerId ?? '', title: '', stage: stage ?? 'lead', source: '', value: '', currency: 'EUR', expectedClose: '', quoteNumber: '', lostReason: '', notes: '' });
  }, [open, opportunity, customerId, stage]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const customerQuotes = (quotes.data ?? []).filter((quote) => quote.customerId === form.customerId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.customerId) return setError(t('Choose the customer.'));
    if (!form.title.trim()) return setError(t('Give the opportunity a title.'));
    if (form.stage === 'lost' && !form.lostReason.trim()) return setError(t('Say why it was lost.'));
    let value: string | null = null;
    if (form.value.trim()) {
      try {
        value = parseFixed(form.value, MONEY_DECIMALS).toString();
      } catch {
        return setError(t('The value is not an amount.'));
      }
    }
    try {
      await save.mutateAsync({ id: opportunity?.id, customerId: form.customerId, title: form.title, stage: form.stage, source: (form.source || null) as OpportunitySource | null, value, currency: form.currency, expectedClose: form.expectedClose || null, quoteNumber: form.quoteNumber || null, lostReason: form.lostReason, notes: form.notes });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The opportunity could not be saved.'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={opportunity ? t('Opportunity') : t('New opportunity')} description={t('What a customer might buy, where the conversation stands, and what it would be worth.')} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {opportunity || customerId ? (
          <p className="text-sm sm:col-span-2">
            <span className="caps block text-ink-muted">{t('Customer')}</span>
            <Link to={`/customers/${form.customerId}`} className="font-medium underline decoration-line-strong underline-offset-4">{opportunity?.customerName ?? ''}</Link>
          </p>
        ) : (
          <CustomerSelect value={form.customerId} onChange={(id) => setForm((current) => ({ ...current, customerId: id }))} className="sm:col-span-2" />
        )}
        <TextField label={t('Title')} required maxLength={160} value={form.title} onChange={set('title')} placeholder={t('Spring collection foundation layers')} className="sm:col-span-2" />
        <SelectField label={t('Stage')} value={form.stage} onChange={set('stage')}>
          {OPPORTUNITY_STAGES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(OPPORTUNITY_STAGE_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Source')} value={form.source} onChange={set('source')}>
          <option value="">{t('Not recorded')}</option>
          {OPPORTUNITY_SOURCES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(OPPORTUNITY_SOURCE_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Value')} inputMode="decimal" value={form.value} onChange={set('value')} placeholder="25000" help={t('The order this would become.')} />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Expected close')} type="date" value={form.expectedClose} onChange={set('expectedClose')} />
        <SelectField label={t('Quote')} value={form.quoteNumber} onChange={set('quoteNumber')} help={t('The quote moves the stage on its own.')}>
          <option value="">{t('None yet')}</option>
          {customerQuotes.map((quote) => (
            <option key={quote.number} value={quote.number}>
              {quote.number} · {quote.state}
            </option>
          ))}
        </SelectField>
        {form.stage === 'lost' && <TextField label={t('Lost because')} required maxLength={200} value={form.lostReason} onChange={set('lostReason')} className="sm:col-span-2" />}
        <TextArea label={t('Notes')} rows={3} value={form.notes} onChange={set('notes')} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{opportunity ? t('Save') : t('Open opportunity')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Card({ opportunity, manage, onOpen, onDragStart }: { opportunity: OpportunityView; manage: boolean; onOpen: () => void; onDragStart: (event: DragEvent<HTMLElement>) => void }) {
  const t = useT();
  return (
    <article
      draggable={manage}
      onDragStart={onDragStart}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
      tabIndex={0}
      aria-label={opportunity.title}
      className={cn('cursor-pointer rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3 transition-colors duration-150 hover:border-line-strong', manage && 'cursor-grab active:cursor-grabbing', opportunity.health === 'overdue' && 'border-s-2 border-s-critical', opportunity.health === 'quiet' && 'border-s-2 border-s-caution')}
    >
      <p className="font-medium leading-snug">{opportunity.title}</p>
      <p className="mt-1 text-[0.8125rem] text-ink-soft">{opportunity.customerName}</p>
      <p className="mt-2 flex items-center justify-between gap-2 text-[0.75rem]">
        <span className="code">{opportunity.value !== null ? `${money(opportunity.value, opportunity.currency)} ${opportunity.currency}` : '—'}</span>
        <span className="flex items-center gap-1.5 text-ink-muted">
          <Swatch tone={OPPORTUNITY_HEALTH_TONE[opportunity.health]} />
          {opportunity.health === 'active' ? `${opportunity.daysSinceActivity}d` : t(OPPORTUNITY_HEALTH_LABEL[opportunity.health])}
        </span>
      </p>
      {opportunity.expectedClose && <p className={cn('code mt-1 text-[0.6875rem]', opportunity.health === 'overdue' ? 'text-critical' : 'text-ink-muted')}>{formatLocalDate(opportunity.expectedClose)}</p>}
      {opportunity.quoteNumber && <p className="code mt-1 text-[0.6875rem] text-ink-muted">{opportunity.quoteNumber}</p>}
    </article>
  );
}

export function Pipeline() {
  const t = useT();
  const session = useRequiredSession();
  const opportunities = useOpportunities();
  const save = useSaveOpportunity();
  const manage = canManageModule(session.role, 'customers');
  const [dialog, setDialog] = useState<{ opportunity: OpportunityView | null; stage?: OpportunityStage } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const all = useMemo(() => opportunities.data ?? [], [opportunities.data]);
  const summary = useMemo(() => pipelineSummary(all, 'EUR'), [all]);
  const rate = winRate(all);
  const stages = showClosed ? OPPORTUNITY_STAGES : OPEN_STAGES;

  const drop = (stage: OpportunityStage) => {
    const opportunity = all.find((candidate) => candidate.id === dragId);
    setDragId(null);
    if (!opportunity || opportunity.stage === stage) return;
    if (stage === 'lost') {
      setDialog({ opportunity, stage: 'lost' });
      return;
    }
    save
      .mutateAsync({ id: opportunity.id, customerId: opportunity.customerId, title: opportunity.title, stage, source: opportunity.source, value: opportunity.value, currency: opportunity.currency, expectedClose: opportunity.expectedClose, quoteNumber: opportunity.quoteNumber, lostReason: opportunity.lostReason, notes: opportunity.notes })
      .catch((failure) => setError(failure instanceof Error ? failure.message : 'The stage could not be changed.'));
  };

  return (
    <>
      <ModuleTitle
        number="09"
        title={t('Customers')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setDialog({ opportunity: null })}>
              <Plus size={16} aria-hidden="true" />{t('New opportunity')}</Button>
          )
        }
      >{t('The pipeline: what each customer might buy, where it stands, and what has gone quiet.')}</ModuleTitle>
      <CustomersTabs active="pipeline" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] text-ink-soft">
          <span>
            {t('Open')} <span className="code text-ink">{all.filter((opportunity) => OPEN_STAGES.includes(opportunity.stage)).length}</span>
          </span>
          <span>
            {t('Open value')} <span className="code text-ink">{money(summary.filter((entry) => OPEN_STAGES.includes(entry.stage)).reduce((sum, entry) => sum + BigInt(entry.value), 0n).toString(), 'EUR')} EUR</span>
          </span>
          <span>
            {t('Win rate')} <span className="code text-ink">{rate === null ? '—' : `${rate}%`}</span>
          </span>
          <label className="ms-auto flex items-center gap-2">
            <input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} className="size-4 accent-charcoal" />
            {t('Show won and lost')}
          </label>
        </div>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        {opportunities.isPending ? (
          <p className="text-ink-muted">{t('Loading the pipeline')}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[56rem] gap-3" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
              {stages.map((stage) => {
                const entry = summary.find((candidate) => candidate.stage === stage)!;
                const own = all.filter((opportunity) => opportunity.stage === stage);
                return (
                  <section
                    key={stage}
                    aria-label={t(OPPORTUNITY_STAGE_LABEL[stage])}
                    onDragOver={(event) => {
                      if (dragId) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      drop(stage);
                    }}
                    className={cn('flex min-h-[18rem] flex-col rounded-[var(--radius-panel)] bg-sunken p-2', dragId && 'outline-dashed outline-1 outline-line-strong')}
                  >
                    <header className="px-2 pb-2 pt-1">
                      <p className="flex items-center justify-between gap-2">
                        <span className="caps flex items-center gap-1.5 text-ink-muted">
                          <Swatch tone={OPPORTUNITY_STAGE_TONE[stage]} />
                          {t(OPPORTUNITY_STAGE_LABEL[stage])}
                        </span>
                        <span className="code text-[0.6875rem] text-ink-muted">{entry.count}</span>
                      </p>
                      <p className="code mt-1 text-[0.75rem] text-ink-soft">
                        {money(entry.value, 'EUR')} EUR
                        {entry.otherCurrencies > 0 && <span className="text-ink-muted"> +{entry.otherCurrencies}</span>}
                      </p>
                    </header>
                    <div className="flex flex-1 flex-col gap-2">
                      {own.map((opportunity) => (
                        <Card key={opportunity.id} opportunity={opportunity} manage={manage} onOpen={() => setDialog({ opportunity })} onDragStart={(event) => { setDragId(opportunity.id); event.dataTransfer.effectAllowed = 'move'; }} />
                      ))}
                      {own.length === 0 && <p className="px-2 py-4 text-center text-[0.75rem] text-ink-muted">{t('Nothing here')}</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <OpportunityDialog opportunity={dialog?.opportunity ?? null} stage={dialog?.stage} open={dialog !== null} onClose={() => setDialog(null)} />
    </>
  );
}
