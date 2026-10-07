// Commercial: quotes, sales orders, the allocation of stock to them, and what
// an order earns over landed cost. Money is fixed-point ten-thousandths;
// quantities fixed-point metres.

import { divRound } from './fixed-point';
import type { LocalDate } from './local-date';
import { QUANTITY_SCALE } from './quantity';
import type { StatusTone } from './status';

export const CUSTOMER_TYPES = ['designer', 'atelier', 'salon', 'manufacturer', 'distributor', 'wholesaler'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = { designer: 'Designer', atelier: 'Atelier', salon: 'Bridal salon', manufacturer: 'Manufacturer', distributor: 'Distributor', wholesaler: 'Wholesaler' };

export const CUSTOMER_TIERS = ['standard', 'preferred', 'key'] as const;
export type CustomerTier = (typeof CUSTOMER_TIERS)[number];
export const CUSTOMER_TIER_LABEL: Record<CustomerTier, string> = { standard: 'Standard', preferred: 'Preferred', key: 'Key account' };

export const QUOTE_STATES = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const;
export type QuoteState = (typeof QUOTE_STATES)[number];
export const QUOTE_STATE_LABEL: Record<QuoteState, string> = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' };
export const QUOTE_STATE_TONE: Record<QuoteState, StatusTone> = { draft: 'neutral', sent: 'transit', accepted: 'positive', declined: 'critical', expired: 'caution' };

export const ORDER_STATES = ['draft', 'confirmed', 'shipped', 'closed', 'cancelled'] as const;
export type SalesOrderState = (typeof ORDER_STATES)[number];
export const ORDER_STATE_LABEL: Record<SalesOrderState, string> = { draft: 'Draft', confirmed: 'Confirmed', shipped: 'Shipped', closed: 'Closed', cancelled: 'Cancelled' };
export const ORDER_STATE_TONE: Record<SalesOrderState, StatusTone> = { draft: 'neutral', confirmed: 'transit', shipped: 'transit', closed: 'positive', cancelled: 'critical' };

/** Where an order stands between confirmation and delivery, read from its allocations and shipments. */
export type FulfilmentStage = 'awaiting_stock' | 'allocated' | 'partly_allocated' | 'shipped' | 'delivered';
export const FULFILMENT_LABEL: Record<FulfilmentStage, string> = { awaiting_stock: 'Awaiting stock', partly_allocated: 'Partly allocated', allocated: 'Allocated', shipped: 'Shipped', delivered: 'Delivered' };
export const FULFILMENT_TONE: Record<FulfilmentStage, StatusTone> = { awaiting_stock: 'caution', partly_allocated: 'caution', allocated: 'transit', shipped: 'transit', delivered: 'positive' };

// ---------------------------------------------------------------- totals and margin

export interface OrderLineFacts {
  readonly id: string;
  readonly skuCode: string;
  /** Fixed-point metres. */
  readonly quantity: string;
  /** Fixed-point money per metre. */
  readonly unitPrice: string;
}

/** Line value and order total, fixed-point money. */
export function lineTotal(line: Pick<OrderLineFacts, 'quantity' | 'unitPrice'>): string {
  return divRound(BigInt(line.unitPrice) * BigInt(line.quantity), QUANTITY_SCALE).toString();
}

export function orderTotal(lines: readonly Pick<OrderLineFacts, 'quantity' | 'unitPrice'>[]): string {
  return lines.reduce((sum, line) => sum + BigInt(lineTotal(line)), 0n).toString();
}

export interface MarginFacts {
  /** Fixed-point money. */
  readonly revenue: string;
  readonly cost: string;
  readonly margin: string;
  /** Basis points of revenue; null when nothing is costed. */
  readonly marginBasisPoints: number | null;
  /** Metres whose lot has no landed cost yet. */
  readonly uncostedMetres: string;
}

/**
 * What the order earns over landed cost, allocation by allocation: each
 * allocated metre at its lot's landed unit cost against its line's price.
 * Metres not yet allocated, or on lots without a cost, are reported, not guessed.
 */
export function orderMargin(lines: readonly OrderLineFacts[], allocations: readonly { readonly lineId: string; readonly lotNumber: string; readonly quantity: string }[], landedUnitCost: ReadonlyMap<string, string>): MarginFacts {
  let revenue = 0n;
  let cost = 0n;
  let uncosted = 0n;
  for (const allocation of allocations) {
    const line = lines.find((candidate) => candidate.id === allocation.lineId);
    if (!line) continue;
    const metres = BigInt(allocation.quantity);
    const unit = landedUnitCost.get(allocation.lotNumber);
    if (unit === undefined) {
      uncosted += metres;
      continue;
    }
    revenue += divRound(BigInt(line.unitPrice) * metres, QUANTITY_SCALE);
    cost += divRound(BigInt(unit) * metres, QUANTITY_SCALE);
  }
  const margin = revenue - cost;
  return { revenue: revenue.toString(), cost: cost.toString(), margin: margin.toString(), marginBasisPoints: revenue === 0n ? null : Number(divRound(margin * 10000n, revenue)), uncostedMetres: uncosted.toString() };
}

// ---------------------------------------------------------------- allocation

export interface StockForAllocation {
  readonly lotNumber: string;
  readonly locationId: string;
  readonly locationName: string;
  /** Fixed-point metres available (on hand less what other orders hold). */
  readonly available: string;
  /** When the lot was received, for first in first out. */
  readonly receivedAt: string;
  /** Rolls placed here with what is left on each, when the lot is roll-tracked. */
  readonly rolls: readonly { readonly number: string; readonly remaining: string }[];
}

export interface AllocationPlan {
  readonly lotNumber: string;
  readonly locationId: string;
  readonly rollNumber: string | null;
  readonly quantity: string;
}

/**
 * Suggests what to allocate for a quantity: oldest lot first, whole rolls
 * while a whole roll fits, then one roll cut for the remainder; a lot without
 * rolls gives metres. Returns the plan and what could not be covered.
 */
export function suggestAllocation(quantity: string, stock: readonly StockForAllocation[]): { plan: AllocationPlan[]; short: string } {
  let need = BigInt(quantity);
  const plan: AllocationPlan[] = [];
  const ordered = [...stock].filter((entry) => BigInt(entry.available) > 0n).sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.lotNumber.localeCompare(b.lotNumber));
  for (const entry of ordered) {
    if (need <= 0n) break;
    let left = BigInt(entry.available);
    if (entry.rolls.length > 0) {
      // Roll order follows the roll number, numerically: -9 before -10 before -100.
      const index = (number: string) => Number(/(\d+)$/.exec(number)?.[1] ?? 0);
      const rolls = [...entry.rolls].sort((a, b) => index(a.number) - index(b.number) || a.number.localeCompare(b.number));
      // Whole rolls first, largest need first; the last one may be cut.
      for (const roll of rolls) {
        if (need <= 0n || left <= 0n) break;
        const remaining = BigInt(roll.remaining);
        if (remaining <= 0n) continue;
        const take = remaining <= need ? remaining : need;
        if (take > left) continue;
        plan.push({ lotNumber: entry.lotNumber, locationId: entry.locationId, rollNumber: roll.number, quantity: take.toString() });
        need -= take;
        left -= take;
      }
    } else {
      const take = left <= need ? left : need;
      plan.push({ lotNumber: entry.lotNumber, locationId: entry.locationId, rollNumber: null, quantity: take.toString() });
      need -= take;
    }
  }
  return { plan, short: (need > 0n ? need : 0n).toString() };
}

/** Fulfilment of an order from what is allocated and shipped against each line. */
export function fulfilmentOf(lines: readonly { readonly quantity: string; readonly allocated: string; readonly shipped: string }[], delivered: boolean): { stage: FulfilmentStage; progress: number } {
  const ordered = lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
  const allocated = lines.reduce((sum, line) => sum + BigInt(line.allocated), 0n);
  const shipped = lines.reduce((sum, line) => sum + BigInt(line.shipped), 0n);
  if (ordered === 0n) return { stage: 'awaiting_stock', progress: 0 };
  if (delivered && shipped >= ordered) return { stage: 'delivered', progress: 1 };
  if (shipped >= ordered) return { stage: 'shipped', progress: 1 };
  if (shipped > 0n) return { stage: 'shipped', progress: Number((shipped * 1000n) / ordered) / 1000 };
  if (allocated >= ordered) return { stage: 'allocated', progress: 0.5 };
  if (allocated > 0n) return { stage: 'partly_allocated', progress: Number((allocated * 500n) / ordered) / 1000 };
  return { stage: 'awaiting_stock', progress: 0 };
}

// ---------------------------------------------------------------- views

export interface QuoteLineView extends OrderLineFacts {
  readonly lineNo: number;
  readonly productName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly leadTimeDays: number | null;
  readonly note: string;
}

export interface QuoteSummary {
  readonly id: string;
  readonly number: string;
  readonly state: QuoteState;
  readonly customerId: string;
  readonly customerName: string;
  readonly currency: string;
  readonly validUntil: LocalDate | null;
  readonly total: string;
  readonly lineCount: number;
  readonly products: readonly string[];
  readonly orderNumber: string | null;
  readonly createdAt: string;
}

export interface QuoteDetail extends QuoteSummary {
  readonly contactName: string;
  readonly incoterm: string;
  readonly namedPlace: string;
  readonly paymentTerms: string;
  readonly notes: string;
  readonly sentOn: LocalDate | null;
  readonly lines: readonly QuoteLineView[];
}

export interface OrderLineView extends OrderLineFacts {
  readonly lineNo: number;
  readonly productName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly allocated: string;
  readonly shipped: string;
  readonly allocations: readonly { readonly id: string; readonly lotNumber: string; readonly rollNumber: string | null; readonly locationName: string; readonly quantity: string; readonly shipped: boolean }[];
}

export interface SalesOrderSummary {
  readonly id: string;
  readonly number: string;
  readonly state: SalesOrderState;
  readonly stage: FulfilmentStage;
  readonly progress: number;
  readonly customerId: string;
  readonly customerName: string;
  readonly currency: string;
  readonly requestedDelivery: LocalDate | null;
  readonly total: string;
  /** Fixed-point metres ordered. */
  readonly metres: string;
  readonly lineCount: number;
  readonly products: readonly string[];
  readonly shipmentNumbers: readonly string[];
  readonly confirmedOn: LocalDate | null;
  readonly createdAt: string;
}

export interface SalesOrderDetail extends SalesOrderSummary {
  readonly quoteNumber: string | null;
  readonly contactName: string;
  readonly incoterm: string;
  readonly namedPlace: string;
  readonly paymentTerms: string;
  readonly shipToName: string;
  readonly shipToAddress: string;
  readonly notes: string;
  readonly lines: readonly OrderLineView[];
  readonly invoices: readonly { readonly id: string; readonly number: string; readonly amount: string; readonly currency: string; readonly issuedOn: LocalDate | null; readonly dueOn: LocalDate | null; readonly paidOn: LocalDate | null }[];
}

export interface CustomerProfileView {
  readonly type: CustomerType | null;
  readonly tier: CustomerTier;
  readonly paymentTerms: string;
  readonly currency: string;
  readonly notes: string;
}
