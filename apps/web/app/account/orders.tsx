import { quoteTotal } from '@basis/shared';
import { read, useRead } from './data';
import { Cell, Chip, Empty, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date, money } from './format';
import { useLocale, useT } from './i18n';
import { ORDER } from './labels';

export const meta = () => portalMeta('Orders');

export default function Orders() {
  const t = useT();
  const { locale } = useLocale();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerOrdersRef(dc)), []);
  return (
    <div>
      <PageTitle title={t('Orders')}>{t('Your orders with BASIS, from confirmation to delivery.')}</PageTitle>
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : loaded.data!.salesOrders.length === 0 ? (
        <Empty>{t('No orders yet. Accept a quote and its order appears here.')}</Empty>
      ) : (
        <Ledger head={[t('Order'), t('Confirmed'), t('Wanted by'), t('Total'), t('Standing')]}>
          {loaded.data!.salesOrders.map((order) => {
            const state = ORDER[order.state] ?? { label: order.state, tone: 'neutral' as const };
            return (
              <Row
                key={order.number}
                to={`/account/orders/${order.number}`}
                app={{
                  title: <span className="code" dir="ltr">{order.number}</span>,
                  subtitle: (
                    <>
                      <span className="code" dir="ltr">
                        {money(quoteTotal(order.lines), order.currency)}
                      </span>
                      {order.requestedDelivery ? ` · ${t('Wanted by')} ${date(order.requestedDelivery, locale)}` : ''}
                    </>
                  ),
                  trailing: <Chip tone={state.tone}>{t(state.label)}</Chip>,
                }}
              >
                <Cell code>{order.number}</Cell>
                <Cell>{date(order.confirmedOn, locale)}</Cell>
                <Cell>{date(order.requestedDelivery, locale)}</Cell>
                <Cell code>{money(quoteTotal(order.lines), order.currency)}</Cell>
                <Cell>
                  <Chip tone={state.tone}>{t(state.label)}</Chip>
                </Cell>
              </Row>
            );
          })}
        </Ledger>
      )}
    </div>
  );
}
