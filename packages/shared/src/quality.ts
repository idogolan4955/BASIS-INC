import type { LotQualityState } from './manufacturing';
import type { StatusTone } from './status';

// Quality: the inspection's result is read from its checks and defects; the
// disposition at sign-off is what moves the lot. Nothing here is a status
// someone types in.

export const INSPECTION_TYPES = ['lab_dip', 'inline', 'pre_shipment', 'receiving'] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];
export const INSPECTION_TYPE_LABEL: Record<InspectionType, string> = { lab_dip: 'Lab dip', inline: 'Inline', pre_shipment: 'Pre-shipment', receiving: 'Receiving' };

export const INSPECTION_STATES = ['scheduled', 'in_progress', 'submitted', 'signed_off', 'cancelled'] as const;
export type InspectionState = (typeof INSPECTION_STATES)[number];
export const INSPECTION_STATE_LABEL: Record<InspectionState, string> = { scheduled: 'Scheduled', in_progress: 'In progress', submitted: 'Awaiting sign-off', signed_off: 'Signed off', cancelled: 'Cancelled' };
export const INSPECTION_STATE_TONE: Record<InspectionState, StatusTone> = { scheduled: 'neutral', in_progress: 'transit', submitted: 'caution', signed_off: 'positive', cancelled: 'neutral' };

export const INSPECTION_RESULTS = ['pass', 'conditional_pass', 'fail'] as const;
export type InspectionResult = (typeof INSPECTION_RESULTS)[number];
export const INSPECTION_RESULT_LABEL: Record<InspectionResult, string> = { pass: 'Pass', conditional_pass: 'Conditional pass', fail: 'Fail' };
export const INSPECTION_RESULT_TONE: Record<InspectionResult, StatusTone> = { pass: 'positive', conditional_pass: 'caution', fail: 'critical' };

export const DISPOSITIONS = ['release', 'rework', 'reject', 'accept_with_concession'] as const;
export type Disposition = (typeof DISPOSITIONS)[number];
export const DISPOSITION_LABEL: Record<Disposition, string> = { release: 'Release', rework: 'Rework', reject: 'Reject', accept_with_concession: 'Accept with concession' };

export const CHECK_CATEGORIES = ['shade', 'dimension', 'defect', 'quantity', 'packaging', 'documentation'] as const;
export type CheckCategory = (typeof CHECK_CATEGORIES)[number];
export const CHECK_CATEGORY_LABEL: Record<CheckCategory, string> = { shade: 'Shade', dimension: 'Dimensions', defect: 'Defects', quantity: 'Quantity', packaging: 'Packaging', documentation: 'Documentation' };

export type CheckKind = 'pass_fail' | 'measurement' | 'count';
export type CheckOutcome = 'pending' | 'pass' | 'fail' | 'not_applicable';

export const ACTION_STATES = ['open', 'in_progress', 'verification', 'closed'] as const;
export type ActionState = (typeof ACTION_STATES)[number];
export const ACTION_STATE_LABEL: Record<ActionState, string> = { open: 'Open', in_progress: 'In progress', verification: 'Awaiting verification', closed: 'Closed' };
export const ACTION_STATE_TONE: Record<ActionState, StatusTone> = { open: 'caution', in_progress: 'transit', verification: 'caution', closed: 'positive' };

/** The defect types of the 4-point convention, with their usual points. */
export const DEFECT_TYPES: readonly { readonly type: string; readonly points: number }[] = [
  { type: 'Hole', points: 4 },
  { type: 'Dropped stitch', points: 4 },
  { type: 'Shade bar', points: 4 },
  { type: 'Stain', points: 2 },
  { type: 'Slub', points: 1 },
  { type: 'Crease mark', points: 2 },
  { type: 'Selvedge fault', points: 2 },
  { type: 'Width variation', points: 3 },
  { type: 'Oil mark', points: 2 },
  { type: 'Other', points: 1 },
];

export interface CheckFacts {
  readonly key: string;
  readonly category: CheckCategory;
  readonly kind: CheckKind;
  readonly isCritical: boolean;
  readonly outcome: CheckOutcome;
  /** Thousandths of the unit. */
  readonly measured: string | null;
  readonly expected: string | null;
  readonly toleranceMinus: string | null;
  readonly tolerancePlus: string | null;
}

/** A measurement passes when it sits inside expected − minus … expected + plus. */
export function measurementOutcome(check: Pick<CheckFacts, 'measured' | 'expected' | 'toleranceMinus' | 'tolerancePlus'>): CheckOutcome {
  if (check.measured === null) return 'pending';
  if (check.expected === null) return 'pass';
  const measured = BigInt(check.measured);
  const expected = BigInt(check.expected);
  const low = expected - BigInt(check.toleranceMinus ?? '0');
  const high = expected + BigInt(check.tolerancePlus ?? '0');
  return measured >= low && measured <= high ? 'pass' : 'fail';
}

export interface DefectFacts {
  readonly points: number;
  readonly rollNumber: string | null;
}

/** Defect points per 100 m over the metres inspected (4-point system). */
export function defectPointsPer100m(defects: readonly DefectFacts[], inspectedMetresStored: string): number | null {
  const metres = Number(BigInt(inspectedMetresStored)) / 1000;
  if (metres <= 0) return null;
  const points = defects.reduce((sum, defect) => sum + defect.points, 0);
  return Math.round((points / metres) * 100 * 10) / 10;
}

export interface Thresholds {
  readonly maxDefectPointsPer100m: number | null;
  readonly maxDeltaE: number | null;
}

/**
 * The result an inspection earns: fail when a critical check fails, when the
 * shade is beyond the threshold or the defect rate is above it; conditional
 * when only non-critical checks fail; pass otherwise. Pending checks keep the
 * result open.
 */
export function inspectionResult(checks: readonly CheckFacts[], defects: readonly DefectFacts[], readings: readonly { deltaE: number }[], inspectedMetresStored: string, thresholds: Thresholds): InspectionResult | null {
  if (checks.some((check) => check.outcome === 'pending')) return null;
  const failed = checks.filter((check) => check.outcome === 'fail');
  if (failed.some((check) => check.isCritical)) return 'fail';
  const rate = defectPointsPer100m(defects, inspectedMetresStored);
  if (thresholds.maxDefectPointsPer100m !== null && rate !== null && rate > thresholds.maxDefectPointsPer100m) return 'fail';
  const worstDeltaE = readings.reduce((worst, reading) => Math.max(worst, reading.deltaE), 0);
  if (thresholds.maxDeltaE !== null && readings.length > 0 && worstDeltaE > thresholds.maxDeltaE) return 'fail';
  if (failed.length > 0) return 'conditional_pass';
  if (thresholds.maxDefectPointsPer100m !== null && rate !== null && rate > thresholds.maxDefectPointsPer100m * 0.8) return 'conditional_pass';
  return 'pass';
}

/** The dispositions a result allows: a failing lot is never simply released. */
export function dispositionsFor(result: InspectionResult): readonly Disposition[] {
  if (result === 'pass') return ['release'];
  if (result === 'conditional_pass') return ['release', 'accept_with_concession', 'rework', 'reject'];
  return ['rework', 'reject', 'accept_with_concession'];
}

/** What the disposition does to the lot. */
export function lotStateFor(disposition: Disposition): LotQualityState {
  switch (disposition) {
    case 'release':
    case 'accept_with_concession':
      return 'released';
    case 'rework':
      return 'on_hold';
    case 'reject':
      return 'rejected';
  }
}

/** A conditional pass needs a corrective action or a concession before it is signed off. */
export function signOffAllowed(result: InspectionResult, disposition: Disposition, openActions: number, concession: string): string | null {
  if (!dispositionsFor(result).includes(disposition)) return `A ${INSPECTION_RESULT_LABEL[result].toLowerCase()} cannot be ${DISPOSITION_LABEL[disposition].toLowerCase()}.`;
  if (result === 'conditional_pass' && disposition === 'release' && openActions === 0 && !concession.trim()) return 'A conditional pass is released with a corrective action or a recorded concession.';
  if (disposition === 'accept_with_concession' && !concession.trim()) return 'Say what is conceded.';
  return null;
}

export const formatDeltaE = (hundredths: number) => (hundredths / 100).toFixed(2);
export const formatLab = (thousandths: number) => (thousandths / 1000).toFixed(2);
