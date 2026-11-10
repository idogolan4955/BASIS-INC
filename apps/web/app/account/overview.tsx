import { invoiceOutstanding, invoiceStanding, quoteStanding, quoteTotal, shipmentArrival, type LocalDate } from '@basis/shared';
import { Link } from 'react-router';
import { read, useRead } from './data';
import { Empty, Failed, Loading, portalMeta } from './frame';
import { date, money, today } from './format';
import { useLocale, useT } from './i18n';
import { useMe } from './session';

export const meta = () => portalMeta('Your account');

// What is open with BASIS, in the order a customer acts on it: quotes to
// answer, money due, goods on the way, orders being made.

function Line({ title, count, children, to, action }: { title: string; count: number; children: React.ReactNode; to: string; action: string }) {
  return (
    <li className="grid gap-3 border-b border-line py-6 [counter-increment:open] md:grid-cols-[3rem_14rem_minmax(0,1fr)_auto] md:items-baseline">
      <span aria-hidden="true" className="code text-ink-muted before:content-[counter(open,decimal-leading-zero)]" />
      <Link to={to} className="font-display text-[1.75rem] leading-none tracking-[-0.01em] hover:underline">
        {title}
        <span className="code ms-3 align-top text-base text-ink-muted">{count}</span>
      </Link>
      <div className="min-w-0 text-ink-soft">{children}</div>
      <Link to={to} className="code uppercase tracking-[0.14em] text-ink underline decoration-nude-deep underline-offset-[6px]">
        {action}
      </Link>
    </li>
  );
}

export default function Overview() {
  const t = useT();
  const { locale } = useLocale();
  const { me } = useMe();
  const now = today() as LocalDate;
  const loaded = useRead(
    async () => {
      const [quotes, orders, shipments, invoices] = await Promise.all([
        read((sdk, dc) => sdk.customerQuotesRef(dc)),
        read((sdk, dc) => sdk.customerOrdersRef(dc)),
        read((sdk, dc) => sdk.customerShipmentsRef(dc)),
        read((sdk, dc) => sdk.customerInvoicesRef(dc)),
      ]);
      return { quotes: quotes.quotes, orders: orders.salesOrders, shipments: shipments.shipments, invoices: invoices.invoiceRefs };
    },
    [me.uid],
  );
  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <Failed message={loaded.error} onRetry={loaded.reload} />;
  const data = loaded.data!;
  const waiting = data.quotes.filter((quote) => quoteStanding(quote, now) === 'awaiting_answer');
  const openOrders = data.orders.filter((order) => order.state === 'confirmed' || order.state === 'shipped');
  const moving = data.shipments.filter((shipment) => shipment.state === 'booked');
  const unpaid = data.invoices.filter((invoice) => invoiceStanding(invoice, now) !== 'paid');
  const overdue = unpaid.filter((invoice) => invoiceStanding(invoice, now) === 'overdue');
  const outstanding = new Map<string, bigint>();
  for (const invoice of unpaid) outstanding.set(invoice.currency, (outstanding.get(invoice.currency) ?? 0n) + BigInt(invoiceOutstanding(invoice)));
  const nothing = waiting.length + openOrders.length + moving.length + unpaid.length === 0;

  return (
    <div>
      <h2 className="font-display text-[clamp(1.875rem,4vw,2.75rem)] leading-none tracking-[-0.02em]">{t('What is open')}</h2>
      {nothing ? (
        <div className="mt-8">
          <Empty>{t('Nothing is waiting on you. Quotes, orders and shipments appear here as soon as BASIS opens them for you.')}</Empty>
        </div>
      ) : (
        <ol className="mt-6 border-t border-charcoal/70 [counter-reset:open]">
          {waiting.length > 0 && (
            <Line title={t('Quotes')} count={waiting.length} to={waiting.length === 1 ? `/account/quotes/${waiting[0]!.number}` : '/account/quotes'} action={t('Answer')}>
              {waiting.slice(0, 3).map((quote) => (
                <p key={quote.number}>
                  <span className="code" dir="ltr">
                    {quote.number}
                  </span>{' '}
                  · <span dir="ltr">{money(quoteTotal(quote.lines), quote.currency)}</span>
                  {quote.validUntil && ` · ${t('valid until {date}', { date: date(quote.validUntil, locale) })}`}
                </p>
              ))}
            </Line>
          )}
          {unpaid.length > 0 && (
            <Line title={t('Invoices')} count={unpaid.length} to="/account/invoices" action={t('See invoices')}>
              <p>
                {[...outstanding.entries()].map(([currency, amount]) => (
                  <span key={currency} dir="ltr" className="me-4 inline-block">
                    {money(amount.toString(), currency)}
                  </span>
                ))}
                {t('outstanding')}
                {overdue.length > 0 && <span className="ms-2 font-medium text-critical">{t('{count} overdue', { count: overdue.length })}</span>}
              </p>
            </Line>
          )}
          {moving.length > 0 && (
            <Line title={t('Shipments')} count={moving.length} to={moving.length === 1 ? `/account/shipments/${moving[0]!.number}` : '/account/shipments'} action={t('Track')}>
              {moving.slice(0, 3).map((shipment) => {
                const arrival = shipmentArrival(shipment.legs);
                return (
                  <p key={shipment.number}>
                    <span className="code" dir="ltr">
                      {shipment.number}
                    </span>
                    {shipment.destination.city && ` · ${shipment.destination.city}`}
                    {arrival.date && ` · ${arrival.arrived ? t('arrived {date}', { date: date(arrival.date, locale) }) : t('expected {date}', { date: date(arrival.date, locale) })}`}
                  </p>
                );
              })}
            </Line>
          )}
          {openOrders.length > 0 && (
            <Line title={t('Orders')} count={openOrders.length} to="/account/orders" action={t('See orders')}>
              {openOrders.slice(0, 3).map((order) => (
                <p key={order.number}>
                  <span className="code" dir="ltr">
                    {order.number}
                  </span>{' '}
                  · <span dir="ltr">{money(quoteTotal(order.lines), order.currency)}</span>
                  {order.requestedDelivery && ` · ${t('wanted by {date}', { date: date(order.requestedDelivery, locale) })}`}
                </p>
              ))}
            </Line>
          )}
        </ol>
      )}
      <div className="mt-12 grid gap-6 border border-charcoal/70 bg-milk p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="code uppercase tracking-[0.18em]">{t('Samples and the shade kit')}</p>
          <p className="mt-2 text-ink-soft">{t('Ask for swatches of any fabric in any shade; they go out labelled, with their technical sheets.')}</p>
        </div>
        <Link to="/account/samples" className="inline-flex h-12 items-center justify-center bg-charcoal px-6 font-medium text-milk hover:bg-cocoa">
          {t('Request samples')}
        </Link>
      </div>
    </div>
  );
}
