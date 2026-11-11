import { invoiceOutstanding, invoiceStanding, orderShippedPercent, quoteTotal, shippedQuantity, type LocalDate } from '@basis/shared';
import { Link, useParams } from 'react-router';
import { read, useRead } from './data';
import { Back, Cell, Chip, Facts, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date, money, qty, today } from './format';
import { useLocale, useT } from './i18n';
import { INVOICE, ORDER } from './labels';
import { Lines } from './lines';
import { IN_APP } from '../native/platform';
import { Group, GroupRow } from '../native/ui';

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
  const lineRows = order.lines.map((line) => {
    const sent = shippedQuantity(line);
    // In the app the words run in the page's direction and the quantity is isolated left to right inside them.
    const extra = IN_APP ? <span className="app-row-subtitle text-nude-deep">{t('{quantity} shipped', { quantity: `\u2066${qty(sent, line.uom)}\u2069` })}</span> : <span className="code mt-1 block text-sm text-nude-deep" dir="ltr">{t('{quantity} shipped', { quantity: qty(sent, line.uom) })}</span>;
    return { key: line.lineNo, sku: line.sku, quantity: line.quantity, unitPrice: line.unitPrice, uom: line.uom, extra: BigInt(sent) > 0n ? extra : undefined };
  });
  if (IN_APP) {
    return (
      <div>
        <Back to="/account/orders">{t('Orders')}</Back>
        <PageTitle title={t('Order')} record={order.number}>
          <Chip tone={state.tone}>{t(state.label)}</Chip>
        </PageTitle>
        <Group>
          <div className="app-row flex-col items-stretch gap-2">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-ink-soft">{t('Shipped')}</span>
              <span className="app-row-value code" dir="ltr">
                {shipped}%
              </span>
            </span>
            <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10">
              <span className="block h-full rounded-full bg-nude-deep" style={{ width: `${shipped}%` }} />
            </span>
          </div>
        </Group>
        <Lines currency={order.currency} total={quoteTotal(order.lines)} totalLabel={t('Total')} lines={lineRows} />
        {shipments.length > 0 && (
          <Group header={t('Shipments')}>
            {shipments.map((shipment) => (
              <GroupRow key={shipment.number} to={`/account/shipments/${shipment.number}`} title={<span className="code" dir="ltr">{shipment.number}</span>} />
            ))}
          </Group>
        )}
        {order.invoices.length > 0 && (
          <Group header={t('Invoices')}>
            {order.invoices.map((invoice) => {
              const standing = INVOICE[invoiceStanding(invoice, now)];
              return (
                <GroupRow
                  key={invoice.number}
                  title={<span className="code" dir="ltr">{invoice.number}</span>}
                  subtitle={t('Due {date}', { date: date(invoice.dueOn, locale) })}
                  trailing={
                    <span className="grid justify-items-end gap-1">
                      <span className="code text-ink" dir="ltr">
                        {money(invoiceOutstanding(invoice), invoice.currency)}
                      </span>
                      <Chip tone={standing.tone}>{t(standing.label)}</Chip>
                    </span>
                  }
                />
              );
            })}
          </Group>
        )}
        <Facts
          header={t('Terms')}
          rows={[
            { k: t('Confirmed'), v: date(order.confirmedOn, locale) },
            { k: t('Wanted by'), v: date(order.requestedDelivery, locale) },
            { k: t('Delivery terms'), v: <span dir="ltr">{[order.incoterm?.code, order.namedPlace].filter(Boolean).join(' ') || '—'}</span> },
            { k: t('Payment'), v: order.paymentTerms || '—' },
          ]}
        />
        {(order.shipToName || order.shipToAddress) && (
          <Group header={t('Ship to')}>
            <GroupRow title={<bdi>{order.shipToName || order.shipToAddress}</bdi>} subtitle={order.shipToName && order.shipToAddress ? <bdi>{order.shipToAddress}</bdi> : undefined} />
          </Group>
        )}
        <Group>
          {order.quote && <GroupRow to={`/account/quotes/${order.quote.number}`} title={t('From quote')} trailing={<span className="code" dir="ltr">{order.quote.number}</span>} />}
          <GroupRow to="/account/documents" title={t('Documents for this order')} />
        </Group>
      </div>
    );
  }
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
          <Lines currency={order.currency} total={quoteTotal(order.lines)} totalLabel={t('Total')} lines={lineRows} />
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
