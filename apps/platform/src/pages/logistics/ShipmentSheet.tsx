import {
  HANDLING_UNIT_KIND_LABEL,
  HEALTH_LABEL,
  HEALTH_TONE,
  LEG_TYPE_LABEL,
  REFERENCE_TYPES,
  REFERENCE_TYPE_LABEL,
  SHIPMENT_FLOW_LABEL,
  SHIPMENT_STAGE_LABEL,
  SHIPMENT_STAGE_TONE,
  SHIPMENT_STATE_LABEL,
  SHIPMENT_STATE_TONE,
  daysBetween,
  documentsCheck,
  expectedEta,
  expectedEtd,
  formatLocalDate,
  formatQuantity,
  legStatus,
  modeLabel,
  quantityFromStored,
  todayIn,
  type LegView,
  type LocalDate,
  type ReferenceType,
  type ShipmentDetail,
} from '@basis/shared';
import { Button, CheckField, Dialog, LabelHeader, Ledger, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextArea, TextField, Th, Timeline, Tr, Track, cn, sheetTabClass, type TrackStep } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { DocumentsPanel } from '../../components/DocumentsPanel';
import { EmailDialog } from '../../components/EmailDialog';
import { Lane } from '../../components/Lane';
import { DOCUMENT_KIND_LABEL, useDocumentsFor } from '../../data/documents';
import { useAssignUnits, useBookShipment, useCancelShipment, useDocumentRequirements, useRemoveUnits, useShipment, useShippableUnits, useUpdateLeg, useUpdateShipment } from '../../data/logistics';
import { isSample } from '../../data/source';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useT } from '../../i18n';
import { useDocument } from '../../lib/documents';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { laneOf } from './Logistics';

// The shipment sheet: its route as a track of legs, what it carries, the
// documents it must have, and its timeline. Legs record what happened; the
// stage, the position and the health follow.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const short = (date: LocalDate | null) => (date ? formatLocalDate(date).slice(0, 6) : '—');
const dateOrDash = (value: LocalDate | null) => (value ? formatLocalDate(value) : '—');
const kilos = (grams: number | null) => (grams === null ? '—' : `${(grams / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`);
const cbm = (milli: number | null) => (milli === null ? '—' : (milli / 1000).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 }));

function legSteps(legs: readonly LegView[], today: LocalDate, t: (text: string) => string): TrackStep[] {
  return legs.map((leg) => {
    const status = legStatus(leg);
    const eta = expectedEta(leg);
    const slipped = Boolean(eta && leg.plannedEta && daysBetween(leg.plannedEta, eta) > 0);
    const overdue = status !== 'arrived' && Boolean(status === 'underway' ? eta && daysBetween(eta, today) > 0 : expectedEtd(leg) && daysBetween(expectedEtd(leg)!, today) > 0);
    return {
      key: leg.id,
      label: t(LEG_TYPE_LABEL[leg.type]),
      state: status === 'arrived' ? 'done' : status === 'underway' ? 'active' : 'pending',
      caption: leg.ata ? short(leg.ata) : slipped ? `${short(leg.plannedEta)} → ${short(eta)}` : short(eta),
      late: status !== 'arrived' && (slipped || overdue),
    };
  });
}

function LegDialog({ shipment, leg, onClose }: { shipment: ShipmentDetail; leg: LegView | null; onClose: () => void }) {
  const t = useT();
  const update = useUpdateLeg();
  const [form, setForm] = useState({ etd: leg?.etd ?? '', eta: leg?.eta ?? '', atd: leg?.atd ?? '', ata: leg?.ata ?? '', vessel: leg?.vessel ?? '', voyage: leg?.voyage ?? '', note: leg?.note ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!leg) return;
    setError(null);
    try {
      await update.mutateAsync({ number: shipment.number, legId: leg.id, etd: form.etd || null, eta: form.eta || null, atd: form.atd || null, ata: form.ata || null, vessel: form.vessel.trim() || null, voyage: form.voyage.trim() || null, note: form.note.trim() || null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The leg could not be updated.'));
    }
  };
  return (
    <Dialog open={leg !== null} onClose={onClose} title={leg ? t(LEG_TYPE_LABEL[leg.type]) : ''} description={leg ? `${t('Planned')} ${dateOrDash(leg.plannedEtd)} – ${dateOrDash(leg.plannedEta)}. ${t('What happened, or what is now expected; the shipment reads its stage and health from here.')}` : undefined}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Departed')} type="date" value={form.atd} onChange={set('atd')} help={t('Recorded when it left.')} />
        <TextField label={t('Arrived')} type="date" value={form.ata} onChange={set('ata')} help={t('Recorded when it got there.')} />
        <TextField label={t('Now expected to depart')} type="date" value={form.etd} onChange={set('etd')} disabled={Boolean(form.atd)} help={t('Leave empty when the plan holds.')} />
        <TextField label={t('Now expected to arrive')} type="date" value={form.eta} onChange={set('eta')} disabled={Boolean(form.ata)} />
        <TextField label={leg?.mode === 'air' ? t('Flight') : leg?.mode === 'sea' ? t('Vessel') : t('Carrier')} value={form.vessel} onChange={set('vessel')} placeholder={leg?.mode === 'sea' ? 'MSC Aurora' : leg?.mode === 'air' ? 'CX 0840' : ''} />
        <TextField label={t('Voyage')} value={form.voyage} onChange={set('voyage')} placeholder="042W" />
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" placeholder={t('Transshipment missed the connection; next sailing six days later')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel={t('Saving')}>{t('Save leg')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function RoutePanel({ shipment, manage, today }: { shipment: ShipmentDetail; manage: boolean; today: LocalDate }) {
  const t = useT();
  const [editing, setEditing] = useState<LegView | null>(null);
  return (
    <>
      <Panel title={t('Route')}>
        <ul className="mb-5">
          <Lane shipment={laneOf(shipment, today)} />
        </ul>
        <Track steps={legSteps(shipment.legs, today, t)} />
      </Panel>
      <Panel title={t('Legs')} count={shipment.legs.length} flush>
        <Ledger caption={`Legs of ${shipment.number}`}>
          <thead>
            <tr>
              <Th className="w-14">{t('No.')}</Th>
              <Th>{t('Leg')}</Th>
              <Th>{t('From')}</Th>
              <Th>{t('To')}</Th>
              <Th>{t('Planned')}</Th>
              <Th>{t('Expected')}</Th>
              <Th>{t('Actual')}</Th>
              <Th>{t('Carrier')}</Th>
              <Th>{t('State')}</Th>
              {manage && <Th>{t('Update')}</Th>}
            </tr>
          </thead>
          <tbody>
            {shipment.legs.map((leg) => {
              const status = legStatus(leg);
              const eta = expectedEta(leg);
              const slipped = Boolean(eta && leg.plannedEta && daysBetween(leg.plannedEta, eta) > 0);
              return (
                <Tr key={leg.id}>
                  <Td className="code text-ink-muted">{String(leg.sequence).padStart(2, '0')}</Td>
                  <Td className="font-medium">
                    {t(LEG_TYPE_LABEL[leg.type])}
                    {leg.note && <span className="block text-[0.8125rem] font-normal text-ink-muted">{leg.note}</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">{leg.fromName || '—'}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">{leg.toName || '—'}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">
                    {short(leg.plannedEtd)} – {short(leg.plannedEta)}
                  </Td>
                  <Td className={cn('code whitespace-nowrap', status !== 'arrived' && slipped ? 'text-critical' : 'text-ink-soft')}>{status === 'arrived' ? '—' : `${short(expectedEtd(leg))} – ${short(eta)}`}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">{leg.atd || leg.ata ? `${short(leg.atd)} – ${short(leg.ata)}` : '—'}</Td>
                  <Td className="text-ink-soft">
                    {leg.vessel ? `${leg.vessel}${leg.voyage ? ` ${leg.voyage}` : ''}` : leg.providerName || '—'}
                  </Td>
                  <Td>
                    <StatusChip tone={status === 'arrived' ? 'positive' : status === 'underway' ? 'transit' : slipped ? 'caution' : 'neutral'}>{status === 'arrived' ? t('Arrived') : status === 'underway' ? t('Underway') : t('Pending')}</StatusChip>
                  </Td>
                  {manage && (
                    <Td>
                      <Button size="sm" variant="quiet" onClick={() => setEditing(leg)} disabled={shipment.state !== 'booked'}>{t('Update')}</Button>
                    </Td>
                  )}
                </Tr>
              );
            })}
          </tbody>
        </Ledger>
      </Panel>
      {manage && <LegDialog key={editing?.id ?? 'none'} shipment={shipment} leg={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function LoadDialog({ shipment, open, onClose }: { shipment: ShipmentDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const assign = useAssignUnits();
  const shippable = useShippableUnits(open);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const units = shippable.data ?? [];
  const toggle = (number: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  const chosenMetres = units.filter((unit) => chosen.has(unit.number)).reduce((sum, unit) => sum + BigInt(unit.quantity), 0n).toString();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (chosen.size === 0) return setError(t('Choose the packages going on.'));
    try {
      await assign.mutateAsync({ number: shipment.number, unitNumbers: [...chosen] });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The packages could not be loaded.'));
    }
  };
  const groups = [...new Set(units.map((unit) => unit.runNumber))];
  return (
    <Dialog open={open} onClose={onClose} title={t('Load packages')} description={t('Cartons and pallets packed on a run and not yet on a shipment. Only released lots travel; the lines follow from what is loaded.')} className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4">
        {shippable.isPending ? (
          <p className="text-ink-muted">{t('Looking for packed cartons')}</p>
        ) : units.length === 0 ? (
          <p className="text-ink-muted">{t('Nothing is packed and waiting. Cartons appear here once a run packs them.')}</p>
        ) : (
          groups.map((run) => {
            const inRun = units.filter((unit) => unit.runNumber === run);
            const first = inRun[0]!;
            const ready = inRun.filter((unit) => unit.released);
            return (
              <fieldset key={run}>
                <legend className="mb-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                  <span className="code">{run}</span>
                  <span className="font-medium">{first.products.join(', ')}</span>
                  <span className="text-ink-muted">
                    {first.supplierName} · {first.purchaseOrderNumber}
                  </span>
                  {ready.length > 0 && (
                    <Button size="sm" onClick={() => setChosen((current) => new Set([...current, ...ready.map((unit) => unit.number)]))}>
                      {t('All released')}
                    </Button>
                  )}
                </legend>
                <div className="grid max-h-56 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded-xs border border-line bg-milk p-3 sm:grid-cols-2">
                  {inRun.map((unit) => (
                    <CheckField
                      key={unit.number}
                      label={`${unit.number} · ${t(HANDLING_UNIT_KIND_LABEL[unit.kind])}`}
                      help={`${unit.lots.join(', ')} · ${unit.contents.filter((content) => content.rollNumber).length} ${t('rolls')} · ${metres(unit.quantity)}${unit.released ? '' : ` · ${t('not released')}`}`}
                      checked={chosen.has(unit.number)}
                      disabled={!unit.released}
                      onChange={() => toggle(unit.number)}
                      className={cn('items-center', !unit.released && 'opacity-50')}
                    />
                  ))}
                </div>
              </fieldset>
            );
          })
        )}
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="me-auto text-[0.8125rem] text-ink-muted">
            {chosen.size} {t('chosen')}, {metres(chosenMetres)}
          </span>
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={assign.isPending} busyLabel={t('Loading')} disabled={chosen.size === 0}>{t('Load')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ContentsPanel({ shipment, manage }: { shipment: ShipmentDetail; manage: boolean }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const remove = useRemoveUnits();
  const departed = shipment.legs.some((leg) => legStatus(leg) !== 'pending');
  const canLoad = manage && (shipment.state === 'draft' || shipment.state === 'booked') && !departed;
  return (
    <>
      <Panel title={t('Lines')} count={shipment.lines.length} flush>
        {shipment.lines.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('Nothing loaded yet. Lines follow from the packages: one per purchase-order line and lot.')}</p>
        ) : (
          <Ledger caption={`Lines of ${shipment.number}`}>
            <thead>
              <tr>
                <Th>{t('Order')}</Th>
                <Th>{t('Lot')}</Th>
                <Th>{t('SKU')}</Th>
                <Th>{t('Product')}</Th>
                <Th numeric>{t('Metres')}</Th>
              </tr>
            </thead>
            <tbody>
              {shipment.lines.map((line) => (
                <Tr key={line.id}>
                  <Td>
                    <Link to={`/manufacturing/purchase-orders/${line.purchaseOrderNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {line.purchaseOrderNumber}
                    </Link>
                    <span className="code ms-2 text-ink-muted">{line.purchaseOrderLineNo ? `· ${line.purchaseOrderLineNo}` : ''}</span>
                  </Td>
                  <Td>
                    <Link to={`/inventory/lots/${line.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {line.lotNumber}
                    </Link>
                  </Td>
                  <Td className="code whitespace-nowrap">{line.skuCode}</Td>
                  <Td>
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <ShadeDot hex={line.shadeHex} name={line.shadeName} code={line.shadeCode} size="sm" />
                      {line.productName}, {line.shadeName}
                    </span>
                  </Td>
                  <Td numeric>{metres(line.quantity)}</Td>
                </Tr>
              ))}
              <tr className="bg-bone">
                <Td className="font-medium" colSpan={4}>
                  {shipment.lines.length} {t('lines')}
                </Td>
                <Td numeric className="font-medium">
                  {metres(shipment.totals.metres)}
                </Td>
              </tr>
            </tbody>
          </Ledger>
        )}
      </Panel>
      <Panel
        title={t('Packages')}
        count={shipment.units.length}
        flush
        action={
          <span className="flex items-center gap-2">
            {remove.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {remove.error.message}
              </span>
            )}
            {canLoad && (
              <Button size="sm" variant="primary" onClick={() => setLoading(true)}>{t('Load packages')}</Button>
            )}
          </span>
        }
      >
        {shipment.units.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{departed ? t('No packages were recorded on this shipment.') : t('Load the cartons and pallets that go. Only released, packed lots can be loaded.')}</p>
        ) : (
          <Ledger caption={`Packages on ${shipment.number}`}>
            <thead>
              <tr>
                <Th>{t('Package')}</Th>
                <Th>{t('Kind')}</Th>
                <Th>{t('Run')}</Th>
                <Th>{t('Marks')}</Th>
                <Th>{t('Lots')}</Th>
                <Th numeric>{t('Rolls')}</Th>
                <Th numeric>{t('Metres')}</Th>
                <Th numeric>{t('CBM')}</Th>
                <Th numeric>{t('Gross')}</Th>
                {canLoad && <Th>{t('Remove')}</Th>}
              </tr>
            </thead>
            <tbody>
              {shipment.units.map((unit) => (
                <Tr key={unit.id}>
                  <Td className="code whitespace-nowrap">
                    {unit.number}
                    {unit.parentNumber && <span className="ms-2 text-ink-muted">on {unit.parentNumber}</span>}
                  </Td>
                  <Td className="text-ink-soft">{t(HANDLING_UNIT_KIND_LABEL[unit.kind])}</Td>
                  <Td>
                    {unit.runNumber ? (
                      <Link to={`/manufacturing/runs/${unit.runNumber}/packing`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {unit.runNumber}
                      </Link>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </Td>
                  <Td className="text-ink-soft">{unit.marks || '—'}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-x-3">
                      {[...new Set(unit.contents.map((content) => content.lotNumber))].map((lotNumber) => (
                        <Link key={lotNumber} to={`/inventory/lots/${lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {lotNumber}
                        </Link>
                      ))}
                    </span>
                  </Td>
                  <Td numeric>{unit.contents.filter((content) => content.rollNumber).length || '—'}</Td>
                  <Td numeric>{metres(unit.quantity)}</Td>
                  <Td numeric className="text-ink-soft">{cbm(unit.cbmMilli)}</Td>
                  <Td numeric className="text-ink-soft">{kilos(unit.grossWeightG)}</Td>
                  {canLoad && (
                    <Td>
                      <Button size="sm" variant="quiet" onClick={() => remove.mutate({ number: shipment.number, unitNumbers: [unit.number] })} busy={remove.isPending && remove.variables?.unitNumbers[0] === unit.number} busyLabel={t('Removing')}>{t('Remove')}</Button>
                    </Td>
                  )}
                </Tr>
              ))}
              <tr className="bg-bone">
                <Td className="font-medium" colSpan={5}>
                  {shipment.totals.cartons} {t('cartons')}
                  {shipment.totals.pallets > 0 && `, ${shipment.totals.pallets} ${t('pallets')}`}
                </Td>
                <Td numeric className="font-medium">
                  {shipment.totals.rolls}
                </Td>
                <Td numeric className="font-medium">
                  {metres(shipment.totals.metres)}
                </Td>
                <Td numeric className="font-medium">
                  {cbm(shipment.totals.cbmMilli)}
                </Td>
                <Td numeric className="font-medium">
                  {kilos(shipment.totals.grossWeightG)}
                </Td>
                {canLoad && <Td />}
              </tr>
            </tbody>
          </Ledger>
        )}
      </Panel>
      {canLoad && <LoadDialog key={loading ? 'load-open' : 'load-closed'} shipment={shipment} open={loading} onClose={() => setLoading(false)} />}
    </>
  );
}

function DetailsDialog({ shipment, open, onClose }: { shipment: ShipmentDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const update = useUpdateShipment();
  const [form, setForm] = useState({ namedPlace: shipment.namedPlace, consigneeName: shipment.consigneeName, notes: shipment.notes });
  const [references, setReferences] = useState<{ type: ReferenceType; value: string }[]>(shipment.references.length > 0 ? shipment.references.map((reference) => ({ type: reference.type, value: reference.value })) : [{ type: shipment.mode === 'air' ? 'awb' : 'booking', value: '' }]);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const setReference = (index: number, key: 'type' | 'value', value: string) => setReferences((current) => current.map((reference, i) => (i === index ? { ...reference, [key]: value } : reference)));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ number: shipment.number, namedPlace: form.namedPlace.trim() || null, consigneeName: form.consigneeName.trim() || null, notes: form.notes.trim() || null, references: references.filter((reference) => reference.value.trim()).map((reference) => ({ type: reference.type, value: reference.value.trim() })) });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The shipment could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Details and references')} description={t('Booking, bill of lading, air waybill, container and seal numbers, as the forwarder reports them.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Named place')} value={form.namedPlace} onChange={set('namedPlace')} />
        <TextField label={t('Consignee')} value={form.consigneeName} onChange={set('consigneeName')} />
        <fieldset className="sm:col-span-2">
          <legend className="caps mb-2 text-ink-soft">{t('References')}</legend>
          <div className="grid gap-2">
            {references.map((reference, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <SelectField label={index === 0 ? t('Type') : t('Type')} value={reference.type} onChange={(event) => setReference(index, 'type', event.target.value)}>
                  {REFERENCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(REFERENCE_TYPE_LABEL[type])}
                    </option>
                  ))}
                </SelectField>
                <TextField label={t('Number')} value={reference.value} onChange={(event) => setReference(index, 'value', event.target.value)} />
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2" onClick={() => setReferences((current) => [...current, { type: 'container', value: '' }])}>{t('Add reference')}</Button>
        </fieldset>
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} rows={3} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function RequirementsPanel({ shipment, today }: { shipment: ShipmentDetail; today: LocalDate }) {
  const t = useT();
  const rules = useDocumentRequirements();
  const documents = useDocumentsFor('shipment', shipment.number);
  const check = documentsCheck(rules.data ?? [], { mode: shipment.mode, flow: shipment.flow, destinationCountry: shipment.destinationCountry, etd: shipment.etd }, (documents.data ?? []).map((document) => document.kind), today);
  const missing = check.filter((item) => !item.filed);
  return (
    <Panel title={t('Required documents')} count={check.length}>
      {rules.isPending || documents.isPending ? (
        <p className="text-ink-muted">{t('Checking requirements')}</p>
      ) : check.length === 0 ? (
        <p className="text-ink-muted">{t('No rule applies to this shipment.')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {check.map((item) => (
            <li key={item.documentKind} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
              <StatusChip tone={item.filed ? 'positive' : item.overdue ? 'critical' : 'caution'}>{item.filed ? t('On file') : item.overdue ? t('Overdue') : t('Missing')}</StatusChip>
              <span className="font-medium">{t(DOCUMENT_KIND_LABEL[item.documentKind] ?? item.documentKind)}</span>
              {item.dueOn && (
                <span className="code text-ink-muted">
                  {t('by')} {formatLocalDate(item.dueOn)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && <p className="mt-3 text-[0.8125rem] text-ink-muted">{t('File the packing list below; upload the rest in Documents once Storage is enabled.')}</p>}
    </Panel>
  );
}

function ShipmentTimeline({ number }: { number: string }) {
  const t = useT();
  const timeline = useTimeline('shipment', number);
  const note = useRecordNote('shipment', number);
  return (
    <Panel title={t('Timeline')} count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function ShipmentSheet({ tab }: { tab: 'route' | 'contents' | 'documents' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const shipment = useShipment(number);
  const book = useBookShipment();
  const cancel = useCancelShipment();
  const pdf = useDocument();
  const [editing, setEditing] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manage = ['owner', 'operations', 'logistics'].includes(session.role);
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

  if (shipment.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading shipment')}</p>;
  if (shipment.error) return <p className="px-5 py-10 text-critical lg:px-8">The shipment could not be loaded. {shipment.error.message}</p>;
  if (!shipment.data) return <NotFound what={t('shipment')} />;
  const data = shipment.data;
  const base = `/logistics/shipments/${data.number}`;
  const slip = data.eta && data.plannedEta ? daysBetween(data.plannedEta, data.eta) : 0;
  const departed = data.legs.some((leg) => legStatus(leg) !== 'pending');
  const act = async (run: () => Promise<unknown>, fallback: string) => {
    setError(null);
    try {
      await run();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : fallback);
    }
  };

  return (
    <>
      <LabelHeader
        code={data.number}
        title={`${data.originName} → ${data.destinationName}`}
        subtitle={
          <>
            {modeLabel(data.mode, data.loadType)} · {t(SHIPMENT_FLOW_LABEL[data.flow])}
            {data.incoterm ? ` · ${[data.incoterm, data.namedPlace].filter(Boolean).join(' ')}` : ''}
            {data.forwarderName ? ` · ${data.forwarderName}` : ''}
            {data.purchaseOrderNumbers.length > 0 && (
              <>
                {' · '}
                {data.purchaseOrderNumbers.map((po, index) => (
                  <span key={po}>
                    {index > 0 && ', '}
                    <Link to={`/manufacturing/purchase-orders/${po}`} className="code underline decoration-line-strong underline-offset-4">
                      {po}
                    </Link>
                  </span>
                ))}
              </>
            )}
          </>
        }
        status={
          <>
            <StatusChip tone={SHIPMENT_STATE_TONE[data.state]}>{t(SHIPMENT_STATE_LABEL[data.state])}</StatusChip>
            {data.state === 'booked' && <StatusChip tone={SHIPMENT_STAGE_TONE[data.stage]}>{t(SHIPMENT_STAGE_LABEL[data.stage])}</StatusChip>}
            {data.state === 'booked' && <StatusChip tone={HEALTH_TONE[data.health]}>{t(HEALTH_LABEL[data.health])}</StatusChip>}
            {data.references.length > 0 && (
              <span className="code text-ink-muted" dir="ltr">
                {data.references.map((reference) => `${REFERENCE_TYPE_LABEL[reference.type]} ${reference.value}`).join(' · ')}
              </span>
            )}
            {(error || pdf.error) && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {error ?? pdf.error}
              </span>
            )}
          </>
        }
        facts={[
          { label: t('ETD'), value: dateOrDash(data.etd) },
          { label: t('ETA'), value: <span className={cn(slip > 0 && 'text-critical')}>{dateOrDash(data.eta)}{slip > 0 ? ` (+${slip}d)` : ''}</span> },
          { label: t('Cartons'), value: `${data.totals.cartons}${data.totals.pallets ? ` on ${data.totals.pallets} pallets` : ''}${data.totals.rolls ? ` · ${data.totals.rolls} rolls` : ''}` },
          { label: t('Metres'), value: metres(data.totals.metres) },
          { label: t('CBM'), value: cbm(data.totals.cbmMilli) },
          { label: t('Gross'), value: kilos(data.totals.grossWeightG) },
        ]}
        actions={
          manage && (
            <>
              {data.state === 'draft' && (
                <Button variant="primary" onClick={() => act(() => book.mutateAsync({ number: data.number }), t('The shipment could not be booked.'))} busy={book.isPending} busyLabel={t('Booking')} disabled={data.units.length === 0}>
                  {t('Book')}
                </Button>
              )}
              {(data.state === 'draft' || data.state === 'booked') && <Button onClick={() => setEditing(true)}>{t('Details')}</Button>}
              {(data.state === 'draft' || data.state === 'booked') && !departed && (
                <Button onClick={() => act(() => cancel.mutateAsync({ number: data.number }), t('The shipment could not be cancelled.'))} busy={cancel.isPending} busyLabel={t('Cancelling')}>
                  {t('Cancel shipment')}
                </Button>
              )}
            </>
          )
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Route')}</NavLink>
        <NavLink to={`${base}/contents`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Contents')}</NavLink>
        <NavLink to={`${base}/documents`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Documents')}</NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Timeline')}</NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'route' && <RoutePanel shipment={data} manage={manage} today={today} />}
        {tab === 'contents' && <ContentsPanel shipment={data} manage={manage} />}
        {tab === 'documents' && (
          <>
            <RequirementsPanel shipment={data} today={today} />
            {!isSample && data.units.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => pdf.open('shipment-packing-list', data.number)} busy={pdf.busy === 'shipment-packing-list'} busyLabel={t('Rendering')}>{t('Packing list')}</Button>
                <Button size="sm" onClick={() => pdf.share('shipment-packing-list', data.number, `Packing list ${data.number} from BASIS INC.`)} busy={pdf.busy === 'share:shipment-packing-list'} busyLabel={t('Sharing')}>{t('WhatsApp')}</Button>
                <Button size="sm" onClick={() => setEmailing(true)}>{t('Email')}</Button>
              </div>
            )}
            <DocumentsPanel entityType="shipment" entityId={data.number} generated={[{ kind: 'shipment-packing-list', label: 'packing list', available: data.units.length > 0 }]} canFile={manage} shareText={`Packing list ${data.number} from BASIS INC.`} />
          </>
        )}
        {tab === 'timeline' && <ShipmentTimeline number={data.number} />}
      </div>
      {manage && <DetailsDialog key={editing ? 'details-open' : 'details-closed'} shipment={data} open={editing} onClose={() => setEditing(false)} />}
      {!isSample && <EmailDialog key={emailing ? 'email-open' : 'email-closed'} kind="shipment-packing-list" number={data.number} subject={`Packing list ${data.number} from BASIS INC.`} open={emailing} onClose={() => setEmailing(false)} />}
    </>
  );
}
