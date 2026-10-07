import { HANDLING_UNIT_KIND_LABEL, formatLocalDate, formatQuantity, metresNumber, quantityFromStored, todayIn, type ExportRow, type RunDetail } from '@basis/shared';
import { Button, CheckField, Dialog, Ledger, Panel, SelectField, Td, TextField, Th, Tr, cn } from '@basis/ui';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { EmailDialog } from '../../components/EmailDialog';
import { ExportMenu } from '../../components/ExportMenu';
import { usePackHandlingUnit } from '../../data/manufacturing';
import { isSample } from '../../data/source';
import { useDocument } from '../../lib/documents';
import { useT } from '../../i18n';

// Packing: rolls go into cartons, cartons onto pallets. Each unit carries
// its marks, dimensions and weights, so the packing list and the shipment
// read the same facts.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');
const kilos = (grams: number | null) => (grams === null ? '—' : `${(grams / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`);
const cbm = (milli: number | null) => (milli === null ? '—' : (milli / 1000).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 }));

export function PackDialog({ run, open, onClose }: { run: RunDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const pack = usePackHandlingUnit();
  const lotsWithRolls = run.lots.filter((lot) => lot.rolls.some((roll) => !roll.packedIn));
  const firstLot = lotsWithRolls[0];
  const putUp = firstLot?.putUp ?? null;
  const [form, setForm] = useState({
    kind: 'carton' as 'carton' | 'pallet',
    lotNumber: firstLot?.number ?? '',
    marks: '',
    lengthCm: putUp?.cartonLengthCm ? String(putUp.cartonLengthCm) : '',
    widthCm: putUp?.cartonWidthCm ? String(putUp.cartonWidthCm) : '',
    heightCm: putUp?.cartonHeightCm ? String(putUp.cartonHeightCm) : '',
    grossKg: '',
    netKg: '',
    packedOn: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string,
  });
  const lot = run.lots.find((candidate) => candidate.number === form.lotNumber);
  const unpacked = useMemo(() => lot?.rolls.filter((roll) => !roll.packedIn) ?? [], [lot]);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(unpacked.slice(0, putUp?.rollsPerCarton ?? 6).map((roll) => roll.number)));
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const chooseLot = (lotNumber: string) => {
    const next = run.lots.find((candidate) => candidate.number === lotNumber);
    const per = next?.putUp?.rollsPerCarton ?? 6;
    setForm((f) => ({ ...f, lotNumber }));
    setChosen(new Set((next?.rolls.filter((roll) => !roll.packedIn) ?? []).slice(0, per).map((roll) => roll.number)));
  };
  const takeNext = (count: number) => setChosen(new Set(unpacked.slice(0, count).map((roll) => roll.number)));
  const toggle = (number: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  const chosenMetres = unpacked.filter((roll) => chosen.has(roll.number)).reduce((total, roll) => total + BigInt(roll.measuredLength), 0n).toString();
  const grams = (value: string) => (value.trim() ? Math.round(Number(value) * 1000) : undefined);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (chosen.size === 0) return setError('Choose the rolls going in.');
    try {
      await pack.mutateAsync({
        runNumber: run.number,
        kind: form.kind,
        rollNumbers: [...chosen],
        marks: form.marks.trim() || undefined,
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        grossWeightG: grams(form.grossKg),
        netWeightG: grams(form.netKg),
        packedOn: form.packedOn || undefined,
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The carton could not be packed.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('Pack')} description={t('Rolls into a carton. The first carton starts the packing step on the run.')} className="w-[min(44rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <SelectField label={t('Unit')} value={form.kind} onChange={(event) => setForm((f) => ({ ...f, kind: event.target.value as 'carton' | 'pallet' }))}>
          <option value="carton">{t('Carton')}</option>
          <option value="pallet">{t('Pallet')}</option>
        </SelectField>
        <SelectField label={t('Lot')} required value={form.lotNumber} onChange={(event) => chooseLot(event.target.value)} className="sm:col-span-2">
          {lotsWithRolls.length === 0 && <option value="">{t('No unpacked rolls')}</option>}
          {lotsWithRolls.map((candidate) => (
            <option key={candidate.number} value={candidate.number}>
              {candidate.number} · {candidate.skuCode} · {candidate.rollCount - candidate.packedRollCount} rolls unpacked
            </option>
          ))}
        </SelectField>

        <fieldset className="sm:col-span-3">
          <legend className="caps mb-2 text-ink-soft">
            Rolls · {chosen.size} chosen, {metres(chosenMetres)}
          </legend>
          <div className="mb-2 flex flex-wrap gap-2">
            {[lot?.putUp?.rollsPerCarton ?? 6, 10, 12].map((count) => (
              <Button key={count} size="sm" onClick={() => takeNext(count)} disabled={unpacked.length === 0}>
                Next {count}
              </Button>
            ))}
            <Button size="sm" onClick={() => setChosen(new Set())} disabled={chosen.size === 0}>{t('Clear')}</Button>
          </div>
          <div className="grid max-h-48 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-xs border border-line bg-milk p-3 sm:grid-cols-3">
            {unpacked.map((roll) => (
              <CheckField key={roll.number} label={roll.number.slice(-2)} help={metres(roll.measuredLength)} checked={chosen.has(roll.number)} onChange={() => toggle(roll.number)} className="items-center" />
            ))}
            {unpacked.length === 0 && <p className="col-span-full text-[0.8125rem] text-ink-muted">{t('Every roll of this lot is packed.')}</p>}
          </div>
        </fieldset>

        <TextField label={t('Marks')} value={form.marks} onChange={set('marks')} placeholder={t('BASIS / BTL-160-MLK / 13 of 30')} className="sm:col-span-2" />
        <TextField label={t('Packed on')} type="date" value={form.packedOn} onChange={set('packedOn')} />
        <TextField label={t('Length')} type="number" unit="cm" value={form.lengthCm} onChange={set('lengthCm')} />
        <TextField label={t('Width')} type="number" unit="cm" value={form.widthCm} onChange={set('widthCm')} />
        <TextField label={t('Height')} type="number" unit="cm" value={form.heightCm} onChange={set('heightCm')} />
        <TextField label={t('Gross weight')} type="number" step="0.1" unit="kg" value={form.grossKg} onChange={set('grossKg')} />
        <TextField label={t('Net weight')} type="number" step="0.1" unit="kg" value={form.netKg} onChange={set('netKg')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={pack.isPending} busyLabel={t('Packing')} disabled={unpacked.length === 0}>
            {form.kind === 'carton' ? t('Pack carton') : t('Pack pallet')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** The cartons as export rows, for the CSV built in the browser. */
function unitRows(run: RunDetail): ExportRow[] {
  return run.handlingUnits.map((unit) => ({
    number: unit.number,
    run: run.number,
    kind: unit.kind,
    marks: unit.marks,
    lots: [...new Set(unit.contents.map((content) => content.lotNumber))].join(', '),
    skus: [...new Set(unit.contents.map((content) => content.skuCode))].join(', '),
    rolls: unit.contents.filter((content) => content.rollNumber).length,
    quantityM: metresNumber(unit.quantity),
    lengthCm: unit.lengthCm,
    widthCm: unit.widthCm,
    heightCm: unit.heightCm,
    cbm: unit.cbmMilli === null ? null : unit.cbmMilli / 1000,
    grossKg: unit.grossWeightG === null ? null : unit.grossWeightG / 1000,
    netKg: unit.netWeightG === null ? null : unit.netWeightG / 1000,
    packedOn: unit.packedOn,
  }));
}

export function PackingPanel({ run, manage }: { run: RunDetail; manage: boolean }) {
  const t = useT();
  const [packing, setPacking] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const pdf = useDocument();
  const units = run.handlingUnits;
  const rolls = units.reduce((total, unit) => total + unit.contents.filter((content) => content.rollNumber).length, 0);
  const quantity = units.reduce((total, unit) => total + BigInt(unit.quantity), 0n).toString();
  const cbmTotal = units.some((unit) => unit.cbmMilli !== null) ? units.reduce((total, unit) => total + (unit.cbmMilli ?? 0), 0) : null;
  const gross = units.some((unit) => unit.grossWeightG !== null) ? units.reduce((total, unit) => total + (unit.grossWeightG ?? 0), 0) : null;
  const unpacked = run.lots.reduce((total, lot) => total + (lot.rollCount - lot.packedRollCount), 0);

  return (
    <>
      <Panel
        title={t('Packing')}
        count={units.length}
        flush
        action={
          <span className="flex items-center gap-2">
            {pdf.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {pdf.error}
              </span>
            )}
            {units.length > 0 && <ExportMenu ledger="handling-units" scope={{ run: run.number }} rows={unitRows(run)} />}
            {!isSample && units.length > 0 && (
              <>
                <Button size="sm" onClick={() => pdf.open('packing-list', run.number)} busy={pdf.busy === 'packing-list'} busyLabel={t('Rendering')}>{t('Packing list')}</Button>
                <Button size="sm" onClick={() => pdf.share('packing-list', run.number, `Packing list ${run.number} from BASIS INC.`)} busy={pdf.busy === 'share:packing-list'} busyLabel={t('Sharing')}>{t('WhatsApp')}</Button>
                <Button size="sm" onClick={() => setEmailing(true)}>{t('Email')}</Button>
              </>
            )}
            {manage && run.state !== 'cancelled' && (
              <Button size="sm" variant="primary" onClick={() => setPacking(true)} disabled={unpacked === 0}>{t('Pack carton')}</Button>
            )}
          </span>
        }
      >
        {units.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">
            {run.lots.length === 0 ? 'Packing starts once a lot is recorded.' : `${unpacked} ${unpacked === 1 ? 'roll' : 'rolls'} waiting to be packed.`}
          </p>
        ) : (
          <Ledger caption={`Handling units of ${run.number}`}>
            <thead>
              <tr>
                <Th>{t('Unit')}</Th>
                <Th>{t('Kind')}</Th>
                <Th>{t('Marks')}</Th>
                <Th>{t('Lots')}</Th>
                <Th numeric>{t('Rolls')}</Th>
                <Th numeric>{t('Metres')}</Th>
                <Th>{t('Size')}</Th>
                <Th numeric>{t('CBM')}</Th>
                <Th numeric>{t('Gross')}</Th>
                <Th>{t('Packed')}</Th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <Tr key={unit.id}>
                  <Td className="code whitespace-nowrap">{unit.number}</Td>
                  <Td className="text-ink-soft">{t(HANDLING_UNIT_KIND_LABEL[unit.kind])}</Td>
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
                  <Td className="code whitespace-nowrap text-ink-soft">{unit.lengthCm && unit.widthCm && unit.heightCm ? `${unit.lengthCm}×${unit.widthCm}×${unit.heightCm}` : '—'}</Td>
                  <Td numeric className="text-ink-soft">{cbm(unit.cbmMilli)}</Td>
                  <Td numeric className="text-ink-soft">{kilos(unit.grossWeightG)}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">{dateOrDash(unit.packedOn)}</Td>
                </Tr>
              ))}
              <tr className="bg-bone">
                <Td className="font-medium" colSpan={4}>
                  {units.length} {units.length === 1 ? 'unit' : 'units'}
                  {unpacked > 0 && <span className={cn('ms-3 font-normal text-ink-muted')}>{unpacked} {unpacked === 1 ? 'roll' : 'rolls'} still unpacked</span>}
                </Td>
                <Td numeric className="font-medium">
                  {rolls}
                </Td>
                <Td numeric className="font-medium">
                  {metres(quantity)}
                </Td>
                <Td />
                <Td numeric className="font-medium">
                  {cbm(cbmTotal)}
                </Td>
                <Td numeric className="font-medium">
                  {kilos(gross)}
                </Td>
                <Td />
              </tr>
            </tbody>
          </Ledger>
        )}
      </Panel>
      {manage && <PackDialog key={packing ? 'pack-open' : 'pack-closed'} run={run} open={packing} onClose={() => setPacking(false)} />}
      {!isSample && <EmailDialog key={emailing ? 'email-open' : 'email-closed'} kind="packing-list" number={run.number} subject={`Packing list ${run.number} from BASIS INC.`} open={emailing} onClose={() => setEmailing(false)} />}
    </>
  );
}
