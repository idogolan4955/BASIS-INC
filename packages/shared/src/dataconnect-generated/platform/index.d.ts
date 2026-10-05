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

export enum PrincipalType {
  staff = "staff",
  supplier = "supplier",
  customer = "customer",
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

export interface AuditEvent_Key {
  id: UUIDString;
  __typename?: 'AuditEvent_Key';
}

export interface CompleteTaskData {
  task_update?: Task_Key | null;
}

export interface CompleteTaskVariables {
  id: UUIDString;
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

export interface Incoterm_Key {
  code: string;
  __typename?: 'Incoterm_Key';
}

export interface LegalEntity_Key {
  id: UUIDString;
  __typename?: 'LegalEntity_Key';
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

export interface NumberSequence_Key {
  prefix: string;
  year: number;
  __typename?: 'NumberSequence_Key';
}

export interface RolePermission_Key {
  role: Role;
  permission: string;
  __typename?: 'RolePermission_Key';
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

export interface UpdateMyPreferencesData {
  user_update?: User_Key | null;
}

export interface UpdateMyPreferencesVariables {
  locale?: string | null;
  timeZone?: string | null;
}

export interface User_Key {
  uid: string;
  __typename?: 'User_Key';
}

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

