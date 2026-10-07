import { defaultLegs, lineTotal, suggestAllocation, type LocalDate, type StockForAllocation, type TransportMode } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { allocateNumber, timeline } from './manufacturing';

// Commercial commands: a customer's terms, quotes and what becomes of them,
// sales orders, the stock held for them, and the outbound shipment that
// consumes it. Prices to customers are sales' business; landed cost and
// margin stay with the cost roles and are read elsewhere.

const SALES = ['owner', 'operations', 'sales'] as const;
const FULFIL = ['owner', 'operations', 'logistics', 'sales'] as const;
const int64 = z.string().regex(/^-?\d+$/, 'Fixed-point integer expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');
const today = () => new Date().toISOString().slice(0, 10);
const metres = (stored: bigint) => `${(Number(stored) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} m`;
const money = (stored: string | bigint, currency: string) => `${(Number(stored) / 10000).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

async function customerOf(id: string): Promise<{ id: string; name: string; roles: string[] }> {
  const { company } = await graphql<{ company: { id: string; legalName: string; tradingName: string | null; companyRoles_on_company: { kind: string }[] } | null }>(
    `query ($id: UUID!) { company(id: $id) { id legalName tradingName companyRoles_on_company { kind } } }`,
    { id },
  );
  if (!company) throw failure('not_found', 'That company does not exist.');
  return { id: company.id, name: company.tradingName || company.legalName, roles: company.companyRoles_on_company.map((role) => role.kind) };
}

// ---------------------------------------------------------------- customers

const profileInput = z.object({
  companyId: z.string().min(1),
  type: z.enum(['designer', 'atelier', 'salon', 'manufacturer', 'distributor', 'wholesaler']).nullable().optional(),
  tier: z.enum(['standard', 'preferred', 'key']).default('standard'),
  paymentTerms: z.string().max(120).nullable().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

/** A company's commercial terms; the customer role is added when missing. */
export const upsertCustomerProfile = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SALES, 'Editing customer terms');
  const parsed = profileInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const customer = await customerOf(input.companyId);
  if (!customer.roles.includes('customer')) {
    await graphql(`mutation ($companyId: UUID!) { companyRole_insert(data: { companyId: $companyId, kind: customer }) }`, { companyId: customer.id });
  }
  const { customerProfiles } = await graphql<{ customerProfiles: { id: string }[] }>(`query ($companyId: UUID!) { customerProfiles(where: { companyId: { eq: $companyId } }, limit: 1) { id } }`, { companyId: customer.id });
  const data = { type: input.type ?? null, tier: input.tier, paymentTerms: input.paymentTerms ?? null, currency: input.currency ?? null, notes: input.notes ?? null };
  if (customerProfiles[0]) {
    await graphql(`mutation ($id: UUID!, $type: CustomerType, $tier: CustomerTier!, $paymentTerms: String, $currency: String, $notes: String) { customerProfile_update(id: $id, data: { type: $type, tier: $tier, paymentTerms: $paymentTerms, currency: $currency, notes: $notes, updatedAt_expr: "request.time" }) }`, { id: customerProfiles[0].id, ...data });
  } else {
    await graphql(`mutation ($companyId: UUID!, $type: CustomerType, $tier: CustomerTier!, $paymentTerms: String, $currency: String, $notes: String) { customerProfile_insert(data: { companyId: $companyId, type: $type, tier: $tier, paymentTerms: $paymentTerms, currency: $currency, notes: $notes }) }`, { companyId: customer.id, ...data });
  }
  await audit(caller.uid, 'customer.profile', 'customer', customer.id, null, data);
  return { companyId: customer.id };
});

// ---------------------------------------------------------------- quotes

const quoteLineInput = z.object({ skuCode: z.string().min(1), quantity: int64, unitPrice: int64, leadTimeDays: z.number().int().min(0).max(365).optional(), note: z.string().max(200).optional() });
const quoteInput = z.object({
  number: z.string().regex(/^QUO-\d{2}-\d{4}$/).optional(),
  customerId: z.string().min(1),
  contactId: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  incotermCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  namedPlace: z.string().max(120).optional(),
  paymentTerms: z.string().max(120).optional(),
  validUntil: date.optional(),
  notes: z.string().max(4000).optional(),
  lines: z.array(quoteLineInput).min(1).max(100),
});

/** A quote with its lines; given a number, replaces the lines of a draft. */
export const saveQuote = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SALES, 'Quoting');
  const parsed = quoteInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const customer = await customerOf(input.customerId);
  for (const [index, line] of input.lines.entries()) {
    if (BigInt(line.quantity) <= 0n) throw failure('validation', `Line ${index + 1}: the quantity is more than zero.`);
    if (BigInt(line.unitPrice) < 0n) throw failure('validation', `Line ${index + 1}: the price is zero or more.`);
  }
  let id: string;
  let number = input.number;
  if (number) {
    const { quotes } = await graphql<{ quotes: { id: string; state: string }[] }>(`query ($number: String!) { quotes(where: { number: { eq: $number } }, limit: 1) { id state } }`, { number });
    const quote = quotes[0];
    if (!quote) throw failure('not_found', `No quote ${number}.`);
    if (quote.state !== 'draft') throw failure('invariant_violation', `${number} is ${quote.state}; only a draft changes.`);
    id = quote.id;
    await graphql(
      `mutation ($id: UUID!, $customerId: UUID!, $contactId: UUID, $currency: String!, $incoterm: String, $namedPlace: String, $paymentTerms: String, $validUntil: Date, $notes: String) {
        quote_update(id: $id, data: { customerId: $customerId, contactId: $contactId, currency: $currency, incotermCode: $incoterm, namedPlace: $namedPlace, paymentTerms: $paymentTerms, validUntil: $validUntil, notes: $notes, updatedAt_expr: "request.time" }) }`,
      { id, customerId: customer.id, contactId: input.contactId ?? null, currency: input.currency, incoterm: input.incotermCode ?? null, namedPlace: input.namedPlace ?? null, paymentTerms: input.paymentTerms ?? null, validUntil: input.validUntil ?? null, notes: input.notes ?? null },
    );
    await graphql(`mutation ($id: UUID!) { quoteLine_deleteMany(where: { quoteId: { eq: $id } }) }`, { id });
  } else {
    number = await allocateNumber('QUO');
    const { quote_insert } = await graphql<{ quote_insert: { id: string } }>(
      `mutation ($number: String!, $customerId: UUID!, $contactId: UUID, $currency: String!, $incoterm: String, $namedPlace: String, $paymentTerms: String, $validUntil: Date, $notes: String, $uid: String!) {
        quote_insert(data: { number: $number, customerId: $customerId, contactId: $contactId, currency: $currency, incotermCode: $incoterm, namedPlace: $namedPlace, paymentTerms: $paymentTerms, validUntil: $validUntil, state: draft, notes: $notes, createdByUid: $uid }) }`,
      { number, customerId: customer.id, contactId: input.contactId ?? null, currency: input.currency, incoterm: input.incotermCode ?? null, namedPlace: input.namedPlace ?? null, paymentTerms: input.paymentTerms ?? null, validUntil: input.validUntil ?? null, notes: input.notes ?? null, uid: caller.uid },
    );
    id = quote_insert.id;
  }
  for (const [index, line] of input.lines.entries()) {
    await graphql(`mutation ($quoteId: UUID!, $lineNo: Int!, $sku: String!, $quantity: Int64!, $price: Int64!, $lead: Int, $note: String) { quoteLine_insert(data: { quoteId: $quoteId, lineNo: $lineNo, skuCode: $sku, quantity: $quantity, unitPrice: $price, leadTimeDays: $lead, note: $note }) }`, { quoteId: id, lineNo: index + 1, sku: line.skuCode, quantity: line.quantity, price: line.unitPrice, lead: line.leadTimeDays ?? null, note: line.note ?? null });
  }
  const total = input.lines.reduce((sum, line) => sum + BigInt(lineTotal(line)), 0n);
  await audit(caller.uid, input.number ? 'quote.update' : 'quote.create', 'quote', number, null, { customer: customer.name, lines: input.lines.length, total: total.toString(), currency: input.currency });
  if (!input.number) {
    await emit('quote.created', 'quote', number, { customer: customer.name });
    await timeline('quote', number, 'created', caller.uid, `${input.lines.length} line${input.lines.length === 1 ? '' : 's'} for ${customer.name}, ${money(total, input.currency)}`);
    await timeline('customer', customer.id, 'quote', caller.uid, `${number} opened: ${money(total, input.currency)}`);
  }
  return { number, id, total: total.toString() };
});

const quoteTransition = z.object({ number: z.string().regex(/^QUO-\d{2}-\d{4}$/), to: z.enum(['sent', 'accepted', 'declined']), reason: z.string().max(500).optional(), requestedDelivery: date.optional() });

interface QuoteRow {
  id: string;
  number: string;
  state: string;
  currency: string;
  namedPlace: string | null;
  paymentTerms: string | null;
  validUntil: string | null;
  notes: string | null;
  customer: { id: string; legalName: string; tradingName: string | null };
  contact: { id: string } | null;
  incoterm: { code: string } | null;
  quoteLines_on_quote: { lineNo: number; quantity: string; unitPrice: string; sku: { code: string } }[];
}

/** Sent, accepted (which opens the sales order) or declined. */
export const transitionQuote = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SALES, 'Moving quotes');
  const parsed = quoteTransition.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const { quotes } = await graphql<{ quotes: QuoteRow[] }>(
    `query ($number: String!) { quotes(where: { number: { eq: $number } }, limit: 1) { id number state currency namedPlace paymentTerms validUntil notes customer { id legalName tradingName } contact { id } incoterm { code } quoteLines_on_quote(orderBy: { lineNo: ASC }) { lineNo quantity unitPrice sku { code } } } }`,
    { number: input.number },
  );
  const quote = quotes[0];
  if (!quote) throw failure('not_found', `No quote ${input.number}.`);
  const allowed: Record<string, string[]> = { sent: ['draft', 'sent'], accepted: ['sent', 'draft'], declined: ['sent', 'draft'] };
  if (!allowed[input.to]!.includes(quote.state)) throw failure('invariant_violation', `${quote.number} is ${quote.state}; it cannot be ${input.to}.`);
  if (quote.quoteLines_on_quote.length === 0) throw failure('invariant_violation', 'A quote with no lines goes nowhere.');
  const customerName = quote.customer.tradingName || quote.customer.legalName;
  await graphql(`mutation ($id: UUID!, $state: QuoteState!, $sentOn: Date) { quote_update(id: $id, data: { state: $state, sentOn: $sentOn, updatedAt_expr: "request.time" }) }`, { id: quote.id, state: input.to, sentOn: input.to === 'sent' ? today() : null });
  let orderNumber: string | null = null;
  if (input.to === 'accepted') {
    orderNumber = await allocateNumber('SO');
    const { salesOrder_insert } = await graphql<{ salesOrder_insert: { id: string } }>(
      `mutation ($number: String!, $customerId: UUID!, $quoteId: UUID!, $contactId: UUID, $currency: String!, $incoterm: String, $namedPlace: String, $paymentTerms: String, $requestedDelivery: Date, $notes: String, $uid: String!) {
        salesOrder_insert(data: { number: $number, customerId: $customerId, quoteId: $quoteId, contactId: $contactId, currency: $currency, incotermCode: $incoterm, namedPlace: $namedPlace, paymentTerms: $paymentTerms, requestedDelivery: $requestedDelivery, state: confirmed, confirmedOn_expr: "request.time", notes: $notes, createdByUid: $uid }) }`,
      { number: orderNumber, customerId: quote.customer.id, quoteId: quote.id, contactId: quote.contact?.id ?? null, currency: quote.currency, incoterm: quote.incoterm?.code ?? null, namedPlace: quote.namedPlace, paymentTerms: quote.paymentTerms, requestedDelivery: input.requestedDelivery ?? null, notes: quote.notes, uid: caller.uid },
    );
    for (const line of quote.quoteLines_on_quote) {
      await graphql(`mutation ($orderId: UUID!, $lineNo: Int!, $sku: String!, $quantity: Int64!, $price: Int64!) { salesOrderLine_insert(data: { orderId: $orderId, lineNo: $lineNo, skuCode: $sku, quantity: $quantity, uom: "m", unitPrice: $price }) }`, { orderId: salesOrder_insert.id, lineNo: line.lineNo, sku: line.sku.code, quantity: line.quantity, price: line.unitPrice });
    }
    const total = quote.quoteLines_on_quote.reduce((sum, line) => sum + BigInt(lineTotal(line)), 0n);
    await emit('order.confirmed', 'sales_order', orderNumber, { customer: customerName, quote: quote.number });
    await timeline('sales_order', orderNumber, 'created', caller.uid, `Confirmed from ${quote.number}: ${money(total, quote.currency)} for ${customerName}`);
    await timeline('customer', quote.customer.id, 'order', caller.uid, `${orderNumber} confirmed from ${quote.number}: ${money(total, quote.currency)}`);
  }
  await audit(caller.uid, `quote.${input.to}`, 'quote', quote.number, { state: quote.state }, { state: input.to, order: orderNumber, reason: input.reason ?? null });
  await timeline('quote', quote.number, 'status_changed', caller.uid, `${input.to[0]!.toUpperCase()}${input.to.slice(1)}${orderNumber ? `; ${orderNumber} opened` : ''}${input.reason ? `: ${input.reason}` : ''}`);
  return { number: quote.number, state: input.to, orderNumber };
});

// ---------------------------------------------------------------- orders

const orderLineInput = z.object({ skuCode: z.string().min(1), quantity: int64, unitPrice: int64 });
const orderInput = z.object({
  customerId: z.string().min(1),
  contactId: z.string().optional(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  incotermCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  namedPlace: z.string().max(120).optional(),
  paymentTerms: z.string().max(120).optional(),
  requestedDelivery: date.optional(),
  shipToName: z.string().max(200).optional(),
  shipToAddress: z.string().max(1000).optional(),
  notes: z.string().max(4000).optional(),
  lines: z.array(orderLineInput).min(1).max(100),
  /** Confirmed straight away: the customer's order is in hand. */
  confirm: z.boolean().default(true),
});

/** A sales order without a quote: a repeat order or one taken on the phone. */
export const createSalesOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SALES, 'Taking orders');
  const parsed = orderInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const customer = await customerOf(input.customerId);
  for (const [index, line] of input.lines.entries()) if (BigInt(line.quantity) <= 0n) throw failure('validation', `Line ${index + 1}: the quantity is more than zero.`);
  const number = await allocateNumber('SO');
  const { salesOrder_insert } = await graphql<{ salesOrder_insert: { id: string } }>(
    `mutation ($number: String!, $customerId: UUID!, $contactId: UUID, $currency: String!, $incoterm: String, $namedPlace: String, $paymentTerms: String, $requestedDelivery: Date, $shipToName: String, $shipToAddress: String, $state: SalesOrderState!, $confirmedOn: Date, $notes: String, $uid: String!) {
      salesOrder_insert(data: { number: $number, customerId: $customerId, contactId: $contactId, currency: $currency, incotermCode: $incoterm, namedPlace: $namedPlace, paymentTerms: $paymentTerms, requestedDelivery: $requestedDelivery, shipToName: $shipToName, shipToAddress: $shipToAddress, state: $state, confirmedOn: $confirmedOn, notes: $notes, createdByUid: $uid }) }`,
    { number, customerId: customer.id, contactId: input.contactId ?? null, currency: input.currency, incoterm: input.incotermCode ?? null, namedPlace: input.namedPlace ?? null, paymentTerms: input.paymentTerms ?? null, requestedDelivery: input.requestedDelivery ?? null, shipToName: input.shipToName ?? null, shipToAddress: input.shipToAddress ?? null, state: input.confirm ? 'confirmed' : 'draft', confirmedOn: input.confirm ? today() : null, notes: input.notes ?? null, uid: caller.uid },
  );
  for (const [index, line] of input.lines.entries()) {
    await graphql(`mutation ($orderId: UUID!, $lineNo: Int!, $sku: String!, $quantity: Int64!, $price: Int64!) { salesOrderLine_insert(data: { orderId: $orderId, lineNo: $lineNo, skuCode: $sku, quantity: $quantity, uom: "m", unitPrice: $price }) }`, { orderId: salesOrder_insert.id, lineNo: index + 1, sku: line.skuCode, quantity: line.quantity, price: line.unitPrice });
  }
  const total = input.lines.reduce((sum, line) => sum + BigInt(lineTotal(line)), 0n);
  await audit(caller.uid, 'order.create', 'sales_order', number, null, { customer: customer.name, lines: input.lines.length, total: total.toString(), currency: input.currency, confirmed: input.confirm });
  await emit(input.confirm ? 'order.confirmed' : 'order.created', 'sales_order', number, { customer: customer.name });
  await timeline('sales_order', number, 'created', caller.uid, `${input.confirm ? 'Confirmed' : 'Draft'}: ${money(total, input.currency)} for ${customer.name}`);
  await timeline('customer', customer.id, 'order', caller.uid, `${number} ${input.confirm ? 'confirmed' : 'drafted'}: ${money(total, input.currency)}`);
  return { number, id: salesOrder_insert.id, total: total.toString() };
});

interface OrderRow {
  id: string;
  number: string;
  state: string;
  currency: string;
  requestedDelivery: string | null;
  shipToName: string | null;
  customer: { id: string; legalName: string; tradingName: string | null; locations_on_company: { id: string; type: string; name: string }[] };
  salesOrderLines_on_order: { id: string; lineNo: number; quantity: string; unitPrice: string; sku: { code: string; rollTracking: boolean }; allocations_on_orderLine: { id: string; quantity: string; shippedOn: string | null; lot: { id: string; number: string }; roll: { id: string; number: string } | null; location: { id: string; name: string } }[] }[];
}

async function loadOrder(number: string): Promise<OrderRow> {
  const { salesOrders } = await graphql<{ salesOrders: OrderRow[] }>(
    `query ($number: String!) { salesOrders(where: { number: { eq: $number } }, limit: 1) {
       id number state currency requestedDelivery shipToName
       customer { id legalName tradingName locations_on_company { id type name } }
       salesOrderLines_on_order(orderBy: { lineNo: ASC }) { id lineNo quantity unitPrice sku { code rollTracking }
         allocations_on_orderLine { id quantity shippedOn lot { id number } roll { id number } location { id name } } } } }`,
    { number },
  );
  const order = salesOrders[0];
  if (!order) throw failure('not_found', `No sales order ${number}.`);
  return order;
}

const orderTransition = z.object({ number: z.string().regex(/^SO-\d{2}-\d{4}$/), to: z.enum(['confirmed', 'cancelled', 'closed']), reason: z.string().max(500).optional() });

export const transitionSalesOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SALES, 'Moving orders');
  const parsed = orderTransition.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const order = await loadOrder(input.number);
  const allowed: Record<string, string[]> = { confirmed: ['draft'], cancelled: ['draft', 'confirmed'], closed: ['shipped'] };
  if (!allowed[input.to]!.includes(order.state)) throw failure('invariant_violation', `${order.number} is ${order.state}; it cannot be ${input.to}.`);
  if (input.to === 'cancelled') {
    // Held stock goes back to the floor; shipped stock is gone.
    for (const line of order.salesOrderLines_on_order) {
      for (const allocation of line.allocations_on_orderLine) {
        if (!allocation.shippedOn) await graphql(`mutation ($id: UUID!) { allocation_delete(id: $id) }`, { id: allocation.id });
      }
    }
  }
  await graphql(`mutation ($id: UUID!, $state: SalesOrderState!, $confirmedOn: Date) { salesOrder_update(id: $id, data: { state: $state ${input.to === 'confirmed' ? ', confirmedOn: $confirmedOn' : ''}, updatedAt_expr: "request.time" }) }`, { id: order.id, state: input.to, confirmedOn: today() });
  await audit(caller.uid, `order.${input.to}`, 'sales_order', order.number, { state: order.state }, { state: input.to, reason: input.reason ?? null });
  await emit(`order.${input.to}`, 'sales_order', order.number, { reason: input.reason ?? null });
  await timeline('sales_order', order.number, 'status_changed', caller.uid, `${input.to[0]!.toUpperCase()}${input.to.slice(1)}${input.reason ? `: ${input.reason}` : ''}`);
  return { number: order.number, state: input.to };
});

// ---------------------------------------------------------------- allocation

const allocateInput = z.object({
  number: z.string().regex(/^SO-\d{2}-\d{4}$/),
  /** Given allocations replace the suggestion; empty takes the oldest stock first. */
  allocations: z.array(z.object({ lineId: z.string().min(1), lotNumber: z.string().min(1), rollNumber: z.string().optional(), locationId: z.string().min(1), quantity: int64 })).max(500).optional(),
});

interface StockRow {
  onHand: string;
  updatedAt: string;
  lot: { id: string; number: string; createdAt: string; rolls_on_lot: { id: string; number: string; remainingLength: string | null; stockLocation: { id: string } | null }[] };
  location: { id: string; name: string; kind: string };
}

/** The stock an order line can draw on: warehouses only, less what other open orders hold. */
async function stockFor(skuCode: string, exceptOrderId: string): Promise<{ stock: StockForAllocation[]; lotIds: Map<string, string>; rollIds: Map<string, string> }> {
  const { stockBalances, allocations } = await graphql<{ stockBalances: StockRow[]; allocations: { quantity: string; lot: { number: string }; roll: { number: string } | null; location: { id: string }; orderLine: { order: { id: string; state: string } } }[] }>(
    `query ($sku: String!) {
       stockBalances(where: { skuCode: { eq: $sku }, onHand: { gt: 0 } }) { onHand updatedAt lot { id number createdAt rolls_on_lot { id number remainingLength stockLocation { id } } } location { id name kind } }
       allocations(where: { shippedOn: { isNull: true }, lot: { skuCode: { eq: $sku } } }) { quantity lot { number } roll { number } location { id } orderLine { order { id state } } } }`,
    { sku: skuCode },
  );
  const held = allocations.filter((allocation) => allocation.orderLine.order.id !== exceptOrderId && allocation.orderLine.order.state !== 'cancelled');
  const lotIds = new Map<string, string>();
  const rollIds = new Map<string, string>();
  const stock: StockForAllocation[] = [];
  for (const balance of stockBalances) {
    if (balance.location.kind !== 'physical') continue;
    lotIds.set(balance.lot.number, balance.lot.id);
    const heldHere = held.filter((allocation) => allocation.lot.number === balance.lot.number && allocation.location.id === balance.location.id);
    const heldMetres = heldHere.reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n);
    const heldRolls = new Set(heldHere.map((allocation) => allocation.roll?.number).filter(Boolean));
    const rolls = balance.lot.rolls_on_lot.filter((roll) => roll.stockLocation?.id === balance.location.id && !heldRolls.has(roll.number) && BigInt(roll.remainingLength ?? '0') > 0n);
    for (const roll of balance.lot.rolls_on_lot) rollIds.set(roll.number, roll.id);
    const available = BigInt(balance.onHand) - heldMetres;
    if (available <= 0n) continue;
    stock.push({ lotNumber: balance.lot.number, locationId: balance.location.id, locationName: balance.location.name, available: available.toString(), receivedAt: balance.lot.createdAt, rolls: rolls.map((roll) => ({ number: roll.number, remaining: roll.remainingLength ?? '0' })) });
  }
  return { stock, lotIds, rollIds };
}

/** Holds stock for every line of a confirmed order: the oldest lot first, whole rolls, one cut. Existing unshipped allocations are replaced. */
export const allocateSalesOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, FULFIL, 'Allocating stock');
  const parsed = allocateInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const order = await loadOrder(input.number);
  if (order.state !== 'confirmed') throw failure('invariant_violation', `${order.number} is ${order.state}; stock is held for a confirmed order.`);
  const results: { lineId: string; skuCode: string; allocated: string; short: string }[] = [];
  for (const line of order.salesOrderLines_on_order) {
    for (const allocation of line.allocations_on_orderLine) {
      if (!allocation.shippedOn) await graphql(`mutation ($id: UUID!) { allocation_delete(id: $id) }`, { id: allocation.id });
    }
    const shipped = line.allocations_on_orderLine.filter((allocation) => allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n);
    const need = BigInt(line.quantity) - shipped;
    if (need <= 0n) {
      results.push({ lineId: line.id, skuCode: line.sku.code, allocated: '0', short: '0' });
      continue;
    }
    const { stock, lotIds, rollIds } = await stockFor(line.sku.code, order.id);
    const given = input.allocations?.filter((allocation) => allocation.lineId === line.id);
    const plan = given && given.length > 0 ? given.map((allocation) => ({ lotNumber: allocation.lotNumber, locationId: allocation.locationId, rollNumber: allocation.rollNumber ?? null, quantity: allocation.quantity })) : suggestAllocation(need.toString(), stock).plan;
    let allocated = 0n;
    for (const entry of plan) {
      const lotId = lotIds.get(entry.lotNumber);
      if (!lotId) throw failure('validation', `${entry.lotNumber} is not in stock for ${line.sku.code}.`);
      const source = stock.find((candidate) => candidate.lotNumber === entry.lotNumber && candidate.locationId === entry.locationId);
      if (!source || BigInt(source.available) < BigInt(entry.quantity)) throw failure('invariant_violation', `Only ${metres(BigInt(source?.available ?? '0'))} of ${entry.lotNumber} is free at that place.`);
      const rollId = entry.rollNumber ? rollIds.get(entry.rollNumber) : null;
      if (entry.rollNumber && !rollId) throw failure('validation', `${entry.rollNumber} is not a roll in stock.`);
      await graphql(`mutation ($lineId: UUID!, $lotId: UUID!, $rollId: UUID, $locationId: UUID!, $quantity: Int64!) { allocation_insert(data: { orderLineId: $lineId, lotId: $lotId, rollId: $rollId, locationId: $locationId, quantity: $quantity }) }`, { lineId: line.id, lotId, rollId: rollId ?? null, locationId: entry.locationId, quantity: entry.quantity });
      allocated += BigInt(entry.quantity);
    }
    results.push({ lineId: line.id, skuCode: line.sku.code, allocated: allocated.toString(), short: (need - allocated > 0n ? need - allocated : 0n).toString() });
  }
  const short = results.filter((result) => result.short !== '0');
  const summary = `Stock held: ${results.map((result) => `${result.skuCode} ${metres(BigInt(result.allocated))}`).join(', ')}${short.length > 0 ? `; short ${short.map((result) => `${result.skuCode} ${metres(BigInt(result.short))}`).join(', ')}` : ''}`;
  await audit(caller.uid, 'order.allocate', 'sales_order', order.number, null, { results });
  await emit('order.allocated', 'sales_order', order.number, { short: short.length });
  await timeline('sales_order', order.number, 'allocated', caller.uid, summary);
  return { number: order.number, results };
});

// ---------------------------------------------------------------- shipping

const shipInput = z.object({
  number: z.string().regex(/^SO-\d{2}-\d{4}$/),
  mode: z.enum(['courier', 'air', 'sea', 'road']).default('courier'),
  destinationId: z.string().optional(),
  departure: date.optional(),
  carrier: z.string().max(120).optional(),
  tracking: z.string().max(120).optional(),
  note: z.string().max(1000).optional(),
});

/**
 * The allocated stock leaves: a movement per allocation out of the
 * warehouse, an outbound shipment with its lines and legs, the order shipped.
 */
export const shipSalesOrder = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, FULFIL, 'Shipping orders');
  const parsed = shipInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const order = await loadOrder(input.number);
  if (order.state !== 'confirmed') throw failure('invariant_violation', `${order.number} is ${order.state}; a confirmed order ships.`);
  const open = order.salesOrderLines_on_order.flatMap((line) => line.allocations_on_orderLine.filter((allocation) => !allocation.shippedOn).map((allocation) => ({ line, allocation })));
  if (open.length === 0) throw failure('invariant_violation', 'Nothing is allocated; hold the stock first.');
  const customerName = order.customer.tradingName || order.customer.legalName;

  // Where from: the place of the first allocation; where to: the customer's site, created from its name when none exists.
  const fromLocationId = open[0]!.allocation.location.id;
  const { stockLocations } = await graphql<{ stockLocations: { place: { id: string } | null; name: string }[] }>(`query ($id: UUID!) { stockLocations(where: { id: { eq: $id } }, limit: 1) { name place { id } } }`, { id: fromLocationId });
  const originPlaceId = stockLocations[0]?.place?.id ?? null;
  let destinationId = input.destinationId ?? order.customer.locations_on_company.find((location) => location.type === 'customer_site')?.id ?? order.customer.locations_on_company[0]?.id ?? null;
  if (!destinationId) {
    const { location_insert } = await graphql<{ location_insert: { id: string } }>(`mutation ($companyId: UUID!, $name: String!) { location_insert(data: { companyId: $companyId, type: customer_site, name: $name }) }`, { companyId: order.customer.id, name: order.shipToName || customerName });
    destinationId = location_insert.id;
  }
  if (!originPlaceId) throw failure('invariant_violation', `${stockLocations[0]?.name ?? 'The warehouse'} is not tied to a place; give it one in Inventory › Places.`);

  const shipmentNumber = await allocateNumber('SHP');
  const { shipment_insert } = await graphql<{ shipment_insert: { id: string } }>(
    `mutation ($number: String!, $mode: TransportMode!, $originId: UUID!, $destinationId: UUID!, $consigneeId: UUID!, $consigneeName: String, $notes: String, $uid: String!, $bookedOn: Date!) {
      shipment_insert(data: { number: $number, flow: outbound, mode: $mode, loadType: none, originId: $originId, destinationId: $destinationId, consigneeId: $consigneeId, consigneeName: $consigneeName, state: booked, health: on_track, bookedOn: $bookedOn, notes: $notes, createdByUid: $uid }) }`,
    { number: shipmentNumber, mode: input.mode, originId: originPlaceId, destinationId, consigneeId: order.customer.id, consigneeName: order.shipToName || customerName, notes: input.note ?? null, uid: caller.uid, bookedOn: today() },
  );
  const departure = (input.departure ?? today()) as LocalDate;
  const legs = defaultLegs(input.mode as TransportMode, departure);
  for (const [index, leg] of legs.entries()) {
    await graphql(
      `mutation ($shipmentId: UUID!, $sequence: Int!, $type: LegType!, $mode: TransportMode!, $fromId: UUID, $toId: UUID, $etd: Date!, $eta: Date!, $atd: Date, $vessel: String) {
        shipmentLeg_insert(data: { shipmentId: $shipmentId, sequence: $sequence, type: $type, mode: $mode, fromLocationId: $fromId, toLocationId: $toId, plannedEtd: $etd, plannedEta: $eta, atd: $atd, vessel: $vessel }) }`,
      { shipmentId: shipment_insert.id, sequence: index + 1, type: leg.type, mode: leg.type === 'main_carriage' ? input.mode : 'road', fromId: index === 0 ? originPlaceId : null, toId: index === legs.length - 1 ? destinationId : null, etd: leg.plannedEtd, eta: leg.plannedEta, atd: index === 0 ? departure : null, vessel: leg.type === 'main_carriage' ? (input.carrier ?? null) : null },
    );
  }
  if (input.tracking) await graphql(`mutation ($id: UUID!, $value: String!) { shipmentReference_insert(data: { shipmentId: $id, type: tracking, value: $value }) }`, { id: shipment_insert.id, value: input.tracking });

  // Stock leaves: one movement per allocation, to the virtual place "with customers".
  const { stockLocations: customerPlaces } = await graphql<{ stockLocations: { id: string }[] }>(`query { stockLocations(where: { kind: { eq: customer } }, limit: 1) { id } }`);
  let customerPlaceId = customerPlaces[0]?.id;
  if (!customerPlaceId) {
    const { stockLocation_insert } = await graphql<{ stockLocation_insert: { id: string } }>(`mutation { stockLocation_insert(data: { name: "With customers", kind: customer, isDefault: false }) }`);
    customerPlaceId = stockLocation_insert.id;
  }
  const byLine = new Map<string, bigint>();
  for (const { line, allocation } of open) {
    await graphql(
      `mutation ($sku: String!, $lotId: UUID!, $rollId: UUID, $quantity: Int64!, $fromId: UUID!, $toId: UUID!, $sourceId: String!, $uid: String!) {
        stockMovement_insert(data: { skuCode: $sku, lotId: $lotId, rollId: $rollId, quantity: $quantity, uom: "m", fromLocationId: $fromId, toLocationId: $toId, reason: ship, sourceType: "sales_order", sourceId: $sourceId, actorUid: $uid }) }`,
      { sku: line.sku.code, lotId: allocation.lot.id, rollId: allocation.roll?.id ?? null, quantity: allocation.quantity, fromId: allocation.location.id, toId: customerPlaceId, sourceId: order.number, uid: caller.uid },
    );
    await graphql(`mutation ($id: UUID!, $on: Date!, $shipmentId: UUID!) { allocation_update(id: $id, data: { shippedOn: $on, shipmentId: $shipmentId }) }`, { id: allocation.id, on: departure, shipmentId: shipment_insert.id });
    byLine.set(line.id, (byLine.get(line.id) ?? 0n) + BigInt(allocation.quantity));
    // Balances and roll positions follow the ledger, as every movement does.
    await refresh(line.sku.code, allocation.lot.id, allocation.roll?.id ?? null, [allocation.location.id, customerPlaceId]);
  }
  // Lines of the outbound shipment: one per sales-order line and lot.
  const lotTotals = new Map<string, { lineId: string; lotId: string; quantity: bigint }>();
  for (const { line, allocation } of open) {
    const key = `${line.id}:${allocation.lot.id}`;
    const current = lotTotals.get(key) ?? { lineId: line.id, lotId: allocation.lot.id, quantity: 0n };
    current.quantity += BigInt(allocation.quantity);
    lotTotals.set(key, current);
  }
  for (const total of lotTotals.values()) {
    await graphql(`mutation ($shipmentId: UUID!, $lineId: UUID!, $lotId: UUID!, $quantity: Int64!) { shipmentLine_insert(data: { shipmentId: $shipmentId, salesOrderLineId: $lineId, lotId: $lotId, quantity: $quantity, uom: "m" }) }`, { shipmentId: shipment_insert.id, lineId: total.lineId, lotId: total.lotId, quantity: total.quantity.toString() });
  }
  const complete = order.salesOrderLines_on_order.every((line) => line.allocations_on_orderLine.filter((allocation) => allocation.shippedOn).reduce((sum, allocation) => sum + BigInt(allocation.quantity), 0n) + (byLine.get(line.id) ?? 0n) >= BigInt(line.quantity));
  if (complete) await graphql(`mutation ($id: UUID!) { salesOrder_update(id: $id, data: { state: shipped, updatedAt_expr: "request.time" }) }`, { id: order.id });
  const shippedMetres = [...byLine.values()].reduce((sum, value) => sum + value, 0n);
  await audit(caller.uid, 'order.ship', 'sales_order', order.number, { state: order.state }, { shipment: shipmentNumber, metres: shippedMetres.toString(), complete });
  await emit('order.shipped', 'sales_order', order.number, { shipment: shipmentNumber, complete });
  await timeline('sales_order', order.number, 'shipped', caller.uid, `${shipmentNumber}: ${metres(shippedMetres)} by ${input.mode}${input.tracking ? `, tracking ${input.tracking}` : ''}${complete ? '' : ' (part)'}`);
  await timeline('shipment', shipmentNumber, 'created', caller.uid, `Outbound for ${order.number} to ${customerName}: ${metres(shippedMetres)}`);
  await timeline('customer', order.customer.id, 'shipped', caller.uid, `${order.number} shipped on ${shipmentNumber}`);
  for (const lotNumber of new Set(open.map(({ allocation }) => allocation.lot.number))) await timeline('lot', lotNumber, 'stock', caller.uid, `Shipped on ${shipmentNumber} for ${order.number}`);
  return { number: order.number, shipmentNumber, metres: shippedMetres.toString(), complete };
});

/** The same recomputation the inventory function does after a movement, for the ship movement recorded here. */
async function refresh(skuCode: string, lotId: string, rollId: string | null, locationIds: string[]): Promise<void> {
  if (rollId) {
    const { rolls, stockMovements } = await graphql<{ rolls: { measuredLength: string }[]; stockMovements: { quantity: string; toLocation: { id: string } | null }[] }>(
      `query ($id: UUID!) { rolls(where: { id: { eq: $id } }, limit: 1) { measuredLength } stockMovements(where: { rollId: { eq: $id } }, orderBy: { occurredAt: ASC }, limit: 500) { quantity toLocation { id } } }`,
      { id: rollId },
    );
    const roll = rolls[0];
    if (roll) {
      let remaining = BigInt(roll.measuredLength);
      let locationId: string | null = null;
      for (const movement of stockMovements) {
        const quantity = BigInt(movement.quantity);
        if (quantity < remaining) remaining -= quantity;
        else {
          locationId = movement.toLocation?.id ?? null;
          if (!movement.toLocation) remaining = 0n;
        }
      }
      await graphql(`mutation ($id: UUID!, $locationId: UUID, $remaining: Int64!) { roll_update(id: $id, data: { stockLocationId: $locationId, remainingLength: $remaining }) }`, { id: rollId, locationId, remaining: remaining.toString() });
    }
  }
  for (const locationId of locationIds) {
    const { stockMovements, rolls } = await graphql<{ stockMovements: { quantity: string; fromLocation: { id: string } | null; toLocation: { id: string } | null }[]; rolls: { id: string }[] }>(
      `query ($lotId: UUID!, $locationId: UUID!) { stockMovements(where: { lotId: { eq: $lotId } }, limit: 5000) { quantity fromLocation { id } toLocation { id } } rolls(where: { lotId: { eq: $lotId }, stockLocationId: { eq: $locationId } }, limit: 1000) { id } }`,
      { lotId, locationId },
    );
    let onHand = 0n;
    for (const movement of stockMovements) {
      if (movement.toLocation?.id === locationId) onHand += BigInt(movement.quantity);
      if (movement.fromLocation?.id === locationId) onHand -= BigInt(movement.quantity);
    }
    const { stockBalances } = await graphql<{ stockBalances: { id: string }[] }>(`query ($lotId: UUID!, $locationId: UUID!) { stockBalances(where: { lotId: { eq: $lotId }, locationId: { eq: $locationId } }, limit: 1) { id } }`, { lotId, locationId });
    if (stockBalances[0]) await graphql(`mutation ($id: UUID!, $onHand: Int64!, $rolls: Int!) { stockBalance_update(id: $id, data: { onHand: $onHand, rolls: $rolls, updatedAt_expr: "request.time" }) }`, { id: stockBalances[0].id, onHand: onHand.toString(), rolls: rolls.length });
    else await graphql(`mutation ($sku: String!, $lotId: UUID!, $locationId: UUID!, $onHand: Int64!, $rolls: Int!) { stockBalance_insert(data: { skuCode: $sku, lotId: $lotId, locationId: $locationId, onHand: $onHand, rolls: $rolls }) }`, { sku: skuCode, lotId, locationId, onHand: onHand.toString(), rolls: rolls.length });
  }
}

// ---------------------------------------------------------------- invoices

const invoiceInput = z.object({ number: z.string().regex(/^SO-\d{2}-\d{4}$/), invoiceNumber: z.string().min(1).max(80), amount: int64, currency: z.string().regex(/^[A-Z]{3}$/).optional(), issuedOn: date.optional(), dueOn: date.optional(), paidOn: date.nullable().optional(), paidAmount: int64.nullable().optional(), externalId: z.string().max(120).optional() });

/** A pointer to the invoice in the accounting system, and what was paid against it. */
export const recordInvoice = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations', 'sales', 'finance'], 'Recording invoices');
  const parsed = invoiceInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const order = await loadOrder(input.number);
  const { invoiceRefs } = await graphql<{ invoiceRefs: { id: string }[] }>(`query ($orderId: UUID!, $number: String!) { invoiceRefs(where: { orderId: { eq: $orderId }, number: { eq: $number } }, limit: 1) { id } }`, { orderId: order.id, number: input.invoiceNumber });
  const data = { number: input.invoiceNumber, amount: input.amount, currency: input.currency ?? order.currency, issuedOn: input.issuedOn ?? null, dueOn: input.dueOn ?? null, paidOn: input.paidOn ?? null, paidAmount: input.paidAmount ?? null, externalId: input.externalId ?? null };
  if (invoiceRefs[0]) {
    await graphql(`mutation ($id: UUID!, $amount: Int64!, $currency: String!, $issuedOn: Date, $dueOn: Date, $paidOn: Date, $paidAmount: Int64, $externalId: String) { invoiceRef_update(id: $id, data: { amount: $amount, currency: $currency, issuedOn: $issuedOn, dueOn: $dueOn, paidOn: $paidOn, paidAmount: $paidAmount, externalId: $externalId }) }`, { id: invoiceRefs[0].id, ...data });
  } else {
    await graphql(`mutation ($orderId: UUID!, $number: String!, $amount: Int64!, $currency: String!, $issuedOn: Date, $dueOn: Date, $paidOn: Date, $paidAmount: Int64, $externalId: String) { invoiceRef_insert(data: { orderId: $orderId, number: $number, amount: $amount, currency: $currency, issuedOn: $issuedOn, dueOn: $dueOn, paidOn: $paidOn, paidAmount: $paidAmount, externalId: $externalId }) }`, { orderId: order.id, ...data });
  }
  await audit(caller.uid, 'order.invoice', 'sales_order', order.number, null, data);
  await timeline('sales_order', order.number, 'invoice', caller.uid, `Invoice ${input.invoiceNumber}: ${money(input.amount, data.currency)}${input.paidOn ? `, paid ${input.paidOn}` : ''}`);
  return { number: order.number, invoiceNumber: input.invoiceNumber };
});
