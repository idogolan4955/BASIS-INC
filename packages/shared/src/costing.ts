// Costing: what a shipment cost, spread over what it carried, so every lot
// knows its landed cost per metre. Allocation is exhaustive to the smallest
// unit; an estimate is produced early and a final run replaces it when the
// invoices are in. Amounts are Int64 ten-thousandths in the base currency.

import { allocate, divRound } from './fixed-point';
import { MONEY_SCALE } from './money';
import { QUANTITY_SCALE } from './quantity';
import type { StatusTone } from './status';
import type { TransportMode } from './logistics';

export const COST_CATEGORIES = ['freight', 'origin_charges', 'insurance', 'duty', 'tax', 'brokerage', 'local_delivery', 'other'] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];
export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  freight: 'Freight',
  origin_charges: 'Origin charges',
  insurance: 'Insurance',
  duty: 'Duty',
  tax: 'Tax',
  brokerage: 'Brokerage',
  local_delivery: 'Local delivery',
  other: 'Other',
};

export const COST_KINDS = ['estimate', 'actual'] as const;
export type CostKind = (typeof COST_KINDS)[number];
export const COST_KIND_LABEL: Record<CostKind, string> = { estimate: 'Estimate', actual: 'Actual' };
export const COST_KIND_TONE: Record<CostKind, StatusTone> = { estimate: 'neutral', actual: 'positive' };

export const ALLOCATION_BASES = ['value', 'quantity', 'gross_weight', 'cbm'] as const;
export type AllocationBasis = (typeof ALLOCATION_BASES)[number];
export const ALLOCATION_BASIS_LABEL: Record<AllocationBasis, string> = { value: 'By value', quantity: 'By metres', gross_weight: 'By gross weight', cbm: 'By volume' };

export const CUSTOMS_STATES = ['preparing', 'submitted', 'held', 'cleared'] as const;
export type CustomsState = (typeof CUSTOMS_STATES)[number];
export const CUSTOMS_STATE_LABEL: Record<CustomsState, string> = { preparing: 'Preparing', submitted: 'Submitted', held: 'Held', cleared: 'Cleared' };
export const CUSTOMS_STATE_TONE: Record<CustomsState, StatusTone> = { preparing: 'neutral', submitted: 'transit', held: 'critical', cleared: 'positive' };

export type AllocationRules = Record<CostCategory, AllocationBasis>;

/**
 * The default way each cost spreads: freight by volume at sea and by weight
 * in the air, duties and insurance by value, handling and delivery by value.
 */
export function defaultAllocationRules(mode: TransportMode): AllocationRules {
  return {
    freight: mode === 'sea' ? 'cbm' : 'gross_weight',
    origin_charges: 'value',
    insurance: 'value',
    duty: 'value',
    tax: 'value',
    brokerage: 'value',
    local_delivery: 'value',
    other: 'value',
  };
}

export interface CostFacts {
  readonly id: string;
  readonly category: CostCategory;
  readonly kind: CostKind;
  /** Fixed-point in the base currency. */
  readonly amountBase: string;
  /** Recoverable taxes are recorded but never land on the goods. */
  readonly isRecoverable: boolean;
}

export interface LineFacts {
  readonly id: string;
  readonly lotNumber: string;
  /** Fixed-point metres. */
  readonly quantity: string;
  /** Purchase value in the base currency, fixed-point. */
  readonly valueBase: string;
  readonly grossWeightG: number;
  readonly cbmMilli: number;
}

/**
 * Which costs a run takes: a final run takes actuals only; an estimate takes
 * the actual where one exists for a category and the estimate otherwise.
 * Returns the categories still estimated, which a final run must refuse.
 */
export function costsForRun(costs: readonly CostFacts[], kind: 'estimate' | 'final'): { taken: CostFacts[]; stillEstimated: CostCategory[] } {
  const landing = costs.filter((cost) => !cost.isRecoverable);
  const actualCategories = new Set(landing.filter((cost) => cost.kind === 'actual').map((cost) => cost.category));
  const stillEstimated = [...new Set(landing.filter((cost) => cost.kind === 'estimate' && !actualCategories.has(cost.category)).map((cost) => cost.category))];
  if (kind === 'final') return { taken: landing.filter((cost) => cost.kind === 'actual'), stillEstimated };
  return { taken: landing.filter((cost) => cost.kind === 'actual' || !actualCategories.has(cost.category)), stillEstimated };
}

export interface AllocationResult {
  readonly byCost: readonly { readonly costId: string; readonly category: CostCategory; readonly basis: AllocationBasis; readonly parts: readonly { readonly lineId: string; readonly amountBase: string }[] }[];
  readonly byLine: readonly { readonly lineId: string; readonly lotNumber: string; readonly byCategory: Partial<Record<CostCategory, string>>; readonly allocatedBase: string }[];
  readonly totalBase: string;
}

function weightsFor(lines: readonly LineFacts[], basis: AllocationBasis): bigint[] {
  const pick = (line: LineFacts): bigint => {
    switch (basis) {
      case 'value':
        return BigInt(line.valueBase);
      case 'quantity':
        return BigInt(line.quantity);
      case 'gross_weight':
        return BigInt(line.grossWeightG);
      case 'cbm':
        return BigInt(line.cbmMilli);
    }
  };
  const weights = lines.map(pick);
  // A basis nobody recorded (no weights, no dimensions) falls back to metres, then to equal shares.
  if (weights.every((weight) => weight === 0n)) {
    const byMetres = lines.map((line) => BigInt(line.quantity));
    return byMetres.every((weight) => weight === 0n) ? lines.map(() => 1n) : byMetres;
  }
  return weights;
}

/** Spreads every cost over the lines by its basis; each cost's parts sum to the cost exactly. */
export function allocateShipmentCosts(costs: readonly CostFacts[], lines: readonly LineFacts[], rules: AllocationRules): AllocationResult {
  if (lines.length === 0) throw new RangeError('Nothing to allocate to');
  const byLine = new Map(lines.map((line) => [line.id, { lineId: line.id, lotNumber: line.lotNumber, byCategory: {} as Record<CostCategory, bigint>, allocatedBase: 0n }]));
  const byCost = costs.map((cost) => {
    const basis = rules[cost.category];
    const parts = allocate(BigInt(cost.amountBase), weightsFor(lines, basis));
    parts.forEach((part, index) => {
      const line = byLine.get(lines[index]!.id)!;
      line.byCategory[cost.category] = (line.byCategory[cost.category] ?? 0n) + part;
      line.allocatedBase += part;
    });
    return { costId: cost.id, category: cost.category, basis, parts: parts.map((part, index) => ({ lineId: lines[index]!.id, amountBase: part.toString() })) };
  });
  return {
    byCost,
    byLine: [...byLine.values()].map((line) => ({
      lineId: line.lineId,
      lotNumber: line.lotNumber,
      byCategory: Object.fromEntries(Object.entries(line.byCategory).map(([category, amount]) => [category, amount.toString()])) as Partial<Record<CostCategory, string>>,
      allocatedBase: line.allocatedBase.toString(),
    })),
    totalBase: costs.reduce((sum, cost) => sum + BigInt(cost.amountBase), 0n).toString(),
  };
}

/** Cost per metre: the purchase price plus what landed on the line, spread over its metres. Fixed-point money. */
export function landedUnitCost(purchaseUnitCostBase: string, allocatedBase: string, quantity: string): string {
  const metres = BigInt(quantity);
  if (metres === 0n) return purchaseUnitCostBase;
  return (BigInt(purchaseUnitCostBase) + divRound(BigInt(allocatedBase) * QUANTITY_SCALE, metres)).toString();
}

/** A unit price in one currency into the base, through a decimal rate string. */
export function toBase(amount: string, rate: string): string {
  const RATE_DECIMALS = 8;
  const text = rate.trim();
  const match = /^(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) throw new SyntaxError(`Not a rate: "${rate}"`);
  const scaled = BigInt((match[1] || '0') + (match[2] ?? '').slice(0, RATE_DECIMALS).padEnd(RATE_DECIMALS, '0'));
  return divRound(BigInt(amount) * scaled, 10n ** BigInt(RATE_DECIMALS)).toString();
}

/** Line value from a unit price and metres, both fixed-point. */
export function lineValue(unitPrice: string, quantity: string): string {
  return divRound(BigInt(unitPrice) * BigInt(quantity), QUANTITY_SCALE).toString();
}

/** Landed over purchase, in basis points: 1250 is 12.5 % on top of the purchase price. */
export function upliftBasisPoints(purchaseUnitCostBase: string, landedUnitCostBase: string): number | null {
  const purchase = BigInt(purchaseUnitCostBase);
  if (purchase === 0n) return null;
  return Number(divRound((BigInt(landedUnitCostBase) - purchase) * 10000n, purchase));
}

export { MONEY_SCALE as COST_SCALE };

// ---------------------------------------------------------------- views

export interface ShipmentCostView {
  readonly id: string;
  readonly category: CostCategory;
  readonly kind: CostKind;
  readonly amount: string;
  readonly currency: string;
  readonly fxRateToBase: string;
  readonly amountBase: string;
  readonly vendorName: string;
  readonly invoiceRef: string;
  readonly invoiceDate: string | null;
  readonly isRecoverable: boolean;
  readonly note: string;
}

export interface CustomsEntryView {
  readonly id: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly brokerName: string;
  readonly entryNumber: string;
  readonly declaredValue: string | null;
  readonly declaredCurrency: string;
  readonly duties: string | null;
  readonly taxes: string | null;
  readonly state: CustomsState;
  readonly submittedOn: string | null;
  readonly clearedOn: string | null;
  readonly note: string;
}

export interface AllocationRunView {
  readonly id: string;
  readonly version: number;
  readonly kind: 'estimate' | 'final';
  readonly baseCurrency: string;
  readonly rules: AllocationRules;
  readonly performedByName: string;
  readonly performedAt: string;
  readonly totalBase: string;
  readonly lines: readonly { readonly lineId: string; readonly lotNumber: string; readonly skuCode: string; readonly quantity: string; readonly valueBase: string; readonly byCategory: Partial<Record<CostCategory, string>>; readonly allocatedBase: string; readonly landedUnitCostBase: string; readonly purchaseUnitCostBase: string }[];
}

export interface LotCostView {
  readonly id: string;
  readonly lotNumber: string;
  readonly skuCode: string;
  readonly productName: string;
  readonly shadeName: string;
  readonly shipmentNumber: string;
  readonly version: number;
  readonly currency: string;
  readonly quantity: string;
  readonly purchaseUnitCost: string;
  readonly allocated: Partial<Record<CostCategory, string>>;
  readonly allocatedUnit: string;
  readonly landedUnitCost: string;
  readonly isFinal: boolean;
  readonly computedAt: string;
}

export interface FxRateView {
  readonly id: string;
  readonly base: string;
  readonly quote: string;
  readonly rateDate: string;
  readonly rate: string;
  readonly source: string;
}
