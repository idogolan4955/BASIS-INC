import { INTERACTION_KINDS, OPPORTUNITY_SOURCES, OPPORTUNITY_STAGES, stageFromQuote, type OpportunityStage } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { timeline } from './manufacturing';

// The relationship side of selling: price lists, opportunities and the
// interactions that move them. Prices here are selling prices; purchase
// costs stay behind the cost roles elsewhere.

const PRICING = ['owner', 'operations', 'sales', 'finance'] as const;
const SELLING = ['owner', 'operations', 'sales', 'marketing'] as const;
const stored = z.string().regex(/^\d+$/, 'Fixed-point amount expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

async function customerOf(id: string): Promise<{ id: string; name: string }> {
  const { company } = await graphql<{ company: { id: string; legalName: string; tradingName: string | null } | null }>(`query ($id: UUID!) { company(id: $id) { id legalName tradingName } }`, { id });
  if (!company) throw failure('not_found', 'No such company.');
  return { id: company.id, name: company.tradingName || company.legalName };
}

// ---------------------------------------------------------------- price lists

const priceLineInput = z.object({ skuCode: z.string().min(1).optional(), productCode: z.string().min(1).optional(), minQuantity: stored.default('0'), unitPrice: stored }).refine((line) => Boolean(line.skuCode) !== Boolean(line.productCode), { message: 'A line prices one SKU or one product.' });
const priceListInput = z.object({
  code: z.string().regex(/^[A-Z0-9-]{2,16}$/, 'A code of 2 to 16 capitals, digits or hyphens'),
  name: z.string().min(1).max(80),
  currency: z.string().regex(/^[A-Z]{3}$/),
  tier: z.enum(['standard', 'preferred', 'key']).nullable().default(null),
  validFrom: date.nullable().default(null),
  validTo: date.nullable().default(null),
  isDefault: z.boolean().default(false),
  notes: z.string().max(2000).default(''),
  lines: z.array(priceLineInput).max(1000),
});

/** A price list saved whole by its code: its lines are replaced, and one list per currency may be the default. */
export const savePriceList = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, PRICING, 'Keeping price lists');
  const parsed = priceListInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.validFrom && input.validTo && input.validTo < input.validFrom) throw failure('validation', 'The list ends before it starts.');
  const { priceList: existing } = await graphql<{ priceList: { code: string; name: string; isDefault: boolean } | null }>(`query ($code: String!) { priceList(key: { code: $code }) { code name isDefault } }`, { code: input.code });
  if (input.isDefault) await graphql(`mutation ($currency: String!) { priceList_updateMany(where: { currency: { eq: $currency }, isDefault: { eq: true } }, data: { isDefault: false }) }`, { currency: input.currency });
  const variables = { code: input.code, name: input.name.trim(), currency: input.currency, tier: input.tier, validFrom: input.validFrom, validTo: input.validTo, isDefault: input.isDefault, notes: input.notes || null };
  await graphql(
    `mutation ($code: String!, $name: String!, $currency: String!, $tier: String, $validFrom: Date, $validTo: Date, $isDefault: Boolean!, $notes: String) {
      priceList_upsert(data: { code: $code, name: $name, currency: $currency, tier: $tier, validFrom: $validFrom, validTo: $validTo, isDefault: $isDefault, notes: $notes, updatedAt_expr: "request.time" }) }`,
    variables,
  );
  await graphql(`mutation ($code: String!) { priceListItem_deleteMany(where: { priceListCode: { eq: $code } }) priceListProductItem_deleteMany(where: { priceListCode: { eq: $code } }) }`, { code: input.code });
  for (const line of input.lines) {
    if (line.skuCode) await graphql(`mutation ($code: String!, $sku: String!, $minQuantity: Int64!, $unitPrice: Int64!) { priceListItem_insert(data: { priceListCode: $code, skuCode: $sku, minQuantity: $minQuantity, unitPrice: $unitPrice }) }`, { code: input.code, sku: line.skuCode, minQuantity: line.minQuantity, unitPrice: line.unitPrice });
    else await graphql(`mutation ($code: String!, $product: String!, $minQuantity: Int64!, $unitPrice: Int64!) { priceListProductItem_insert(data: { priceListCode: $code, productCode: $product, minQuantity: $minQuantity, unitPrice: $unitPrice }) }`, { code: input.code, product: line.productCode, minQuantity: line.minQuantity, unitPrice: line.unitPrice });
  }
  await audit(caller.uid, existing ? 'price_list.update' : 'price_list.create', 'price_list', input.code, existing ?? null, { ...variables, lines: input.lines.length });
  return { code: input.code };
});

// ---------------------------------------------------------------- opportunities

const opportunityInput = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1),
  title: z.string().min(1).max(160),
  stage: z.enum(OPPORTUNITY_STAGES).default('lead'),
  source: z.enum(OPPORTUNITY_SOURCES).nullable().default(null),
  value: stored.nullable().default(null),
  currency: z.string().regex(/^[A-Z]{3}$/).default('EUR'),
  expectedClose: date.nullable().default(null),
  ownerUid: z.string().optional(),
  quoteNumber: z.string().regex(/^QUO-\d{2}-\d{4}$/).nullable().default(null),
  lostReason: z.string().max(200).default(''),
  notes: z.string().max(4000).default(''),
});

interface OpportunityRow {
  id: string;
  stage: OpportunityStage;
  customer: { id: string };
  closedAt: string | null;
}

/** An opportunity opened or changed. Closing stages stamp the close; reopening clears it. */
export const saveOpportunity = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SELLING, 'Keeping the pipeline');
  const parsed = opportunityInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.stage === 'lost' && !input.lostReason.trim()) throw failure('validation', 'Say why it was lost.');
  const customer = await customerOf(input.customerId);
  let quoteId: string | null = null;
  if (input.quoteNumber) {
    const { quotes } = await graphql<{ quotes: { id: string; customer: { id: string } }[] }>(`query ($number: String!) { quotes(where: { number: { eq: $number } }, limit: 1) { id customer { id } } }`, { number: input.quoteNumber });
    const quote = quotes[0];
    if (!quote) throw failure('not_found', `No quote ${input.quoteNumber}.`);
    if (quote.customer.id !== customer.id) throw failure('invariant_violation', `${input.quoteNumber} belongs to another customer.`);
    quoteId = quote.id;
  }
  const closed = input.stage === 'won' || input.stage === 'lost';
  let existing: OpportunityRow | undefined;
  if (input.id) {
    const { opportunity } = await graphql<{ opportunity: OpportunityRow | null }>(`query ($id: UUID!) { opportunity(id: $id) { id stage customer { id } closedAt } }`, { id: input.id });
    if (!opportunity) throw failure('not_found', 'No such opportunity.');
    existing = opportunity;
  }
  const variables = {
    customerId: customer.id,
    title: input.title.trim(),
    stage: input.stage,
    source: input.source,
    value: input.value,
    currency: input.currency,
    expectedClose: input.expectedClose,
    ownerUid: input.ownerUid ?? caller.uid,
    quoteId,
    lostReason: input.stage === 'lost' ? input.lostReason.trim() : null,
    notes: input.notes || null,
    closedAt: closed ? (existing?.closedAt ?? new Date().toISOString()) : null,
  };
  const fields = `$customerId: UUID!, $title: String!, $stage: OpportunityStage!, $source: OpportunitySource, $value: Int64, $currency: String!, $expectedClose: Date, $ownerUid: String, $quoteId: UUID, $lostReason: String, $notes: String, $closedAt: Timestamp`;
  const data = `customerId: $customerId, title: $title, stage: $stage, source: $source, value: $value, currency: $currency, expectedClose: $expectedClose, ownerUid: $ownerUid, quoteId: $quoteId, lostReason: $lostReason, notes: $notes, closedAt: $closedAt`;
  let id: string;
  if (existing) {
    await graphql(`mutation ($id: UUID!, ${fields}) { opportunity_update(id: $id, data: { ${data}, updatedAt_expr: "request.time" }) }`, { id: existing.id, ...variables });
    id = existing.id;
    if (existing.stage !== input.stage) {
      await timeline('customer', customer.id, 'opportunity', caller.uid, `${input.title.trim()}: ${existing.stage} to ${input.stage}${input.stage === 'lost' ? ` (${variables.lostReason})` : ''}`);
      await emit(`opportunity.${input.stage}`, 'opportunity', id, { customer: customer.name, title: input.title.trim() });
    }
  } else {
    const { opportunity_insert } = await graphql<{ opportunity_insert: { id: string } }>(`mutation (${fields}) { opportunity_insert(data: { ${data} }) }`, variables);
    id = opportunity_insert.id;
    await timeline('customer', customer.id, 'opportunity', caller.uid, `Opportunity opened: ${input.title.trim()}`);
    await emit('opportunity.opened', 'opportunity', id, { customer: customer.name, title: input.title.trim() });
  }
  await audit(caller.uid, existing ? 'opportunity.update' : 'opportunity.create', 'opportunity', id, existing ?? null, variables);
  return { id };
});

/** A quote's state pulls its opportunity forward: called by the quote transitions. */
export async function followQuote(quoteId: string, state: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired', orderNumber: string | null): Promise<void> {
  const { opportunities } = await graphql<{ opportunities: { id: string; stage: OpportunityStage }[] }>(`query ($quoteId: UUID!) { opportunities(where: { quoteId: { eq: $quoteId } }, limit: 10) { id stage } }`, { quoteId });
  for (const opportunity of opportunities) {
    const next = stageFromQuote(state, opportunity.stage);
    const closed = next === 'won' || next === 'lost';
    const orderId = orderNumber ? (await graphql<{ salesOrders: { id: string }[] }>(`query ($number: String!) { salesOrders(where: { number: { eq: $number } }, limit: 1) { id } }`, { number: orderNumber })).salesOrders[0]?.id ?? null : null;
    if (next === opportunity.stage && !orderId) continue;
    await graphql(
      `mutation ($id: UUID!, $stage: OpportunityStage!, $closedAt: Timestamp, $orderId: UUID, $lostReason: String) { opportunity_update(id: $id, data: { stage: $stage, closedAt: $closedAt, orderId: $orderId, lostReason: $lostReason, lastActivityAt_expr: "request.time", updatedAt_expr: "request.time" }) }`,
      { id: opportunity.id, stage: next, closedAt: closed ? new Date().toISOString() : null, orderId, lostReason: next === 'lost' ? 'Quote declined' : null },
    );
  }
}

// ---------------------------------------------------------------- interactions

const interactionInput = z.object({
  customerId: z.string().min(1),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  kind: z.enum(INTERACTION_KINDS),
  occurredAt: z.string().datetime().optional(),
  summary: z.string().min(1).max(4000),
  nextStep: z.string().max(200).default(''),
  nextOn: date.nullable().default(null),
  /** When set, the next step becomes a task for the person logging it. */
  taskForNextStep: z.boolean().default(false),
});

/** An interaction logged against a customer, and the opportunity it touched kept alive. */
export const logInteraction = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SELLING, 'Logging interactions');
  const parsed = interactionInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const customer = await customerOf(input.customerId);
  if (input.opportunityId) {
    const { opportunity } = await graphql<{ opportunity: { id: string; customer: { id: string } } | null }>(`query ($id: UUID!) { opportunity(id: $id) { id customer { id } } }`, { id: input.opportunityId });
    if (!opportunity) throw failure('not_found', 'No such opportunity.');
    if (opportunity.customer.id !== customer.id) throw failure('invariant_violation', 'That opportunity belongs to another customer.');
  }
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const { interaction_insert } = await graphql<{ interaction_insert: { id: string } }>(
    `mutation ($customerId: UUID!, $contactId: UUID, $opportunityId: UUID, $kind: InteractionKind!, $occurredAt: Timestamp!, $summary: String!, $nextStep: String, $nextOn: Date, $uid: String!) {
      interaction_insert(data: { customerId: $customerId, contactId: $contactId, opportunityId: $opportunityId, kind: $kind, occurredAt: $occurredAt, summary: $summary, nextStep: $nextStep, nextOn: $nextOn, byUid: $uid }) }`,
    { customerId: customer.id, contactId: input.contactId ?? null, opportunityId: input.opportunityId ?? null, kind: input.kind, occurredAt, summary: input.summary.trim(), nextStep: input.nextStep.trim() || null, nextOn: input.nextOn, uid: caller.uid },
  );
  if (input.opportunityId) await graphql(`mutation ($id: UUID!, $at: Timestamp!) { opportunity_update(id: $id, data: { lastActivityAt: $at, updatedAt_expr: "request.time" }) }`, { id: input.opportunityId, at: occurredAt });
  let taskId: string | null = null;
  if (input.taskForNextStep && input.nextStep.trim()) {
    const { task_insert } = await graphql<{ task_insert: { id: string } }>(
      `mutation ($title: String!, $details: String, $uid: String!, $dueOn: Date, $entityId: String!) { task_insert(data: { title: $title, details: $details, assigneeUid: $uid, dueOn: $dueOn, state: open, entityType: "customer", entityId: $entityId, createdByUid: $uid }) }`,
      { title: input.nextStep.trim(), details: `${customer.name}: ${input.summary.trim()}`, uid: caller.uid, dueOn: input.nextOn, entityId: customer.id },
    );
    taskId = task_insert.id;
  }
  await timeline('customer', customer.id, 'interaction', caller.uid, `${input.kind}: ${input.summary.trim().slice(0, 140)}${input.nextStep.trim() ? ` · next: ${input.nextStep.trim()}` : ''}`);
  await audit(caller.uid, 'interaction.log', 'interaction', interaction_insert.id, null, { customer: customer.name, kind: input.kind, task: taskId });
  return { id: interaction_insert.id, taskId };
});
