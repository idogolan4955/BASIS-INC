import { shipmentArrival } from '@basis/shared';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { call, openDocument, read, useRead } from './data';
import { Back, Button, Chip, Facts, Failed, Loading, PageTitle, portalMeta } from './frame';
import { Alert } from './fields';
import { date, qty } from './format';
import { useLocale, useT } from './i18n';
import { HEALTH, LEG, MODE, PLACE, REFERENCE, SHIPMENT_STATE } from './labels';

export const meta = () => portalMeta('Shipment');

interface DocumentRow {
  readonly id: string;
  readonly title: string;
  readonly record: string;
  readonly href: string;
}

export default function ShipmentPage() {
  const t = useT();
  const { locale } = useLocale();
  const { number = '' } = useParams();
  const loaded = useRead(async () => {
    const [data, carried, docs] = await Promise.all([
      read((sdk, dc) => sdk.customerShipmentRef(dc, { number })),
      read((sdk, dc) => sdk.customerShipmentLinesRef(dc, { number })),
      call<object, { documents: DocumentRow[] }>('customerDocuments', {}).catch(() => ({ documents: [] as DocumentRow[] })),
    ]);
    return { shipment: data.shipments[0], lines: carried.shipments[0]?.lines ?? [], documents: docs.documents.filter((doc) => doc.record === number) };
  }, [number]);
  const [error, setError] = useState('');
  if (loaded.loading && !loaded.data) return <Loading />;
  if (loaded.error) return <Failed message={loaded.error} onRetry={loaded.reload} />;
  const { shipment, lines, documents } = loaded.data!;
  if (!shipment) {
    return (
      <div>
        <Back to="/account/shipments">{t('Shipments')}</Back>
        <Failed message={t('There is no shipment {number} in your account.', { number })} />
      </div>
    );
  }
  const arrival = shipmentArrival(shipment.legs);
  const standing = shipment.state === 'closed' ? { label: 'Delivered', tone: 'positive' as const } : shipment.state === 'booked' ? (HEALTH[shipment.health] ?? HEALTH['on_track']!) : { label: SHIPMENT_STATE[shipment.state] ?? shipment.state, tone: 'neutral' as const };
  const place = (location: { type: string; city?: string | null; locationCode?: string | null } | null | undefined) => (location ? [t(PLACE[location.type] ?? location.type), location.city, location.locationCode].filter(Boolean).join(' · ') : '—');
  return (
    <div>
      <Back to="/account/shipments">{t('Shipments')}</Back>
      <PageTitle title={t('Shipment')}>
        <span className="code text-ink" dir="ltr">
          {shipment.number}
        </span>
        <span className="ms-3 inline-block align-middle">
          <Chip tone={standing.tone}>{t(standing.label)}</Chip>
        </span>
      </PageTitle>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          <p className="code mb-3 uppercase tracking-[0.14em] text-ink-muted">{t('The journey')}</p>
          <ol className="border-t border-charcoal/70">
            {shipment.legs.map((leg) => {
              const done = Boolean(leg.ata);
              const underway = !done && Boolean(leg.atd);
              return (
                <li key={leg.sequence} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b border-line py-4">
                  <span className="flex flex-col items-center pt-1">
                    <span aria-hidden="true" className={`size-3 ${done ? 'bg-charcoal' : underway ? 'bg-nude-deep' : 'border border-charcoal/50'}`} />
                    <span className="code mt-2 text-ink-muted">{String(leg.sequence).padStart(2, '0')}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t(LEG[leg.type] ?? leg.type)} <span className="text-ink-muted">· {t(MODE[leg.mode] ?? leg.mode)}</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {place(leg.fromLocation)} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span> {place(leg.toLocation)}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {leg.atd ? t('left {date}', { date: date(leg.atd, locale) }) : t('leaves {date}', { date: date(leg.etd ?? leg.plannedEtd, locale) })} ·{' '}
                      {leg.ata ? t('arrived {date}', { date: date(leg.ata, locale) }) : t('arrives {date}', { date: date(leg.eta ?? leg.plannedEta, locale) })}
                    </p>
                    {(leg.vessel || leg.provider) && (
                      <p className="mt-1 text-sm text-ink-muted">
                        {[leg.provider?.tradingName || leg.provider?.legalName, leg.vessel, leg.voyage].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="code mb-3 mt-10 uppercase tracking-[0.14em] text-ink-muted">{t('What it carries for you')}</p>
          <ul className="border-t border-charcoal/70">
            {lines.map((line, index) => (
              <li key={index} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line py-3">
                <span>
                  {line.salesOrderLine?.sku.product.name}{' '}
                  <span className="text-ink-soft">
                    {line.salesOrderLine?.sku.shade.name} · <span className="code" dir="ltr">{line.salesOrderLine?.sku.code}</span>
                  </span>
                </span>
                <span className="code" dir="ltr">
                  {qty(line.quantity, line.uom)}
                  {line.salesOrderLine && (
                    <Link to={`/account/orders/${line.salesOrderLine.order.number}`} className="ms-3 text-ink-muted underline underline-offset-4">
                      {line.salesOrderLine.order.number}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="grid content-start gap-6">
          <Facts
            rows={[
              { k: arrival.arrived ? t('Arrived') : t('Expected'), v: date(arrival.date, locale) },
              { k: t('By'), v: t(MODE[shipment.mode] ?? shipment.mode) },
              { k: t('From'), v: place(shipment.origin) },
              { k: t('To'), v: [shipment.destination.name, shipment.destination.city, shipment.destination.country?.name].filter(Boolean).join(', ') },
              { k: t('Delivery terms'), v: <span dir="ltr">{[shipment.incoterm?.code, shipment.namedPlace].filter(Boolean).join(' ') || '—'}</span> },
              ...shipment.references.map((reference) => ({ k: t(REFERENCE[reference.type] ?? reference.type), v: <span className="code" dir="ltr">{reference.value}</span> })),
            ]}
          />
          {documents.length > 0 && (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <Button key={doc.id} variant="secondary" onClick={() => void openDocument(doc.href, doc.title).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t('The document could not be opened.')))}>
                  {doc.title}
                </Button>
              ))}
            </div>
          )}
          {error && <Alert>{error}</Alert>}
        </aside>
      </div>
    </div>
  );
}
