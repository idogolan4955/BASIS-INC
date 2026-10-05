// Roles, the module index and who may see what.
// The role lives in the Firebase Auth custom claim. `@auth` on every connector
// operation and the guard in every function are the control; this file is the
// single catalogue they are written from, and what navigation is filtered by.

export const ROLES = [
  'owner',
  'operations',
  'purchasing',
  'qc',
  'logistics',
  'sales',
  'marketing',
  'finance',
  'viewer',
] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  operations: 'Operations manager',
  purchasing: 'Purchasing',
  qc: 'QC inspector',
  logistics: 'Logistics coordinator',
  sales: 'Sales',
  marketing: 'Marketing',
  finance: 'Finance',
  viewer: 'Viewer',
};

export const MODULE_KEYS = [
  'operations',
  'products',
  'suppliers',
  'manufacturing',
  'qc',
  'inventory',
  'logistics',
  'orders',
  'customers',
  'marketing',
  'website',
  'documents',
  'costing',
  'analytics',
  'settings',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export interface ModuleDefinition {
  readonly key: ModuleKey;
  /** Index number, as on a swatch book. */
  readonly number: string;
  readonly name: string;
  readonly path: string;
  readonly summary: string;
  /** Implementation-plan phase that delivers the module. */
  readonly phase: string;
}

export const MODULES: readonly ModuleDefinition[] = [
  { key: 'operations', number: '01', name: 'Operations', path: '/operations', summary: 'Order-to-stock pipeline, calendar, tasks', phase: 'P4' },
  { key: 'products', number: '02', name: 'Products', path: '/products', summary: 'Families, products, variants, SKUs, Shade System', phase: 'Phase 2' },
  { key: 'suppliers', number: '03', name: 'Suppliers', path: '/suppliers', summary: 'Suppliers, factories, quotations, performance', phase: 'Phase 2' },
  { key: 'manufacturing', number: '04', name: 'Manufacturing', path: '/manufacturing', summary: 'Purchase orders, production runs, milestones', phase: 'P4' },
  { key: 'qc', number: '05', name: 'QC', path: '/qc', summary: 'Inspections, defects, corrective actions', phase: 'P5' },
  { key: 'inventory', number: '06', name: 'Inventory', path: '/inventory', summary: 'Stock by SKU, lots, rolls, movements', phase: 'P7' },
  { key: 'logistics', number: '07', name: 'Logistics', path: '/logistics', summary: 'Shipments, arrivals, customs, partners', phase: 'P6' },
  { key: 'orders', number: '08', name: 'Orders', path: '/orders', summary: 'Quotes, sales orders, allocation, fulfilment', phase: 'P8' },
  { key: 'customers', number: '09', name: 'Customers', path: '/customers', summary: 'Companies, leads, sample requests, pipeline', phase: 'P8' },
  { key: 'marketing', number: '10', name: 'Marketing', path: '/marketing', summary: 'Campaigns, segments, sample kits', phase: 'P9' },
  { key: 'website', number: '11', name: 'Website', path: '/website', summary: 'Pages, fabric stories, media, publishing', phase: 'B4' },
  { key: 'documents', number: '12', name: 'Documents', path: '/documents', summary: 'Every document, expiring, missing', phase: 'Phase 2' },
  { key: 'costing', number: '13', name: 'Costing', path: '/costing', summary: 'Landed cost, price lists, margins, FX', phase: 'P6' },
  { key: 'analytics', number: '14', name: 'Analytics', path: '/analytics', summary: 'Supply, logistics, commercial, inventory', phase: 'P9' },
  { key: 'settings', number: '15', name: 'Settings', path: '/settings', summary: 'Users, roles, reference data, templates', phase: 'Phase 1' },
];

export type AccessLevel = 'manage' | 'limited' | 'read' | 'none';

const M: AccessLevel = 'manage';
const L: AccessLevel = 'limited';
const R: AccessLevel = 'read';
const N: AccessLevel = 'none';

/** The visibility table from docs/INFORMATION_ARCHITECTURE.md §A7. */
export const MODULE_ACCESS: Record<ModuleKey, Record<Role, AccessLevel>> = {
  //               owner  operations purchasing qc  logistics sales marketing finance viewer
  operations:    { owner: M, operations: M, purchasing: M, qc: L, logistics: M, sales: L, marketing: N, finance: R, viewer: R },
  products:      { owner: M, operations: M, purchasing: M, qc: R, logistics: R, sales: R, marketing: R, finance: R, viewer: R },
  suppliers:     { owner: M, operations: M, purchasing: M, qc: R, logistics: R, sales: N, marketing: N, finance: R, viewer: N },
  manufacturing: { owner: M, operations: M, purchasing: M, qc: R, logistics: R, sales: N, marketing: N, finance: R, viewer: R },
  qc:            { owner: M, operations: M, purchasing: R, qc: M, logistics: R, sales: N, marketing: N, finance: N, viewer: R },
  inventory:     { owner: M, operations: M, purchasing: R, qc: R, logistics: M, sales: R, marketing: N, finance: R, viewer: R },
  logistics:     { owner: M, operations: M, purchasing: R, qc: N, logistics: M, sales: L, marketing: N, finance: R, viewer: R },
  orders:        { owner: M, operations: M, purchasing: N, qc: N, logistics: L, sales: M, marketing: N, finance: R, viewer: R },
  customers:     { owner: M, operations: R, purchasing: N, qc: N, logistics: N, sales: M, marketing: M, finance: R, viewer: N },
  marketing:     { owner: M, operations: N, purchasing: N, qc: N, logistics: N, sales: L, marketing: M, finance: N, viewer: N },
  website:       { owner: M, operations: N, purchasing: N, qc: N, logistics: N, sales: N, marketing: M, finance: N, viewer: N },
  documents:     { owner: M, operations: M, purchasing: L, qc: L, logistics: L, sales: L, marketing: N, finance: R, viewer: R },
  costing:       { owner: M, operations: M, purchasing: L, qc: N, logistics: L, sales: N, marketing: N, finance: M, viewer: N },
  analytics:     { owner: M, operations: M, purchasing: L, qc: L, logistics: L, sales: L, marketing: L, finance: M, viewer: R },
  settings:      { owner: M, operations: L, purchasing: N, qc: N, logistics: N, sales: N, marketing: N, finance: N, viewer: N },
};

export function moduleAccess(role: Role, module: ModuleKey): AccessLevel {
  return MODULE_ACCESS[module][role];
}

export function canOpenModule(role: Role, module: ModuleKey): boolean {
  return moduleAccess(role, module) !== 'none';
}

export function canManageModule(role: Role, module: ModuleKey): boolean {
  return moduleAccess(role, module) === 'manage';
}

export function modulesFor(role: Role): ModuleDefinition[] {
  return MODULES.filter((definition) => canOpenModule(role, definition.key));
}

/** Purchase prices, landed costs and supplier identity. A data rule, not a display rule. */
const COST_ROLES: readonly Role[] = ['owner', 'operations', 'purchasing', 'finance'];
/** Freight, duty, brokerage and delivery costs on shipments. */
const LOGISTICS_COST_ROLES: readonly Role[] = ['owner', 'operations', 'logistics', 'finance'];

export function canViewCosts(role: Role): boolean {
  return COST_ROLES.includes(role);
}

export function canViewLogisticsCosts(role: Role): boolean {
  return LOGISTICS_COST_ROLES.includes(role);
}

/** Only an owner may invite people and change roles. */
export function canManageUsers(role: Role): boolean {
  return role === 'owner';
}

/** The `@auth` expression for a set of roles, as written in connector files. */
export function authExpression(roles: readonly Role[]): string {
  return roles.map((role) => `auth.token.role == '${role}'`).join(' || ');
}
