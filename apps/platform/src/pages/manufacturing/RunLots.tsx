import { LOT_QUALITY_LABEL, LOT_QUALITY_TONE, QUANTITY_DECIMALS, formatLocalDate, formatQuantity, parseFixed, quantityFromStored, todayIn, type RunDetail } from '@basis/shared';
import { Button, Dialog, Ledger, Panel, SelectField, ShadeDot, StatusChip, Td, TextArea, TextField, Th, Tr } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useRecordLot } from '../../data/manufacturing';
import { useT } from '../../i18n';

// What the run has produced: lots, each with its rolls, each on its way
// through quality and into cartons.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

export function RecordLotDialog({ run, open, onClose }: { run: RunDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const record = useRecordLot();
  const first = run.lines[0];
  const [form, setForm] = useState({
    skuCode: first?.skuCode ?? '',
    millLotRef: '',
    producedOn: todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone) as string,
    rollCount: String(first?.putUp?.rollsPerCarton ? first.putUp.rollsPerCarton * 5 : 10),
    nominalLength: String(first?.putUp?.rollLengthM ?? 50),
    usableWidthCm: '',
    measured: '',
    producedQuantity: '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const line = run.lines.find((candidate) => candidate.skuCode === form.skuCode);

  const chooseSku = (skuCode: string) => {
    const next = run.lines.find((candidate) => candidate.skuCode === skuCode);
    setForm((f) => ({ ...f, skuCode, nominalLength: String(next?.putUp?.rollLengthM ?? f.nominalLength) }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!line) return setError('Choose the SKU.');
    const width = form.usableWidthCm ? Number(form.usableWidthCm) : undefined;
    let rolls: { measuredLength: string; usableWidthCm?: number }[] | undefined;
    let producedQuantity: string | undefined;
    try {
      if (line.rollTracking) {
        const measured = form.measured
          .split(/[\s,;]+/)
          .map((value) => value.trim())
          .filter(Boolean);
        const lengths = measured.length > 0 ? measured : Array.from({ length: Number(form.rollCount) || 0 }, () => form.nominalLength);
        if (lengths.length === 0) return setError('How many rolls, or their measured lengths.');
        if (lengths.length > 500) return setError('A lot holds up to 500 rolls here; split it.');
        rolls = lengths.map((value) => ({ measuredLength: parseFixed(value, QUANTITY_DECIMALS).toString(), ...(width ? { usableWidthCm: width } : {}) }));
      } else {
        producedQuantity = parseFixed(form.producedQuantity, QUANTITY_DECIMALS).toString();
      }
    } catch {
      return setError('Lengths are metres with up to three decimals.');
    }
    try {
      await record.mutateAsync({ runNumber: run.number, skuCode: form.skuCode, millLotRef: form.millLotRef.trim() || undefined, producedOn: form.producedOn || undefined, rolls, producedQuantity });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The lot could not be recorded.');
    }
  };

  const measuredCount = form.measured.split(/[\s,;]+/).filter((value) => value.trim()).length;

  return (
    <Dialog open={open} onClose={onClose} title={t('Record lot')} description={t('What came off the line, as the mill reports it. Quality comes next; packing after that.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('SKU')} required value={form.skuCode} onChange={(event) => chooseSku(event.target.value)} className="sm:col-span-2">
          {run.lines.map((candidate) => (
            <option key={candidate.skuCode} value={candidate.skuCode}>
              {candidate.skuCode} · {candidate.productName}, {candidate.shadeName}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Mill lot reference')} value={form.millLotRef} onChange={set('millLotRef')} placeholder="LR-7731" />
        <TextField label={t('Produced on')} type="date" value={form.producedOn} onChange={set('producedOn')} />
        {line?.rollTracking ? (
          <>
            <TextField label={t('Rolls')} type="number" min={1} max={500} value={form.rollCount} onChange={set('rollCount')} disabled={measuredCount > 0} />
            <TextField label={t('Nominal length')} unit="m" value={form.nominalLength} onChange={set('nominalLength')} disabled={measuredCount > 0} help={t('Each roll is recorded at this length unless measured below.')} />
            <TextField label={t('Usable width')} type="number" unit="cm" value={form.usableWidthCm} onChange={set('usableWidthCm')} />
            <TextArea
              label={t('Measured lengths')}
              value={form.measured}
              onChange={set('measured')}
              rows={3}
              placeholder="50.2 49.8 50.1 …"
              help={measuredCount > 0 ? t('{count} rolls from the measured lengths.', { count: measuredCount }) : t('One length per roll, when the winder reports them.')}
              className="sm:col-span-2"
            />
          </>
        ) : (
          <TextField label={t('Produced quantity')} required unit="m" value={form.producedQuantity} onChange={set('producedQuantity')} className="sm:col-span-2" />
        )}
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={record.isPending} busyLabel={t('Recording')}>{t('Record lot')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function LotsPanel({ run, manage }: { run: RunDetail; manage: boolean }) {
  const t = useT();
  const [recording, setRecording] = useState(false);
  return (
    <>
      <Panel title={t('Lots')} count={run.lots.length} flush action={manage && run.state !== 'cancelled' && <Button size="sm" onClick={() => setRecording(true)}>{t('Record lot')}</Button>}>
        {run.lots.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No lots yet. A lot is recorded as the mill reports it, with its rolls; quality releases it, packing makes it ready to ship.')}</p>
        ) : (
          <Ledger caption={`Lots of ${run.number}`}>
            <thead>
              <tr>
                <Th>{t('Lot')}</Th>
                <Th>{t('SKU')}</Th>
                <Th>{t('Mill ref.')}</Th>
                <Th>{t('Produced')}</Th>
                <Th numeric>{t('Reported')}</Th>
                <Th numeric>{t('Measured')}</Th>
                <Th numeric>{t('Rolls')}</Th>
                <Th numeric>{t('Packed')}</Th>
                <Th>{t('Quality')}</Th>
                <Th numeric>{t('Ready to ship')}</Th>
              </tr>
            </thead>
            <tbody>
              {run.lots.map((lot) => (
                <Tr key={lot.id}>
                  <Td>
                    <Link to={`/inventory/lots/${lot.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {lot.number}
                    </Link>
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <ShadeDot hex={lot.shadeHex} name={lot.shadeName} code={lot.shadeCode} size="sm" />
                      <span className="code">{lot.skuCode}</span>
                    </span>
                  </Td>
                  <Td className="code text-ink-soft">{lot.millLotRef || '—'}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">{dateOrDash(lot.producedOn)}</Td>
                  <Td numeric>{metres(lot.producedQuantity)}</Td>
                  <Td numeric className="text-ink-soft">{lot.rollCount > 0 ? metres(lot.measuredQuantity) : '—'}</Td>
                  <Td numeric>{lot.rollCount || '—'}</Td>
                  <Td numeric className="text-ink-soft">{lot.rollCount > 0 ? `${lot.packedRollCount} of ${lot.rollCount}` : metres(lot.packedQuantity)}</Td>
                  <Td>
                    <StatusChip tone={LOT_QUALITY_TONE[lot.qualityState]}>{t(LOT_QUALITY_LABEL[lot.qualityState])}</StatusChip>
                  </Td>
                  <Td numeric className={lot.qualityState === 'released' && lot.packedQuantity !== '0' ? 'font-medium' : 'text-ink-muted'}>
                    {lot.qualityState === 'released' ? metres(lot.packedQuantity) : '0 m'}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>
      {manage && <RecordLotDialog key={recording ? 'open' : 'closed'} run={run} open={recording} onClose={() => setRecording(false)} />}
    </>
  );
}
