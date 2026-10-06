import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum AlertSeverity {
  info = "info",
  caution = "caution",
  critical = "critical",
};

export enum AlertState {
  open = "open",
  acknowledged = "acknowledged",
  resolved = "resolved",
};

export enum CompanyRoleKind {
  supplier = "supplier",
  factory_operator = "factory_operator",
  customer = "customer",
  freight_forwarder = "freight_forwarder",
  customs_broker = "customs_broker",
  carrier = "carrier",
  inspection_agency = "inspection_agency",
  warehouse_operator = "warehouse_operator",
};

export enum CompanyStatus {
  prospect = "prospect",
  active = "active",
  inactive = "inactive",
};

export enum ContactStatus {
  active = "active",
  left = "left",
};

export enum LocationType {
  factory = "factory",
  warehouse = "warehouse",
  consolidation_hub = "consolidation_hub",
  port = "port",
  airport = "airport",
  office = "office",
  customer_site = "customer_site",
};

export enum PrincipalType {
  staff = "staff",
  supplier = "supplier",
  customer = "customer",
};

export enum ProductStatus {
  draft = "draft",
  active = "active",
  discontinued = "discontinued",
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

export enum ShadeStatus {
  active = "active",
  inactive = "inactive",
};

export enum SkuStatus {
  development = "development",
  sampling = "sampling",
  active = "active",
  phase_out = "phase_out",
  discontinued = "discontinued",
};

export enum TaskState {
  open = "open",
  done = "done",
  cancelled = "cancelled",
};

export enum UomDimension {
  length = "length",
  mass = "mass",
  count = "count",
};

export enum UserStatus {
  invited = "invited",
  active = "active",
  suspended = "suspended",
};



export interface AcknowledgeAlertData {
  alert_update?: Alert_Key | null;
}

export interface AcknowledgeAlertVariables {
  id: UUIDString;
}

export interface AddCompanyRoleData {
  companyRole_insert: CompanyRole_Key;
}

export interface AddCompanyRoleVariables {
  companyId: UUIDString;
  kind: CompanyRoleKind;
  since?: DateString | null;
}

export interface AddNoteData {
  timelineEvent_insert: TimelineEvent_Key;
}

export interface AddNoteVariables {
  entityType: string;
  entityId: string;
  note: string;
}

export interface Alert_Key {
  id: UUIDString;
  __typename?: 'Alert_Key';
}

export interface ArchiveCompanyData {
  company_update?: Company_Key | null;
}

export interface ArchiveCompanyVariables {
  id: UUIDString;
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

export interface CompleteTaskData {
  task_update?: Task_Key | null;
}

export interface CompleteTaskVariables {
  id: UUIDString;
}

export interface Contact_Key {
  id: UUIDString;
  __typename?: 'Contact_Key';
}

export interface Country_Key {
  code: string;
  __typename?: 'Country_Key';
}

export interface CreateTaskData {
  task_insert: Task_Key;
}

export interface CreateTaskVariables {
  title: string;
  details?: string | null;
  assigneeUid?: string | null;
  dueOn?: DateString | null;
  entityType?: string | null;
  entityId?: string | null;
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

export interface GetCompanyData {
  company?: {
    id: UUIDString;
    legalName: string;
    tradingName?: string | null;
    registrationId?: string | null;
    taxId?: string | null;
    website?: string | null;
    status: CompanyStatus;
    notes?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    country?: {
      code: string;
      name: string;
    } & Country_Key;
    defaultCurrency?: {
      code: string;
    } & Currency_Key;
    companyRoles_on_company: ({
      id: UUIDString;
      kind: CompanyRoleKind;
      since?: DateString | null;
    } & CompanyRole_Key)[];
    supplierProfiles_on_company: ({
      id: UUIDString;
      paymentTerms?: string | null;
      namedPlace?: string | null;
      standardLeadTimeDays?: number | null;
      onboardingStatus?: string | null;
      defaultIncoterm?: {
        code: string;
      } & Incoterm_Key;
    } & SupplierProfile_Key)[];
    contacts_on_company: ({
      id: UUIDString;
      name: string;
      title?: string | null;
      email?: string | null;
      phone?: string | null;
      messaging?: string | null;
      language?: string | null;
      isPrimary: boolean;
      status: ContactStatus;
    } & Contact_Key)[];
    locations_on_company: ({
      id: UUIDString;
      type: LocationType;
      name: string;
      addressLine1?: string | null;
      city?: string | null;
      region?: string | null;
      postalCode?: string | null;
      timeZone?: string | null;
      locationCode?: string | null;
      country?: {
        code: string;
        name: string;
      } & Country_Key;
    } & Location_Key)[];
    factories_on_operator: ({
      id: UUIDString;
      capabilities?: unknown | null;
      auditStatus?: string | null;
      location: {
        id: UUIDString;
        name: string;
        city?: string | null;
        country?: {
          code: string;
          name: string;
        } & Country_Key;
      } & Location_Key;
    } & Factory_Key)[];
  } & Company_Key;
}

export interface GetCompanyVariables {
  id: UUIDString;
}

export interface GetMeData {
  user?: {
    uid: string;
    email: string;
    name: string;
    role: Role;
    principalType: PrincipalType;
    locale?: string | null;
    timeZone?: string | null;
    status: UserStatus;
  } & User_Key;
}

export interface GetProductData {
  product?: {
    code: string;
    index: number;
    name: string;
    slug: string;
    tagline?: string | null;
    description?: string | null;
    composition?: unknown | null;
    construction?: string | null;
    care?: string | null;
    specs?: unknown | null;
    status: ProductStatus;
    isPublic: boolean;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    family: {
      code: string;
      name: string;
      slug: string;
      specSchema?: unknown | null;
    } & FabricFamily_Key;
    productVariants_on_product: ({
      id: UUIDString;
      fullCode: string;
      code: string;
      name: string;
      widthCm?: number | null;
      usableWidthCm?: number | null;
      gsm?: number | null;
      stretchWarpPercent?: number | null;
      stretchWeftPercent?: number | null;
      finish?: string | null;
      specs?: unknown | null;
      status: ProductStatus;
    } & ProductVariant_Key)[];
    skus_on_product: ({
      code: string;
      status: SkuStatus;
      isPublic: boolean;
      rollTracking: boolean;
      salesUom: string;
      salesMoq?: Int64String | null;
      variant: {
        fullCode: string;
        name: string;
      };
      shade: {
        code: string;
        name: string;
        hex?: string | null;
        sort: number;
      } & Shade_Key;
      putUp: {
        code: string;
        name: string;
      } & PutUp_Key;
    } & Sku_Key)[];
  } & Product_Key;
}

export interface GetProductVariables {
  code: string;
}

export interface GetSkuData {
  sku?: {
    code: string;
    status: SkuStatus;
    isPublic: boolean;
    rollTracking: boolean;
    salesUom: string;
    salesMoq?: Int64String | null;
    barcode?: string | null;
    createdAt: TimestampString;
    product: {
      code: string;
      name: string;
      index: number;
      family: {
        code: string;
        name: string;
      } & FabricFamily_Key;
    } & Product_Key;
    variant: {
      fullCode: string;
      name: string;
      widthCm?: number | null;
      usableWidthCm?: number | null;
      gsm?: number | null;
    };
    shade: {
      code: string;
      name: string;
      hex?: string | null;
    } & Shade_Key;
    putUp: {
      code: string;
      name: string;
      rollLengthM: number;
      widthCm: number;
    } & PutUp_Key;
  } & Sku_Key;
}

export interface GetSkuSourcingData {
  supplierItems: ({
    id: UUIDString;
    supplierSku?: string | null;
    moq?: Int64String | null;
    leadTimeDays?: number | null;
    isPreferred: boolean;
    validFrom?: DateString | null;
    validTo?: DateString | null;
    supplier: {
      id: UUIDString;
      legalName: string;
      tradingName?: string | null;
    } & Company_Key;
    factory?: {
      id: UUIDString;
      location: {
        name: string;
        city?: string | null;
      };
    } & Factory_Key;
    supplierPrices_on_supplierItem: ({
      id: UUIDString;
      minQuantity: Int64String;
      unitPrice: Int64String;
      currency: string;
      validFrom?: DateString | null;
      validTo?: DateString | null;
    } & SupplierPrice_Key)[];
  } & SupplierItem_Key)[];
}

export interface GetSkuSourcingVariables {
  code: string;
}

export interface GetSkuVariables {
  code: string;
}

export interface Incoterm_Key {
  code: string;
  __typename?: 'Incoterm_Key';
}

export interface InsertCompanyData {
  company_insert: Company_Key;
}

export interface InsertCompanyVariables {
  legalName: string;
  tradingName?: string | null;
  countryCode?: string | null;
  website?: string | null;
  status: CompanyStatus;
  notes?: string | null;
}

export interface InsertContactData {
  contact_insert: Contact_Key;
}

export interface InsertContactVariables {
  companyId: UUIDString;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  messaging?: string | null;
  language?: string | null;
  isPrimary: boolean;
  notes?: string | null;
}

export interface InsertFactoryData {
  factory_insert: Factory_Key;
}

export interface InsertFactoryVariables {
  locationId: UUIDString;
  operatorId: UUIDString;
  capabilities?: unknown | null;
  auditStatus?: string | null;
  notes?: string | null;
}

export interface InsertLocationData {
  location_insert: Location_Key;
}

export interface InsertLocationVariables {
  companyId?: UUIDString | null;
  type: LocationType;
  name: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  timeZone?: string | null;
  locationCode?: string | null;
  notes?: string | null;
}

export interface InsertShadeStandardData {
  shadeStandard_insert: ShadeStandard_Key;
}

export interface InsertShadeStandardVariables {
  shadeCode: string;
  productCode: string;
  factoryId?: UUIDString | null;
  reference?: string | null;
  approvedOn?: DateString | null;
  toleranceDeltaE?: number | null;
  physicalLocation?: string | null;
}

export interface InsertSupplierItemData {
  supplierItem_insert: SupplierItem_Key;
}

export interface InsertSupplierItemVariables {
  skuCode: string;
  supplierId: UUIDString;
  factoryId?: UUIDString | null;
  supplierSku?: string | null;
  moq?: Int64String | null;
  leadTimeDays?: number | null;
  isPreferred: boolean;
  notes?: string | null;
}

export interface InsertSupplierPriceData {
  supplierPrice_insert: SupplierPrice_Key;
}

export interface InsertSupplierPriceVariables {
  supplierItemId: UUIDString;
  minQuantity: Int64String;
  unitPrice: Int64String;
  currency: string;
  validFrom?: DateString | null;
  validTo?: DateString | null;
  quotationRef?: string | null;
}

export interface InsertVariantData {
  productVariant_insert: ProductVariant_Key;
}

export interface InsertVariantVariables {
  productCode: string;
  fullCode: string;
  code: string;
  name: string;
  widthCm?: number | null;
  usableWidthCm?: number | null;
  gsm?: number | null;
  stretchWarpPercent?: number | null;
  stretchWeftPercent?: number | null;
  finish?: string | null;
  specs?: unknown | null;
  status: ProductStatus;
  sort: number;
}

export interface LegalEntity_Key {
  id: UUIDString;
  __typename?: 'LegalEntity_Key';
}

export interface ListCompaniesData {
  companies: ({
    id: UUIDString;
    legalName: string;
    tradingName?: string | null;
    website?: string | null;
    status: CompanyStatus;
    country?: {
      code: string;
      name: string;
    } & Country_Key;
    companyRoles_on_company: ({
      kind: CompanyRoleKind;
    })[];
    contacts_on_company: ({
      id: UUIDString;
    } & Contact_Key)[];
  } & Company_Key)[];
}

export interface ListCountriesData {
  countries: ({
    code: string;
    name: string;
    region?: string | null;
  } & Country_Key)[];
}

export interface ListCurrenciesData {
  currencies: ({
    code: string;
    name: string;
    minorUnits: number;
  } & Currency_Key)[];
}

export interface ListDocumentsForData {
  documentLinks: ({
    id: UUIDString;
    role?: string | null;
    document: {
      id: UUIDString;
      kind: DocumentKind;
      title: string;
      number?: string | null;
      issuedOn?: DateString | null;
      expiresOn?: DateString | null;
      storagePath: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: TimestampString;
    } & Document_Key;
  } & DocumentLink_Key)[];
}

export interface ListDocumentsForVariables {
  entityType: string;
  entityId: string;
}

export interface ListFactoriesData {
  factories: ({
    id: UUIDString;
    capabilities?: unknown | null;
    auditStatus?: string | null;
    operator: {
      id: UUIDString;
      legalName: string;
      tradingName?: string | null;
    } & Company_Key;
    location: {
      id: UUIDString;
      name: string;
      city?: string | null;
      region?: string | null;
      country?: {
        code: string;
        name: string;
      } & Country_Key;
    } & Location_Key;
  } & Factory_Key)[];
}

export interface ListFamiliesData {
  fabricFamilies: ({
    code: string;
    name: string;
    slug: string;
    description?: string | null;
    specSchema?: unknown | null;
    hsCode?: string | null;
    sort: number;
    products_on_family: ({
      code: string;
      index: number;
      name: string;
      slug: string;
      tagline?: string | null;
      status: ProductStatus;
      isPublic: boolean;
    } & Product_Key)[];
  } & FabricFamily_Key)[];
}

export interface ListIncotermsData {
  incoterms: ({
    code: string;
    name: string;
    version: number;
  } & Incoterm_Key)[];
}

export interface ListLegalEntitiesData {
  legalEntities: ({
    id: UUIDString;
    name: string;
    taxId?: string | null;
    isDefault: boolean;
    country: {
      code: string;
      name: string;
    } & Country_Key;
    baseCurrency: {
      code: string;
    } & Currency_Key;
  } & LegalEntity_Key)[];
}

export interface ListMyTasksData {
  tasks: ({
    id: UUIDString;
    title: string;
    details?: string | null;
    dueOn?: DateString | null;
    state: TaskState;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: TimestampString;
  } & Task_Key)[];
}

export interface ListOpenAlertsData {
  alerts: ({
    id: UUIDString;
    ruleKey: string;
    entityType: string;
    entityId: string;
    severity: AlertSeverity;
    state: AlertState;
    title: string;
    detail?: string | null;
    ownerRole?: Role | null;
    firstSeen: TimestampString;
    lastSeen: TimestampString;
    acknowledgedAt?: TimestampString | null;
  } & Alert_Key)[];
}

export interface ListProductsData {
  products: ({
    code: string;
    index: number;
    name: string;
    slug: string;
    tagline?: string | null;
    status: ProductStatus;
    isPublic: boolean;
    family: {
      code: string;
      name: string;
      slug: string;
    } & FabricFamily_Key;
    skus_on_product: ({
      code: string;
      status: SkuStatus;
      shade: {
        code: string;
      } & Shade_Key;
    } & Sku_Key)[];
  } & Product_Key)[];
}

export interface ListPutUpsData {
  putUps: ({
    code: string;
    name: string;
    rollLengthM: number;
    widthCm: number;
    core?: string | null;
    wrap?: string | null;
    rollsPerCarton?: number | null;
  } & PutUp_Key)[];
}

export interface ListShadeStandardsData {
  shadeStandards: ({
    id: UUIDString;
    reference?: string | null;
    approvedOn?: DateString | null;
    approvedByUid?: string | null;
    toleranceDeltaE?: number | null;
    physicalLocation?: string | null;
    createdAt: TimestampString;
    shade: {
      code: string;
      name: string;
    } & Shade_Key;
    factory?: {
      id: UUIDString;
      location: {
        name: string;
        city?: string | null;
      };
    } & Factory_Key;
  } & ShadeStandard_Key)[];
}

export interface ListShadeStandardsVariables {
  productCode: string;
}

export interface ListShadesData {
  shades: ({
    code: string;
    name: string;
    slug: string;
    hex?: string | null;
    labL?: number | null;
    labA?: number | null;
    labB?: number | null;
    sort: number;
    status: ShadeStatus;
    collection?: {
      code: string;
      name: string;
    } & ShadeCollection_Key;
    skus_on_shade: ({
      code: string;
      status: SkuStatus;
      product: {
        code: string;
      } & Product_Key;
    } & Sku_Key)[];
  } & Shade_Key)[];
}

export interface ListSkusData {
  skus: ({
    code: string;
    status: SkuStatus;
    isPublic: boolean;
    rollTracking: boolean;
    salesUom: string;
    product: {
      code: string;
      name: string;
      index: number;
    } & Product_Key;
    variant: {
      fullCode: string;
      name: string;
    };
    shade: {
      code: string;
      name: string;
      hex?: string | null;
      sort: number;
    } & Shade_Key;
    putUp: {
      code: string;
      name: string;
    } & PutUp_Key;
  } & Sku_Key)[];
}

export interface ListTimelineData {
  timelineEvents: ({
    id: UUIDString;
    kind: string;
    occurredAt: TimestampString;
    note?: string | null;
    payload?: unknown | null;
    actor?: {
      uid: string;
      name: string;
    } & User_Key;
  } & TimelineEvent_Key)[];
}

export interface ListTimelineVariables {
  entityType: string;
  entityId: string;
}

export interface ListUomsData {
  uoms: ({
    code: string;
    name: string;
    dimension: UomDimension;
    toCanonical: string;
  } & Uom_Key)[];
}

export interface ListUsersData {
  users: ({
    uid: string;
    email: string;
    name: string;
    role: Role;
    principalType: PrincipalType;
    status: UserStatus;
    createdAt: TimestampString;
  } & User_Key)[];
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

export interface RecordEventData {
  timelineEvent_insert: TimelineEvent_Key;
}

export interface RecordEventVariables {
  entityType: string;
  entityId: string;
  kind: string;
  note?: string | null;
  payload?: unknown | null;
}

export interface RemoveCompanyRoleData {
  companyRole_delete?: CompanyRole_Key | null;
}

export interface RemoveCompanyRoleVariables {
  id: UUIDString;
}

export interface RolePermission_Key {
  role: Role;
  permission: string;
  __typename?: 'RolePermission_Key';
}

export interface SetSkuPublicData {
  sku_update?: Sku_Key | null;
}

export interface SetSkuPublicVariables {
  code: string;
  isPublic: boolean;
}

export interface SetSkuStatusData {
  sku_update?: Sku_Key | null;
}

export interface SetSkuStatusVariables {
  code: string;
  status: SkuStatus;
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

export interface UpdateCompanyData {
  company_update?: Company_Key | null;
}

export interface UpdateCompanyVariables {
  id: UUIDString;
  legalName: string;
  tradingName?: string | null;
  countryCode?: string | null;
  website?: string | null;
  status: CompanyStatus;
  notes?: string | null;
}

export interface UpdateContactData {
  contact_update?: Contact_Key | null;
}

export interface UpdateContactVariables {
  id: UUIDString;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  messaging?: string | null;
  language?: string | null;
  isPrimary: boolean;
  status: ContactStatus;
  notes?: string | null;
}

export interface UpdateMyPreferencesData {
  user_update?: User_Key | null;
}

export interface UpdateMyPreferencesVariables {
  locale?: string | null;
  timeZone?: string | null;
}

export interface UpdateProductDetailsData {
  product_update?: Product_Key | null;
}

export interface UpdateProductDetailsVariables {
  code: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  composition?: unknown | null;
  construction?: string | null;
  care?: string | null;
  specs?: unknown | null;
  status: ProductStatus;
  isPublic: boolean;
}

export interface UpdateVariantData {
  productVariant_update?: ProductVariant_Key | null;
}

export interface UpdateVariantVariables {
  id: UUIDString;
  name: string;
  widthCm?: number | null;
  usableWidthCm?: number | null;
  gsm?: number | null;
  stretchWarpPercent?: number | null;
  stretchWeftPercent?: number | null;
  finish?: string | null;
  specs?: unknown | null;
  status: ProductStatus;
  sort: number;
}

export interface UpsertFamilyData {
  fabricFamily_upsert: FabricFamily_Key;
}

export interface UpsertFamilyVariables {
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  specSchema?: unknown | null;
  hsCode?: string | null;
  sort: number;
}

export interface UpsertProductData {
  product_upsert: Product_Key;
}

export interface UpsertProductVariables {
  code: string;
  familyCode: string;
  index: number;
  name: string;
  slug: string;
  tagline?: string | null;
  description?: string | null;
  composition?: unknown | null;
  construction?: string | null;
  care?: string | null;
  specs?: unknown | null;
  status: ProductStatus;
  isPublic: boolean;
}

export interface UpsertPutUpData {
  putUp_upsert: PutUp_Key;
}

export interface UpsertPutUpVariables {
  code: string;
  name: string;
  rollLengthM: number;
  widthCm: number;
  core?: string | null;
  wrap?: string | null;
  rollsPerCarton?: number | null;
}

export interface UpsertShadeData {
  shade_upsert: Shade_Key;
}

export interface UpsertShadeVariables {
  code: string;
  collectionCode?: string | null;
  name: string;
  slug: string;
  hex?: string | null;
  labL?: number | null;
  labA?: number | null;
  labB?: number | null;
  sort: number;
  status: ShadeStatus;
}

export interface UpsertSkuData {
  sku_upsert: Sku_Key;
}

export interface UpsertSkuVariables {
  code: string;
  productCode: string;
  variantId: UUIDString;
  shadeCode: string;
  putUpCode: string;
  salesUom: string;
  salesMoq?: Int64String | null;
  status: SkuStatus;
  isPublic: boolean;
  rollTracking: boolean;
}

export interface UpsertSupplierProfileData {
  supplierProfile_upsert: SupplierProfile_Key;
}

export interface UpsertSupplierProfileVariables {
  id?: UUIDString | null;
  companyId: UUIDString;
  paymentTerms?: string | null;
  defaultIncotermCode?: string | null;
  namedPlace?: string | null;
  standardLeadTimeDays?: number | null;
  onboardingStatus?: string | null;
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

interface ListFamiliesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFamiliesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListFamiliesData, undefined>;
  operationName: string;
}
export const listFamiliesRef: ListFamiliesRef;

export function listFamilies(options?: ExecuteQueryOptions): QueryPromise<ListFamiliesData, undefined>;
export function listFamilies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFamiliesData, undefined>;

interface ListProductsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProductsData, undefined>;
  operationName: string;
}
export const listProductsRef: ListProductsRef;

export function listProducts(options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;
export function listProducts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface GetProductRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductVariables): QueryRef<GetProductData, GetProductVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProductVariables): QueryRef<GetProductData, GetProductVariables>;
  operationName: string;
}
export const getProductRef: GetProductRef;

export function getProduct(vars: GetProductVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductData, GetProductVariables>;
export function getProduct(dc: DataConnect, vars: GetProductVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductData, GetProductVariables>;

interface ListSkusRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListSkusData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListSkusData, undefined>;
  operationName: string;
}
export const listSkusRef: ListSkusRef;

export function listSkus(options?: ExecuteQueryOptions): QueryPromise<ListSkusData, undefined>;
export function listSkus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListSkusData, undefined>;

interface GetSkuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetSkuVariables): QueryRef<GetSkuData, GetSkuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetSkuVariables): QueryRef<GetSkuData, GetSkuVariables>;
  operationName: string;
}
export const getSkuRef: GetSkuRef;

export function getSku(vars: GetSkuVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuData, GetSkuVariables>;
export function getSku(dc: DataConnect, vars: GetSkuVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuData, GetSkuVariables>;

interface GetSkuSourcingRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetSkuSourcingVariables): QueryRef<GetSkuSourcingData, GetSkuSourcingVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetSkuSourcingVariables): QueryRef<GetSkuSourcingData, GetSkuSourcingVariables>;
  operationName: string;
}
export const getSkuSourcingRef: GetSkuSourcingRef;

export function getSkuSourcing(vars: GetSkuSourcingVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuSourcingData, GetSkuSourcingVariables>;
export function getSkuSourcing(dc: DataConnect, vars: GetSkuSourcingVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuSourcingData, GetSkuSourcingVariables>;

interface ListShadesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShadesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListShadesData, undefined>;
  operationName: string;
}
export const listShadesRef: ListShadesRef;

export function listShades(options?: ExecuteQueryOptions): QueryPromise<ListShadesData, undefined>;
export function listShades(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListShadesData, undefined>;

interface ListPutUpsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPutUpsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPutUpsData, undefined>;
  operationName: string;
}
export const listPutUpsRef: ListPutUpsRef;

export function listPutUps(options?: ExecuteQueryOptions): QueryPromise<ListPutUpsData, undefined>;
export function listPutUps(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPutUpsData, undefined>;

interface UpsertFamilyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertFamilyVariables): MutationRef<UpsertFamilyData, UpsertFamilyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertFamilyVariables): MutationRef<UpsertFamilyData, UpsertFamilyVariables>;
  operationName: string;
}
export const upsertFamilyRef: UpsertFamilyRef;

export function upsertFamily(vars: UpsertFamilyVariables): MutationPromise<UpsertFamilyData, UpsertFamilyVariables>;
export function upsertFamily(dc: DataConnect, vars: UpsertFamilyVariables): MutationPromise<UpsertFamilyData, UpsertFamilyVariables>;

interface UpsertProductRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertProductVariables): MutationRef<UpsertProductData, UpsertProductVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertProductVariables): MutationRef<UpsertProductData, UpsertProductVariables>;
  operationName: string;
}
export const upsertProductRef: UpsertProductRef;

export function upsertProduct(vars: UpsertProductVariables): MutationPromise<UpsertProductData, UpsertProductVariables>;
export function upsertProduct(dc: DataConnect, vars: UpsertProductVariables): MutationPromise<UpsertProductData, UpsertProductVariables>;

interface InsertVariantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertVariantVariables): MutationRef<InsertVariantData, InsertVariantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertVariantVariables): MutationRef<InsertVariantData, InsertVariantVariables>;
  operationName: string;
}
export const insertVariantRef: InsertVariantRef;

export function insertVariant(vars: InsertVariantVariables): MutationPromise<InsertVariantData, InsertVariantVariables>;
export function insertVariant(dc: DataConnect, vars: InsertVariantVariables): MutationPromise<InsertVariantData, InsertVariantVariables>;

interface UpdateVariantRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateVariantVariables): MutationRef<UpdateVariantData, UpdateVariantVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateVariantVariables): MutationRef<UpdateVariantData, UpdateVariantVariables>;
  operationName: string;
}
export const updateVariantRef: UpdateVariantRef;

export function updateVariant(vars: UpdateVariantVariables): MutationPromise<UpdateVariantData, UpdateVariantVariables>;
export function updateVariant(dc: DataConnect, vars: UpdateVariantVariables): MutationPromise<UpdateVariantData, UpdateVariantVariables>;

interface UpsertShadeRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertShadeVariables): MutationRef<UpsertShadeData, UpsertShadeVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertShadeVariables): MutationRef<UpsertShadeData, UpsertShadeVariables>;
  operationName: string;
}
export const upsertShadeRef: UpsertShadeRef;

export function upsertShade(vars: UpsertShadeVariables): MutationPromise<UpsertShadeData, UpsertShadeVariables>;
export function upsertShade(dc: DataConnect, vars: UpsertShadeVariables): MutationPromise<UpsertShadeData, UpsertShadeVariables>;

interface UpsertPutUpRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertPutUpVariables): MutationRef<UpsertPutUpData, UpsertPutUpVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertPutUpVariables): MutationRef<UpsertPutUpData, UpsertPutUpVariables>;
  operationName: string;
}
export const upsertPutUpRef: UpsertPutUpRef;

export function upsertPutUp(vars: UpsertPutUpVariables): MutationPromise<UpsertPutUpData, UpsertPutUpVariables>;
export function upsertPutUp(dc: DataConnect, vars: UpsertPutUpVariables): MutationPromise<UpsertPutUpData, UpsertPutUpVariables>;

interface UpsertSkuRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertSkuVariables): MutationRef<UpsertSkuData, UpsertSkuVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertSkuVariables): MutationRef<UpsertSkuData, UpsertSkuVariables>;
  operationName: string;
}
export const upsertSkuRef: UpsertSkuRef;

export function upsertSku(vars: UpsertSkuVariables): MutationPromise<UpsertSkuData, UpsertSkuVariables>;
export function upsertSku(dc: DataConnect, vars: UpsertSkuVariables): MutationPromise<UpsertSkuData, UpsertSkuVariables>;

interface SetSkuStatusRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetSkuStatusVariables): MutationRef<SetSkuStatusData, SetSkuStatusVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SetSkuStatusVariables): MutationRef<SetSkuStatusData, SetSkuStatusVariables>;
  operationName: string;
}
export const setSkuStatusRef: SetSkuStatusRef;

export function setSkuStatus(vars: SetSkuStatusVariables): MutationPromise<SetSkuStatusData, SetSkuStatusVariables>;
export function setSkuStatus(dc: DataConnect, vars: SetSkuStatusVariables): MutationPromise<SetSkuStatusData, SetSkuStatusVariables>;

interface UpdateProductDetailsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductDetailsVariables): MutationRef<UpdateProductDetailsData, UpdateProductDetailsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateProductDetailsVariables): MutationRef<UpdateProductDetailsData, UpdateProductDetailsVariables>;
  operationName: string;
}
export const updateProductDetailsRef: UpdateProductDetailsRef;

export function updateProductDetails(vars: UpdateProductDetailsVariables): MutationPromise<UpdateProductDetailsData, UpdateProductDetailsVariables>;
export function updateProductDetails(dc: DataConnect, vars: UpdateProductDetailsVariables): MutationPromise<UpdateProductDetailsData, UpdateProductDetailsVariables>;

interface SetSkuPublicRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetSkuPublicVariables): MutationRef<SetSkuPublicData, SetSkuPublicVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SetSkuPublicVariables): MutationRef<SetSkuPublicData, SetSkuPublicVariables>;
  operationName: string;
}
export const setSkuPublicRef: SetSkuPublicRef;

export function setSkuPublic(vars: SetSkuPublicVariables): MutationPromise<SetSkuPublicData, SetSkuPublicVariables>;
export function setSkuPublic(dc: DataConnect, vars: SetSkuPublicVariables): MutationPromise<SetSkuPublicData, SetSkuPublicVariables>;

interface InsertSupplierItemRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertSupplierItemVariables): MutationRef<InsertSupplierItemData, InsertSupplierItemVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertSupplierItemVariables): MutationRef<InsertSupplierItemData, InsertSupplierItemVariables>;
  operationName: string;
}
export const insertSupplierItemRef: InsertSupplierItemRef;

export function insertSupplierItem(vars: InsertSupplierItemVariables): MutationPromise<InsertSupplierItemData, InsertSupplierItemVariables>;
export function insertSupplierItem(dc: DataConnect, vars: InsertSupplierItemVariables): MutationPromise<InsertSupplierItemData, InsertSupplierItemVariables>;

interface InsertSupplierPriceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertSupplierPriceVariables): MutationRef<InsertSupplierPriceData, InsertSupplierPriceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertSupplierPriceVariables): MutationRef<InsertSupplierPriceData, InsertSupplierPriceVariables>;
  operationName: string;
}
export const insertSupplierPriceRef: InsertSupplierPriceRef;

export function insertSupplierPrice(vars: InsertSupplierPriceVariables): MutationPromise<InsertSupplierPriceData, InsertSupplierPriceVariables>;
export function insertSupplierPrice(dc: DataConnect, vars: InsertSupplierPriceVariables): MutationPromise<InsertSupplierPriceData, InsertSupplierPriceVariables>;

interface ListShadeStandardsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListShadeStandardsVariables): QueryRef<ListShadeStandardsData, ListShadeStandardsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListShadeStandardsVariables): QueryRef<ListShadeStandardsData, ListShadeStandardsVariables>;
  operationName: string;
}
export const listShadeStandardsRef: ListShadeStandardsRef;

export function listShadeStandards(vars: ListShadeStandardsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShadeStandardsData, ListShadeStandardsVariables>;
export function listShadeStandards(dc: DataConnect, vars: ListShadeStandardsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShadeStandardsData, ListShadeStandardsVariables>;

interface InsertShadeStandardRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertShadeStandardVariables): MutationRef<InsertShadeStandardData, InsertShadeStandardVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertShadeStandardVariables): MutationRef<InsertShadeStandardData, InsertShadeStandardVariables>;
  operationName: string;
}
export const insertShadeStandardRef: InsertShadeStandardRef;

export function insertShadeStandard(vars: InsertShadeStandardVariables): MutationPromise<InsertShadeStandardData, InsertShadeStandardVariables>;
export function insertShadeStandard(dc: DataConnect, vars: InsertShadeStandardVariables): MutationPromise<InsertShadeStandardData, InsertShadeStandardVariables>;

interface AcknowledgeAlertRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AcknowledgeAlertVariables): MutationRef<AcknowledgeAlertData, AcknowledgeAlertVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AcknowledgeAlertVariables): MutationRef<AcknowledgeAlertData, AcknowledgeAlertVariables>;
  operationName: string;
}
export const acknowledgeAlertRef: AcknowledgeAlertRef;

export function acknowledgeAlert(vars: AcknowledgeAlertVariables): MutationPromise<AcknowledgeAlertData, AcknowledgeAlertVariables>;
export function acknowledgeAlert(dc: DataConnect, vars: AcknowledgeAlertVariables): MutationPromise<AcknowledgeAlertData, AcknowledgeAlertVariables>;

interface CreateTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTaskVariables): MutationRef<CreateTaskData, CreateTaskVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTaskVariables): MutationRef<CreateTaskData, CreateTaskVariables>;
  operationName: string;
}
export const createTaskRef: CreateTaskRef;

export function createTask(vars: CreateTaskVariables): MutationPromise<CreateTaskData, CreateTaskVariables>;
export function createTask(dc: DataConnect, vars: CreateTaskVariables): MutationPromise<CreateTaskData, CreateTaskVariables>;

interface CompleteTaskRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CompleteTaskVariables): MutationRef<CompleteTaskData, CompleteTaskVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CompleteTaskVariables): MutationRef<CompleteTaskData, CompleteTaskVariables>;
  operationName: string;
}
export const completeTaskRef: CompleteTaskRef;

export function completeTask(vars: CompleteTaskVariables): MutationPromise<CompleteTaskData, CompleteTaskVariables>;
export function completeTask(dc: DataConnect, vars: CompleteTaskVariables): MutationPromise<CompleteTaskData, CompleteTaskVariables>;

interface AddNoteRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
  operationName: string;
}
export const addNoteRef: AddNoteRef;

export function addNote(vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;
export function addNote(dc: DataConnect, vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;

interface UpdateMyPreferencesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpdateMyPreferencesVariables): MutationRef<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: UpdateMyPreferencesVariables): MutationRef<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;
  operationName: string;
}
export const updateMyPreferencesRef: UpdateMyPreferencesRef;

export function updateMyPreferences(vars?: UpdateMyPreferencesVariables): MutationPromise<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;
export function updateMyPreferences(dc: DataConnect, vars?: UpdateMyPreferencesVariables): MutationPromise<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;

interface RecordEventRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordEventVariables): MutationRef<RecordEventData, RecordEventVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RecordEventVariables): MutationRef<RecordEventData, RecordEventVariables>;
  operationName: string;
}
export const recordEventRef: RecordEventRef;

export function recordEvent(vars: RecordEventVariables): MutationPromise<RecordEventData, RecordEventVariables>;
export function recordEvent(dc: DataConnect, vars: RecordEventVariables): MutationPromise<RecordEventData, RecordEventVariables>;

interface ListCompaniesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
  operationName: string;
}
export const listCompaniesRef: ListCompaniesRef;

export function listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;
export function listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface GetCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCompanyVariables): QueryRef<GetCompanyData, GetCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetCompanyVariables): QueryRef<GetCompanyData, GetCompanyVariables>;
  operationName: string;
}
export const getCompanyRef: GetCompanyRef;

export function getCompany(vars: GetCompanyVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyData, GetCompanyVariables>;
export function getCompany(dc: DataConnect, vars: GetCompanyVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyData, GetCompanyVariables>;

interface ListFactoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFactoriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListFactoriesData, undefined>;
  operationName: string;
}
export const listFactoriesRef: ListFactoriesRef;

export function listFactories(options?: ExecuteQueryOptions): QueryPromise<ListFactoriesData, undefined>;
export function listFactories(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFactoriesData, undefined>;

interface InsertCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
  operationName: string;
}
export const insertCompanyRef: InsertCompanyRef;

export function insertCompany(vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;
export function insertCompany(dc: DataConnect, vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface UpdateCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCompanyVariables): MutationRef<UpdateCompanyData, UpdateCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateCompanyVariables): MutationRef<UpdateCompanyData, UpdateCompanyVariables>;
  operationName: string;
}
export const updateCompanyRef: UpdateCompanyRef;

export function updateCompany(vars: UpdateCompanyVariables): MutationPromise<UpdateCompanyData, UpdateCompanyVariables>;
export function updateCompany(dc: DataConnect, vars: UpdateCompanyVariables): MutationPromise<UpdateCompanyData, UpdateCompanyVariables>;

interface ArchiveCompanyRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ArchiveCompanyVariables): MutationRef<ArchiveCompanyData, ArchiveCompanyVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ArchiveCompanyVariables): MutationRef<ArchiveCompanyData, ArchiveCompanyVariables>;
  operationName: string;
}
export const archiveCompanyRef: ArchiveCompanyRef;

export function archiveCompany(vars: ArchiveCompanyVariables): MutationPromise<ArchiveCompanyData, ArchiveCompanyVariables>;
export function archiveCompany(dc: DataConnect, vars: ArchiveCompanyVariables): MutationPromise<ArchiveCompanyData, ArchiveCompanyVariables>;

interface AddCompanyRoleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddCompanyRoleVariables): MutationRef<AddCompanyRoleData, AddCompanyRoleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddCompanyRoleVariables): MutationRef<AddCompanyRoleData, AddCompanyRoleVariables>;
  operationName: string;
}
export const addCompanyRoleRef: AddCompanyRoleRef;

export function addCompanyRole(vars: AddCompanyRoleVariables): MutationPromise<AddCompanyRoleData, AddCompanyRoleVariables>;
export function addCompanyRole(dc: DataConnect, vars: AddCompanyRoleVariables): MutationPromise<AddCompanyRoleData, AddCompanyRoleVariables>;

interface RemoveCompanyRoleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: RemoveCompanyRoleVariables): MutationRef<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: RemoveCompanyRoleVariables): MutationRef<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;
  operationName: string;
}
export const removeCompanyRoleRef: RemoveCompanyRoleRef;

export function removeCompanyRole(vars: RemoveCompanyRoleVariables): MutationPromise<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;
export function removeCompanyRole(dc: DataConnect, vars: RemoveCompanyRoleVariables): MutationPromise<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;

interface InsertContactRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertContactVariables): MutationRef<InsertContactData, InsertContactVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertContactVariables): MutationRef<InsertContactData, InsertContactVariables>;
  operationName: string;
}
export const insertContactRef: InsertContactRef;

export function insertContact(vars: InsertContactVariables): MutationPromise<InsertContactData, InsertContactVariables>;
export function insertContact(dc: DataConnect, vars: InsertContactVariables): MutationPromise<InsertContactData, InsertContactVariables>;

interface UpdateContactRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateContactVariables): MutationRef<UpdateContactData, UpdateContactVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateContactVariables): MutationRef<UpdateContactData, UpdateContactVariables>;
  operationName: string;
}
export const updateContactRef: UpdateContactRef;

export function updateContact(vars: UpdateContactVariables): MutationPromise<UpdateContactData, UpdateContactVariables>;
export function updateContact(dc: DataConnect, vars: UpdateContactVariables): MutationPromise<UpdateContactData, UpdateContactVariables>;

interface InsertLocationRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertLocationVariables): MutationRef<InsertLocationData, InsertLocationVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertLocationVariables): MutationRef<InsertLocationData, InsertLocationVariables>;
  operationName: string;
}
export const insertLocationRef: InsertLocationRef;

export function insertLocation(vars: InsertLocationVariables): MutationPromise<InsertLocationData, InsertLocationVariables>;
export function insertLocation(dc: DataConnect, vars: InsertLocationVariables): MutationPromise<InsertLocationData, InsertLocationVariables>;

interface InsertFactoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertFactoryVariables): MutationRef<InsertFactoryData, InsertFactoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertFactoryVariables): MutationRef<InsertFactoryData, InsertFactoryVariables>;
  operationName: string;
}
export const insertFactoryRef: InsertFactoryRef;

export function insertFactory(vars: InsertFactoryVariables): MutationPromise<InsertFactoryData, InsertFactoryVariables>;
export function insertFactory(dc: DataConnect, vars: InsertFactoryVariables): MutationPromise<InsertFactoryData, InsertFactoryVariables>;

interface UpsertSupplierProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertSupplierProfileVariables): MutationRef<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpsertSupplierProfileVariables): MutationRef<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;
  operationName: string;
}
export const upsertSupplierProfileRef: UpsertSupplierProfileRef;

export function upsertSupplierProfile(vars: UpsertSupplierProfileVariables): MutationPromise<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;
export function upsertSupplierProfile(dc: DataConnect, vars: UpsertSupplierProfileVariables): MutationPromise<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;

interface GetMeRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMeData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMeData, undefined>;
  operationName: string;
}
export const getMeRef: GetMeRef;

export function getMe(options?: ExecuteQueryOptions): QueryPromise<GetMeData, undefined>;
export function getMe(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMeData, undefined>;

interface ListUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
  operationName: string;
}
export const listUsersRef: ListUsersRef;

export function listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;
export function listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListOpenAlertsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListOpenAlertsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListOpenAlertsData, undefined>;
  operationName: string;
}
export const listOpenAlertsRef: ListOpenAlertsRef;

export function listOpenAlerts(options?: ExecuteQueryOptions): QueryPromise<ListOpenAlertsData, undefined>;
export function listOpenAlerts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListOpenAlertsData, undefined>;

interface ListMyTasksRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyTasksData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListMyTasksData, undefined>;
  operationName: string;
}
export const listMyTasksRef: ListMyTasksRef;

export function listMyTasks(options?: ExecuteQueryOptions): QueryPromise<ListMyTasksData, undefined>;
export function listMyTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyTasksData, undefined>;

interface ListTimelineRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListTimelineVariables): QueryRef<ListTimelineData, ListTimelineVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListTimelineVariables): QueryRef<ListTimelineData, ListTimelineVariables>;
  operationName: string;
}
export const listTimelineRef: ListTimelineRef;

export function listTimeline(vars: ListTimelineVariables, options?: ExecuteQueryOptions): QueryPromise<ListTimelineData, ListTimelineVariables>;
export function listTimeline(dc: DataConnect, vars: ListTimelineVariables, options?: ExecuteQueryOptions): QueryPromise<ListTimelineData, ListTimelineVariables>;

interface ListDocumentsForRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDocumentsForVariables): QueryRef<ListDocumentsForData, ListDocumentsForVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListDocumentsForVariables): QueryRef<ListDocumentsForData, ListDocumentsForVariables>;
  operationName: string;
}
export const listDocumentsForRef: ListDocumentsForRef;

export function listDocumentsFor(vars: ListDocumentsForVariables, options?: ExecuteQueryOptions): QueryPromise<ListDocumentsForData, ListDocumentsForVariables>;
export function listDocumentsFor(dc: DataConnect, vars: ListDocumentsForVariables, options?: ExecuteQueryOptions): QueryPromise<ListDocumentsForData, ListDocumentsForVariables>;

interface ListCountriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCountriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCountriesData, undefined>;
  operationName: string;
}
export const listCountriesRef: ListCountriesRef;

export function listCountries(options?: ExecuteQueryOptions): QueryPromise<ListCountriesData, undefined>;
export function listCountries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCountriesData, undefined>;

interface ListCurrenciesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCurrenciesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListCurrenciesData, undefined>;
  operationName: string;
}
export const listCurrenciesRef: ListCurrenciesRef;

export function listCurrencies(options?: ExecuteQueryOptions): QueryPromise<ListCurrenciesData, undefined>;
export function listCurrencies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCurrenciesData, undefined>;

interface ListUomsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUomsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListUomsData, undefined>;
  operationName: string;
}
export const listUomsRef: ListUomsRef;

export function listUoms(options?: ExecuteQueryOptions): QueryPromise<ListUomsData, undefined>;
export function listUoms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUomsData, undefined>;

interface ListIncotermsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListIncotermsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListIncotermsData, undefined>;
  operationName: string;
}
export const listIncotermsRef: ListIncotermsRef;

export function listIncoterms(options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;
export function listIncoterms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;

interface ListLegalEntitiesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListLegalEntitiesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListLegalEntitiesData, undefined>;
  operationName: string;
}
export const listLegalEntitiesRef: ListLegalEntitiesRef;

export function listLegalEntities(options?: ExecuteQueryOptions): QueryPromise<ListLegalEntitiesData, undefined>;
export function listLegalEntities(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListLegalEntitiesData, undefined>;

