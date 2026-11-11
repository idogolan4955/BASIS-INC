import { shipmentArrival } from '@basis/shared';
import { read, useRead } from './data';
import { Cell, Chip, Empty, Failed, Ledger, Loading, PageTitle, Row, portalMeta } from './frame';
import { date } from './format';
import { useLocale, useT } from './i18n';
import { HEALTH, MODE, SHIPMENT_STATE } from './labels';

export const meta = () => portalMeta('Shipments');

export default function Shipments() {
  const t = useT();
  const { locale } = useLocale();
  const loaded = useRead(() => read((sdk, dc) => sdk.customerShipmentsRef(dc)), []);
  return (
    <div>
      <PageTitle title={t('Shipments')}>{t('Your goods on their way, leg by leg, with the dates the carriers report.')}</PageTitle>
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : loaded.data!.shipments.length === 0 ? (
        <Empty>{t('No shipments yet. When your goods leave, the shipment is here to follow.')}</Empty>
      ) : (
        <Ledger head={[t('Shipment'), t('By'), t('To'), t('Arrival'), t('Standing')]}>
          {loaded.data!.shipments.map((shipment) => {
            const arrival = shipmentArrival(shipment.legs);
            const health = shipment.state === 'closed' ? { label: 'Delivered', tone: 'positive' as const } : shipment.state === 'booked' ? (HEALTH[shipment.health] ?? HEALTH['on_track']!) : { label: SHIPMENT_STATE[shipment.state] ?? shipment.state, tone: 'neutral' as const };
            return (
              <Row
                key={shipment.number}
                to={`/account/shipments/${shipment.number}`}
                app={{
                  title: <span className="code" dir="ltr">{shipment.number}</span>,
                  subtitle: (
                    <>
                      {[t(MODE[shipment.mode] ?? shipment.mode), [shipment.destination.city, shipment.destination.country?.name].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                      {arrival.date && (
                        <span className="block">
                          {arrival.arrived ? t('Arrived') : t('Expected')} {date(arrival.date, locale)}
                        </span>
                      )}
                    </>
                  ),
                  trailing: <Chip tone={health.tone}>{t(health.label)}</Chip>,
                }}
              >
                <Cell code>{shipment.number}</Cell>
                <Cell>{t(MODE[shipment.mode] ?? shipment.mode)}</Cell>
                <Cell>{[shipment.destination.city, shipment.destination.country?.name].filter(Boolean).join(', ') || '—'}</Cell>
                <Cell>{arrival.date ? `${date(arrival.date, locale)}${arrival.arrived ? '' : ` (${t('expected')})`}` : '—'}</Cell>
                <Cell>
                  <Chip tone={health.tone}>{t(health.label)}</Chip>
                </Cell>
              </Row>
            );
          })}
        </Ledger>
      )}
    </div>
  );
}
