import { describe, expect, it } from 'vitest';
import type { LocalDate } from './local-date';
import { customerCan, invitationState, invoiceOutstanding, invoiceStanding, leavesAnAdmin, legsArrived, orderShippedPercent, quoteStanding, quoteTotal, shipmentArrival } from './portal';

const day = (value: string) => value as LocalDate;

describe('customer portal', () => {
  it('gives each role inside an account only its own actions', () => {
    expect(customerCan('viewer', 'read')).toBe(true);
    expect(customerCan('viewer', 'answer_quote')).toBe(false);
    expect(customerCan('buyer', 'answer_quote')).toBe(true);
    expect(customerCan('buyer', 'manage_team')).toBe(false);
    expect(customerCan('admin', 'manage_team')).toBe(true);
  });

  it('reads an invitation from its dates', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(invitationState({ acceptedAt: null, revokedAt: null, expiresAt: '2026-11-20T00:00:00Z' }, now)).toBe('open');
    expect(invitationState({ acceptedAt: null, revokedAt: null, expiresAt: '2026-11-01T00:00:00Z' }, now)).toBe('expired');
    expect(invitationState({ acceptedAt: '2026-11-02T00:00:00Z', revokedAt: null, expiresAt: '2026-11-01T00:00:00Z' }, now)).toBe('accepted');
    expect(invitationState({ acceptedAt: null, revokedAt: '2026-11-02T00:00:00Z', expiresAt: '2026-11-20T00:00:00Z' }, now)).toBe('revoked');
  });

  it('never leaves an account without an active admin', () => {
    const team = [
      { uid: 'a', role: 'admin' as const, status: 'active' },
      { uid: 'b', role: 'buyer' as const, status: 'active' },
    ];
    expect(leavesAnAdmin(team, { uid: 'a', role: 'buyer' })).toBe(false);
    expect(leavesAnAdmin(team, { uid: 'a', status: 'suspended' })).toBe(false);
    expect(leavesAnAdmin(team, { uid: 'b', role: 'admin' })).toBe(true);
    expect(leavesAnAdmin([...team, { uid: 'c', role: 'admin', status: 'active' }], { uid: 'a', role: 'viewer' })).toBe(true);
  });

  it('totals a quote and reads a sent quote past its date as expired', () => {
    expect(quoteTotal([{ quantity: '1500000', unitPrice: '42000' }, { quantity: '500000', unitPrice: '10000' }])).toBe('68000000');
    expect(quoteStanding({ state: 'sent', validUntil: '2026-11-30' }, day('2026-11-10'))).toBe('awaiting_answer');
    expect(quoteStanding({ state: 'sent', validUntil: '2026-11-01' }, day('2026-11-10'))).toBe('expired');
    expect(quoteStanding({ state: 'accepted', validUntil: '2026-11-01' }, day('2026-11-10'))).toBe('accepted');
  });

  it('reads where an invoice stands from what was paid and when it is due', () => {
    expect(invoiceStanding({ amount: '1000000', paidAmount: '1000000', paidOn: '2026-11-01', dueOn: '2026-11-05' }, day('2026-11-10'))).toBe('paid');
    expect(invoiceStanding({ amount: '1000000', paidAmount: null, paidOn: null, dueOn: '2026-11-05' }, day('2026-11-10'))).toBe('overdue');
    expect(invoiceStanding({ amount: '1000000', paidAmount: '300000', paidOn: null, dueOn: '2026-11-30' }, day('2026-11-10'))).toBe('part_paid');
    expect(invoiceStanding({ amount: '1000000', paidAmount: null, paidOn: null, dueOn: null }, day('2026-11-10'))).toBe('due');
    expect(invoiceOutstanding({ amount: '1000000', paidAmount: '300000' })).toBe('700000');
  });

  it('counts only shipped goods on live shipments', () => {
    const lines = [
      { quantity: '1000000', shipped: [{ quantity: '600000', shipment: { state: 'booked' } }, { quantity: '400000', shipment: { state: 'cancelled' } }] },
      { quantity: '1000000', shipped: [] },
    ];
    expect(orderShippedPercent(lines)).toBe(30);
  });

  it('expects a shipment when its last leg arrives', () => {
    const legs = [
      { sequence: 2, plannedEta: '2026-12-01', eta: '2026-12-04', ata: null },
      { sequence: 1, plannedEta: '2026-11-20', eta: null, ata: '2026-11-21' },
    ];
    expect(shipmentArrival(legs)).toEqual({ date: '2026-12-04', arrived: false });
    expect(legsArrived(legs)).toEqual({ done: 1, total: 2 });
    expect(shipmentArrival([])).toEqual({ date: null, arrived: false });
  });
});

describe('customer documents', () => {
  it('keeps the mill\'s papers and inspection reports inside', async () => {
    const { customerMayOpenDocument } = await import('./portal');
    expect(customerMayOpenDocument('packing_list', 'shipment', 'outbound')).toBe(true);
    expect(customerMayOpenDocument('bill_of_lading', 'shipment', 'direct')).toBe(false);
    expect(customerMayOpenDocument('commercial_invoice', 'shipment', 'outbound')).toBe(false);
    expect(customerMayOpenDocument('commercial_invoice', 'sales_order')).toBe(true);
    expect(customerMayOpenDocument('inspection_report', 'sales_order')).toBe(false);
    expect(customerMayOpenDocument('purchase_order', 'quote')).toBe(false);
  });
});
