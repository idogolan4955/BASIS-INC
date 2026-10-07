import {
  FULFILMENT_LABEL,
  FULFILMENT_TONE,
  MONEY_DECIMALS,
  ORDER_STATE_LABEL,
  ORDER_STATE_TONE,
  QUANTITY_DECIMALS,
  QUOTE_STATE_LABEL,
  QUOTE_STATE_TONE,
  addDays,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  lineTotal,
  moneyFromStored,
  parseFixed,
  quantityFromStored,
  todayIn,
  type LocalDate,
} from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Meter, Panel, SelectField, ShadeDot, StatusChip, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus, X } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useSkus } from '../../data/catalog';
import { useCreateSalesOrder, useQuotes, useSaveQuote, useSalesOrders } from '../../data/commercial';
import { useCompanies } from '../../data/parties';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 08 Orders: quotes and sales orders. Where an order stands between
// confirmation and delivery follows from its allocations and shipments.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency));
const short = (date: LocalDate | null) => (date ? formatLocalDate(date) : '—');
const CURRENCIES = ['EUR', 'USD', 'GBP', 'ILS', 'CHF'];
const INCOTERMS = ['EXW', 'FCA', 'DAP', 'DDP'];

export function OrdersTabs({ active }: { active: 'orders' | 'quotes' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Orders sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('orders', '/orders', t('Sales orders'))}
      {tab('quotes', '/orders/quotes', t('Quotes'))}
    </nav>
  );
}

interface LineDraft {
  skuCode: string;
  quantity: string;
  unitPrice: string;
  leadTimeDays: string;
}

/** The lines of a quote or an order: SKU, metres, price per metre. */
export function LinesEditor({ lines, onChange, currency, withLead }: { lines: LineDraft[]; onChange: (lines: LineDraft[]) => void; currency: string; withLead?: boolean }) {
  const t = useT();
  const skus = useSkus();
  const options = (skus.data ?? []).filter((sku) => sku.status !== 'discontinued');
  const setLine = (index: number, key: keyof LineDraft, value: string) => onChange(lines.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  return (
    <fieldset className="border-t border-line pt-4 sm:col-span-3">
      <legend className="caps mb-3 text-ink-soft">{t('Lines')}</legend>
      <div className="space-y-3">
        {lines.map((line, index) => {
          const sku = options.find((candidate) => candidate.code === line.skuCode);
          return (
            <div key={index} className={cn('grid items-end gap-3', withLead ? 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_2.5rem]' : 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem]')}>
              <SelectField label={`SKU ${index + 1}`} required value={line.skuCode} onChange={(event) => setLine(index, 'skuCode', event.target.value)}>
                <option value="">{t('Choose a SKU')}</option>
                {options.map((candidate) => (
                  <option key={candidate.code} value={candidate.code}>
                    {candidate.code} · {candidate.productName}, {candidate.shadeName}
                  </option>
                ))}
              </SelectField>
              <TextField label={t('Quantity')} required unit="m" value={line.quantity} onChange={(event) => setLine(index, 'quantity', event.target.value)} placeholder="1200" inputMode="decimal" />
              <TextField label={t('Price per metre')} required unit={currency} value={line.unitPrice} onChange={(event) => setLine(index, 'unitPrice', event.target.value)} placeholder="6.80" inputMode="decimal" />
              {withLead && <TextField label={t('Lead')} type="number" unit="d" value={line.leadTimeDays} onChange={(event) => setLine(index, 'leadTimeDays', event.target.value)} />}
              <button type="button" aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, i) => i !== index))} className="grid h-10 place-items-center rounded-xs text-ink-muted hover:bg-sunken hover:text-ink disabled:opacity-40">
                <X size={16} aria-hidden="true" />
              </button>
              {sku && (
                <p className="flex items-center gap-2 text-[0.8125rem] text-ink-muted sm:col-span-full">
                  <ShadeDot hex={sku.shadeHex} name={sku.shadeName} code={sku.shadeCode} size="sm" />
                  {sku.productName}, {sku.variantName}, {sku.shadeName}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <Button size="sm" className="mt-3" onClick={() => onChange([...lines, { skuCode: '', quantity: '', unitPrice: '', leadTimeDays: '' }])}>
        <Plus size={14} aria-hidden="true" />
        {t('Add line')}
      </Button>
    </fieldset>
  );
}

export function parseLines(lines: LineDraft[], t: (text: string, values?: Record<string, string | number>) => string): { skuCode: string; quantity: string; unitPrice: string; leadTimeDays?: number }[] {
  return lines.map((line, index) => {
    if (!line.skuCode) throw new Error(t('Line {n}: choose the SKU.', { n: index + 1 }));
    try {
      const quantity = parseFixed(line.quantity, QUANTITY_DECIMALS);
      const unitPrice = parseFixed(line.unitPrice, MONEY_DECIMALS);
      if (quantity <= 0n) throw new Error('zero');
      return { skuCode: line.skuCode, quantity: quantity.toString(), unitPrice: unitPrice.toString(), ...(line.leadTimeDays ? { leadTimeDays: Number(line.leadTimeDays) } : {}) };
    } catch {
      throw new Error(t('Line {n}: metres (up to 3 decimals) and a price per metre (up to 4).', { n: index + 1 }));
    }
  });
}

export function CustomerSelect({ value, onChange, className }: { value: string; onChange: (id: string) => void; className?: string }) {
  const t = useT();
  const companies = useCompanies();
  const customers = (companies.data ?? []).filter((company) => company.roles.includes('customer') || company.roles.length === 0);
  return (
    <SelectField label={t('Customer')} required value={value} onChange={(event) => onChange(event.target.value)} className={className}>
      <option value="">{t('Choose a customer')}</option>
      {customers.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
          {company.countryName ? ` · ${company.countryName}` : ''}
        </option>
      ))}
    </SelectField>
  );
}

export function NewQuoteDialog({ open, onClose, customerId: presetCustomer = '' }: { open: boolean; onClose: () => void; customerId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const save = useSaveQuote();
  const [form, setForm] = useState({ customerId: presetCustomer, currency: 'EUR', incotermCode: 'DAP', namedPlace: '', paymentTerms: '30 days', validUntil: addDays(todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone), 30) as string, notes: '' });
  const [lines, setLines] = useState<LineDraft[]>([{ skuCode: '', quantity: '', unitPrice: '', leadTimeDays: '' }]);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.customerId) return setError(t('Choose the customer.'));
    try {
      const parsed = parseLines(lines, t);
      const { number } = await save.mutateAsync({ customerId: form.customerId, currency: form.currency, incotermCode: form.incotermCode || undefined, namedPlace: form.namedPlace.trim() || undefined, paymentTerms: form.paymentTerms.trim() || undefined, validUntil: form.validUntil || undefined, notes: form.notes.trim() || undefined, lines: parsed });
      onClose();
      navigate(`/orders/quotes/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The quote could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('New quote')} description={t('An offer with its lines and terms. Send it, and when the customer accepts, the sales order opens from it.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <CustomerSelect value={form.customerId} onChange={(id) => setForm((f) => ({ ...f, customerId: id }))} className="sm:col-span-2" />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Incoterm')} value={form.incotermCode} onChange={set('incotermCode')}>
          {INCOTERMS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Named place')} value={form.namedPlace} onChange={set('namedPlace')} placeholder={t('Paris')} />
        <TextField label={t('Valid until')} type="date" value={form.validUntil} onChange={set('validUntil')} />
        <TextField label={t('Payment terms')} value={form.paymentTerms} onChange={set('paymentTerms')} className="sm:col-span-3" />
        <LinesEditor lines={lines} onChange={setLines} currency={form.currency} withLead />
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} rows={2} className="sm:col-span-3" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save draft')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function NewOrderDialog({ open, onClose, customerId: presetCustomer = '' }: { open: boolean; onClose: () => void; customerId?: string }) {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateSalesOrder();
  const [form, setForm] = useState({ customerId: presetCustomer, currency: 'EUR', incotermCode: 'DAP', namedPlace: '', paymentTerms: '30 days', requestedDelivery: '', shipToName: '', shipToAddress: '', notes: '' });
  const [lines, setLines] = useState<LineDraft[]>([{ skuCode: '', quantity: '', unitPrice: '', leadTimeDays: '' }]);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.customerId) return setError(t('Choose the customer.'));
    try {
      const parsed = parseLines(lines, t);
      const { number } = await create.mutateAsync({ customerId: form.customerId, currency: form.currency, incotermCode: form.incotermCode || undefined, namedPlace: form.namedPlace.trim() || undefined, paymentTerms: form.paymentTerms.trim() || undefined, requestedDelivery: form.requestedDelivery || undefined, shipToName: form.shipToName.trim() || undefined, shipToAddress: form.shipToAddress.trim() || undefined, notes: form.notes.trim() || undefined, lines: parsed, confirm: true });
      onClose();
      navigate(`/orders/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The order could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('New sales order')} description={t('An order taken without a quote: a repeat order, or one agreed on the phone. Confirmed as soon as it is saved.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <CustomerSelect value={form.customerId} onChange={(id) => setForm((f) => ({ ...f, customerId: id }))} className="sm:col-span-2" />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Incoterm')} value={form.incotermCode} onChange={set('incotermCode')}>
          {INCOTERMS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Named place')} value={form.namedPlace} onChange={set('namedPlace')} />
        <TextField label={t('Requested delivery')} type="date" value={form.requestedDelivery} onChange={set('requestedDelivery')} />
        <TextField label={t('Payment terms')} value={form.paymentTerms} onChange={set('paymentTerms')} />
        <TextField label={t('Ship to')} value={form.shipToName} onChange={set('shipToName')} placeholder={t('Maison Avelline atelier')} className="sm:col-span-2" />
        <TextArea label={t('Delivery address')} value={form.shipToAddress} onChange={set('shipToAddress')} rows={2} className="sm:col-span-3" />
        <LinesEditor lines={lines} onChange={setLines} currency={form.currency} />
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} rows={2} className="sm:col-span-3" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Confirm order')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

const STAGE_ORDER = { awaiting_stock: 0, partly_allocated: 1, allocated: 2, shipped: 3, delivered: 4 } as const;

export function SalesOrders() {
  const t = useT();
  const session = useRequiredSession();
  const orders = useSalesOrders();
  const [creating, setCreating] = useState(false);
  const manage = ['owner', 'operations', 'sales'].includes(session.role);
  const rows = orders.data ?? [];
  const open = rows.filter((order) => order.state === 'confirmed' || order.state === 'draft');
  const sorted = [...rows].sort((a, b) => (a.state === 'confirmed' ? 0 : a.state === 'draft' ? 1 : a.state === 'shipped' ? 2 : 3) - (b.state === 'confirmed' ? 0 : b.state === 'draft' ? 1 : b.state === 'shipped' ? 2 : 3) || STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || (a.requestedDelivery ?? '9').localeCompare(b.requestedDelivery ?? '9'));
  return (
    <>
      <ModuleTitle
        number="08"
        title={t('Orders')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('New sales order')}
            </Button>
          )
        }
      >
        {t('What customers ordered and where each order stands: stock held, shipped, delivered. Nothing here is set by hand.')}
      </ModuleTitle>
      <OrdersTabs active="orders" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Sales orders')} count={open.length} flush>
          {orders.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading orders')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No orders yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New sales order')}</Button> : undefined}>{t('An order opens from an accepted quote or is taken directly. Stock is held for it, then shipped.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Sales orders')}>
              <thead>
                <tr>
                  <Th>{t('Order')}</Th>
                  <Th>{t('Customer')}</Th>
                  <Th>{t('Fabric')}</Th>
                  <Th numeric>{t('Total')}</Th>
                  <Th>{t('Requested')}</Th>
                  <Th>{t('Fulfilment')}</Th>
                  <Th>{t('Shipment')}</Th>
                  <Th>{t('State')}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((order) => (
                  <Tr key={order.id}>
                    <Td>
                      <Link to={`/orders/${order.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {order.number}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">
                      <Link to={`/customers/${order.customerId}`} className="hover:underline">
                        {order.customerName}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">{order.products.join(', ')}</Td>
                    <Td numeric>{money(order.total, order.currency)}</Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{short(order.requestedDelivery)}</Td>
                    <Td>
                      <span className="flex items-center gap-3">
                        <Meter value={order.progress} className="w-16" />
                        <StatusChip tone={FULFILMENT_TONE[order.stage]}>{t(FULFILMENT_LABEL[order.stage])}</StatusChip>
                      </span>
                    </Td>
                    <Td>
                      {order.shipmentNumbers.length === 0 ? (
                        <span className="text-ink-muted">—</span>
                      ) : (
                        order.shipmentNumbers.map((number) => (
                          <Link key={number} to={`/logistics/shipments/${number}`} className="code me-2 underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {number}
                          </Link>
                        ))
                      )}
                    </Td>
                    <Td>
                      <StatusChip tone={ORDER_STATE_TONE[order.state]}>{t(ORDER_STATE_LABEL[order.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <NewOrderDialog key={creating ? 'open' : 'closed'} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

export function Quotes() {
  const t = useT();
  const session = useRequiredSession();
  const quotes = useQuotes();
  const [creating, setCreating] = useState(false);
  const manage = ['owner', 'operations', 'sales'].includes(session.role);
  const rows = quotes.data ?? [];
  const order = { sent: 0, draft: 1, accepted: 2, declined: 3, expired: 4 } as const;
  const sorted = [...rows].sort((a, b) => order[a.state] - order[b.state] || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <ModuleTitle
        number="08"
        title={t('Orders')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              {t('New quote')}
            </Button>
          )
        }
      >
        {t('Offers out, waiting for an answer; an accepted quote becomes the order.')}
      </ModuleTitle>
      <OrdersTabs active="quotes" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Quotes')} count={rows.filter((quote) => quote.state === 'sent' || quote.state === 'draft').length} flush>
          {quotes.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading quotes')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No quotes yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New quote')}</Button> : undefined}>{t('A quote is an offer with lines and terms; sent, then accepted or declined.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Quotes')}>
              <thead>
                <tr>
                  <Th>{t('Quote')}</Th>
                  <Th>{t('Customer')}</Th>
                  <Th>{t('Fabric')}</Th>
                  <Th numeric>{t('Total')}</Th>
                  <Th>{t('Valid until')}</Th>
                  <Th>{t('Order')}</Th>
                  <Th>{t('State')}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((quote) => (
                  <Tr key={quote.id}>
                    <Td>
                      <Link to={`/orders/quotes/${quote.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {quote.number}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">{quote.customerName}</Td>
                    <Td className="text-ink-soft">{quote.products.join(', ')}</Td>
                    <Td numeric>{money(quote.total, quote.currency)}</Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{short(quote.validUntil)}</Td>
                    <Td>
                      {quote.orderNumber ? (
                        <Link to={`/orders/${quote.orderNumber}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {quote.orderNumber}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <StatusChip tone={QUOTE_STATE_TONE[quote.state]}>{t(QUOTE_STATE_LABEL[quote.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <NewQuoteDialog key={creating ? 'open' : 'closed'} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

export { lineTotal, metres, money };
