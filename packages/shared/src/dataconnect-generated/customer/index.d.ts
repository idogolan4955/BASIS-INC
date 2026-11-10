import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum CustomerUserRole {
  admin = "admin",
  buyer = "buyer",
  viewer = "viewer",
};

export enum Health {
  on_track = "on_track",
  at_risk = "at_risk",
  delayed = "delayed",
  blocked = "blocked",
};

export enum LoadType {
  fcl = "fcl",
  lcl = "lcl",
  none = "none",
};

export enum QuoteState {
  draft = "draft",
  sent = "sent",
  accepted = "accepted",
  declined = "declined",
  expired = "expired",
};

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

export enum SalesOrderState {
  draft = "draft",
  confirmed = "confirmed",
  shipped = "shipped",
  closed = "closed",
  cancelled = "cancelled",
};

export enum ShipmentState {
  draft = "draft",
  booked = "booked",
  closed = "closed",
  cancelled = "cancelled",
};

export enum TransportMode {
  sea = "sea",
  air = "air",
  courier = "courier",
  road = "road",
};

export enum UserStatus {
  invited = "invited",
  active = "active",
  suspended = "suspended",
};



export interface Alert_Key {
  id: UUIDString;
  __typename?: 'Alert_Key';
}

export interface Allocation_Key {
  id: UUIDString;
  __typename?: 'Allocation_Key';
}

export interface ApiToken_Key {
  id: UUIDString;
  __typename?: 'ApiToken_Key';
}

export interface AssistantAction_Key {
  id: UUIDString;
  __typename?: 'AssistantAction_Key';
}

export interface AssistantMessage_Key {
  id: UUIDString;
  __typename?: 'AssistantMessage_Key';
}

export interface AssistantThread_Key {
  id: UUIDString;
  __typename?: 'AssistantThread_Key';
}

export interface AuditEvent_Key {
  id: UUIDString;
  __typename?: 'AuditEvent_Key';
}

export interface BoardNote_Key {
  id: UUIDString;
  __typename?: 'BoardNote_Key';
}

export interface BrandAsset_Key {
  id: UUIDString;
  __typename?: 'BrandAsset_Key';
}

export interface Certification_Key {
  id: UUIDString;
  __typename?: 'Certification_Key';
}

export interface Collection_Key {
  code: string;
  __typename?: 'Collection_Key';
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

export interface CustomerAccount_Key {
  id: UUIDString;
  __typename?: 'CustomerAccount_Key';
}

export interface CustomerAddress_Key {
  id: UUIDString;
  __typename?: 'CustomerAddress_Key';
}

export interface CustomerAddressesData {
  customerAddresses: ({
    id: UUIDString;
    kind: string;
    isDefault: boolean;
    location: {
      id: UUIDString;
      name: string;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      region?: string | null;
      postalCode?: string | null;
      country?: {
        code: string;
        name: string;
      } & Country_Key;
    } & Location_Key;
  } & CustomerAddress_Key)[];
}

export interface CustomerCountriesData {
  countries: ({
    code: string;
    name: string;
  } & Country_Key)[];
}

export interface CustomerInvitation_Key {
  id: UUIDString;
  __typename?: 'CustomerInvitation_Key';
}

export interface CustomerInvitationsData {
  customerInvitations: ({
    id: UUIDString;
    email: string;
    name?: string | null;
    role: CustomerUserRole;
    expiresAt: TimestampString;
    createdAt: TimestampString;
  } & CustomerInvitation_Key)[];
}

export interface CustomerInvoicesData {
  invoiceRefs: ({
    number: string;
    amount: Int64String;
    currency: string;
    issuedOn?: DateString | null;
    dueOn?: DateString | null;
    paidOn?: DateString | null;
    paidAmount?: Int64String | null;
    order: {
      number: string;
    };
  })[];
}

export interface CustomerMeData {
  customerUsers: ({
    uid: string;
    name: string;
    email: string;
    role: CustomerUserRole;
    status: UserStatus;
    account: {
      id: UUIDString;
      kind: CustomerAccountKind;
      displayName: string;
      memberNumber: string;
      currency: string;
      locale?: string | null;
      status: CustomerAccountStatus;
      company?: {
        legalName: string;
        tradingName?: string | null;
        country?: {
          code: string;
          name: string;
        } & Country_Key;
      };
    } & CustomerAccount_Key;
  } & CustomerUser_Key)[];
}

export interface CustomerOrderData {
  salesOrders: ({
    number: string;
    state: SalesOrderState;
    currency: string;
    incoterm?: {
      code: string;
    } & Incoterm_Key;
    namedPlace?: string | null;
    paymentTerms?: string | null;
    requestedDelivery?: DateString | null;
    shipToName?: string | null;
    shipToAddress?: string | null;
    confirmedOn?: DateString | null;
    createdAt: TimestampString;
    quote?: {
      number: string;
    };
    lines: ({
      lineNo: number;
      quantity: Int64String;
      uom: string;
      unitPrice: Int64String;
      sku: {
        code: string;
        salesUom: string;
        product: {
          code: string;
          name: string;
          slug: string;
        } & Product_Key;
        variant: {
          code: string;
          name: string;
          widthCm?: number | null;
        };
        shade: {
          code: string;
          name: string;
          hex?: string | null;
        } & Shade_Key;
        putUp: {
          name: string;
          rollLengthM: number;
          widthCm: number;
        };
      } & Sku_Key;
      shipped: ({
        quantity: Int64String;
        shipment: {
          number: string;
          state: ShipmentState;
        };
      })[];
    })[];
    invoices: ({
      number: string;
      amount: Int64String;
      currency: string;
      issuedOn?: DateString | null;
      dueOn?: DateString | null;
      paidOn?: DateString | null;
      paidAmount?: Int64String | null;
    })[];
  })[];
}

export interface CustomerOrderVariables {
  number: string;
}

export interface CustomerOrdersData {
  salesOrders: ({
    number: string;
    state: SalesOrderState;
    currency: string;
    confirmedOn?: DateString | null;
    requestedDelivery?: DateString | null;
    createdAt: TimestampString;
    lines: ({
      quantity: Int64String;
      unitPrice: Int64String;
    })[];
  })[];
}

export interface CustomerProfile_Key {
  id: UUIDString;
  __typename?: 'CustomerProfile_Key';
}

export interface CustomerQuoteData {
  quotes: ({
    number: string;
    state: QuoteState;
    currency: string;
    incoterm?: {
      code: string;
    } & Incoterm_Key;
    namedPlace?: string | null;
    paymentTerms?: string | null;
    validUntil?: DateString | null;
    sentOn?: DateString | null;
    notes?: string | null;
    createdAt: TimestampString;
    lines: ({
      lineNo: number;
      quantity: Int64String;
      unitPrice: Int64String;
      leadTimeDays?: number | null;
      note?: string | null;
      sku: {
        code: string;
        salesUom: string;
        product: {
          code: string;
          name: string;
          slug: string;
        } & Product_Key;
        variant: {
          code: string;
          name: string;
          widthCm?: number | null;
        };
        shade: {
          code: string;
          name: string;
          hex?: string | null;
        } & Shade_Key;
        putUp: {
          name: string;
          rollLengthM: number;
          widthCm: number;
        };
      } & Sku_Key;
    })[];
    orders: ({
      number: string;
      state: SalesOrderState;
    })[];
  })[];
}

export interface CustomerQuoteVariables {
  number: string;
}

export interface CustomerQuotesData {
  quotes: ({
    number: string;
    state: QuoteState;
    currency: string;
    validUntil?: DateString | null;
    sentOn?: DateString | null;
    createdAt: TimestampString;
    lines: ({
      quantity: Int64String;
      unitPrice: Int64String;
    })[];
  })[];
}

export interface CustomerSampleRequestsData {
  inquiries: ({
    reference: string;
    kind: string;
    state: string;
    message?: string | null;
    details?: unknown | null;
    createdAt: TimestampString;
  })[];
}

export interface CustomerShipmentData {
  shipments: ({
    number: string;
    state: ShipmentState;
    health: Health;
    mode: TransportMode;
    loadType: LoadType;
    incoterm?: {
      code: string;
    } & Incoterm_Key;
    namedPlace?: string | null;
    consigneeName?: string | null;
    origin: {
      type: LocationType;
      city?: string | null;
      locationCode?: string | null;
      country?: {
        name: string;
      };
    };
    destination: {
      name: string;
      city?: string | null;
      country?: {
        name: string;
      };
    };
    legs: ({
      sequence: number;
      type: LegType;
      mode: TransportMode;
      fromLocation?: {
        type: LocationType;
        city?: string | null;
        locationCode?: string | null;
      };
      toLocation?: {
        type: LocationType;
        city?: string | null;
        locationCode?: string | null;
      };
      vessel?: string | null;
      voyage?: string | null;
      plannedEtd?: DateString | null;
      plannedEta?: DateString | null;
      etd?: DateString | null;
      eta?: DateString | null;
      atd?: DateString | null;
      ata?: DateString | null;
      provider?: {
        legalName: string;
        tradingName?: string | null;
      };
    })[];
    references: ({
      type: ReferenceType;
      value: string;
    })[];
  })[];
}

export interface CustomerShipmentLinesData {
  shipments: ({
    number: string;
    lines: ({
      quantity: Int64String;
      uom: string;
      salesOrderLine?: {
        lineNo: number;
        order: {
          number: string;
        };
        sku: {
          code: string;
          salesUom: string;
          product: {
            code: string;
            name: string;
            slug: string;
          } & Product_Key;
          variant: {
            code: string;
            name: string;
            widthCm?: number | null;
          };
          shade: {
            code: string;
            name: string;
            hex?: string | null;
          } & Shade_Key;
          putUp: {
            name: string;
            rollLengthM: number;
            widthCm: number;
          };
        } & Sku_Key;
      };
    })[];
  })[];
}

export interface CustomerShipmentLinesVariables {
  number: string;
}

export interface CustomerShipmentVariables {
  number: string;
}

export interface CustomerShipmentsData {
  shipments: ({
    number: string;
    state: ShipmentState;
    health: Health;
    mode: TransportMode;
    createdAt: TimestampString;
    destination: {
      name: string;
      city?: string | null;
      country?: {
        name: string;
      };
    };
    legs: ({
      sequence: number;
      type: LegType;
      plannedEta?: DateString | null;
      eta?: DateString | null;
      ata?: DateString | null;
      atd?: DateString | null;
    })[];
  })[];
}

export interface CustomerTeamData {
  customerUsers: ({
    uid: string;
    name: string;
    email: string;
    role: CustomerUserRole;
    status: UserStatus;
    lastSignInAt?: TimestampString | null;
    createdAt: TimestampString;
  } & CustomerUser_Key)[];
}

export interface CustomerUser_Key {
  uid: string;
  __typename?: 'CustomerUser_Key';
}

export interface CustomsEntry_Key {
  id: UUIDString;
  __typename?: 'CustomsEntry_Key';
}

export interface Defect_Key {
  id: UUIDString;
  __typename?: 'Defect_Key';
}

export interface DevelopmentApproval_Key {
  id: UUIDString;
  __typename?: 'DevelopmentApproval_Key';
}

export interface DevelopmentCosting_Key {
  id: UUIDString;
  __typename?: 'DevelopmentCosting_Key';
}

export interface DevelopmentMaterial_Key {
  id: UUIDString;
  __typename?: 'DevelopmentMaterial_Key';
}

export interface DevelopmentPackaging_Key {
  id: UUIDString;
  __typename?: 'DevelopmentPackaging_Key';
}

export interface DevelopmentProduct_Key {
  id: UUIDString;
  __typename?: 'DevelopmentProduct_Key';
}

export interface DevelopmentSample_Key {
  id: UUIDString;
  __typename?: 'DevelopmentSample_Key';
}

export interface DevelopmentSourcing_Key {
  id: UUIDString;
  __typename?: 'DevelopmentSourcing_Key';
}

export interface DevelopmentVariant_Key {
  id: UUIDString;
  __typename?: 'DevelopmentVariant_Key';
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

export interface Goal_Key {
  id: UUIDString;
  __typename?: 'Goal_Key';
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

export interface Interaction_Key {
  id: UUIDString;
  __typename?: 'Interaction_Key';
}

export interface InvoiceRef_Key {
  id: UUIDString;
  __typename?: 'InvoiceRef_Key';
}

export interface LegalEntity_Key {
  id: UUIDString;
  __typename?: 'LegalEntity_Key';
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

export interface MailAction_Key {
  id: UUIDString;
  __typename?: 'MailAction_Key';
}

export interface MailAttachment_Key {
  id: UUIDString;
  __typename?: 'MailAttachment_Key';
}

export interface MailClassification_Key {
  id: UUIDString;
  __typename?: 'MailClassification_Key';
}

export interface MailLink_Key {
  id: UUIDString;
  __typename?: 'MailLink_Key';
}

export interface MailMailbox_Key {
  id: UUIDString;
  __typename?: 'MailMailbox_Key';
}

export interface MailMessage_Key {
  id: UUIDString;
  __typename?: 'MailMessage_Key';
}

export interface MailRule_Key {
  id: UUIDString;
  __typename?: 'MailRule_Key';
}

export interface MailThread_Key {
  id: UUIDString;
  __typename?: 'MailThread_Key';
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

export interface Opportunity_Key {
  id: UUIDString;
  __typename?: 'Opportunity_Key';
}

export interface PaymentMilestone_Key {
  id: UUIDString;
  __typename?: 'PaymentMilestone_Key';
}

export interface PriceListItem_Key {
  id: UUIDString;
  __typename?: 'PriceListItem_Key';
}

export interface PriceListProductItem_Key {
  id: UUIDString;
  __typename?: 'PriceListProductItem_Key';
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

export interface ProductCategory_Key {
  code: string;
  __typename?: 'ProductCategory_Key';
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

export interface QuoteLine_Key {
  id: UUIDString;
  __typename?: 'QuoteLine_Key';
}

export interface Quote_Key {
  id: UUIDString;
  __typename?: 'Quote_Key';
}

export interface ReceiptLine_Key {
  id: UUIDString;
  __typename?: 'ReceiptLine_Key';
}

export interface Receipt_Key {
  id: UUIDString;
  __typename?: 'Receipt_Key';
}

export interface ReorderPolicy_Key {
  id: UUIDString;
  __typename?: 'ReorderPolicy_Key';
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

export interface SalesOrderLine_Key {
  id: UUIDString;
  __typename?: 'SalesOrderLine_Key';
}

export interface SalesOrder_Key {
  id: UUIDString;
  __typename?: 'SalesOrder_Key';
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

export interface SiteAction_Key {
  id: UUIDString;
  __typename?: 'SiteAction_Key';
}

export interface SiteConversation_Key {
  id: UUIDString;
  __typename?: 'SiteConversation_Key';
}

export interface SiteTurn_Key {
  id: UUIDString;
  __typename?: 'SiteTurn_Key';
}

export interface Sku_Key {
  code: string;
  __typename?: 'Sku_Key';
}

export interface StockBalance_Key {
  id: UUIDString;
  __typename?: 'StockBalance_Key';
}

export interface StockLocation_Key {
  id: UUIDString;
  __typename?: 'StockLocation_Key';
}

export interface StockMovement_Key {
  id: UUIDString;
  __typename?: 'StockMovement_Key';
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

interface CustomerMeRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerMeData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerMeData, undefined>;
  operationName: string;
}
export const customerMeRef: CustomerMeRef;

export function customerMe(options?: ExecuteQueryOptions): QueryPromise<CustomerMeData, undefined>;
export function customerMe(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerMeData, undefined>;

interface CustomerQuotesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerQuotesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerQuotesData, undefined>;
  operationName: string;
}
export const customerQuotesRef: CustomerQuotesRef;

export function customerQuotes(options?: ExecuteQueryOptions): QueryPromise<CustomerQuotesData, undefined>;
export function customerQuotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerQuotesData, undefined>;

interface CustomerQuoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerQuoteVariables): QueryRef<CustomerQuoteData, CustomerQuoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CustomerQuoteVariables): QueryRef<CustomerQuoteData, CustomerQuoteVariables>;
  operationName: string;
}
export const customerQuoteRef: CustomerQuoteRef;

export function customerQuote(vars: CustomerQuoteVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerQuoteData, CustomerQuoteVariables>;
export function customerQuote(dc: DataConnect, vars: CustomerQuoteVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerQuoteData, CustomerQuoteVariables>;

interface CustomerOrdersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerOrdersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerOrdersData, undefined>;
  operationName: string;
}
export const customerOrdersRef: CustomerOrdersRef;

export function customerOrders(options?: ExecuteQueryOptions): QueryPromise<CustomerOrdersData, undefined>;
export function customerOrders(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerOrdersData, undefined>;

interface CustomerOrderRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerOrderVariables): QueryRef<CustomerOrderData, CustomerOrderVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CustomerOrderVariables): QueryRef<CustomerOrderData, CustomerOrderVariables>;
  operationName: string;
}
export const customerOrderRef: CustomerOrderRef;

export function customerOrder(vars: CustomerOrderVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerOrderData, CustomerOrderVariables>;
export function customerOrder(dc: DataConnect, vars: CustomerOrderVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerOrderData, CustomerOrderVariables>;

interface CustomerShipmentsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerShipmentsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerShipmentsData, undefined>;
  operationName: string;
}
export const customerShipmentsRef: CustomerShipmentsRef;

export function customerShipments(options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentsData, undefined>;
export function customerShipments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentsData, undefined>;

interface CustomerShipmentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerShipmentVariables): QueryRef<CustomerShipmentData, CustomerShipmentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CustomerShipmentVariables): QueryRef<CustomerShipmentData, CustomerShipmentVariables>;
  operationName: string;
}
export const customerShipmentRef: CustomerShipmentRef;

export function customerShipment(vars: CustomerShipmentVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentData, CustomerShipmentVariables>;
export function customerShipment(dc: DataConnect, vars: CustomerShipmentVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentData, CustomerShipmentVariables>;

interface CustomerShipmentLinesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerShipmentLinesVariables): QueryRef<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CustomerShipmentLinesVariables): QueryRef<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;
  operationName: string;
}
export const customerShipmentLinesRef: CustomerShipmentLinesRef;

export function customerShipmentLines(vars: CustomerShipmentLinesVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;
export function customerShipmentLines(dc: DataConnect, vars: CustomerShipmentLinesVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;

interface CustomerInvoicesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerInvoicesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerInvoicesData, undefined>;
  operationName: string;
}
export const customerInvoicesRef: CustomerInvoicesRef;

export function customerInvoices(options?: ExecuteQueryOptions): QueryPromise<CustomerInvoicesData, undefined>;
export function customerInvoices(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerInvoicesData, undefined>;

interface CustomerSampleRequestsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerSampleRequestsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerSampleRequestsData, undefined>;
  operationName: string;
}
export const customerSampleRequestsRef: CustomerSampleRequestsRef;

export function customerSampleRequests(options?: ExecuteQueryOptions): QueryPromise<CustomerSampleRequestsData, undefined>;
export function customerSampleRequests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerSampleRequestsData, undefined>;

interface CustomerTeamRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerTeamData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerTeamData, undefined>;
  operationName: string;
}
export const customerTeamRef: CustomerTeamRef;

export function customerTeam(options?: ExecuteQueryOptions): QueryPromise<CustomerTeamData, undefined>;
export function customerTeam(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerTeamData, undefined>;

interface CustomerInvitationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerInvitationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerInvitationsData, undefined>;
  operationName: string;
}
export const customerInvitationsRef: CustomerInvitationsRef;

export function customerInvitations(options?: ExecuteQueryOptions): QueryPromise<CustomerInvitationsData, undefined>;
export function customerInvitations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerInvitationsData, undefined>;

interface CustomerAddressesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerAddressesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerAddressesData, undefined>;
  operationName: string;
}
export const customerAddressesRef: CustomerAddressesRef;

export function customerAddresses(options?: ExecuteQueryOptions): QueryPromise<CustomerAddressesData, undefined>;
export function customerAddresses(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerAddressesData, undefined>;

interface CustomerCountriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerCountriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<CustomerCountriesData, undefined>;
  operationName: string;
}
export const customerCountriesRef: CustomerCountriesRef;

export function customerCountries(options?: ExecuteQueryOptions): QueryPromise<CustomerCountriesData, undefined>;
export function customerCountries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerCountriesData, undefined>;

