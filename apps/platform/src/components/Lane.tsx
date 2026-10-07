import { HEALTH_LABEL, HEALTH_TONE, SHIPMENT_STAGE_LABEL, SHIPMENT_STAGE_TONE, formatLocalDate, type LocalDate, type ShipmentLane } from '@basis/shared';
import { StatusChip, cn } from '@basis/ui';
import { Link } from 'react-router';
import { useT } from '../i18n';

// A route lane: origin code, destination code, the position along the
// route and the dates. The same grammar as the production timeline, in
// place of a map.

const shortDate = (date: LocalDate) => formatLocalDate(date).slice(0, 6);

export function Lane({ shipment }: { shipment: ShipmentLane }) {
  const t = useT();
  const position = `${Math.max(0, Math.min(1, shipment.progress)) * 100}%`;
  const late = shipment.health === 'delayed' || shipment.health === 'blocked';
  return (
    <li className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-baseline gap-3">
          <Link to={shipment.path} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            {shipment.number}
          </Link>
          <span className="text-[0.8125rem] text-ink-muted">{shipment.mode}</span>
        </div>
        <div className="flex items-center gap-4">
          {shipment.health !== 'on_track' && <StatusChip tone={HEALTH_TONE[shipment.health]}>{t(HEALTH_LABEL[shipment.health])}</StatusChip>}
          <StatusChip tone={SHIPMENT_STAGE_TONE[shipment.stage]}>{t(SHIPMENT_STAGE_LABEL[shipment.stage])}</StatusChip>
        </div>
      </div>
      <div role="img" aria-label={`${Math.round(shipment.progress * 100)} percent of the way from ${shipment.origin.name} to ${shipment.destination.name}`} className="mt-3 flex items-center gap-3" dir="ltr">
        <span className="code text-ink">{shipment.origin.code}</span>
        <span className="relative h-px flex-1 bg-line-strong">
          <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: position }} />
          <span className={cn('absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2', late ? 'rotate-45 bg-critical' : 'bg-ink')} style={{ left: position }} />
        </span>
        <span className="code text-ink">{shipment.destination.code}</span>
      </div>
      <div className="code mt-2 flex justify-between gap-4 text-ink-muted" dir="ltr">
        <span>
          {shipment.origin.name}, ETD {shortDate(shipment.etd)}
        </span>
        <span className="text-right">
          ETA {shortDate(shipment.eta)}, {shipment.destination.name}
        </span>
      </div>
    </li>
  );
}
