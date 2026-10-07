import { QUOTE_STATE_LABEL, QUOTE_STATE_TONE, addDays, daysBetween, formatLocalDate, formatMoney, formatQuantity, lineTotal, moneyFromStored, quantityFromStored, todayIn } from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Panel, ShadeDot, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { useQuote, useSaveQuote, useTransitionQuote } from '../../data/commercial';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { LinesEditor, parseLines } from './Orders';

// The quote sheet: the offer as a record, its lines, and what became of it.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const money = (stored: string, currency: string, digits = 2) => formatMoney(moneyFromStored(stored, currency), digits);

function AcceptDialog({ number, open, onClose }: { number: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const transition = useTransitionQuote();
  const [requestedDelivery, setRequestedDelivery] = useState(addDays(todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone), 14) as string);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await transition.mutateAsync({ number, to: 'accepted', requestedDelivery: requestedDelivery || undefined });
      onClose();
      if (result.orderNumber) navigate(`/orders/${result.orderNumber}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The quote could not be accepted.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Accept quote')} description={t('The customer said yes: a confirmed sales order opens with these lines and terms.')}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField label={t('Requested delivery')} type="date" value={requestedDelivery} onChange={(event) => setRequestedDelivery(event.target.value)} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={transition.isPending} busyLabel={t('Opening')}>{t('Accept and open order')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function EditLinesDialog({ quote, open, onClose }: { quote: NonNullable<ReturnType<typeof useQuote>['data']>; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveQuote();
  const [lines, setLines] = useState(quote.lines.map((line) => ({ skuCode: line.skuCode, quantity: (Number(line.quantity) / 1000).toString(), unitPrice: (Number(line.unitPrice) / 10000).toString(), leadTimeDays: line.leadTimeDays === null ? '' : String(line.leadTimeDays) })));
  const [notes, setNotes] = useState(quote.notes);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ number: quote.number, customerId: quote.customerId, currency: quote.currency, incotermCode: quote.incoterm || undefined, namedPlace: quote.namedPlace || undefined, paymentTerms: quote.paymentTerms || undefined, validUntil: quote.validUntil ?? undefined, notes: notes.trim() || undefined, lines: parseLines(lines, t) });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The quote could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Edit lines')} description={t('A draft changes freely; once sent it is what the customer saw.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <LinesEditor lines={lines} onChange={setLines} currency={quote.currency} withLead />
        <TextArea label={t('Notes')} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="sm:col-span-3" />
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

export function QuoteSheet({ tab }: { tab: 'lines' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const quote = useQuote(number);
  const transition = useTransitionQuote();
  const timeline = useTimeline('quote', number);
  const note = useRecordNote('quote', number);
  const [accepting, setAccepting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manage = ['owner', 'operations', 'sales'].includes(session.role);
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

  if (quote.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading quote')}</p>;
  if (quote.error) return <p className="px-5 py-10 text-critical lg:px-8">The quote could not be loaded. {quote.error.message}</p>;
  if (!quote.data) return <NotFound what={t('quote')} />;
  const data = quote.data;
  const base = `/orders/quotes/${data.number}`;
  const expiring = data.validUntil && (data.state === 'sent' || data.state === 'draft') ? daysBetween(today, data.validUntil) : null;
  const act = async (to: 'sent' | 'declined') => {
    setError(null);
    try {
      await transition.mutateAsync({ number: data.number, to });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The quote could not be moved.'));
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
            {data.contactName ? ` · ${data.contactName}` : ''}
            {data.incoterm ? ` · ${[data.incoterm, data.namedPlace].filter(Boolean).join(' ')}` : ''}
            {data.paymentTerms ? ` · ${data.paymentTerms}` : ''}
          </>
        }
        status={
          <>
            <StatusChip tone={QUOTE_STATE_TONE[data.state]}>{t(QUOTE_STATE_LABEL[data.state])}</StatusChip>
            {data.orderNumber && (
              <Link to={`/orders/${data.orderNumber}`} className="code underline decoration-line-strong underline-offset-4">
                {data.orderNumber}
              </Link>
            )}
            {error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {error}
              </span>
            )}
          </>
        }
        facts={[
          { label: t('Total'), value: money(data.total, data.currency) },
          { label: t('Lines'), value: String(data.lines.length) },
          { label: t('Metres'), value: metres(data.lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n).toString()) },
          { label: t('Valid until'), value: <span className={expiring !== null && expiring < 0 ? 'text-critical' : expiring !== null && expiring <= 3 ? 'text-caution' : undefined}>{data.validUntil ? formatLocalDate(data.validUntil) : '—'}</span> },
          { label: t('Sent'), value: data.sentOn ? formatLocalDate(data.sentOn) : '—' },
          { label: t('Currency'), value: data.currency },
        ]}
        actions={
          manage && (
            <>
              {data.state === 'draft' && <Button onClick={() => setEditing(true)}>{t('Edit lines')}</Button>}
              {data.state === 'draft' && (
                <Button variant="primary" onClick={() => act('sent')} busy={transition.isPending && transition.variables?.to === 'sent'} busyLabel={t('Sending')}>
                  {t('Mark sent')}
                </Button>
              )}
              {(data.state === 'sent' || data.state === 'draft') && (
                <Button variant={data.state === 'sent' ? 'primary' : undefined} onClick={() => setAccepting(true)}>
                  {t('Accept')}
                </Button>
              )}
              {(data.state === 'sent' || data.state === 'draft') && (
                <Button onClick={() => act('declined')} busy={transition.isPending && transition.variables?.to === 'declined'} busyLabel={t('Saving')}>
                  {t('Declined')}
                </Button>
              )}
            </>
          )
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Lines')}</NavLink>
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
                    <Th numeric>{t('Metres')}</Th>
                    <Th numeric>{t('Price /m')}</Th>
                    <Th numeric>{t('Line total')}</Th>
                    <Th numeric>{t('Lead time')}</Th>
                    <Th>{t('Note')}</Th>
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
                      <Td numeric className="text-ink-soft">{line.leadTimeDays === null ? '—' : `${line.leadTimeDays} d`}</Td>
                      <Td className="text-ink-soft">{line.note || '—'}</Td>
                    </Tr>
                  ))}
                  <tr className="bg-bone">
                    <Td className="font-medium" colSpan={5}>
                      {t('Quote total')}
                    </Td>
                    <Td numeric className="font-medium">
                      {money(data.total, data.currency)}
                    </Td>
                    <Td colSpan={2} />
                  </tr>
                </tbody>
              </Ledger>
            </Panel>
            {data.notes && (
              <Panel title={t('Notes')}>
                <p className="whitespace-pre-line">{data.notes}</p>
              </Panel>
            )}
          </>
        )}
        {tab === 'timeline' && (
          <Panel title={t('Timeline')} count={timeline.data?.length}>
            <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
          </Panel>
        )}
      </div>
      {manage && <AcceptDialog key={accepting ? 'accept-open' : 'accept-closed'} number={data.number} open={accepting} onClose={() => setAccepting(false)} />}
      {manage && <EditLinesDialog key={editing ? 'edit-open' : 'edit-closed'} quote={data} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
