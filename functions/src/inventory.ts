import { legStatus, receiptCheck, type LegFacts } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { allocateNumber, timeline } from './manufacturing';

// Inventory commands: places stock can be, the receipt of a shipment into
// one, and the movements people record by hand. Every command appends to
// the ledger and recomputes the balances it touched from the ledger.

const STOCK = ['owner', 'operations', 'logistics'] as const;
const int64 = z.string().regex(/^-?\d+$/, 'Fixed-point integer expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');
const today = () => new Date().toISOString().slice(0, 10);
const metres = (stored: bigint) => `${(Number(stored) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} m`;

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

// ---------------------------------------------------------------- locations

const locationInput = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(['physical', 'at_supplier', 'in_transit', 'customer', 'scrap', 'adjustment', 'samples']).default('physical'),
  placeId: z.string().optional(),
  zone: z.string().max(80).optional(),
  isDefault: z.boolean().default(false),
});

export const createStockLocation = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, STOCK, 'Adding stock locations');
  const parsed = locationInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.isDefault) await graphql(`mutation { stockLocation_updateMany(where: { isDefault: { eq: true } }, data: { isDefault: false }) }`);
  const { stockLocation_insert } = await graphql<{ stockLocation_insert: { id: string } }>(
    `mutation ($name: String!, $kind: StockLocationKind!, $placeId: UUID, $zone: String, $default: Boolean!) { stockLocation_insert(data: { name: $name, kind: $kind, placeId: $placeId, zone: $zone, isDefault: $default }) }`,
    { name: input.name, kind: input.kind, placeId: input.placeId ?? null, zone: input.zone ?? null, default: input.isDefault },
  );
  await audit(caller.uid, 'stock_location.create', 'stock_location', stockLocation_insert.id, null, input);
  return { id: stockLocation_insert.id };
});

/** The virtual place of a kind, created once when first needed. */
async function virtualLocation(kind: 'adjustment' | 'scrap' | 'samples' | 'customer'): Promise<string> {
  const { stockLocations } = await graphql<{ stockLocations: { id: string }[] }>(`query ($kind: StockLocationKind!) { stockLocations(where: { kind: { eq: $kind } }, limit: 1) { id } }`, { kind });
  if (stockLocations[0]) return stockLocations[0].id;
  const names = { adjustment: 'Adjustments', scrap: 'Scrap', samples: 'Samples', customer: 'With customers' };
  const { stockLocation_insert } = await graphql<{ stockLocation_insert: { id: string } }>(`mutation ($name: String!, $kind: StockLocationKind!) { stockLocation_insert(data: { name: $name, kind: $kind, isDefault: false }) }`, { name: names[kind], kind });
  return stockLocation_insert.id;
}

// ---------------------------------------------------------------- ledger

interface MovementInput {
  skuCode: string;
  lotId: string;
  rollId: string | null;
  quantity: bigint;
  fromId: string | null;
  toId: string | null;
  reason: string;
  sourceType: string | null;
  sourceId: string | null;
  note: string | null;
  occurredAt?: string;
}

/** Appends to the ledger and recomputes the balances it touched from the ledger. */
async function record(movement: MovementInput, actorUid: string): Promise<void> {
  await graphql(
    `mutation ($sku: String!, $lotId: UUID!, $rollId: UUID, $quantity: Int64!, $fromId: UUID, $toId: UUID, $reason: MovementReason!, $sourceType: String, $sourceId: String, $note: String, $uid: String!) {
      stockMovement_insert(data: { skuCode: $sku, lotId: $lotId, rollId: $rollId, quantity: $quantity, uom: "m", fromLocationId: $fromId, toLocationId: $toId, reason: $reason, sourceType: $sourceType, sourceId: $sourceId, note: $note, actorUid: $uid }) }`,
    { sku: movement.skuCode, lotId: movement.lotId, rollId: movement.rollId, quantity: movement.quantity.toString(), fromId: movement.fromId, toId: movement.toId, reason: movement.reason, sourceType: movement.sourceType, sourceId: movement.sourceId, note: movement.note, uid: actorUid },
  );
  if (movement.rollId) await refreshRoll(movement.rollId);
  for (const locationId of [movement.fromId, movement.toId]) if (locationId) await refreshBalance(movement.skuCode, movement.lotId, locationId);
}

async function refreshBalance(skuCode: string, lotId: string, locationId: string): Promise<void> {
  const { stockMovements, rolls } = await graphql<{ stockMovements: { quantity: string; fromLocation: { id: string } | null; toLocation: { id: string } | null }[]; rolls: { id: string }[] }>(
    `query ($lotId: UUID!, $locationId: UUID!) {
       stockMovements(where: { lotId: { eq: $lotId } }, limit: 5000) { quantity fromLocation { id } toLocation { id } }
       rolls(where: { lotId: { eq: $lotId }, stockLocationId: { eq: $locationId } }, limit: 1000) { id } }`,
    { lotId, locationId },
  );
  let onHand = 0n;
  for (const movement of stockMovements) {
    const quantity = BigInt(movement.quantity);
    if (movement.toLocation?.id === locationId) onHand += quantity;
    if (movement.fromLocation?.id === locationId) onHand -= quantity;
  }
  const { stockBalances } = await graphql<{ stockBalances: { id: string }[] }>(`query ($lotId: UUID!, $locationId: UUID!) { stockBalances(where: { lotId: { eq: $lotId }, locationId: { eq: $locationId } }, limit: 1) { id } }`, { lotId, locationId });
  if (stockBalances[0]) {
    await graphql(`mutation ($id: UUID!, $onHand: Int64!, $rolls: Int!) { stockBalance_update(id: $id, data: { onHand: $onHand, rolls: $rolls, updatedAt_expr: "request.time" }) }`, { id: stockBalances[0].id, onHand: onHand.toString(), rolls: rolls.length });
  } else {
    await graphql(`mutation ($sku: String!, $lotId: UUID!, $locationId: UUID!, $onHand: Int64!, $rolls: Int!) { stockBalance_insert(data: { skuCode: $sku, lotId: $lotId, locationId: $locationId, onHand: $onHand, rolls: $rolls }) }`, { sku: skuCode, lotId, locationId, onHand: onHand.toString(), rolls: rolls.length });
  }
}

/**
 * Where the roll is and what is left on it, replayed from its movements: a
 * movement of less than what is left is a cut and leaves the roll where it
 * is; a movement of all of it carries the roll to its destination.
 */
async function refreshRoll(rollId: string): Promise<void> {
  const { rolls, stockMovements } = await graphql<{ rolls: { measuredLength: string }[]; stockMovements: { quantity: string; toLocation: { id: string } | null; occurredAt: string }[] }>(
    `query ($id: UUID!) { rolls(where: { id: { eq: $id } }, limit: 1) { measuredLength } stockMovements(where: { rollId: { eq: $id } }, orderBy: { occurredAt: ASC }, limit: 500) { quantity toLocation { id } occurredAt } }`,
    { id: rollId },
  );
  const roll = rolls[0];
  if (!roll) return;
  let remaining = BigInt(roll.measuredLength);
  let locationId: string | null = null;
  for (const movement of stockMovements) {
    const quantity = BigInt(movement.quantity);
    if (quantity < remaining) {
      remaining -= quantity;
    } else {
      locationId = movement.toLocation?.id ?? null;
      if (!movement.toLocation) remaining = 0n;
    }
  }
  await graphql(`mutation ($id: UUID!, $locationId: UUID, $remaining: Int64!) { roll_update(id: $id, data: { stockLocationId: $locationId, remainingLength: $remaining }) }`, { id: rollId, locationId, remaining: remaining.toString() });
}

async function balanceOf(lotId: string, locationId: string): Promise<bigint> {
  const { stockBalances } = await graphql<{ stockBalances: { onHand: string }[] }>(`query ($lotId: UUID!, $locationId: UUID!) { stockBalances(where: { lotId: { eq: $lotId }, locationId: { eq: $locationId } }, limit: 1) { onHand } }`, { lotId, locationId });
  return BigInt(stockBalances[0]?.onHand ?? '0');
}

// ---------------------------------------------------------------- receiving

const receiveInput = z.object({
  number: z.string().regex(/^SHP-\d{2}-\d{4}$/),
  locationId: z.string().min(1),
  receivedOn: date.optional(),
  note: z.string().max(2000).optional(),
  /** Per line: what was counted. Rolls by number where the lot is roll-tracked; otherwise metres. */
  lines: z.array(z.object({ shipmentLineId: z.string().min(1), receivedQuantity: int64.optional(), rollNumbers: z.array(z.string()).max(500).optional(), note: z.string().max(500).optional() })).min(1).max(200),
});

interface ReceivingRow {
  id: string;
  number: string;
  state: string;
  destination: { name: string };
  shipmentLegs_on_shipment: LegFacts[];
  shipmentLines_on_shipment: { id: string; quantity: string; lot: { id: string; number: string; sku: { code: string; rollTracking: boolean }; rolls_on_lot: { id: string; number: string; measuredLength: string; handlingUnitContents_on_roll: { handlingUnit: { shipment: { number: string } | null } }[] }[] } }[];
  receipts_on_shipment: { number: string }[];
}

/**
 * Goods into stock from a shipment: one receipt, a movement per roll (or per
 * lot where rolls are not tracked), the count against what was loaded, and
 * the shipment closed once every line is received.
 */
export const receiveShipment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, STOCK, 'Receiving');
  const parsed = receiveInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const { shipments } = await graphql<{ shipments: ReceivingRow[] }>(
    `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) {
       id number state destination { name }
       shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { type sequence plannedEtd plannedEta etd eta atd ata }
       shipmentLines_on_shipment { id quantity lot { id number sku { code rollTracking } rolls_on_lot(orderBy: { rollNo: ASC }) { id number measuredLength handlingUnitContents_on_roll { handlingUnit { shipment { number } } } } } }
       receipts_on_shipment { number } } }`,
    { number: input.number },
  );
  const shipment = shipments[0];
  if (!shipment) throw failure('not_found', `No shipment ${input.number}.`);
  if (shipment.state !== 'booked') throw failure('invariant_violation', `${input.number} is ${shipment.state}; a booked shipment is received.`);
  const main = shipment.shipmentLegs_on_shipment.find((leg) => leg.type === 'main_carriage') ?? shipment.shipmentLegs_on_shipment[shipment.shipmentLegs_on_shipment.length - 1];
  if (main && legStatus(main) !== 'arrived') throw failure('invariant_violation', `${input.number} has not arrived: the main carriage is ${legStatus(main)}. Record the arrival on its leg first.`);
  const { stockLocations } = await graphql<{ stockLocations: { id: string; name: string; kind: string }[] }>(`query ($id: UUID!) { stockLocations(where: { id: { eq: $id } }, limit: 1) { id name kind } }`, { id: input.locationId });
  const location = stockLocations[0];
  if (!location) throw failure('not_found', 'That stock location does not exist.');
  if (location.kind !== 'physical') throw failure('validation', 'Goods are received into a warehouse.', { locationId: 'Choose a warehouse' });

  const receivedOn = input.receivedOn ?? today();
  const number = await allocateNumber('RCV');
  const { receipt_insert } = await graphql<{ receipt_insert: { id: string } }>(
    `mutation ($number: String!, $shipmentId: UUID!, $locationId: UUID!, $on: Date!, $uid: String!, $note: String) { receipt_insert(data: { number: $number, shipmentId: $shipmentId, locationId: $locationId, receivedOn: $on, receivedByUid: $uid, note: $note }) }`,
    { number, shipmentId: shipment.id, locationId: location.id, on: receivedOn, uid: caller.uid, note: input.note ?? null },
  );
  const checks: { shipmentLineId: string; lotNumber: string; expected: string; received: string }[] = [];
  let totalReceived = 0n;
  let rollsReceived = 0;
  for (const entry of input.lines) {
    const line = shipment.shipmentLines_on_shipment.find((candidate) => candidate.id === entry.shipmentLineId);
    if (!line) throw failure('validation', 'A line that is not on this shipment.', { lines: entry.shipmentLineId });
    const lot = line.lot;
    // The rolls of this lot that travelled on this shipment.
    const travelling = lot.rolls_on_lot.filter((roll) => roll.handlingUnitContents_on_roll.some((content) => content.handlingUnit.shipment?.number === shipment.number));
    let received = 0n;
    let rolls = 0;
    if (lot.sku.rollTracking && travelling.length > 0) {
      const chosen = entry.rollNumbers ? travelling.filter((roll) => entry.rollNumbers!.includes(roll.number)) : travelling;
      const unknown = (entry.rollNumbers ?? []).filter((candidate) => !travelling.some((roll) => roll.number === candidate));
      if (unknown.length > 0) throw failure('validation', `${unknown.join(', ')} did not travel on ${shipment.number}.`, { lines: lot.number });
      for (const roll of chosen) {
        await record({ skuCode: lot.sku.code, lotId: lot.id, rollId: roll.id, quantity: BigInt(roll.measuredLength), fromId: null, toId: location.id, reason: 'receipt', sourceType: 'receipt', sourceId: number, note: null }, caller.uid);
        received += BigInt(roll.measuredLength);
        rolls += 1;
      }
    } else {
      const quantity = BigInt(entry.receivedQuantity ?? line.quantity);
      if (quantity < 0n) throw failure('validation', 'A received quantity is zero or more.', { lines: lot.number });
      if (quantity > 0n) await record({ skuCode: lot.sku.code, lotId: lot.id, rollId: null, quantity, fromId: null, toId: location.id, reason: 'receipt', sourceType: 'receipt', sourceId: number, note: null }, caller.uid);
      received = quantity;
    }
    await graphql(
      `mutation ($receiptId: UUID!, $lineId: UUID!, $lotId: UUID!, $expected: Int64!, $received: Int64!, $rollsExpected: Int!, $rollsReceived: Int!, $note: String) {
        receiptLine_insert(data: { receiptId: $receiptId, shipmentLineId: $lineId, lotId: $lotId, expectedQuantity: $expected, receivedQuantity: $received, rollsExpected: $rollsExpected, rollsReceived: $rollsReceived, note: $note }) }`,
      { receiptId: receipt_insert.id, lineId: line.id, lotId: lot.id, expected: line.quantity, received: received.toString(), rollsExpected: travelling.length, rollsReceived: rolls, note: entry.note ?? null },
    );
    checks.push({ shipmentLineId: line.id, lotNumber: lot.number, expected: line.quantity, received: received.toString() });
    totalReceived += received;
    rollsReceived += rolls;
  }
  const discrepancies = receiptCheck(checks).filter((check) => check.short || check.over);
  // Every line received at least once closes the shipment.
  const receivedLineIds = new Set<string>();
  const { receiptLines } = await graphql<{ receiptLines: { shipmentLine: { id: string } }[] }>(`query ($shipmentId: UUID!) { receiptLines(where: { receipt: { shipmentId: { eq: $shipmentId } } }, limit: 1000) { shipmentLine { id } } }`, { shipmentId: shipment.id });
  for (const line of receiptLines) receivedLineIds.add(line.shipmentLine.id);
  const complete = shipment.shipmentLines_on_shipment.every((line) => receivedLineIds.has(line.id));
  if (complete) await graphql(`mutation ($id: UUID!) { shipment_update(id: $id, data: { state: closed, health: on_track, updatedAt_expr: "request.time" }) }`, { id: shipment.id });

  const summary = `${number}: ${metres(totalReceived)}${rollsReceived ? `, ${rollsReceived} rolls` : ''} into ${location.name}${discrepancies.length > 0 ? `; ${discrepancies.length} line${discrepancies.length === 1 ? '' : 's'} off count` : ''}${complete ? '; shipment closed' : ''}`;
  await audit(caller.uid, 'shipment.receive', 'shipment', shipment.number, { state: shipment.state }, { receipt: number, location: location.name, received: totalReceived.toString(), rolls: rollsReceived, discrepancies: discrepancies.map((check) => `${check.lotNumber} ${check.difference}`), closed: complete });
  await emit('shipment.received', 'shipment', shipment.number, { receipt: number, discrepancies: discrepancies.length, closed: complete });
  await timeline('shipment', shipment.number, 'received', caller.uid, summary);
  for (const check of checks) {
    const off = discrepancies.find((candidate) => candidate.lotNumber === check.lotNumber);
    await timeline('lot', check.lotNumber, 'received', caller.uid, `${number}: ${metres(BigInt(check.received))} received into ${location.name}${off ? ` (${off.difference.startsWith('-') ? 'short' : 'over'} by ${metres(BigInt(off.difference.replace('-', '')))})` : ''}`);
  }
  return { number, receipt: number, received: totalReceived.toString(), rolls: rollsReceived, discrepancies: discrepancies.length, closed: complete };
});

// ---------------------------------------------------------------- manual movements

const movementInput = z.object({
  kind: z.enum(['transfer', 'adjust', 'sample_cut', 'scrap', 'return']),
  lotNumber: z.string().regex(/^LOT-\d{2}-\d{4}$/),
  rollNumber: z.string().optional(),
  quantity: int64.optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  note: z.string().min(2).max(1000),
});

/**
 * A transfer between places, a cut for samples, scrap, a return, or an
 * adjustment against the virtual adjustment place. A balance never goes
 * below zero; a roll moves whole unless a cut is taken from it.
 */
export const recordStockMovement = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, STOCK, 'Moving stock');
  const parsed = movementInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const { lots } = await graphql<{ lots: { id: string; number: string; sku: { code: string }; rolls_on_lot: { id: string; number: string; measuredLength: string; remainingLength: string | null; stockLocation: { id: string; name: string } | null }[] }[] }>(
    `query ($number: String!) { lots(where: { number: { eq: $number } }, limit: 1) { id number sku { code } rolls_on_lot { id number measuredLength remainingLength stockLocation { id name } } } }`,
    { number: input.lotNumber },
  );
  const lot = lots[0];
  if (!lot) throw failure('not_found', `No lot ${input.lotNumber}.`);
  const roll = input.rollNumber ? lot.rolls_on_lot.find((candidate) => candidate.number === input.rollNumber) : null;
  if (input.rollNumber && !roll) throw failure('validation', `${input.rollNumber} is not a roll of ${lot.number}.`, { rollNumber: 'Not on this lot' });

  let fromId: string | null = input.fromLocationId ?? roll?.stockLocation?.id ?? null;
  let toId: string | null = input.toLocationId ?? null;
  let quantity: bigint;
  const rollLeft = roll ? BigInt(roll.remainingLength ?? roll.measuredLength) : 0n;
  switch (input.kind) {
    case 'transfer':
      if (!fromId || !toId) throw failure('validation', 'A transfer has a place from and a place to.', { toLocationId: 'Choose both' });
      if (fromId === toId) throw failure('validation', 'From and to are the same place.', { toLocationId: 'Choose another place' });
      quantity = roll ? rollLeft : BigInt(input.quantity ?? '0');
      break;
    case 'sample_cut':
      if (!fromId) throw failure('validation', 'Where the cut is taken from.', { fromLocationId: 'Choose a place' });
      toId = await virtualLocation('samples');
      quantity = BigInt(input.quantity ?? '0');
      if (roll && quantity > rollLeft) throw failure('invariant_violation', `${roll.number} has ${metres(rollLeft)} left.`);
      break;
    case 'scrap':
      if (!fromId) throw failure('validation', 'Where the scrap is taken from.', { fromLocationId: 'Choose a place' });
      toId = await virtualLocation('scrap');
      quantity = roll ? (input.quantity ? BigInt(input.quantity) : rollLeft) : BigInt(input.quantity ?? '0');
      break;
    case 'return':
      if (!toId) throw failure('validation', 'Where the return goes.', { toLocationId: 'Choose a warehouse' });
      fromId = fromId ?? (await virtualLocation('customer'));
      quantity = roll ? rollLeft : BigInt(input.quantity ?? '0');
      break;
    case 'adjust': {
      // A positive quantity adds to the place, a negative one takes from it; the adjustment place balances.
      const signed = BigInt(input.quantity ?? '0');
      const place = input.toLocationId ?? input.fromLocationId;
      if (!place) throw failure('validation', 'Which place is adjusted.', { toLocationId: 'Choose a place' });
      const adjustment = await virtualLocation('adjustment');
      if (signed >= 0n) {
        fromId = adjustment;
        toId = place;
        quantity = signed;
      } else {
        fromId = place;
        toId = adjustment;
        quantity = -signed;
      }
      break;
    }
  }
  if (quantity <= 0n) throw failure('validation', 'A quantity is more than zero.', { quantity: 'More than zero' });
  if (fromId) {
    const { stockLocations } = await graphql<{ stockLocations: { kind: string }[] }>(`query ($id: UUID!) { stockLocations(where: { id: { eq: $id } }, limit: 1) { kind } }`, { id: fromId });
    if (stockLocations[0]?.kind !== 'adjustment') {
      const have = await balanceOf(lot.id, fromId);
      if (have < quantity) throw failure('invariant_violation', `Only ${metres(have)} of ${lot.number} is at that place.`);
    }
  }
  await record({ skuCode: lot.sku.code, lotId: lot.id, rollId: roll?.id ?? null, quantity, fromId, toId, reason: input.kind, sourceType: 'manual', sourceId: null, note: input.note }, caller.uid);
  const words = { transfer: 'Transferred', adjust: 'Adjusted', sample_cut: 'Cut for samples', scrap: 'Scrapped', return: 'Returned' }[input.kind];
  const summary = `${words}: ${metres(quantity)} of ${lot.number}${roll ? ` (${roll.number})` : ''}; ${input.note}`;
  await audit(caller.uid, `stock.${input.kind}`, 'lot', lot.number, null, { roll: roll?.number ?? null, quantity: quantity.toString(), fromId, toId, note: input.note });
  await emit('stock.moved', 'lot', lot.number, { kind: input.kind, quantity: quantity.toString() });
  await timeline('lot', lot.number, 'stock', caller.uid, summary);
  return { lotNumber: lot.number, quantity: quantity.toString(), fromId, toId };
});

// ---------------------------------------------------------------- reorder

const reorderInput = z.object({ skuCode: z.string().min(1), locationId: z.string().nullable().optional(), reorderPoint: int64, targetLevel: int64 });

export const setReorderPolicy = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations', 'purchasing'], 'Setting reorder points');
  const parsed = reorderInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (BigInt(input.targetLevel) < BigInt(input.reorderPoint)) throw failure('validation', 'The target is at or above the reorder point.', { targetLevel: 'At least the reorder point' });
  const { reorderPolicies } = await graphql<{ reorderPolicies: { id: string }[] }>(`query ($sku: String!) { reorderPolicies(where: { skuCode: { eq: $sku } }, limit: 1) { id } }`, { sku: input.skuCode });
  if (reorderPolicies[0]) {
    await graphql(`mutation ($id: UUID!, $locationId: UUID, $point: Int64!, $target: Int64!) { reorderPolicy_update(id: $id, data: { locationId: $locationId, reorderPoint: $point, targetLevel: $target, updatedAt_expr: "request.time" }) }`, { id: reorderPolicies[0].id, locationId: input.locationId ?? null, point: input.reorderPoint, target: input.targetLevel });
  } else {
    await graphql(`mutation ($sku: String!, $locationId: UUID, $point: Int64!, $target: Int64!) { reorderPolicy_insert(data: { skuCode: $sku, locationId: $locationId, reorderPoint: $point, targetLevel: $target }) }`, { sku: input.skuCode, locationId: input.locationId ?? null, point: input.reorderPoint, target: input.targetLevel });
  }
  await audit(caller.uid, 'reorder.set', 'sku', input.skuCode, null, { reorderPoint: input.reorderPoint, targetLevel: input.targetLevel });
  return { skuCode: input.skuCode };
});
