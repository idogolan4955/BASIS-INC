import {
  allocate,
  divRound,
  formatBusinessNumber,
  planMilestones,
  propagateForecasts,
  runForecastEnd,
  runHealth,
  runStateFrom,
  QUANTITY_SCALE,
  type MilestoneFacts,
  type MilestoneState,
  type RunState,
  type TemplateStep,
} from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';

// Purchasing and manufacturing commands: the ones that allocate numbers,
// move lifecycle states and derive run health. Reads go through the connector.

const PURCHASING = ['owner', 'operations', 'purchasing'] as const;
const PRODUCTION = ['owner', 'operations', 'purchasing', 'qc'] as const;

const today = () => new Date().toISOString().slice(0, 10);
const int64 = z.string().regex(/^-?\d+$/, 'Fixed-point integer expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');

async function allocateNumber(prefix: string): Promise<string> {
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

async function timeline(entityType: string, entityId: string, kind: string, actorUid: string, summary: string): Promise<void> {
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

export const updateMilestone = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PRODUCTION, 'Updating milestones');
  const parsed = updateMilestoneInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;

  const { productionRuns } = await graphql<{ productionRuns: RunRow[] }>(
    `query ($number: String!) { productionRuns(where: { number: { eq: $number } }, limit: 1) {
       id state productionMilestones_on_run(orderBy: { sequence: ASC }) { id key name gate state plannedStart plannedEnd forecastEnd actualStart actualEnd sequence dependsOnKey } } }`,
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
  if (nextState === 'done' && milestone.gate === 'inspection' && caller.role !== 'qc' && caller.role !== 'owner') {
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
  const runForecast = runForecastEnd(facts);
  const runActualEnd = state === 'completed' ? runForecast : null;
  await graphql(
    `mutation ($id: UUID!, $health: Health!, $state: RunState!, $forecastEnd: Date, $actualEnd: Date) {
      productionRun_update(id: $id, data: { health: $health, state: $state, forecastEnd: $forecastEnd, actualEnd: $actualEnd, updatedAt_expr: "request.time" }) }`,
    { id: run.id, health, state, forecastEnd: runForecast, actualEnd: runActualEnd },
  );

  const summary = `${milestone.name}: ${nextState.replace('_', ' ')}${forecastEnd && forecastEnd !== milestone.plannedEnd ? `, now expected ${forecastEnd}` : ''}${input.delayReason ? ` (${input.delayReason})` : ''}`;
  await audit(caller.uid, 'production_milestone.update', 'production_run', input.runNumber, { milestone: milestone.name, state: milestone.state }, { state: nextState, forecastEnd, actualEnd });
  await emit('production_milestone.updated', 'production_run', input.runNumber, { milestone: milestone.key, state: nextState, health });
  await timeline('production_run', input.runNumber, 'status_changed', caller.uid, summary);
  return { runNumber: input.runNumber, health, state, forecastEnd: runForecast };
});
