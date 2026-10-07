// Inventory: where stock is, by lot and by roll, read from an append-only
// ledger of movements. A balance is the sum of what moved in minus what moved
// out; nobody edits one. Quantities are fixed-point metres.

import { divRound } from './fixed-point';
import type { LocalDate } from './local-date';
import { QUANTITY_SCALE } from './quantity';
import type { StatusTone } from './status';

export const STOCK_LOCATION_KINDS = ['physical', 'at_supplier', 'in_transit', 'customer', 'scrap', 'adjustment', 'samples'] as const;
export type StockLocationKind = (typeof STOCK_LOCATION_KINDS)[number];
export const STOCK_LOCATION_KIND_LABEL: Record<StockLocationKind, string> = {
  physical: 'Warehouse',
  at_supplier: 'At supplier',
  in_transit: 'In transit',
  customer: 'With customer',
  scrap: 'Scrap',
  adjustment: 'Adjustment',
  samples: 'Samples',
};

export const MOVEMENT_REASONS = ['receipt', 'transfer', 'pick', 'ship', 'adjust', 'return', 'sample_cut', 'scrap'] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];
export const MOVEMENT_REASON_LABEL: Record<MovementReason, string> = {
  receipt: 'Receipt',
  transfer: 'Transfer',
  pick: 'Pick',
  ship: 'Shipped',
  adjust: 'Adjustment',
  return: 'Return',
  sample_cut: 'Sample cut',
  scrap: 'Scrapped',
};
export const MOVEMENT_REASON_TONE: Record<MovementReason, StatusTone> = {
  receipt: 'positive',
  transfer: 'transit',
  pick: 'transit',
  ship: 'transit',
  adjust: 'caution',
  return: 'neutral',
  sample_cut: 'neutral',
  scrap: 'critical',
};

/** The movements a person records by hand; receipts, picks and shipping come from their flows. */
export const MANUAL_MOVEMENTS = ['transfer', 'adjust', 'sample_cut', 'scrap', 'return'] as const;
export type ManualMovement = (typeof MANUAL_MOVEMENTS)[number];

// ---------------------------------------------------------------- balances

export interface MovementFacts {
  readonly skuCode: string;
  readonly lotNumber: string;
  readonly rollNumber: string | null;
  /** Fixed-point metres, always positive; the direction is from and to. */
  readonly quantity: string;
  readonly fromLocationId: string | null;
  readonly toLocationId: string | null;
}

export interface Balance {
  readonly skuCode: string;
  readonly lotNumber: string;
  readonly locationId: string;
  /** Fixed-point metres. */
  readonly onHand: string;
}

/** Balance = Σ in − Σ out, per SKU, lot and location. Zero balances are dropped. */
export function balancesFrom(movements: readonly MovementFacts[]): Balance[] {
  const totals = new Map<string, { skuCode: string; lotNumber: string; locationId: string; onHand: bigint }>();
  const add = (skuCode: string, lotNumber: string, locationId: string, delta: bigint) => {
    const key = `${skuCode}|${lotNumber}|${locationId}`;
    const current = totals.get(key) ?? { skuCode, lotNumber, locationId, onHand: 0n };
    current.onHand += delta;
    totals.set(key, current);
  };
  for (const movement of movements) {
    const quantity = BigInt(movement.quantity);
    if (movement.toLocationId) add(movement.skuCode, movement.lotNumber, movement.toLocationId, quantity);
    if (movement.fromLocationId) add(movement.skuCode, movement.lotNumber, movement.fromLocationId, -quantity);
  }
  return [...totals.values()].filter((balance) => balance.onHand !== 0n).map((balance) => ({ ...balance, onHand: balance.onHand.toString() }));
}

/** Where a roll is now: the destination of its last movement, or nowhere when it was consumed. */
export function rollLocation(movements: readonly (MovementFacts & { readonly occurredAt: string })[], rollNumber: string): string | null {
  const own = movements.filter((movement) => movement.rollNumber === rollNumber).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const last = own[own.length - 1];
  return last ? last.toLocationId : null;
}

/** What is left on a roll: its measured length less every partial cut taken from it. */
export function rollRemaining(measuredLength: string, cuts: readonly { readonly quantity: string }[]): string {
  const taken = cuts.reduce((sum, cut) => sum + BigInt(cut.quantity), 0n);
  const left = BigInt(measuredLength) - taken;
  return (left > 0n ? left : 0n).toString();
}

// ---------------------------------------------------------------- receiving

export interface ReceiptCheck {
  readonly shipmentLineId: string;
  readonly lotNumber: string;
  readonly expected: string;
  readonly received: string;
  /** Received minus expected, fixed-point metres; negative is short. */
  readonly difference: string;
  readonly differencePercent: number;
  readonly short: boolean;
  readonly over: boolean;
}

/** Received against expected per line; a difference beyond the tolerance is a discrepancy to note. */
export function receiptCheck(lines: readonly { readonly shipmentLineId: string; readonly lotNumber: string; readonly expected: string; readonly received: string }[], tolerancePercent = 1): ReceiptCheck[] {
  return lines.map((line) => {
    const expected = BigInt(line.expected);
    const received = BigInt(line.received);
    const difference = received - expected;
    const percent = expected === 0n ? (received === 0n ? 0 : 100) : Number(divRound(difference * 10000n, expected)) / 100;
    return { shipmentLineId: line.shipmentLineId, lotNumber: line.lotNumber, expected: line.expected, received: line.received, difference: difference.toString(), differencePercent: percent, short: percent < -tolerancePercent, over: percent > tolerancePercent };
  });
}

// ---------------------------------------------------------------- reorder and value

export interface ReorderFacts {
  readonly skuCode: string;
  /** Fixed-point metres. */
  readonly reorderPoint: string;
  readonly targetLevel: string;
}

export interface LowStock {
  readonly skuCode: string;
  readonly available: string;
  readonly reorderPoint: string;
  readonly targetLevel: string;
  /** How much to order to reach the target, fixed-point metres. */
  readonly shortfall: string;
}

/** SKUs whose available metres across physical locations sit below their reorder point. */
export function lowStock(balances: readonly (Balance & { readonly physical: boolean })[], policies: readonly ReorderFacts[]): LowStock[] {
  const available = new Map<string, bigint>();
  for (const balance of balances) {
    if (!balance.physical) continue;
    available.set(balance.skuCode, (available.get(balance.skuCode) ?? 0n) + BigInt(balance.onHand));
  }
  return policies
    .map((policy) => ({ policy, available: available.get(policy.skuCode) ?? 0n }))
    .filter(({ policy, available: have }) => have < BigInt(policy.reorderPoint))
    .map(({ policy, available: have }) => ({ skuCode: policy.skuCode, available: have.toString(), reorderPoint: policy.reorderPoint, targetLevel: policy.targetLevel, shortfall: (BigInt(policy.targetLevel) - have).toString() }));
}

/** Stock valued by specific identification: each lot's metres at its landed unit cost. Fixed-point money. */
export function stockValue(balances: readonly Balance[], landedUnitCost: ReadonlyMap<string, string>): { readonly value: string; readonly valuedMetres: string; readonly unvaluedMetres: string } {
  let value = 0n;
  let valued = 0n;
  let unvalued = 0n;
  for (const balance of balances) {
    const unit = landedUnitCost.get(balance.lotNumber);
    const metres = BigInt(balance.onHand);
    if (unit === undefined) {
      unvalued += metres;
      continue;
    }
    valued += metres;
    value += divRound(BigInt(unit) * metres, QUANTITY_SCALE);
  }
  return { value: value.toString(), valuedMetres: valued.toString(), unvaluedMetres: unvalued.toString() };
}

// ---------------------------------------------------------------- views

export interface StockLocationView {
  readonly id: string;
  readonly name: string;
  readonly kind: StockLocationKind;
  readonly zone: string;
  readonly placeName: string;
  readonly isDefault: boolean;
}

export interface StockBalanceView extends Balance {
  readonly id: string;
  readonly locationName: string;
  readonly locationKind: StockLocationKind;
  readonly productName: string;
  readonly variantName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly familyCode: string;
  readonly familyName: string;
  readonly rolls: number;
  readonly updatedAt: string;
}

export interface MovementView extends MovementFacts {
  readonly id: string;
  readonly reason: MovementReason;
  readonly fromLocationName: string;
  readonly toLocationName: string;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly note: string;
  readonly occurredAt: string;
  readonly actorName: string;
}

export interface ReceiptView {
  readonly id: string;
  readonly number: string;
  readonly shipmentNumber: string;
  readonly locationName: string;
  readonly receivedOn: LocalDate;
  readonly receivedByName: string;
  readonly note: string;
  readonly lines: readonly { readonly lotNumber: string; readonly skuCode: string; readonly expected: string; readonly received: string; readonly rollsExpected: number; readonly rollsReceived: number; readonly note: string }[];
  readonly discrepancies: number;
  readonly createdAt: string;
}

export interface ReorderPolicyView extends ReorderFacts {
  readonly id: string;
  readonly productName: string;
  readonly shadeName: string;
  readonly locationName: string;
}
