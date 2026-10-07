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

export interface ApiToken_Key {
  id: UUIDString;
  __typename?: 'ApiToken_Key';
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

export interface Connector_Key {
  key: string;
  __typename?: 'Connector_Key';
}

export interface Contact_Key {
  id: UUIDString;
  __typename?: 'Contact_Key';
}

export interface CorrectiveAction_Key {
  id: UUIDString;
  __typename?: 'CorrectiveAction_Key';
}

export interface CostAllocationLine_Key {
  id: UUIDString;
  __typename?: 'CostAllocationLine_Key';
}

export interface CostAllocationRun_Key {
  id: UUIDString;
  __typename?: 'CostAllocationRun_Key';
}

export interface Country_Key {
  code: string;
  __typename?: 'Country_Key';
}

export interface Currency_Key {
  code: string;
  __typename?: 'Currency_Key';
}

export interface CustomsEntry_Key {
  id: UUIDString;
  __typename?: 'CustomsEntry_Key';
}

export interface Defect_Key {
  id: UUIDString;
  __typename?: 'Defect_Key';
}

export interface DocumentLink_Key {
  id: UUIDString;
  __typename?: 'DocumentLink_Key';
}

export interface DocumentRequirement_Key {
  id: UUIDString;
  __typename?: 'DocumentRequirement_Key';
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

export interface FxRate_Key {
  id: UUIDString;
  __typename?: 'FxRate_Key';
}

export interface HandlingUnitContent_Key {
  id: UUIDString;
  __typename?: 'HandlingUnitContent_Key';
}

export interface HandlingUnit_Key {
  id: UUIDString;
  __typename?: 'HandlingUnit_Key';
}

export interface Incoterm_Key {
  code: string;
  __typename?: 'Incoterm_Key';
}

export interface Inquiry_Key {
  id: UUIDString;
  __typename?: 'Inquiry_Key';
}

export interface InspectionCheck_Key {
  id: UUIDString;
  __typename?: 'InspectionCheck_Key';
}

export interface InspectionTemplateCheck_Key {
  id: UUIDString;
  __typename?: 'InspectionTemplateCheck_Key';
}

export interface InspectionTemplate_Key {
  id: UUIDString;
  __typename?: 'InspectionTemplate_Key';
}

export interface Inspection_Key {
  id: UUIDString;
  __typename?: 'Inspection_Key';
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

export interface LotCost_Key {
  id: UUIDString;
  __typename?: 'LotCost_Key';
}

export interface Lot_Key {
  id: UUIDString;
  __typename?: 'Lot_Key';
}

export interface Message_Key {
  id: UUIDString;
  __typename?: 'Message_Key';
}

export interface NumberSequence_Key {
  prefix: string;
  year: number;
  __typename?: 'NumberSequence_Key';
}

export interface PaymentMilestone_Key {
  id: UUIDString;
  __typename?: 'PaymentMilestone_Key';
}

export interface PriceListItem_Key {
  id: UUIDString;
  __typename?: 'PriceListItem_Key';
}

export interface PriceList_Key {
  code: string;
  __typename?: 'PriceList_Key';
}

export interface ProcessTemplateStep_Key {
  id: UUIDString;
  __typename?: 'ProcessTemplateStep_Key';
}

export interface ProcessTemplate_Key {
  id: UUIDString;
  __typename?: 'ProcessTemplate_Key';
}

export interface ProductVariant_Key {
  id: UUIDString;
  __typename?: 'ProductVariant_Key';
}

export interface Product_Key {
  code: string;
  __typename?: 'Product_Key';
}

export interface ProductionMilestone_Key {
  id: UUIDString;
  __typename?: 'ProductionMilestone_Key';
}

export interface ProductionRunLine_Key {
  id: UUIDString;
  __typename?: 'ProductionRunLine_Key';
}

export interface ProductionRun_Key {
  id: UUIDString;
  __typename?: 'ProductionRun_Key';
}

export interface PurchaseOrderLine_Key {
  id: UUIDString;
  __typename?: 'PurchaseOrderLine_Key';
}

export interface PurchaseOrder_Key {
  id: UUIDString;
  __typename?: 'PurchaseOrder_Key';
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

export interface Roll_Key {
  id: UUIDString;
  __typename?: 'Roll_Key';
}

export interface ShadeCollection_Key {
  code: string;
  __typename?: 'ShadeCollection_Key';
}

export interface ShadeReading_Key {
  id: UUIDString;
  __typename?: 'ShadeReading_Key';
}

export interface ShadeStandard_Key {
  id: UUIDString;
  __typename?: 'ShadeStandard_Key';
}

export interface Shade_Key {
  code: string;
  __typename?: 'Shade_Key';
}

export interface ShipmentCost_Key {
  id: UUIDString;
  __typename?: 'ShipmentCost_Key';
}

export interface ShipmentLeg_Key {
  id: UUIDString;
  __typename?: 'ShipmentLeg_Key';
}

export interface ShipmentLine_Key {
  id: UUIDString;
  __typename?: 'ShipmentLine_Key';
}

export interface ShipmentReference_Key {
  id: UUIDString;
  __typename?: 'ShipmentReference_Key';
}

export interface Shipment_Key {
  id: UUIDString;
  __typename?: 'Shipment_Key';
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

