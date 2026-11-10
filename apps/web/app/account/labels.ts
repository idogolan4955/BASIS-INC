import type { InvoiceStanding, QuoteStanding, StatusTone } from '@basis/shared';

// What the portal calls each state, and the tone of its chip. Every label is
// a key in the portal's dictionary.

export const QUOTE: Record<QuoteStanding, { label: string; tone: StatusTone }> = {
  awaiting_answer: { label: 'Waiting for your answer', tone: 'caution' },
  accepted: { label: 'Accepted', tone: 'positive' },
  declined: { label: 'Declined', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

export const ORDER: Record<string, { label: string; tone: StatusTone }> = {
  confirmed: { label: 'In progress', tone: 'transit' },
  shipped: { label: 'Shipped', tone: 'transit' },
  closed: { label: 'Completed', tone: 'positive' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const INVOICE: Record<InvoiceStanding, { label: string; tone: StatusTone }> = {
  paid: { label: 'Paid', tone: 'positive' },
  part_paid: { label: 'Part paid', tone: 'caution' },
  overdue: { label: 'Overdue', tone: 'critical' },
  due: { label: 'Due', tone: 'neutral' },
};

export const HEALTH: Record<string, { label: string; tone: StatusTone }> = {
  on_track: { label: 'On track', tone: 'positive' },
  at_risk: { label: 'At risk', tone: 'caution' },
  delayed: { label: 'Delayed', tone: 'critical' },
  blocked: { label: 'Held', tone: 'critical' },
};

export const SHIPMENT_STATE: Record<string, string> = { draft: 'Being prepared', booked: 'Booked', closed: 'Delivered', cancelled: 'Cancelled' };

export const MODE: Record<string, string> = { sea: 'Sea', air: 'Air', courier: 'Courier', road: 'Road' };

export const LEG: Record<string, string> = { pickup: 'Pickup', consolidation: 'Consolidation', export_handling: 'Export handling', main_carriage: 'Main carriage', customs: 'Customs', local_delivery: 'Delivery' };

export const PLACE: Record<string, string> = { factory: 'Mill', warehouse: 'Warehouse', consolidation_hub: 'Hub', port: 'Port', airport: 'Airport', office: 'Office', customer_site: 'Your address' };

export const REFERENCE: Record<string, string> = { booking: 'Booking', mbl: 'Bill of lading', hbl: 'House bill', awb: 'Air waybill', container: 'Container', seal: 'Seal', tracking: 'Tracking' };

export const SAMPLE_STATE: Record<string, { label: string; tone: StatusTone }> = {
  new: { label: 'Received', tone: 'caution' },
  handled: { label: 'Sent', tone: 'positive' },
};

export const DOCUMENT_KIND: Record<string, string> = {
  quotation: 'Quotation',
  packing_list: 'Packing list',
  bill_of_lading: 'Bill of lading',
  air_waybill: 'Air waybill',
  certificate_of_origin: 'Certificate of origin',
  certificate: 'Certificate',
  technical_sheet: 'Technical sheet',
  commercial_invoice: 'Invoice',
  other: 'Document',
};
