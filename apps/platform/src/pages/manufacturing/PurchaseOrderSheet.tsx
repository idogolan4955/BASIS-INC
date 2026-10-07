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
import { DocumentsPanel } from '../../components/DocumentsPanel';
import { EmailDialog } from '../../components/EmailDialog';
import { isSample } from '../../data/source';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useDocument } from '../../lib/documents';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { useT } from '../../i18n';

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

function OpenRunDialog({ po, open, onClose }: { po: PurchaseOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
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
    <Dialog open={open} onClose={onClose} title={t('Open production run')} description={`Plans the milestones for ${po.number} from the family's process template.`}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField label={t('Planned start')} type="date" required value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} />
        <TextArea label={t('Notes')} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Opening')}>{t('Open run')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function CancelDialog({ po, open, onClose }: { po: PurchaseOrderDetail; open: boolean; onClose: () => void }) {
  const t = useT();
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
    <Dialog open={open} onClose={onClose} title={`Cancel ${po.number}`} description={t('A cancelled order keeps its record and cannot be reopened.')}>
      <form onSubmit={submit} className="grid gap-4">
        <TextArea label={t('Reason')} required value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Keep the order')}</Button>
          <Button type="submit" variant="destructive" busy={cancel.isPending} busyLabel={t('Cancelling')}>{t('Cancel the order')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Lines({ po, costs }: { po: PurchaseOrderDetail; costs: boolean }) {
  const t = useT();
  const prices = usePurchaseOrderCosts(po.number, costs);
  const priceOf = new Map((prices.data?.lines ?? []).map((line) => [line.id, line.unitPrice]));
  const currency = prices.data?.currency ?? po.currency;
  const lineTotals = po.lines.map((line) => {
    const price = priceOf.get(line.id);
    return price ? multiplyByQuantity(moneyFromStored(price, currency), quantityFromStored(line.quantity, 'm')) : null;
  });
  const total = costs && lineTotals.every((value) => value !== null) ? sumMoney(lineTotals.map((value) => value!), currency) : null;
  return (
    <Panel title={t('Lines')} count={po.lines.length} flush>
      <Ledger caption={`Lines of ${po.number}`}>
        <thead>
          <tr>
            <Th className="w-14">{t('No.')}</Th>
            <Th>{t('SKU')}</Th>
            <Th>{t('Product')}</Th>
            <Th>{t('Shade')}</Th>
            <Th numeric>{t('Quantity')}</Th>
            <Th numeric>{t('Tolerance')}</Th>
            {costs && <Th numeric>{t('Unit price')}</Th>}
            {costs && <Th numeric>{t('Line total')}</Th>}
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
              <Td className="font-medium" colSpan={costs ? 7 : 5}>{t('Order total')}</Td>
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
  const t = useT();
  const costs = usePurchaseOrderCosts(po.number, true);
  const payments = costs.data?.payments ?? [];
  const currency = costs.data?.currency ?? po.currency;
  return (
    <Panel title={t('Payment schedule')} count={payments.length} flush>
      {payments.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">{t('No payment schedule.')}</p>
      ) : (
        <Ledger caption={`Payments of ${po.number}`}>
          <thead>
            <tr>
              <Th>{t('Payment')}</Th>
              <Th>{t('Falls due')}</Th>
              <Th>{t('Due on')}</Th>
              <Th numeric>{t('Amount')}</Th>
              <Th>{t('Paid')}</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <Tr key={payment.id}>
                <Td className="font-medium">{payment.label}</Td>
                <Td className="text-ink-soft">{t(PAYMENT_TRIGGER_LABEL[payment.trigger] ?? payment.trigger)}</Td>
                <Td className="code text-ink-soft">{dateOrDash(payment.dueOn)}</Td>
                <Td numeric>{payment.amount ? formatMoney(moneyFromStored(payment.amount, currency)) : '—'}</Td>
                <Td>
                  {payment.paidOn ? (
                    <StatusChip tone="positive">Paid {formatLocalDate(payment.paidOn)}</StatusChip>
                  ) : payment.dueOn ? (
                    <StatusChip tone="caution">{t('Unpaid')}</StatusChip>
                  ) : (
                    <span className="text-ink-muted">{t('Not due yet')}</span>
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
  const t = useT();
  return (
    <Panel
      title={t('Production runs')}
      count={po.runDetails.length}
      flush
      action={manage && po.state === 'confirmed' && <Button size="sm" onClick={onOpenRun}>{t('Open run')}</Button>}
    >
      {po.runDetails.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">
          {po.state === 'confirmed' ? 'No run yet. Open one to plan the milestones.' : 'Runs open once the supplier has confirmed the order.'}
        </p>
      ) : (
        <Ledger caption={`Runs of ${po.number}`}>
          <thead>
            <tr>
              <Th>{t('Run')}</Th>
              <Th>{t('State')}</Th>
              <Th>{t('Health')}</Th>
              <Th>{t('Planned end')}</Th>
              <Th>{t('Expected')}</Th>
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
                <Td className="text-ink-soft">{t(RUN_STATE_LABEL[run.state])}</Td>
                <Td>
                  <StatusChip tone={HEALTH_TONE[run.health]}>{t(HEALTH_LABEL[run.health])}</StatusChip>
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
  const t = useT();
  const timeline = useTimeline('purchase_order', number);
  const note = useRecordNote('purchase_order', number);
  return (
    <Panel title={t('Timeline')} count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function PurchaseOrderSheet({ tab }: { tab: 'overview' | 'production' | 'payments' | 'documents' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const po = usePurchaseOrder(number);
  const issue = useIssuePurchaseOrder();
  const confirm = useConfirmPurchaseOrder();
  const [dialog, setDialog] = useState<'run' | 'cancel' | 'email' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pdf = useDocument();
  const manage = canManageModule(session.role, 'manufacturing');
  const costs = canViewCosts(session.role);

  if (po.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading purchase order')}</p>;
  if (po.error) return <p className="px-5 py-10 text-critical lg:px-8">The purchase order could not be loaded. {po.error.message}</p>;
  if (!po.data) return <NotFound what={t('purchase order')} />;
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
            <StatusChip tone={PO_STATE_TONE[data.state]}>{t(PO_STATE_LABEL[data.state])}</StatusChip>
            {(actionError || pdf.error) && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {actionError ?? pdf.error}
              </span>
            )}
          </>
        }
        facts={[
          { label: t('Quantity'), value: metres(data.totalQuantity) },
          { label: t('Currency'), value: data.currency },
          { label: t('Terms'), value: [data.incoterm, data.namedPlace].filter(Boolean).join(' ') || '—' },
          { label: t('Issued'), value: dateOrDash(data.issuedOn) },
          { label: t('Confirmed'), value: dateOrDash(data.confirmedOn) },
          { label: t('Ex-factory'), value: dateOrDash(data.requestedExFactory) },
        ]}
        actions={
          <>
            {costs && !isSample && data.state !== 'draft' && (
              <>
                <Button onClick={() => pdf.open('purchase-order', data.number)} busy={pdf.busy === 'purchase-order'} busyLabel={t('Rendering')}>{t('PDF')}</Button>
                <Button onClick={() => pdf.share('purchase-order', data.number, `Purchase order ${data.number} from BASIS INC. for ${data.supplierName}`)} busy={pdf.busy === 'share:purchase-order'} busyLabel={t('Sharing')}>{t('WhatsApp')}</Button>
                <Button onClick={() => setDialog('email')}>{t('Email')}</Button>
              </>
            )}
            {manage && (
            <>
              {(data.state === 'draft' || data.state === 'issued') && (
                <Button variant="destructive" onClick={() => setDialog('cancel')}>{t('Cancel order')}</Button>
              )}
              {data.state === 'draft' && (
                <Button variant="primary" onClick={act(() => issue.mutateAsync({ number: data.number }))} busy={issue.isPending} busyLabel={t('Issuing')}>{t('Issue to supplier')}</Button>
              )}
              {data.state === 'issued' && (
                <Button variant="primary" onClick={act(() => confirm.mutateAsync({ number: data.number }))} busy={confirm.isPending} busyLabel={t('Confirming')}>{t('Mark confirmed')}</Button>
              )}
              {data.state === 'confirmed' && (
                <Button variant="primary" onClick={() => setDialog('run')}>{t('Open run')}</Button>
              )}
            </>
            )}
          </>
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Overview')}</NavLink>
        <NavLink to={`${base}/production`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Production')}</NavLink>
        {costs && (
          <NavLink to={`${base}/payments`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Payments')}</NavLink>
        )}
        <NavLink to={`${base}/documents`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Documents')}</NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Timeline')}</NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'overview' && (
          <>
            <Lines po={data} costs={costs} />
            {(data.paymentTerms || data.notes) && (
              <Panel title={t('Terms and notes')}>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="caps text-ink-muted">{t('Payment terms')}</dt>
                    <dd className="mt-1 text-sm">{data.paymentTerms || '—'}</dd>
                  </div>
                  <div>
                    <dt className="caps text-ink-muted">{t('Notes')}</dt>
                    <dd className="mt-1 whitespace-pre-line text-sm">{data.notes || '—'}</dd>
                  </div>
                </dl>
              </Panel>
            )}
          </>
        )}
        {tab === 'production' && <Production po={data} manage={manage} onOpenRun={() => setDialog('run')} />}
        {tab === 'payments' && (costs ? <Payments po={data} /> : <NotFound what={t('page')} />)}
        {tab === 'documents' && (
          <DocumentsPanel
            entityType="purchase_order"
            entityId={data.number}
            generated={[{ kind: 'purchase-order', label: 'purchase order', available: costs && data.state !== 'draft' }]}
            canFile={manage}
            shareText={`Purchase order ${data.number} from BASIS INC. for ${data.supplierName}`}
          />
        )}
        {tab === 'timeline' && <PoTimeline number={data.number} />}
      </div>
      {manage && (
        <>
          <OpenRunDialog po={data} open={dialog === 'run'} onClose={() => setDialog(null)} />
          <CancelDialog po={data} open={dialog === 'cancel'} onClose={() => setDialog(null)} />
        </>
      )}
      {costs && !isSample && <EmailDialog key={dialog === 'email' ? 'open' : 'closed'} kind="purchase-order" number={data.number} subject={`Purchase order ${data.number} from BASIS INC.`} open={dialog === 'email'} onClose={() => setDialog(null)} />}
    </>
  );
}
