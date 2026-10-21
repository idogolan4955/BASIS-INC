import { INTERACTION_KINDS, INTERACTION_KIND_LABEL, OPEN_STAGES, OPPORTUNITY_HEALTH_LABEL, OPPORTUNITY_HEALTH_TONE, OPPORTUNITY_STAGE_LABEL, OPPORTUNITY_STAGE_TONE, formatLocalDate, formatMoney, moneyFromStored, nextStepsDue, todayIn, type CompanyDetail, type InteractionKind, type OpportunityView } from '@basis/shared';
import { Button, CheckField, Dialog, Ledger, Panel, SelectField, StatusChip, Swatch, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useInteractions, useLogInteraction, useOpportunities } from '../../data/relationships';
import { useT } from '../../i18n';
import { OpportunityDialog } from '../customers/Pipeline';

// A customer's relationship: the opportunities it is in and the calls,
// visits and samples behind them, newest first, with the next steps due.

const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency), 0);
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function LogInteractionDialog({ company, opportunities, open, onClose, opportunityId }: { company: CompanyDetail; opportunities: readonly OpportunityView[]; open: boolean; onClose: () => void; opportunityId?: string }) {
  const t = useT();
  const log = useLogInteraction();
  const [form, setForm] = useState({ kind: 'call' as InteractionKind, contactId: '', opportunityId: opportunityId ?? '', summary: '', nextStep: '', nextOn: '', task: true });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ kind: 'call', contactId: company.contacts.find((contact) => contact.isPrimary)?.id ?? '', opportunityId: opportunityId ?? '', summary: '', nextStep: '', nextOn: '', task: true });
  }, [open, company, opportunityId]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.summary.trim()) return setError(t('Say what happened.'));
    try {
      await log.mutateAsync({ customerId: company.id, contactId: form.contactId || undefined, opportunityId: form.opportunityId || undefined, kind: form.kind, summary: form.summary, nextStep: form.nextStep, nextOn: form.nextOn || null, taskForNextStep: form.task });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The interaction could not be logged.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Log interaction')} description={t('A call, an email, a meeting, a visit or a sample sent. The next step can become a task.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          {INTERACTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(INTERACTION_KIND_LABEL[kind])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Contact')} value={form.contactId} onChange={set('contactId')}>
          <option value="">{t('Nobody in particular')}</option>
          {company.contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Opportunity')} value={form.opportunityId} onChange={set('opportunityId')} className="sm:col-span-2">
          <option value="">{t('General')}</option>
          {opportunities.filter((opportunity) => OPEN_STAGES.includes(opportunity.stage) || opportunity.id === opportunityId).map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.title}
            </option>
          ))}
        </SelectField>
        <TextArea label={t('What happened')} required rows={3} value={form.summary} onChange={set('summary')} className="sm:col-span-2" />
        <TextField label={t('Next step')} maxLength={200} value={form.nextStep} onChange={set('nextStep')} placeholder={t('Send swatches')} />
        <TextField label={t('By')} type="date" value={form.nextOn} onChange={set('nextOn')} />
        <CheckField label={t('Make the next step a task for me')} checked={form.task} onChange={(event) => setForm((current) => ({ ...current, task: event.target.checked }))} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={log.isPending} busyLabel={t('Saving')}>{t('Log')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CustomerRelationship({ company, manage }: { company: CompanyDetail; manage: boolean }) {
  const t = useT();
  const opportunities = useOpportunities();
  const interactions = useInteractions(company.id);
  const [dialog, setDialog] = useState<{ kind: 'log'; opportunityId?: string } | { kind: 'opportunity'; opportunity: OpportunityView | null } | null>(null);
  const own = (opportunities.data ?? []).filter((opportunity) => opportunity.customerId === company.id);
  const rows = interactions.data ?? [];
  const due = nextStepsDue(rows, todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone));

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel
        title={t('Opportunities')}
        count={own.length}
        className="xl:col-span-12"
        flush
        action={manage && <Button size="sm" onClick={() => setDialog({ kind: 'opportunity', opportunity: null })}><Plus size={14} aria-hidden="true" />{t('New opportunity')}</Button>}
      >
        {own.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No opportunities yet. Open one when there is something this customer might buy.')}</p>
        ) : (
          <Ledger caption={t('Opportunities')}>
            <thead>
              <tr>
                <Th>{t('Opportunity')}</Th>
                <Th>{t('Stage')}</Th>
                <Th>{t('Health')}</Th>
                <Th numeric>{t('Value')}</Th>
                <Th>{t('Expected close')}</Th>
                <Th>{t('Quote')}</Th>
                <Th>{t('Owner')}</Th>
              </tr>
            </thead>
            <tbody>
              {own.map((opportunity) => (
                <Tr key={opportunity.id}>
                  <Td>
                    <button type="button" onClick={() => setDialog({ kind: 'opportunity', opportunity })} className="text-start font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {opportunity.title}
                    </button>
                  </Td>
                  <Td>
                    <StatusChip tone={OPPORTUNITY_STAGE_TONE[opportunity.stage]}>{t(OPPORTUNITY_STAGE_LABEL[opportunity.stage])}</StatusChip>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5 text-[0.8125rem]">
                      <Swatch tone={OPPORTUNITY_HEALTH_TONE[opportunity.health]} />
                      {t(OPPORTUNITY_HEALTH_LABEL[opportunity.health])}
                      {opportunity.health !== 'closed' && <span className="code text-ink-muted">{opportunity.daysSinceActivity}d</span>}
                    </span>
                  </Td>
                  <Td numeric>{opportunity.value !== null ? `${money(opportunity.value, opportunity.currency)} ${opportunity.currency}` : '—'}</Td>
                  <Td className={cn('code', opportunity.health === 'overdue' ? 'text-critical' : 'text-ink-soft')}>{opportunity.expectedClose ? formatLocalDate(opportunity.expectedClose) : '—'}</Td>
                  <Td className="code">
                    {opportunity.quoteNumber ? <Link to={`/orders/quotes/${opportunity.quoteNumber}`} className="underline decoration-line-strong underline-offset-4">{opportunity.quoteNumber}</Link> : '—'}
                    {opportunity.orderNumber && <Link to={`/orders/${opportunity.orderNumber}`} className="ms-2 underline decoration-line-strong underline-offset-4">{opportunity.orderNumber}</Link>}
                  </Td>
                  <Td className="text-ink-soft">{opportunity.ownerName}</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>

      {due.length > 0 && (
        <Panel title={t('Next steps due')} count={due.length} className="xl:col-span-4">
          <ul className="space-y-3">
            {due.map((interaction) => (
              <li key={interaction.id} className="border-s-2 border-s-caution ps-3">
                <p className="font-medium">{interaction.nextStep}</p>
                <p className="code text-[0.75rem] text-ink-muted">{interaction.nextOn ? formatLocalDate(interaction.nextOn) : ''}{interaction.opportunityTitle ? ` · ${interaction.opportunityTitle}` : ''}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        title={t('Interactions')}
        count={rows.length}
        className={due.length > 0 ? 'xl:col-span-8' : 'xl:col-span-12'}
        action={manage && <Button size="sm" onClick={() => setDialog({ kind: 'log' })}><Plus size={14} aria-hidden="true" />{t('Log interaction')}</Button>}
      >
        {rows.length === 0 ? (
          <p className="text-ink-muted">{t('Nothing logged yet. The first call, visit or sample goes here.')}</p>
        ) : (
          <ol className="relative space-y-5 border-s border-line ps-5">
            {rows.map((interaction) => (
              <li key={interaction.id} className="relative">
                <span aria-hidden="true" className="absolute -start-[1.4rem] top-1.5 size-2.5 rounded-full border border-cocoa bg-panel" />
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="caps text-ink-muted">{t(INTERACTION_KIND_LABEL[interaction.kind])}</span>
                  <span className="code text-[0.75rem] text-ink-muted" dir="ltr">{when(interaction.occurredAt)}</span>
                  {interaction.contactName && <span className="text-[0.8125rem] text-ink-soft">{interaction.contactName}</span>}
                  {interaction.opportunityTitle && <span className="text-[0.8125rem] text-ink-soft">· {interaction.opportunityTitle}</span>}
                  <span className="ms-auto text-[0.75rem] text-ink-muted">{interaction.byName}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{interaction.summary}</p>
                {interaction.nextStep && (
                  <p className="mt-1 text-[0.8125rem] text-ink-soft">
                    {t('Next')}: {interaction.nextStep}
                    {interaction.nextOn && <span className="code ms-2 text-ink-muted">{formatLocalDate(interaction.nextOn)}</span>}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {manage && <LogInteractionDialog company={company} opportunities={own} open={dialog?.kind === 'log'} onClose={() => setDialog(null)} opportunityId={dialog?.kind === 'log' ? dialog.opportunityId : undefined} />}
      <OpportunityDialog opportunity={dialog?.kind === 'opportunity' ? dialog.opportunity : null} customerId={company.id} open={dialog?.kind === 'opportunity'} onClose={() => setDialog(null)} />
    </div>
  );
}
