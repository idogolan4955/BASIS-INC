import { daysBetween, type LocalDate } from './local-date';
import { lineTotal, orderTotal } from './commercial';

// The customer portal (docs/CUSTOMER_PORTAL_PLAN.md). Who may do what inside
// a customer account, how an invitation lives, and the facts the portal
// derives for a customer: what a quote totals, how far an order has shipped,
// where an invoice stands, when a shipment is expected. Nothing here is a
// hand-set status; everything is read from the records.

export const CUSTOMER_USER_ROLES = ['admin', 'buyer', 'viewer'] as const;
export type CustomerUserRole = (typeof CUSTOMER_USER_ROLES)[number];

export const CUSTOMER_ROLE_LABEL: Record<CustomerUserRole, string> = { admin: 'Admin', buyer: 'Buyer', viewer: 'Viewer' };
export const CUSTOMER_ROLE_SUMMARY: Record<CustomerUserRole, string> = {
  admin: 'Everything a buyer can do, and the team and the addresses.',
  buyer: 'Answers quotes and asks for samples.',
  viewer: 'Reads the account.',
};

export type CustomerAction = 'read' | 'answer_quote' | 'request_samples' | 'manage_team' | 'manage_addresses';

const ALLOWED: Record<CustomerUserRole, readonly CustomerAction[]> = {
  admin: ['read', 'answer_quote', 'request_samples', 'manage_team', 'manage_addresses'],
  buyer: ['read', 'answer_quote', 'request_samples'],
  viewer: ['read'],
};

export function customerCan(role: CustomerUserRole, action: CustomerAction): boolean {
  return ALLOWED[role].includes(action);
}

/** Staff who invite and manage customer users (plan §11.3). */
export const PORTAL_STAFF_ROLES = ['owner', 'operations', 'sales'] as const;

/** An invitation is good for this long; only its hash is stored. */
export const INVITATION_DAYS = 14;
/** The member number's prefix: BM-26-0001. */
export const MEMBER_PREFIX = 'BM';

export type InvitationState = 'open' | 'accepted' | 'revoked' | 'expired';

export function invitationState(invitation: { acceptedAt: string | null; revokedAt: string | null; expiresAt: string }, now: Date = new Date()): InvitationState {
  if (invitation.acceptedAt) return 'accepted';
  if (invitation.revokedAt) return 'revoked';
  return new Date(invitation.expiresAt).getTime() <= now.getTime() ? 'expired' : 'open';
}

/** The account must keep at least one active admin. */
export function leavesAnAdmin(users: readonly { uid: string; role: CustomerUserRole; status: string }[], change: { uid: string; role?: CustomerUserRole; status?: string }): boolean {
  return users.some((user) => {
    const role = user.uid === change.uid ? (change.role ?? user.role) : user.role;
    const status = user.uid === change.uid ? (change.status ?? user.status) : user.status;
    return role === 'admin' && status === 'active';
  });
}

// ---------------------------------------------------------------- facts for the customer

interface PricedLine {
  readonly quantity: string;
  readonly unitPrice: string;
}

export function quoteTotal(lines: readonly PricedLine[]): string {
  return orderTotal(lines);
}

export { lineTotal as portalLineTotal };

export type QuoteStanding = 'awaiting_answer' | 'accepted' | 'declined' | 'expired';

/** A sent quote past its validity date reads as expired, whatever the stored state says. */
export function quoteStanding(quote: { state: string; validUntil?: string | null }, today: LocalDate): QuoteStanding {
  if (quote.state === 'accepted') return 'accepted';
  if (quote.state === 'declined') return 'declined';
  if (quote.state === 'expired') return 'expired';
  if (quote.validUntil && daysBetween(quote.validUntil as LocalDate, today) > 0) return 'expired';
  return 'awaiting_answer';
}

export type InvoiceStanding = 'paid' | 'part_paid' | 'overdue' | 'due';

export function invoiceStanding(invoice: { amount: string; paidAmount?: string | null; paidOn?: string | null; dueOn?: string | null }, today: LocalDate): InvoiceStanding {
  const paid = BigInt(invoice.paidAmount ?? '0');
  if (invoice.paidOn && paid >= BigInt(invoice.amount)) return 'paid';
  if (paid >= BigInt(invoice.amount) && BigInt(invoice.amount) > 0n) return 'paid';
  if (invoice.dueOn && daysBetween(invoice.dueOn as LocalDate, today) > 0) return 'overdue';
  return paid > 0n ? 'part_paid' : 'due';
}

export function invoiceOutstanding(invoice: { amount: string; paidAmount?: string | null }): string {
  const left = BigInt(invoice.amount) - BigInt(invoice.paidAmount ?? '0');
  return (left > 0n ? left : 0n).toString();
}

/** How much of each order line has been put on a shipment that is not cancelled, in thousandths. */
export function shippedQuantity(line: { shipped: readonly { quantity: string; shipment: { state: string } }[] }): string {
  return line.shipped.filter((item) => item.shipment.state !== 'cancelled' && item.shipment.state !== 'draft').reduce((sum, item) => sum + BigInt(item.quantity), 0n).toString();
}

/** The share of an order already shipped, 0–100, by quantity. */
export function orderShippedPercent(lines: readonly { quantity: string; shipped: readonly { quantity: string; shipment: { state: string } }[] }[]): number {
  const ordered = lines.reduce((sum, line) => sum + BigInt(line.quantity), 0n);
  if (ordered === 0n) return 0;
  const shipped = lines.reduce((sum, line) => sum + BigInt(shippedQuantity(line)), 0n);
  const capped = shipped > ordered ? ordered : shipped;
  return Number((capped * 100n) / ordered);
}

export interface PortalLeg {
  readonly sequence: number;
  readonly plannedEta?: string | null;
  readonly eta?: string | null;
  readonly ata?: string | null;
  readonly atd?: string | null;
}

/** The expected arrival at the end of the journey: the last leg's actual, else its current or planned estimate. */
export function shipmentArrival(legs: readonly PortalLeg[]): { date: string | null; arrived: boolean } {
  const last = [...legs].sort((a, b) => a.sequence - b.sequence).at(-1);
  if (!last) return { date: null, arrived: false };
  if (last.ata) return { date: last.ata, arrived: true };
  return { date: last.eta ?? last.plannedEta ?? null, arrived: false };
}

/** Where the goods are: the first leg that has not arrived, or the end. */
export function legsArrived(legs: readonly PortalLeg[]): { done: number; total: number } {
  const sorted = [...legs].sort((a, b) => a.sequence - b.sequence);
  return { done: sorted.filter((leg) => leg.ata).length, total: sorted.length };
}

// ---------------------------------------------------------------- documents a customer may open

/**
 * Filed documents a customer may open, by kind and by the record they are
 * filed on. Commercial invoices only on their own orders and quotes: on a
 * shipment one may be the mill's, with purchase prices. Inspection reports
 * name the mill and stay inside.
 */
const CUSTOMER_DOCUMENT_KINDS: Record<string, readonly string[]> = {
  quote: ['quotation', 'technical_sheet', 'certificate', 'other'],
  sales_order: ['commercial_invoice', 'quotation', 'packing_list', 'technical_sheet', 'certificate', 'certificate_of_origin', 'other'],
  shipment: ['packing_list', 'bill_of_lading', 'air_waybill', 'certificate_of_origin', 'certificate'],
};

export function customerMayOpenDocument(kind: string, entityType: string, shipmentFlow?: string): boolean {
  // A direct shipment's papers carry the mill as shipper.
  if (entityType === 'shipment' && shipmentFlow !== 'outbound') return false;
  return (CUSTOMER_DOCUMENT_KINDS[entityType] ?? []).includes(kind);
}

/** The site the portal lives on; invitation links point here. */
export const PORTAL_ORIGIN = 'https://basis-inc.web.app';

export function invitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}/account/invite/${encodeURIComponent(token)}`;
}
