import {
  LAUNCH_CATALOG,
  addDays,
  availableToShip,
  cubicMetresMilli,
  lotQuantities,
  planMilestones,
  propagateForecasts,
  runForecastEnd,
  runHealth,
  runProgress,
  rollNumber,
  runStateFrom,
  todayIn,
  type HandlingUnitView,
  type LotDetail,
  type LotQualityState,
  type LotView,
  type MilestoneRecord,
  type ProcessTemplateView,
  type PurchaseOrderCosts,
  type PurchaseOrderDetail,
  type PurchaseOrderLineView,
  type PurchaseOrderState,
  type PurchaseOrderSummary,
  type RunDetail,
  type RollView,
  type RunState,
  type RunSummary,
  type TemplateStep,
} from '@basis/shared';
import type { MilestoneUpdateInput, NewLotInput, NewPurchaseOrderInput, NewRunInput, PackInput } from './manufacturing';

// SAMPLE DATA for `--mode sample`: two purchase orders and one run that is
// late, so the Gateway and the Manufacturing screens have something true to
// their rules to show. The same derivation code runs here as in the functions.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const shade = (code: string) => LAUNCH_CATALOG.shades.find((candidate) => candidate.code === code)!;
const product = (code: string) => LAUNCH_CATALOG.products.find((candidate) => candidate.code === code)!;

const TEMPLATES: ProcessTemplateView[] = [
  {
    id: 'tpl-mesh',
    name: 'Warp-knit mesh',
    familyCode: 'MSH',
    familyName: 'Mesh',
    supplierName: '',
    isDefault: true,
    steps: [
      { key: 'yarn', name: 'Yarn sourcing', category: 'materials', sequence: 1, durationDays: 7, dependsOnKey: null, gate: 'none' },
      { key: 'knit', name: 'Knitting', category: 'production', sequence: 2, durationDays: 10, dependsOnKey: 'yarn', gate: 'none' },
      { key: 'labdip', name: 'Lab dip approval', category: 'colour', sequence: 3, durationDays: 3, dependsOnKey: 'yarn', gate: 'approval' },
      { key: 'dye', name: 'Dyeing', category: 'production', sequence: 4, durationDays: 7, dependsOnKey: 'knit', gate: 'none' },
      { key: 'finish', name: 'Finishing', category: 'production', sequence: 5, durationDays: 4, dependsOnKey: 'dye', gate: 'none' },
      { key: 'inspect', name: 'Inspection', category: 'quality', sequence: 6, durationDays: 2, dependsOnKey: 'finish', gate: 'inspection' },
      { key: 'pack', name: 'Packing', category: 'logistics', sequence: 7, durationDays: 2, dependsOnKey: 'inspect', gate: 'none' },
    ],
  },
  {
    id: 'tpl-tulle',
    name: 'Bridal tulle',
    familyCode: 'TUL',
    familyName: 'Tulle',
    supplierName: '',
    isDefault: true,
    steps: [
      { key: 'yarn', name: 'Yarn sourcing', category: 'materials', sequence: 1, durationDays: 5, dependsOnKey: null, gate: 'none' },
      { key: 'knit', name: 'Knitting', category: 'production', sequence: 2, durationDays: 8, dependsOnKey: 'yarn', gate: 'none' },
      { key: 'dye', name: 'Dyeing', category: 'production', sequence: 3, durationDays: 6, dependsOnKey: 'knit', gate: 'none' },
      { key: 'finish', name: 'Finishing', category: 'production', sequence: 4, durationDays: 4, dependsOnKey: 'dye', gate: 'none' },
      { key: 'inspect', name: 'Inspection', category: 'quality', sequence: 5, durationDays: 2, dependsOnKey: 'finish', gate: 'inspection' },
      { key: 'pack', name: 'Packing', category: 'logistics', sequence: 6, durationDays: 2, dependsOnKey: 'inspect', gate: 'none' },
    ],
  },
];

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

interface PoRecord extends Mutable<Omit<PurchaseOrderDetail, 'runs' | 'runDetails' | 'totalQuantity' | 'lineCount' | 'products' | 'lines'>> {
  lines: PurchaseOrderLineView[];
  prices: Record<string, string>;
  payments: PurchaseOrderCosts['payments'];
}

interface RunRecord {
  id: string;
  number: string;
  state: RunState;
  purchaseOrderNumber: string;
  templateName: string;
  plannedStart: string;
  milestones: MilestoneRecord[];
  notes: string;
}

interface LotRecord {
  id: string;
  number: string;
  runNumber: string;
  skuCode: string;
  millLotRef: string;
  producedQuantity: string;
  producedOn: string | null;
  qualityState: LotQualityState;
  rolls: Mutable<RollView>[];
  loosePacked: { unit: string; quantity: string }[];
}

interface UnitRecord extends Omit<HandlingUnitView, 'contents' | 'quantity' | 'cbmMilli'> {
  runNumber: string;
}

const PUT_UP = { rollLengthM: 50, rollsPerCarton: 6, cartonLengthCm: 165, cartonWidthCm: 32, cartonHeightCm: 32 };

function line(lineNo: number, skuCode: string, quantity: string, over = 5, under = 5): PurchaseOrderLineView {
  const [productCode, , shadeCode] = skuCode.split('-') as [string, string, string];
  const p = product(productCode);
  const s = shade(shadeCode);
  return { id: `line-${skuCode}-${lineNo}`, lineNo, skuCode, productCode, productName: p.name, variantName: '160 cm', shadeCode, shadeName: s.name, shadeHex: s.hex, quantity, uom: 'm', overTolerancePercent: over, underTolerancePercent: under, requestedExFactory: null };
}

const store = {
  pos: [] as PoRecord[],
  runs: [] as RunRecord[],
  lots: [] as LotRecord[],
  units: [] as UnitRecord[],
  sequence: { PO: 44, RUN: 35, LOT: 13, CTN: 12, PLT: 0 },
};

function seedRolls(lotNumber: string, count: number, packedInto: (rollNo: number) => string | null): Mutable<RollView>[] {
  return Array.from({ length: count }, (_, index) => {
    const rollNo = index + 1;
    // Measured lengths hover around the nominal 50 m, as they do off a winder.
    const measured = 50000 + ((rollNo * 37) % 9) * 100 - 400;
    return { id: `roll-${lotNumber}-${rollNo}`, number: rollNumber(lotNumber, rollNo), rollNo, measuredLength: String(measured), usableWidthCm: 158, weightG: 4200, grade: 'A', defectPoints: (rollNo * 7) % 5, packedIn: packedInto(rollNo) };
  });
}

function seed() {
  const t = today();
  store.pos = [
    {
      id: 'po-41', number: 'PO-26-0041', state: 'confirmed', supplierId: 'co-jinyu', supplierName: 'Jinyu Knitting', factoryName: 'Jinyu mill, Haining', currency: 'USD',
      issuedOn: addDays(t, -24), confirmedOn: addDays(t, -22), requestedExFactory: addDays(t, 14), createdAt: new Date().toISOString(), legalEntityName: '', incoterm: 'FOB', namedPlace: 'Ningbo',
      paymentTerms: '30% deposit, 70% before shipment', notes: '', version: 3,
      lines: [line(1, 'PWM-160-SK02', '6400000'), line(2, 'ILM-160-SK01', '3000000')],
      prices: { 'PWM-160-SK02': '28500', 'ILM-160-SK01': '31200' },
      payments: [
        { id: 'pay-41-1', label: 'Deposit 30%', percent: 30, amount: '83550000', trigger: 'on_order', dueOn: addDays(t, -24), paidOn: addDays(t, -21), paidAmount: '83550000', reference: 'TT-2609' },
        { id: 'pay-41-2', label: 'Balance 70%', percent: 70, amount: '194950000', trigger: 'before_shipment', dueOn: null, paidOn: null, paidAmount: null, reference: '' },
      ],
    },
    {
      id: 'po-42', number: 'PO-26-0042', state: 'issued', supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', factoryName: 'Lanrui weaving mill, Shaoxing', currency: 'USD',
      issuedOn: addDays(t, -3), confirmedOn: null, requestedExFactory: addDays(t, 40), createdAt: new Date().toISOString(), legalEntityName: '', incoterm: 'FOB', namedPlace: 'Ningbo',
      paymentTerms: '30% deposit, 70% against BL copy', notes: '', version: 2,
      lines: [line(1, 'BTL-160-MLK', '9000000'), line(2, 'BTL-160-PUR', '4000000')],
      prices: { 'BTL-160-MLK': '19800', 'BTL-160-PUR': '19800' },
      payments: [
        { id: 'pay-42-1', label: 'Deposit 30%', percent: 30, amount: '77220000', trigger: 'on_order', dueOn: addDays(t, -3), paidOn: null, paidAmount: null, reference: '' },
        { id: 'pay-42-2', label: 'Balance 70%', percent: 70, amount: '180180000', trigger: 'before_shipment', dueOn: null, paidOn: null, paidAmount: null, reference: '' },
      ],
    },
  ];
  store.pos.push({
    id: 'po-40', number: 'PO-26-0040', state: 'confirmed', supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', factoryName: 'Lanrui weaving mill, Shaoxing', currency: 'USD',
    issuedOn: addDays(t, -34), confirmedOn: addDays(t, -31), requestedExFactory: addDays(t, 4), createdAt: new Date().toISOString(), legalEntityName: '', incoterm: 'FOB', namedPlace: 'Ningbo',
    paymentTerms: '30% deposit, 70% against BL copy', notes: '', version: 2,
    lines: [line(1, 'BTL-160-MLK', '9000000')],
    prices: { 'BTL-160-MLK': '19800' },
    payments: [
      { id: 'pay-40-1', label: 'Deposit 30%', percent: 30, amount: '53460000', trigger: 'on_order', dueOn: addDays(t, -34), paidOn: addDays(t, -30), paidAmount: '53460000', reference: 'TT-2588' },
      { id: 'pay-40-2', label: 'Balance 70%', percent: 70, amount: '124740000', trigger: 'before_shipment', dueOn: null, paidOn: null, paidAmount: null, reference: '' },
    ],
  });
  const planned = planMilestones(TEMPLATES[0]!.steps, addDays(t, -20));
  const states: Record<string, Partial<MilestoneRecord>> = {
    yarn: { state: 'done', actualStart: addDays(t, -20), actualEnd: addDays(t, -13) },
    labdip: { state: 'done', actualStart: addDays(t, -13), actualEnd: addDays(t, -11) },
    knit: { state: 'done', actualStart: addDays(t, -13), actualEnd: addDays(t, -3) },
    dye: { state: 'in_progress', actualStart: addDays(t, -3), forecastEnd: addDays(t, 7), delayReason: 'Dyehouse backlog' },
  };
  const milestones: MilestoneRecord[] = planned.map((step) => ({ id: `ms-31-${step.key}`, ...step, forecastEnd: null, actualStart: null, actualEnd: null, state: 'pending', delayReason: '', note: '', ...states[step.key] }));
  const propagated = propagateForecasts(milestones);
  // The tulle run is in packing: one lot released and going into cartons, one awaiting quality.
  const tulle = planMilestones(TEMPLATES[1]!.steps, addDays(t, -24));
  const tulleStates: Record<string, Partial<MilestoneRecord>> = {
    yarn: { state: 'done', actualStart: addDays(t, -24), actualEnd: addDays(t, -19) },
    knit: { state: 'done', actualStart: addDays(t, -19), actualEnd: addDays(t, -11) },
    dye: { state: 'done', actualStart: addDays(t, -11), actualEnd: addDays(t, -5) },
    finish: { state: 'done', actualStart: addDays(t, -5), actualEnd: addDays(t, -1) },
    inspect: { state: 'done', actualStart: addDays(t, -1), actualEnd: t },
    pack: { state: 'in_progress', actualStart: t },
  };
  store.runs = [
    {
      id: 'run-31', number: 'RUN-26-0031', state: 'active', purchaseOrderNumber: 'PO-26-0041', templateName: 'Warp-knit mesh', plannedStart: addDays(t, -20), notes: '',
      milestones: milestones.map((candidate) => (candidate.state === 'pending' ? { ...candidate, forecastEnd: propagated.get(candidate.key) ?? null } : candidate)),
    },
    {
      id: 'run-33', number: 'RUN-26-0033', state: 'active', purchaseOrderNumber: 'PO-26-0040', templateName: 'Bridal tulle', plannedStart: addDays(t, -24), notes: 'Shade standard MLK-02 confirmed at lab dip.',
      milestones: tulle.map((step) => ({ id: `ms-33-${step.key}`, ...step, forecastEnd: null, actualStart: null, actualEnd: null, state: 'pending', delayReason: '', note: '', ...tulleStates[step.key] })),
    },
  ];
  store.lots = [
    { id: 'lot-12', number: 'LOT-26-0012', runNumber: 'RUN-26-0033', skuCode: 'BTL-160-MLK', millLotRef: 'LR-7731', producedQuantity: '4500000', producedOn: addDays(t, -2), qualityState: 'released', rolls: seedRolls('LOT-26-0012', 90, (rollNo) => (rollNo <= 72 ? `CTN-26-${String(Math.ceil(rollNo / 6)).padStart(4, '0')}` : null)), loosePacked: [] },
    { id: 'lot-13', number: 'LOT-26-0013', runNumber: 'RUN-26-0033', skuCode: 'BTL-160-MLK', millLotRef: 'LR-7732', producedQuantity: '4500000', producedOn: addDays(t, -1), qualityState: 'pending', rolls: seedRolls('LOT-26-0013', 90, () => null), loosePacked: [] },
  ];
  store.units = Array.from({ length: 12 }, (_, index) => ({
    id: `ctn-${index + 1}`, number: `CTN-26-${String(index + 1).padStart(4, '0')}`, kind: 'carton', runNumber: 'RUN-26-0033', marks: `BASIS / BTL-160-MLK / ${index + 1} of 30`, parentNumber: null,
    lengthCm: PUT_UP.cartonLengthCm, widthCm: PUT_UP.cartonWidthCm, heightCm: PUT_UP.cartonHeightCm, grossWeightG: 26400, netWeightG: 25200, packedOn: t as never,
  }));
}
seed();

const poTotal = (po: PoRecord) => po.lines.reduce((total, l) => total + BigInt(l.quantity), 0n).toString();

function summary(po: PoRecord): PurchaseOrderSummary {
  const runs = store.runs.filter((run) => run.purchaseOrderNumber === po.number).map((run) => ({ number: run.number, state: run.state, health: runHealth(run.milestones, today()) }));
  return { ...po, totalQuantity: poTotal(po), lineCount: po.lines.length, products: [...new Set(po.lines.map((l) => l.productName))], runs };
}

function lotView(lot: LotRecord): LotView {
  const l = line(0, lot.skuCode, '0');
  return {
    id: lot.id, number: lot.number, skuCode: lot.skuCode, productName: l.productName, variantName: l.variantName, shadeCode: l.shadeCode, shadeName: l.shadeName, shadeHex: l.shadeHex,
    rollTracking: true, putUp: PUT_UP, millLotRef: lot.millLotRef, producedQuantity: lot.producedQuantity, producedOn: lot.producedOn as never, qualityState: lot.qualityState,
    ...lotQuantities(lot.rolls, lot.loosePacked.map((entry) => entry.quantity)),
    rolls: lot.rolls,
  };
}

function unitView(unit: UnitRecord): HandlingUnitView {
  const contents = store.lots
    .filter((lot) => lot.runNumber === unit.runNumber)
    .flatMap((lot) => [
      ...lot.rolls.filter((roll) => roll.packedIn === unit.number).map((roll) => ({ rollNumber: roll.number, lotNumber: lot.number, skuCode: lot.skuCode, quantity: roll.measuredLength })),
      ...lot.loosePacked.filter((entry) => entry.unit === unit.number).map((entry) => ({ rollNumber: null, lotNumber: lot.number, skuCode: lot.skuCode, quantity: entry.quantity })),
    ]);
  return { ...unit, contents, quantity: contents.reduce((total, content) => total + BigInt(content.quantity), 0n).toString(), cbmMilli: cubicMetresMilli(unit.lengthCm, unit.widthCm, unit.heightCm) };
}

function runSummary(run: RunRecord): RunSummary {
  const po = store.pos.find((candidate) => candidate.number === run.purchaseOrderNumber)!;
  const last = run.milestones[run.milestones.length - 1];
  return {
    id: run.id,
    number: run.number,
    state: run.state,
    health: runHealth(run.milestones, today()),
    purchaseOrderNumber: run.purchaseOrderNumber,
    supplierName: po.supplierName,
    factoryName: po.factoryName,
    templateName: run.templateName,
    plannedStart: run.plannedStart as never,
    plannedEnd: (last?.plannedEnd ?? run.plannedStart) as never,
    forecastEnd: runForecastEnd(run.milestones),
    actualEnd: run.state === 'completed' ? runForecastEnd(run.milestones) : null,
    products: po.lines.map((l) => `${l.productName}, ${l.shadeName}`),
    totalQuantity: poTotal(po),
    progress: runProgress(run.milestones),
    milestones: run.milestones,
  };
}

export const sampleManufacturing = {
  async purchaseOrders(): Promise<PurchaseOrderSummary[]> {
    return store.pos.map(summary);
  },
  async purchaseOrder(number: string): Promise<PurchaseOrderDetail | null> {
    const po = store.pos.find((candidate) => candidate.number === number);
    if (!po) return null;
    const runs = store.runs.filter((run) => run.purchaseOrderNumber === number).map(runSummary);
    return {
      ...summary(po),
      legalEntityName: po.legalEntityName, incoterm: po.incoterm, namedPlace: po.namedPlace, paymentTerms: po.paymentTerms, confirmedOn: po.confirmedOn, notes: po.notes, version: po.version, lines: po.lines,
      runDetails: runs.map((run) => ({ number: run.number, state: run.state, health: run.health, plannedEnd: run.plannedEnd, forecastEnd: run.forecastEnd })),
    };
  },
  async purchaseOrderCosts(number: string): Promise<PurchaseOrderCosts | null> {
    const po = store.pos.find((candidate) => candidate.number === number);
    if (!po) return null;
    return { currency: po.currency, lines: po.lines.map((l) => ({ id: l.id, lineNo: l.lineNo, quantity: l.quantity, unitPrice: po.prices[l.skuCode] ?? '0' })), payments: po.payments };
  },
  async runs(): Promise<RunSummary[]> {
    return store.runs.map(runSummary);
  },
  async run(number: string): Promise<RunDetail | null> {
    const run = store.runs.find((candidate) => candidate.number === number);
    if (!run) return null;
    const po = store.pos.find((candidate) => candidate.number === run.purchaseOrderNumber)!;
    const lots = store.lots.filter((lot) => lot.runNumber === run.number).map(lotView);
    return structuredClone({
      ...runSummary(run),
      purchaseOrderState: po.state,
      supplierId: po.supplierId,
      notes: run.notes,
      lines: po.lines.map((l) => ({
        id: `rl-${l.id}`, skuCode: l.skuCode, productName: l.productName, variantName: l.variantName, shadeCode: l.shadeCode, shadeName: l.shadeName, shadeHex: l.shadeHex, plannedQuantity: l.quantity,
        producedQuantity: store.lots.filter((lot) => lot.runNumber === run.number && lot.skuCode === l.skuCode).reduce((total, lot) => total + BigInt(lot.producedQuantity), 0n).toString(),
        uom: l.uom, rollTracking: true, putUp: PUT_UP,
      })),
      lots,
      handlingUnits: store.units.filter((unit) => unit.runNumber === run.number).map(unitView),
      availableToShip: availableToShip(lots),
    });
  },
  async lot(number: string): Promise<LotDetail | null> {
    const lot = store.lots.find((candidate) => candidate.number === number);
    if (!lot) return null;
    const run = store.runs.find((candidate) => candidate.number === lot.runNumber)!;
    const po = store.pos.find((candidate) => candidate.number === run.purchaseOrderNumber)!;
    // A copy: the store is mutated in place and a cached read must not change underneath its query.
    return structuredClone({ ...lotView(lot), runNumber: run.number, purchaseOrderNumber: po.number, supplierName: po.supplierName });
  },
  async templates(): Promise<ProcessTemplateView[]> {
    return TEMPLATES;
  },
  /** One package by number, with the run it was packed on; for the shipments that carry it. */
  async unit(number: string): Promise<(HandlingUnitView & { runNumber: string }) | null> {
    const unit = store.units.find((candidate) => candidate.number === number);
    return unit ? structuredClone({ ...unitView(unit), runNumber: unit.runNumber }) : null;
  },
  async createPurchaseOrder(input: NewPurchaseOrderInput): Promise<string> {
    store.sequence.PO += 1;
    const number = `PO-26-${String(store.sequence.PO).padStart(4, '0')}`;
    const prices: Record<string, string> = {};
    const lines = input.lines.map((l, index) => {
      prices[l.skuCode] = l.unitPrice;
      return line(index + 1, l.skuCode, l.quantity, l.overTolerancePercent ?? 0, l.underTolerancePercent ?? 0);
    });
    store.pos.unshift({
      id: `po-${number}`, number, state: 'draft', supplierId: input.supplierId, supplierName: input.supplierId === 'co-lanrui' ? 'Lanrui Textile' : 'Jinyu Knitting', factoryName: '', currency: input.currency,
      issuedOn: null, confirmedOn: null, requestedExFactory: (input.requestedExFactory || null) as never, createdAt: new Date().toISOString(), legalEntityName: '', incoterm: input.incotermCode ?? '',
      namedPlace: input.namedPlace ?? '', paymentTerms: input.paymentTerms ?? '', notes: input.notes ?? '', version: 1, lines, prices,
      payments: [
        { id: `pay-${number}-1`, label: `Deposit ${input.depositPercent}%`, percent: input.depositPercent, amount: null, trigger: 'on_order', dueOn: null, paidOn: null, paidAmount: null, reference: '' },
        { id: `pay-${number}-2`, label: `Balance ${100 - input.depositPercent}%`, percent: 100 - input.depositPercent, amount: null, trigger: 'before_shipment', dueOn: null, paidOn: null, paidAmount: null, reference: '' },
      ],
    });
    return number;
  },
  async transition(name: 'issuePurchaseOrder' | 'confirmPurchaseOrder' | 'cancelPurchaseOrder', number: string, _reason?: string): Promise<void> {
    const po = store.pos.find((candidate) => candidate.number === number);
    if (!po) throw new Error('No such purchase order.');
    const next: Record<typeof name, [PurchaseOrderState[], PurchaseOrderState]> = {
      issuePurchaseOrder: [['draft'], 'issued'],
      confirmPurchaseOrder: [['issued'], 'confirmed'],
      cancelPurchaseOrder: [['draft', 'issued'], 'cancelled'],
    };
    const [from, to] = next[name];
    if (!from.includes(po.state)) throw new Error(`A ${po.state} purchase order cannot be ${to}.`);
    po.state = to;
    if (to === 'issued') po.issuedOn = today();
    if (to === 'confirmed') po.confirmedOn = today();
  },
  async createRun(input: NewRunInput): Promise<string> {
    const po = store.pos.find((candidate) => candidate.number === input.purchaseOrderNumber);
    if (!po) throw new Error('No such purchase order.');
    if (po.state !== 'confirmed') throw new Error('A run opens on a confirmed purchase order.');
    const family = product(po.lines[0]!.productCode).family;
    const template = TEMPLATES.find((candidate) => candidate.id === input.templateId) ?? TEMPLATES.find((candidate) => candidate.familyCode === family) ?? TEMPLATES[0]!;
    store.sequence.RUN += 1;
    const number = `RUN-26-${String(store.sequence.RUN).padStart(4, '0')}`;
    const steps: readonly TemplateStep[] = template.steps;
    store.runs.push({
      id: `run-${number}`, number, state: 'planned', purchaseOrderNumber: po.number, templateName: template.name, plannedStart: input.plannedStart, notes: input.notes ?? '',
      milestones: planMilestones(steps, input.plannedStart as never).map((step) => ({ id: `ms-${number}-${step.key}`, ...step, forecastEnd: null, actualStart: null, actualEnd: null, state: 'pending', delayReason: '', note: '' })),
    });
    return number;
  },
  async updateMilestone(input: MilestoneUpdateInput): Promise<void> {
    const run = store.runs.find((candidate) => candidate.number === input.runNumber);
    if (!run) throw new Error('No such run.');
    const index = run.milestones.findIndex((candidate) => candidate.id === input.milestoneId);
    if (index < 0) throw new Error('No such milestone.');
    const current = run.milestones[index]!;
    const t = today();
    const state = input.state ?? current.state;
    const updated: MilestoneRecord = {
      ...current,
      state,
      forecastEnd: state === 'pending' ? null : input.forecastEnd === undefined ? current.forecastEnd : (input.forecastEnd as never),
      actualStart: input.actualStart === undefined ? (current.actualStart ?? (state === 'in_progress' || state === 'done' ? t : null)) : (input.actualStart as never),
      actualEnd: state === 'done' || state === 'skipped' ? ((input.actualEnd === undefined ? (current.actualEnd ?? t) : input.actualEnd) as never) : null,
      delayReason: input.delayReason ?? current.delayReason,
      note: input.note ?? current.note,
    };
    const chain = run.milestones.map((candidate, i) => (i === index ? updated : candidate));
    const propagated = propagateForecasts(chain);
    run.milestones = chain.map((candidate) => (candidate.state === 'pending' ? { ...candidate, forecastEnd: propagated.get(candidate.key) ?? null } : candidate));
    run.state = runStateFrom(run.milestones, run.state);
  },
  async recordLot(input: NewLotInput): Promise<string> {
    const run = store.runs.find((candidate) => candidate.number === input.runNumber);
    if (!run) throw new Error('No such run.');
    const rolls = input.rolls ?? [];
    if (rolls.length === 0) throw new Error(`${input.skuCode} is tracked by roll; record the rolls.`);
    store.sequence.LOT += 1;
    const number = `LOT-26-${String(store.sequence.LOT).padStart(4, '0')}`;
    const total = rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n);
    store.lots.push({
      id: `lot-${number}`, number, runNumber: run.number, skuCode: input.skuCode, millLotRef: input.millLotRef ?? '', producedQuantity: total.toString(), producedOn: input.producedOn ?? today(), qualityState: 'pending', loosePacked: [],
      rolls: rolls.map((roll, index) => ({ id: `roll-${number}-${index + 1}`, number: rollNumber(number, index + 1), rollNo: index + 1, measuredLength: roll.measuredLength, usableWidthCm: roll.usableWidthCm ?? null, weightG: roll.weightG ?? null, grade: roll.grade ?? '', defectPoints: roll.defectPoints ?? null, packedIn: null })),
    });
    return number;
  },
  async pack(input: PackInput): Promise<string> {
    const run = store.runs.find((candidate) => candidate.number === input.runNumber);
    if (!run) throw new Error('No such run.');
    const lots = store.lots.filter((lot) => lot.runNumber === run.number);
    const rolls = input.rollNumbers.map((number) => {
      const roll = lots.flatMap((lot) => lot.rolls).find((candidate) => candidate.number === number);
      if (!roll) throw new Error(`${number} is not a roll of this run.`);
      if (roll.packedIn) throw new Error(`${number} is already packed.`);
      return roll;
    });
    if (rolls.length === 0 && (input.loose ?? []).length === 0) throw new Error('Nothing to pack.');
    const prefix = input.kind === 'carton' ? 'CTN' : 'PLT';
    store.sequence[prefix] += 1;
    const number = `${prefix}-26-${String(store.sequence[prefix]).padStart(4, '0')}`;
    store.units.push({
      id: `hu-${number}`, number, kind: input.kind, runNumber: run.number, marks: input.marks ?? '', parentNumber: input.parentNumber ?? null,
      lengthCm: input.lengthCm ?? null, widthCm: input.widthCm ?? null, heightCm: input.heightCm ?? null, grossWeightG: input.grossWeightG ?? null, netWeightG: input.netWeightG ?? null, packedOn: (input.packedOn ?? today()) as never,
    });
    for (const roll of rolls) roll.packedIn = number;
    for (const entry of input.loose ?? []) lots.find((lot) => lot.number === entry.lotNumber)?.loosePacked.push({ unit: number, quantity: entry.quantity });
    const packing = run.milestones.find((milestone) => milestone.key === 'pack');
    if (packing && packing.state === 'pending') {
      run.milestones = run.milestones.map((milestone) => (milestone.id === packing.id ? { ...milestone, state: 'in_progress', actualStart: today() } : milestone));
      run.state = runStateFrom(run.milestones, run.state);
    }
    return number;
  },
  async setLotQuality(input: { number: string; state: LotQualityState; note: string }): Promise<void> {
    const lot = store.lots.find((candidate) => candidate.number === input.number);
    if (!lot) throw new Error('No such lot.');
    lot.qualityState = input.state;
  },
};
