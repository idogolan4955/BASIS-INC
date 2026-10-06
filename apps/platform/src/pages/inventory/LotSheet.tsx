import { LOT_QUALITY_LABEL, LOT_QUALITY_STATES, LOT_QUALITY_TONE, formatLocalDate, formatQuantity, quantityFromStored, type LotDetail, type LotQualityState } from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextArea, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useLot, useSetLotQuality } from '../../data/manufacturing';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';

// A lot: the unit of shade consistency, followed from the mill through
// quality into cartons. Its rolls are the physical truth underneath.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

function QualityDialog({ lot, open, onClose }: { lot: LotDetail; open: boolean; onClose: () => void }) {
  const set = useSetLotQuality();
  const [state, setState] = useState<LotQualityState>(lot.qualityState === 'pending' ? 'released' : lot.qualityState);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (note.trim().length < 3) return setError('Say what was found.');
    try {
      await set.mutateAsync({ number: lot.number, state, note: note.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The quality state could not be recorded.');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={`Quality of ${lot.number}`} description="Only released metres count as ready to ship. Inspections will record this from their results; until then QC records it here.">
      <form onSubmit={submit} className="grid gap-4">
        <SelectField label="State" value={state} onChange={(event) => setState(event.target.value as LotQualityState)}>
          {LOT_QUALITY_STATES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {LOT_QUALITY_LABEL[candidate]}
            </option>
          ))}
        </SelectField>
        <TextArea label="Finding" required value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Pre-shipment inspection passed; ΔE 0.4 against MLK-02." />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={set.isPending} busyLabel="Recording">
            Record
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function LotTimeline({ number }: { number: string }) {
  const timeline = useTimeline('lot', number);
  const note = useRecordNote('lot', number);
  return (
    <Panel title="Timeline" count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function LotSheet({ tab }: { tab: 'rolls' | 'timeline' }) {
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const lot = useLot(number);
  const [editing, setEditing] = useState(false);
  const quality = session.role === 'owner' || session.role === 'qc';

  if (lot.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">Loading lot</p>;
  if (lot.error) return <p className="px-5 py-10 text-critical lg:px-8">The lot could not be loaded. {lot.error.message}</p>;
  if (!lot.data) return <NotFound what="lot" />;
  const data = lot.data;
  const base = `/inventory/lots/${data.number}`;
  const ready = data.qualityState === 'released' ? data.packedQuantity : '0';

  return (
    <>
      <LabelHeader
        code={data.number}
        title={`${data.productName}, ${data.shadeName}`}
        subtitle={
          <>
            <span className="code">{data.skuCode}</span> · {data.variantName} · from{' '}
            <Link to={`/manufacturing/runs/${data.runNumber}`} className="code underline decoration-line-strong underline-offset-4">
              {data.runNumber}
            </Link>{' '}
            on{' '}
            <Link to={`/manufacturing/purchase-orders/${data.purchaseOrderNumber}`} className="code underline decoration-line-strong underline-offset-4">
              {data.purchaseOrderNumber}
            </Link>
            , {data.supplierName}
          </>
        }
        status={<StatusChip tone={LOT_QUALITY_TONE[data.qualityState]}>{LOT_QUALITY_LABEL[data.qualityState]}</StatusChip>}
        facts={[
          { label: 'Reported', value: metres(data.producedQuantity) },
          { label: 'Measured', value: data.rollCount > 0 ? metres(data.measuredQuantity) : '—' },
          { label: 'Rolls', value: data.rollCount > 0 ? `${data.packedRollCount} of ${data.rollCount} packed` : 'Not tracked' },
          { label: 'Mill lot', value: data.millLotRef || '—' },
          { label: 'Produced', value: dateOrDash(data.producedOn) },
          { label: 'Ready to ship', value: <span className={ready !== '0' ? 'text-positive' : undefined}>{metres(ready)}</span> },
        ]}
        actions={quality && <Button variant="primary" onClick={() => setEditing(true)}>Record quality</Button>}
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>
          Rolls
        </NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>
          Timeline
        </NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'rolls' && (
          <Panel title="Rolls" count={data.rolls.length} flush>
            {data.rolls.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">This lot is not tracked by roll.</p>
            ) : (
              <Ledger caption={`Rolls of ${data.number}`}>
                <thead>
                  <tr>
                    <Th>Roll</Th>
                    <Th>Shade</Th>
                    <Th numeric>Length</Th>
                    <Th numeric>Usable width</Th>
                    <Th numeric>Weight</Th>
                    <Th>Grade</Th>
                    <Th numeric>Points</Th>
                    <Th>Packed in</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.rolls.map((roll) => (
                    <Tr key={roll.id}>
                      <Td className="code whitespace-nowrap">{roll.number}</Td>
                      <Td>
                        <span className="flex items-center gap-2.5 whitespace-nowrap">
                          <ShadeDot hex={data.shadeHex} name={data.shadeName} code={data.shadeCode} size="sm" />
                          {data.shadeName}
                        </span>
                      </Td>
                      <Td numeric>{metres(roll.measuredLength)}</Td>
                      <Td numeric className="text-ink-soft">{roll.usableWidthCm ? `${roll.usableWidthCm} cm` : '—'}</Td>
                      <Td numeric className="text-ink-soft">{roll.weightG ? `${(roll.weightG / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg` : '—'}</Td>
                      <Td className="text-ink-soft">{roll.grade || '—'}</Td>
                      <Td numeric className="text-ink-soft">{roll.defectPoints ?? '—'}</Td>
                      <Td className="code whitespace-nowrap">{roll.packedIn ?? <span className="text-ink-muted">Unpacked</span>}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
        {tab === 'timeline' && <LotTimeline number={data.number} />}
      </div>
      {quality && <QualityDialog key={editing ? 'open' : 'closed'} lot={data} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
