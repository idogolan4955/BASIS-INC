import {
  HEALTH_LABEL,
  HEALTH_TONE,
  PAYMENT_TRIGGER_LABEL,
  PO_STATE_LABEL,
  PO_STATE_TONE,
  RUN_STATE_LABEL,
  canManageModule,
  canViewCosts,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  moneyFromStored,
  multiplyByQuantity,
  quantityFromStored,
  sumMoney,
  todayIn,
  type PurchaseOrderDetail,
} from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Panel, ShadeDot, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { useCancelPurchaseOrder, useConfirmPurchaseOrder, useCreateProductionRun, useIssuePurchaseOrder, usePurchaseOrder, usePurchaseOrderCosts } from '../../data/manufacturing';
import { isSample } from '../../data/source';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useDocument } from '../../lib/documents';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

function OpenRunDialog({ po, open, onClose }: { po: PurchaseOrderDetail; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateProductionRun();
  const [plannedStart, setPlannedStart] = useState(todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const number = await create.mutateAsync({ purchaseOrderNumber: po.number, plannedStart, notes: notes.trim() || undefined });
      onClose();
      navigate(`/manufacturing/runs/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The run could not be opened.');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Open production run" description={`Plans the milestones for ${po.number} from the family's process template.`}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField label="Planned start" type="date" required value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} />
        <TextArea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel="Opening">
            Open run
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function CancelDialog({ po, open, onClose }: { po: PurchaseOrderDetail; open: boolean; onClose: () => void }) {
  const cancel = useCancelPurchaseOrder();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) return setError('Say why.');
    try {
      await cancel.mutateAsync({ number: po.number, reason: reason.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The order could not be cancelled.');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={`Cancel ${po.number}`} description="A cancelled order keeps its record and cannot be reopened.">
      <form onSubmit={submit} className="grid gap-4">
        <TextArea label="Reason" required value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Keep the order</Button>
          <Button type="submit" variant="destructive" busy={cancel.isPending} busyLabel="Cancelling">
            Cancel the order
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Lines({ po, costs }: { po: PurchaseOrderDetail; costs: boolean }) {
  const prices = usePurchaseOrderCosts(po.number, costs);
  const priceOf = new Map((prices.data?.lines ?? []).map((line) => [line.id, line.unitPrice]));
  const currency = prices.data?.currency ?? po.currency;
  const lineTotals = po.lines.map((line) => {
    const price = priceOf.get(line.id);
    return price ? multiplyByQuantity(moneyFromStored(price, currency), quantityFromStored(line.quantity, 'm')) : null;
  });
  const total = costs && lineTotals.every((value) => value !== null) ? sumMoney(lineTotals.map((value) => value!), currency) : null;
  return (
    <Panel title="Lines" count={po.lines.length} flush>
      <Ledger caption={`Lines of ${po.number}`}>
        <thead>
          <tr>
            <Th className="w-14">No.</Th>
            <Th>SKU</Th>
            <Th>Product</Th>
            <Th>Shade</Th>
            <Th numeric>Quantity</Th>
            <Th numeric>Tolerance</Th>
            {costs && <Th numeric>Unit price</Th>}
            {costs && <Th numeric>Line total</Th>}
          </tr>
        </thead>
        <tbody>
          {po.lines.map((line, index) => (
            <Tr key={line.id}>
              <Td className="code text-ink-muted">{String(line.lineNo).padStart(2, '0')}</Td>
              <Td>
                <Link to={`/products/skus/${line.skuCode}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
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
              <Td numeric>{metres(line.quantity)}</Td>
              <Td numeric className="text-ink-soft">
                {line.overTolerancePercent === null && line.underTolerancePercent === null ? '—' : `+${line.overTolerancePercent ?? 0}% / −${line.underTolerancePercent ?? 0}%`}
              </Td>
              {costs && <Td numeric>{priceOf.has(line.id) ? `${formatMoney(moneyFromStored(priceOf.get(line.id)!, currency), 4)} / m` : '—'}</Td>}
              {costs && <Td numeric>{lineTotals[index] ? formatMoney(lineTotals[index]!) : '—'}</Td>}
            </Tr>
          ))}
          {total && (
            <tr className="bg-bone">
              <Td className="font-medium" colSpan={costs ? 7 : 5}>
                Order total
              </Td>
              <Td numeric className="font-medium">
                {formatMoney(total)}
              </Td>
            </tr>
          )}
        </tbody>
      </Ledger>
    </Panel>
  );
}

function Payments({ po }: { po: PurchaseOrderDetail }) {
  const costs = usePurchaseOrderCosts(po.number, true);
  const payments = costs.data?.payments ?? [];
  const currency = costs.data?.currency ?? po.currency;
  return (
    <Panel title="Payment schedule" count={payments.length} flush>
      {payments.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">No payment schedule.</p>
      ) : (
        <Ledger caption={`Payments of ${po.number}`}>
          <thead>
            <tr>
              <Th>Payment</Th>
              <Th>Falls due</Th>
              <Th>Due on</Th>
              <Th numeric>Amount</Th>
              <Th>Paid</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <Tr key={payment.id}>
                <Td className="font-medium">{payment.label}</Td>
                <Td className="text-ink-soft">{PAYMENT_TRIGGER_LABEL[payment.trigger] ?? payment.trigger}</Td>
                <Td className="code text-ink-soft">{dateOrDash(payment.dueOn)}</Td>
                <Td numeric>{payment.amount ? formatMoney(moneyFromStored(payment.amount, currency)) : '—'}</Td>
                <Td>
                  {payment.paidOn ? (
                    <StatusChip tone="positive">Paid {formatLocalDate(payment.paidOn)}</StatusChip>
                  ) : payment.dueOn ? (
                    <StatusChip tone="caution">Unpaid</StatusChip>
                  ) : (
                    <span className="text-ink-muted">Not due yet</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Ledger>
      )}
    </Panel>
  );
}

function Production({ po, manage, onOpenRun }: { po: PurchaseOrderDetail; manage: boolean; onOpenRun: () => void }) {
  return (
    <Panel
      title="Production runs"
      count={po.runDetails.length}
      flush
      action={manage && po.state === 'confirmed' && <Button size="sm" onClick={onOpenRun}>Open run</Button>}
    >
      {po.runDetails.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">
          {po.state === 'confirmed' ? 'No run yet. Open one to plan the milestones.' : 'Runs open once the supplier has confirmed the order.'}
        </p>
      ) : (
        <Ledger caption={`Runs of ${po.number}`}>
          <thead>
            <tr>
              <Th>Run</Th>
              <Th>State</Th>
              <Th>Health</Th>
              <Th>Planned end</Th>
              <Th>Expected</Th>
            </tr>
          </thead>
          <tbody>
            {po.runDetails.map((run) => (
              <Tr key={run.number}>
                <Td>
                  <Link to={`/manufacturing/runs/${run.number}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    {run.number}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{RUN_STATE_LABEL[run.state]}</Td>
                <Td>
                  <StatusChip tone={HEALTH_TONE[run.health]}>{HEALTH_LABEL[run.health]}</StatusChip>
                </Td>
                <Td className="code text-ink-soft">{formatLocalDate(run.plannedEnd)}</Td>
                <Td className="code">{dateOrDash(run.forecastEnd ?? run.plannedEnd)}</Td>
              </Tr>
            ))}
          </tbody>
        </Ledger>
      )}
    </Panel>
  );
}

function PoTimeline({ number }: { number: string }) {
  const timeline = useTimeline('purchase_order', number);
  const note = useRecordNote('purchase_order', number);
  return (
    <Panel title="Timeline" count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function PurchaseOrderSheet({ tab }: { tab: 'overview' | 'production' | 'payments' | 'timeline' }) {
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const po = usePurchaseOrder(number);
  const issue = useIssuePurchaseOrder();
  const confirm = useConfirmPurchaseOrder();
  const [dialog, setDialog] = useState<'run' | 'cancel' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pdf = useDocument();
  const manage = canManageModule(session.role, 'manufacturing');
  const costs = canViewCosts(session.role);

  if (po.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">Loading purchase order</p>;
  if (po.error) return <p className="px-5 py-10 text-critical lg:px-8">The purchase order could not be loaded. {po.error.message}</p>;
  if (!po.data) return <NotFound what="purchase order" />;
  const data = po.data;
  const base = `/manufacturing/purchase-orders/${data.number}`;
  const act = (run: () => Promise<unknown>) => async () => {
    setActionError(null);
    try {
      await run();
    } catch (failure) {
      setActionError(failure instanceof Error ? failure.message : 'The action failed.');
    }
  };

  return (
    <>
      <LabelHeader
        code={data.number}
        title={data.supplierName}
        subtitle={data.products.join(', ')}
        status={
          <>
            <StatusChip tone={PO_STATE_TONE[data.state]}>{PO_STATE_LABEL[data.state]}</StatusChip>
            {(actionError || pdf.error) && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {actionError ?? pdf.error}
              </span>
            )}
          </>
        }
        facts={[
          { label: 'Quantity', value: metres(data.totalQuantity) },
          { label: 'Currency', value: data.currency },
          { label: 'Terms', value: [data.incoterm, data.namedPlace].filter(Boolean).join(' ') || '—' },
          { label: 'Issued', value: dateOrDash(data.issuedOn) },
          { label: 'Confirmed', value: dateOrDash(data.confirmedOn) },
          { label: 'Ex-factory', value: dateOrDash(data.requestedExFactory) },
        ]}
        actions={
          <>
            {costs && !isSample && data.state !== 'draft' && (
              <Button onClick={() => pdf.open('purchase-order', data.number)} busy={pdf.busy === 'purchase-order'} busyLabel="Rendering">
                PDF
              </Button>
            )}
            {manage && (
            <>
              {(data.state === 'draft' || data.state === 'issued') && (
                <Button variant="destructive" onClick={() => setDialog('cancel')}>
                  Cancel order
                </Button>
              )}
              {data.state === 'draft' && (
                <Button variant="primary" onClick={act(() => issue.mutateAsync({ number: data.number }))} busy={issue.isPending} busyLabel="Issuing">
                  Issue to supplier
                </Button>
              )}
              {data.state === 'issued' && (
                <Button variant="primary" onClick={act(() => confirm.mutateAsync({ number: data.number }))} busy={confirm.isPending} busyLabel="Confirming">
                  Mark confirmed
                </Button>
              )}
              {data.state === 'confirmed' && (
                <Button variant="primary" onClick={() => setDialog('run')}>
                  Open run
                </Button>
              )}
            </>
            )}
          </>
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>
          Overview
        </NavLink>
        <NavLink to={`${base}/production`} className={({ isActive }) => sheetTabClass(isActive)}>
          Production
        </NavLink>
        {costs && (
          <NavLink to={`${base}/payments`} className={({ isActive }) => sheetTabClass(isActive)}>
            Payments
          </NavLink>
        )}
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>
          Timeline
        </NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'overview' && (
          <>
            <Lines po={data} costs={costs} />
            {(data.paymentTerms || data.notes) && (
              <Panel title="Terms and notes">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="caps text-ink-muted">Payment terms</dt>
                    <dd className="mt-1 text-sm">{data.paymentTerms || '—'}</dd>
                  </div>
                  <div>
                    <dt className="caps text-ink-muted">Notes</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm">{data.notes || '—'}</dd>
                  </div>
                </dl>
              </Panel>
            )}
          </>
        )}
        {tab === 'production' && <Production po={data} manage={manage} onOpenRun={() => setDialog('run')} />}
        {tab === 'payments' && (costs ? <Payments po={data} /> : <NotFound what="page" />)}
        {tab === 'timeline' && <PoTimeline number={data.number} />}
      </div>
      {manage && (
        <>
          <OpenRunDialog po={data} open={dialog === 'run'} onClose={() => setDialog(null)} />
          <CancelDialog po={data} open={dialog === 'cancel'} onClose={() => setDialog(null)} />
        </>
      )}
    </>
  );
}
