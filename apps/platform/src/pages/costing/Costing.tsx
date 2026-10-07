import { COST_CATEGORIES, COST_CATEGORY_LABEL, canViewCosts, formatLocalDate, formatMoney, formatQuantity, moneyFromStored, quantityFromStored, todayIn, upliftBasisPoints, type LocalDate } from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { useFxRates, useLotCosts, useSetFxRate } from '../../data/costing';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 13 Costing: every lot's landed cost per metre, and the rates that
// carry foreign amounts into the base currency. Price lists and margins
// join with orders.

const money = (stored: string, currency: string, digits = 2) => formatMoney(moneyFromStored(stored, currency), digits);
const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const CURRENCIES = ['USD', 'EUR', 'CNY', 'ILS', 'GBP', 'CHF'];

export function CostingTabs({ active }: { active: 'landed' | 'fx' }) {
  const t = useT();
  const session = useRequiredSession();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Costing sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {canViewCosts(session.role) && tab('landed', '/costing', t('Landed cost'))}
      {tab('fx', '/costing/fx', t('FX rates'))}
    </nav>
  );
}

export function LandedCost() {
  const t = useT();
  const session = useRequiredSession();
  const allowed = canViewCosts(session.role);
  const costs = useLotCosts(allowed);
  const rows = costs.data ?? [];
  const categories = COST_CATEGORIES.filter((category) => rows.some((row) => row.allocated[category]));
  return (
    <>
      <ModuleTitle number="13" title={t('Costing')}>
        {t('What every lot cost to land, per metre: the purchase price plus what its shipment cost, spread by value, volume or weight.')}
      </ModuleTitle>
      <CostingTabs active="landed" />
      <div className="px-5 py-6 lg:px-8">
        {!allowed ? (
          <EmptyState title={t('Landed cost is for the cost roles')}>{t('Purchase prices and landed costs are a data rule: this role receives shipment costs only.')}</EmptyState>
        ) : (
          <Panel title={t('Landed cost by lot')} count={rows.length} flush>
            {costs.isPending ? (
              <p className="px-5 py-8 text-ink-muted">{t('Loading landed costs')}</p>
            ) : rows.length === 0 ? (
              <div className="p-5">
                <EmptyState title={t('No landed costs yet')}>{t('A lot gets its landed cost when its shipment\'s costs are allocated: an estimate when booked, final when the invoices are in.')}</EmptyState>
              </div>
            ) : (
              <Ledger caption={t('Landed cost by lot')}>
                <thead>
                  <tr>
                    <Th>{t('Lot')}</Th>
                    <Th>{t('Product')}</Th>
                    <Th>{t('Shipment')}</Th>
                    <Th numeric>{t('Metres')}</Th>
                    <Th numeric>{t('Purchase /m')}</Th>
                    {categories.map((category) => (
                      <Th key={category} numeric>
                        {t(COST_CATEGORY_LABEL[category])}
                      </Th>
                    ))}
                    <Th numeric>{t('Landed /m')}</Th>
                    <Th numeric>{t('Uplift')}</Th>
                    <Th>{t('State')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const uplift = upliftBasisPoints(row.purchaseUnitCost, row.landedUnitCost);
                    return (
                      <Tr key={row.id}>
                        <Td>
                          <Link to={`/inventory/lots/${row.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {row.lotNumber}
                          </Link>
                        </Td>
                        <Td className="whitespace-nowrap">
                          <span className="font-medium">{row.productName}</span> <span className="text-ink-muted">{row.shadeName}</span>
                          <span className="code block text-ink-muted">{row.skuCode}</span>
                        </Td>
                        <Td>
                          {row.shipmentNumber ? (
                            <Link to={`/logistics/shipments/${row.shipmentNumber}/costs`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                              {row.shipmentNumber}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </Td>
                        <Td numeric>{metres(row.quantity)}</Td>
                        <Td numeric className="text-ink-soft">{money(row.purchaseUnitCost, row.currency, 4)}</Td>
                        {categories.map((category) => (
                          <Td key={category} numeric className="text-ink-soft">
                            {row.allocated[category] ? money(row.allocated[category]!, row.currency) : '—'}
                          </Td>
                        ))}
                        <Td numeric className="font-medium">{money(row.landedUnitCost, row.currency, 4)}</Td>
                        <Td numeric className={cn(uplift !== null && uplift > 2500 ? 'text-caution' : 'text-ink-soft')}>{uplift === null ? '—' : `${(uplift / 100).toFixed(1)} %`}</Td>
                        <Td>
                          <StatusChip tone={row.isFinal ? 'positive' : 'neutral'}>{row.isFinal ? t('Final') : t('Estimate')}</StatusChip>
                          <span className="code ms-2 text-ink-muted">v{row.version}</span>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

function FxDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const set_ = useSetFxRate();
  const [form, setForm] = useState({ base: 'USD', quote: 'EUR', rateDate: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string, rate: '', source: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^\d+(\.\d{1,8})?$/.test(form.rate.trim())) return setError(t('A rate with up to eight decimals, like 1.0850.'));
    try {
      await set_.mutateAsync({ base: form.base, quote: form.quote, rateDate: form.rateDate, rate: form.rate.trim(), source: form.source.trim() || undefined });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The rate could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Record rate')} description={t('One unit of the quoted currency in the base currency on that day. Costs recorded in that currency use the latest rate on or before their invoice date.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Quoted currency')} value={form.quote} onChange={set('quote')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Base currency')} value={form.base} onChange={set('base')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Rate')} required value={form.rate} onChange={set('rate')} placeholder="1.0850" inputMode="decimal" help={t('{quote} 1 = {base} …', { quote: form.quote, base: form.base })} />
        <TextField label={t('Date')} type="date" required value={form.rateDate} onChange={set('rateDate')} />
        <TextField label={t('Source')} value={form.source} onChange={set('source')} placeholder={t('ECB, bank, invoice')} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={set_.isPending} busyLabel={t('Saving')}>{t('Save rate')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function FxRates() {
  const t = useT();
  const session = useRequiredSession();
  const rates = useFxRates();
  const [adding, setAdding] = useState(false);
  const manage = ['owner', 'operations', 'logistics', 'finance'].includes(session.role);
  const rows = rates.data ?? [];
  return (
    <>
      <ModuleTitle
        number="13"
        title={t('Costing')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('Record rate')}
            </Button>
          )
        }
      >
        {t('The rates that carry foreign invoices into the base currency, by day. Recorded by hand until a rate feed is connected.')}
      </ModuleTitle>
      <CostingTabs active="fx" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('FX rates')} count={rows.length} flush>
          {rates.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading rates')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No rates yet')} action={manage ? <Button variant="primary" onClick={() => setAdding(true)}>{t('Record rate')}</Button> : undefined}>{t('A cost in a foreign currency needs a rate on or before its invoice date.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('FX rates')}>
              <thead>
                <tr>
                  <Th>{t('Date')}</Th>
                  <Th>{t('Pair')}</Th>
                  <Th numeric>{t('Rate')}</Th>
                  <Th>{t('Source')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rate) => (
                  <Tr key={rate.id}>
                    <Td className="code whitespace-nowrap">{formatLocalDate(rate.rateDate as LocalDate)}</Td>
                    <Td className="code">
                      {rate.quote}/{rate.base}
                    </Td>
                    <Td numeric className="font-medium">{rate.rate}</Td>
                    <Td className="text-ink-soft">{rate.source || '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <FxDialog key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />}
    </>
  );
}
