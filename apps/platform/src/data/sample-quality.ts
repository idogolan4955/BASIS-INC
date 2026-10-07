import { addDays, inspectionResult, lotStateFor, measurementOutcome, signOffAllowed, todayIn, type CheckFacts, type InspectionResult } from '@basis/shared';
import type { ActionUpdate, ActionView, CheckView, DefectView, InspectionDetail, InspectionSummary, NewActionInput, NewInspectionInput, ReadingView, RecordInput, SignOffInput, TemplateView } from './quality';

// SAMPLE DATA for `--mode sample`: one inspection signed off on the released
// tulle lot, one in progress on the lot awaiting inspection, one corrective
// action. The same rules run here as in the functions.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const PRE_SHIPMENT_CHECKS: Omit<CheckView, 'id' | 'outcome' | 'measured' | 'note'>[] = [
  { key: 'shade_std', sequence: 1, category: 'shade', parameter: 'Shade against the standard', method: 'Spectrophotometer, D65, three readings per roll', kind: 'measurement', unit: 'dE', expected: '0', toleranceMinus: '0', tolerancePlus: '1000', isCritical: true },
  { key: 'shade_lot', sequence: 2, category: 'shade', parameter: 'Shade within the lot', method: 'Roll to roll, D65', kind: 'pass_fail', unit: '', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: false },
  { key: 'width', sequence: 3, category: 'dimension', parameter: 'Usable width', method: 'Measured at three points per roll', kind: 'measurement', unit: 'cm', expected: '158000', toleranceMinus: '2000', tolerancePlus: '5000', isCritical: true },
  { key: 'gsm', sequence: 4, category: 'dimension', parameter: 'Weight', method: 'Cut and weighed, three samples', kind: 'measurement', unit: 'gsm', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: false },
  { key: 'length', sequence: 5, category: 'quantity', parameter: 'Roll length against the label', method: 'Measured on the table', kind: 'measurement', unit: '%', expected: '100000', toleranceMinus: '2000', tolerancePlus: '5000', isCritical: false },
  { key: 'stretch', sequence: 6, category: 'dimension', parameter: 'Stretch and recovery', method: 'Against the specification', kind: 'pass_fail', unit: '', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: true },
  { key: 'defects', sequence: 7, category: 'defect', parameter: 'Defects per roll', method: '4-point system, continuous', kind: 'count', unit: 'pts', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: false },
  { key: 'rolls', sequence: 8, category: 'quantity', parameter: 'Rolls and metres against the packing list', method: 'Counted', kind: 'pass_fail', unit: '', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: true },
  { key: 'packaging', sequence: 9, category: 'packaging', parameter: 'Wrap, core and end-cap labels', method: 'Shade, product code, lot, width, length, origin present', kind: 'pass_fail', unit: '', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: false },
  { key: 'cartons', sequence: 10, category: 'packaging', parameter: 'Cartons and marks', method: 'Against the packing list', kind: 'pass_fail', unit: '', expected: null, toleranceMinus: null, tolerancePlus: null, isCritical: false },
];

const TEMPLATES: TemplateView[] = [
  { id: 'itpl-pre', name: 'Pre-shipment, mesh and tulle', type: 'pre_shipment', familyName: '', samplingRule: '10% of rolls, at least 3, full length', maxDefectPointsPer100m: 20, maxDeltaE: 100, checks: PRE_SHIPMENT_CHECKS.map((check) => ({ key: check.key, category: check.category, parameter: check.parameter, method: check.method, kind: check.kind, unit: check.unit, isCritical: check.isCritical })) },
  { id: 'itpl-lab', name: 'Lab dip', type: 'lab_dip', familyName: '', samplingRule: 'One dip card per shade', maxDefectPointsPer100m: null, maxDeltaE: 80, checks: [{ key: 'shade_std', category: 'shade', parameter: 'Shade against the standard', method: 'Spectrophotometer, D65', kind: 'measurement', unit: 'dE', isCritical: true }, { key: 'visual', category: 'shade', parameter: 'Visual match in daylight', method: 'Light box D65, then daylight', kind: 'pass_fail', unit: '', isCritical: true }] },
];

interface Record_ extends Mutable<Omit<InspectionDetail, 'checks' | 'readings' | 'defects' | 'actions' | 'rolls'>> {
  checks: Mutable<CheckView>[];
  readings: ReadingView[];
  defects: DefectView[];
  rolls: { number: string; rollNo: number; measuredLength: string }[];
}

const rolls = (lot: string) => Array.from({ length: 90 }, (_, index) => ({ number: `${lot}-${String(index + 1).padStart(2, '0')}`, rollNo: index + 1, measuredLength: String(50000 + (((index + 1) * 37) % 9) * 100 - 400) }));
const checksFor = (prefix: string, outcomes: Partial<Record<string, { outcome: CheckView['outcome']; measured?: string }>>): Mutable<CheckView>[] =>
  PRE_SHIPMENT_CHECKS.map((check) => ({ ...check, id: `${prefix}-${check.key}`, outcome: outcomes[check.key]?.outcome ?? 'pending', measured: outcomes[check.key]?.measured ?? null, note: '' }));

const t0 = today();
const store = {
  inspections: [] as Record_[],
  actions: [] as Mutable<ActionView>[],
  sequence: { INS: 52, CAR: 7 },
};
store.inspections = [
  {
    id: 'ins-52', number: 'INS-26-0052', type: 'pre_shipment', state: 'signed_off', entityType: 'lot', entityId: 'LOT-26-0012', templateName: 'Pre-shipment, mesh and tulle', subjectTitle: 'Bridal Tulle, Milk', shadeHex: '#F2E9DC', supplierName: 'Lanrui Textile', runNumber: 'RUN-26-0033',
    inspectorName: 'Mei Lin, Hangzhou QC', location: 'Lanrui weaving mill, Shaoxing', scheduledOn: addDays(t0, -2), performedOn: addDays(t0, -1), result: 'conditional_pass', disposition: 'release', createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    samplingRule: '10% of rolls, at least 3, full length', maxDefectPointsPer100m: 20, maxDeltaE: 100, sampleSize: '9 rolls, 450 m', concession: '', note: 'Three rolls with light crease marks at the tail; relabelled and re-rolled.',
    lotNumber: 'LOT-26-0012', lotQuantity: '4500000', lotQualityState: 'released', rolls: rolls('LOT-26-0012'),
    checks: checksFor('c52', { shade_std: { outcome: 'pass', measured: '420' }, shade_lot: { outcome: 'pass' }, width: { outcome: 'pass', measured: '158400' }, gsm: { outcome: 'pass', measured: '24000' }, length: { outcome: 'pass', measured: '100600' }, stretch: { outcome: 'pass' }, defects: { outcome: 'pass' }, rolls: { outcome: 'pass' }, packaging: { outcome: 'fail' }, cartons: { outcome: 'pass' } }),
    readings: [
      { id: 'r1', rollNumber: 'LOT-26-0012-03', illuminant: 'D65', lStar: 92100, aStar: 1200, bStar: 8400, deltaE: 42, visualGrade: '4-5', standardRef: 'MLK-02' },
      { id: 'r2', rollNumber: 'LOT-26-0012-41', illuminant: 'D65', lStar: 92000, aStar: 1300, bStar: 8600, deltaE: 55, visualGrade: '4-5', standardRef: 'MLK-02' },
      { id: 'r3', rollNumber: 'LOT-26-0012-78', illuminant: 'D65', lStar: 92200, aStar: 1100, bStar: 8300, deltaE: 38, visualGrade: '4-5', standardRef: 'MLK-02' },
    ],
    defects: [
      { id: 'd1', rollNumber: 'LOT-26-0012-41', type: 'Crease mark', points: 2, positionM: '46200', sizeCm: 12, note: 'Tail of the roll' },
      { id: 'd2', rollNumber: 'LOT-26-0012-78', type: 'Crease mark', points: 2, positionM: '48100', sizeCm: 9, note: '' },
      { id: 'd3', rollNumber: 'LOT-26-0012-03', type: 'Slub', points: 1, positionM: '12300', sizeCm: 2, note: '' },
    ],
  },
  {
    id: 'ins-53', number: 'INS-26-0053', type: 'pre_shipment', state: 'in_progress', entityType: 'lot', entityId: 'LOT-26-0013', templateName: 'Pre-shipment, mesh and tulle', subjectTitle: 'Bridal Tulle, Milk', shadeHex: '#F2E9DC', supplierName: 'Lanrui Textile', runNumber: 'RUN-26-0033',
    inspectorName: 'Mei Lin, Hangzhou QC', location: 'Lanrui weaving mill, Shaoxing', scheduledOn: t0, performedOn: t0, result: null, disposition: null, createdAt: new Date().toISOString(),
    samplingRule: '10% of rolls, at least 3, full length', maxDefectPointsPer100m: 20, maxDeltaE: 100, sampleSize: '9 rolls', concession: '', note: '',
    lotNumber: 'LOT-26-0013', lotQuantity: '4500000', lotQualityState: 'pending', rolls: rolls('LOT-26-0013'),
    checks: checksFor('c53', { shade_std: { outcome: 'pass', measured: '610' }, shade_lot: { outcome: 'pass' }, width: { outcome: 'pass', measured: '158100' } }),
    readings: [{ id: 'r4', rollNumber: 'LOT-26-0013-05', illuminant: 'D65', lStar: 91900, aStar: 1400, bStar: 8900, deltaE: 61, visualGrade: '4', standardRef: 'MLK-02' }],
    defects: [],
  },
];
store.actions = [
  { id: 'car-7', number: 'CAR-26-0007', title: 'Relabel and re-roll creased tails before packing', description: 'Three rolls of LOT-26-0012 showed crease marks in the last 5 m; packaging check failed on the end-cap label position.', rootCause: 'Rolls parked on their ends before wrapping.', action: 'Wrap within the hour of winding; labels applied flat.', ownerName: 'Lanrui Textile, Mr Zhou', dueOn: addDays(t0, 5), state: 'in_progress', inspectionNumber: 'INS-26-0052', lotNumber: 'LOT-26-0012', supplierName: 'Lanrui Textile', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
];

const facts = (record: Record_): CheckFacts[] => record.checks.map((check) => ({ key: check.key, category: check.category, kind: check.kind, isCritical: check.isCritical, outcome: check.outcome, measured: check.measured, expected: check.expected, toleranceMinus: check.toleranceMinus, tolerancePlus: check.tolerancePlus }));
const inspectedMetres = (record: Record_) => {
  const touched = new Set(record.defects.map((defect) => defect.rollNumber).filter(Boolean));
  const rows = touched.size > 0 ? record.rolls.filter((roll) => touched.has(roll.number)) : record.rolls;
  return rows.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n).toString();
};
const derived = (record: Record_): InspectionResult | null => inspectionResult(facts(record), record.defects.map((defect) => ({ points: defect.points, rollNumber: defect.rollNumber })), record.readings, inspectedMetres(record), { maxDefectPointsPer100m: record.maxDefectPointsPer100m, maxDeltaE: record.maxDeltaE });
const summary = (record: Record_): InspectionSummary => structuredClone({ id: record.id, number: record.number, type: record.type, state: record.state, entityType: record.entityType, entityId: record.entityId, templateName: record.templateName, subjectTitle: record.subjectTitle, shadeHex: record.shadeHex, supplierName: record.supplierName, runNumber: record.runNumber, inspectorName: record.inspectorName, location: record.location, scheduledOn: record.scheduledOn, performedOn: record.performedOn, result: record.result, disposition: record.disposition, createdAt: record.createdAt });
const detail = (record: Record_): InspectionDetail => structuredClone({ ...record, actions: store.actions.filter((action) => action.inspectionNumber === record.number).map((action) => ({ number: action.number, title: action.title, state: action.state, dueOn: action.dueOn, ownerName: action.ownerName })) });

export const sampleQuality = {
  async inspections(): Promise<InspectionSummary[]> {
    return store.inspections.map(summary);
  },
  async inspection(number: string): Promise<InspectionDetail | null> {
    const record = store.inspections.find((candidate) => candidate.number === number);
    return record ? detail(record) : null;
  },
  async actions(): Promise<ActionView[]> {
    return structuredClone(store.actions);
  },
  async templates(): Promise<TemplateView[]> {
    return TEMPLATES;
  },
  async create(input: NewInspectionInput): Promise<{ number: string }> {
    const { sampleManufacturing } = await import('./sample-manufacturing');
    const lot = input.subject.startsWith('LOT-') ? await sampleManufacturing.lot(input.subject) : null;
    const run = lot ? await sampleManufacturing.run(lot.runNumber) : await sampleManufacturing.run(input.subject);
    if (!run) throw new Error(`No ${input.subject}.`);
    store.sequence.INS += 1;
    const number = `INS-26-${String(store.sequence.INS).padStart(4, '0')}`;
    const template = TEMPLATES.find((candidate) => candidate.id === input.templateId) ?? TEMPLATES.find((candidate) => candidate.type === input.type) ?? TEMPLATES[0]!;
    store.inspections.unshift({
      id: `ins-${number}`, number, type: input.type, state: 'scheduled', entityType: lot ? 'lot' : 'production_run', entityId: input.subject, templateName: template.name,
      subjectTitle: lot ? `${lot.productName}, ${lot.shadeName}` : run.number, shadeHex: lot?.shadeHex ?? null, supplierName: run.supplierName, runNumber: run.number,
      inspectorName: input.inspectorName ?? '', location: input.location ?? '', scheduledOn: (input.scheduledOn ?? null) as never, performedOn: null, result: null, disposition: null, createdAt: new Date().toISOString(),
      samplingRule: template.samplingRule, maxDefectPointsPer100m: template.maxDefectPointsPer100m, maxDeltaE: template.maxDeltaE, sampleSize: input.sampleSize ?? '', concession: '', note: '',
      lotNumber: lot?.number ?? null, lotQuantity: lot?.producedQuantity ?? '0', lotQualityState: lot?.qualityState ?? null,
      rolls: lot ? lot.rolls.map((roll) => ({ number: roll.number, rollNo: roll.rollNo, measuredLength: roll.measuredLength })) : [],
      checks: (template.id === 'itpl-pre' ? PRE_SHIPMENT_CHECKS : PRE_SHIPMENT_CHECKS.slice(0, 2)).map((check) => ({ ...check, id: `${number}-${check.key}`, outcome: 'pending', measured: null, note: '' })),
      readings: [], defects: [],
    });
    return { number };
  },
  async record(input: RecordInput): Promise<{ number: string; result: InspectionResult | null }> {
    const record = store.inspections.find((candidate) => candidate.number === input.number);
    if (!record) throw new Error('No such inspection.');
    if (record.state === 'signed_off' || record.state === 'cancelled') throw new Error(`${input.number} cannot change.`);
    for (const change of input.checks ?? []) {
      const check = record.checks.find((candidate) => candidate.id === change.id);
      if (!check) continue;
      if (change.measured !== undefined) check.measured = change.measured;
      check.outcome = check.kind === 'measurement' && check.measured !== null ? measurementOutcome(check) : (change.outcome ?? check.outcome);
      if (change.note !== undefined) check.note = change.note ?? '';
    }
    record.readings = record.readings.filter((reading) => !(input.removeReadings ?? []).includes(reading.id));
    record.defects = record.defects.filter((defect) => !(input.removeDefects ?? []).includes(defect.id));
    for (const reading of input.readings ?? []) record.readings.push({ id: `r-${Date.now()}-${record.readings.length}`, rollNumber: reading.rollNumber ?? null, illuminant: reading.illuminant ?? 'D65', lStar: reading.lStar, aStar: reading.aStar, bStar: reading.bStar, deltaE: reading.deltaE, visualGrade: reading.visualGrade ?? '', standardRef: reading.standardRef ?? '' });
    for (const defect of input.defects ?? []) record.defects.push({ id: `d-${Date.now()}-${record.defects.length}`, rollNumber: defect.rollNumber ?? null, type: defect.type, points: defect.points, positionM: defect.positionM ?? null, sizeCm: defect.sizeCm ?? null, note: defect.note ?? '' });
    if (record.state === 'scheduled') record.state = 'in_progress';
    record.performedOn = (input.performedOn ?? record.performedOn ?? today()) as never;
    if (input.note !== undefined) record.note = input.note;
    if (input.sampleSize !== undefined) record.sampleSize = input.sampleSize;
    return { number: input.number, result: derived(record) };
  },
  async submit(number: string): Promise<{ number: string; result: InspectionResult }> {
    const record = store.inspections.find((candidate) => candidate.number === number);
    if (!record) throw new Error('No such inspection.');
    const result = derived(record);
    if (!result) throw new Error(`${record.checks.filter((check) => check.outcome === 'pending').length} checks are still pending.`);
    record.state = 'submitted';
    record.result = result;
    return { number, result };
  },
  async signOff(input: SignOffInput): Promise<{ number: string }> {
    const record = store.inspections.find((candidate) => candidate.number === input.number);
    if (!record) throw new Error('No such inspection.');
    if (record.state !== 'submitted') throw new Error('Only a submitted inspection is signed off.');
    const open = store.actions.filter((action) => action.inspectionNumber === input.number && action.state !== 'closed').length;
    const refusal = signOffAllowed(record.result!, input.disposition, open, input.concession ?? '');
    if (refusal) throw new Error(refusal);
    record.state = 'signed_off';
    record.disposition = input.disposition;
    record.concession = input.concession ?? '';
    if (record.lotNumber) {
      const { sampleManufacturing } = await import('./sample-manufacturing');
      await sampleManufacturing.setLotQuality({ number: record.lotNumber, state: lotStateFor(input.disposition), note: `${input.number} signed off` });
      record.lotQualityState = lotStateFor(input.disposition);
    }
    return { number: input.number };
  },
  async createAction(input: NewActionInput): Promise<{ number: string }> {
    store.sequence.CAR += 1;
    const number = `CAR-26-${String(store.sequence.CAR).padStart(4, '0')}`;
    store.actions.unshift({ id: `car-${number}`, number, title: input.title, description: input.description ?? '', rootCause: '', action: '', ownerName: input.ownerName ?? '', dueOn: (input.dueOn ?? null) as never, state: 'open', inspectionNumber: input.inspectionNumber ?? null, lotNumber: input.lotNumber ?? null, supplierName: '', createdAt: new Date().toISOString() });
    return { number };
  },
  async updateAction(input: ActionUpdate): Promise<{ number: string }> {
    const action = store.actions.find((candidate) => candidate.number === input.number);
    if (!action) throw new Error('No such action.');
    if (input.state === 'closed' && action.state !== 'verification') throw new Error('An action is verified before it closes: move it to verification first.');
    if (input.state) action.state = input.state;
    if (input.rootCause !== undefined) action.rootCause = input.rootCause;
    if (input.action !== undefined) action.action = input.action;
    if (input.ownerName !== undefined) action.ownerName = input.ownerName;
    if (input.dueOn !== undefined) action.dueOn = input.dueOn as never;
    return { number: input.number };
  },
};
