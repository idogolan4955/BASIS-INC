// Purchasing and manufacturing: states, view models, and the pure rules that
// plan milestones from a template and derive a run's health from its dates.

import { addDays, daysBetween, type LocalDate } from './local-date';
import type { Health, StatusTone } from './status';

export const PO_STATES = ['draft', 'issued', 'confirmed', 'closed', 'cancelled'] as const;
export type PurchaseOrderState = (typeof PO_STATES)[number];

export const PO_STATE_LABEL: Record<PurchaseOrderState, string> = {
  draft: 'Draft',
  issued: 'Issued',
  confirmed: 'Confirmed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export const PO_STATE_TONE: Record<PurchaseOrderState, StatusTone> = {
  draft: 'neutral',
  issued: 'transit',
  confirmed: 'positive',
  closed: 'neutral',
  cancelled: 'critical',
};

export const RUN_STATES = ['planned', 'active', 'completed', 'cancelled'] as const;
export type RunState = (typeof RUN_STATES)[number];

export const RUN_STATE_LABEL: Record<RunState, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const RUN_STATE_TONE: Record<RunState, StatusTone> = {
  planned: 'neutral',
  active: 'transit',
  completed: 'positive',
  cancelled: 'critical',
};

export const MILESTONE_STATES = ['pending', 'in_progress', 'done', 'skipped', 'blocked'] as const;
export type MilestoneState = (typeof MILESTONE_STATES)[number];

export const MILESTONE_STATE_LABEL: Record<MilestoneState, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
  skipped: 'Skipped',
  blocked: 'Blocked',
};

export type MilestoneGate = 'none' | 'approval' | 'inspection';

export const PAYMENT_TRIGGERS = ['on_order', 'before_shipment', 'after_bl', 'on_arrival', 'on_date'] as const;
export type PaymentTrigger = (typeof PAYMENT_TRIGGERS)[number];

export const PAYMENT_TRIGGER_LABEL: Record<PaymentTrigger, string> = {
  on_order: 'On order',
  before_shipment: 'Before shipment',
  after_bl: 'After bill of lading',
  on_arrival: 'On arrival',
  on_date: 'On a date',
};

export const LOT_QUALITY_STATES = ['pending', 'on_hold', 'released', 'rejected'] as const;
export type LotQualityState = (typeof LOT_QUALITY_STATES)[number];

export const LOT_QUALITY_LABEL: Record<LotQualityState, string> = {
  pending: 'Awaiting inspection',
  on_hold: 'On hold',
  released: 'Released',
  rejected: 'Rejected',
};

export const LOT_QUALITY_TONE: Record<LotQualityState, StatusTone> = {
  pending: 'neutral',
  on_hold: 'caution',
  released: 'positive',
  rejected: 'critical',
};

// ---------------------------------------------------------------- planning

export interface TemplateStep {
  readonly key: string;
  readonly name: string;
  readonly category: string;
  readonly sequence: number;
  readonly durationDays: number;
  readonly dependsOnKey: string | null;
  readonly gate: MilestoneGate;
}

export interface PlannedMilestone extends TemplateStep {
  readonly plannedStart: LocalDate;
  readonly plannedEnd: LocalDate;
}

/**
 * Lays the template's steps on the calendar from a start date. A step starts
 * when the step it depends on ends; a step with no dependency starts when the
 * previous step ends. Durations are whole days.
 */
export function planMilestones(steps: readonly TemplateStep[], start: LocalDate): PlannedMilestone[] {
  const ordered = [...steps].sort((a, b) => a.sequence - b.sequence);
  const planned: PlannedMilestone[] = [];
  for (const step of ordered) {
    const dependency = step.dependsOnKey ? planned.find((candidate) => candidate.key === step.dependsOnKey) : undefined;
    const previous = planned[planned.length - 1];
    const plannedStart = dependency?.plannedEnd ?? previous?.plannedEnd ?? start;
    planned.push({ ...step, plannedStart, plannedEnd: addDays(plannedStart, Math.max(0, step.durationDays)) });
  }
  return planned;
}

// ---------------------------------------------------------------- derivation

export interface MilestoneFacts {
  readonly key: string;
  readonly state: MilestoneState;
  readonly plannedEnd: LocalDate;
  readonly forecastEnd: LocalDate | null;
  readonly actualEnd: LocalDate | null;
}

export interface ChainMilestone extends MilestoneFacts {
  readonly plannedStart: LocalDate;
  readonly sequence: number;
  readonly dependsOnKey: string | null;
}

/**
 * A slip travels down the chain: a pending step cannot end before the step it
 * depends on (or the previous step) is expected to end plus its own duration.
 * A pending step's forecast is derived from that alone and recomputed every
 * time, so an upstream recovery clears it; people forecast the step they are
 * on, and started or finished steps keep what was recorded.
 */
export function propagateForecasts(milestones: readonly ChainMilestone[]): Map<string, LocalDate | null> {
  const ordered = [...milestones].sort((a, b) => a.sequence - b.sequence);
  const expected = new Map<string, LocalDate>();
  const result = new Map<string, LocalDate | null>();
  for (const [index, milestone] of ordered.entries()) {
    const duration = Math.max(0, daysBetween(milestone.plannedStart, milestone.plannedEnd));
    const upstream = milestone.dependsOnKey ? expected.get(milestone.dependsOnKey) : index > 0 ? expected.get(ordered[index - 1]!.key) : undefined;
    if (milestone.state === 'pending') {
      const earliest = upstream === undefined ? milestone.plannedEnd : addDays(upstream, duration);
      const slipped = daysBetween(milestone.plannedEnd, earliest) > 0;
      result.set(milestone.key, slipped ? earliest : null);
      expected.set(milestone.key, slipped ? earliest : milestone.plannedEnd);
    } else {
      result.set(milestone.key, milestone.forecastEnd);
      expected.set(milestone.key, expectedEnd(milestone));
    }
  }
  return result;
}

/** The date a milestone is now expected to end. */
export function expectedEnd(milestone: MilestoneFacts): LocalDate {
  return milestone.actualEnd ?? milestone.forecastEnd ?? milestone.plannedEnd;
}

const isOpen = (milestone: MilestoneFacts) => milestone.state !== 'done' && milestone.state !== 'skipped';

/**
 * Health is read from the dates, never typed in: blocked if any step is
 * blocked; delayed if an open step is past its expected end or has slipped
 * more than two days; at risk if a step has slipped by up to two days or is
 * due within two days without having started; otherwise on track.
 */
export function runHealth(milestones: readonly MilestoneFacts[], today: LocalDate): Health {
  if (milestones.some((milestone) => milestone.state === 'blocked')) return 'blocked';
  let atRisk = false;
  for (const milestone of milestones.filter(isOpen)) {
    const expected = expectedEnd(milestone);
    if (daysBetween(expected, today) > 0) return 'delayed';
    const slip = milestone.forecastEnd ? daysBetween(milestone.plannedEnd, milestone.forecastEnd) : 0;
    if (slip > 2) return 'delayed';
    if (slip > 0) atRisk = true;
    if (milestone.state === 'pending' && daysBetween(today, expected) <= 2) atRisk = true;
  }
  return atRisk ? 'at_risk' : 'on_track';
}

/** When the run is now expected to finish: the latest expected end of its steps. */
export function runForecastEnd(milestones: readonly MilestoneFacts[]): LocalDate | null {
  let latest: LocalDate | null = null;
  for (const milestone of milestones) {
    const end = expectedEnd(milestone);
    if (latest === null || daysBetween(latest, end) > 0) latest = end;
  }
  return latest;
}

/** The run's lifecycle follows its steps: active once any has started, completed when none is open. */
export function runStateFrom(milestones: readonly MilestoneFacts[], current: RunState): RunState {
  if (current === 'cancelled') return current;
  if (milestones.length > 0 && !milestones.some(isOpen)) return 'completed';
  if (milestones.some((milestone) => milestone.state === 'in_progress' || milestone.state === 'done')) return 'active';
  return 'planned';
}

/** Share of steps done, 0 to 1. */
export function runProgress(milestones: readonly MilestoneFacts[]): number {
  const counted = milestones.filter((milestone) => milestone.state !== 'skipped');
  if (counted.length === 0) return 0;
  return counted.filter((milestone) => milestone.state === 'done').length / counted.length;
}

// ---------------------------------------------------------------- view models

export interface PurchaseOrderSummary {
  readonly id: string;
  readonly number: string;
  readonly state: PurchaseOrderState;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly factoryName: string;
  readonly currency: string;
  readonly issuedOn: LocalDate | null;
  readonly requestedExFactory: LocalDate | null;
  /** Fixed-point thousandths of a metre across all lines. */
  readonly totalQuantity: string;
  readonly lineCount: number;
  readonly products: readonly string[];
  readonly runs: readonly { readonly number: string; readonly state: RunState; readonly health: Health }[];
  readonly createdAt: string;
}

export interface PurchaseOrderLineView {
  readonly id: string;
  readonly lineNo: number;
  readonly skuCode: string;
  readonly productCode: string;
  readonly productName: string;
  readonly variantName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly quantity: string;
  readonly uom: string;
  readonly overTolerancePercent: number | null;
  readonly underTolerancePercent: number | null;
  readonly requestedExFactory: LocalDate | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  readonly legalEntityName: string;
  readonly incoterm: string;
  readonly namedPlace: string;
  readonly paymentTerms: string;
  readonly confirmedOn: LocalDate | null;
  readonly notes: string;
  readonly version: number;
  readonly lines: readonly PurchaseOrderLineView[];
  readonly runDetails: readonly { readonly number: string; readonly state: RunState; readonly health: Health; readonly plannedEnd: LocalDate; readonly forecastEnd: LocalDate | null }[];
}

/** Cost-bearing, for cost roles only. */
export interface PurchaseOrderCosts {
  readonly currency: string;
  readonly lines: readonly { readonly id: string; readonly lineNo: number; readonly quantity: string; readonly unitPrice: string }[];
  readonly payments: readonly {
    readonly id: string;
    readonly label: string;
    readonly percent: number | null;
    readonly amount: string | null;
    readonly trigger: PaymentTrigger;
    readonly dueOn: LocalDate | null;
    readonly paidOn: LocalDate | null;
    readonly paidAmount: string | null;
    readonly reference: string;
  }[];
}

export const HANDLING_UNIT_KINDS = ['roll', 'carton', 'pallet', 'container_load'] as const;
export type HandlingUnitKind = (typeof HANDLING_UNIT_KINDS)[number];
export const HANDLING_UNIT_KIND_LABEL: Record<HandlingUnitKind, string> = { roll: 'Roll', carton: 'Carton', pallet: 'Pallet', container_load: 'Container load' };

export interface PutUpFacts {
  readonly rollLengthM: number;
  readonly rollsPerCarton: number | null;
  readonly cartonLengthCm: number | null;
  readonly cartonWidthCm: number | null;
  readonly cartonHeightCm: number | null;
}

export interface RollView {
  readonly id: string;
  readonly number: string;
  readonly rollNo: number;
  /** Fixed-point thousandths of a metre. */
  readonly measuredLength: string;
  readonly usableWidthCm: number | null;
  readonly weightG: number | null;
  readonly grade: string;
  readonly defectPoints: number | null;
  /** The carton or pallet the roll sits in, once packed. */
  readonly packedIn: string | null;
}

export interface HandlingUnitContentView {
  readonly rollNumber: string | null;
  readonly lotNumber: string;
  readonly skuCode: string;
  readonly quantity: string;
}

export interface HandlingUnitView {
  readonly id: string;
  readonly number: string;
  readonly kind: HandlingUnitKind;
  readonly marks: string;
  readonly parentNumber: string | null;
  readonly lengthCm: number | null;
  readonly widthCm: number | null;
  readonly heightCm: number | null;
  readonly grossWeightG: number | null;
  readonly netWeightG: number | null;
  readonly packedOn: LocalDate | null;
  readonly contents: readonly HandlingUnitContentView[];
  /** Metres inside, fixed-point. */
  readonly quantity: string;
  /** Thousandths of a cubic metre, from the dimensions. */
  readonly cbmMilli: number | null;
}

export interface MilestoneRecord extends MilestoneFacts {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly sequence: number;
  readonly dependsOnKey: string | null;
  readonly gate: MilestoneGate;
  readonly plannedStart: LocalDate;
  readonly actualStart: LocalDate | null;
  readonly delayReason: string;
  readonly note: string;
}

export interface RunLineView {
  readonly id: string;
  readonly skuCode: string;
  readonly productName: string;
  readonly variantName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly plannedQuantity: string;
  readonly producedQuantity: string;
  readonly uom: string;
  readonly rollTracking: boolean;
  readonly putUp: PutUpFacts | null;
}

export interface RunSummary {
  readonly id: string;
  readonly number: string;
  readonly state: RunState;
  readonly health: Health;
  readonly purchaseOrderNumber: string;
  readonly supplierName: string;
  readonly factoryName: string;
  readonly templateName: string;
  readonly plannedStart: LocalDate;
  readonly plannedEnd: LocalDate;
  readonly forecastEnd: LocalDate | null;
  readonly actualEnd: LocalDate | null;
  readonly products: readonly string[];
  readonly totalQuantity: string;
  readonly progress: number;
  readonly milestones: readonly MilestoneRecord[];
}

export interface LotView {
  readonly id: string;
  readonly number: string;
  readonly skuCode: string;
  readonly productName: string;
  readonly variantName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly rollTracking: boolean;
  readonly putUp: PutUpFacts | null;
  readonly millLotRef: string;
  /** What the mill reported, fixed-point metres. */
  readonly producedQuantity: string;
  readonly producedOn: LocalDate | null;
  readonly qualityState: LotQualityState;
  readonly rollCount: number;
  readonly packedRollCount: number;
  /** Sum of the rolls' measured lengths. */
  readonly measuredQuantity: string;
  /** Metres already inside a carton or pallet. */
  readonly packedQuantity: string;
  readonly rolls: readonly RollView[];
}

export interface LotDetail extends LotView {
  readonly runNumber: string;
  readonly purchaseOrderNumber: string;
  readonly supplierName: string;
}

export interface RunDetail extends RunSummary {
  readonly purchaseOrderState: PurchaseOrderState;
  readonly supplierId: string;
  readonly notes: string;
  readonly lines: readonly RunLineView[];
  readonly lots: readonly LotView[];
  readonly handlingUnits: readonly HandlingUnitView[];
  /** Released and packed, fixed-point metres: the run's ready-to-ship quantity. */
  readonly availableToShip: string;
}

export interface ProcessTemplateView {
  readonly id: string;
  readonly name: string;
  readonly familyCode: string;
  readonly familyName: string;
  readonly supplierName: string;
  readonly isDefault: boolean;
  readonly steps: readonly TemplateStep[];
}

// ---------------------------------------------------------------- lots and packing

/** Thousandths of a cubic metre from carton dimensions in centimetres; null until all three are known. */
export function cubicMetresMilli(lengthCm: number | null, widthCm: number | null, heightCm: number | null): number | null {
  if (!lengthCm || !widthCm || !heightCm) return null;
  return Math.round((lengthCm * widthCm * heightCm) / 1000);
}

/** The quantities a lot's rolls and loose packed contents add up to. */
export function lotQuantities(
  rolls: readonly { readonly measuredLength: string; readonly packedIn: string | null }[],
  loosePacked: readonly string[] = [],
): { rollCount: number; packedRollCount: number; measuredQuantity: string; packedQuantity: string } {
  let measured = 0n;
  let packed = 0n;
  let packedRolls = 0;
  for (const roll of rolls) {
    measured += BigInt(roll.measuredLength);
    if (roll.packedIn) {
      packed += BigInt(roll.measuredLength);
      packedRolls += 1;
    }
  }
  for (const quantity of loosePacked) packed += BigInt(quantity);
  return { rollCount: rolls.length, packedRollCount: packedRolls, measuredQuantity: measured.toString(), packedQuantity: packed.toString() };
}

/**
 * "Ready to ship" is a quantity, never a label: what is released by quality
 * and already packed.
 */
export function availableToShip(lots: readonly { readonly qualityState: LotQualityState; readonly packedQuantity: string }[]): string {
  return lots
    .filter((lot) => lot.qualityState === 'released')
    .reduce((total, lot) => total + BigInt(lot.packedQuantity), 0n)
    .toString();
}

/** Roll numbers hang off the lot: LOT-26-0001-01, -02, ... */
export function rollNumber(lotNumber: string, rollNo: number): string {
  return `${lotNumber}-${String(rollNo).padStart(2, '0')}`;
}
