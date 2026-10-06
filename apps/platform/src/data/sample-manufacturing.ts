import {
  LAUNCH_CATALOG,
  addDays,
  planMilestones,
  propagateForecasts,
  runForecastEnd,
  runHealth,
  runProgress,
  runStateFrom,
  todayIn,
  type MilestoneRecord,
  type ProcessTemplateView,
  type PurchaseOrderCosts,
  type PurchaseOrderDetail,
  type PurchaseOrderLineView,
  type PurchaseOrderState,
  type PurchaseOrderSummary,
  type RunDetail,
  type RunState,
  type RunSummary,
  type TemplateStep,
} from '@basis/shared';
import type { MilestoneUpdateInput, NewPurchaseOrderInput, NewRunInput } from './manufacturing';

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

function line(lineNo: number, skuCode: string, quantity: string, over = 5, under = 5): PurchaseOrderLineView {
  const [productCode, , shadeCode] = skuCode.split('-') as [string, string, string];
  const p = product(productCode);
  const s = shade(shadeCode);
  return { id: `line-${skuCode}-${lineNo}`, lineNo, skuCode, productCode, productName: p.name, variantName: '160 cm', shadeCode, shadeName: s.name, shadeHex: s.hex, quantity, uom: 'm', overTolerancePercent: over, underTolerancePercent: under, requestedExFactory: null };
}

const store = {
  pos: [] as PoRecord[],
  runs: [] as RunRecord[],
  sequence: { PO: 44, RUN: 35 },
};

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
  const planned = planMilestones(TEMPLATES[0]!.steps, addDays(t, -20));
  const states: Record<string, Partial<MilestoneRecord>> = {
    yarn: { state: 'done', actualStart: addDays(t, -20), actualEnd: addDays(t, -13) },
    labdip: { state: 'done', actualStart: addDays(t, -13), actualEnd: addDays(t, -11) },
    knit: { state: 'done', actualStart: addDays(t, -13), actualEnd: addDays(t, -3) },
    dye: { state: 'in_progress', actualStart: addDays(t, -3), forecastEnd: addDays(t, 7), delayReason: 'Dyehouse backlog' },
  };
  const milestones: MilestoneRecord[] = planned.map((step) => ({ id: `ms-31-${step.key}`, ...step, forecastEnd: null, actualStart: null, actualEnd: null, state: 'pending', delayReason: '', note: '', ...states[step.key] }));
  const propagated = propagateForecasts(milestones);
  store.runs = [
    {
      id: 'run-31', number: 'RUN-26-0031', state: 'active', purchaseOrderNumber: 'PO-26-0041', templateName: 'Warp-knit mesh', plannedStart: addDays(t, -20), notes: '',
      milestones: milestones.map((candidate) => (candidate.state === 'pending' ? { ...candidate, forecastEnd: propagated.get(candidate.key) ?? null } : candidate)),
    },
  ];
}
seed();

const poTotal = (po: PoRecord) => po.lines.reduce((total, l) => total + BigInt(l.quantity), 0n).toString();

function summary(po: PoRecord): PurchaseOrderSummary {
  const runs = store.runs.filter((run) => run.purchaseOrderNumber === po.number).map((run) => ({ number: run.number, state: run.state, health: runHealth(run.milestones, today()) }));
  return { ...po, totalQuantity: poTotal(po), lineCount: po.lines.length, products: [...new Set(po.lines.map((l) => l.productName))], runs };
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
    return {
      ...runSummary(run),
      purchaseOrderState: po.state,
      supplierId: po.supplierId,
      notes: run.notes,
      lines: po.lines.map((l) => ({ id: `rl-${l.id}`, skuCode: l.skuCode, productName: l.productName, variantName: l.variantName, shadeCode: l.shadeCode, shadeName: l.shadeName, shadeHex: l.shadeHex, plannedQuantity: l.quantity, producedQuantity: '0', uom: l.uom })),
      lots: [],
    };
  },
  async templates(): Promise<ProcessTemplateView[]> {
    return TEMPLATES;
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
};
