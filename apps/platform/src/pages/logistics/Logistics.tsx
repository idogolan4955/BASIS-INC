import {
  HEALTH_LABEL,
  HEALTH_TONE,
  LOAD_TYPES,
  LOAD_TYPE_LABEL,
  SHIPMENT_FLOWS,
  SHIPMENT_FLOW_LABEL,
  SHIPMENT_STAGE_LABEL,
  SHIPMENT_STAGE_TONE,
  TRANSPORT_MODES,
  TRANSPORT_MODE_LABEL,
  addDays,
  daysBetween,
  defaultLegs,
  formatLocalDate,
  formatQuantity,
  metresNumber,
  modeLabel,
  quantityFromStored,
  todayIn,
  type LegType,
  type LoadType,
  type LocalDate,
  type ShipmentFlow,
  type ShipmentLane,
  type ShipmentSummary,
  type TransportMode,
  LEG_TYPE_LABEL,
} from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { ExportMenu } from '../../components/ExportMenu';
import { Lane } from '../../components/Lane';
import { DOCUMENT_KIND_LABEL } from '../../data/documents';
import { useCreateShipment, useDocumentRequirements, usePlaces, useShipments } from '../../data/logistics';
import { useCompanies } from '../../data/parties';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 07 Logistics: shipments, the arrivals board and what a shipment
// must carry. Stage, position and health are read from the legs.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const short = (date: LocalDate | null) => (date ? formatLocalDate(date).slice(0, 6) : '—');
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];

export function LogisticsTabs({ active }: { active: 'shipments' | 'arrivals' | 'requirements' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Logistics sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('shipments', '/logistics', t('Shipments'))}
      {tab('arrivals', '/logistics/arrivals', t('Arrivals'))}
      {tab('requirements', '/logistics/requirements', t('Document requirements'))}
    </nav>
  );
}

/** A shipment as the Gateway's lane reads it. */
export function laneOf(shipment: ShipmentSummary, today: LocalDate): ShipmentLane {
  return {
    number: shipment.number,
    path: `/logistics/shipments/${shipment.number}`,
    mode: modeLabel(shipment.mode, shipment.loadType),
    origin: { code: shipment.originCode, name: shipment.originName },
    destination: { code: shipment.destinationCode, name: shipment.destinationName },
    stage: shipment.stage,
    health: shipment.health,
    etd: shipment.etd ?? today,
    eta: shipment.eta ?? today,
    progress: shipment.progress,
  };
}

export function NewShipmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const create = useCreateShipment();
  const places = usePlaces();
  const companies = useCompanies();
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [form, setForm] = useState({ flow: 'inbound' as ShipmentFlow, mode: 'sea' as TransportMode, loadType: 'lcl' as LoadType, incotermCode: 'FOB', namedPlace: '', originId: '', destinationId: '', forwarderId: '', consigneeName: '', departure: addDays(today, 14) as string, notes: '' });
  const [legs, setLegs] = useState<{ type: LegType; plannedEtd: string; plannedEta: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const forwarders = (companies.data ?? []).filter((company) => company.roles.includes('freight_forwarder') || company.roles.includes('carrier'));
  const origins = (places.data ?? []).filter((place) => place.type !== 'customer_site');
  const planned = useMemo(() => legs ?? (form.departure ? defaultLegs(form.mode, form.departure as LocalDate).map((leg) => ({ type: leg.type, plannedEtd: leg.plannedEtd as string, plannedEta: leg.plannedEta as string })) : []), [legs, form.mode, form.departure]);
  const setLeg = (index: number, key: 'plannedEtd' | 'plannedEta', value: string) => setLegs(planned.map((leg, i) => (i === index ? { ...leg, [key]: value } : leg)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.originId) return setError(t('Choose where the goods leave from.'));
    if (!form.destinationId) return setError(t('Choose where the goods are going.'));
    if (form.originId === form.destinationId) return setError(t('Origin and destination are the same place.'));
    try {
      const { number } = await create.mutateAsync({
        flow: form.flow,
        mode: form.mode,
        loadType: form.mode === 'sea' ? form.loadType : 'none',
        incotermCode: form.incotermCode || undefined,
        namedPlace: form.namedPlace.trim() || undefined,
        originId: form.originId,
        destinationId: form.destinationId,
        forwarderId: form.forwarderId || undefined,
        consigneeName: form.consigneeName.trim() || undefined,
        notes: form.notes.trim() || undefined,
        legs: planned,
      });
      onClose();
      navigate(`/logistics/shipments/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The shipment could not be opened.'));
    }
  };

  const placeLabel = (place: { name: string; city: string; countryName: string; locationCode: string }) => `${place.name}${place.city && place.city !== place.name ? `, ${place.city}` : ''}${place.countryName ? ` · ${place.countryName}` : ''}${place.locationCode ? ` (${place.locationCode})` : ''}`;

  return (
    <Dialog open={open} onClose={onClose} title={t('New shipment')} description={t('Opens as a draft with the usual legs for its mode laid out from the departure. Load the packages, then book it.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <SelectField label={t('Flow')} value={form.flow} onChange={set('flow')}>
          {SHIPMENT_FLOWS.map((flow) => (
            <option key={flow} value={flow}>
              {t(SHIPMENT_FLOW_LABEL[flow])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Mode')} value={form.mode} onChange={(event) => { setLegs(null); setForm((f) => ({ ...f, mode: event.target.value as TransportMode })); }}>
          {TRANSPORT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(TRANSPORT_MODE_LABEL[mode])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Load')} value={form.loadType} onChange={set('loadType')} disabled={form.mode !== 'sea'}>
          {LOAD_TYPES.filter((load) => load !== 'none').map((load) => (
            <option key={load} value={load}>
              {LOAD_TYPE_LABEL[load]}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Origin')} required value={form.originId} onChange={set('originId')} className="sm:col-span-3">
          <option value="">{t('Choose a place')}</option>
          {origins.map((place) => (
            <option key={place.id} value={place.id}>
              {placeLabel(place)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Destination')} required value={form.destinationId} onChange={set('destinationId')} className="sm:col-span-3">
          <option value="">{t('Choose a place')}</option>
          {(places.data ?? []).map((place) => (
            <option key={place.id} value={place.id}>
              {placeLabel(place)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Incoterm')} value={form.incotermCode} onChange={set('incotermCode')}>
          {INCOTERMS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Named place')} value={form.namedPlace} onChange={set('namedPlace')} placeholder={t('Ningbo')} />
        <SelectField label={t('Forwarder')} value={form.forwarderId} onChange={set('forwarderId')}>
          <option value="">{t('Not yet')}</option>
          {forwarders.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Consignee')} value={form.consigneeName} onChange={set('consigneeName')} placeholder="BASIS INC." className="sm:col-span-2" />
        <TextField label={t('Departure')} type="date" value={form.departure} onChange={(event) => { setLegs(null); set('departure')(event); }} help={t('The main carriage leaves on this date; the legs follow from it.')} />

        <fieldset className="border-t border-line pt-4 sm:col-span-3">
          <legend className="caps mb-3 text-ink-soft">{t('Legs')}</legend>
          <div className="grid gap-2">
            {planned.map((leg, index) => (
              <div key={`${leg.type}-${index}`} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <p className="text-sm">
                  <span className="code me-2 text-ink-muted">{String(index + 1).padStart(2, '0')}</span>
                  {t(LEG_TYPE_LABEL[leg.type])}
                </p>
                <TextField label={t('Departs')} type="date" value={leg.plannedEtd} onChange={(event) => setLeg(index, 'plannedEtd', event.target.value)} />
                <TextField label={t('Arrives')} type="date" value={leg.plannedEta} onChange={(event) => setLeg(index, 'plannedEta', event.target.value)} />
              </div>
            ))}
          </div>
        </fieldset>
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} rows={2} className="sm:col-span-3" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Opening')}>{t('Open shipment')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

const STAGE_ORDER = { customs: 0, in_transit: 1, arrived: 2, booked: 3, draft: 4, delivered: 5, cancelled: 6 } as const;

export function Shipments() {
  const t = useT();
  const session = useRequiredSession();
  const shipments = useShipments();
  const [creating, setCreating] = useState(false);
  const manage = ['owner', 'operations', 'logistics'].includes(session.role);
  const rows = shipments.data ?? [];
  const sorted = [...rows].sort((a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || (a.eta ?? '').localeCompare(b.eta ?? ''));
  const moving = rows.filter((shipment) => shipment.stage === 'in_transit' || shipment.stage === 'customs' || shipment.stage === 'arrived');
  return (
    <>
      <ModuleTitle
        number="07"
        title={t('Logistics')}
        actions={
          <>
            <ExportMenu
              ledger="shipments"
              size="md"
              rows={rows.map((shipment) => ({ number: shipment.number, state: shipment.state, stage: shipment.stage, health: shipment.health, flow: shipment.flow, mode: modeLabel(shipment.mode, shipment.loadType), incoterm: shipment.incoterm || null, origin: shipment.originName, destination: shipment.destinationName, forwarder: shipment.forwarderName || null, etd: shipment.etd, eta: shipment.eta, plannedEta: shipment.plannedEta, orders: shipment.purchaseOrderNumbers.join(', '), cartons: shipment.totals.cartons, rolls: shipment.totals.rolls, quantityM: metresNumber(shipment.totals.metres), cbm: shipment.totals.cbmMilli === null ? null : shipment.totals.cbmMilli / 1000, grossKg: shipment.totals.grossWeightG === null ? null : shipment.totals.grossWeightG / 1000 }))}
            />
            {manage && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden="true" />
                {t('New shipment')}
              </Button>
            )}
          </>
        }
      >
        {t('Goods on the move, in customs or waiting to leave. Where a shipment is follows from its legs; nothing here is set by hand.')}
      </ModuleTitle>
      <LogisticsTabs active="shipments" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Shipments')} count={moving.length} flush>
          {shipments.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading shipments')}</p>
          ) : shipments.error ? (
            <p className="px-5 py-8 text-critical">Shipments could not be loaded. {shipments.error.message}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No shipments yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New shipment')}</Button> : undefined}>
                {t('A shipment carries packed, released cartons from a factory to a destination along its legs. Open one, load it, book it.')}
              </EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Shipments')}>
              <thead>
                <tr>
                  <Th>{t('Shipment')}</Th>
                  <Th>{t('Route')}</Th>
                  <Th>{t('Mode')}</Th>
                  <Th>{t('Carries')}</Th>
                  <Th numeric>{t('Cartons')}</Th>
                  <Th numeric>{t('Metres')}</Th>
                  <Th>{t('ETD')}</Th>
                  <Th>{t('ETA')}</Th>
                  <Th>{t('Stage')}</Th>
                  <Th>{t('Health')}</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((shipment) => {
                  const slip = shipment.eta && shipment.plannedEta ? daysBetween(shipment.plannedEta, shipment.eta) : 0;
                  return (
                    <Tr key={shipment.id}>
                      <Td>
                        <Link to={`/logistics/shipments/${shipment.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {shipment.number}
                        </Link>
                      </Td>
                      <Td>
                        <span className="code whitespace-nowrap" dir="ltr">
                          {shipment.originCode} → {shipment.destinationCode}
                        </span>
                        <span className="block text-[0.8125rem] text-ink-muted">
                          {shipment.originName} – {shipment.destinationName}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">{modeLabel(shipment.mode, shipment.loadType)}</Td>
                      <Td>
                        <span className="block font-medium">{shipment.products.join(', ') || '—'}</span>
                        <span className="code text-ink-muted">{shipment.purchaseOrderNumbers.join(', ')}</span>
                      </Td>
                      <Td numeric>{shipment.totals.cartons || '—'}</Td>
                      <Td numeric>{metres(shipment.totals.metres)}</Td>
                      <Td className="code whitespace-nowrap text-ink-soft">{short(shipment.etd)}</Td>
                      <Td className={cn('code whitespace-nowrap', slip > 0 ? 'text-critical' : 'text-ink-soft')}>
                        {short(shipment.eta)}
                        {slip > 0 && <span className="ms-1">+{slip}d</span>}
                      </Td>
                      <Td>
                        <StatusChip tone={SHIPMENT_STAGE_TONE[shipment.stage]}>{t(SHIPMENT_STAGE_LABEL[shipment.stage])}</StatusChip>
                      </Td>
                      <Td>{shipment.state === 'booked' ? <StatusChip tone={HEALTH_TONE[shipment.health]}>{t(HEALTH_LABEL[shipment.health])}</StatusChip> : <span className="text-ink-muted">—</span>}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <NewShipmentDialog key={creating ? 'open' : 'closed'} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

/** The arrivals board: every booked shipment on its lane, soonest arrival first. */
export function Arrivals() {
  const t = useT();
  const shipments = useShipments();
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const rows = (shipments.data ?? []).filter((shipment) => shipment.state === 'booked' && shipment.stage !== 'delivered').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  const weeks = [...new Set(rows.map((shipment) => (shipment.eta ? Math.max(0, Math.floor(daysBetween(today, shipment.eta) / 7)) : 0)))];
  return (
    <>
      <ModuleTitle number="07" title={t('Logistics')}>
        {t('What arrives when. Each lane is a shipment on its route; the mark is where it is today.')}
      </ModuleTitle>
      <LogisticsTabs active="arrivals" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {shipments.isPending ? (
          <p className="text-ink-muted">{t('Loading shipments')}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t('Nothing on the way')}>{t('Booked shipments appear here as lanes, soonest arrival first.')}</EmptyState>
        ) : (
          weeks.map((week) => {
            const inWeek = rows.filter((shipment) => (shipment.eta ? Math.max(0, Math.floor(daysBetween(today, shipment.eta) / 7)) : 0) === week);
            const title = week === 0 ? t('This week') : week === 1 ? t('Next week') : t('In {weeks} weeks', { weeks: week });
            return (
              <Panel key={week} title={title} count={inWeek.length}>
                <ul>
                  {inWeek.map((shipment) => (
                    <Lane key={shipment.number} shipment={laneOf(shipment, today)} />
                  ))}
                </ul>
              </Panel>
            );
          })
        )}
      </div>
    </>
  );
}

export function Requirements() {
  const t = useT();
  const requirements = useDocumentRequirements();
  const rows = requirements.data ?? [];
  return (
    <>
      <ModuleTitle number="07" title={t('Logistics')}>
        {t('What a shipment must carry, by mode, flow and destination. A missing document before departure raises an alert.')}
      </ModuleTitle>
      <LogisticsTabs active="requirements" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Document requirements')} count={rows.length} flush>
          {requirements.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading requirements')}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-ink-muted">{t('No requirements are set. The seed adds the usual ones: invoice and packing list for every inbound shipment, a bill of lading by sea, an air waybill by air.')}</p>
          ) : (
            <Ledger caption={t('Document requirements')}>
              <thead>
                <tr>
                  <Th>{t('Document')}</Th>
                  <Th>{t('Mode')}</Th>
                  <Th>{t('Flow')}</Th>
                  <Th>{t('Destination')}</Th>
                  <Th numeric>{t('Days before departure')}</Th>
                  <Th>{t('Note')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((rule) => (
                  <Tr key={rule.id}>
                    <Td className="font-medium">{t(DOCUMENT_KIND_LABEL[rule.documentKind] ?? rule.documentKind)}</Td>
                    <Td className="text-ink-soft">{rule.mode ? t(TRANSPORT_MODE_LABEL[rule.mode]) : t('Any')}</Td>
                    <Td className="text-ink-soft">{rule.flow ? t(SHIPMENT_FLOW_LABEL[rule.flow]) : t('Any')}</Td>
                    <Td className="text-ink-soft">{rule.destinationCountryName || rule.destinationCountry || t('Any')}</Td>
                    <Td numeric>{rule.daysBeforeEtd}</Td>
                    <Td className="text-ink-soft">{rule.note || '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
    </>
  );
}
