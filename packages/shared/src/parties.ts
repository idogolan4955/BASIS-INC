// Read models for companies, contacts, locations and factories.

import type { StatusTone } from './status';

export const COMPANY_ROLE_KINDS = [
  'supplier',
  'factory_operator',
  'customer',
  'freight_forwarder',
  'customs_broker',
  'carrier',
  'inspection_agency',
  'warehouse_operator',
] as const;
export type CompanyRoleKind = (typeof COMPANY_ROLE_KINDS)[number];

export const COMPANY_ROLE_LABEL: Record<CompanyRoleKind, string> = {
  supplier: 'Supplier',
  factory_operator: 'Factory operator',
  customer: 'Customer',
  freight_forwarder: 'Freight forwarder',
  customs_broker: 'Customs broker',
  carrier: 'Carrier',
  inspection_agency: 'Inspection agency',
  warehouse_operator: 'Warehouse operator',
};

export const COMPANY_STATUSES = ['prospect', 'active', 'inactive'] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_STATUS_LABEL: Record<CompanyStatus, string> = {
  prospect: 'Prospect',
  active: 'Active',
  inactive: 'Inactive',
};

export const COMPANY_STATUS_TONE: Record<CompanyStatus, StatusTone> = {
  prospect: 'neutral',
  active: 'positive',
  inactive: 'critical',
};

export const LOCATION_TYPES = ['factory', 'warehouse', 'consolidation_hub', 'port', 'airport', 'office', 'customer_site'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  factory: 'Factory',
  warehouse: 'Warehouse',
  consolidation_hub: 'Consolidation hub',
  port: 'Port',
  airport: 'Airport',
  office: 'Office',
  customer_site: 'Customer site',
};

export interface CompanySummary {
  readonly id: string;
  readonly legalName: string;
  readonly tradingName: string;
  readonly name: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly website: string;
  readonly status: CompanyStatus;
  readonly roles: readonly CompanyRoleKind[];
  readonly contactCount: number;
}

export interface ContactView {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly email: string;
  readonly phone: string;
  readonly messaging: string;
  readonly language: string;
  readonly isPrimary: boolean;
  readonly status: 'active' | 'left';
}

export interface LocationView {
  readonly id: string;
  readonly type: LocationType;
  readonly name: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly timeZone: string;
  readonly locationCode: string;
}

export interface FactoryView {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly countryName: string;
  readonly capabilities: readonly { readonly familyCode: string; readonly processes: readonly string[]; readonly note?: string }[];
  readonly auditStatus: string;
}

export interface CompanyDetail extends CompanySummary {
  readonly registrationId: string;
  readonly taxId: string;
  readonly defaultCurrency: string;
  readonly notes: string;
  readonly supplierProfile: {
    readonly paymentTerms: string;
    readonly defaultIncoterm: string;
    readonly namedPlace: string;
    readonly standardLeadTimeDays: number | null;
    readonly onboardingStatus: string;
  } | null;
  readonly contacts: readonly ContactView[];
  readonly locations: readonly LocationView[];
  readonly factories: readonly FactoryView[];
}

export function companyDisplayName(company: { legalName: string; tradingName: string }): string {
  return company.tradingName || company.legalName;
}
