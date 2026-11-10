import { invoiceOutstanding, invoiceStanding, orderShippedPercent, quoteTotal, shippedQuantity, type LocalDate } from '@basis/shared';
import { Link, useParams } from 'react-router';
import { read, useRead } from './data';
import { Back, Cell, Chip, Facts, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date, money, qty, today } from './format';
import { useLocale, useT } from './i18n';
import { INVOICE, ORDER } from './labels';
import { Lines } from './lines';

export const meta = () => portalMeta('Order');

export default function OrderPage() {
  const t = useT();
  const { locale } = useLocale();
  const { number = '' } = useParams();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerOrderRef(dc, { number })), [number]);
  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <Failed message={loaded.error} onRetry={loaded.reload} />;
  const order = loaded.data!.salesOrders[0];
  if (!order) {
    return (
      <div>
        <Back to="/account/orders">{t('Orders')}</Back>
        <Failed message={t('There is no order {number} in your account.', { number })} />
      </div>
    );
  }
  const state = ORDER[order.state] ?? { label: order.state, tone: 'neutral' as const };
  const shipped = orderShippedPercent(order.lines);
  const shipments = [...new Map(order.lines.flatMap((line) => line.shipped).filter((item) => item.shipment.state !== 'cancelled').map((item) => [item.shipment.number, item.shipment])).values()];
  const now = today() as LocalDate;
  return (
    <div>
      <Back to="/account/orders">{t('Orders')}</Back>
      <PageTitle title={t('Order')}>
        <span className="code text-ink" dir="ltr">
          {order.number}
        </span>
        <span className="ms-3 inline-block align-middle">
          <Chip tone={state.tone}>{t(state.label)}</Chip>
        </span>
      </PageTitle>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <Lines
            currency={order.currency}
            total={quoteTotal(order.lines)}
            totalLabel={t('Total')}
            lines={order.lines.map((line) => {
              const sent = shippedQuantity(line);
              return { key: line.lineNo, sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, uom: line.uom, extra: BigInt(sent) > 0n ? <span className="code mt-1 block text-sm text-nude-deep" dir="ltr">{t('{quantity} shipped', { quantity: qty(sent, line.uom) })}</span> : undefined };
            })}
          />
          {order.invoices.length > 0 && (
            <div className="mt-10">
              <p className="code mb-3 uppercase tracking-[0.14em] text-ink-muted">{t('Invoices')}</p>
              <Ledger head={[t('Invoice'), t('Issued'), t('Due'), t('Amount'), t('Outstanding'), t('Standing')]}>
                {order.invoices.map((invoice) => {
                  const standing = INVOICE[invoiceStanding(invoice, now)];
                  return (
                    <Row key={invoice.number}>
                      <Cell code>{invoice.number}</Cell>
                      <Cell>{date(invoice.issuedOn, locale)}</Cell>
                      <Cell>{date(invoice.dueOn, locale)}</Cell>
                      <Cell code>{money(invoice.amount, invoice.currency)}</Cell>
                      <Cell code>{money(invoiceOutstanding(invoice), invoice.currency)}</Cell>
                      <Cell>
                        <Chip tone={standing.tone}>{t(standing.label)}</Chip>
                      </Cell>
                    </Row>
                  );
                })}
              </Ledger>
            </div>
          )}
        </div>
        <aside className="grid content-start gap-6">
          <Facts
            rows={[
              { k: t('Confirmed'), v: date(order.confirmedOn, locale) },
              { k: t('Wanted by'), v: date(order.requestedDelivery, locale) },
              { k: t('Shipped'), v: <span className="code" dir="ltr">{shipped}%</span> },
              { k: t('Delivery terms'), v: <span dir="ltr">{[order.incoterm?.code, order.namedPlace].filter(Boolean).join(' ') || '—'}</span> },
              { k: t('Payment'), v: order.paymentTerms || '—' },
              { k: t('Ship to'), v: [order.shipToName, order.shipToAddress].filter(Boolean).join(', ') || '—' },
              ...(order.quote ? [{ k: t('From quote'), v: <Link to={`/account/quotes/${order.quote.number}`} className="code underline underline-offset-4" dir="ltr">{order.quote.number}</Link> }] : []),
            ]}
          />
          <div aria-hidden="true" className="h-2 w-full overflow-hidden bg-charcoal/10">
            <div className="h-full bg-nude-deep" style={{ width: `${shipped}%` }} />
          </div>
          {shipments.length > 0 && (
            <div>
              <p className="code mb-2 uppercase tracking-[0.14em] text-ink-muted">{t('Shipments')}</p>
              <ul className="divide-y divide-line border-y border-line">
                {shipments.map((shipment) => (
                  <li key={shipment.number}>
                    <Link to={`/account/shipments/${shipment.number}`} className="code flex h-11 items-center justify-between underline-offset-4 hover:underline" dir="ltr">
                      {shipment.number}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link to="/account/documents" className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink">
            {t('Documents for this order')}
          </Link>
        </aside>
      </div>
    </div>
  );
}
