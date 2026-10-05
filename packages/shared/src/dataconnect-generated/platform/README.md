# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `platform`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetMe*](#getme)
  - [*ListUsers*](#listusers)
  - [*ListOpenAlerts*](#listopenalerts)
  - [*ListMyTasks*](#listmytasks)
  - [*ListTimeline*](#listtimeline)
  - [*ListDocumentsFor*](#listdocumentsfor)
  - [*ListCountries*](#listcountries)
  - [*ListCurrencies*](#listcurrencies)
  - [*ListUoms*](#listuoms)
  - [*ListIncoterms*](#listincoterms)
  - [*ListLegalEntities*](#listlegalentities)
- [**Mutations**](#mutations)
  - [*AcknowledgeAlert*](#acknowledgealert)
  - [*CreateTask*](#createtask)
  - [*CompleteTask*](#completetask)
  - [*AddNote*](#addnote)
  - [*UpdateMyPreferences*](#updatemypreferences)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `platform`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@basis/dataconnect-platform` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@basis/dataconnect-platform';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@basis/dataconnect-platform';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `platform` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetMe
You can execute the `GetMe` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getMe(options?: ExecuteQueryOptions): QueryPromise<GetMeData, undefined>;

interface GetMeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMeData, undefined>;
}
export const getMeRef: GetMeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMe(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<GetMeData, undefined>;

interface GetMeRef {
  ...
  (dc: DataConnect): QueryRef<GetMeData, undefined>;
}
export const getMeRef: GetMeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMeRef:
```typescript
const name = getMeRef.operationName;
console.log(name);
```

### Variables
The `GetMe` query has no variables.
### Return Type
Recall that executing the `GetMe` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMeData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetMe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMe } from '@basis/dataconnect-platform';


// Call the `getMe()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMe();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMe(dataConnect);

console.log(data.user);

// Or, you can use the `Promise` API.
getMe().then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetMe`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMeRef } from '@basis/dataconnect-platform';


// Call the `getMeRef()` function to get a reference to the query.
const ref = getMeRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMeRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## ListUsers
You can execute the `ListUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listUsers(options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUsers(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUsersData, undefined>;

interface ListUsersRef {
  ...
  (dc: DataConnect): QueryRef<ListUsersData, undefined>;
}
export const listUsersRef: ListUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUsersRef:
```typescript
const name = listUsersRef.operationName;
console.log(name);
```

### Variables
The `ListUsers` query has no variables.
### Return Type
Recall that executing the `ListUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUsersData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUsers } from '@basis/dataconnect-platform';


// Call the `listUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUsers(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
listUsers().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `ListUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUsersRef } from '@basis/dataconnect-platform';


// Call the `listUsersRef()` function to get a reference to the query.
const ref = listUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.users);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

## ListOpenAlerts
You can execute the `ListOpenAlerts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listOpenAlerts(options?: ExecuteQueryOptions): QueryPromise<ListOpenAlertsData, undefined>;

interface ListOpenAlertsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListOpenAlertsData, undefined>;
}
export const listOpenAlertsRef: ListOpenAlertsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listOpenAlerts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListOpenAlertsData, undefined>;

interface ListOpenAlertsRef {
  ...
  (dc: DataConnect): QueryRef<ListOpenAlertsData, undefined>;
}
export const listOpenAlertsRef: ListOpenAlertsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listOpenAlertsRef:
```typescript
const name = listOpenAlertsRef.operationName;
console.log(name);
```

### Variables
The `ListOpenAlerts` query has no variables.
### Return Type
Recall that executing the `ListOpenAlerts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListOpenAlertsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListOpenAlerts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listOpenAlerts } from '@basis/dataconnect-platform';


// Call the `listOpenAlerts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listOpenAlerts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listOpenAlerts(dataConnect);

console.log(data.alerts);

// Or, you can use the `Promise` API.
listOpenAlerts().then((response) => {
  const data = response.data;
  console.log(data.alerts);
});
```

### Using `ListOpenAlerts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listOpenAlertsRef } from '@basis/dataconnect-platform';


// Call the `listOpenAlertsRef()` function to get a reference to the query.
const ref = listOpenAlertsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listOpenAlertsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.alerts);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.alerts);
});
```

## ListMyTasks
You can execute the `ListMyTasks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listMyTasks(options?: ExecuteQueryOptions): QueryPromise<ListMyTasksData, undefined>;

interface ListMyTasksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListMyTasksData, undefined>;
}
export const listMyTasksRef: ListMyTasksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listMyTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListMyTasksData, undefined>;

interface ListMyTasksRef {
  ...
  (dc: DataConnect): QueryRef<ListMyTasksData, undefined>;
}
export const listMyTasksRef: ListMyTasksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listMyTasksRef:
```typescript
const name = listMyTasksRef.operationName;
console.log(name);
```

### Variables
The `ListMyTasks` query has no variables.
### Return Type
Recall that executing the `ListMyTasks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListMyTasksData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListMyTasks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listMyTasks } from '@basis/dataconnect-platform';


// Call the `listMyTasks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listMyTasks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listMyTasks(dataConnect);

console.log(data.tasks);

// Or, you can use the `Promise` API.
listMyTasks().then((response) => {
  const data = response.data;
  console.log(data.tasks);
});
```

### Using `ListMyTasks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listMyTasksRef } from '@basis/dataconnect-platform';


// Call the `listMyTasksRef()` function to get a reference to the query.
const ref = listMyTasksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listMyTasksRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.tasks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.tasks);
});
```

## ListTimeline
You can execute the `ListTimeline` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listTimeline(vars: ListTimelineVariables, options?: ExecuteQueryOptions): QueryPromise<ListTimelineData, ListTimelineVariables>;

interface ListTimelineRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListTimelineVariables): QueryRef<ListTimelineData, ListTimelineVariables>;
}
export const listTimelineRef: ListTimelineRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTimeline(dc: DataConnect, vars: ListTimelineVariables, options?: ExecuteQueryOptions): QueryPromise<ListTimelineData, ListTimelineVariables>;

interface ListTimelineRef {
  ...
  (dc: DataConnect, vars: ListTimelineVariables): QueryRef<ListTimelineData, ListTimelineVariables>;
}
export const listTimelineRef: ListTimelineRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTimelineRef:
```typescript
const name = listTimelineRef.operationName;
console.log(name);
```

### Variables
The `ListTimeline` query requires an argument of type `ListTimelineVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListTimelineVariables {
  entityType: string;
  entityId: string;
}
```
### Return Type
Recall that executing the `ListTimeline` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTimelineData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListTimeline`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTimeline, ListTimelineVariables } from '@basis/dataconnect-platform';

// The `ListTimeline` query requires an argument of type `ListTimelineVariables`:
const listTimelineVars: ListTimelineVariables = {
  entityType: ..., 
  entityId: ..., 
};

// Call the `listTimeline()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTimeline(listTimelineVars);
// Variables can be defined inline as well.
const { data } = await listTimeline({ entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTimeline(dataConnect, listTimelineVars);

console.log(data.timelineEvents);

// Or, you can use the `Promise` API.
listTimeline(listTimelineVars).then((response) => {
  const data = response.data;
  console.log(data.timelineEvents);
});
```

### Using `ListTimeline`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTimelineRef, ListTimelineVariables } from '@basis/dataconnect-platform';

// The `ListTimeline` query requires an argument of type `ListTimelineVariables`:
const listTimelineVars: ListTimelineVariables = {
  entityType: ..., 
  entityId: ..., 
};

// Call the `listTimelineRef()` function to get a reference to the query.
const ref = listTimelineRef(listTimelineVars);
// Variables can be defined inline as well.
const ref = listTimelineRef({ entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTimelineRef(dataConnect, listTimelineVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.timelineEvents);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.timelineEvents);
});
```

## ListDocumentsFor
You can execute the `ListDocumentsFor` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listDocumentsFor(vars: ListDocumentsForVariables, options?: ExecuteQueryOptions): QueryPromise<ListDocumentsForData, ListDocumentsForVariables>;

interface ListDocumentsForRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListDocumentsForVariables): QueryRef<ListDocumentsForData, ListDocumentsForVariables>;
}
export const listDocumentsForRef: ListDocumentsForRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDocumentsFor(dc: DataConnect, vars: ListDocumentsForVariables, options?: ExecuteQueryOptions): QueryPromise<ListDocumentsForData, ListDocumentsForVariables>;

interface ListDocumentsForRef {
  ...
  (dc: DataConnect, vars: ListDocumentsForVariables): QueryRef<ListDocumentsForData, ListDocumentsForVariables>;
}
export const listDocumentsForRef: ListDocumentsForRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDocumentsForRef:
```typescript
const name = listDocumentsForRef.operationName;
console.log(name);
```

### Variables
The `ListDocumentsFor` query requires an argument of type `ListDocumentsForVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListDocumentsForVariables {
  entityType: string;
  entityId: string;
}
```
### Return Type
Recall that executing the `ListDocumentsFor` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDocumentsForData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListDocumentsFor`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDocumentsFor, ListDocumentsForVariables } from '@basis/dataconnect-platform';

// The `ListDocumentsFor` query requires an argument of type `ListDocumentsForVariables`:
const listDocumentsForVars: ListDocumentsForVariables = {
  entityType: ..., 
  entityId: ..., 
};

// Call the `listDocumentsFor()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDocumentsFor(listDocumentsForVars);
// Variables can be defined inline as well.
const { data } = await listDocumentsFor({ entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDocumentsFor(dataConnect, listDocumentsForVars);

console.log(data.documentLinks);

// Or, you can use the `Promise` API.
listDocumentsFor(listDocumentsForVars).then((response) => {
  const data = response.data;
  console.log(data.documentLinks);
});
```

### Using `ListDocumentsFor`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDocumentsForRef, ListDocumentsForVariables } from '@basis/dataconnect-platform';

// The `ListDocumentsFor` query requires an argument of type `ListDocumentsForVariables`:
const listDocumentsForVars: ListDocumentsForVariables = {
  entityType: ..., 
  entityId: ..., 
};

// Call the `listDocumentsForRef()` function to get a reference to the query.
const ref = listDocumentsForRef(listDocumentsForVars);
// Variables can be defined inline as well.
const ref = listDocumentsForRef({ entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDocumentsForRef(dataConnect, listDocumentsForVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.documentLinks);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.documentLinks);
});
```

## ListCountries
You can execute the `ListCountries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listCountries(options?: ExecuteQueryOptions): QueryPromise<ListCountriesData, undefined>;

interface ListCountriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCountriesData, undefined>;
}
export const listCountriesRef: ListCountriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCountries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCountriesData, undefined>;

interface ListCountriesRef {
  ...
  (dc: DataConnect): QueryRef<ListCountriesData, undefined>;
}
export const listCountriesRef: ListCountriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCountriesRef:
```typescript
const name = listCountriesRef.operationName;
console.log(name);
```

### Variables
The `ListCountries` query has no variables.
### Return Type
Recall that executing the `ListCountries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCountriesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCountriesData {
  countries: ({
    code: string;
    name: string;
    region?: string | null;
  } & Country_Key)[];
}
```
### Using `ListCountries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCountries } from '@basis/dataconnect-platform';


// Call the `listCountries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCountries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCountries(dataConnect);

console.log(data.countries);

// Or, you can use the `Promise` API.
listCountries().then((response) => {
  const data = response.data;
  console.log(data.countries);
});
```

### Using `ListCountries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCountriesRef } from '@basis/dataconnect-platform';


// Call the `listCountriesRef()` function to get a reference to the query.
const ref = listCountriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCountriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.countries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.countries);
});
```

## ListCurrencies
You can execute the `ListCurrencies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listCurrencies(options?: ExecuteQueryOptions): QueryPromise<ListCurrenciesData, undefined>;

interface ListCurrenciesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCurrenciesData, undefined>;
}
export const listCurrenciesRef: ListCurrenciesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCurrencies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCurrenciesData, undefined>;

interface ListCurrenciesRef {
  ...
  (dc: DataConnect): QueryRef<ListCurrenciesData, undefined>;
}
export const listCurrenciesRef: ListCurrenciesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCurrenciesRef:
```typescript
const name = listCurrenciesRef.operationName;
console.log(name);
```

### Variables
The `ListCurrencies` query has no variables.
### Return Type
Recall that executing the `ListCurrencies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCurrenciesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListCurrenciesData {
  currencies: ({
    code: string;
    name: string;
    minorUnits: number;
  } & Currency_Key)[];
}
```
### Using `ListCurrencies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCurrencies } from '@basis/dataconnect-platform';


// Call the `listCurrencies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCurrencies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCurrencies(dataConnect);

console.log(data.currencies);

// Or, you can use the `Promise` API.
listCurrencies().then((response) => {
  const data = response.data;
  console.log(data.currencies);
});
```

### Using `ListCurrencies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCurrenciesRef } from '@basis/dataconnect-platform';


// Call the `listCurrenciesRef()` function to get a reference to the query.
const ref = listCurrenciesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCurrenciesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.currencies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.currencies);
});
```

## ListUoms
You can execute the `ListUoms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listUoms(options?: ExecuteQueryOptions): QueryPromise<ListUomsData, undefined>;

interface ListUomsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListUomsData, undefined>;
}
export const listUomsRef: ListUomsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listUoms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListUomsData, undefined>;

interface ListUomsRef {
  ...
  (dc: DataConnect): QueryRef<ListUomsData, undefined>;
}
export const listUomsRef: ListUomsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listUomsRef:
```typescript
const name = listUomsRef.operationName;
console.log(name);
```

### Variables
The `ListUoms` query has no variables.
### Return Type
Recall that executing the `ListUoms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListUomsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListUomsData {
  uoms: ({
    code: string;
    name: string;
    dimension: UomDimension;
    toCanonical: string;
  } & Uom_Key)[];
}
```
### Using `ListUoms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listUoms } from '@basis/dataconnect-platform';


// Call the `listUoms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listUoms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listUoms(dataConnect);

console.log(data.uoms);

// Or, you can use the `Promise` API.
listUoms().then((response) => {
  const data = response.data;
  console.log(data.uoms);
});
```

### Using `ListUoms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listUomsRef } from '@basis/dataconnect-platform';


// Call the `listUomsRef()` function to get a reference to the query.
const ref = listUomsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listUomsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.uoms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.uoms);
});
```

## ListIncoterms
You can execute the `ListIncoterms` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listIncoterms(options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;

interface ListIncotermsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListIncotermsData, undefined>;
}
export const listIncotermsRef: ListIncotermsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listIncoterms(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListIncotermsData, undefined>;

interface ListIncotermsRef {
  ...
  (dc: DataConnect): QueryRef<ListIncotermsData, undefined>;
}
export const listIncotermsRef: ListIncotermsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listIncotermsRef:
```typescript
const name = listIncotermsRef.operationName;
console.log(name);
```

### Variables
The `ListIncoterms` query has no variables.
### Return Type
Recall that executing the `ListIncoterms` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListIncotermsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListIncotermsData {
  incoterms: ({
    code: string;
    name: string;
    version: number;
  } & Incoterm_Key)[];
}
```
### Using `ListIncoterms`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listIncoterms } from '@basis/dataconnect-platform';


// Call the `listIncoterms()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listIncoterms();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listIncoterms(dataConnect);

console.log(data.incoterms);

// Or, you can use the `Promise` API.
listIncoterms().then((response) => {
  const data = response.data;
  console.log(data.incoterms);
});
```

### Using `ListIncoterms`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listIncotermsRef } from '@basis/dataconnect-platform';


// Call the `listIncotermsRef()` function to get a reference to the query.
const ref = listIncotermsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listIncotermsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.incoterms);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.incoterms);
});
```

## ListLegalEntities
You can execute the `ListLegalEntities` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listLegalEntities(options?: ExecuteQueryOptions): QueryPromise<ListLegalEntitiesData, undefined>;

interface ListLegalEntitiesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListLegalEntitiesData, undefined>;
}
export const listLegalEntitiesRef: ListLegalEntitiesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listLegalEntities(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListLegalEntitiesData, undefined>;

interface ListLegalEntitiesRef {
  ...
  (dc: DataConnect): QueryRef<ListLegalEntitiesData, undefined>;
}
export const listLegalEntitiesRef: ListLegalEntitiesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listLegalEntitiesRef:
```typescript
const name = listLegalEntitiesRef.operationName;
console.log(name);
```

### Variables
The `ListLegalEntities` query has no variables.
### Return Type
Recall that executing the `ListLegalEntities` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListLegalEntitiesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListLegalEntities`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listLegalEntities } from '@basis/dataconnect-platform';


// Call the `listLegalEntities()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listLegalEntities();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listLegalEntities(dataConnect);

console.log(data.legalEntities);

// Or, you can use the `Promise` API.
listLegalEntities().then((response) => {
  const data = response.data;
  console.log(data.legalEntities);
});
```

### Using `ListLegalEntities`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listLegalEntitiesRef } from '@basis/dataconnect-platform';


// Call the `listLegalEntitiesRef()` function to get a reference to the query.
const ref = listLegalEntitiesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listLegalEntitiesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.legalEntities);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.legalEntities);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `platform` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AcknowledgeAlert
You can execute the `AcknowledgeAlert` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
acknowledgeAlert(vars: AcknowledgeAlertVariables): MutationPromise<AcknowledgeAlertData, AcknowledgeAlertVariables>;

interface AcknowledgeAlertRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AcknowledgeAlertVariables): MutationRef<AcknowledgeAlertData, AcknowledgeAlertVariables>;
}
export const acknowledgeAlertRef: AcknowledgeAlertRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
acknowledgeAlert(dc: DataConnect, vars: AcknowledgeAlertVariables): MutationPromise<AcknowledgeAlertData, AcknowledgeAlertVariables>;

interface AcknowledgeAlertRef {
  ...
  (dc: DataConnect, vars: AcknowledgeAlertVariables): MutationRef<AcknowledgeAlertData, AcknowledgeAlertVariables>;
}
export const acknowledgeAlertRef: AcknowledgeAlertRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the acknowledgeAlertRef:
```typescript
const name = acknowledgeAlertRef.operationName;
console.log(name);
```

### Variables
The `AcknowledgeAlert` mutation requires an argument of type `AcknowledgeAlertVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AcknowledgeAlertVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `AcknowledgeAlert` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AcknowledgeAlertData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AcknowledgeAlertData {
  alert_update?: Alert_Key | null;
}
```
### Using `AcknowledgeAlert`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, acknowledgeAlert, AcknowledgeAlertVariables } from '@basis/dataconnect-platform';

// The `AcknowledgeAlert` mutation requires an argument of type `AcknowledgeAlertVariables`:
const acknowledgeAlertVars: AcknowledgeAlertVariables = {
  id: ..., 
};

// Call the `acknowledgeAlert()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await acknowledgeAlert(acknowledgeAlertVars);
// Variables can be defined inline as well.
const { data } = await acknowledgeAlert({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await acknowledgeAlert(dataConnect, acknowledgeAlertVars);

console.log(data.alert_update);

// Or, you can use the `Promise` API.
acknowledgeAlert(acknowledgeAlertVars).then((response) => {
  const data = response.data;
  console.log(data.alert_update);
});
```

### Using `AcknowledgeAlert`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, acknowledgeAlertRef, AcknowledgeAlertVariables } from '@basis/dataconnect-platform';

// The `AcknowledgeAlert` mutation requires an argument of type `AcknowledgeAlertVariables`:
const acknowledgeAlertVars: AcknowledgeAlertVariables = {
  id: ..., 
};

// Call the `acknowledgeAlertRef()` function to get a reference to the mutation.
const ref = acknowledgeAlertRef(acknowledgeAlertVars);
// Variables can be defined inline as well.
const ref = acknowledgeAlertRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = acknowledgeAlertRef(dataConnect, acknowledgeAlertVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.alert_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.alert_update);
});
```

## CreateTask
You can execute the `CreateTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
createTask(vars: CreateTaskVariables): MutationPromise<CreateTaskData, CreateTaskVariables>;

interface CreateTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTaskVariables): MutationRef<CreateTaskData, CreateTaskVariables>;
}
export const createTaskRef: CreateTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTask(dc: DataConnect, vars: CreateTaskVariables): MutationPromise<CreateTaskData, CreateTaskVariables>;

interface CreateTaskRef {
  ...
  (dc: DataConnect, vars: CreateTaskVariables): MutationRef<CreateTaskData, CreateTaskVariables>;
}
export const createTaskRef: CreateTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTaskRef:
```typescript
const name = createTaskRef.operationName;
console.log(name);
```

### Variables
The `CreateTask` mutation requires an argument of type `CreateTaskVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateTaskVariables {
  title: string;
  details?: string | null;
  assigneeUid?: string | null;
  dueOn?: DateString | null;
  entityType?: string | null;
  entityId?: string | null;
}
```
### Return Type
Recall that executing the `CreateTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTaskData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTaskData {
  task_insert: Task_Key;
}
```
### Using `CreateTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTask, CreateTaskVariables } from '@basis/dataconnect-platform';

// The `CreateTask` mutation requires an argument of type `CreateTaskVariables`:
const createTaskVars: CreateTaskVariables = {
  title: ..., 
  details: ..., // optional
  assigneeUid: ..., // optional
  dueOn: ..., // optional
  entityType: ..., // optional
  entityId: ..., // optional
};

// Call the `createTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTask(createTaskVars);
// Variables can be defined inline as well.
const { data } = await createTask({ title: ..., details: ..., assigneeUid: ..., dueOn: ..., entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTask(dataConnect, createTaskVars);

console.log(data.task_insert);

// Or, you can use the `Promise` API.
createTask(createTaskVars).then((response) => {
  const data = response.data;
  console.log(data.task_insert);
});
```

### Using `CreateTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTaskRef, CreateTaskVariables } from '@basis/dataconnect-platform';

// The `CreateTask` mutation requires an argument of type `CreateTaskVariables`:
const createTaskVars: CreateTaskVariables = {
  title: ..., 
  details: ..., // optional
  assigneeUid: ..., // optional
  dueOn: ..., // optional
  entityType: ..., // optional
  entityId: ..., // optional
};

// Call the `createTaskRef()` function to get a reference to the mutation.
const ref = createTaskRef(createTaskVars);
// Variables can be defined inline as well.
const ref = createTaskRef({ title: ..., details: ..., assigneeUid: ..., dueOn: ..., entityType: ..., entityId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTaskRef(dataConnect, createTaskVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.task_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.task_insert);
});
```

## CompleteTask
You can execute the `CompleteTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
completeTask(vars: CompleteTaskVariables): MutationPromise<CompleteTaskData, CompleteTaskVariables>;

interface CompleteTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CompleteTaskVariables): MutationRef<CompleteTaskData, CompleteTaskVariables>;
}
export const completeTaskRef: CompleteTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
completeTask(dc: DataConnect, vars: CompleteTaskVariables): MutationPromise<CompleteTaskData, CompleteTaskVariables>;

interface CompleteTaskRef {
  ...
  (dc: DataConnect, vars: CompleteTaskVariables): MutationRef<CompleteTaskData, CompleteTaskVariables>;
}
export const completeTaskRef: CompleteTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the completeTaskRef:
```typescript
const name = completeTaskRef.operationName;
console.log(name);
```

### Variables
The `CompleteTask` mutation requires an argument of type `CompleteTaskVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CompleteTaskVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `CompleteTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CompleteTaskData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CompleteTaskData {
  task_update?: Task_Key | null;
}
```
### Using `CompleteTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, completeTask, CompleteTaskVariables } from '@basis/dataconnect-platform';

// The `CompleteTask` mutation requires an argument of type `CompleteTaskVariables`:
const completeTaskVars: CompleteTaskVariables = {
  id: ..., 
};

// Call the `completeTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await completeTask(completeTaskVars);
// Variables can be defined inline as well.
const { data } = await completeTask({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await completeTask(dataConnect, completeTaskVars);

console.log(data.task_update);

// Or, you can use the `Promise` API.
completeTask(completeTaskVars).then((response) => {
  const data = response.data;
  console.log(data.task_update);
});
```

### Using `CompleteTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, completeTaskRef, CompleteTaskVariables } from '@basis/dataconnect-platform';

// The `CompleteTask` mutation requires an argument of type `CompleteTaskVariables`:
const completeTaskVars: CompleteTaskVariables = {
  id: ..., 
};

// Call the `completeTaskRef()` function to get a reference to the mutation.
const ref = completeTaskRef(completeTaskVars);
// Variables can be defined inline as well.
const ref = completeTaskRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = completeTaskRef(dataConnect, completeTaskVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.task_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.task_update);
});
```

## AddNote
You can execute the `AddNote` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
addNote(vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;

interface AddNoteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
}
export const addNoteRef: AddNoteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addNote(dc: DataConnect, vars: AddNoteVariables): MutationPromise<AddNoteData, AddNoteVariables>;

interface AddNoteRef {
  ...
  (dc: DataConnect, vars: AddNoteVariables): MutationRef<AddNoteData, AddNoteVariables>;
}
export const addNoteRef: AddNoteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addNoteRef:
```typescript
const name = addNoteRef.operationName;
console.log(name);
```

### Variables
The `AddNote` mutation requires an argument of type `AddNoteVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddNoteVariables {
  entityType: string;
  entityId: string;
  note: string;
}
```
### Return Type
Recall that executing the `AddNote` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddNoteData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddNoteData {
  timelineEvent_insert: TimelineEvent_Key;
}
```
### Using `AddNote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addNote, AddNoteVariables } from '@basis/dataconnect-platform';

// The `AddNote` mutation requires an argument of type `AddNoteVariables`:
const addNoteVars: AddNoteVariables = {
  entityType: ..., 
  entityId: ..., 
  note: ..., 
};

// Call the `addNote()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addNote(addNoteVars);
// Variables can be defined inline as well.
const { data } = await addNote({ entityType: ..., entityId: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addNote(dataConnect, addNoteVars);

console.log(data.timelineEvent_insert);

// Or, you can use the `Promise` API.
addNote(addNoteVars).then((response) => {
  const data = response.data;
  console.log(data.timelineEvent_insert);
});
```

### Using `AddNote`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addNoteRef, AddNoteVariables } from '@basis/dataconnect-platform';

// The `AddNote` mutation requires an argument of type `AddNoteVariables`:
const addNoteVars: AddNoteVariables = {
  entityType: ..., 
  entityId: ..., 
  note: ..., 
};

// Call the `addNoteRef()` function to get a reference to the mutation.
const ref = addNoteRef(addNoteVars);
// Variables can be defined inline as well.
const ref = addNoteRef({ entityType: ..., entityId: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addNoteRef(dataConnect, addNoteVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.timelineEvent_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.timelineEvent_insert);
});
```

## UpdateMyPreferences
You can execute the `UpdateMyPreferences` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
updateMyPreferences(vars?: UpdateMyPreferencesVariables): MutationPromise<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;

interface UpdateMyPreferencesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars?: UpdateMyPreferencesVariables): MutationRef<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;
}
export const updateMyPreferencesRef: UpdateMyPreferencesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateMyPreferences(dc: DataConnect, vars?: UpdateMyPreferencesVariables): MutationPromise<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;

interface UpdateMyPreferencesRef {
  ...
  (dc: DataConnect, vars?: UpdateMyPreferencesVariables): MutationRef<UpdateMyPreferencesData, UpdateMyPreferencesVariables>;
}
export const updateMyPreferencesRef: UpdateMyPreferencesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateMyPreferencesRef:
```typescript
const name = updateMyPreferencesRef.operationName;
console.log(name);
```

### Variables
The `UpdateMyPreferences` mutation has an optional argument of type `UpdateMyPreferencesVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateMyPreferencesVariables {
  locale?: string | null;
  timeZone?: string | null;
}
```
### Return Type
Recall that executing the `UpdateMyPreferences` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateMyPreferencesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateMyPreferencesData {
  user_update?: User_Key | null;
}
```
### Using `UpdateMyPreferences`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateMyPreferences, UpdateMyPreferencesVariables } from '@basis/dataconnect-platform';

// The `UpdateMyPreferences` mutation has an optional argument of type `UpdateMyPreferencesVariables`:
const updateMyPreferencesVars: UpdateMyPreferencesVariables = {
  locale: ..., // optional
  timeZone: ..., // optional
};

// Call the `updateMyPreferences()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateMyPreferences(updateMyPreferencesVars);
// Variables can be defined inline as well.
const { data } = await updateMyPreferences({ locale: ..., timeZone: ..., });
// Since all variables are optional for this mutation, you can omit the `UpdateMyPreferencesVariables` argument.
const { data } = await updateMyPreferences();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateMyPreferences(dataConnect, updateMyPreferencesVars);

console.log(data.user_update);

// Or, you can use the `Promise` API.
updateMyPreferences(updateMyPreferencesVars).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

### Using `UpdateMyPreferences`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateMyPreferencesRef, UpdateMyPreferencesVariables } from '@basis/dataconnect-platform';

// The `UpdateMyPreferences` mutation has an optional argument of type `UpdateMyPreferencesVariables`:
const updateMyPreferencesVars: UpdateMyPreferencesVariables = {
  locale: ..., // optional
  timeZone: ..., // optional
};

// Call the `updateMyPreferencesRef()` function to get a reference to the mutation.
const ref = updateMyPreferencesRef(updateMyPreferencesVars);
// Variables can be defined inline as well.
const ref = updateMyPreferencesRef({ locale: ..., timeZone: ..., });
// Since all variables are optional for this mutation, you can omit the `UpdateMyPreferencesVariables` argument.
const ref = updateMyPreferencesRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateMyPreferencesRef(dataConnect, updateMyPreferencesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_update);
});
```

