import { LOT_QUALITY_LABEL, LOT_QUALITY_STATES, LOT_QUALITY_TONE, formatLocalDate, formatQuantity, metresNumber, quantityFromStored, type LotDetail, type LotQualityState } from '@basis/shared';
import { Button, Dialog, LabelHeader, Ledger, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextArea, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useLot, useSetLotQuality } from '../../data/manufacturing';
import { DocumentsPanel } from '../../components/DocumentsPanel';
import { ExportMenu } from '../../components/ExportMenu';
import { isSample } from '../../data/source';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useDocument } from '../../lib/documents';
import { useInspectionsFor } from '../../data/quality';
import { NewInspectionDialog } from '../qc/Qc';
import { INSPECTION_RESULT_LABEL, INSPECTION_RESULT_TONE, INSPECTION_STATE_LABEL, INSPECTION_STATE_TONE, INSPECTION_TYPE_LABEL } from '@basis/shared';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { useT } from '../../i18n';

// A lot: the unit of shade consistency, followed from the mill through
// quality into cartons. Its rolls are the physical truth underneath.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

function QualityDialog({ lot, open, onClose }: { lot: LotDetail; open: boolean; onClose: () => void }) {
  const t = useT();
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
    <Dialog open={open} onClose={onClose} title={`Quality of ${lot.number}`} description={t('Only released metres count as ready to ship. Inspections will record this from their results; until then QC records it here.')}>
      <form onSubmit={submit} className="grid gap-4">
        <SelectField label={t('State')} value={state} onChange={(event) => setState(event.target.value as LotQualityState)}>
          {LOT_QUALITY_STATES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(LOT_QUALITY_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <TextArea label={t('Finding')} required value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder={t('Pre-shipment inspection passed; ΔE 0.4 against MLK-02.')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={set.isPending} busyLabel={t('Recording')}>{t('Record')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function LotTimeline({ number }: { number: string }) {
  const t = useT();
  const timeline = useTimeline('lot', number);
  const note = useRecordNote('lot', number);
  return (
    <Panel title={t('Timeline')} count={timeline.data?.length}>
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

export function LotSheet({ tab }: { tab: 'rolls' | 'documents' | 'timeline' }) {
  const t = useT();
  const session = useRequiredSession();
  const { number = '' } = useParams();
  const lot = useLot(number);
  const [editing, setEditing] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const inspections = useInspectionsFor('lot', number);
  const pdf = useDocument();
  const quality = session.role === 'owner' || session.role === 'qc';

  if (lot.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading lot')}</p>;
  if (lot.error) return <p className="px-5 py-10 text-critical lg:px-8">The lot could not be loaded. {lot.error.message}</p>;
  if (!lot.data) return <NotFound what={t('lot')} />;
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
        status={
          <>
            <StatusChip tone={LOT_QUALITY_TONE[data.qualityState]}>{t(LOT_QUALITY_LABEL[data.qualityState])}</StatusChip>
            {pdf.error && (
              <span role="alert" className="text-[0.8125rem] font-medium text-critical">
                {pdf.error}
              </span>
            )}
          </>
        }
        facts={[
          { label: 'Reported', value: metres(data.producedQuantity) },
          { label: 'Measured', value: data.rollCount > 0 ? metres(data.measuredQuantity) : '—' },
          { label: 'Rolls', value: data.rollCount > 0 ? `${data.packedRollCount} of ${data.rollCount} packed` : 'Not tracked' },
          { label: 'Mill lot', value: data.millLotRef || '—' },
          { label: 'Produced', value: dateOrDash(data.producedOn) },
          { label: 'Ready to ship', value: <span className={ready !== '0' ? 'text-positive' : undefined}>{metres(ready)}</span> },
        ]}
        actions={
          <>
            {!isSample && data.rollCount > 0 && (
              <>
                <Button onClick={() => pdf.open('roll-labels', data.number)} busy={pdf.busy === 'roll-labels'} busyLabel={t('Rendering')}>{t('Roll labels')}</Button>
                <Button onClick={() => pdf.share('roll-labels', data.number, `Roll labels ${data.number} from BASIS INC.`)} busy={pdf.busy === 'share:roll-labels'} busyLabel={t('Sharing')}>{t('WhatsApp')}</Button>
              </>
            )}
            {['owner', 'operations', 'qc'].includes(session.role) && (
              <Button variant="primary" onClick={() => setInspecting(true)}>
                {t('New inspection')}
              </Button>
            )}
            {quality && (
              <Button onClick={() => setEditing(true)}>{t('Record quality')}</Button>
            )}
          </>
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Rolls')}</NavLink>
        <NavLink to={`${base}/documents`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Documents')}</NavLink>
        <NavLink to={`${base}/timeline`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Timeline')}</NavLink>
      </SheetTabs>
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tab === 'rolls' && (inspections.data ?? []).length > 0 && (
          <Panel title={t('Inspections')} count={(inspections.data ?? []).length} flush>
            <Ledger caption={t('Inspections')}>
              <thead>
                <tr>
                  <Th>{t('Inspection')}</Th>
                  <Th>{t('Type')}</Th>
                  <Th>{t('Scheduled')}</Th>
                  <Th>{t('Result')}</Th>
                  <Th>{t('State')}</Th>
                </tr>
              </thead>
              <tbody>
                {(inspections.data ?? []).map((inspection) => (
                  <Tr key={inspection.id}>
                    <Td>
                      <Link to={`/qc/inspections/${inspection.number}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {inspection.number}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">{t(INSPECTION_TYPE_LABEL[inspection.type])}</Td>
                    <Td className="code text-ink-soft">{inspection.scheduledOn ? formatLocalDate(inspection.scheduledOn) : '\u2014'}</Td>
                    <Td>{inspection.result ? <StatusChip tone={INSPECTION_RESULT_TONE[inspection.result]}>{t(INSPECTION_RESULT_LABEL[inspection.result])}</StatusChip> : '\u2014'}</Td>
                    <Td>
                      <StatusChip tone={INSPECTION_STATE_TONE[inspection.state]}>{t(INSPECTION_STATE_LABEL[inspection.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          </Panel>
        )}
        {tab === 'rolls' && (
          <Panel
            title={t('Rolls')}
            count={data.rolls.length}
            flush
            action={
              data.rolls.length > 0 && (
                <ExportMenu
                  ledger="rolls"
                  scope={{ lot: data.number }}
                  rows={data.rolls.map((roll) => ({ number: roll.number, lot: data.number, sku: data.skuCode, shade: data.shadeName, lengthM: metresNumber(roll.measuredLength), usableWidthCm: roll.usableWidthCm, weightKg: roll.weightG === null ? null : roll.weightG / 1000, grade: roll.grade || null, defectPoints: roll.defectPoints, packedIn: roll.packedIn }))}
                />
              )
            }
          >
            {data.rolls.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">{t('This lot is not tracked by roll.')}</p>
            ) : (
              <Ledger caption={`Rolls of ${data.number}`}>
                <thead>
                  <tr>
                    <Th>{t('Roll')}</Th>
                    <Th>{t('Shade')}</Th>
                    <Th numeric>{t('Length')}</Th>
                    <Th numeric>{t('Usable width')}</Th>
                    <Th numeric>{t('Weight')}</Th>
                    <Th>{t('Grade')}</Th>
                    <Th numeric>{t('Points')}</Th>
                    <Th>{t('Packed in')}</Th>
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
                      <Td className="code whitespace-nowrap">{roll.packedIn ?? <span className="text-ink-muted">{t('Unpacked')}</span>}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            )}
          </Panel>
        )}
        {tab === 'documents' && (
          <DocumentsPanel
            entityType="lot"
            entityId={data.number}
            generated={[{ kind: 'roll-labels', label: 'roll labels', available: data.rollCount > 0 }]}
            canFile={['owner', 'operations', 'purchasing', 'qc', 'logistics'].includes(session.role)}
            shareText={`Roll labels ${data.number} from BASIS INC.`}
          />
        )}
        {tab === 'timeline' && <LotTimeline number={data.number} />}
      </div>
      {['owner', 'operations', 'qc'].includes(session.role) && <NewInspectionDialog key={inspecting ? 'inspect-open' : 'inspect-closed'} open={inspecting} onClose={() => setInspecting(false)} subject={data.number} />}
      {quality && <QualityDialog key={editing ? 'quality-open' : 'quality-closed'} lot={data} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
