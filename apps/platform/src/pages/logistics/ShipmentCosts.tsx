import {
  ALLOCATION_BASES,
  ALLOCATION_BASIS_LABEL,
  COST_CATEGORIES,
  COST_CATEGORY_LABEL,
  COST_KIND_LABEL,
  COST_KIND_TONE,
  CUSTOMS_STATES,
  CUSTOMS_STATE_LABEL,
  CUSTOMS_STATE_TONE,
  MONEY_DECIMALS,
  canViewCosts,
  costsForRun,
  defaultAllocationRules,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  moneyFromStored,
  parseFixed,
  quantityFromStored,
  upliftBasisPoints,
  type AllocationRules,
  type CostCategory,
  type CostKind,
  type CustomsState,
  type LocalDate,
  type ShipmentCostView,
  type ShipmentDetail,
} from '@basis/shared';
import { Button, CheckField, Dialog, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useAllocateCosts, useAllocationRun, useRecordCustomsEntry, useRecordShipmentCost, useShipmentCosts } from '../../data/costing';
import { useCompanies } from '../../data/parties';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';

// The costs tab of a shipment: what it cost, the customs entry, and the
// allocation that lands those costs on every lot. Logistics cost roles see
// costs and customs; purchase prices and landed cost stay with the cost roles.

const money = (stored: string, currency: string, digits = 2) => formatMoney(moneyFromStored(stored, currency), digits);
const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as LocalDate) : '—');
const CURRENCIES = ['USD', 'EUR', 'CNY', 'ILS', 'GBP', 'CHF'];

function CostDialog({ shipment, cost, open, onClose }: { shipment: ShipmentDetail; cost: ShipmentCostView | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const record = useRecordShipmentCost();
  const companies = useCompanies();
  const [form, setForm] = useState({ category: cost?.category ?? ('freight' as CostCategory), kind: cost?.kind ?? ('estimate' as CostKind), amount: cost ? (Number(cost.amount) / 10000).toString() : '', currency: cost?.currency ?? 'USD', fxRateToBase: '', vendorId: '', invoiceRef: cost?.invoiceRef ?? '', invoiceDate: cost?.invoiceDate ?? '', isRecoverable: cost?.isRecoverable ?? false, note: cost?.note ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const vendors = (companies.data ?? []).filter((company) => company.roles.some((role) => role === 'freight_forwarder' || role === 'customs_broker' || role === 'carrier'));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let amount: string;
    try {
      amount = parseFixed(form.amount, MONEY_DECIMALS).toString();
    } catch {
      return setError(t('An amount with up to four decimals.'));
    }
    try {
      await record.mutateAsync({ number: shipment.number, id: cost?.id, category: form.category, kind: form.kind, amount, currency: form.currency, fxRateToBase: form.fxRateToBase.trim() || undefined, vendorId: form.vendorId || null, invoiceRef: form.invoiceRef.trim() || null, invoiceDate: form.invoiceDate || null, isRecoverable: form.isRecoverable, note: form.note.trim() || null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The cost could not be recorded.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={cost ? t('Edit cost') : t('Record cost')} description={t('An estimate when booked, the actual when the invoice arrives. Foreign amounts come into the base currency at the recorded rate for the day unless the invoice fixed one.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Category')} value={form.category} onChange={set('category')}>
          {COST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(COST_CATEGORY_LABEL[category])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          <option value="estimate">{t('Estimate')}</option>
          <option value="actual">{t('Actual')}</option>
        </SelectField>
        <TextField label={t('Amount')} required value={form.amount} onChange={set('amount')} placeholder="1,840.00" inputMode="decimal" />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Rate to base')} value={form.fxRateToBase} onChange={set('fxRateToBase')} placeholder={t('Recorded rate for the day')} help={t('Only when the invoice fixed the rate.')} />
        <SelectField label={t('Vendor')} value={form.vendorId} onChange={set('vendorId')}>
          <option value="">{t('Not specified')}</option>
          {vendors.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Invoice')} value={form.invoiceRef} onChange={set('invoiceRef')} placeholder="MRL-4412" />
        <TextField label={t('Invoice date')} type="date" value={form.invoiceDate} onChange={set('invoiceDate')} />
        <CheckField label={t('Recoverable')} help={t('VAT and other taxes claimed back: recorded, never landed on the goods.')} checked={form.isRecoverable} onChange={(event) => setForm((f) => ({ ...f, isRecoverable: event.target.checked }))} className="sm:col-span-2" />
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={record.isPending} busyLabel={t('Saving')}>{t('Save cost')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function CustomsDialog({ shipment, current, open, onClose }: { shipment: ShipmentDetail; current: { state: CustomsState; entryNumber: string; declaredValue: string | null; declaredCurrency: string; duties: string | null; taxes: string | null; submittedOn: string | null; clearedOn: string | null; note: string } | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const record = useRecordCustomsEntry();
  const companies = useCompanies();
  const toText = (stored: string | null) => (stored ? (Number(stored) / 10000).toString() : '');
  const [form, setForm] = useState({ state: current?.state ?? ('preparing' as CustomsState), brokerId: '', entryNumber: current?.entryNumber ?? '', declaredValue: toText(current?.declaredValue ?? null), declaredCurrency: current?.declaredCurrency || 'USD', duties: toText(current?.duties ?? null), taxes: toText(current?.taxes ?? null), submittedOn: current?.submittedOn ?? '', clearedOn: current?.clearedOn ?? '', note: current?.note ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const brokers = (companies.data ?? []).filter((company) => company.roles.includes('customs_broker') || company.roles.includes('freight_forwarder'));
  const fixed = (value: string) => (value.trim() ? parseFixed(value, MONEY_DECIMALS).toString() : null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await record.mutateAsync({ number: shipment.number, state: form.state, brokerId: form.brokerId || null, entryNumber: form.entryNumber.trim() || null, declaredValue: fixed(form.declaredValue), declaredCurrency: form.declaredCurrency || null, duties: fixed(form.duties), taxes: fixed(form.taxes), submittedOn: form.submittedOn || null, clearedOn: form.clearedOn || null, note: form.note.trim() || null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The customs entry could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Customs entry')} description={t('The declaration that clears the goods. A hold blocks the shipment until it clears; a clearance completes the customs leg when it is the one in hand.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('State')} value={form.state} onChange={set('state')}>
          {CUSTOMS_STATES.map((state) => (
            <option key={state} value={state}>
              {t(CUSTOMS_STATE_LABEL[state])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Broker')} value={form.brokerId} onChange={set('brokerId')}>
          <option value="">{t('Not specified')}</option>
          {brokers.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Entry number')} value={form.entryNumber} onChange={set('entryNumber')} placeholder="IL-2026-77120" className="sm:col-span-2" />
        <TextField label={t('Declared value')} value={form.declaredValue} onChange={set('declaredValue')} inputMode="decimal" />
        <SelectField label={t('Currency')} value={form.declaredCurrency} onChange={set('declaredCurrency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Duties')} value={form.duties} onChange={set('duties')} inputMode="decimal" help={t('As assessed; record the invoice as a cost too.')} />
        <TextField label={t('Taxes')} value={form.taxes} onChange={set('taxes')} inputMode="decimal" />
        <TextField label={t('Submitted')} type="date" value={form.submittedOn} onChange={set('submittedOn')} />
        <TextField label={t('Cleared')} type="date" value={form.clearedOn} onChange={set('clearedOn')} />
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" placeholder={t('Textile declaration query: fibre content certificate requested')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={record.isPending} busyLabel={t('Saving')}>{t('Save entry')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function AllocateDialog({ shipment, kind, open, onClose }: { shipment: ShipmentDetail; kind: 'estimate' | 'final'; open: boolean; onClose: () => void }) {
  const t = useT();
  const allocate = useAllocateCosts();
  const [rules, setRules] = useState<AllocationRules>(defaultAllocationRules(shipment.mode));
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await allocate.mutateAsync({ number: shipment.number, kind, rules });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The allocation could not run.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={kind === 'final' ? t('Finalise landed cost') : t('Estimate landed cost')} description={kind === 'final' ? t('Every cost that lands must be actual. Each lot gets its final landed cost per metre; the run is audited.') : t('Spreads the costs recorded so far, actuals over estimates, so margins are visible before the invoices are in.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {COST_CATEGORIES.map((category) => (
          <SelectField key={category} label={t(COST_CATEGORY_LABEL[category])} value={rules[category]} onChange={(event) => setRules((current) => ({ ...current, [category]: event.target.value as AllocationRules[CostCategory] }))}>
            {ALLOCATION_BASES.map((basis) => (
              <option key={basis} value={basis}>
                {t(ALLOCATION_BASIS_LABEL[basis])}
              </option>
            ))}
          </SelectField>
        ))}
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={allocate.isPending} busyLabel={t('Allocating')}>{kind === 'final' ? t('Finalise') : t('Estimate')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function RunPanel({ runId, enabled }: { runId: string; enabled: boolean }) {
  const t = useT();
  const run = useAllocationRun(runId, enabled);
  const data = run.data;
  if (!enabled) return null;
  if (!data) return <p className="px-5 py-6 text-ink-muted">{run.isPending ? t('Reading the allocation') : t('No allocation yet.')}</p>;
  const categories = COST_CATEGORIES.filter((category) => data.lines.some((line) => line.byCategory[category]));
  return (
    <Ledger caption={`Allocation v${data.version}`}>
      <thead>
        <tr>
          <Th>{t('Lot')}</Th>
          <Th numeric>{t('Metres')}</Th>
          {categories.map((category) => (
            <Th key={category} numeric>
              {t(COST_CATEGORY_LABEL[category])}
            </Th>
          ))}
          <Th numeric>{t('Landed on the lot')}</Th>
          <Th numeric>{t('Purchase /m')}</Th>
          <Th numeric>{t('Landed /m')}</Th>
          <Th numeric>{t('Uplift')}</Th>
        </tr>
      </thead>
      <tbody>
        {data.lines.map((line) => {
          const uplift = upliftBasisPoints(line.purchaseUnitCostBase, line.landedUnitCostBase);
          return (
            <Tr key={line.lineId}>
              <Td>
                <Link to={`/inventory/lots/${line.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  {line.lotNumber}
                </Link>
              </Td>
              <Td numeric>{metres(line.quantity)}</Td>
              {categories.map((category) => (
                <Td key={category} numeric className="text-ink-soft">
                  {line.byCategory[category] ? money(line.byCategory[category]!, data.baseCurrency) : '—'}
                </Td>
              ))}
              <Td numeric>{money(line.allocatedBase, data.baseCurrency)}</Td>
              <Td numeric className="text-ink-soft">{money(line.purchaseUnitCostBase, data.baseCurrency, 4)}</Td>
              <Td numeric className="font-medium">{money(line.landedUnitCostBase, data.baseCurrency, 4)}</Td>
              <Td numeric className={cn(uplift !== null && uplift > 2500 ? 'text-caution' : 'text-ink-soft')}>{uplift === null ? '—' : `${(uplift / 100).toFixed(1)} %`}</Td>
            </Tr>
          );
        })}
        <tr className="bg-bone">
          <Td className="font-medium" colSpan={2 + categories.length}>
            {t('Total landed')} · {t(data.kind === 'final' ? 'Final' : 'Estimate')} v{data.version}
          </Td>
          <Td numeric className="font-medium">
            {money(data.totalBase, data.baseCurrency)}
          </Td>
          <Td colSpan={3} />
        </tr>
      </tbody>
    </Ledger>
  );
}

export function CostsPanel({ shipment }: { shipment: ShipmentDetail }) {
  const t = useT();
  const session = useRequiredSession();
  const landed = canViewCosts(session.role);
  const manage = ['owner', 'operations', 'logistics', 'finance'].includes(session.role);
  const canAllocate = ['owner', 'operations', 'finance'].includes(session.role);
  const costing = useShipmentCosts(shipment.number, true);
  const remove = useRecordShipmentCost();
  const [editing, setEditing] = useState<ShipmentCostView | null | 'new'>(null);
  const [customsOpen, setCustomsOpen] = useState(false);
  const [allocating, setAllocating] = useState<'estimate' | 'final' | null>(null);
  const data = costing.data;
  const costs = data?.costs ?? [];
  const base = data?.runs[0]?.baseCurrency ?? 'USD';
  // What a run would take now: actuals over estimates, recoverable taxes left out.
  const landing = costsForRun(costs, 'estimate').taken;
  const { stillEstimated } = costsForRun(costs, 'final');
  const totalBase = (list: readonly { amountBase: string }[]) => list.reduce((sum, cost) => sum + BigInt(cost.amountBase), 0n).toString();
  const latest = data?.runs[0] ?? null;
  const live = shipment.state === 'booked' || shipment.state === 'closed';

  return (
    <>
      <Panel
        title={t('Costs')}
        count={costs.length}
        flush
        action={
          <span className="flex flex-wrap items-center gap-2">
            {remove.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {remove.error.message}
              </span>
            )}
            {manage && shipment.state !== 'cancelled' && <Button size="sm" variant="primary" onClick={() => setEditing('new')}>{t('Record cost')}</Button>}
          </span>
        }
      >
        {costing.isPending ? (
          <p className="px-5 py-6 text-ink-muted">{t('Loading costs')}</p>
        ) : costs.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No costs yet. Record the freight estimate when the forwarder quotes it; the actuals follow the invoices.')}</p>
        ) : (
          <Ledger caption={`Costs of ${shipment.number}`}>
            <thead>
              <tr>
                <Th>{t('Category')}</Th>
                <Th>{t('Kind')}</Th>
                <Th numeric>{t('Amount')}</Th>
                <Th numeric>{t('In {currency}', { currency: base })}</Th>
                <Th>{t('Vendor')}</Th>
                <Th>{t('Invoice')}</Th>
                <Th>{t('Lands')}</Th>
                {manage && <Th>{t('Actions')}</Th>}
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <Tr key={cost.id}>
                  <Td className="font-medium">
                    {t(COST_CATEGORY_LABEL[cost.category])}
                    {cost.note && <span className="block text-[0.8125rem] font-normal text-ink-muted">{cost.note}</span>}
                  </Td>
                  <Td>
                    <StatusChip tone={COST_KIND_TONE[cost.kind]}>{t(COST_KIND_LABEL[cost.kind])}</StatusChip>
                  </Td>
                  <Td numeric>{money(cost.amount, cost.currency)}</Td>
                  <Td numeric className="text-ink-soft">
                    {money(cost.amountBase, base)}
                    {cost.currency !== base && <span className="code ms-2 text-ink-muted">@{cost.fxRateToBase}</span>}
                  </Td>
                  <Td className="text-ink-soft">{cost.vendorName || '—'}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">
                    {cost.invoiceRef || '—'}
                    {cost.invoiceDate && <span className="ms-2">{dateOrDash(cost.invoiceDate)}</span>}
                  </Td>
                  <Td className="text-ink-soft">{cost.isRecoverable ? t('No, recoverable') : t('Yes')}</Td>
                  {manage && (
                    <Td>
                      <span className="flex gap-1">
                        <Button size="sm" variant="quiet" onClick={() => setEditing(cost)}>{t('Edit')}</Button>
                        <Button size="sm" variant="quiet" onClick={() => remove.mutate({ number: shipment.number, id: cost.id, remove: true })} busy={remove.isPending && remove.variables?.id === cost.id} busyLabel={t('Removing')}>{t('Remove')}</Button>
                      </span>
                    </Td>
                  )}
                </Tr>
              ))}
              <tr className="bg-bone">
                <Td className="font-medium" colSpan={3}>
                  {t('Lands on the goods')}
                  {stillEstimated.length > 0 && <span className="ms-3 font-normal text-ink-muted">{t('still estimated: {categories}', { categories: stillEstimated.map((category) => t(COST_CATEGORY_LABEL[category]).toLowerCase()).join(', ') })}</span>}
                </Td>
                <Td numeric className="font-medium">
                  {money(totalBase(landing), base)}
                </Td>
                <Td colSpan={manage ? 4 : 3} />
              </tr>
            </tbody>
          </Ledger>
        )}
      </Panel>

      <Panel title={t('Customs')} action={manage && live && <Button size="sm" onClick={() => setCustomsOpen(true)}>{data?.customs ? t('Update entry') : t('Record entry')}</Button>}>
        {!data?.customs ? (
          <p className="text-ink-muted">{t('No customs entry yet. Record it when the broker files the declaration.')}</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="caps text-ink-muted">{t('State')}</dt>
              <dd className="mt-1">
                <StatusChip tone={CUSTOMS_STATE_TONE[data.customs.state]}>{t(CUSTOMS_STATE_LABEL[data.customs.state])}</StatusChip>
              </dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Entry')}</dt>
              <dd className="code mt-1">{data.customs.entryNumber || '—'}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Broker')}</dt>
              <dd className="mt-1">{data.customs.brokerName || '—'}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Declared value')}</dt>
              <dd className="mt-1">{data.customs.declaredValue ? money(data.customs.declaredValue, data.customs.declaredCurrency || base) : '—'}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Duties and taxes')}</dt>
              <dd className="mt-1">
                {data.customs.duties ? money(data.customs.duties, data.customs.declaredCurrency || base) : '—'} · {data.customs.taxes ? money(data.customs.taxes, data.customs.declaredCurrency || base) : '—'}
              </dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Dates')}</dt>
              <dd className="code mt-1">
                {dateOrDash(data.customs.submittedOn)} → {dateOrDash(data.customs.clearedOn)}
              </dd>
            </div>
            {data.customs.note && <p className="text-[0.8125rem] text-ink-soft sm:col-span-3">{data.customs.note}</p>}
          </dl>
        )}
      </Panel>

      {landed && (
        <Panel
          title={t('Landed cost')}
          count={data?.runs.length}
          flush
          action={
            canAllocate &&
            live && (
              <span className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setAllocating('estimate')} disabled={landing.length === 0}>{t('Estimate')}</Button>
                <Button size="sm" variant="primary" onClick={() => setAllocating('final')} disabled={landing.length === 0 || stillEstimated.length > 0}>{t('Finalise')}</Button>
              </span>
            )
          }
        >
          {latest ? (
            <>
              <p className="border-b border-line px-5 py-3 text-[0.8125rem] text-ink-muted">
                {t(latest.kind === 'final' ? 'Final' : 'Estimate')} v{latest.version} · {dateOrDash(latest.performedAt.slice(0, 10))} · {Object.entries(latest.rules).map(([category, basis]) => `${t(COST_CATEGORY_LABEL[category as CostCategory]).toLowerCase()} ${t(ALLOCATION_BASIS_LABEL[basis]).toLowerCase()}`).join(', ')}
              </p>
              <RunPanel runId={latest.id} enabled={landed} />
            </>
          ) : (
            <p className="px-5 py-6 text-ink-muted">{t('No allocation yet. Estimate once the costs are quoted; finalise when every invoice is in.')}</p>
          )}
        </Panel>
      )}

      {manage && <CostDialog key={editing === null ? 'cost-closed' : editing === 'new' ? 'cost-new' : `cost-${editing.id}`} shipment={shipment} cost={editing === 'new' ? null : editing} open={editing !== null} onClose={() => setEditing(null)} />}
      {manage && <CustomsDialog key={customsOpen ? 'customs-open' : 'customs-closed'} shipment={shipment} current={data?.customs ?? null} open={customsOpen} onClose={() => setCustomsOpen(false)} />}
      {canAllocate && <AllocateDialog key={allocating ?? 'allocate-closed'} shipment={shipment} kind={allocating ?? 'estimate'} open={allocating !== null} onClose={() => setAllocating(null)} />}
    </>
  );
}
