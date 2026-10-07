import {
  allocate,
  divRound,
  formatBusinessNumber,
  planMilestones,
  propagateForecasts,
  runForecastEnd,
  runHealth,
  runStateFrom,
  rollNumber,
  QUANTITY_SCALE,
  type Health,
  type MilestoneFacts,
  type MilestoneState,
  type RunState,
  type TemplateStep,
} from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { fileGenerated } from './documents';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole, type Caller } from './lib';

// Purchasing and manufacturing commands: the ones that allocate numbers,
// move lifecycle states and derive run health. Reads go through the connector.

const PURCHASING = ['owner', 'operations', 'purchasing'] as const;
const PRODUCTION = ['owner', 'operations', 'purchasing', 'qc'] as const;
const QUALITY = ['owner', 'qc'] as const;

const today = () => new Date().toISOString().slice(0, 10);
const int64 = z.string().regex(/^-?\d+$/, 'Fixed-point integer expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');

export async function allocateNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const { numberSequence } = await graphql<{ numberSequence: { nextValue: number } | null }>(
    `query ($prefix: String!, $year: Int!) { numberSequence(key: { prefix: $prefix, year: $year }) { nextValue } }`,
    { prefix, year },
  );
  const sequence = numberSequence?.nextValue ?? 1;
  await graphql(
    `mutation ($prefix: String!, $year: Int!, $next: Int!) { numberSequence_upsert(data: { prefix: $prefix, year: $year, nextValue: $next }) }`,
    { prefix, year, next: sequence + 1 },
  );
  return formatBusinessNumber({ prefix, year, sequence });
}

export async function timeline(entityType: string, entityId: string, kind: string, actorUid: string, summary: string): Promise<void> {
  await graphql(
    `mutation ($entityType: String!, $entityId: String!, $kind: String!, $actorUid: String!, $payload: Any) {
      timelineEvent_insert(data: { entityType: $entityType, entityId: $entityId, kind: $kind, actorUid: $actorUid, payload: $payload }) }`,
    { entityType, entityId, kind, actorUid, payload: { summary } },
  );
}

// ---------------------------------------------------------------- purchase orders

const lineInput = z.object({
  skuCode: z.string().min(1),
  supplierItemId: z.string().optional(),
  quantity: int64,
  uom: z.string().min(1).max(8),
  unitPrice: int64,
  overTolerancePercent: z.number().int().min(0).max(50).optional(),
  underTolerancePercent: z.number().int().min(0).max(50).optional(),
  requestedExFactory: date.optional(),
});

const createPoInput = z.object({
  supplierId: z.string().min(1),
  factoryId: z.string().optional(),
  legalEntityId: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  incotermCode: z.string().optional(),
  namedPlace: z.string().max(120).optional(),
  paymentTerms: z.string().max(200).optional(),
  requestedExFactory: date.optional(),
  notes: z.string().max(4000).optional(),
  lines: z.array(lineInput).min(1).max(100),
  /** Deposit share on order; the balance falls due before shipment. */
  depositPercent: z.number().int().min(0).max(100).default(30),
});

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

export const createPurchaseOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PURCHASING, 'Creating purchase orders');
  const parsed = createPoInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;

  const number = await allocateNumber('PO');
  const { purchaseOrder_insert } = await graphql<{ purchaseOrder_insert: { id: string } }>(
    `mutation ($number: String!, $supplierId: UUID!, $factoryId: UUID, $legalEntityId: UUID, $currency: String!, $incotermCode: String, $namedPlace: String, $paymentTerms: String, $requestedExFactory: Date, $notes: String, $uid: String!) {
      purchaseOrder_insert(data: {
        number: $number, supplierId: $supplierId, factoryId: $factoryId, legalEntityId: $legalEntityId, currency: $currency,
        incotermCode: $incotermCode, namedPlace: $namedPlace, paymentTerms: $paymentTerms, requestedExFactory: $requestedExFactory,
        notes: $notes, state: draft, createdByUid: $uid, version: 1
      }) }`,
    {
      number,
      supplierId: input.supplierId,
      factoryId: input.factoryId ?? null,
      legalEntityId: input.legalEntityId ?? null,
      currency: input.currency,
      incotermCode: input.incotermCode ?? null,
      namedPlace: input.namedPlace ?? null,
      paymentTerms: input.paymentTerms ?? null,
      requestedExFactory: input.requestedExFactory ?? null,
      notes: input.notes ?? null,
      uid: caller.uid,
    },
  );
  const poId = purchaseOrder_insert.id;

  let total = 0n;
  for (const [index, line] of input.lines.entries()) {
    total += divRound(BigInt(line.unitPrice) * BigInt(line.quantity), QUANTITY_SCALE);
    await graphql(
      `mutation ($poId: UUID!, $lineNo: Int!, $skuCode: String!, $supplierItemId: UUID, $quantity: Int64!, $uom: String!, $unitPrice: Int64!, $over: Int, $under: Int, $exFactory: Date) {
        purchaseOrderLine_insert(data: { purchaseOrderId: $poId, lineNo: $lineNo, skuCode: $skuCode, supplierItemId: $supplierItemId, quantity: $quantity, uom: $uom, unitPrice: $unitPrice, overTolerancePercent: $over, underTolerancePercent: $under, requestedExFactory: $exFactory }) }`,
      {
        poId,
        lineNo: index + 1,
        skuCode: line.skuCode,
        supplierItemId: line.supplierItemId ?? null,
        quantity: line.quantity,
        uom: line.uom,
        unitPrice: line.unitPrice,
        over: line.overTolerancePercent ?? null,
        under: line.underTolerancePercent ?? null,
        exFactory: line.requestedExFactory ?? null,
      },
    );
  }

  // The payment schedule: a deposit on order and the balance before shipment,
  // split so the two sum to the order total exactly.
  const [deposit, balance] = allocate(total, [BigInt(input.depositPercent), BigInt(100 - input.depositPercent)]);
  for (const payment of [
    { label: `Deposit ${input.depositPercent}%`, percent: input.depositPercent, amount: deposit, trigger: 'on_order' },
    { label: `Balance ${100 - input.depositPercent}%`, percent: 100 - input.depositPercent, amount: balance, trigger: 'before_shipment' },
  ]) {
    if (payment.percent === 0) continue;
    await graphql(
      `mutation ($poId: UUID!, $label: String!, $percent: Int!, $amount: Int64!, $trigger: String!) {
        paymentMilestone_insert(data: { purchaseOrderId: $poId, label: $label, percent: $percent, amount: $amount, trigger: $trigger }) }`,
      { poId, label: payment.label, percent: payment.percent, amount: (payment.amount ?? 0n).toString(), trigger: payment.trigger },
    );
  }

  await audit(caller.uid, 'purchase_order.create', 'purchase_order', number, null, { supplierId: input.supplierId, lines: input.lines.length, currency: input.currency });
  await emit('purchase_order.created', 'purchase_order', number, { supplierId: input.supplierId });
  await timeline('purchase_order', number, 'created', caller.uid, `${input.lines.length} line${input.lines.length === 1 ? '' : 's'}, ${input.currency}`);
  return { number, id: poId };
});

async function loadPo(number: string) {
  const { purchaseOrders } = await graphql<{ purchaseOrders: { id: string; state: string; version: number }[] }>(
    `query ($number: String!) { purchaseOrders(where: { number: { eq: $number } }, limit: 1) { id state version } }`,
    { number },
  );
  const po = purchaseOrders[0];
  if (!po) throw failure('not_found', `No purchase order ${number}.`);
  return po;
}

async function transitionPo(number: string, from: readonly string[], to: string, extra: Record<string, unknown>, actorUid: string, action: string, summary: string) {
  const po = await loadPo(number);
  if (!from.includes(po.state)) throw failure('invariant_violation', `A ${po.state} purchase order cannot be ${to}.`);
  const sets = Object.keys(extra)
    .map((key) => `${key}: $${key}`)
    .join(', ');
  const vars = Object.keys(extra)
    .map((key) => `$${key}: ${key.endsWith('On') ? 'Date' : 'String'}`)
    .join(', ');
  await graphql(
    `mutation ($id: UUID!, $version: Int!${vars ? `, ${vars}` : ''}) {
      purchaseOrder_update(id: $id, data: { state: ${to}, version: $version, updatedAt_expr: "request.time"${sets ? `, ${sets}` : ''} }) }`,
    { id: po.id, version: po.version + 1, ...extra },
  );
  await audit(actorUid, action, 'purchase_order', number, { state: po.state }, { state: to, ...extra });
  await emit(`purchase_order.${to}`, 'purchase_order', number, extra);
  await timeline('purchase_order', number, 'status_changed', actorUid, summary);
  return { number, state: to };
}

const numberInput = z.object({ number: z.string().min(1) });

export const issuePurchaseOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PURCHASING, 'Issuing purchase orders');
  const { number } = numberInput.parse(request.data);
  const issuedOn = today();
  const result = await transitionPo(number, ['draft'], 'issued', { issuedOn }, caller.uid, 'purchase_order.issue', `Issued on ${issuedOn}`);
  // The deposit falls due on issue.
  await graphql(
    `mutation ($number: String!, $dueOn: Date!) {
      paymentMilestone_updateMany(where: { purchaseOrder: { number: { eq: $number } }, trigger: { eq: "on_order" }, dueOn: { isNull: true } }, data: { dueOn: $dueOn }) }`,
    { number, dueOn: issuedOn },
  );
  // The order as sent to the supplier is filed with it.
  await fileGenerated('purchase-order', number, caller.uid);
  return result;
});

export const confirmPurchaseOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PURCHASING, 'Confirming purchase orders');
  const { number } = numberInput.parse(request.data);
  const confirmedOn = today();
  return transitionPo(number, ['issued'], 'confirmed', { confirmedOn }, caller.uid, 'purchase_order.confirm', `Confirmed by the supplier on ${confirmedOn}`);
});

export const cancelPurchaseOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Cancelling purchase orders');
  const { number, reason } = numberInput.extend({ reason: z.string().min(1).max(400) }).parse(request.data);
  return transitionPo(number, ['draft', 'issued'], 'cancelled', {}, caller.uid, 'purchase_order.cancel', `Cancelled: ${reason}`);
});

// ---------------------------------------------------------------- production runs

const createRunInput = z.object({
  purchaseOrderNumber: z.string().min(1),
  templateId: z.string().optional(),
  plannedStart: date,
  factoryId: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

interface TemplateRow {
  id: string;
  name: string;
  processTemplateSteps_on_template: { key: string; name: string; category: string; sequence: number; durationDays: number; dependsOnKey: string | null; gate: 'none' | 'approval' | 'inspection' }[];
}

export const createProductionRun = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PURCHASING, 'Opening production runs');
  const parsed = createRunInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;

  const { purchaseOrders } = await graphql<{
    purchaseOrders: {
      id: string;
      state: string;
      factory: { id: string } | null;
      purchaseOrderLines_on_purchaseOrder: { id: string; quantity: string; sku: { product: { family: { code: string } } } }[];
    }[];
  }>(
    `query ($number: String!) { purchaseOrders(where: { number: { eq: $number } }, limit: 1) {
       id state factory { id } purchaseOrderLines_on_purchaseOrder { id quantity sku { product { family { code } } } } } }`,
    { number: input.purchaseOrderNumber },
  );
  const po = purchaseOrders[0];
  if (!po) throw failure('not_found', `No purchase order ${input.purchaseOrderNumber}.`);
  if (po.state !== 'confirmed') throw failure('invariant_violation', 'A run opens on a confirmed purchase order.');
  if (po.purchaseOrderLines_on_purchaseOrder.length === 0) throw failure('invariant_violation', 'The purchase order has no lines.');

  const familyCode = po.purchaseOrderLines_on_purchaseOrder[0]!.sku.product.family.code;
  const { processTemplates } = await graphql<{ processTemplates: TemplateRow[] }>(
    input.templateId
      ? `query ($id: UUID!) { processTemplates(where: { id: { eq: $id } }, limit: 1) { id name processTemplateSteps_on_template(orderBy: { sequence: ASC }) { key name category sequence durationDays dependsOnKey gate } } }`
      : `query ($family: String!) { processTemplates(where: { family: { code: { eq: $family } }, isDefault: { eq: true } }, limit: 1) { id name processTemplateSteps_on_template(orderBy: { sequence: ASC }) { key name category sequence durationDays dependsOnKey gate } } }`,
    input.templateId ? { id: input.templateId } : { family: familyCode },
  );
  const template = processTemplates[0];
  if (!template || template.processTemplateSteps_on_template.length === 0) {
    throw failure('invariant_violation', `No process template for family ${familyCode}. Add one in Settings.`);
  }

  const steps: TemplateStep[] = template.processTemplateSteps_on_template;
  const planned = planMilestones(steps, input.plannedStart as never);
  const plannedEnd = planned[planned.length - 1]!.plannedEnd;
  const number = await allocateNumber('RUN');
  const factoryId = input.factoryId ?? po.factory?.id ?? null;

  const { productionRun_insert } = await graphql<{ productionRun_insert: { id: string } }>(
    `mutation ($number: String!, $poId: UUID!, $factoryId: UUID, $templateName: String!, $plannedStart: Date!, $plannedEnd: Date!, $notes: String) {
      productionRun_insert(data: { number: $number, purchaseOrderId: $poId, factoryId: $factoryId, templateName: $templateName, plannedStart: $plannedStart, plannedEnd: $plannedEnd, health: on_track, state: planned, notes: $notes }) }`,
    { number, poId: po.id, factoryId, templateName: template.name, plannedStart: input.plannedStart, plannedEnd, notes: input.notes ?? null },
  );
  const runId = productionRun_insert.id;

  for (const line of po.purchaseOrderLines_on_purchaseOrder) {
    await graphql(
      `mutation ($runId: UUID!, $lineId: UUID!, $planned: Int64!) { productionRunLine_insert(data: { runId: $runId, purchaseOrderLineId: $lineId, plannedQuantity: $planned, producedQuantity: "0" }) }`,
      { runId, lineId: line.id, planned: line.quantity },
    );
  }
  for (const milestone of planned) {
    await graphql(
      `mutation ($runId: UUID!, $key: String!, $name: String!, $category: String!, $sequence: Int!, $dependsOnKey: String, $gate: MilestoneGate!, $plannedStart: Date!, $plannedEnd: Date!) {
        productionMilestone_insert(data: { runId: $runId, key: $key, name: $name, category: $category, sequence: $sequence, dependsOnKey: $dependsOnKey, gate: $gate, plannedStart: $plannedStart, plannedEnd: $plannedEnd, state: pending }) }`,
      {
        runId,
        key: milestone.key,
        name: milestone.name,
        category: milestone.category,
        sequence: milestone.sequence,
        dependsOnKey: milestone.dependsOnKey,
        gate: milestone.gate,
        plannedStart: milestone.plannedStart,
        plannedEnd: milestone.plannedEnd,
      },
    );
  }

  await audit(caller.uid, 'production_run.create', 'production_run', number, null, { purchaseOrder: input.purchaseOrderNumber, template: template.name, plannedStart: input.plannedStart, plannedEnd });
  await emit('production_run.created', 'production_run', number, { purchaseOrder: input.purchaseOrderNumber });
  await timeline('production_run', number, 'created', caller.uid, `${template.name}, ${planned.length} milestones, ${input.plannedStart} to ${plannedEnd}`);
  await timeline('purchase_order', input.purchaseOrderNumber, 'run_opened', caller.uid, `${number} opened, planned to finish ${plannedEnd}`);
  return { number, id: runId, plannedEnd };
});

const updateMilestoneInput = z.object({
  runNumber: z.string().min(1),
  milestoneId: z.string().min(1),
  state: z.enum(['pending', 'in_progress', 'done', 'skipped', 'blocked']).optional(),
  forecastEnd: date.nullable().optional(),
  actualStart: date.nullable().optional(),
  actualEnd: date.nullable().optional(),
  delayReason: z.string().max(80).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

interface RunRow {
  id: string;
  state: RunState;
  productionMilestones_on_run: (MilestoneFacts & { id: string; name: string; gate: string; actualStart: string | null; state: MilestoneState; plannedStart: string; sequence: number; dependsOnKey: string | null })[];
}

const RUN_WITH_MILESTONES = `id state productionMilestones_on_run(orderBy: { sequence: ASC }) { id key name gate state plannedStart plannedEnd forecastEnd actualStart actualEnd sequence dependsOnKey }`;

/**
 * The run follows its milestones: pending steps take their forecast from the
 * chain, and health, state and forecast end are written from the facts.
 */
async function deriveRun(run: RunRow, chain: RunRow['productionMilestones_on_run'], now: string): Promise<{ health: ReturnType<typeof runHealth>; state: RunState; forecastEnd: string | null }> {
  const propagated = propagateForecasts(chain as never);
  for (const candidate of chain) {
    const next = propagated.get(candidate.key) ?? null;
    if (candidate.state === 'pending' && (next ?? null) !== (candidate.forecastEnd ?? null)) {
      await graphql(`mutation ($id: UUID!, $forecastEnd: Date) { productionMilestone_update(id: $id, data: { forecastEnd: $forecastEnd }) }`, { id: candidate.id, forecastEnd: next });
    }
  }
  const facts: MilestoneFacts[] = chain.map((candidate) => ({ ...candidate, forecastEnd: (propagated.get(candidate.key) ?? null) as never }));
  const health = runHealth(facts, now as never);
  const state = runStateFrom(facts, run.state);
  const forecastEnd = runForecastEnd(facts);
  await graphql(
    `mutation ($id: UUID!, $health: Health!, $state: RunState!, $forecastEnd: Date, $actualEnd: Date) {
      productionRun_update(id: $id, data: { health: $health, state: $state, forecastEnd: $forecastEnd, actualEnd: $actualEnd, updatedAt_expr: "request.time" }) }`,
    { id: run.id, health, state, forecastEnd, actualEnd: state === 'completed' ? forecastEnd : null },
  );
  return { health, state, forecastEnd };
}

/** The milestone change itself, shared with the sign-off of a gated inspection. */
export async function updateMilestoneCore(runNumber: string, milestoneId: string, change: Omit<z.infer<typeof updateMilestoneInput>, 'runNumber' | 'milestoneId'>, caller: Caller): Promise<{ runNumber: string; health: Health; state: RunState; forecastEnd: string | null }> {
  const input = { runNumber, milestoneId, ...change };

  const { productionRuns } = await graphql<{ productionRuns: RunRow[] }>(
    `query ($number: String!) { productionRuns(where: { number: { eq: $number } }, limit: 1) { ${RUN_WITH_MILESTONES} } }`,
    { number: input.runNumber },
  );
  const run = productionRuns[0];
  if (!run) throw failure('not_found', `No production run ${input.runNumber}.`);
  if (run.state === 'cancelled') throw failure('invariant_violation', 'A cancelled run cannot change.');
  const milestone = run.productionMilestones_on_run.find((candidate) => candidate.id === input.milestoneId);
  if (!milestone) throw failure('not_found', 'No such milestone on this run.');

  const now = today();
  const nextState = input.state ?? milestone.state;
  // An inspection gate closes only through QC; until that module lands, a QC
  // role must be the one to complete it.
  if (nextState === 'done' && milestone.gate === 'inspection' && caller.role !== 'qc' && caller.role !== 'owner' && !caller.viaInspection) {
    throw failure('forbidden', 'An inspection milestone is completed by QC.');
  }
  const actualStart = input.actualStart !== undefined ? input.actualStart : milestone.actualStart ?? (nextState === 'in_progress' || nextState === 'done' ? now : null);
  const actualEnd = input.actualEnd !== undefined ? input.actualEnd : nextState === 'done' ? (milestone.actualEnd ?? now) : milestone.actualEnd;
  // A pending step carries no forecast of its own; the chain derives it below.
  const forecastEnd = nextState === 'pending' ? null : input.forecastEnd !== undefined ? input.forecastEnd : milestone.forecastEnd;

  await graphql(
    `mutation ($id: UUID!, $state: MilestoneState!, $forecastEnd: Date, $actualStart: Date, $actualEnd: Date, $delayReason: String, $note: String) {
      productionMilestone_update(id: $id, data: { state: $state, forecastEnd: $forecastEnd, actualStart: $actualStart, actualEnd: $actualEnd, delayReason: $delayReason, note: $note }) }`,
    {
      id: milestone.id,
      state: nextState,
      forecastEnd,
      actualStart,
      actualEnd: nextState === 'done' || nextState === 'skipped' ? actualEnd : null,
      delayReason: input.delayReason === undefined ? null : input.delayReason,
      note: input.note === undefined ? null : input.note,
    },
  );

  // Derive the run from its milestones, letting the slip travel down the chain.
  const chain = run.productionMilestones_on_run.map((candidate) =>
    candidate.id === milestone.id
      ? { ...candidate, state: nextState, forecastEnd: forecastEnd as never, actualEnd: (nextState === 'done' ? actualEnd : null) as never }
      : candidate,
  );
  const { health, state, forecastEnd: runForecast } = await deriveRun(run, chain, now);

  const summary = `${milestone.name}: ${nextState.replace('_', ' ')}${forecastEnd && forecastEnd !== milestone.plannedEnd ? `, now expected ${forecastEnd}` : ''}${input.delayReason ? ` (${input.delayReason})` : ''}`;
  await audit(caller.uid, 'production_milestone.update', 'production_run', input.runNumber, { milestone: milestone.name, state: milestone.state }, { state: nextState, forecastEnd, actualEnd });
  await emit('production_milestone.updated', 'production_run', input.runNumber, { milestone: milestone.key, state: nextState, health });
  await timeline('production_run', input.runNumber, 'status_changed', caller.uid, summary);
  return { runNumber: input.runNumber, health, state, forecastEnd: runForecast };
}

export const updateMilestone = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PRODUCTION, 'Updating milestones');
  const parsed = updateMilestoneInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const { runNumber, milestoneId, ...change } = parsed.data;
  return updateMilestoneCore(runNumber, milestoneId, change, caller);
});

// ---------------------------------------------------------------- lots and packing

const rollInput = z.object({
  measuredLength: int64,
  usableWidthCm: z.number().int().positive().optional(),
  weightG: z.number().int().nonnegative().optional(),
  grade: z.string().max(8).optional(),
  defectPoints: z.number().int().nonnegative().optional(),
});

const recordLotInput = z.object({
  runNumber: z.string().min(1),
  skuCode: z.string().min(1),
  millLotRef: z.string().max(80).optional(),
  producedOn: date.optional(),
  /** For SKUs that are not tracked by roll; otherwise the rolls add up to it. */
  producedQuantity: int64.optional(),
  rolls: z.array(rollInput).max(500).optional(),
});

interface RunLotsRow extends RunRow {
  productionRunLines_on_run: { id: string; producedQuantity: string; purchaseOrderLine: { sku: { code: string; rollTracking: boolean } } }[];
  lots_on_run: { id: string; number: string; sku: { code: string }; rolls_on_lot: { id: string; number: string; measuredLength: string; handlingUnitContents_on_roll: { id: string }[] }[] }[];
}

async function loadRunForPacking(number: string): Promise<RunLotsRow> {
  const { productionRuns } = await graphql<{ productionRuns: RunLotsRow[] }>(
    `query ($number: String!) { productionRuns(where: { number: { eq: $number } }, limit: 1) {
       ${RUN_WITH_MILESTONES}
       productionRunLines_on_run { id producedQuantity purchaseOrderLine { sku { code rollTracking } } }
       lots_on_run { id number sku { code } rolls_on_lot(orderBy: { rollNo: ASC }) { id number measuredLength handlingUnitContents_on_roll { id } } } } }`,
    { number },
  );
  const run = productionRuns[0];
  if (!run) throw failure('not_found', `No production run ${number}.`);
  if (run.state === 'cancelled') throw failure('invariant_violation', 'A cancelled run cannot change.');
  return run;
}

const metres = (stored: bigint) => `${(Number(stored) / Number(QUANTITY_SCALE)).toLocaleString('en-GB', { maximumFractionDigits: 1 })} m`;

export const recordLot = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PRODUCTION, 'Recording lots');
  const parsed = recordLotInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;

  const run = await loadRunForPacking(input.runNumber);
  const line = run.productionRunLines_on_run.find((candidate) => candidate.purchaseOrderLine.sku.code === input.skuCode);
  if (!line) throw failure('validation', `${input.skuCode} is not on this run.`, { skuCode: 'Choose a SKU from the run' });
  const rolls = input.rolls ?? [];
  if (line.purchaseOrderLine.sku.rollTracking && rolls.length === 0) {
    throw failure('validation', `${input.skuCode} is tracked by roll; record the rolls.`, { rolls: 'At least one roll' });
  }
  const total = rolls.length > 0 ? rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n) : BigInt(input.producedQuantity ?? '0');
  if (total <= 0n) throw failure('validation', 'The produced quantity must be more than zero.', { producedQuantity: 'More than zero' });
  if (rolls.some((roll) => BigInt(roll.measuredLength) <= 0n)) throw failure('validation', 'Every roll needs a measured length.', { rolls: 'Lengths above zero' });

  const number = await allocateNumber('LOT');
  const { lot_insert } = await graphql<{ lot_insert: { id: string } }>(
    `mutation ($number: String!, $skuCode: String!, $runId: UUID!, $millLotRef: String, $quantity: Int64!, $producedOn: Date) {
      lot_insert(data: { number: $number, skuCode: $skuCode, runId: $runId, millLotRef: $millLotRef, producedQuantity: $quantity, producedOn: $producedOn, qualityState: pending }) }`,
    { number, skuCode: input.skuCode, runId: run.id, millLotRef: input.millLotRef ?? null, quantity: total.toString(), producedOn: input.producedOn ?? null },
  );
  for (const [index, roll] of rolls.entries()) {
    await graphql(
      `mutation ($lotId: UUID!, $number: String!, $rollNo: Int!, $length: Int64!, $width: Int, $weight: Int, $grade: String, $points: Int) {
        roll_insert(data: { lotId: $lotId, number: $number, rollNo: $rollNo, measuredLength: $length, usableWidthCm: $width, weightG: $weight, grade: $grade, defectPoints: $points }) }`,
      { lotId: lot_insert.id, number: rollNumber(number, index + 1), rollNo: index + 1, length: roll.measuredLength, width: roll.usableWidthCm ?? null, weight: roll.weightG ?? null, grade: roll.grade ?? null, points: roll.defectPoints ?? null },
    );
  }
  await graphql(`mutation ($id: UUID!, $produced: Int64!) { productionRunLine_update(id: $id, data: { producedQuantity: $produced }) }`, {
    id: line.id,
    produced: (BigInt(line.producedQuantity) + total).toString(),
  });

  const summary = `${number}: ${metres(total)} of ${input.skuCode}${rolls.length > 0 ? ` in ${rolls.length} rolls` : ''}${input.millLotRef ? `, mill lot ${input.millLotRef}` : ''}`;
  await audit(caller.uid, 'lot.record', 'lot', number, null, { run: input.runNumber, skuCode: input.skuCode, producedQuantity: total.toString(), rolls: rolls.length });
  await emit('lot.recorded', 'lot', number, { run: input.runNumber, skuCode: input.skuCode });
  await timeline('lot', number, 'created', caller.uid, `Recorded on ${input.runNumber}: ${metres(total)}${rolls.length > 0 ? ` in ${rolls.length} rolls` : ''}, awaiting quality`);
  await timeline('production_run', input.runNumber, 'lot_recorded', caller.uid, summary);
  return { number, id: lot_insert.id };
});

const packInput = z.object({
  runNumber: z.string().min(1),
  kind: z.enum(['carton', 'pallet']),
  rollNumbers: z.array(z.string().min(1)).max(500).default([]),
  /** Quantities of lots that are not tracked by roll. */
  loose: z.array(z.object({ lotNumber: z.string().min(1), quantity: int64 })).max(50).default([]),
  marks: z.string().max(120).optional(),
  lengthCm: z.number().int().positive().optional(),
  widthCm: z.number().int().positive().optional(),
  heightCm: z.number().int().positive().optional(),
  grossWeightG: z.number().int().nonnegative().optional(),
  netWeightG: z.number().int().nonnegative().optional(),
  packedOn: date.optional(),
  parentNumber: z.string().optional(),
});

export const packHandlingUnit = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PRODUCTION, 'Packing');
  const parsed = packInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.rollNumbers.length === 0 && input.loose.length === 0) throw failure('validation', 'Nothing to pack.', { rollNumbers: 'Choose the rolls' });

  const run = await loadRunForPacking(input.runNumber);
  const rollsByNumber = new Map(run.lots_on_run.flatMap((lot) => lot.rolls_on_lot.map((roll) => [roll.number, { ...roll, lot }] as const)));
  const rolls = input.rollNumbers.map((number) => {
    const roll = rollsByNumber.get(number);
    if (!roll) throw failure('validation', `${number} is not a roll of this run.`, { rollNumbers: number });
    if (roll.handlingUnitContents_on_roll.length > 0) throw failure('invariant_violation', `${number} is already packed.`, { rollNumbers: number });
    return roll;
  });
  const loose = input.loose.map((entry) => {
    const lot = run.lots_on_run.find((candidate) => candidate.number === entry.lotNumber);
    if (!lot) throw failure('validation', `${entry.lotNumber} is not a lot of this run.`, { loose: entry.lotNumber });
    if (BigInt(entry.quantity) <= 0n) throw failure('validation', 'A packed quantity is more than zero.', { loose: entry.lotNumber });
    return { lot, quantity: entry.quantity };
  });
  let parentId: string | null = null;
  if (input.parentNumber) {
    const { handlingUnits } = await graphql<{ handlingUnits: { id: string }[] }>(`query ($number: String!) { handlingUnits(where: { number: { eq: $number } }, limit: 1) { id } }`, { number: input.parentNumber });
    if (!handlingUnits[0]) throw failure('not_found', `No handling unit ${input.parentNumber}.`);
    parentId = handlingUnits[0].id;
  }

  const packedOn = input.packedOn ?? today();
  const number = await allocateNumber(input.kind === 'carton' ? 'CTN' : 'PLT');
  const { handlingUnit_insert } = await graphql<{ handlingUnit_insert: { id: string } }>(
    `mutation ($number: String!, $kind: HandlingUnitKind!, $runId: UUID!, $parentId: UUID, $marks: String, $l: Int, $w: Int, $h: Int, $gross: Int, $net: Int, $packedOn: Date!) {
      handlingUnit_insert(data: { number: $number, kind: $kind, runId: $runId, parentId: $parentId, marks: $marks, lengthCm: $l, widthCm: $w, heightCm: $h, grossWeightG: $gross, netWeightG: $net, packedOn: $packedOn }) }`,
    { number, kind: input.kind, runId: run.id, parentId, marks: input.marks ?? null, l: input.lengthCm ?? null, w: input.widthCm ?? null, h: input.heightCm ?? null, gross: input.grossWeightG ?? null, net: input.netWeightG ?? null, packedOn },
  );
  for (const roll of rolls) {
    await graphql(`mutation ($unitId: UUID!, $rollId: UUID!) { handlingUnitContent_insert(data: { handlingUnitId: $unitId, rollId: $rollId }) }`, { unitId: handlingUnit_insert.id, rollId: roll.id });
  }
  for (const entry of loose) {
    await graphql(`mutation ($unitId: UUID!, $lotId: UUID!, $quantity: Int64!) { handlingUnitContent_insert(data: { handlingUnitId: $unitId, lotId: $lotId, quantity: $quantity }) }`, { unitId: handlingUnit_insert.id, lotId: entry.lot.id, quantity: entry.quantity });
  }

  // The first carton starts the packing step; nobody has to set it.
  const packing = run.productionMilestones_on_run.find((milestone) => milestone.key === 'pack') ?? run.productionMilestones_on_run.find((milestone) => /pack/i.test(milestone.name));
  let health = null as ReturnType<typeof runHealth> | null;
  if (packing && packing.state === 'pending') {
    await graphql(`mutation ($id: UUID!, $start: Date!) { productionMilestone_update(id: $id, data: { state: in_progress, actualStart: $start }) }`, { id: packing.id, start: packedOn });
    const chain = run.productionMilestones_on_run.map((candidate) => (candidate.id === packing.id ? { ...candidate, state: 'in_progress' as const, actualStart: packedOn } : candidate));
    health = (await deriveRun(run, chain, today())).health;
  }

  const total = rolls.reduce((sum, roll) => sum + BigInt(roll.measuredLength), 0n) + loose.reduce((sum, entry) => sum + BigInt(entry.quantity), 0n);
  const lots = [...new Set([...rolls.map((roll) => roll.lot.number), ...loose.map((entry) => entry.lot.number)])];
  const summary = `${number}: ${rolls.length > 0 ? `${rolls.length} rolls, ` : ''}${metres(total)} from ${lots.join(', ')}`;
  await audit(caller.uid, 'handling_unit.pack', 'handling_unit', number, null, { run: input.runNumber, kind: input.kind, rolls: rolls.length, quantity: total.toString() });
  await emit('handling_unit.packed', 'production_run', input.runNumber, { number, kind: input.kind, lots });
  await timeline('production_run', input.runNumber, 'packed', caller.uid, summary);
  for (const lot of lots) await timeline('lot', lot, 'packed', caller.uid, `${number}: ${rolls.filter((roll) => roll.lot.number === lot).length} rolls packed`);
  return { number, id: handlingUnit_insert.id, health };
});

const lotQualityInput = z.object({
  number: z.string().min(1),
  state: z.enum(['pending', 'on_hold', 'released', 'rejected']),
  note: z.string().min(3).max(2000),
});

const LOT_QUALITY_WORDS: Record<string, string> = { pending: 'awaiting quality', on_hold: 'on hold', released: 'released', rejected: 'rejected' };

/** The one transition a lot's quality state goes through, whoever drives it. */
export async function applyLotQuality(number: string, state: 'pending' | 'on_hold' | 'released' | 'rejected', note: string, actorUid: string, source: string): Promise<{ from: string; run: string }> {
  const { lots } = await graphql<{ lots: { id: string; qualityState: string; run: { number: string } }[] }>(
    `query ($number: String!) { lots(where: { number: { eq: $number } }, limit: 1) { id qualityState run { number } } }`,
    { number },
  );
  const lot = lots[0];
  if (!lot) throw failure('not_found', `No lot ${number}.`);
  await graphql(`mutation ($id: UUID!, $state: LotQualityState!) { lot_update(id: $id, data: { qualityState: $state }) }`, { id: lot.id, state });
  const words = LOT_QUALITY_WORDS[state] ?? state;
  await audit(actorUid, 'lot.quality', 'lot', number, { qualityState: lot.qualityState }, { qualityState: state, note, source });
  await emit('lot.quality_changed', 'lot', number, { from: lot.qualityState, to: state, run: lot.run.number, source });
  await timeline('lot', number, 'status_changed', actorUid, `${words[0]!.toUpperCase()}${words.slice(1)}: ${note}`);
  await timeline('production_run', lot.run.number, 'status_changed', actorUid, `${number} ${words}: ${note}`);
  return { from: lot.qualityState, run: lot.run.number };
}

// QC records a disposition by hand only where no inspection is involved; an
// inspection's sign-off drives the same transition.
export const setLotQuality = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, QUALITY, 'Releasing lots');
  const parsed = lotQualityInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  await applyLotQuality(input.number, input.state, input.note, caller.uid, 'manual');
  return { number: input.number, qualityState: input.state };
});
