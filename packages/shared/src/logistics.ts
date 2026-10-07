// Logistics: a shipment is legs, lines and packages. Where it is, how far
// along, and whether it is late are read from the legs' dates; the only
// states anyone sets are the lifecycle ones (draft, booked, closed, cancelled).

import type { ShipmentStage } from './gateway';
import { addDays, daysBetween, type LocalDate } from './local-date';
import type { HandlingUnitView } from './manufacturing';
import type { Health, StatusTone } from './status';

export const SHIPMENT_FLOWS = ['inbound', 'outbound', 'direct', 'transfer'] as const;
export type ShipmentFlow = (typeof SHIPMENT_FLOWS)[number];
export const SHIPMENT_FLOW_LABEL: Record<ShipmentFlow, string> = { inbound: 'Inbound', outbound: 'Outbound', direct: 'Direct to customer', transfer: 'Transfer' };

export const TRANSPORT_MODES = ['sea', 'air', 'courier', 'road'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];
export const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = { sea: 'Sea', air: 'Air', courier: 'Courier', road: 'Road' };

export const LOAD_TYPES = ['fcl', 'lcl', 'none'] as const;
export type LoadType = (typeof LOAD_TYPES)[number];
export const LOAD_TYPE_LABEL: Record<LoadType, string> = { fcl: 'FCL', lcl: 'LCL', none: '' };

/** "Sea LCL", "Air", "Courier": the mode as it reads on a lane. */
export function modeLabel(mode: TransportMode, loadType: LoadType): string {
  const load = LOAD_TYPE_LABEL[loadType];
  return load ? `${TRANSPORT_MODE_LABEL[mode]} ${load}` : TRANSPORT_MODE_LABEL[mode];
}

export const SHIPMENT_STATES = ['draft', 'booked', 'closed', 'cancelled'] as const;
export type ShipmentState = (typeof SHIPMENT_STATES)[number];
export const SHIPMENT_STATE_LABEL: Record<ShipmentState, string> = { draft: 'Draft', booked: 'Booked', closed: 'Closed', cancelled: 'Cancelled' };
export const SHIPMENT_STATE_TONE: Record<ShipmentState, StatusTone> = { draft: 'neutral', booked: 'transit', closed: 'neutral', cancelled: 'critical' };

export const LEG_TYPES = ['pickup', 'consolidation', 'export_handling', 'main_carriage', 'customs', 'local_delivery'] as const;
export type LegType = (typeof LEG_TYPES)[number];
export const LEG_TYPE_LABEL: Record<LegType, string> = {
  pickup: 'Pickup',
  consolidation: 'Consolidation',
  export_handling: 'Export handling',
  main_carriage: 'Main carriage',
  customs: 'Customs',
  local_delivery: 'Local delivery',
};

export const REFERENCE_TYPES = ['booking', 'mbl', 'hbl', 'awb', 'container', 'seal', 'tracking'] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];
export const REFERENCE_TYPE_LABEL: Record<ReferenceType, string> = { booking: 'Booking', mbl: 'Master B/L', hbl: 'House B/L', awb: 'Air waybill', container: 'Container', seal: 'Seal', tracking: 'Tracking' };

// ---------------------------------------------------------------- legs

export interface LegFacts {
  readonly type: LegType;
  readonly sequence: number;
  /** The dates the shipment was booked with. */
  readonly plannedEtd: LocalDate | null;
  readonly plannedEta: LocalDate | null;
  /** The current expectation; null while the plan holds. */
  readonly etd: LocalDate | null;
  readonly eta: LocalDate | null;
  /** What happened. */
  readonly atd: LocalDate | null;
  readonly ata: LocalDate | null;
}

export type LegStatus = 'pending' | 'underway' | 'arrived';

export function legStatus(leg: LegFacts): LegStatus {
  if (leg.ata) return 'arrived';
  if (leg.atd) return 'underway';
  return 'pending';
}

export const expectedEtd = (leg: LegFacts): LocalDate | null => leg.atd ?? leg.etd ?? leg.plannedEtd;
export const expectedEta = (leg: LegFacts): LocalDate | null => leg.ata ?? leg.eta ?? leg.plannedEta;

const ordered = (legs: readonly LegFacts[]) => [...legs].sort((a, b) => a.sequence - b.sequence);

/**
 * A delay carries forward: when a leg ends later than planned, the legs
 * after it that have no expectation of their own move by the same number of
 * days. Returns the legs with those expected dates filled in.
 */
export function forecastLegs<T extends LegFacts>(legs: readonly T[]): T[] {
  const sorted = ordered(legs) as T[];
  let delta = 0;
  return sorted.map((leg) => {
    const status = legStatus(leg);
    let next: T = leg;
    if (status === 'pending' && delta > 0) {
      next = {
        ...leg,
        etd: leg.etd ?? (leg.plannedEtd ? addDays(leg.plannedEtd, delta) : null),
        eta: leg.eta ?? (leg.plannedEta ? addDays(leg.plannedEta, delta) : null),
      };
    }
    const end = expectedEta(next);
    if (end && next.plannedEta) delta = Math.max(0, daysBetween(next.plannedEta, end));
    return next;
  });
}

/**
 * When the shipment leaves and when it arrives: the main carriage's
 * departure (the first leg's when there is none) and the last leg's arrival.
 */
export function shipmentDates(legs: readonly LegFacts[]): { etd: LocalDate | null; eta: LocalDate | null; plannedEtd: LocalDate | null; plannedEta: LocalDate | null } {
  const sorted = forecastLegs(legs);
  const departure = sorted.find((leg) => leg.type === 'main_carriage') ?? sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    etd: departure ? expectedEtd(departure) : null,
    eta: last ? expectedEta(last) : null,
    plannedEtd: departure ? (departure.plannedEtd ?? expectedEtd(departure)) : null,
    plannedEta: last ? (last.plannedEta ?? expectedEta(last)) : null,
  };
}

/**
 * Where the goods are, read from the legs: booked until something departs,
 * in transit while a leg is underway, in customs while the customs leg is the
 * one in hand, arrived once the main carriage has landed, delivered when the
 * last leg has.
 */
export function shipmentStage(state: ShipmentState, legs: readonly LegFacts[]): ShipmentStage {
  if (state === 'draft') return 'draft';
  if (state === 'cancelled') return 'cancelled';
  const sorted = ordered(legs);
  if (sorted.length === 0) return 'booked';
  const current = sorted.find((leg) => legStatus(leg) !== 'arrived');
  if (!current) return 'delivered';
  const index = sorted.indexOf(current);
  const mainArrived = sorted.some((leg) => leg.type === 'main_carriage' && legStatus(leg) === 'arrived');
  const anyMoved = sorted.some((leg) => legStatus(leg) !== 'pending');
  if (current.type === 'customs' && (index > 0 || legStatus(current) === 'underway')) return 'customs';
  if (mainArrived) return 'arrived';
  if (legStatus(current) === 'underway' || anyMoved) return 'in_transit';
  return 'booked';
}

/** Position along the route, 0 to 1: finished legs count whole, the leg underway by the time elapsed. */
export function shipmentProgress(legs: readonly LegFacts[], today: LocalDate): number {
  const sorted = forecastLegs(legs);
  if (sorted.length === 0) return 0;
  let progress = 0;
  for (const leg of sorted) {
    const status = legStatus(leg);
    if (status === 'arrived') progress += 1;
    else if (status === 'underway') {
      const eta = expectedEta(leg);
      const atd = leg.atd!;
      const span = eta ? Math.max(1, daysBetween(atd, eta)) : 1;
      const elapsed = Math.max(0, daysBetween(atd, today));
      progress += Math.min(0.95, Math.max(0.1, elapsed / span));
    }
  }
  return Math.round((progress / sorted.length) * 1000) / 1000;
}

/**
 * Health read from the legs against their plan. Delayed when the final
 * arrival has slipped three days or more, a leg underway is past its
 * arrival, or a departure is more than two days overdue; at risk on a
 * smaller slip or a departure that is late by a day or two.
 */
export function shipmentHealth(state: ShipmentState, legs: readonly LegFacts[], today: LocalDate): Health {
  if (state !== 'booked') return 'on_track';
  const sorted = forecastLegs(legs);
  const open = sorted.filter((leg) => legStatus(leg) !== 'arrived');
  if (open.length === 0) return 'on_track';
  const { eta, plannedEta } = shipmentDates(sorted);
  const slip = eta && plannedEta ? daysBetween(plannedEta, eta) : 0;
  let worst: Health = 'on_track';
  const raise = (to: Health) => {
    const rank: Record<Health, number> = { on_track: 0, at_risk: 1, delayed: 2, blocked: 3 };
    if (rank[to] > rank[worst]) worst = to;
  };
  if (slip >= 3) raise('delayed');
  else if (slip >= 1) raise('at_risk');
  const current = open[0]!;
  if (legStatus(current) === 'underway') {
    const arrival = expectedEta(current);
    if (arrival && daysBetween(arrival, today) > 0) raise('delayed');
  } else {
    const departure = expectedEtd(current);
    const late = departure ? daysBetween(departure, today) : 0;
    if (late > 2) raise('delayed');
    else if (late >= 1) raise('at_risk');
  }
  return worst;
}

// ---------------------------------------------------------------- planning

export interface LegPlan {
  readonly type: LegType;
  readonly plannedEtd: LocalDate;
  readonly plannedEta: LocalDate;
}

const ROUTES: Record<TransportMode, readonly [LegType, number, number][]> = {
  // type, start offset from the departure date, duration in days
  sea: [
    ['pickup', -5, 1],
    ['export_handling', -4, 4],
    ['main_carriage', 0, 30],
    ['customs', 30, 3],
    ['local_delivery', 33, 2],
  ],
  air: [
    ['pickup', -2, 1],
    ['main_carriage', 0, 2],
    ['customs', 2, 2],
    ['local_delivery', 4, 1],
  ],
  courier: [
    ['pickup', 0, 0],
    ['main_carriage', 0, 5],
    ['local_delivery', 5, 1],
  ],
  road: [
    ['pickup', 0, 0],
    ['main_carriage', 0, 7],
    ['local_delivery', 7, 1],
  ],
};

/** The usual legs for a mode laid out from a departure date; the coordinator edits them before booking. */
export function defaultLegs(mode: TransportMode, departure: LocalDate): LegPlan[] {
  return ROUTES[mode].map(([type, offset, duration]) => ({ type, plannedEtd: addDays(departure, offset), plannedEta: addDays(departure, offset + duration) }));
}

// ---------------------------------------------------------------- contents

export interface ShipmentTotals {
  readonly cartons: number;
  readonly pallets: number;
  readonly rolls: number;
  /** Fixed-point metres. */
  readonly metres: string;
  readonly cbmMilli: number | null;
  readonly grossWeightG: number | null;
  readonly netWeightG: number | null;
}

/** Physical totals from the packages assigned: cartons, pallets, rolls, metres, CBM and weights. */
export function shipmentTotals(units: readonly Pick<HandlingUnitView, 'kind' | 'contents' | 'quantity' | 'cbmMilli' | 'grossWeightG' | 'netWeightG' | 'parentNumber'>[]): ShipmentTotals {
  const some = (pick: (unit: (typeof units)[number]) => number | null) => (units.some((unit) => pick(unit) !== null) ? units.reduce((sum, unit) => sum + (pick(unit) ?? 0), 0) : null);
  return {
    cartons: units.filter((unit) => unit.kind === 'carton').length,
    pallets: units.filter((unit) => unit.kind === 'pallet').length,
    rolls: units.reduce((sum, unit) => sum + unit.contents.filter((content) => content.rollNumber).length, 0),
    metres: units.reduce((sum, unit) => sum + BigInt(unit.quantity), 0n).toString(),
    // A carton on a pallet is inside the pallet's volume; count the outermost packages only.
    cbmMilli: some((unit) => (unit.parentNumber ? null : unit.cbmMilli)),
    grossWeightG: some((unit) => (unit.parentNumber ? null : unit.grossWeightG)),
    netWeightG: some((unit) => unit.netWeightG),
  };
}

/**
 * How far an addition would take a purchase-order line beyond what it may
 * ship: the ordered quantity plus its over-tolerance. Zero when it fits.
 */
export function overShipment(ordered: string, overTolerancePercent: number | null, alreadyShipped: string, adding: string): string {
  const allowed = (BigInt(ordered) * BigInt(100 + (overTolerancePercent ?? 0))) / 100n;
  const total = BigInt(alreadyShipped) + BigInt(adding);
  return total > allowed ? (total - allowed).toString() : '0';
}

// ---------------------------------------------------------------- documents

export interface DocumentRequirementRule {
  readonly mode: TransportMode | null;
  readonly flow: ShipmentFlow | null;
  readonly destinationCountry: string | null;
  readonly documentKind: string;
  /** How many days before departure the document must be on file. */
  readonly daysBeforeEtd: number;
}

export interface DocumentCheck {
  readonly documentKind: string;
  readonly dueOn: LocalDate | null;
  readonly filed: boolean;
  readonly overdue: boolean;
}

/** The documents a shipment must carry, from the rules that match it, and whether each is on file. */
export function documentsCheck(
  rules: readonly DocumentRequirementRule[],
  shipment: { mode: TransportMode; flow: ShipmentFlow; destinationCountry: string | null; etd: LocalDate | null },
  filedKinds: readonly string[],
  today: LocalDate,
): DocumentCheck[] {
  const matching = rules.filter(
    (rule) => (rule.mode === null || rule.mode === shipment.mode) && (rule.flow === null || rule.flow === shipment.flow) && (rule.destinationCountry === null || rule.destinationCountry === shipment.destinationCountry),
  );
  const kinds = new Map<string, number>();
  for (const rule of matching) kinds.set(rule.documentKind, Math.max(kinds.get(rule.documentKind) ?? 0, rule.daysBeforeEtd));
  return [...kinds.entries()].map(([documentKind, days]) => {
    const dueOn = shipment.etd ? addDays(shipment.etd, -days) : null;
    const filed = filedKinds.includes(documentKind);
    return { documentKind, dueOn, filed, overdue: !filed && dueOn !== null && daysBetween(dueOn, today) >= 0 };
  });
}

// ---------------------------------------------------------------- views

export interface LegView extends LegFacts {
  readonly id: string;
  readonly mode: TransportMode;
  readonly fromName: string;
  readonly fromCode: string;
  readonly toName: string;
  readonly toCode: string;
  readonly providerName: string;
  readonly vessel: string;
  readonly voyage: string;
  readonly note: string;
}

export interface ShipmentLineView {
  readonly id: string;
  readonly purchaseOrderNumber: string;
  readonly purchaseOrderLineNo: number;
  readonly lotNumber: string;
  readonly skuCode: string;
  readonly productName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly quantity: string;
  readonly uom: string;
}

export interface ReferenceView {
  readonly id: string;
  readonly type: ReferenceType;
  readonly value: string;
}

export interface ShipmentSummary {
  readonly id: string;
  readonly number: string;
  readonly flow: ShipmentFlow;
  readonly mode: TransportMode;
  readonly loadType: LoadType;
  readonly state: ShipmentState;
  readonly stage: ShipmentStage;
  readonly health: Health;
  readonly incoterm: string;
  readonly namedPlace: string;
  readonly originName: string;
  readonly originCode: string;
  readonly destinationName: string;
  readonly destinationCode: string;
  readonly destinationCountry: string | null;
  readonly forwarderName: string;
  readonly etd: LocalDate | null;
  readonly eta: LocalDate | null;
  readonly plannedEta: LocalDate | null;
  readonly progress: number;
  readonly totals: ShipmentTotals;
  readonly purchaseOrderNumbers: readonly string[];
  readonly products: readonly string[];
  readonly bookedOn: LocalDate | null;
  readonly createdAt: string;
}

export interface ShipmentDetail extends ShipmentSummary {
  readonly originId: string;
  readonly destinationId: string;
  readonly forwarderId: string;
  readonly consigneeName: string;
  readonly notes: string;
  readonly legs: readonly LegView[];
  readonly lines: readonly ShipmentLineView[];
  readonly units: readonly (HandlingUnitView & { readonly runNumber: string })[];
  readonly references: readonly ReferenceView[];
}

export interface PlaceOption {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly city: string;
  readonly countryCode: string | null;
  readonly countryName: string;
  readonly locationCode: string;
  readonly companyName: string;
}

/** The code a lane shows for a place: its UN/LOCODE or IATA code, else the first letters of its name. */
export function placeCode(location: { locationCode: string; name: string; city?: string }): string {
  if (location.locationCode) return location.locationCode;
  const source = location.city || location.name;
  return source
    .replace(/[^A-Za-z ]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.slice(0, 3))
    .join('')
    .slice(0, 5)
    .toUpperCase();
}
