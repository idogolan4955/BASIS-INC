import { customerCan, quoteStanding, quoteTotal, type LocalDate } from '@basis/shared';
import { FilePdf } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { call, openDocument, read, useRead } from './data';
import { Back, Button, Chip, Facts, Failed, Loading, PageTitle, portalMeta } from './frame';
import { Alert, Area, Field } from './fields';
import { date, today } from './format';
import { useLocale, useT } from './i18n';
import { QUOTE } from './labels';
import { Lines } from './lines';
import { useMe } from './session';
import { IN_APP } from '../native/platform';
import { Group, GroupRow } from '../native/ui';

export const meta = () => portalMeta('Quote');

export default function QuotePage() {
  const t = useT();
  const { locale } = useLocale();
  const { role } = useMe();
  const { number = '' } = useParams();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerQuoteRef(dc, { number })), [number]);
  const [answer, setAnswer] = useState<'accept' | 'decline' | null>(null);
  const [delivery, setDelivery] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState<string | null>(null);

  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <Failed message={loaded.error} onRetry={loaded.reload} />;
  const quote = loaded.data!.quotes[0];
  if (!quote) {
    return (
      <div>
        <Back to="/account/quotes">{t('Quotes')}</Back>
        <Failed message={t('There is no quote {number} in your account.', { number })} />
      </div>
    );
  }
  const standing = quoteStanding(quote, today() as LocalDate);
  const label = QUOTE[standing];
  const mayAnswer = standing === 'awaiting_answer' && customerCan(role as never, 'answer_quote');
  const order = quote.orders[0];

  const submit = async () => {
    if (!answer) return;
    setBusy(true);
    setError('');
    try {
      const result = await call<object, { orderNumber: string | null }>('respondToQuote', { number: quote.number, decision: answer, ...(answer === 'accept' && delivery ? { requestedDelivery: delivery } : {}), ...(answer === 'decline' && reason.trim() ? { reason: reason.trim() } : {}) });
      setOpened(result.orderNumber);
      setAnswer(null);
      loaded.reload();
      if (IN_APP) void import('../native/bridge').then(({ haptic }) => haptic('success')).catch(() => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The answer could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  const download = () => void openDocument(`/api/pdf/quote/${quote.number}`, `Quotation ${quote.number}`).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t('The document could not be opened.')));

  // In the app the answer starts from an iOS action sheet: accept, decline or cancel.
  const chooseAnswer = async () => {
    const { chooseAction } = await import('../native/bridge');
    const index = await chooseAction(t('Your answer to {number}', { number: `\u2066${quote.number}\u2069` }), [{ title: t('Accept the quote') }, { title: t('Decline'), destructive: true }], t('Cancel'));
    if (index === 0) setAnswer('accept');
    if (index === 1) setAnswer('decline');
  };

  if (IN_APP) {
    return (
      <div>
        <Back to="/account/quotes">{t('Quotes')}</Back>
        <PageTitle title={t('Quote')} record={quote.number}>
          <Chip tone={label.tone}>{t(label.label)}</Chip>
        </PageTitle>
        {opened && (
          <Group>
            <GroupRow to={`/account/orders/${opened}`} title={t('Thank you. Your order is open:')} trailing={<span className="code" dir="ltr">{opened}</span>} />
          </Group>
        )}
        <Lines
          currency={quote.currency}
          total={quoteTotal(quote.lines)}
          totalLabel={t('Total')}
          lines={quote.lines.map((line) => ({ key: line.lineNo, sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, extra: line.leadTimeDays || line.note ? <span className="mt-1 block text-[15px] text-ink-muted">{[line.leadTimeDays ? t('{days} days lead time', { days: line.leadTimeDays }) : '', line.note ?? ''].filter(Boolean).join(' · ')}</span> : undefined }))}
        />
        {mayAnswer && answer === null && (
          <Group footer={t('Accepting opens your order with these lines and prices. BASIS confirms the dates with you.')}>
            <GroupRow onClick={() => void chooseAnswer()} title={<span className="font-semibold text-nude-deep">{t('Answer the quote')}</span>} chevron={false} />
          </Group>
        )}
        {mayAnswer && answer !== null && (
          <div className="mx-4 mb-7 grid gap-4">
            {answer === 'accept' ? <Field label={t('Wanted by (optional)')} name="delivery" type="date" value={delivery} onChange={setDelivery} dir="ltr" /> : <Area label={t('Why (optional)')} name="reason" rows={3} value={reason} onChange={setReason} />}
            {error && <Alert>{error}</Alert>}
            <Button onClick={() => void submit()} busy={busy}>
              {answer === 'accept' ? t('Accept and open the order') : t('Decline the quote')}
            </Button>
            <Button variant="quiet" onClick={() => setAnswer(null)}>
              {t('Not now')}
            </Button>
          </div>
        )}
        {!mayAnswer && standing === 'awaiting_answer' && <p className="mx-8 mb-7 text-[15px] text-ink-muted">{t('A buyer or an admin of your account answers quotes.')}</p>}
        <Group>
          <GroupRow onClick={download} leading={<FilePdf aria-hidden="true" size={24} weight="light" className="block text-ink-soft" />} title={t('Quotation PDF')} chevron />
        </Group>
        <Facts
          header={t('Terms')}
          rows={[
            { k: t('Sent'), v: date(quote.sentOn, locale) },
            { k: t('Valid until'), v: date(quote.validUntil, locale) },
            { k: t('Delivery terms'), v: <span dir="ltr">{[quote.incoterm?.code, quote.namedPlace].filter(Boolean).join(' ') || '—'}</span> },
            { k: t('Payment'), v: quote.paymentTerms || '—' },
          ]}
        />
        {order && (
          <Group>
            <GroupRow to={`/account/orders/${order.number}`} title={t('Order')} trailing={<span className="code" dir="ltr">{order.number}</span>} />
          </Group>
        )}
        {quote.notes && (
          <Group header={t('Notes')}>
            <div className="app-row app-selectable whitespace-pre-line text-[15px]" dir="auto">
              {quote.notes}
            </div>
          </Group>
        )}
        {error && answer === null && (
          <div className="mx-4">
            <Alert>{error}</Alert>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Back to="/account/quotes">{t('Quotes')}</Back>
      <PageTitle
        title={t('Quote')}
        action={
          <Button variant="secondary" onClick={download}>
            {t('Quotation PDF')}
          </Button>
        }
      >
        <span className="code text-ink" dir="ltr">
          {quote.number}
        </span>
        <span className="ms-3 inline-block align-middle">
          <Chip tone={label.tone}>{t(label.label)}</Chip>
        </span>
      </PageTitle>

      {opened && (
        <p role="status" className="mb-8 border-s-[3px] border-nude-deep bg-milk px-4 py-3">
          {t('Thank you. Your order is open:')}{' '}
          <Link to={`/account/orders/${opened}`} className="code underline underline-offset-4" dir="ltr">
            {opened}
          </Link>
        </p>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Lines
            currency={quote.currency}
            total={quoteTotal(quote.lines)}
            totalLabel={t('Total')}
            lines={quote.lines.map((line) => ({ key: line.lineNo, sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, extra: line.leadTimeDays || line.note ? <span className="mt-1 block text-sm text-ink-soft">{[line.leadTimeDays ? t('{days} days lead time', { days: line.leadTimeDays }) : '', line.note ?? ''].filter(Boolean).join(' · ')}</span> : undefined }))}
          />
          {quote.notes && (
            <div className="mt-8">
              <p className="code uppercase tracking-[0.14em] text-ink-muted">{t('Notes')}</p>
              <p className="mt-2 max-w-2xl whitespace-pre-line text-ink-soft" dir="auto">
                {quote.notes}
              </p>
            </div>
          )}
        </div>
        <aside className="grid content-start gap-6">
          <Facts
            rows={[
              { k: t('Sent'), v: date(quote.sentOn, locale) },
              { k: t('Valid until'), v: date(quote.validUntil, locale) },
              { k: t('Delivery terms'), v: <span dir="ltr">{[quote.incoterm?.code, quote.namedPlace].filter(Boolean).join(' ') || '—'}</span> },
              { k: t('Payment'), v: quote.paymentTerms || '—' },
              ...(order ? [{ k: t('Order'), v: <Link to={`/account/orders/${order.number}`} className="code underline underline-offset-4" dir="ltr">{order.number}</Link> }] : []),
            ]}
          />
          {mayAnswer && (
            <div className="border border-charcoal/70 bg-milk p-5">
              <p className="code uppercase tracking-[0.18em]">{t('Your answer')}</p>
              {answer === null ? (
                <div className="mt-4 grid gap-3">
                  <Button onClick={() => setAnswer('accept')}>{t('Accept the quote')}</Button>
                  <Button variant="secondary" onClick={() => setAnswer('decline')}>
                    {t('Decline')}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 grid gap-4">
                  {answer === 'accept' ? (
                    <>
                      <p className="text-sm text-ink-soft">{t('Accepting opens your order with these lines and prices. BASIS confirms the dates with you.')}</p>
                      <Field label={t('Wanted by (optional)')} name="delivery" type="date" value={delivery} onChange={setDelivery} dir="ltr" />
                    </>
                  ) : (
                    <Area label={t('Why (optional)')} name="reason" rows={3} value={reason} onChange={setReason} />
                  )}
                  {error && <Alert>{error}</Alert>}
                  <Button onClick={() => void submit()} busy={busy}>
                    {answer === 'accept' ? t('Accept and open the order') : t('Decline the quote')}
                  </Button>
                  <Button variant="quiet" onClick={() => setAnswer(null)}>
                    {t('Not now')}
                  </Button>
                </div>
              )}
            </div>
          )}
          {!mayAnswer && standing === 'awaiting_answer' && <p className="text-sm text-ink-soft">{t('A buyer or an admin of your account answers quotes.')}</p>}
          {error && answer === null && <Alert>{error}</Alert>}
        </aside>
      </div>
    </div>
  );
}
