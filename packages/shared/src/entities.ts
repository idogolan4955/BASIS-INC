import type { ModuleKey } from './access';

// Which module owns each kind of record, and where its sheet opens.
// Cross-cutting records (alerts, tasks, documents, timeline) point at an
// entity by type and id; this is how that pointer becomes a link.

export const ENTITY_MODULE: Record<string, ModuleKey> = {
  product: 'products',
  sku: 'products',
  shade: 'products',
  supplier: 'suppliers',
  factory: 'suppliers',
  quotation: 'suppliers',
  purchase_order: 'manufacturing',
  production_run: 'manufacturing',
  inspection: 'qc',
  corrective_action: 'qc',
  lot: 'inventory',
  roll: 'inventory',
  shipment: 'logistics',
  customs_entry: 'logistics',
  sales_order: 'orders',
  quote: 'orders',
  receipt: 'inventory',
  customer: 'customers',
  lead: 'customers',
  sample_request: 'customers',
  inquiry: 'customers',
  campaign: 'marketing',
  page: 'website',
  document: 'documents',
  cost_allocation: 'costing',
  user: 'settings',
};

const ENTITY_PATH: Record<string, string> = {
  product: '/products',
  sku: '/products/skus',
  shade: '/products/shades',
  supplier: '/suppliers',
  factory: '/suppliers/factories',
  quotation: '/suppliers/quotations',
  purchase_order: '/manufacturing/purchase-orders',
  production_run: '/manufacturing/runs',
  inspection: '/qc/inspections',
  corrective_action: '/qc/corrective-actions',
  lot: '/inventory/lots',
  roll: '/inventory/rolls',
  shipment: '/logistics/shipments',
  customs_entry: '/logistics/customs',
  sales_order: '/orders',
  quote: '/orders/quotes',
  receipt: '/inventory/receipts',
  customer: '/customers',
  lead: '/customers/leads',
  sample_request: '/customers/sample-requests',
  inquiry: '/customers/inquiries',
  campaign: '/marketing/campaigns',
  page: '/website/pages',
  document: '/documents',
  cost_allocation: '/costing/landed',
  user: '/settings/users',
};

export function moduleForEntity(entityType: string): ModuleKey {
  return ENTITY_MODULE[entityType] ?? 'operations';
}

export function entityPath(entityType: string, entityId: string): string {
  const base = ENTITY_PATH[entityType];
  return base ? `${base}/${encodeURIComponent(entityId)}` : '/operations';
}
