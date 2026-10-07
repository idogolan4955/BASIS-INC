import { addDays, allocateShipmentCosts, costsForRun, defaultAllocationRules, landedUnitCost, lineValue, toBase, todayIn, type AllocationRules, type AllocationRunView, type CostCategory, type CustomsEntryView, type FxRateView, type LineFacts, type LotCostView, type ShipmentCostView } from '@basis/shared';
import type { AllocateInput, CostInput, CustomsInput, FxInput, ShipmentCosting } from './costing';

// SAMPLE DATA for `--mode sample`: costs on the shipments at sea, one
// estimate run and one final, so the costing screens have true figures. The
// same allocation code runs here as in the functions.

const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const BASE = 'USD';
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const store = {
  costs: new Map<string, Mutable<ShipmentCostView>[]>(),
  customs: new Map<string, Mutable<CustomsEntryView>>(),
  runs: new Map<string, AllocationRunView[]>(),
  lotCosts: [] as LotCostView[],
  fx: [] as FxRateView[],
  sequence: 0,
};

/** Purchase price per metre in USD for the sample lots. */
const PURCHASE: Record<string, string> = { 'LOT-26-0009': '28500', 'LOT-26-0010': '31200', 'LOT-26-0008': '34000', 'LOT-26-0006': '19800', 'LOT-26-0007': '19800', 'LOT-26-0012': '19800', 'LOT-26-0013': '19800' };

async function linesOf(number: string): Promise<(LineFacts & { purchaseUnitCostBase: string })[]> {
  const { sampleLogistics } = await import('./sample-logistics');
  const shipment = await sampleLogistics.shipment(number);
  if (!shipment) throw new Error(`No shipment ${number}.`);
  const perLot = new Map<string, { grossG: number; cbmMilli: number }>();
  for (const unit of shipment.units) {
    if (unit.parentNumber) continue;
    const total = BigInt(unit.quantity);
    for (const lot of new Set(unit.contents.map((content) => content.lotNumber))) {
      const share = total === 0n ? 0 : Number((unit.contents.filter((content) => content.lotNumber === lot).reduce((sum, content) => sum + BigInt(content.quantity), 0n) * 10000n) / total) / 10000;
      const current = perLot.get(lot) ?? { grossG: 0, cbmMilli: 0 };
      perLot.set(lot, { grossG: current.grossG + Math.round((unit.grossWeightG ?? 0) * share), cbmMilli: current.cbmMilli + Math.round((unit.cbmMilli ?? 0) * share) });
    }
  }
  return shipment.lines.map((line) => {
    const purchase = PURCHASE[line.lotNumber] ?? '20000';
    const physical = perLot.get(line.lotNumber) ?? { grossG: 0, cbmMilli: 0 };
    return { id: line.id, lotNumber: line.lotNumber, quantity: line.quantity, valueBase: lineValue(purchase, line.quantity), grossWeightG: physical.grossG, cbmMilli: physical.cbmMilli, purchaseUnitCostBase: purchase };
  });
}

function cost(id: string, category: CostCategory, kind: 'estimate' | 'actual', amount: string, currency = BASE, extra: Partial<ShipmentCostView> = {}): Mutable<ShipmentCostView> {
  const fx = currency === BASE ? '1' : (store.fx.find((rate) => rate.quote === currency)?.rate ?? '1');
  return { id, category, kind, amount, currency, fxRateToBase: fx, amountBase: toBase(amount, fx), vendorName: '', invoiceRef: '', invoiceDate: null, isRecoverable: false, note: '', ...extra };
}

async function runAllocation(number: string, kind: 'estimate' | 'final', mode: 'sea' | 'air' | 'courier' | 'road', overrides: Partial<AllocationRules> = {}, when = new Date().toISOString()): Promise<AllocationRunView> {
  const costs = store.costs.get(number) ?? [];
  const { taken, stillEstimated } = costsForRun(costs, kind);
  if (kind === 'final' && stillEstimated.length > 0) throw new Error(`Still estimated: ${stillEstimated.map((category) => category.replace('_', ' ')).join(', ')}. Record the actual invoices before finalising.`);
  if (taken.length === 0) throw new Error('No costs to allocate yet.');
  const lines = await linesOf(number);
  const rules = { ...defaultAllocationRules(mode), ...overrides };
  const result = allocateShipmentCosts(taken, lines, rules);
  const runs = store.runs.get(number) ?? [];
  const version = runs.length + 1;
  const run: AllocationRunView = {
    id: `run-${number}-${version}`,
    version,
    kind,
    baseCurrency: BASE,
    rules,
    performedByName: 'Sample session',
    performedAt: when,
    totalBase: result.totalBase,
    lines: lines.map((line) => {
      const landed = result.byLine.find((candidate) => candidate.lineId === line.id)!;
      return { lineId: line.id, lotNumber: line.lotNumber, skuCode: '', quantity: line.quantity, valueBase: line.valueBase, byCategory: landed.byCategory, allocatedBase: landed.allocatedBase, landedUnitCostBase: landedUnitCost(line.purchaseUnitCostBase, landed.allocatedBase, line.quantity), purchaseUnitCostBase: line.purchaseUnitCostBase };
    }),
  };
  store.runs.set(number, [run, ...runs]);
  const { sampleLogistics } = await import('./sample-logistics');
  const shipment = (await sampleLogistics.shipment(number))!;
  store.lotCosts = store.lotCosts.filter((candidate) => candidate.shipmentNumber !== number);
  for (const line of run.lines) {
    const detail = shipment.lines.find((candidate) => candidate.id === line.lineId)!;
    store.lotCosts.unshift({ id: `lc-${number}-${line.lotNumber}-${version}`, lotNumber: line.lotNumber, skuCode: detail.skuCode, productName: detail.productName, shadeName: detail.shadeName, shipmentNumber: number, version, currency: BASE, quantity: line.quantity, purchaseUnitCost: line.purchaseUnitCostBase, allocated: line.byCategory, allocatedUnit: landedUnitCost('0', line.allocatedBase, line.quantity), landedUnitCost: line.landedUnitCostBase, isFinal: kind === 'final', computedAt: when });
  }
  return run;
}

let seeded = false;
async function seed(): Promise<void> {
  if (seeded) return;
  seeded = true;
  const t = today();
  store.fx = [
    { id: 'fx-1', base: BASE, quote: 'EUR', rateDate: addDays(t, -6), rate: '1.0850', source: 'manual' },
    { id: 'fx-2', base: BASE, quote: 'CNY', rateDate: addDays(t, -6), rate: '0.1389', source: 'manual' },
    { id: 'fx-3', base: BASE, quote: 'ILS', rateDate: addDays(t, -6), rate: '0.2710', source: 'manual' },
  ];
  store.costs.set('SHP-26-0014', [
    cost('c-14-1', 'freight', 'actual', '18400000', BASE, { vendorName: 'Marlin Logistics', invoiceRef: 'MRL-4412', invoiceDate: addDays(t, -16) }),
    cost('c-14-2', 'origin_charges', 'actual', '2100000', 'CNY', { vendorName: 'Marlin Logistics', invoiceRef: 'MRL-4412', invoiceDate: addDays(t, -16) }),
    cost('c-14-3', 'insurance', 'actual', '1560000', BASE, { invoiceRef: 'INS-20691', invoiceDate: addDays(t, -20) }),
    cost('c-14-4', 'duty', 'estimate', '20350000', 'EUR', { note: '8 % on the customs value' }),
    cost('c-14-5', 'brokerage', 'estimate', '3200000', 'EUR', { vendorName: 'Kessler Zollservice' }),
  ]);
  store.costs.set('SHP-26-0016', [
    cost('c-16-1', 'freight', 'estimate', '31000000', BASE, { vendorName: 'Marlin Logistics' }),
    cost('c-16-2', 'duty', 'estimate', '20600000', 'EUR'),
    cost('c-16-3', 'local_delivery', 'estimate', '8500000', 'EUR'),
  ]);
  store.costs.set('SHP-26-0013', [cost('c-13-1', 'freight', 'actual', '1420000', BASE, { vendorName: 'DHL', invoiceRef: 'DHL-99120', invoiceDate: addDays(t, -3) })]);
  store.customs.set('SHP-26-0015', { id: 'cu-15', countryCode: 'US', countryName: 'United States', brokerName: '', entryNumber: 'US-2026-55012', declaredValue: '408000000', declaredCurrency: BASE, duties: null, taxes: null, state: 'held', submittedOn: addDays(t, -2), clearedOn: null, note: 'Textile declaration query: fibre content certificate requested' });
  await runAllocation('SHP-26-0014', 'estimate', 'sea', {}, `${addDays(t, -18)}T09:00:00Z`);
  await runAllocation('SHP-26-0016', 'estimate', 'sea', {}, `${addDays(t, -9)}T09:00:00Z`);
  await runAllocation('SHP-26-0013', 'final', 'courier', {}, `${addDays(t, -2)}T09:00:00Z`);
}

const modeOf = async (number: string) => {
  const { sampleLogistics } = await import('./sample-logistics');
  return (await sampleLogistics.shipment(number))?.mode ?? 'sea';
};

export const sampleCosting = {
  async shipmentCosts(number: string): Promise<ShipmentCosting | null> {
    await seed();
    return structuredClone({ costs: store.costs.get(number) ?? [], customs: store.customs.get(number) ?? null, runs: (store.runs.get(number) ?? []).map((run) => ({ id: run.id, version: run.version, kind: run.kind, baseCurrency: run.baseCurrency, rules: run.rules, totalBase: run.totalBase, performedAt: run.performedAt })) });
  },
  async allocationRun(id: string): Promise<AllocationRunView | null> {
    await seed();
    for (const runs of store.runs.values()) {
      const run = runs.find((candidate) => candidate.id === id);
      if (run) return structuredClone(run);
    }
    return null;
  },
  async lotCosts(): Promise<LotCostView[]> {
    await seed();
    return structuredClone(store.lotCosts);
  },
  async fxRates(): Promise<FxRateView[]> {
    await seed();
    return structuredClone(store.fx);
  },
  async recordCost(input: CostInput): Promise<{ number: string }> {
    await seed();
    const costs = store.costs.get(input.number) ?? [];
    if (input.id && input.remove) {
      store.costs.set(input.number, costs.filter((candidate) => candidate.id !== input.id));
      return { number: input.number };
    }
    if (!input.category || !input.kind || !input.amount || !input.currency) throw new Error('Category, kind, amount and currency are needed.');
    const fx = input.fxRateToBase ?? (input.currency === BASE ? '1' : store.fx.find((rate) => rate.quote === input.currency)?.rate);
    if (!fx) throw new Error(`No rate from ${input.currency} to ${BASE}. Record one in Costing › FX rates.`);
    const next: Mutable<ShipmentCostView> = { id: input.id ?? `c-${input.number}-${++store.sequence}`, category: input.category, kind: input.kind, amount: input.amount, currency: input.currency, fxRateToBase: fx, amountBase: toBase(input.amount, fx), vendorName: input.vendorId === 'co-marlin' ? 'Marlin Logistics' : input.vendorId === 'co-kessler' ? 'Kessler Zollservice' : '', invoiceRef: input.invoiceRef ?? '', invoiceDate: input.invoiceDate ?? null, isRecoverable: input.isRecoverable ?? false, note: input.note ?? '' };
    const index = costs.findIndex((candidate) => candidate.id === next.id);
    if (index >= 0) costs[index] = next;
    else costs.push(next);
    store.costs.set(input.number, costs);
    return { number: input.number };
  },
  async recordCustoms(input: CustomsInput): Promise<{ number: string; state: CustomsEntryView['state'] }> {
    await seed();
    const current = store.customs.get(input.number);
    store.customs.set(input.number, { id: current?.id ?? `cu-${input.number}`, countryCode: input.countryCode ?? current?.countryCode ?? '', countryName: current?.countryName ?? '', brokerName: input.brokerId === 'co-kessler' ? 'Kessler Zollservice' : (current?.brokerName ?? ''), entryNumber: input.entryNumber ?? current?.entryNumber ?? '', declaredValue: input.declaredValue ?? current?.declaredValue ?? null, declaredCurrency: input.declaredCurrency ?? current?.declaredCurrency ?? '', duties: input.duties ?? current?.duties ?? null, taxes: input.taxes ?? current?.taxes ?? null, state: input.state, submittedOn: input.submittedOn ?? current?.submittedOn ?? null, clearedOn: input.clearedOn ?? current?.clearedOn ?? null, note: input.note ?? current?.note ?? '' });
    const { sampleLogistics } = await import('./sample-logistics');
    await sampleLogistics.setCustomsHeld(input.number, input.state === 'held');
    return { number: input.number, state: input.state };
  },
  async setFxRate(input: FxInput): Promise<{ rate: string }> {
    await seed();
    const existing = store.fx.find((rate) => rate.base === input.base && rate.quote === input.quote && rate.rateDate === input.rateDate);
    if (existing) Object.assign(existing, { rate: input.rate, source: input.source ?? 'manual' });
    else store.fx.unshift({ id: `fx-${++store.sequence}`, base: input.base, quote: input.quote, rateDate: input.rateDate, rate: input.rate, source: input.source ?? 'manual' });
    return { rate: input.rate };
  },
  async allocate(input: AllocateInput): Promise<{ runId: string; version: number; kind: string; totalBase: string }> {
    await seed();
    const run = await runAllocation(input.number, input.kind, await modeOf(input.number), input.rules ?? {});
    return { runId: run.id, version: run.version, kind: run.kind, totalBase: run.totalBase };
  },
};
