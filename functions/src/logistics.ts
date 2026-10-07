import { LEG_TYPE_LABEL, defaultLegs, legStatus, overShipment, shipmentDates, shipmentHealth, shipmentStage, type LegFacts, type LocalDate, type TransportMode } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { allocateNumber, timeline } from './manufacturing';

// Logistics commands: a shipment is opened with its legs, packages are
// assigned to it (its lines follow from their contents), it is booked, its
// legs record what happened, and its health is derived from those dates.
// Nothing here lets anyone type a stage in.

const LOGISTICS = ['owner', 'operations', 'logistics'] as const;
const today = () => new Date().toISOString().slice(0, 10) as LocalDate;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');
const shipmentNumber = z.string().regex(/^SHP-\d{2}-\d{4}$/);

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

const metres = (stored: bigint) => `${(Number(stored) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })} m`;

// ---------------------------------------------------------------- loading

interface LegRow extends LegFacts {
  id: string;
  mode: TransportMode;
  fromLocation: { name: string; city: string | null } | null;
  toLocation: { name: string; city: string | null } | null;
}

interface ShipmentRow {
  id: string;
  number: string;
  flow: string;
  mode: TransportMode;
  state: 'draft' | 'booked' | 'closed' | 'cancelled';
  health: string;
  origin: { id: string; name: string };
  destination: { id: string; name: string; country: { code: string } | null };
  shipmentLegs_on_shipment: LegRow[];
  handlingUnits_on_shipment: { id: string; number: string }[];
  shipmentLines_on_shipment: { id: string; purchaseOrderLine: { id: string; purchaseOrder: { number: string } } }[];
  customsEntries_on_shipment: { state: string }[];
}

export async function loadShipment(number: string): Promise<ShipmentRow> {
  const { shipments } = await graphql<{ shipments: ShipmentRow[] }>(
    `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) {
       id number flow mode state health origin { id name } destination { id name country { code } }
       shipmentLegs_on_shipment(orderBy: { sequence: ASC }) { id type sequence mode plannedEtd plannedEta etd eta atd ata fromLocation { name city } toLocation { name city } }
       handlingUnits_on_shipment { id number }
       shipmentLines_on_shipment { id purchaseOrderLine { id purchaseOrder { number } } }
       customsEntries_on_shipment { state } } }`,
    { number },
  );
  const shipment = shipments[0];
  if (!shipment) throw failure('not_found', `No shipment ${number}.`);
  return shipment;
}

const departed = (shipment: ShipmentRow) => shipment.shipmentLegs_on_shipment.some((leg) => legStatus(leg) !== 'pending');

/** Writes the health the legs imply; returns what the shipment now looks like. */
export async function deriveShipment(shipment: ShipmentRow, legs: readonly LegFacts[]): Promise<{ health: string; stage: string }> {
  const health = shipmentHealth(shipment.state, legs, today(), shipment.customsEntries_on_shipment.some((entry) => entry.state === 'held'));
  const stage = shipmentStage(shipment.state, legs);
  if (health !== shipment.health) {
    await graphql(`mutation ($id: UUID!, $health: Health!) { shipment_update(id: $id, data: { health: $health, updatedAt_expr: "request.time" }) }`, { id: shipment.id, health });
  }
  return { health, stage };
}

// ---------------------------------------------------------------- open

const legInput = z.object({
  type: z.enum(['pickup', 'consolidation', 'export_handling', 'main_carriage', 'customs', 'local_delivery']),
  mode: z.enum(['sea', 'air', 'courier', 'road']).optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  providerId: z.string().optional(),
  plannedEtd: date,
  plannedEta: date,
});

const createInput = z.object({
  flow: z.enum(['inbound', 'outbound', 'direct', 'transfer']),
  mode: z.enum(['sea', 'air', 'courier', 'road']),
  loadType: z.enum(['fcl', 'lcl', 'none']),
  incotermCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  namedPlace: z.string().max(120).optional(),
  originId: z.string().min(1),
  destinationId: z.string().min(1),
  forwarderId: z.string().optional(),
  consigneeName: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
  /** The departure the usual legs are laid out from, when no legs are given. */
  departure: date.optional(),
  legs: z.array(legInput).max(20).default([]),
});

export const createShipment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Opening shipments');
  const parsed = createInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  if (input.originId === input.destinationId) throw failure('validation', 'Origin and destination are the same place.', { destinationId: 'Choose another place' });

  const { locations } = await graphql<{ locations: { id: string; name: string }[] }>(`query ($ids: [UUID!]!) { locations(where: { id: { in: $ids } }) { id name } }`, { ids: [input.originId, input.destinationId] });
  const origin = locations.find((location) => location.id === input.originId);
  const destination = locations.find((location) => location.id === input.destinationId);
  if (!origin) throw failure('not_found', 'The origin is not a known place.');
  if (!destination) throw failure('not_found', 'The destination is not a known place.');

  const legs = input.legs.length > 0 ? input.legs : input.departure ? defaultLegs(input.mode, input.departure as LocalDate).map((leg) => ({ ...leg, mode: undefined, fromLocationId: undefined, toLocationId: undefined, providerId: undefined })) : [];
  for (const [index, leg] of legs.entries()) {
    if (leg.plannedEta < leg.plannedEtd) throw failure('validation', `Leg ${index + 1} arrives before it departs.`, { legs: String(index) });
  }

  const number = await allocateNumber('SHP');
  const { shipment_insert } = await graphql<{ shipment_insert: { id: string } }>(
    `mutation ($number: String!, $flow: ShipmentFlow!, $mode: TransportMode!, $loadType: LoadType!, $incoterm: String, $namedPlace: String, $originId: UUID!, $destinationId: UUID!, $forwarderId: UUID, $consigneeName: String, $notes: String, $uid: String!) {
      shipment_insert(data: { number: $number, flow: $flow, mode: $mode, loadType: $loadType, incotermCode: $incoterm, namedPlace: $namedPlace, originId: $originId, destinationId: $destinationId, forwarderId: $forwarderId, consigneeName: $consigneeName, state: draft, health: on_track, notes: $notes, createdByUid: $uid }) }`,
    { number, flow: input.flow, mode: input.mode, loadType: input.loadType, incoterm: input.incotermCode ?? null, namedPlace: input.namedPlace ?? null, originId: input.originId, destinationId: input.destinationId, forwarderId: input.forwarderId ?? null, consigneeName: input.consigneeName ?? null, notes: input.notes ?? null, uid: caller.uid },
  );
  for (const [index, leg] of legs.entries()) {
    // The first leg leaves the origin and the last reaches the destination unless told otherwise.
    const fromId = leg.fromLocationId ?? (index === 0 || leg.type === 'main_carriage' ? input.originId : null);
    const toId = leg.toLocationId ?? (index === legs.length - 1 ? input.destinationId : null);
    await graphql(
      `mutation ($shipmentId: UUID!, $sequence: Int!, $type: LegType!, $mode: TransportMode!, $fromId: UUID, $toId: UUID, $providerId: UUID, $etd: Date!, $eta: Date!) {
        shipmentLeg_insert(data: { shipmentId: $shipmentId, sequence: $sequence, type: $type, mode: $mode, fromLocationId: $fromId, toLocationId: $toId, providerId: $providerId, plannedEtd: $etd, plannedEta: $eta }) }`,
      { shipmentId: shipment_insert.id, sequence: index + 1, type: leg.type, mode: leg.mode ?? (leg.type === 'main_carriage' ? input.mode : leg.type === 'customs' ? input.mode : 'road'), fromId, toId, providerId: leg.providerId ?? null, etd: leg.plannedEtd, eta: leg.plannedEta },
    );
  }
  await audit(caller.uid, 'shipment.create', 'shipment', number, null, { flow: input.flow, mode: input.mode, loadType: input.loadType, origin: origin.name, destination: destination.name, legs: legs.length });
  await emit('shipment.created', 'shipment', number, { mode: input.mode, origin: origin.name, destination: destination.name });
  await timeline('shipment', number, 'created', caller.uid, `${input.mode === 'sea' ? `Sea ${input.loadType.toUpperCase()}` : input.mode[0]!.toUpperCase() + input.mode.slice(1)} from ${origin.name} to ${destination.name}, ${legs.length} legs`);
  return { number, id: shipment_insert.id, legs: legs.length };
});

const detailsInput = z.object({
  number: shipmentNumber,
  incotermCode: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  namedPlace: z.string().max(120).nullable().optional(),
  forwarderId: z.string().nullable().optional(),
  consigneeName: z.string().max(200).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  references: z.array(z.object({ type: z.enum(['booking', 'mbl', 'hbl', 'awb', 'container', 'seal', 'tracking']), value: z.string().min(1).max(120) })).max(50).optional(),
});

/** Commercial details and references; the references given replace the ones on file. */
export const updateShipment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Editing shipments');
  const parsed = detailsInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (shipment.state === 'cancelled' || shipment.state === 'closed') throw failure('invariant_violation', `${input.number} is ${shipment.state} and cannot change.`);
  const data: Record<string, unknown> = {};
  if (input.incotermCode !== undefined) data['incotermCode'] = input.incotermCode;
  if (input.namedPlace !== undefined) data['namedPlace'] = input.namedPlace;
  if (input.forwarderId !== undefined) data['forwarderId'] = input.forwarderId;
  if (input.consigneeName !== undefined) data['consigneeName'] = input.consigneeName;
  if (input.notes !== undefined) data['notes'] = input.notes;
  if (Object.keys(data).length > 0) {
    await graphql(
      `mutation ($id: UUID!, $incoterm: String, $namedPlace: String, $forwarderId: UUID, $consigneeName: String, $notes: String) {
        shipment_update(id: $id, data: { ${input.incotermCode !== undefined ? 'incotermCode: $incoterm,' : ''} ${input.namedPlace !== undefined ? 'namedPlace: $namedPlace,' : ''} ${input.forwarderId !== undefined ? 'forwarderId: $forwarderId,' : ''} ${input.consigneeName !== undefined ? 'consigneeName: $consigneeName,' : ''} ${input.notes !== undefined ? 'notes: $notes,' : ''} updatedAt_expr: "request.time" }) }`,
      { id: shipment.id, incoterm: input.incotermCode ?? null, namedPlace: input.namedPlace ?? null, forwarderId: input.forwarderId ?? null, consigneeName: input.consigneeName ?? null, notes: input.notes ?? null },
    );
  }
  if (input.references) {
    await graphql(`mutation ($id: UUID!) { shipmentReference_deleteMany(where: { shipmentId: { eq: $id } }) }`, { id: shipment.id });
    for (const reference of input.references) {
      await graphql(`mutation ($id: UUID!, $type: ReferenceType!, $value: String!) { shipmentReference_insert(data: { shipmentId: $id, type: $type, value: $value }) }`, { id: shipment.id, type: reference.type, value: reference.value.trim() });
    }
  }
  await audit(caller.uid, 'shipment.update', 'shipment', input.number, null, { ...data, references: input.references?.length });
  if (input.references) await timeline('shipment', input.number, 'updated', caller.uid, `References: ${input.references.map((reference) => `${reference.type.toUpperCase()} ${reference.value}`).join(', ') || 'none'}`);
  return { number: input.number };
});

// ---------------------------------------------------------------- contents

interface UnitRow {
  id: string;
  number: string;
  kind: string;
  shipment: { number: string } | null;
  parent: { id: string; number: string } | null;
  handlingUnits_on_parent: { id: string; number: string; shipment: { number: string } | null }[];
  handlingUnitContents_on_handlingUnit: {
    quantity: string | null;
    roll: { measuredLength: string; lot: LotRef } | null;
    lot: LotRef | null;
  }[];
}

interface PoLineRef {
  id: string;
  quantity: string;
  uom: string;
  overTolerancePercent: number | null;
  sku: { code: string };
}

interface LotRef {
  id: string;
  number: string;
  qualityState: string;
  sku: { code: string };
  run: { id: string };
}

// Postgres truncates identifiers at 63 characters, and Data Connect builds
// its aliases from the path, so a lot's purchase-order line is fetched in a
// second, shallower query rather than through roll → lot → run → line.
const poLinesByRun = new Map<string, PoLineRef[]>();

async function loadUnits(numbers: readonly string[]): Promise<UnitRow[]> {
  if (numbers.length === 0) return [];
  const { handlingUnits } = await graphql<{ handlingUnits: UnitRow[] }>(
    `query ($numbers: [String!]!) { handlingUnits(where: { number: { in: $numbers } }) {
       id number kind shipment { number } parent { id number } handlingUnits_on_parent { id number shipment { number } }
       handlingUnitContents_on_handlingUnit { quantity
         roll { measuredLength lot { id number qualityState sku { code } run { id } } }
         lot { id number qualityState sku { code } run { id } } } } }`,
    { numbers },
  );
  const runIds = [...new Set(handlingUnits.flatMap((unit) => unit.handlingUnitContents_on_handlingUnit.map((content) => (content.roll?.lot ?? content.lot)?.run.id)).filter((id): id is string => Boolean(id) && !poLinesByRun.has(id!)))];
  if (runIds.length > 0) {
    const { productionRunLines } = await graphql<{ productionRunLines: { run: { id: string }; purchaseOrderLine: PoLineRef }[] }>(
      `query ($ids: [UUID!]!) { productionRunLines(where: { runId: { in: $ids } }) { run { id } purchaseOrderLine { id quantity uom overTolerancePercent sku { code } } } }`,
      { ids: runIds },
    );
    for (const id of runIds) poLinesByRun.set(id, productionRunLines.filter((line) => line.run.id === id).map((line) => line.purchaseOrderLine));
  }
  return handlingUnits;
}

/** What a package holds, by purchase-order line and lot. */
function contentsOf(unit: UnitRow): { lot: LotRef; line: PoLineRef; quantity: bigint }[] {
  const out: { lot: LotRef; line: PoLineRef; quantity: bigint }[] = [];
  for (const content of unit.handlingUnitContents_on_handlingUnit) {
    const lot = content.roll?.lot ?? content.lot;
    if (!lot) continue;
    const line = (poLinesByRun.get(lot.run.id) ?? []).find((candidate) => candidate.sku.code === lot.sku.code);
    if (!line) throw failure('invariant_violation', `${lot.number} has no purchase-order line for ${lot.sku.code}.`);
    out.push({ lot, line, quantity: BigInt(content.roll ? content.roll.measuredLength : (content.quantity ?? '0')) });
  }
  return out;
}

/** Rewrites the shipment's lines from the packages assigned to it. */
async function rebuildLines(shipment: ShipmentRow): Promise<{ lines: number; metres: bigint }> {
  const { handlingUnits } = await graphql<{ handlingUnits: { number: string }[] }>(`query ($id: UUID!) { handlingUnits(where: { shipmentId: { eq: $id } }) { number } }`, { id: shipment.id });
  const units = await loadUnits(handlingUnits.map((unit) => unit.number));
  const totals = new Map<string, { lotId: string; lineId: string; uom: string; quantity: bigint }>();
  for (const unit of units) {
    for (const content of contentsOf(unit)) {
      const key = `${content.line.id}:${content.lot.id}`;
      const current = totals.get(key) ?? { lotId: content.lot.id, lineId: content.line.id, uom: content.line.uom, quantity: 0n };
      current.quantity += content.quantity;
      totals.set(key, current);
    }
  }
  await graphql(`mutation ($id: UUID!) { shipmentLine_deleteMany(where: { shipmentId: { eq: $id } }) }`, { id: shipment.id });
  let metres = 0n;
  for (const line of totals.values()) {
    metres += line.quantity;
    await graphql(`mutation ($shipmentId: UUID!, $lineId: UUID!, $lotId: UUID!, $quantity: Int64!, $uom: String!) { shipmentLine_insert(data: { shipmentId: $shipmentId, purchaseOrderLineId: $lineId, lotId: $lotId, quantity: $quantity, uom: $uom }) }`, {
      shipmentId: shipment.id,
      lineId: line.lineId,
      lotId: line.lotId,
      quantity: line.quantity.toString(),
      uom: line.uom,
    });
  }
  return { lines: totals.size, metres };
}

const unitsInput = z.object({ number: shipmentNumber, unitNumbers: z.array(z.string().regex(/^(CTN|PLT)-\d{2}-\d{4}$/)).min(1).max(500) });

/**
 * Packages go on a shipment whole. Only released lots travel; a line never
 * exceeds its purchase-order quantity and tolerance across every shipment;
 * a pallet brings its cartons with it.
 */
export const assignHandlingUnits = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Loading shipments');
  const parsed = unitsInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (shipment.state !== 'draft' && shipment.state !== 'booked') throw failure('invariant_violation', `${input.number} is ${shipment.state}; nothing can be added.`);
  if (departed(shipment)) throw failure('invariant_violation', `${input.number} has left; its contents are fixed.`);

  const units = await loadUnits(input.unitNumbers);
  const missing = input.unitNumbers.filter((number) => !units.some((unit) => unit.number === number));
  if (missing.length > 0) throw failure('not_found', `No package ${missing.join(', ')}.`);
  const adding = new Map<string, bigint>();
  const toAssign: UnitRow[] = [];
  for (const unit of units) {
    if (unit.kind !== 'carton' && unit.kind !== 'pallet') throw failure('validation', `${unit.number} is a ${unit.kind}; cartons and pallets travel.`);
    if (unit.shipment && unit.shipment.number !== input.number) throw failure('invariant_violation', `${unit.number} is already on ${unit.shipment.number}.`);
    if (unit.parent && !input.unitNumbers.includes(unit.parent.number)) {
      const { handlingUnits } = await graphql<{ handlingUnits: { shipment: { number: string } | null }[] }>(`query ($id: UUID!) { handlingUnits(where: { id: { eq: $id } }, limit: 1) { shipment { number } } }`, { id: unit.parent.id });
      if (handlingUnits[0]?.shipment && handlingUnits[0].shipment.number !== input.number) throw failure('invariant_violation', `${unit.number} sits on ${unit.parent.number}, which is on ${handlingUnits[0].shipment.number}.`);
    }
    if (unit.shipment) continue;
    const contents = contentsOf(unit);
    if (contents.length === 0) throw failure('invariant_violation', `${unit.number} is empty.`);
    for (const content of contents) {
      if (content.lot.qualityState !== 'released') throw failure('invariant_violation', `${content.lot.number} in ${unit.number} is not released; only released lots ship.`, { unitNumbers: unit.number });
      adding.set(content.line.id, (adding.get(content.line.id) ?? 0n) + content.quantity);
    }
    toAssign.push(unit);
  }
  // Over-shipment across every shipment that carries the line.
  for (const [lineId, quantity] of adding) {
    const { shipmentLines } = await graphql<{ shipmentLines: { quantity: string; shipment: { number: string; state: string } }[] }>(
      `query ($lineId: UUID!) { shipmentLines(where: { purchaseOrderLineId: { eq: $lineId } }) { quantity shipment { number state } } }`,
      { lineId },
    );
    const elsewhere = shipmentLines.filter((line) => line.shipment.state !== 'cancelled' && line.shipment.number !== input.number).reduce((sum, line) => sum + BigInt(line.quantity), 0n);
    const onThis = shipmentLines.filter((line) => line.shipment.number === input.number).reduce((sum, line) => sum + BigInt(line.quantity), 0n);
    const line = units.flatMap(contentsOf).find((content) => content.line.id === lineId)!.line;
    const excess = overShipment(line.quantity, line.overTolerancePercent, (elsewhere + onThis).toString(), quantity.toString());
    if (excess !== '0') throw failure('invariant_violation', `This would ship ${metres(BigInt(excess))} more than the purchase-order line and its tolerance allow.`);
  }

  for (const unit of toAssign) {
    await graphql(`mutation ($id: UUID!, $shipmentId: UUID!) { handlingUnit_update(id: $id, data: { shipmentId: $shipmentId }) }`, { id: unit.id, shipmentId: shipment.id });
    for (const child of unit.handlingUnits_on_parent) {
      if (!child.shipment) await graphql(`mutation ($id: UUID!, $shipmentId: UUID!) { handlingUnit_update(id: $id, data: { shipmentId: $shipmentId }) }`, { id: child.id, shipmentId: shipment.id });
    }
  }
  if (toAssign.length === 0) {
    const current = await rebuildLines(shipment);
    return { number: input.number, assigned: 0, lines: current.lines, metres: current.metres.toString() };
  }
  const { lines, metres: total } = await rebuildLines(shipment);
  const summary = `${toAssign.length} package${toAssign.length === 1 ? '' : 's'} loaded: ${toAssign.map((unit) => unit.number).join(', ')}`;
  await audit(caller.uid, 'shipment.assign_units', 'shipment', input.number, null, { units: toAssign.map((unit) => unit.number), lines, metres: total.toString() });
  await emit('shipment.contents_changed', 'shipment', input.number, { units: toAssign.map((unit) => unit.number) });
  await timeline('shipment', input.number, 'loaded', caller.uid, summary);
  const lots = [...new Set(toAssign.flatMap(contentsOf).map((content) => content.lot.number))];
  for (const lot of lots) await timeline('lot', lot, 'shipped', caller.uid, `On ${input.number}: ${toAssign.filter((unit) => contentsOf(unit).some((content) => content.lot.number === lot)).map((unit) => unit.number).join(', ')}`);
  return { number: input.number, assigned: toAssign.length, lines, metres: total.toString() };
});

export const removeHandlingUnits = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Unloading shipments');
  const parsed = unitsInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (departed(shipment)) throw failure('invariant_violation', `${input.number} has left; its contents are fixed.`);
  const units = await loadUnits(input.unitNumbers);
  const removing = units.filter((unit) => unit.shipment?.number === input.number);
  for (const unit of removing) {
    await graphql(`mutation ($id: UUID!) { handlingUnit_update(id: $id, data: { shipmentId: null }) }`, { id: unit.id });
    for (const child of unit.handlingUnits_on_parent) {
      if (child.shipment?.number === input.number) await graphql(`mutation ($id: UUID!) { handlingUnit_update(id: $id, data: { shipmentId: null }) }`, { id: child.id });
    }
  }
  const { lines, metres: total } = await rebuildLines(shipment);
  await audit(caller.uid, 'shipment.remove_units', 'shipment', input.number, null, { units: removing.map((unit) => unit.number), lines });
  await timeline('shipment', input.number, 'unloaded', caller.uid, `${removing.length} package${removing.length === 1 ? '' : 's'} taken off: ${removing.map((unit) => unit.number).join(', ')}`);
  return { number: input.number, removed: removing.length, lines, metres: total.toString() };
});

// ---------------------------------------------------------------- lifecycle

const numberInput = z.object({ number: shipmentNumber, reason: z.string().max(500).optional() });

/** Draft to booked: the legs are a commitment from here; the balance payments on its orders fall due before it leaves. */
export const bookShipment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Booking shipments');
  const parsed = numberInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const shipment = await loadShipment(parsed.data.number);
  if (shipment.state !== 'draft') throw failure('invariant_violation', `${shipment.number} is ${shipment.state}; only a draft is booked.`);
  if (shipment.shipmentLegs_on_shipment.length === 0) throw failure('invariant_violation', 'Add the legs before booking.');
  if (shipment.handlingUnits_on_shipment.length === 0) throw failure('invariant_violation', 'Nothing is loaded. Assign the packages before booking.');
  const bookedOn = today();
  await graphql(`mutation ($id: UUID!, $on: Date!) { shipment_update(id: $id, data: { state: booked, bookedOn: $on, updatedAt_expr: "request.time" }) }`, { id: shipment.id, on: bookedOn });
  const derived = await deriveShipment({ ...shipment, state: 'booked' }, shipment.shipmentLegs_on_shipment);
  const { etd } = shipmentDates(shipment.shipmentLegs_on_shipment);
  // Payments that fall due before shipment now have a date: the departure.
  const orders = [...new Set(shipment.shipmentLines_on_shipment.map((line) => line.purchaseOrderLine.purchaseOrder.number))];
  let dated = 0;
  if (etd) {
    for (const po of orders) {
      const { paymentMilestones } = await graphql<{ paymentMilestones: { id: string; label: string }[] }>(
        `query ($number: String!) { paymentMilestones(where: { purchaseOrder: { number: { eq: $number } }, trigger: { eq: "before_shipment" }, dueOn: { isNull: true }, paidOn: { isNull: true } }) { id label } }`,
        { number: po },
      );
      for (const payment of paymentMilestones) {
        await graphql(`mutation ($id: UUID!, $on: Date!) { paymentMilestone_update(id: $id, data: { dueOn: $on }) }`, { id: payment.id, on: etd });
        await timeline('purchase_order', po, 'payment_due', caller.uid, `${payment.label} falls due ${etd}: ${shipment.number} departs`);
        dated += 1;
      }
    }
  }
  await audit(caller.uid, 'shipment.book', 'shipment', shipment.number, { state: 'draft' }, { state: 'booked', bookedOn, health: derived.health });
  await emit('shipment.booked', 'shipment', shipment.number, { bookedOn, etd, orders });
  await timeline('shipment', shipment.number, 'status_changed', caller.uid, `Booked${etd ? `, departing ${etd}` : ''}; carries ${orders.join(', ')}`);
  for (const po of orders) await timeline('purchase_order', po, 'shipment_booked', caller.uid, `${shipment.number} booked${etd ? `, departing ${etd}` : ''}`);
  return { number: shipment.number, state: 'booked', health: derived.health, paymentsDated: dated };
});

export const cancelShipment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Cancelling shipments');
  const parsed = numberInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const shipment = await loadShipment(parsed.data.number);
  if (shipment.state === 'cancelled' || shipment.state === 'closed') throw failure('invariant_violation', `${shipment.number} is already ${shipment.state}.`);
  if (departed(shipment)) throw failure('invariant_violation', `${shipment.number} has left; it cannot be cancelled.`);
  for (const unit of shipment.handlingUnits_on_shipment) {
    await graphql(`mutation ($id: UUID!) { handlingUnit_update(id: $id, data: { shipmentId: null }) }`, { id: unit.id });
  }
  await graphql(`mutation ($id: UUID!) { shipmentLine_deleteMany(where: { shipmentId: { eq: $id } }) }`, { id: shipment.id });
  await graphql(`mutation ($id: UUID!) { shipment_update(id: $id, data: { state: cancelled, health: on_track, updatedAt_expr: "request.time" }) }`, { id: shipment.id });
  await audit(caller.uid, 'shipment.cancel', 'shipment', shipment.number, { state: shipment.state }, { state: 'cancelled', reason: parsed.data.reason ?? null });
  await emit('shipment.cancelled', 'shipment', shipment.number, { reason: parsed.data.reason ?? null });
  await timeline('shipment', shipment.number, 'status_changed', caller.uid, `Cancelled${parsed.data.reason ? `: ${parsed.data.reason}` : ''}; ${shipment.handlingUnits_on_shipment.length} packages released back to the floor`);
  return { number: shipment.number, state: 'cancelled' };
});

// ---------------------------------------------------------------- legs

const legUpdateInput = z.object({
  number: shipmentNumber,
  legId: z.string().min(1),
  etd: date.nullable().optional(),
  eta: date.nullable().optional(),
  atd: date.nullable().optional(),
  ata: date.nullable().optional(),
  vessel: z.string().max(120).nullable().optional(),
  voyage: z.string().max(80).nullable().optional(),
  providerId: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

const placeOf = (place: { name: string; city: string | null } | null) => (place ? place.city || place.name : '');

/** What happened on a leg, or what is now expected; the shipment's health follows. */
export const updateLeg = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, LOGISTICS, 'Updating legs');
  const parsed = legUpdateInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const shipment = await loadShipment(input.number);
  if (shipment.state !== 'booked') throw failure('invariant_violation', `${input.number} is ${shipment.state}; legs move on a booked shipment.`);
  const leg = shipment.shipmentLegs_on_shipment.find((candidate) => candidate.id === input.legId);
  if (!leg) throw failure('not_found', 'That leg is not on this shipment.');

  const next: LegRow = {
    ...leg,
    etd: input.etd === undefined ? leg.etd : (input.etd as LocalDate | null),
    eta: input.eta === undefined ? leg.eta : (input.eta as LocalDate | null),
    atd: input.atd === undefined ? leg.atd : (input.atd as LocalDate | null),
    ata: input.ata === undefined ? leg.ata : (input.ata as LocalDate | null),
  };
  if (next.ata && !next.atd) throw failure('validation', 'A leg arrives only after it departs.', { atd: 'Record the departure' });
  if (next.ata && next.atd && next.ata < next.atd) throw failure('validation', 'Arrival is before departure.', { ata: 'After the departure' });
  const before = shipment.shipmentLegs_on_shipment.filter((candidate) => candidate.sequence < leg.sequence);
  if (next.atd && before.some((candidate) => !candidate.ata)) throw failure('invariant_violation', `${LEG_TYPE_LABEL[leg.type]} cannot depart before the leg before it arrives.`);

  await graphql(
    `mutation ($id: UUID!, $etd: Date, $eta: Date, $atd: Date, $ata: Date, $vessel: String, $voyage: String, $providerId: UUID, $note: String) {
      shipmentLeg_update(id: $id, data: { etd: $etd, eta: $eta, atd: $atd, ata: $ata ${input.vessel !== undefined ? ', vessel: $vessel' : ''} ${input.voyage !== undefined ? ', voyage: $voyage' : ''} ${input.providerId !== undefined ? ', providerId: $providerId' : ''} ${input.note !== undefined ? ', note: $note' : ''} }) }`,
    { id: leg.id, etd: next.etd, eta: next.eta, atd: next.atd, ata: next.ata, vessel: input.vessel ?? null, voyage: input.voyage ?? null, providerId: input.providerId ?? null, note: input.note ?? null },
  );
  const legs = shipment.shipmentLegs_on_shipment.map((candidate) => (candidate.id === leg.id ? next : candidate));
  const derived = await deriveShipment(shipment, legs);

  const label = LEG_TYPE_LABEL[leg.type];
  const parts: string[] = [];
  if (next.ata && !leg.ata) parts.push(`arrived ${placeOf(leg.toLocation)} ${next.ata}`.replace(/\s+/g, ' '));
  else if (next.atd && !leg.atd) parts.push(`departed ${placeOf(leg.fromLocation)} ${next.atd}`.replace(/\s+/g, ' '));
  if (next.eta !== leg.eta && next.eta && !next.ata) parts.push(`now expected ${next.eta}${leg.plannedEta && next.eta !== leg.plannedEta ? ` (planned ${leg.plannedEta})` : ''}`);
  if (next.etd !== leg.etd && next.etd && !next.atd) parts.push(`departure now ${next.etd}`);
  if (input.vessel) parts.push(`${input.vessel}${input.voyage ? ` ${input.voyage}` : ''}`);
  const summary = `${label}: ${parts.length > 0 ? parts.join('; ') : 'updated'}${input.note ? ` — ${input.note}` : ''}`;
  await audit(caller.uid, 'shipment.leg', 'shipment', input.number, { etd: leg.etd, eta: leg.eta, atd: leg.atd, ata: leg.ata }, { etd: next.etd, eta: next.eta, atd: next.atd, ata: next.ata, health: derived.health, stage: derived.stage });
  await emit('shipment.leg_updated', 'shipment', input.number, { leg: leg.type, stage: derived.stage, health: derived.health });
  await timeline('shipment', input.number, 'leg', caller.uid, summary);
  const last = legs[legs.length - 1];
  if (last && last.id === leg.id && next.ata && !leg.ata) {
    await emit('shipment.delivered', 'shipment', input.number, { on: next.ata, destination: shipment.destination.name });
    await timeline('shipment', input.number, 'status_changed', caller.uid, `Delivered to ${shipment.destination.name} ${next.ata}`);
    for (const po of [...new Set(shipment.shipmentLines_on_shipment.map((line) => line.purchaseOrderLine.purchaseOrder.number))]) {
      await timeline('purchase_order', po, 'shipment_delivered', caller.uid, `${input.number} delivered to ${shipment.destination.name} ${next.ata}`);
    }
  }
  return { number: input.number, health: derived.health, stage: derived.stage };
});
