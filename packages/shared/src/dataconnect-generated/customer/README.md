# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `customer`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*CustomerMe*](#customerme)
  - [*CustomerQuotes*](#customerquotes)
  - [*CustomerQuote*](#customerquote)
  - [*CustomerOrders*](#customerorders)
  - [*CustomerOrder*](#customerorder)
  - [*CustomerShipments*](#customershipments)
  - [*CustomerShipment*](#customershipment)
  - [*CustomerShipmentLines*](#customershipmentlines)
  - [*CustomerInvoices*](#customerinvoices)
  - [*CustomerSampleRequests*](#customersamplerequests)
  - [*CustomerTeam*](#customerteam)
  - [*CustomerInvitations*](#customerinvitations)
  - [*CustomerAddresses*](#customeraddresses)
  - [*CustomerCountries*](#customercountries)
- [**Mutations**](#mutations)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `customer`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@basis/dataconnect-customer` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@basis/dataconnect-customer';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@basis/dataconnect-customer';

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

Below are examples of how to use the `customer` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## CustomerMe
You can execute the `CustomerMe` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerMe(options?: ExecuteQueryOptions): QueryPromise<CustomerMeData, undefined>;

interface CustomerMeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerMeData, undefined>;
}
export const customerMeRef: CustomerMeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerMe(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerMeData, undefined>;

interface CustomerMeRef {
  ...
  (dc: DataConnect): QueryRef<CustomerMeData, undefined>;
}
export const customerMeRef: CustomerMeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerMeRef:
```typescript
const name = customerMeRef.operationName;
console.log(name);
```

### Variables
The `CustomerMe` query has no variables.
### Return Type
Recall that executing the `CustomerMe` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerMeData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerMe`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerMe } from '@basis/dataconnect-customer';


// Call the `customerMe()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerMe();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerMe(dataConnect);

console.log(data.customerUsers);

// Or, you can use the `Promise` API.
customerMe().then((response) => {
  const data = response.data;
  console.log(data.customerUsers);
});
```

### Using `CustomerMe`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerMeRef } from '@basis/dataconnect-customer';


// Call the `customerMeRef()` function to get a reference to the query.
const ref = customerMeRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerMeRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.customerUsers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.customerUsers);
});
```

## CustomerQuotes
You can execute the `CustomerQuotes` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerQuotes(options?: ExecuteQueryOptions): QueryPromise<CustomerQuotesData, undefined>;

interface CustomerQuotesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerQuotesData, undefined>;
}
export const customerQuotesRef: CustomerQuotesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerQuotes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerQuotesData, undefined>;

interface CustomerQuotesRef {
  ...
  (dc: DataConnect): QueryRef<CustomerQuotesData, undefined>;
}
export const customerQuotesRef: CustomerQuotesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerQuotesRef:
```typescript
const name = customerQuotesRef.operationName;
console.log(name);
```

### Variables
The `CustomerQuotes` query has no variables.
### Return Type
Recall that executing the `CustomerQuotes` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerQuotesData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerQuotes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerQuotes } from '@basis/dataconnect-customer';


// Call the `customerQuotes()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerQuotes();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerQuotes(dataConnect);

console.log(data.quotes);

// Or, you can use the `Promise` API.
customerQuotes().then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

### Using `CustomerQuotes`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerQuotesRef } from '@basis/dataconnect-customer';


// Call the `customerQuotesRef()` function to get a reference to the query.
const ref = customerQuotesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerQuotesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.quotes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

## CustomerQuote
You can execute the `CustomerQuote` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerQuote(vars: CustomerQuoteVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerQuoteData, CustomerQuoteVariables>;

interface CustomerQuoteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerQuoteVariables): QueryRef<CustomerQuoteData, CustomerQuoteVariables>;
}
export const customerQuoteRef: CustomerQuoteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerQuote(dc: DataConnect, vars: CustomerQuoteVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerQuoteData, CustomerQuoteVariables>;

interface CustomerQuoteRef {
  ...
  (dc: DataConnect, vars: CustomerQuoteVariables): QueryRef<CustomerQuoteData, CustomerQuoteVariables>;
}
export const customerQuoteRef: CustomerQuoteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerQuoteRef:
```typescript
const name = customerQuoteRef.operationName;
console.log(name);
```

### Variables
The `CustomerQuote` query requires an argument of type `CustomerQuoteVariables`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CustomerQuoteVariables {
  number: string;
}
```
### Return Type
Recall that executing the `CustomerQuote` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerQuoteData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerQuote`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerQuote, CustomerQuoteVariables } from '@basis/dataconnect-customer';

// The `CustomerQuote` query requires an argument of type `CustomerQuoteVariables`:
const customerQuoteVars: CustomerQuoteVariables = {
  number: ..., 
};

// Call the `customerQuote()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerQuote(customerQuoteVars);
// Variables can be defined inline as well.
const { data } = await customerQuote({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerQuote(dataConnect, customerQuoteVars);

console.log(data.quotes);

// Or, you can use the `Promise` API.
customerQuote(customerQuoteVars).then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

### Using `CustomerQuote`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerQuoteRef, CustomerQuoteVariables } from '@basis/dataconnect-customer';

// The `CustomerQuote` query requires an argument of type `CustomerQuoteVariables`:
const customerQuoteVars: CustomerQuoteVariables = {
  number: ..., 
};

// Call the `customerQuoteRef()` function to get a reference to the query.
const ref = customerQuoteRef(customerQuoteVars);
// Variables can be defined inline as well.
const ref = customerQuoteRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerQuoteRef(dataConnect, customerQuoteVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.quotes);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.quotes);
});
```

## CustomerOrders
You can execute the `CustomerOrders` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerOrders(options?: ExecuteQueryOptions): QueryPromise<CustomerOrdersData, undefined>;

interface CustomerOrdersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerOrdersData, undefined>;
}
export const customerOrdersRef: CustomerOrdersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerOrders(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerOrdersData, undefined>;

interface CustomerOrdersRef {
  ...
  (dc: DataConnect): QueryRef<CustomerOrdersData, undefined>;
}
export const customerOrdersRef: CustomerOrdersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerOrdersRef:
```typescript
const name = customerOrdersRef.operationName;
console.log(name);
```

### Variables
The `CustomerOrders` query has no variables.
### Return Type
Recall that executing the `CustomerOrders` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerOrdersData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerOrders`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerOrders } from '@basis/dataconnect-customer';


// Call the `customerOrders()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerOrders();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerOrders(dataConnect);

console.log(data.salesOrders);

// Or, you can use the `Promise` API.
customerOrders().then((response) => {
  const data = response.data;
  console.log(data.salesOrders);
});
```

### Using `CustomerOrders`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerOrdersRef } from '@basis/dataconnect-customer';


// Call the `customerOrdersRef()` function to get a reference to the query.
const ref = customerOrdersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerOrdersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.salesOrders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.salesOrders);
});
```

## CustomerOrder
You can execute the `CustomerOrder` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerOrder(vars: CustomerOrderVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerOrderData, CustomerOrderVariables>;

interface CustomerOrderRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerOrderVariables): QueryRef<CustomerOrderData, CustomerOrderVariables>;
}
export const customerOrderRef: CustomerOrderRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerOrder(dc: DataConnect, vars: CustomerOrderVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerOrderData, CustomerOrderVariables>;

interface CustomerOrderRef {
  ...
  (dc: DataConnect, vars: CustomerOrderVariables): QueryRef<CustomerOrderData, CustomerOrderVariables>;
}
export const customerOrderRef: CustomerOrderRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerOrderRef:
```typescript
const name = customerOrderRef.operationName;
console.log(name);
```

### Variables
The `CustomerOrder` query requires an argument of type `CustomerOrderVariables`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CustomerOrderVariables {
  number: string;
}
```
### Return Type
Recall that executing the `CustomerOrder` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerOrderData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerOrder`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerOrder, CustomerOrderVariables } from '@basis/dataconnect-customer';

// The `CustomerOrder` query requires an argument of type `CustomerOrderVariables`:
const customerOrderVars: CustomerOrderVariables = {
  number: ..., 
};

// Call the `customerOrder()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerOrder(customerOrderVars);
// Variables can be defined inline as well.
const { data } = await customerOrder({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerOrder(dataConnect, customerOrderVars);

console.log(data.salesOrders);

// Or, you can use the `Promise` API.
customerOrder(customerOrderVars).then((response) => {
  const data = response.data;
  console.log(data.salesOrders);
});
```

### Using `CustomerOrder`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerOrderRef, CustomerOrderVariables } from '@basis/dataconnect-customer';

// The `CustomerOrder` query requires an argument of type `CustomerOrderVariables`:
const customerOrderVars: CustomerOrderVariables = {
  number: ..., 
};

// Call the `customerOrderRef()` function to get a reference to the query.
const ref = customerOrderRef(customerOrderVars);
// Variables can be defined inline as well.
const ref = customerOrderRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerOrderRef(dataConnect, customerOrderVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.salesOrders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.salesOrders);
});
```

## CustomerShipments
You can execute the `CustomerShipments` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerShipments(options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentsData, undefined>;

interface CustomerShipmentsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerShipmentsData, undefined>;
}
export const customerShipmentsRef: CustomerShipmentsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerShipments(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentsData, undefined>;

interface CustomerShipmentsRef {
  ...
  (dc: DataConnect): QueryRef<CustomerShipmentsData, undefined>;
}
export const customerShipmentsRef: CustomerShipmentsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerShipmentsRef:
```typescript
const name = customerShipmentsRef.operationName;
console.log(name);
```

### Variables
The `CustomerShipments` query has no variables.
### Return Type
Recall that executing the `CustomerShipments` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerShipmentsData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerShipments`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerShipments } from '@basis/dataconnect-customer';


// Call the `customerShipments()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerShipments();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerShipments(dataConnect);

console.log(data.shipments);

// Or, you can use the `Promise` API.
customerShipments().then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

### Using `CustomerShipments`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerShipmentsRef } from '@basis/dataconnect-customer';


// Call the `customerShipmentsRef()` function to get a reference to the query.
const ref = customerShipmentsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerShipmentsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shipments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

## CustomerShipment
You can execute the `CustomerShipment` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerShipment(vars: CustomerShipmentVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentData, CustomerShipmentVariables>;

interface CustomerShipmentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerShipmentVariables): QueryRef<CustomerShipmentData, CustomerShipmentVariables>;
}
export const customerShipmentRef: CustomerShipmentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerShipment(dc: DataConnect, vars: CustomerShipmentVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentData, CustomerShipmentVariables>;

interface CustomerShipmentRef {
  ...
  (dc: DataConnect, vars: CustomerShipmentVariables): QueryRef<CustomerShipmentData, CustomerShipmentVariables>;
}
export const customerShipmentRef: CustomerShipmentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerShipmentRef:
```typescript
const name = customerShipmentRef.operationName;
console.log(name);
```

### Variables
The `CustomerShipment` query requires an argument of type `CustomerShipmentVariables`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CustomerShipmentVariables {
  number: string;
}
```
### Return Type
Recall that executing the `CustomerShipment` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerShipmentData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerShipment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerShipment, CustomerShipmentVariables } from '@basis/dataconnect-customer';

// The `CustomerShipment` query requires an argument of type `CustomerShipmentVariables`:
const customerShipmentVars: CustomerShipmentVariables = {
  number: ..., 
};

// Call the `customerShipment()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerShipment(customerShipmentVars);
// Variables can be defined inline as well.
const { data } = await customerShipment({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerShipment(dataConnect, customerShipmentVars);

console.log(data.shipments);

// Or, you can use the `Promise` API.
customerShipment(customerShipmentVars).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

### Using `CustomerShipment`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerShipmentRef, CustomerShipmentVariables } from '@basis/dataconnect-customer';

// The `CustomerShipment` query requires an argument of type `CustomerShipmentVariables`:
const customerShipmentVars: CustomerShipmentVariables = {
  number: ..., 
};

// Call the `customerShipmentRef()` function to get a reference to the query.
const ref = customerShipmentRef(customerShipmentVars);
// Variables can be defined inline as well.
const ref = customerShipmentRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerShipmentRef(dataConnect, customerShipmentVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shipments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

## CustomerShipmentLines
You can execute the `CustomerShipmentLines` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerShipmentLines(vars: CustomerShipmentLinesVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;

interface CustomerShipmentLinesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CustomerShipmentLinesVariables): QueryRef<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;
}
export const customerShipmentLinesRef: CustomerShipmentLinesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerShipmentLines(dc: DataConnect, vars: CustomerShipmentLinesVariables, options?: ExecuteQueryOptions): QueryPromise<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;

interface CustomerShipmentLinesRef {
  ...
  (dc: DataConnect, vars: CustomerShipmentLinesVariables): QueryRef<CustomerShipmentLinesData, CustomerShipmentLinesVariables>;
}
export const customerShipmentLinesRef: CustomerShipmentLinesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerShipmentLinesRef:
```typescript
const name = customerShipmentLinesRef.operationName;
console.log(name);
```

### Variables
The `CustomerShipmentLines` query requires an argument of type `CustomerShipmentLinesVariables`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CustomerShipmentLinesVariables {
  number: string;
}
```
### Return Type
Recall that executing the `CustomerShipmentLines` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerShipmentLinesData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerShipmentLines`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerShipmentLines, CustomerShipmentLinesVariables } from '@basis/dataconnect-customer';

// The `CustomerShipmentLines` query requires an argument of type `CustomerShipmentLinesVariables`:
const customerShipmentLinesVars: CustomerShipmentLinesVariables = {
  number: ..., 
};

// Call the `customerShipmentLines()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerShipmentLines(customerShipmentLinesVars);
// Variables can be defined inline as well.
const { data } = await customerShipmentLines({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerShipmentLines(dataConnect, customerShipmentLinesVars);

console.log(data.shipments);

// Or, you can use the `Promise` API.
customerShipmentLines(customerShipmentLinesVars).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

### Using `CustomerShipmentLines`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerShipmentLinesRef, CustomerShipmentLinesVariables } from '@basis/dataconnect-customer';

// The `CustomerShipmentLines` query requires an argument of type `CustomerShipmentLinesVariables`:
const customerShipmentLinesVars: CustomerShipmentLinesVariables = {
  number: ..., 
};

// Call the `customerShipmentLinesRef()` function to get a reference to the query.
const ref = customerShipmentLinesRef(customerShipmentLinesVars);
// Variables can be defined inline as well.
const ref = customerShipmentLinesRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerShipmentLinesRef(dataConnect, customerShipmentLinesVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shipments);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shipments);
});
```

## CustomerInvoices
You can execute the `CustomerInvoices` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerInvoices(options?: ExecuteQueryOptions): QueryPromise<CustomerInvoicesData, undefined>;

interface CustomerInvoicesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerInvoicesData, undefined>;
}
export const customerInvoicesRef: CustomerInvoicesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerInvoices(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerInvoicesData, undefined>;

interface CustomerInvoicesRef {
  ...
  (dc: DataConnect): QueryRef<CustomerInvoicesData, undefined>;
}
export const customerInvoicesRef: CustomerInvoicesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerInvoicesRef:
```typescript
const name = customerInvoicesRef.operationName;
console.log(name);
```

### Variables
The `CustomerInvoices` query has no variables.
### Return Type
Recall that executing the `CustomerInvoices` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerInvoicesData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerInvoices`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerInvoices } from '@basis/dataconnect-customer';


// Call the `customerInvoices()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerInvoices();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerInvoices(dataConnect);

console.log(data.invoiceRefs);

// Or, you can use the `Promise` API.
customerInvoices().then((response) => {
  const data = response.data;
  console.log(data.invoiceRefs);
});
```

### Using `CustomerInvoices`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerInvoicesRef } from '@basis/dataconnect-customer';


// Call the `customerInvoicesRef()` function to get a reference to the query.
const ref = customerInvoicesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerInvoicesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.invoiceRefs);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.invoiceRefs);
});
```

## CustomerSampleRequests
You can execute the `CustomerSampleRequests` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerSampleRequests(options?: ExecuteQueryOptions): QueryPromise<CustomerSampleRequestsData, undefined>;

interface CustomerSampleRequestsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerSampleRequestsData, undefined>;
}
export const customerSampleRequestsRef: CustomerSampleRequestsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerSampleRequests(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerSampleRequestsData, undefined>;

interface CustomerSampleRequestsRef {
  ...
  (dc: DataConnect): QueryRef<CustomerSampleRequestsData, undefined>;
}
export const customerSampleRequestsRef: CustomerSampleRequestsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerSampleRequestsRef:
```typescript
const name = customerSampleRequestsRef.operationName;
console.log(name);
```

### Variables
The `CustomerSampleRequests` query has no variables.
### Return Type
Recall that executing the `CustomerSampleRequests` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerSampleRequestsData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerSampleRequests`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerSampleRequests } from '@basis/dataconnect-customer';


// Call the `customerSampleRequests()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerSampleRequests();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerSampleRequests(dataConnect);

console.log(data.inquiries);

// Or, you can use the `Promise` API.
customerSampleRequests().then((response) => {
  const data = response.data;
  console.log(data.inquiries);
});
```

### Using `CustomerSampleRequests`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerSampleRequestsRef } from '@basis/dataconnect-customer';


// Call the `customerSampleRequestsRef()` function to get a reference to the query.
const ref = customerSampleRequestsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerSampleRequestsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.inquiries);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.inquiries);
});
```

## CustomerTeam
You can execute the `CustomerTeam` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerTeam(options?: ExecuteQueryOptions): QueryPromise<CustomerTeamData, undefined>;

interface CustomerTeamRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerTeamData, undefined>;
}
export const customerTeamRef: CustomerTeamRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerTeam(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerTeamData, undefined>;

interface CustomerTeamRef {
  ...
  (dc: DataConnect): QueryRef<CustomerTeamData, undefined>;
}
export const customerTeamRef: CustomerTeamRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerTeamRef:
```typescript
const name = customerTeamRef.operationName;
console.log(name);
```

### Variables
The `CustomerTeam` query has no variables.
### Return Type
Recall that executing the `CustomerTeam` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerTeamData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerTeam`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerTeam } from '@basis/dataconnect-customer';


// Call the `customerTeam()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerTeam();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerTeam(dataConnect);

console.log(data.customerUsers);

// Or, you can use the `Promise` API.
customerTeam().then((response) => {
  const data = response.data;
  console.log(data.customerUsers);
});
```

### Using `CustomerTeam`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerTeamRef } from '@basis/dataconnect-customer';


// Call the `customerTeamRef()` function to get a reference to the query.
const ref = customerTeamRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerTeamRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.customerUsers);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.customerUsers);
});
```

## CustomerInvitations
You can execute the `CustomerInvitations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerInvitations(options?: ExecuteQueryOptions): QueryPromise<CustomerInvitationsData, undefined>;

interface CustomerInvitationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerInvitationsData, undefined>;
}
export const customerInvitationsRef: CustomerInvitationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerInvitations(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerInvitationsData, undefined>;

interface CustomerInvitationsRef {
  ...
  (dc: DataConnect): QueryRef<CustomerInvitationsData, undefined>;
}
export const customerInvitationsRef: CustomerInvitationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerInvitationsRef:
```typescript
const name = customerInvitationsRef.operationName;
console.log(name);
```

### Variables
The `CustomerInvitations` query has no variables.
### Return Type
Recall that executing the `CustomerInvitations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerInvitationsData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerInvitations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerInvitations } from '@basis/dataconnect-customer';


// Call the `customerInvitations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerInvitations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerInvitations(dataConnect);

console.log(data.customerInvitations);

// Or, you can use the `Promise` API.
customerInvitations().then((response) => {
  const data = response.data;
  console.log(data.customerInvitations);
});
```

### Using `CustomerInvitations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerInvitationsRef } from '@basis/dataconnect-customer';


// Call the `customerInvitationsRef()` function to get a reference to the query.
const ref = customerInvitationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerInvitationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.customerInvitations);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.customerInvitations);
});
```

## CustomerAddresses
You can execute the `CustomerAddresses` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerAddresses(options?: ExecuteQueryOptions): QueryPromise<CustomerAddressesData, undefined>;

interface CustomerAddressesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerAddressesData, undefined>;
}
export const customerAddressesRef: CustomerAddressesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerAddresses(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerAddressesData, undefined>;

interface CustomerAddressesRef {
  ...
  (dc: DataConnect): QueryRef<CustomerAddressesData, undefined>;
}
export const customerAddressesRef: CustomerAddressesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerAddressesRef:
```typescript
const name = customerAddressesRef.operationName;
console.log(name);
```

### Variables
The `CustomerAddresses` query has no variables.
### Return Type
Recall that executing the `CustomerAddresses` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerAddressesData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `CustomerAddresses`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerAddresses } from '@basis/dataconnect-customer';


// Call the `customerAddresses()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerAddresses();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerAddresses(dataConnect);

console.log(data.customerAddresses);

// Or, you can use the `Promise` API.
customerAddresses().then((response) => {
  const data = response.data;
  console.log(data.customerAddresses);
});
```

### Using `CustomerAddresses`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerAddressesRef } from '@basis/dataconnect-customer';


// Call the `customerAddressesRef()` function to get a reference to the query.
const ref = customerAddressesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerAddressesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.customerAddresses);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.customerAddresses);
});
```

## CustomerCountries
You can execute the `CustomerCountries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [customer/index.d.ts](./index.d.ts):
```typescript
customerCountries(options?: ExecuteQueryOptions): QueryPromise<CustomerCountriesData, undefined>;

interface CustomerCountriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<CustomerCountriesData, undefined>;
}
export const customerCountriesRef: CustomerCountriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
customerCountries(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<CustomerCountriesData, undefined>;

interface CustomerCountriesRef {
  ...
  (dc: DataConnect): QueryRef<CustomerCountriesData, undefined>;
}
export const customerCountriesRef: CustomerCountriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the customerCountriesRef:
```typescript
const name = customerCountriesRef.operationName;
console.log(name);
```

### Variables
The `CustomerCountries` query has no variables.
### Return Type
Recall that executing the `CustomerCountries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CustomerCountriesData`, which is defined in [customer/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CustomerCountriesData {
  countries: ({
    code: string;
    name: string;
  } & Country_Key)[];
}
```
### Using `CustomerCountries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, customerCountries } from '@basis/dataconnect-customer';


// Call the `customerCountries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await customerCountries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await customerCountries(dataConnect);

console.log(data.countries);

// Or, you can use the `Promise` API.
customerCountries().then((response) => {
  const data = response.data;
  console.log(data.countries);
});
```

### Using `CustomerCountries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, customerCountriesRef } from '@basis/dataconnect-customer';


// Call the `customerCountriesRef()` function to get a reference to the query.
const ref = customerCountriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = customerCountriesRef(dataConnect);

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

# Mutations

No mutations were generated for the `customer` connector.

If you want to learn more about how to use mutations in Data Connect, you can follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

