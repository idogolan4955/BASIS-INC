import {
  FULFILMENT_LABEL,
  FULFILMENT_TONE,
  MONEY_DECIMALS,
  ORDER_STATE_LABEL,
  ORDER_STATE_TONE,
  canViewCosts,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  lineTotal,
  moneyFromStored,
  orderMargin,
  parseFixed,
  quantityFromStored,
  suggestAllocation,
  todayIn,
  type SalesOrderDetail,
} from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Meter, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, cn, sheetTabClass } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useAllocateSalesOrder, useRecordInvoice, useSalesOrder, useShipSalesOrder, useStockForSku, useTransitionSalesOrder } from '../../data/commercial';
import { useLotCosts } from '../../data/costing';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';

// The sales order sheet: lines with the stock held for each, the shipment
// that took it, invoices, and, for the cost roles, what the order earns over
// landed cost.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const money = (stored: string, currency: string, digits = 2) => formatMoney(moneyFromStored(stored, currency), digits);
const short = (date: string | null) => (date ? formatLocalDate(date as never) : '—');

function AllocationPreview({ line }: { line: SalesOrderDetail['lines'][number] }) {
  const t = useT();
  const stock = useStockForSku(line.skuCode, true);
  const need = (BigInt(line.quantity) - BigInt(line.shipped)).toString();
  const suggestion = stock.data ? suggestAllocation(need, stock.data) : null;
  if (!suggestion) return <p className="text-[0.8125rem] text-ink-muted">{t('Looking at stock')}</p>;
  return (
    <p className="text-[0.8125rem] text-ink-soft">
      {suggestion.plan.length === 0 ? t('Nothing in stock for this SKU.') : suggestion.plan.map((entry) => `${entry.rollNumber ? entry.rollNumber.slice(-7) : entry.lotNumber} ${metres(entry.quantity)}`).join(' · ')}
      {suggestion.short !== '0' && <span className="ms-2 text-caution">{t('{metres} short', { metres: metres(suggestion.short) })}</span>}
    </p>
  );
}

function AllocateDialog({ order, open, onClose }: { order: SalesOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const allocate = useAllocateSalesOrder();
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await allocate.mutateAsync({ number: order.number });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Stock could not be held.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Hold stock')} description={t('The oldest lot first, whole rolls, one roll cut for the remainder. What is held here is not free for other orders.')}>
      <form onSubmit={submit} className="grid gap-4">
        <ul className="divide-y divide-line">
          {order.lines.map((line) => (
            <li key={line.id} className="py-3 first:pt-0 last:pb-0">
              <p className="flex items-center gap-2.5 font-medium">
                <ShadeDot hex={line.shadeHex} name={line.shadeName} code={line.shadeCode} size="sm" />
                {line.productName}, {line.shadeName}
                <span className="code font-normal text-ink-muted">{metres((BigInt(line.quantity) - BigInt(line.shipped)).toString())}</span>
              </p>
              <AllocationPreview line={line} />
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={allocate.isPending} busyLabel={t('Holding')}>{t('Hold stock')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ShipDialog({ order, open, onClose }: { order: SalesOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const ship = useShipSalesOrder();
  const [form, setForm] = useState({ mode: 'courier' as 'courier' | 'air' | 'sea' | 'road', departure: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string, carrier: '', tracking: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const held = order.lines.reduce((sum, line) => sum + BigInt(line.allocated), 0n).toString();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await ship.mutateAsync({ number: order.number, mode: form.mode, departure: form.departure || undefined, carrier: form.carrier.trim() || undefined, tracking: form.tracking.trim() || undefined, note: form.note.trim() || undefined });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The order could not be shipped.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Ship {metres}', { metres: metres(held) })} description={t('The stock held leaves the warehouse on an outbound shipment to the customer; each roll is a line in the ledger.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Mode')} value={form.mode} onChange={set('mode')}>
          <option value="courier">{t('Courier')}</option>
          <option value="air">{t('Air')}</option>
          <option value="road">{t('Road')}</option>
          <option value="sea">{t('Sea')}</option>
        </SelectField>
        <TextField label={t('Departure')} type="date" value={form.departure} onChange={set('departure')} />
        <TextField label={t('Carrier')} value={form.carrier} onChange={set('carrier')} placeholder="DHL Express" />
        <TextField label={t('Tracking')} value={form.tracking} onChange={set('tracking')} placeholder="7731 0092 4410" />
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={ship.isPending} busyLabel={t('Shipping')}>{t('Ship')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function InvoiceDialog({ order, open, onClose }: { order: SalesOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const record = useRecordInvoice();
  const [form, setForm] = useState({ invoiceNumber: '', amount: (Number(order.total) / 10000).toString(), issuedOn: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string, dueOn: '', paidOn: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await record.mutateAsync({ number: order.number, invoiceNumber: form.invoiceNumber.trim(), amount: parseFixed(form.amount, MONEY_DECIMALS).toString(), issuedOn: form.issuedOn || undefined, dueOn: form.dueOn || undefined, paidOn: form.paidOn || null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The invoice could not be recorded.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Invoice')} description={t('A pointer to the invoice in the accounting system, and when it was paid. Recording the same number again updates it.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Invoice number')} required value={form.invoiceNumber} onChange={set('invoiceNumber')} placeholder="INV-2026-0107" />
        <TextField label={t('Amount')} required unit={order.currency} value={form.amount} onChange={set('amount')} inputMode="decimal" />
        <TextField label={t('Issued')} type="date" value={form.issuedOn} onChange={set('issuedOn')} />
        <TextField label={t('Due')} type="date" value={form.dueOn} onChange={set('dueOn')} />
        <TextField label={t('Paid')} type="date" value={form.paidOn} onChange={set('paidOn')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={record.isPending} busyLabel={t('Saving')}>{t('Save invoice')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function MarginPanel({ order }: { order: SalesOrderDetail }) {
  const t = useT();
  const lotCosts = useLotCosts(true);
  const landed = new Map((lotCosts.data ?? []).map((cost) => [cost.lotNumber, cost.landedUnitCost]));
  const allocations = order.lines.flatMap((line) => line.allocations.map((allocation) => ({ lineId: line.id, lotNumber: allocation.lotNumber, quantity: allocation.quantity })));
  const margin = orderMargin(order.lines, allocations, landed);
  const costCurrency = lotCosts.data?.[0]?.currency ?? 'USD';
  return (
    <Panel title={t('Margin over landed cost')}>
      {allocations.length === 0 ? (
        <p className="text-ink-muted">{t('Margin is known once stock is held: each allocated metre at its lot\'s landed cost against the line price.')}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="caps text-ink-muted">{t('Revenue')}</dt>
            <dd className="mt-1 font-display text-[1.5rem] leading-none">{money(margin.revenue, order.currency)}</dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">{t('Landed cost')}</dt>
            <dd className="mt-1 font-display text-[1.5rem] leading-none">{money(margin.cost, costCurrency)}</dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">{t('Margin')}</dt>
            <dd className={cn('mt-1 font-display text-[1.5rem] leading-none', margin.marginBasisPoints !== null && margin.marginBasisPoints < 2000 && 'text-caution')}>{margin.marginBasisPoints === null ? '—' : `${(margin.marginBasisPoints / 100).toFixed(1)} %`}</dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">{t('Not yet costed')}</dt>
            <dd className="mt-1 font-display text-[1.5rem] leading-none">{margin.uncostedMetres === '0' ? '—' : metres(margin.uncostedMetres)}</dd>
          </div>
          {order.currency !== costCurrency && <p className="text-[0.8125rem] text-ink-muted sm:col-span-4">{t('Revenue in {sale}, landed cost in {base}; the margin compares them at face value until a rate is applied.', { sale: order.currency, base: costCurrency })}</p>}
        </dl>
      )}
    </Panel>
  );
}

export function OrderSheet({ tab }: { tab: 'lines' | 'invoices' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const order = useSalesOrder(number);
  const transition = useTransitionSalesOrder();
  const timeline = useTimeline('sales_order', number);
  const note = useRecordNote('sales_order', number);
  const [allocating, setAllocating] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sales = ['owner', 'operations', 'sales'].includes(session.role);
  const fulfil = ['owner', 'operations', 'logistics', 'sales'].includes(session.role);
  const finance = ['owner', 'operations', 'sales', 'finance'].includes(session.role);
  const costs = canViewCosts(session.role);

  if (order.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading order')}</p>;
  if (order.error) return <p className="px-5 py-10 text-critical lg:px-8">The order could not be loaded. {order.error.message}</p>;
  if (!order.data) return <NotFound what={t('sales order')} />;
  const data = order.data;
  const base = `/orders/${data.number}`;
  const held = data.lines.reduce((sum, line) => sum + BigInt(line.allocated), 0n);
  const act = async (to: 'confirmed' | 'cancelled' | 'closed') => {
    setError(null);
    try {
      await transition.mutateAsync({ number: data.number, to });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The order could not be moved.'));
    }
  };

  return (
    <>
      <LabelHeader
        code={data.number}
        title={data.customerName}
        subtitle={
          <>
            <Link to={`/customers/${data.customerId}`} className="underline decoration-line-strong underline-offset-4">
              {t('Customer')}
            </Link>
            {data.quoteNumber && (
              <>
                {' · '}
                <Link to={`/orders/quotes/${data.quoteNumber}`} className="code underline decoration-line-strong underline-offset-4">
                  {data.quoteNumber}
                </Link>
              </>
            )}
            {data.incoterm ? ` · ${[data.incoterm, data.namedPlace].filter(Boolean).join(' ')}` : ''}
            {data.paymentTerms ? ` · ${data.paymentTerms}` : ''}
            {data.shipToName ? ` · ${t('to')} ${data.shipToName}` : ''}
          </>
        }
        status={
          <>
            <StatusChip tone={ORDER_STATE_TONE[data.state]}>{t(ORDER_STATE_LABEL[data.state])}</StatusChip>
            {data.state !== 'draft' && data.state !== 'cancelled' && <StatusChip tone={FULFILMENT_TONE[data.stage]}>{t(FULFILMENT_LABEL[data.stage])}</StatusChip>}
            {data.shipmentNumbers.map((shipment) => (
              <Link key={shipment} to={`/logistics/shipments/${shipment}`} className="code underline decoration-line-strong underline-offset-4">
                {shipment}
              </Link>
            ))}
            {error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {error}
              </span>
            )}
          </>
        }
        facts={[
          { label: t('Total'), value: money(data.total, data.currency) },
          { label: t('Metres'), value: metres(data.lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n).toString()) },
          { label: t('Held'), value: metres(held.toString()) },
          { label: t('Shipped'), value: metres(data.lines.reduce((sum, line) => sum + BigInt(line.shipped), 0n).toString()) },
          { label: t('Requested'), value: short(data.requestedDelivery) },
          { label: t('Fulfilment'), value: <Meter value={data.progress} /> },
        ]}
        actions={
          <>
            {sales && data.state === 'draft' && (
              <Button variant="primary" onClick={() => act('confirmed')} busy={transition.isPending} busyLabel={t('Saving')}>
                {t('Confirm')}
              </Button>
            )}
            {fulfil && data.state === 'confirmed' && <Button variant={held === 0n ? 'primary' : undefined} onClick={() => setAllocating(true)}>{held === 0n ? t('Hold stock') : t('Hold again')}</Button>}
            {fulfil && data.state === 'confirmed' && held > 0n && <Button variant="primary" onClick={() => setShipping(true)}>{t('Ship')}</Button>}
            {finance && (data.state === 'shipped' || data.state === 'confirmed' || data.state === 'closed') && <Button onClick={() => setInvoicing(true)}>{t('Invoice')}</Button>}
            {sales && data.state === 'shipped' && (
              <Button onClick={() => act('closed')} busy={transition.isPending} busyLabel={t('Saving')}>
                {t('Close')}
              </Button>
            )}
            {sales && (data.state === 'draft' || data.state === 'confirmed') && (
              <Button onClick={() => act('cancelled')} busy={transition.isPending} busyLabel={t('Cancelling')}>
                {t('Cancel order')}
              </Button>
            )}
          </>
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Lines and stock')}</NavLink>
        <NavLink to={`${base}/invoices`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Invoices')}</NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Timeline')}</NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'lines' && (
          <>
            <Panel title={t('Lines')} count={data.lines.length} flush>
              <Ledger caption={`Lines of ${data.number}`}>
                <thead>
                  <tr>
                    <Th className="w-14">{t('No.')}</Th>
                    <Th>{t('SKU')}</Th>
                    <Th>{t('Product')}</Th>
                    <Th numeric>{t('Ordered')}</Th>
                    <Th numeric>{t('Price /m')}</Th>
                    <Th numeric>{t('Line total')}</Th>
                    <Th numeric>{t('Held')}</Th>
                    <Th numeric>{t('Shipped')}</Th>
                    <Th>{t('Stock held')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line) => (
                    <Tr key={line.id}>
                      <Td className="code text-ink-muted">{String(line.lineNo).padStart(2, '0')}</Td>
                      <Td>
                        <Link to={`/products/skus/${line.skuCode}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {line.skuCode}
                        </Link>
                      </Td>
                      <Td>
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <ShadeDot hex={line.shadeHex} name={line.shadeName} code={line.shadeCode} size="sm" />
                          {line.productName}, {line.shadeName}
                        </span>
                      </Td>
                      <Td numeric>{metres(line.quantity)}</Td>
                      <Td numeric className="text-ink-soft">{money(line.unitPrice, data.currency, 4)}</Td>
                      <Td numeric className="font-medium">{money(lineTotal(line), data.currency)}</Td>
                      <Td numeric className={cn(line.allocated !== '0' && 'text-positive')}>{metres(line.allocated)}</Td>
                      <Td numeric className="text-ink-soft">{metres(line.shipped)}</Td>
                      <Td>
                        <span className="flex flex-wrap gap-x-3 gap-y-1">
                          {line.allocations.length === 0 && <span className="text-ink-muted">—</span>}
                          {line.allocations.map((allocation) => (
                            <Link key={allocation.id} to={`/inventory/lots/${allocation.lotNumber}/stock`} className={cn('code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink', allocation.shipped && 'text-ink-muted')}>
                              {allocation.rollNumber ? allocation.rollNumber : `${allocation.lotNumber} ${metres(allocation.quantity)}`}
                            </Link>
                          ))}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                  <tr className="bg-bone">
                    <Td className="font-medium" colSpan={5}>
                      {t('Order total')}
                    </Td>
                    <Td numeric className="font-medium">
                      {money(data.total, data.currency)}
                    </Td>
                    <Td colSpan={3} />
                  </tr>
                </tbody>
              </Ledger>
            </Panel>
            {costs && <MarginPanel order={data} />}
            {(data.notes || data.shipToAddress) && (
              <Panel title={t('Delivery and notes')}>
                {data.shipToAddress && <p className="whitespace-pre-line">{data.shipToAddress}</p>}
                {data.notes && <p className="mt-2 whitespace-pre-line text-ink-soft">{data.notes}</p>}
              </Panel>
            )}
          </>
        )}
        {tab === 'invoices' && (
          <Panel title={t('Invoices')} count={data.invoices.length} flush>
            {data.invoices.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">{t('No invoice recorded. The invoice is raised in the accounting system; its number and dates are kept here.')}</p>
            ) : (
              <Ledger caption={`Invoices of ${data.number}`}>
                <thead>
                  <tr>
                    <Th>{t('Invoice')}</Th>
                    <Th numeric>{t('Amount')}</Th>
                    <Th>{t('Issued')}</Th>
                    <Th>{t('Due')}</Th>
                    <Th>{t('Paid')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td className="code font-medium">{invoice.number}</Td>
                      <Td numeric>{money(invoice.amount, invoice.currency)}</Td>
                      <Td className="code text-ink-soft">{short(invoice.issuedOn)}</Td>
                      <Td className="code text-ink-soft">{short(invoice.dueOn)}</Td>
                      <Td>{invoice.paidOn ? <StatusChip tone="positive">{t('Paid {date}', { date: formatLocalDate(invoice.paidOn) })}</StatusChip> : <StatusChip tone="caution">{t('Unpaid')}</StatusChip>}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
        {tab === 'timeline' && (
          <Panel title={t('Timeline')} count={timeline.data?.length}>
            <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
          </Panel>
        )}
      </div>
      {fulfil && <AllocateDialog key={allocating ? 'allocate-open' : 'allocate-closed'} order={data} open={allocating} onClose={() => setAllocating(false)} />}
      {fulfil && <ShipDialog key={shipping ? 'ship-open' : 'ship-closed'} order={data} open={shipping} onClose={() => setShipping(false)} />}
      {finance && <InvoiceDialog key={invoicing ? 'invoice-open' : 'invoice-closed'} order={data} open={invoicing} onClose={() => setInvoicing(false)} />}
    </>
  );
}
