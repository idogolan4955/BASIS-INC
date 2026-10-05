import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum Role {
  owner = "owner",
  operations = "operations",
  purchasing = "purchasing",
  qc = "qc",
  logistics = "logistics",
  sales = "sales",
  marketing = "marketing",
  finance = "finance",
  viewer = "viewer",
  supplier = "supplier",
  customer = "customer",
};



export interface Alert_Key {
  id: UUIDString;
  __typename?: 'Alert_Key';
}

export interface AuditEvent_Key {
  id: UUIDString;
  __typename?: 'AuditEvent_Key';
}

export interface Certification_Key {
  id: UUIDString;
  __typename?: 'Certification_Key';
}

export interface CompanyRole_Key {
  id: UUIDString;
  __typename?: 'CompanyRole_Key';
}

export interface Company_Key {
  id: UUIDString;
  __typename?: 'Company_Key';
}

export interface Contact_Key {
  id: UUIDString;
  __typename?: 'Contact_Key';
}

export interface Country_Key {
  code: string;
  __typename?: 'Country_Key';
}

export interface Currency_Key {
  code: string;
  __typename?: 'Currency_Key';
}

export interface DocumentLink_Key {
  id: UUIDString;
  __typename?: 'DocumentLink_Key';
}

export interface Document_Key {
  id: UUIDString;
  __typename?: 'Document_Key';
}

export interface DomainEvent_Key {
  id: UUIDString;
  __typename?: 'DomainEvent_Key';
}

export interface FabricFamily_Key {
  code: string;
  __typename?: 'FabricFamily_Key';
}

export interface Factory_Key {
  id: UUIDString;
  __typename?: 'Factory_Key';
}

export interface Incoterm_Key {
  code: string;
  __typename?: 'Incoterm_Key';
}

export interface LegalEntity_Key {
  id: UUIDString;
  __typename?: 'LegalEntity_Key';
}

export interface ListCountriesPublicData {
  countries: ({
    code: string;
    name: string;
  } & Country_Key)[];
}

export interface Location_Key {
  id: UUIDString;
  __typename?: 'Location_Key';
}

export interface NumberSequence_Key {
  prefix: string;
  year: number;
  __typename?: 'NumberSequence_Key';
}

export interface PriceListItem_Key {
  id: UUIDString;
  __typename?: 'PriceListItem_Key';
}

export interface PriceList_Key {
  code: string;
  __typename?: 'PriceList_Key';
}

export interface ProductVariant_Key {
  id: UUIDString;
  __typename?: 'ProductVariant_Key';
}

export interface Product_Key {
  code: string;
  __typename?: 'Product_Key';
}

export interface PutUp_Key {
  code: string;
  __typename?: 'PutUp_Key';
}

export interface RolePermission_Key {
  role: Role;
  permission: string;
  __typename?: 'RolePermission_Key';
}

export interface ShadeCollection_Key {
  code: string;
  __typename?: 'ShadeCollection_Key';
}

export interface ShadeStandard_Key {
  id: UUIDString;
  __typename?: 'ShadeStandard_Key';
}

export interface Shade_Key {
  code: string;
  __typename?: 'Shade_Key';
}

export interface Sku_Key {
  code: string;
  __typename?: 'Sku_Key';
}

export interface SupplierItem_Key {
  id: UUIDString;
  __typename?: 'SupplierItem_Key';
}

export interface SupplierPrice_Key {
  id: UUIDString;
  __typename?: 'SupplierPrice_Key';
}

export interface SupplierProfile_Key {
  id: UUIDString;
  __typename?: 'SupplierProfile_Key';
}

export interface Task_Key {
  id: UUIDString;
  __typename?: 'Task_Key';
}

export interface TimelineEvent_Key {
  id: UUIDString;
  __typename?: 'TimelineEvent_Key';
}

export interface Uom_Key {
  code: string;
  __typename?: 'Uom_Key';
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

interface ListCountriesPublicRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCountriesPublicData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCountriesPublicData, undefined>;
  operationName: string;
}
export const listCountriesPublicRef: ListCountriesPublicRef;

export function listCountriesPublic(options?: ExecuteQueryOptions): QueryPromise<ListCountriesPublicData, undefined>;
export function listCountriesPublic(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCountriesPublicData, undefined>;

