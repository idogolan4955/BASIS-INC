import { MANUAL_MOVEMENTS, MOVEMENT_REASON_LABEL, QUANTITY_DECIMALS, formatQuantity, legStatus, parseFixed, quantityFromStored, receiptCheck, todayIn, type LotDetail, type ManualMovement, type ShipmentDetail } from '@basis/shared';
import { Button, CheckField, Dialog, SelectField, TextArea, TextField } from '@basis/ui';
import { useMemo, useState, type FormEvent } from 'react';
import { useReceiveShipment, useRecordMovement, useRollPositions, useStockLocations } from '../../data/inventory';
import { useT } from '../../i18n';

// Stock enters through the receipt of a shipment and moves by hand
// afterwards: a transfer, a cut for samples, scrap, a return, an adjustment.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));

export function ReceiveDialog({ shipment, open, onClose }: { shipment: ShipmentDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const receive = useReceiveShipment();
  const locations = useStockLocations();
  const warehouses = (locations.data ?? []).filter((location) => location.kind === 'physical');
  const [form, setForm] = useState({ locationId: '', receivedOn: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string, note: '' });
  const [lines, setLines] = useState(() => shipment.lines.map((line) => ({ shipmentLineId: line.id, lotNumber: line.lotNumber, skuCode: line.skuCode, expected: line.quantity, received: (Number(line.quantity) / 1000).toString(), include: true, note: '' })));
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const setLine = (index: number, patch: Partial<(typeof lines)[number]>) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const locationId = form.locationId || warehouses.find((location) => location.isDefault)?.id || warehouses[0]?.id || '';
  const main = shipment.legs.find((leg) => leg.type === 'main_carriage') ?? shipment.legs[shipment.legs.length - 1];
  const arrived = !main || legStatus(main) === 'arrived';
  const rollsOf = (lotNumber: string) => shipment.units.flatMap((unit) => unit.contents.filter((content) => content.lotNumber === lotNumber && content.rollNumber)).length;
  const check = useMemo(() => {
    try {
      return receiptCheck(lines.filter((line) => line.include).map((line) => ({ shipmentLineId: line.shipmentLineId, lotNumber: line.lotNumber, expected: line.expected, received: parseFixed(line.received || '0', QUANTITY_DECIMALS).toString() })));
    } catch {
      return [];
    }
  }, [lines]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!locationId) return setError(t('Choose the warehouse.'));
    const chosen = lines.filter((line) => line.include);
    if (chosen.length === 0) return setError(t('Choose at least one line.'));
    try {
      await receive.mutateAsync({
        number: shipment.number,
        locationId,
        receivedOn: form.receivedOn || undefined,
        note: form.note.trim() || undefined,
        lines: chosen.map((line) => ({ shipmentLineId: line.shipmentLineId, receivedQuantity: rollsOf(line.lotNumber) > 0 ? undefined : parseFixed(line.received || '0', QUANTITY_DECIMALS).toString(), note: line.note.trim() || undefined })),
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The shipment could not be received.'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('Receive {number}', { number: shipment.number })} description={t('Goods into a warehouse, line by line. Rolls are placed one by one; a lot without rolls is received by the metres counted. Every line received closes the shipment.')} className="w-[min(46rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {!arrived && <p className="rounded-xs border border-caution/40 bg-caution/10 px-3 py-2 text-[0.8125rem] text-ink sm:col-span-2">{t('The main carriage has not arrived yet; record its arrival on the Route tab first.')}</p>}
        <SelectField label={t('Into')} required value={locationId} onChange={set('locationId')}>
          {warehouses.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
              {location.zone ? ` · ${location.zone}` : ''}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Received on')} type="date" value={form.receivedOn} onChange={set('receivedOn')} />
        <fieldset className="sm:col-span-2">
          <legend className="caps mb-2 text-ink-soft">{t('Lines')}</legend>
          <div className="grid gap-3">
            {lines.map((line, index) => {
              const rolls = rollsOf(line.lotNumber);
              const result = check.find((candidate) => candidate.shipmentLineId === line.shipmentLineId);
              return (
                <div key={line.shipmentLineId} className="grid items-end gap-3 rounded-xs border border-line bg-milk p-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
                  <CheckField label={`${line.lotNumber} · ${line.skuCode}`} help={rolls > 0 ? t('{rolls} rolls loaded, {metres}', { rolls, metres: metres(line.expected) }) : t('{metres} loaded', { metres: metres(line.expected) })} checked={line.include} onChange={(event) => setLine(index, { include: event.target.checked })} className="items-center" />
                  {rolls > 0 ? (
                    <p className="text-[0.8125rem] text-ink-muted">{t('Every roll loaded is placed.')}</p>
                  ) : (
                    <TextField label={t('Counted')} unit="m" value={line.received} onChange={(event) => setLine(index, { received: event.target.value })} inputMode="decimal" disabled={!line.include} error={result && (result.short || result.over) ? t('{percent} % against what was loaded', { percent: result.differencePercent.toFixed(1) }) : undefined} />
                  )}
                  <TextField label={t('Note')} value={line.note} onChange={(event) => setLine(index, { note: event.target.value })} placeholder={t('Two cartons water-marked')} disabled={!line.include} />
                </div>
              );
            })}
          </div>
        </fieldset>
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={receive.isPending} busyLabel={t('Receiving')} disabled={!arrived}>{t('Receive')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function MoveDialog({ lot, open, onClose }: { lot: LotDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const move = useRecordMovement();
  const locations = useStockLocations();
  const positions = useRollPositions(lot.number);
  const [form, setForm] = useState({ kind: 'transfer' as ManualMovement, rollNumber: '', quantity: '', fromLocationId: '', toLocationId: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const physical = (locations.data ?? []).filter((location) => location.kind === 'physical');
  const placed = (positions.data ?? []).filter((roll) => roll.locationId && roll.remainingLength !== '0');
  const roll = placed.find((candidate) => candidate.number === form.rollNumber);
  const wholeRoll = Boolean(roll) && (form.kind === 'transfer' || form.kind === 'return' || form.kind === 'scrap');
  const needsFrom = form.kind === 'transfer' || form.kind === 'sample_cut' || form.kind === 'scrap';
  const needsTo = form.kind === 'transfer' || form.kind === 'return' || form.kind === 'adjust';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let quantity: string | undefined;
    try {
      quantity = form.quantity.trim() ? parseFixed(form.quantity, QUANTITY_DECIMALS).toString() : undefined;
    } catch {
      return setError(t('Metres with up to three decimals.'));
    }
    if (!wholeRoll && !quantity) return setError(t('How many metres.'));
    try {
      await move.mutateAsync({ kind: form.kind, lotNumber: lot.number, rollNumber: form.rollNumber || undefined, quantity, fromLocationId: form.fromLocationId || roll?.locationId || undefined, toLocationId: form.toLocationId || undefined, note: form.note.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The movement could not be recorded.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Move stock')} description={t('A transfer between places, a cut for samples, scrap, a return, or an adjustment after a count. Each is a line in the ledger with a reason.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('What')} value={form.kind} onChange={set('kind')}>
          {MANUAL_MOVEMENTS.map((kind) => (
            <option key={kind} value={kind}>
              {t(MOVEMENT_REASON_LABEL[kind])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Roll')} value={form.rollNumber} onChange={set('rollNumber')} help={placed.length === 0 ? t('No roll of this lot is placed; move by metres.') : undefined}>
          <option value="">{t('By metres, not a roll')}</option>
          {placed.map((candidate) => (
            <option key={candidate.number} value={candidate.number}>
              {candidate.number.slice(-2)} · {candidate.locationName} · {metres(candidate.remainingLength ?? '0')}
            </option>
          ))}
        </SelectField>
        {needsFrom && !roll && (
          <SelectField label={t('From')} value={form.fromLocationId} onChange={set('fromLocationId')}>
            <option value="">{t('Choose a place')}</option>
            {physical.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </SelectField>
        )}
        {needsTo && (
          <SelectField label={form.kind === 'adjust' ? t('Place') : t('To')} value={form.toLocationId} onChange={set('toLocationId')}>
            <option value="">{t('Choose a place')}</option>
            {physical.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </SelectField>
        )}
        {!wholeRoll && <TextField label={form.kind === 'adjust' ? t('Difference') : t('Metres')} unit="m" value={form.quantity} onChange={set('quantity')} inputMode="decimal" placeholder={form.kind === 'adjust' ? '-1.2' : '1.5'} help={form.kind === 'adjust' ? t('Positive adds to the place, negative takes from it.') : roll ? t('{metres} left on the roll', { metres: metres(roll.remainingLength ?? '0') }) : undefined} />}
        <TextArea label={t('Reason')} required value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" placeholder={t('Swatches for Maison Avelline')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={move.isPending} busyLabel={t('Recording')}>{t('Record movement')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
