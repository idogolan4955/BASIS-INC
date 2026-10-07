import { allocateShipmentCosts, costsForRun, defaultAllocationRules, landedUnitCost, lineValue, toBase, type AllocationRules, type CostFacts, type LineFacts, type TransportMode } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { deriveShipment, loadShipment } from './logistics';
import { timeline } from './manufacturing';

// Costing: costs recorded on a shipment as estimates and then actuals, the
// customs entry that clears it, the rates that carry foreign amounts into the
// base currency, and the allocation run that spreads every cost over the
// lines so each lot knows its landed cost per metre. Finalising is audited.

const LOGISTICS_COSTS = ['owner', 'operations', 'logistics', 'finance'] as const;
const LANDED = ['owner', 'operations', 'finance'] as const;
const int64 = z.string().regex(/^-?\d+$/, 'Fixed-point integer expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');
const currency = z.string().regex(/^[A-Z]{3}$/);
const rate = z.string().regex(/^\d+(\.\d{1,8})?$/, 'A decimal rate');
const shipmentNumber = z.string().regex(/^SHP-\d{2}-\d{4}$/);
const today = () => new Date().toISOString().slice(0, 10);

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

/** The base currency: the default legal entity's, else USD (DOMAIN_MODEL M5). */
async function baseCurrency(): Promise<string> {
  const { legalEntities } = await graphql<{ legalEntities: { baseCurrency: { code: string } }[] }>(`query { legalEntities(where: { isDefault: { eq: true } }, limit: 1) { baseCurrency { code } } }`);
  return legalEntities[0]?.baseCurrency.code ?? 'USD';
}

/** The latest recorded rate from `quote` into `base` on or before a date; 1 for the base itself. */
async function rateFor(base: string, quote: string, on: string): Promise<string | null> {
  if (base === quote) return '1';
  const { fxRates } = await graphql<{ fxRates: { rate: string }[] }>(
    `query ($base: String!, $quote: String!, $on: Date!) { fxRates(where: { base: { eq: $base }, quote: { eq: $quote }, rateDate: { le: $on } }, orderBy: { rateDate: DESC }, limit: 1) { rate } }`,
    { base, quote, on },
  );
  return fxRates[0]?.rate ?? null;
}

// ---------------------------------------------------------------- rates

const fxInput = z.object({ base: currency, quote: currency, rateDate: date, rate, source: z.string().max(40).optional() });

export const setFxRate = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS_COSTS, 'Recording rates');
  const parsed = fxInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.base === input.quote) throw failure('validation', 'A rate is between two currencies.', { quote: 'Choose another currency' });
  const { fxRates } = await graphql<{ fxRates: { id: string }[] }>(`query ($base: String!, $quote: String!, $on: Date!) { fxRates(where: { base: { eq: $base }, quote: { eq: $quote }, rateDate: { eq: $on } }, limit: 1) { id } }`, { base: input.base, quote: input.quote, on: input.rateDate });
  if (fxRates[0]) {
    await graphql(`mutation ($id: UUID!, $rate: String!, $source: String) { fxRate_update(id: $id, data: { rate: $rate, source: $source }) }`, { id: fxRates[0].id, rate: input.rate, source: input.source ?? 'manual' });
  } else {
    await graphql(`mutation ($base: String!, $quote: String!, $on: Date!, $rate: String!, $source: String) { fxRate_insert(data: { base: $base, quote: $quote, rateDate: $on, rate: $rate, source: $source }) }`, { base: input.base, quote: input.quote, on: input.rateDate, rate: input.rate, source: input.source ?? 'manual' });
  }
  await audit(caller.uid, 'fx.set', 'fx_rate', `${input.quote}/${input.base}@${input.rateDate}`, null, { rate: input.rate, source: input.source ?? 'manual' });
  return { base: input.base, quote: input.quote, rateDate: input.rateDate, rate: input.rate };
});

// ---------------------------------------------------------------- costs

const costInput = z.object({
  number: shipmentNumber,
  /** Set to change or remove an existing cost. */
  id: z.string().optional(),
  remove: z.boolean().optional(),
  category: z.enum(['freight', 'origin_charges', 'insurance', 'duty', 'tax', 'brokerage', 'local_delivery', 'other']).optional(),
  kind: z.enum(['estimate', 'actual']).optional(),
  amount: int64.optional(),
  currency: currency.optional(),
  /** Given when the invoice fixed it; otherwise the recorded rate for the day. */
  fxRateToBase: rate.optional(),
  vendorId: z.string().nullable().optional(),
  invoiceRef: z.string().max(80).nullable().optional(),
  invoiceDate: date.nullable().optional(),
  isRecoverable: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const recordShipmentCost = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS_COSTS, 'Recording shipment costs');
  const parsed = costInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (shipment.state === 'cancelled') throw failure('invariant_violation', `${input.number} is cancelled.`);

  if (input.id && input.remove) {
    await graphql(`mutation ($id: UUID!) { costAllocationLine_deleteMany(where: { shipmentCostId: { eq: $id } }) }`, { id: input.id });
    await graphql(`mutation ($id: UUID!) { shipmentCost_delete(id: $id) }`, { id: input.id });
    await audit(caller.uid, 'shipment_cost.remove', 'shipment', input.number, { id: input.id }, null);
    await timeline('shipment', input.number, 'cost', caller.uid, 'A cost was removed; rerun the allocation');
    return { number: input.number, removed: true };
  }
  if (!input.category || !input.kind || !input.amount || !input.currency) throw failure('validation', 'Category, kind, amount and currency are needed.');
  if (BigInt(input.amount) <= 0n) throw failure('validation', 'An amount is more than zero.', { amount: 'More than zero' });
  const base = await baseCurrency();
  const on = input.invoiceDate ?? today();
  const fx = input.fxRateToBase ?? (await rateFor(base, input.currency, on));
  if (!fx) throw failure('invariant_violation', `No rate from ${input.currency} to ${base} on or before ${on}. Record one in Costing › FX rates.`, { fxRateToBase: 'Rate missing' });
  const amountBase = toBase(input.amount, fx);
  const data = { category: input.category, kind: input.kind, amount: input.amount, currency: input.currency, fx, amountBase, vendorId: input.vendorId ?? null, invoiceRef: input.invoiceRef ?? null, invoiceDate: input.invoiceDate ?? null, recoverable: input.isRecoverable ?? false, note: input.note ?? null };
  let id = input.id;
  if (id) {
    await graphql(
      `mutation ($id: UUID!, $category: CostCategory!, $kind: CostKind!, $amount: Int64!, $currency: String!, $fx: String!, $amountBase: Int64!, $vendorId: UUID, $invoiceRef: String, $invoiceDate: Date, $recoverable: Boolean!, $note: String) {
        shipmentCost_update(id: $id, data: { category: $category, kind: $kind, amount: $amount, currency: $currency, fxRateToBase: $fx, amountBase: $amountBase, vendorId: $vendorId, invoiceRef: $invoiceRef, invoiceDate: $invoiceDate, isRecoverable: $recoverable, note: $note }) }`,
      { id, ...data },
    );
  } else {
    const { shipmentCost_insert } = await graphql<{ shipmentCost_insert: { id: string } }>(
      `mutation ($shipmentId: UUID!, $category: CostCategory!, $kind: CostKind!, $amount: Int64!, $currency: String!, $fx: String!, $amountBase: Int64!, $vendorId: UUID, $invoiceRef: String, $invoiceDate: Date, $recoverable: Boolean!, $note: String, $uid: String!) {
        shipmentCost_insert(data: { shipmentId: $shipmentId, category: $category, kind: $kind, amount: $amount, currency: $currency, fxRateToBase: $fx, amountBase: $amountBase, vendorId: $vendorId, invoiceRef: $invoiceRef, invoiceDate: $invoiceDate, isRecoverable: $recoverable, note: $note, createdByUid: $uid }) }`,
      { shipmentId: shipment.id, ...data, uid: caller.uid },
    );
    id = shipmentCost_insert.id;
  }
  const words = `${input.kind === 'actual' ? 'Actual' : 'Estimated'} ${input.category.replace('_', ' ')} ${(Number(input.amount) / 10000).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${input.currency}${input.invoiceRef ? ` (${input.invoiceRef})` : ''}`;
  await audit(caller.uid, input.id ? 'shipment_cost.update' : 'shipment_cost.record', 'shipment', input.number, null, { id, ...data });
  await emit('shipment.cost_recorded', 'shipment', input.number, { category: input.category, kind: input.kind, amountBase });
  await timeline('shipment', input.number, 'cost', caller.uid, words);
  return { number: input.number, id, amountBase, fxRateToBase: fx };
});

// ---------------------------------------------------------------- customs

const customsInput = z.object({
  number: shipmentNumber,
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable().optional(),
  brokerId: z.string().nullable().optional(),
  entryNumber: z.string().max(80).nullable().optional(),
  declaredValue: int64.nullable().optional(),
  declaredCurrency: currency.nullable().optional(),
  duties: int64.nullable().optional(),
  taxes: int64.nullable().optional(),
  state: z.enum(['preparing', 'submitted', 'held', 'cleared']),
  submittedOn: date.nullable().optional(),
  clearedOn: date.nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

/** The one customs entry of a shipment: declared, held or cleared. A hold blocks the shipment until it clears. */
export const recordCustomsEntry = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations', 'logistics'], 'Recording customs');
  const parsed = customsInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (shipment.state !== 'booked') throw failure('invariant_violation', `${input.number} is ${shipment.state}; customs is recorded on a booked shipment.`);
  if (input.state === 'cleared' && !input.clearedOn) throw failure('validation', 'A cleared entry has the date it cleared.', { clearedOn: 'Give the date' });
  const { customsEntries } = await graphql<{ customsEntries: { id: string; state: string }[] }>(`query ($id: UUID!) { customsEntries(where: { shipmentId: { eq: $id } }, limit: 1) { id state } }`, { id: shipment.id });
  const existing = customsEntries[0];
  const variables = { countryCode: input.countryCode ?? shipment.destination.country?.code ?? null, brokerId: input.brokerId ?? null, entryNumber: input.entryNumber ?? null, declaredValue: input.declaredValue ?? null, declaredCurrency: input.declaredCurrency ?? null, duties: input.duties ?? null, taxes: input.taxes ?? null, state: input.state, submittedOn: input.submittedOn ?? null, clearedOn: input.clearedOn ?? null, note: input.note ?? null };
  if (existing) {
    await graphql(
      `mutation ($id: UUID!, $countryCode: String, $brokerId: UUID, $entryNumber: String, $declaredValue: Int64, $declaredCurrency: String, $duties: Int64, $taxes: Int64, $state: CustomsState!, $submittedOn: Date, $clearedOn: Date, $note: String) {
        customsEntry_update(id: $id, data: { countryCode: $countryCode, brokerId: $brokerId, entryNumber: $entryNumber, declaredValue: $declaredValue, declaredCurrency: $declaredCurrency, duties: $duties, taxes: $taxes, state: $state, submittedOn: $submittedOn, clearedOn: $clearedOn, note: $note, updatedAt_expr: "request.time" }) }`,
      { id: existing.id, ...variables },
    );
  } else {
    await graphql(
      `mutation ($shipmentId: UUID!, $countryCode: String, $brokerId: UUID, $entryNumber: String, $declaredValue: Int64, $declaredCurrency: String, $duties: Int64, $taxes: Int64, $state: CustomsState!, $submittedOn: Date, $clearedOn: Date, $note: String) {
        customsEntry_insert(data: { shipmentId: $shipmentId, countryCode: $countryCode, brokerId: $brokerId, entryNumber: $entryNumber, declaredValue: $declaredValue, declaredCurrency: $declaredCurrency, duties: $duties, taxes: $taxes, state: $state, submittedOn: $submittedOn, clearedOn: $clearedOn, note: $note }) }`,
      { shipmentId: shipment.id, ...variables },
    );
  }
  // A hold blocks; a clearance completes the customs leg when it is the one in hand.
  const legs = shipment.shipmentLegs_on_shipment;
  const customsLeg = legs.find((leg) => leg.type === 'customs');
  let legSummary = '';
  if (customsLeg && input.state === 'cleared' && !customsLeg.ata) {
    const before = legs.filter((leg) => leg.sequence < customsLeg.sequence);
    if (before.every((leg) => leg.ata)) {
      const atd = customsLeg.atd ?? input.submittedOn ?? input.clearedOn!;
      await graphql(`mutation ($id: UUID!, $atd: Date!, $ata: Date!) { shipmentLeg_update(id: $id, data: { atd: $atd, ata: $ata }) }`, { id: customsLeg.id, atd, ata: input.clearedOn! });
      Object.assign(customsLeg, { atd, ata: input.clearedOn! });
      legSummary = '; customs leg completed';
    }
  }
  const derived = await deriveShipment({ ...shipment, customsEntries_on_shipment: [{ state: input.state }] }, legs);
  const words = { preparing: 'Customs entry in preparation', submitted: `Customs entry submitted${input.entryNumber ? ` ${input.entryNumber}` : ''}`, held: `Customs hold${input.note ? `: ${input.note}` : ''}`, cleared: `Customs cleared ${input.clearedOn}` }[input.state];
  await audit(caller.uid, 'customs.record', 'shipment', input.number, existing ? { state: existing.state } : null, { ...variables, health: derived.health });
  await emit('shipment.customs', 'shipment', input.number, { state: input.state, health: derived.health });
  await timeline('shipment', input.number, 'customs', caller.uid, `${words}${legSummary}`);
  return { number: input.number, state: input.state, health: derived.health, stage: derived.stage };
});

// ---------------------------------------------------------------- allocation

const allocateInput = z.object({
  number: shipmentNumber,
  kind: z.enum(['estimate', 'final']),
  /** Overrides of the default basis per category. */
  rules: z.record(z.enum(['freight', 'origin_charges', 'insurance', 'duty', 'tax', 'brokerage', 'local_delivery', 'other']), z.enum(['value', 'quantity', 'gross_weight', 'cbm'])).optional(),
});

interface CostingRow {
  id: string;
  number: string;
  mode: TransportMode;
  state: string;
  shipmentCosts_on_shipment: { id: string; category: CostFacts['category']; kind: CostFacts['kind']; amountBase: string; isRecoverable: boolean }[];
  shipmentLines_on_shipment: { id: string; quantity: string; lot: { id: string; number: string }; purchaseOrderLine: { unitPrice: string; purchaseOrder: { currency: string; fxRateToBase: string | null; issuedOn: string | null } } | null }[];
  handlingUnits_on_shipment: { lengthCm: number | null; widthCm: number | null; heightCm: number | null; grossWeightG: number | null; parent: { number: string } | null; handlingUnitContents_on_handlingUnit: { quantity: string | null; roll: { measuredLength: string; lot: { number: string } } | null; lot: { number: string } | null }[] }[];
  costAllocationRuns_on_shipment: { version: number }[];
}

/**
 * Spreads the shipment's costs over its lines and writes every lot's landed
 * cost. An estimate may run any time; a final run needs every landing cost
 * to be actual and marks the lot costs final.
 */
export const allocateShipmentCosts_ = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LANDED, 'Allocating landed cost');
  const parsed = allocateInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const { shipments } = await graphql<{ shipments: CostingRow[] }>(
    `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) {
       id number mode state
       shipmentCosts_on_shipment { id category kind amountBase isRecoverable }
       shipmentLines_on_shipment { id quantity lot { id number } purchaseOrderLine { unitPrice purchaseOrder { currency fxRateToBase issuedOn } } }
       handlingUnits_on_shipment { lengthCm widthCm heightCm grossWeightG parent { number } handlingUnitContents_on_handlingUnit { quantity roll { measuredLength lot { number } } lot { number } } }
       costAllocationRuns_on_shipment { version } } }`,
    { number: input.number },
  );
  const shipment = shipments[0];
  if (!shipment) throw failure('not_found', `No shipment ${input.number}.`);
  if (shipment.state !== 'booked' && shipment.state !== 'closed') throw failure('invariant_violation', `${input.number} is ${shipment.state}; costs are allocated on a booked shipment.`);
  if (shipment.shipmentLines_on_shipment.length === 0) throw failure('invariant_violation', 'Nothing is loaded; there is nothing to land the costs on.');

  const { taken, stillEstimated } = costsForRun(shipment.shipmentCosts_on_shipment, input.kind);
  if (input.kind === 'final' && stillEstimated.length > 0) throw failure('invariant_violation', `Still estimated: ${stillEstimated.map((category) => category.replace('_', ' ')).join(', ')}. Record the actual invoices before finalising.`);
  if (taken.length === 0) throw failure('invariant_violation', 'No costs to allocate yet.');

  const base = await baseCurrency();
  // Volume and weight sit on packages, which may mix lots: each lot's share is its metres within the package.
  const perLot = new Map<string, { grossG: number; cbmMilli: number }>();
  for (const unit of shipment.handlingUnits_on_shipment) {
    if (unit.parent) continue;
    const contents = unit.handlingUnitContents_on_handlingUnit.map((content) => ({ lot: content.roll?.lot.number ?? content.lot?.number ?? '', quantity: BigInt(content.roll ? content.roll.measuredLength : (content.quantity ?? '0')) }));
    const total = contents.reduce((sum, content) => sum + content.quantity, 0n);
    const cbm = unit.lengthCm && unit.widthCm && unit.heightCm ? Math.round((unit.lengthCm * unit.widthCm * unit.heightCm) / 1000) : 0;
    for (const lot of new Set(contents.map((content) => content.lot))) {
      const share = total === 0n ? 0 : Number((contents.filter((content) => content.lot === lot).reduce((sum, content) => sum + content.quantity, 0n) * 10000n) / total) / 10000;
      const current = perLot.get(lot) ?? { grossG: 0, cbmMilli: 0 };
      perLot.set(lot, { grossG: current.grossG + Math.round((unit.grossWeightG ?? 0) * share), cbmMilli: current.cbmMilli + Math.round(cbm * share) });
    }
  }
  const lines: (LineFacts & { lotId: string; purchaseUnitCostBase: string })[] = [];
  for (const line of shipment.shipmentLines_on_shipment) {
    if (!line.purchaseOrderLine) throw failure('invariant_violation', 'Landed cost is allocated on inbound shipments; an outbound shipment carries stock already costed.');
    const po = line.purchaseOrderLine.purchaseOrder;
    const fx = po.fxRateToBase ?? (await rateFor(base, po.currency, po.issuedOn ?? today()));
    if (!fx) throw failure('invariant_violation', `No rate from ${po.currency} to ${base} for the purchase price of ${line.lot.number}. Record one in Costing › FX rates.`);
    const purchaseUnitCostBase = toBase(line.purchaseOrderLine.unitPrice, fx);
    const physical = perLot.get(line.lot.number) ?? { grossG: 0, cbmMilli: 0 };
    lines.push({ id: line.id, lotNumber: line.lot.number, lotId: line.lot.id, quantity: line.quantity, valueBase: lineValue(purchaseUnitCostBase, line.quantity), grossWeightG: physical.grossG, cbmMilli: physical.cbmMilli, purchaseUnitCostBase });
  }
  const rules: AllocationRules = { ...defaultAllocationRules(shipment.mode), ...(input.rules ?? {}) };
  const result = allocateShipmentCosts(taken, lines, rules);

  const version = Math.max(0, ...shipment.costAllocationRuns_on_shipment.map((run) => run.version)) + 1;
  const { costAllocationRun_insert } = await graphql<{ costAllocationRun_insert: { id: string } }>(
    `mutation ($shipmentId: UUID!, $version: Int!, $kind: AllocationKind!, $base: String!, $rules: Any, $total: Int64!, $uid: String!) {
      costAllocationRun_insert(data: { shipmentId: $shipmentId, version: $version, kind: $kind, baseCurrency: $base, rules: $rules, totalBase: $total, performedByUid: $uid }) }`,
    { shipmentId: shipment.id, version, kind: input.kind, base, rules, total: result.totalBase, uid: caller.uid },
  );
  const runId = costAllocationRun_insert.id;
  for (const entry of result.byCost) {
    for (const part of entry.parts) {
      await graphql(`mutation ($runId: UUID!, $costId: UUID!, $lineId: UUID!, $amount: Int64!) { costAllocationLine_insert(data: { runId: $runId, shipmentCostId: $costId, shipmentLineId: $lineId, amountBase: $amount }) }`, { runId, costId: entry.costId, lineId: part.lineId, amount: part.amountBase });
    }
  }
  const lots: { number: string; landed: string; purchase: string }[] = [];
  for (const line of lines) {
    const landed = result.byLine.find((candidate) => candidate.lineId === line.id)!;
    const allocatedUnit = landedUnitCost('0', landed.allocatedBase, line.quantity);
    const unit = landedUnitCost(line.purchaseUnitCostBase, landed.allocatedBase, line.quantity);
    // One cost row per lot and shipment: the new run replaces the previous one.
    await graphql(`mutation ($lotId: UUID!, $shipmentId: UUID!) { lotCost_deleteMany(where: { lotId: { eq: $lotId }, shipmentId: { eq: $shipmentId } }) }`, { lotId: line.lotId, shipmentId: shipment.id });
    await graphql(
      `mutation ($lotId: UUID!, $shipmentId: UUID!, $runId: UUID!, $version: Int!, $currency: String!, $quantity: Int64!, $purchase: Int64!, $allocated: Any, $allocatedUnit: Int64!, $landed: Int64!, $final: Boolean!) {
        lotCost_insert(data: { lotId: $lotId, shipmentId: $shipmentId, runId: $runId, version: $version, currency: $currency, quantity: $quantity, purchaseUnitCost: $purchase, allocated: $allocated, allocatedUnit: $allocatedUnit, landedUnitCost: $landed, isFinal: $final }) }`,
      { lotId: line.lotId, shipmentId: shipment.id, runId, version, currency: base, quantity: line.quantity, purchase: line.purchaseUnitCostBase, allocated: landed.byCategory, allocatedUnit, landed: unit, final: input.kind === 'final' },
    );
    lots.push({ number: line.lotNumber, landed: unit, purchase: line.purchaseUnitCostBase });
  }
  const perMetre = (value: string) => (Number(value) / 10000).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const summary = `${input.kind === 'final' ? 'Final landed cost' : 'Estimated landed cost'} v${version}: ${(Number(result.totalBase) / 10000).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${base} over ${lines.length} lines; ${lots.map((lot) => `${lot.number} ${perMetre(lot.landed)} ${base}/m`).join(', ')}`;
  await audit(caller.uid, input.kind === 'final' ? 'costing.finalise' : 'costing.estimate', 'shipment', input.number, null, { runId, version, kind: input.kind, totalBase: result.totalBase, rules, lots });
  await emit(input.kind === 'final' ? 'costing.finalised' : 'costing.estimated', 'shipment', input.number, { runId, version, totalBase: result.totalBase });
  await timeline('shipment', input.number, 'costing', caller.uid, summary);
  for (const lot of lots) await timeline('lot', lot.number, 'costing', caller.uid, `${input.kind === 'final' ? 'Landed cost final' : 'Landed cost estimated'}: ${perMetre(lot.landed)} ${base}/m on ${input.number} (purchase ${perMetre(lot.purchase)})`);
  return { number: input.number, runId, version, kind: input.kind, totalBase: result.totalBase, baseCurrency: base, lots };
});

export { allocateShipmentCosts_ as allocateShipmentCosts };
