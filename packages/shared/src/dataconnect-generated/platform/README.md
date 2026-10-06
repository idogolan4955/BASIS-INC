# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `platform`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListFamilies*](#listfamilies)
  - [*ListProducts*](#listproducts)
  - [*GetProduct*](#getproduct)
  - [*ListSkus*](#listskus)
  - [*GetSku*](#getsku)
  - [*GetSkuSourcing*](#getskusourcing)
  - [*ListShades*](#listshades)
  - [*ListPutUps*](#listputups)
  - [*ListShadeStandards*](#listshadestandards)
  - [*ListPurchaseOrders*](#listpurchaseorders)
  - [*GetPurchaseOrder*](#getpurchaseorder)
  - [*GetPurchaseOrderCosts*](#getpurchaseordercosts)
  - [*ListProductionRuns*](#listproductionruns)
  - [*GetProductionRun*](#getproductionrun)
  - [*GetLot*](#getlot)
  - [*ListProcessTemplates*](#listprocesstemplates)
  - [*ListCompanies*](#listcompanies)
  - [*GetCompany*](#getcompany)
  - [*ListFactories*](#listfactories)
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
  - [*ListStaff*](#liststaff)
  - [*ListOpenTasks*](#listopentasks)
- [**Mutations**](#mutations)
  - [*UpsertFamily*](#upsertfamily)
  - [*UpsertProduct*](#upsertproduct)
  - [*InsertVariant*](#insertvariant)
  - [*UpdateVariant*](#updatevariant)
  - [*UpsertShade*](#upsertshade)
  - [*UpsertPutUp*](#upsertputup)
  - [*UpsertSku*](#upsertsku)
  - [*SetSkuStatus*](#setskustatus)
  - [*UpdateProductDetails*](#updateproductdetails)
  - [*SetSkuPublic*](#setskupublic)
  - [*InsertSupplierItem*](#insertsupplieritem)
  - [*InsertSupplierPrice*](#insertsupplierprice)
  - [*InsertShadeStandard*](#insertshadestandard)
  - [*AcknowledgeAlert*](#acknowledgealert)
  - [*CreateTask*](#createtask)
  - [*CompleteTask*](#completetask)
  - [*AddNote*](#addnote)
  - [*UpdateMyPreferences*](#updatemypreferences)
  - [*RecordEvent*](#recordevent)
  - [*ResolveAlert*](#resolvealert)
  - [*ReopenTask*](#reopentask)
  - [*InsertCompany*](#insertcompany)
  - [*UpdateCompany*](#updatecompany)
  - [*ArchiveCompany*](#archivecompany)
  - [*AddCompanyRole*](#addcompanyrole)
  - [*RemoveCompanyRole*](#removecompanyrole)
  - [*InsertContact*](#insertcontact)
  - [*UpdateContact*](#updatecontact)
  - [*InsertLocation*](#insertlocation)
  - [*InsertFactory*](#insertfactory)
  - [*UpsertSupplierProfile*](#upsertsupplierprofile)

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

## ListFamilies
You can execute the `ListFamilies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listFamilies(options?: ExecuteQueryOptions): QueryPromise<ListFamiliesData, undefined>;

interface ListFamiliesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFamiliesData, undefined>;
}
export const listFamiliesRef: ListFamiliesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listFamilies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFamiliesData, undefined>;

interface ListFamiliesRef {
  ...
  (dc: DataConnect): QueryRef<ListFamiliesData, undefined>;
}
export const listFamiliesRef: ListFamiliesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listFamiliesRef:
```typescript
const name = listFamiliesRef.operationName;
console.log(name);
```

### Variables
The `ListFamilies` query has no variables.
### Return Type
Recall that executing the `ListFamilies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListFamiliesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListFamilies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listFamilies } from '@basis/dataconnect-platform';


// Call the `listFamilies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listFamilies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listFamilies(dataConnect);

console.log(data.fabricFamilies);

// Or, you can use the `Promise` API.
listFamilies().then((response) => {
  const data = response.data;
  console.log(data.fabricFamilies);
});
```

### Using `ListFamilies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listFamiliesRef } from '@basis/dataconnect-platform';


// Call the `listFamiliesRef()` function to get a reference to the query.
const ref = listFamiliesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listFamiliesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.fabricFamilies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.fabricFamilies);
});
```

## ListProducts
You can execute the `ListProducts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listProducts(options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface ListProductsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductsData, undefined>;
}
export const listProductsRef: ListProductsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProducts(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductsData, undefined>;

interface ListProductsRef {
  ...
  (dc: DataConnect): QueryRef<ListProductsData, undefined>;
}
export const listProductsRef: ListProductsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductsRef:
```typescript
const name = listProductsRef.operationName;
console.log(name);
```

### Variables
The `ListProducts` query has no variables.
### Return Type
Recall that executing the `ListProducts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListProducts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProducts } from '@basis/dataconnect-platform';


// Call the `listProducts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProducts();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProducts(dataConnect);

console.log(data.products);

// Or, you can use the `Promise` API.
listProducts().then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

### Using `ListProducts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductsRef } from '@basis/dataconnect-platform';


// Call the `listProductsRef()` function to get a reference to the query.
const ref = listProductsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.products);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.products);
});
```

## GetProduct
You can execute the `GetProduct` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getProduct(vars: GetProductVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductData, GetProductVariables>;

interface GetProductRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductVariables): QueryRef<GetProductData, GetProductVariables>;
}
export const getProductRef: GetProductRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProduct(dc: DataConnect, vars: GetProductVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductData, GetProductVariables>;

interface GetProductRef {
  ...
  (dc: DataConnect, vars: GetProductVariables): QueryRef<GetProductData, GetProductVariables>;
}
export const getProductRef: GetProductRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProductRef:
```typescript
const name = getProductRef.operationName;
console.log(name);
```

### Variables
The `GetProduct` query requires an argument of type `GetProductVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProductVariables {
  code: string;
}
```
### Return Type
Recall that executing the `GetProduct` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProductData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetProduct`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProduct, GetProductVariables } from '@basis/dataconnect-platform';

// The `GetProduct` query requires an argument of type `GetProductVariables`:
const getProductVars: GetProductVariables = {
  code: ..., 
};

// Call the `getProduct()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProduct(getProductVars);
// Variables can be defined inline as well.
const { data } = await getProduct({ code: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProduct(dataConnect, getProductVars);

console.log(data.product);

// Or, you can use the `Promise` API.
getProduct(getProductVars).then((response) => {
  const data = response.data;
  console.log(data.product);
});
```

### Using `GetProduct`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProductRef, GetProductVariables } from '@basis/dataconnect-platform';

// The `GetProduct` query requires an argument of type `GetProductVariables`:
const getProductVars: GetProductVariables = {
  code: ..., 
};

// Call the `getProductRef()` function to get a reference to the query.
const ref = getProductRef(getProductVars);
// Variables can be defined inline as well.
const ref = getProductRef({ code: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProductRef(dataConnect, getProductVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.product);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.product);
});
```

## ListSkus
You can execute the `ListSkus` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listSkus(options?: ExecuteQueryOptions): QueryPromise<ListSkusData, undefined>;

interface ListSkusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListSkusData, undefined>;
}
export const listSkusRef: ListSkusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listSkus(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListSkusData, undefined>;

interface ListSkusRef {
  ...
  (dc: DataConnect): QueryRef<ListSkusData, undefined>;
}
export const listSkusRef: ListSkusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listSkusRef:
```typescript
const name = listSkusRef.operationName;
console.log(name);
```

### Variables
The `ListSkus` query has no variables.
### Return Type
Recall that executing the `ListSkus` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListSkusData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListSkus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listSkus } from '@basis/dataconnect-platform';


// Call the `listSkus()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listSkus();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listSkus(dataConnect);

console.log(data.skus);

// Or, you can use the `Promise` API.
listSkus().then((response) => {
  const data = response.data;
  console.log(data.skus);
});
```

### Using `ListSkus`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listSkusRef } from '@basis/dataconnect-platform';


// Call the `listSkusRef()` function to get a reference to the query.
const ref = listSkusRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listSkusRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.skus);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.skus);
});
```

## GetSku
You can execute the `GetSku` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getSku(vars: GetSkuVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuData, GetSkuVariables>;

interface GetSkuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetSkuVariables): QueryRef<GetSkuData, GetSkuVariables>;
}
export const getSkuRef: GetSkuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getSku(dc: DataConnect, vars: GetSkuVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuData, GetSkuVariables>;

interface GetSkuRef {
  ...
  (dc: DataConnect, vars: GetSkuVariables): QueryRef<GetSkuData, GetSkuVariables>;
}
export const getSkuRef: GetSkuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getSkuRef:
```typescript
const name = getSkuRef.operationName;
console.log(name);
```

### Variables
The `GetSku` query requires an argument of type `GetSkuVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetSkuVariables {
  code: string;
}
```
### Return Type
Recall that executing the `GetSku` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetSkuData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetSku`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getSku, GetSkuVariables } from '@basis/dataconnect-platform';

// The `GetSku` query requires an argument of type `GetSkuVariables`:
const getSkuVars: GetSkuVariables = {
  code: ..., 
};

// Call the `getSku()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getSku(getSkuVars);
// Variables can be defined inline as well.
const { data } = await getSku({ code: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getSku(dataConnect, getSkuVars);

console.log(data.sku);

// Or, you can use the `Promise` API.
getSku(getSkuVars).then((response) => {
  const data = response.data;
  console.log(data.sku);
});
```

### Using `GetSku`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getSkuRef, GetSkuVariables } from '@basis/dataconnect-platform';

// The `GetSku` query requires an argument of type `GetSkuVariables`:
const getSkuVars: GetSkuVariables = {
  code: ..., 
};

// Call the `getSkuRef()` function to get a reference to the query.
const ref = getSkuRef(getSkuVars);
// Variables can be defined inline as well.
const ref = getSkuRef({ code: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getSkuRef(dataConnect, getSkuVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.sku);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.sku);
});
```

## GetSkuSourcing
You can execute the `GetSkuSourcing` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getSkuSourcing(vars: GetSkuSourcingVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuSourcingData, GetSkuSourcingVariables>;

interface GetSkuSourcingRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetSkuSourcingVariables): QueryRef<GetSkuSourcingData, GetSkuSourcingVariables>;
}
export const getSkuSourcingRef: GetSkuSourcingRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getSkuSourcing(dc: DataConnect, vars: GetSkuSourcingVariables, options?: ExecuteQueryOptions): QueryPromise<GetSkuSourcingData, GetSkuSourcingVariables>;

interface GetSkuSourcingRef {
  ...
  (dc: DataConnect, vars: GetSkuSourcingVariables): QueryRef<GetSkuSourcingData, GetSkuSourcingVariables>;
}
export const getSkuSourcingRef: GetSkuSourcingRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getSkuSourcingRef:
```typescript
const name = getSkuSourcingRef.operationName;
console.log(name);
```

### Variables
The `GetSkuSourcing` query requires an argument of type `GetSkuSourcingVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetSkuSourcingVariables {
  code: string;
}
```
### Return Type
Recall that executing the `GetSkuSourcing` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetSkuSourcingData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetSkuSourcing`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getSkuSourcing, GetSkuSourcingVariables } from '@basis/dataconnect-platform';

// The `GetSkuSourcing` query requires an argument of type `GetSkuSourcingVariables`:
const getSkuSourcingVars: GetSkuSourcingVariables = {
  code: ..., 
};

// Call the `getSkuSourcing()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getSkuSourcing(getSkuSourcingVars);
// Variables can be defined inline as well.
const { data } = await getSkuSourcing({ code: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getSkuSourcing(dataConnect, getSkuSourcingVars);

console.log(data.supplierItems);

// Or, you can use the `Promise` API.
getSkuSourcing(getSkuSourcingVars).then((response) => {
  const data = response.data;
  console.log(data.supplierItems);
});
```

### Using `GetSkuSourcing`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getSkuSourcingRef, GetSkuSourcingVariables } from '@basis/dataconnect-platform';

// The `GetSkuSourcing` query requires an argument of type `GetSkuSourcingVariables`:
const getSkuSourcingVars: GetSkuSourcingVariables = {
  code: ..., 
};

// Call the `getSkuSourcingRef()` function to get a reference to the query.
const ref = getSkuSourcingRef(getSkuSourcingVars);
// Variables can be defined inline as well.
const ref = getSkuSourcingRef({ code: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getSkuSourcingRef(dataConnect, getSkuSourcingVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.supplierItems);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.supplierItems);
});
```

## ListShades
You can execute the `ListShades` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listShades(options?: ExecuteQueryOptions): QueryPromise<ListShadesData, undefined>;

interface ListShadesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListShadesData, undefined>;
}
export const listShadesRef: ListShadesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listShades(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListShadesData, undefined>;

interface ListShadesRef {
  ...
  (dc: DataConnect): QueryRef<ListShadesData, undefined>;
}
export const listShadesRef: ListShadesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listShadesRef:
```typescript
const name = listShadesRef.operationName;
console.log(name);
```

### Variables
The `ListShades` query has no variables.
### Return Type
Recall that executing the `ListShades` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListShadesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListShades`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listShades } from '@basis/dataconnect-platform';


// Call the `listShades()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listShades();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listShades(dataConnect);

console.log(data.shades);

// Or, you can use the `Promise` API.
listShades().then((response) => {
  const data = response.data;
  console.log(data.shades);
});
```

### Using `ListShades`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listShadesRef } from '@basis/dataconnect-platform';


// Call the `listShadesRef()` function to get a reference to the query.
const ref = listShadesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listShadesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shades);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shades);
});
```

## ListPutUps
You can execute the `ListPutUps` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listPutUps(options?: ExecuteQueryOptions): QueryPromise<ListPutUpsData, undefined>;

interface ListPutUpsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPutUpsData, undefined>;
}
export const listPutUpsRef: ListPutUpsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPutUps(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPutUpsData, undefined>;

interface ListPutUpsRef {
  ...
  (dc: DataConnect): QueryRef<ListPutUpsData, undefined>;
}
export const listPutUpsRef: ListPutUpsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPutUpsRef:
```typescript
const name = listPutUpsRef.operationName;
console.log(name);
```

### Variables
The `ListPutUps` query has no variables.
### Return Type
Recall that executing the `ListPutUps` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPutUpsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListPutUps`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPutUps } from '@basis/dataconnect-platform';


// Call the `listPutUps()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPutUps();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPutUps(dataConnect);

console.log(data.putUps);

// Or, you can use the `Promise` API.
listPutUps().then((response) => {
  const data = response.data;
  console.log(data.putUps);
});
```

### Using `ListPutUps`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPutUpsRef } from '@basis/dataconnect-platform';


// Call the `listPutUpsRef()` function to get a reference to the query.
const ref = listPutUpsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPutUpsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.putUps);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.putUps);
});
```

## ListShadeStandards
You can execute the `ListShadeStandards` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listShadeStandards(vars: ListShadeStandardsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShadeStandardsData, ListShadeStandardsVariables>;

interface ListShadeStandardsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListShadeStandardsVariables): QueryRef<ListShadeStandardsData, ListShadeStandardsVariables>;
}
export const listShadeStandardsRef: ListShadeStandardsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listShadeStandards(dc: DataConnect, vars: ListShadeStandardsVariables, options?: ExecuteQueryOptions): QueryPromise<ListShadeStandardsData, ListShadeStandardsVariables>;

interface ListShadeStandardsRef {
  ...
  (dc: DataConnect, vars: ListShadeStandardsVariables): QueryRef<ListShadeStandardsData, ListShadeStandardsVariables>;
}
export const listShadeStandardsRef: ListShadeStandardsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listShadeStandardsRef:
```typescript
const name = listShadeStandardsRef.operationName;
console.log(name);
```

### Variables
The `ListShadeStandards` query requires an argument of type `ListShadeStandardsVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListShadeStandardsVariables {
  productCode: string;
}
```
### Return Type
Recall that executing the `ListShadeStandards` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListShadeStandardsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListShadeStandards`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listShadeStandards, ListShadeStandardsVariables } from '@basis/dataconnect-platform';

// The `ListShadeStandards` query requires an argument of type `ListShadeStandardsVariables`:
const listShadeStandardsVars: ListShadeStandardsVariables = {
  productCode: ..., 
};

// Call the `listShadeStandards()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listShadeStandards(listShadeStandardsVars);
// Variables can be defined inline as well.
const { data } = await listShadeStandards({ productCode: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listShadeStandards(dataConnect, listShadeStandardsVars);

console.log(data.shadeStandards);

// Or, you can use the `Promise` API.
listShadeStandards(listShadeStandardsVars).then((response) => {
  const data = response.data;
  console.log(data.shadeStandards);
});
```

### Using `ListShadeStandards`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listShadeStandardsRef, ListShadeStandardsVariables } from '@basis/dataconnect-platform';

// The `ListShadeStandards` query requires an argument of type `ListShadeStandardsVariables`:
const listShadeStandardsVars: ListShadeStandardsVariables = {
  productCode: ..., 
};

// Call the `listShadeStandardsRef()` function to get a reference to the query.
const ref = listShadeStandardsRef(listShadeStandardsVars);
// Variables can be defined inline as well.
const ref = listShadeStandardsRef({ productCode: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listShadeStandardsRef(dataConnect, listShadeStandardsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.shadeStandards);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.shadeStandards);
});
```

## ListPurchaseOrders
You can execute the `ListPurchaseOrders` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listPurchaseOrders(options?: ExecuteQueryOptions): QueryPromise<ListPurchaseOrdersData, undefined>;

interface ListPurchaseOrdersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPurchaseOrdersData, undefined>;
}
export const listPurchaseOrdersRef: ListPurchaseOrdersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPurchaseOrders(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListPurchaseOrdersData, undefined>;

interface ListPurchaseOrdersRef {
  ...
  (dc: DataConnect): QueryRef<ListPurchaseOrdersData, undefined>;
}
export const listPurchaseOrdersRef: ListPurchaseOrdersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPurchaseOrdersRef:
```typescript
const name = listPurchaseOrdersRef.operationName;
console.log(name);
```

### Variables
The `ListPurchaseOrders` query has no variables.
### Return Type
Recall that executing the `ListPurchaseOrders` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPurchaseOrdersData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPurchaseOrdersData {
  purchaseOrders: ({
    id: UUIDString;
    number: string;
    state: PurchaseOrderState;
    currency: string;
    issuedOn?: DateString | null;
    confirmedOn?: DateString | null;
    requestedExFactory?: DateString | null;
    createdAt: TimestampString;
    supplier: {
      id: UUIDString;
      legalName: string;
      tradingName?: string | null;
    } & Company_Key;
    factory?: {
      id: UUIDString;
      location: {
        name: string;
      };
    } & Factory_Key;
    purchaseOrderLines_on_purchaseOrder: ({
      quantity: Int64String;
      uom: string;
      sku: {
        code: string;
        product: {
          name: string;
        };
      } & Sku_Key;
    })[];
    productionRuns_on_purchaseOrder: ({
      number: string;
      state: RunState;
      health: Health;
    })[];
  } & PurchaseOrder_Key)[];
}
```
### Using `ListPurchaseOrders`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPurchaseOrders } from '@basis/dataconnect-platform';


// Call the `listPurchaseOrders()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPurchaseOrders();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPurchaseOrders(dataConnect);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
listPurchaseOrders().then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

### Using `ListPurchaseOrders`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPurchaseOrdersRef } from '@basis/dataconnect-platform';


// Call the `listPurchaseOrdersRef()` function to get a reference to the query.
const ref = listPurchaseOrdersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPurchaseOrdersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

## GetPurchaseOrder
You can execute the `GetPurchaseOrder` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getPurchaseOrder(vars: GetPurchaseOrderVariables, options?: ExecuteQueryOptions): QueryPromise<GetPurchaseOrderData, GetPurchaseOrderVariables>;

interface GetPurchaseOrderRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPurchaseOrderVariables): QueryRef<GetPurchaseOrderData, GetPurchaseOrderVariables>;
}
export const getPurchaseOrderRef: GetPurchaseOrderRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPurchaseOrder(dc: DataConnect, vars: GetPurchaseOrderVariables, options?: ExecuteQueryOptions): QueryPromise<GetPurchaseOrderData, GetPurchaseOrderVariables>;

interface GetPurchaseOrderRef {
  ...
  (dc: DataConnect, vars: GetPurchaseOrderVariables): QueryRef<GetPurchaseOrderData, GetPurchaseOrderVariables>;
}
export const getPurchaseOrderRef: GetPurchaseOrderRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPurchaseOrderRef:
```typescript
const name = getPurchaseOrderRef.operationName;
console.log(name);
```

### Variables
The `GetPurchaseOrder` query requires an argument of type `GetPurchaseOrderVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPurchaseOrderVariables {
  number: string;
}
```
### Return Type
Recall that executing the `GetPurchaseOrder` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPurchaseOrderData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPurchaseOrderData {
  purchaseOrders: ({
    id: UUIDString;
    number: string;
    state: PurchaseOrderState;
    currency: string;
    namedPlace?: string | null;
    paymentTerms?: string | null;
    issuedOn?: DateString | null;
    confirmedOn?: DateString | null;
    requestedExFactory?: DateString | null;
    notes?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    version: number;
    legalEntity?: {
      id: UUIDString;
      name: string;
    } & LegalEntity_Key;
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
    incoterm?: {
      code: string;
    } & Incoterm_Key;
    purchaseOrderLines_on_purchaseOrder: ({
      id: UUIDString;
      lineNo: number;
      quantity: Int64String;
      uom: string;
      overTolerancePercent?: number | null;
      underTolerancePercent?: number | null;
      requestedExFactory?: DateString | null;
      sku: {
        code: string;
        product: {
          code: string;
          name: string;
        } & Product_Key;
        shade: {
          code: string;
          name: string;
          hex?: string | null;
        } & Shade_Key;
        variant: {
          name: string;
        };
      } & Sku_Key;
    } & PurchaseOrderLine_Key)[];
    productionRuns_on_purchaseOrder: ({
      id: UUIDString;
      number: string;
      state: RunState;
      health: Health;
      plannedStart: DateString;
      plannedEnd: DateString;
      forecastEnd?: DateString | null;
      actualEnd?: DateString | null;
    } & ProductionRun_Key)[];
  } & PurchaseOrder_Key)[];
}
```
### Using `GetPurchaseOrder`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPurchaseOrder, GetPurchaseOrderVariables } from '@basis/dataconnect-platform';

// The `GetPurchaseOrder` query requires an argument of type `GetPurchaseOrderVariables`:
const getPurchaseOrderVars: GetPurchaseOrderVariables = {
  number: ..., 
};

// Call the `getPurchaseOrder()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPurchaseOrder(getPurchaseOrderVars);
// Variables can be defined inline as well.
const { data } = await getPurchaseOrder({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPurchaseOrder(dataConnect, getPurchaseOrderVars);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
getPurchaseOrder(getPurchaseOrderVars).then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

### Using `GetPurchaseOrder`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPurchaseOrderRef, GetPurchaseOrderVariables } from '@basis/dataconnect-platform';

// The `GetPurchaseOrder` query requires an argument of type `GetPurchaseOrderVariables`:
const getPurchaseOrderVars: GetPurchaseOrderVariables = {
  number: ..., 
};

// Call the `getPurchaseOrderRef()` function to get a reference to the query.
const ref = getPurchaseOrderRef(getPurchaseOrderVars);
// Variables can be defined inline as well.
const ref = getPurchaseOrderRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPurchaseOrderRef(dataConnect, getPurchaseOrderVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

## GetPurchaseOrderCosts
You can execute the `GetPurchaseOrderCosts` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getPurchaseOrderCosts(vars: GetPurchaseOrderCostsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPurchaseOrderCostsData, GetPurchaseOrderCostsVariables>;

interface GetPurchaseOrderCostsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPurchaseOrderCostsVariables): QueryRef<GetPurchaseOrderCostsData, GetPurchaseOrderCostsVariables>;
}
export const getPurchaseOrderCostsRef: GetPurchaseOrderCostsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPurchaseOrderCosts(dc: DataConnect, vars: GetPurchaseOrderCostsVariables, options?: ExecuteQueryOptions): QueryPromise<GetPurchaseOrderCostsData, GetPurchaseOrderCostsVariables>;

interface GetPurchaseOrderCostsRef {
  ...
  (dc: DataConnect, vars: GetPurchaseOrderCostsVariables): QueryRef<GetPurchaseOrderCostsData, GetPurchaseOrderCostsVariables>;
}
export const getPurchaseOrderCostsRef: GetPurchaseOrderCostsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPurchaseOrderCostsRef:
```typescript
const name = getPurchaseOrderCostsRef.operationName;
console.log(name);
```

### Variables
The `GetPurchaseOrderCosts` query requires an argument of type `GetPurchaseOrderCostsVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPurchaseOrderCostsVariables {
  number: string;
}
```
### Return Type
Recall that executing the `GetPurchaseOrderCosts` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPurchaseOrderCostsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPurchaseOrderCostsData {
  purchaseOrders: ({
    id: UUIDString;
    currency: string;
    fxRateToBase?: string | null;
    purchaseOrderLines_on_purchaseOrder: ({
      id: UUIDString;
      lineNo: number;
      quantity: Int64String;
      unitPrice: Int64String;
    } & PurchaseOrderLine_Key)[];
    paymentMilestones_on_purchaseOrder: ({
      id: UUIDString;
      label: string;
      percent?: number | null;
      amount?: Int64String | null;
      trigger: string;
      dueOn?: DateString | null;
      paidOn?: DateString | null;
      paidAmount?: Int64String | null;
      reference?: string | null;
    } & PaymentMilestone_Key)[];
  } & PurchaseOrder_Key)[];
}
```
### Using `GetPurchaseOrderCosts`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPurchaseOrderCosts, GetPurchaseOrderCostsVariables } from '@basis/dataconnect-platform';

// The `GetPurchaseOrderCosts` query requires an argument of type `GetPurchaseOrderCostsVariables`:
const getPurchaseOrderCostsVars: GetPurchaseOrderCostsVariables = {
  number: ..., 
};

// Call the `getPurchaseOrderCosts()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPurchaseOrderCosts(getPurchaseOrderCostsVars);
// Variables can be defined inline as well.
const { data } = await getPurchaseOrderCosts({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPurchaseOrderCosts(dataConnect, getPurchaseOrderCostsVars);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
getPurchaseOrderCosts(getPurchaseOrderCostsVars).then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

### Using `GetPurchaseOrderCosts`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPurchaseOrderCostsRef, GetPurchaseOrderCostsVariables } from '@basis/dataconnect-platform';

// The `GetPurchaseOrderCosts` query requires an argument of type `GetPurchaseOrderCostsVariables`:
const getPurchaseOrderCostsVars: GetPurchaseOrderCostsVariables = {
  number: ..., 
};

// Call the `getPurchaseOrderCostsRef()` function to get a reference to the query.
const ref = getPurchaseOrderCostsRef(getPurchaseOrderCostsVars);
// Variables can be defined inline as well.
const ref = getPurchaseOrderCostsRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPurchaseOrderCostsRef(dataConnect, getPurchaseOrderCostsVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.purchaseOrders);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.purchaseOrders);
});
```

## ListProductionRuns
You can execute the `ListProductionRuns` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listProductionRuns(options?: ExecuteQueryOptions): QueryPromise<ListProductionRunsData, undefined>;

interface ListProductionRunsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProductionRunsData, undefined>;
}
export const listProductionRunsRef: ListProductionRunsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProductionRuns(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProductionRunsData, undefined>;

interface ListProductionRunsRef {
  ...
  (dc: DataConnect): QueryRef<ListProductionRunsData, undefined>;
}
export const listProductionRunsRef: ListProductionRunsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProductionRunsRef:
```typescript
const name = listProductionRunsRef.operationName;
console.log(name);
```

### Variables
The `ListProductionRuns` query has no variables.
### Return Type
Recall that executing the `ListProductionRuns` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProductionRunsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProductionRunsData {
  productionRuns: ({
    id: UUIDString;
    number: string;
    state: RunState;
    health: Health;
    plannedStart: DateString;
    plannedEnd: DateString;
    forecastEnd?: DateString | null;
    actualEnd?: DateString | null;
    templateName?: string | null;
    purchaseOrder: {
      number: string;
      supplier: {
        tradingName?: string | null;
        legalName: string;
      };
    };
    factory?: {
      location: {
        name: string;
      };
    };
    productionRunLines_on_run: ({
      plannedQuantity: Int64String;
      producedQuantity: Int64String;
      purchaseOrderLine: {
        uom: string;
        sku: {
          code: string;
          product: {
            name: string;
          };
          shade: {
            name: string;
          };
        } & Sku_Key;
      };
    })[];
    productionMilestones_on_run: ({
      id: UUIDString;
      key: string;
      name: string;
      category: string;
      sequence: number;
      gate: MilestoneGate;
      plannedStart: DateString;
      plannedEnd: DateString;
      forecastEnd?: DateString | null;
      actualStart?: DateString | null;
      actualEnd?: DateString | null;
      state: MilestoneState;
      delayReason?: string | null;
    } & ProductionMilestone_Key)[];
  } & ProductionRun_Key)[];
}
```
### Using `ListProductionRuns`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProductionRuns } from '@basis/dataconnect-platform';


// Call the `listProductionRuns()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProductionRuns();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProductionRuns(dataConnect);

console.log(data.productionRuns);

// Or, you can use the `Promise` API.
listProductionRuns().then((response) => {
  const data = response.data;
  console.log(data.productionRuns);
});
```

### Using `ListProductionRuns`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProductionRunsRef } from '@basis/dataconnect-platform';


// Call the `listProductionRunsRef()` function to get a reference to the query.
const ref = listProductionRunsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProductionRunsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.productionRuns);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.productionRuns);
});
```

## GetProductionRun
You can execute the `GetProductionRun` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getProductionRun(vars: GetProductionRunVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductionRunData, GetProductionRunVariables>;

interface GetProductionRunRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProductionRunVariables): QueryRef<GetProductionRunData, GetProductionRunVariables>;
}
export const getProductionRunRef: GetProductionRunRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProductionRun(dc: DataConnect, vars: GetProductionRunVariables, options?: ExecuteQueryOptions): QueryPromise<GetProductionRunData, GetProductionRunVariables>;

interface GetProductionRunRef {
  ...
  (dc: DataConnect, vars: GetProductionRunVariables): QueryRef<GetProductionRunData, GetProductionRunVariables>;
}
export const getProductionRunRef: GetProductionRunRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProductionRunRef:
```typescript
const name = getProductionRunRef.operationName;
console.log(name);
```

### Variables
The `GetProductionRun` query requires an argument of type `GetProductionRunVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProductionRunVariables {
  number: string;
}
```
### Return Type
Recall that executing the `GetProductionRun` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProductionRunData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetProductionRunData {
  productionRuns: ({
    id: UUIDString;
    number: string;
    state: RunState;
    health: Health;
    plannedStart: DateString;
    plannedEnd: DateString;
    forecastEnd?: DateString | null;
    actualEnd?: DateString | null;
    templateName?: string | null;
    notes?: string | null;
    createdAt: TimestampString;
    purchaseOrder: {
      id: UUIDString;
      number: string;
      state: PurchaseOrderState;
      supplier: {
        id: UUIDString;
        tradingName?: string | null;
        legalName: string;
      } & Company_Key;
    } & PurchaseOrder_Key;
    factory?: {
      id: UUIDString;
      location: {
        name: string;
        city?: string | null;
      };
    } & Factory_Key;
    productionRunLines_on_run: ({
      id: UUIDString;
      plannedQuantity: Int64String;
      producedQuantity: Int64String;
      purchaseOrderLine: {
        id: UUIDString;
        lineNo: number;
        uom: string;
        sku: {
          code: string;
          rollTracking: boolean;
          product: {
            name: string;
          };
          shade: {
            code: string;
            name: string;
            hex?: string | null;
          } & Shade_Key;
          variant: {
            name: string;
          };
          putUp: {
            rollLengthM: number;
            rollsPerCarton?: number | null;
            cartonLengthCm?: number | null;
            cartonWidthCm?: number | null;
            cartonHeightCm?: number | null;
          };
        } & Sku_Key;
      } & PurchaseOrderLine_Key;
    } & ProductionRunLine_Key)[];
    productionMilestones_on_run: ({
      id: UUIDString;
      key: string;
      name: string;
      category: string;
      sequence: number;
      dependsOnKey?: string | null;
      gate: MilestoneGate;
      plannedStart: DateString;
      plannedEnd: DateString;
      forecastEnd?: DateString | null;
      actualStart?: DateString | null;
      actualEnd?: DateString | null;
      state: MilestoneState;
      delayReason?: string | null;
      note?: string | null;
    } & ProductionMilestone_Key)[];
    lots_on_run: ({
      id: UUIDString;
      number: string;
      millLotRef?: string | null;
      producedQuantity: Int64String;
      producedOn?: DateString | null;
      qualityState: LotQualityState;
      createdAt: TimestampString;
      sku: {
        code: string;
        rollTracking: boolean;
        product: {
          name: string;
        };
        variant: {
          name: string;
        };
        shade: {
          code: string;
          name: string;
          hex?: string | null;
        } & Shade_Key;
        putUp: {
          rollLengthM: number;
          rollsPerCarton?: number | null;
          cartonLengthCm?: number | null;
          cartonWidthCm?: number | null;
          cartonHeightCm?: number | null;
        };
      } & Sku_Key;
      rolls_on_lot: ({
        id: UUIDString;
        number: string;
        rollNo: number;
        measuredLength: Int64String;
        usableWidthCm?: number | null;
        weightG?: number | null;
        grade?: string | null;
        defectPoints?: number | null;
        handlingUnitContents_on_roll: ({
          handlingUnit: {
            number: string;
          };
        })[];
      } & Roll_Key)[];
      handlingUnitContents_on_lot: ({
        quantity?: Int64String | null;
        handlingUnit: {
          number: string;
        };
      })[];
    } & Lot_Key)[];
    handlingUnits_on_run: ({
      id: UUIDString;
      number: string;
      kind: HandlingUnitKind;
      marks?: string | null;
      lengthCm?: number | null;
      widthCm?: number | null;
      heightCm?: number | null;
      grossWeightG?: number | null;
      netWeightG?: number | null;
      packedOn?: DateString | null;
      parent?: {
        number: string;
      };
      handlingUnitContents_on_handlingUnit: ({
        quantity?: Int64String | null;
        roll?: {
          number: string;
          measuredLength: Int64String;
          lot: {
            number: string;
            sku: {
              code: string;
            } & Sku_Key;
          };
        };
        lot?: {
          number: string;
          sku: {
            code: string;
          } & Sku_Key;
        };
      })[];
    } & HandlingUnit_Key)[];
  } & ProductionRun_Key)[];
}
```
### Using `GetProductionRun`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProductionRun, GetProductionRunVariables } from '@basis/dataconnect-platform';

// The `GetProductionRun` query requires an argument of type `GetProductionRunVariables`:
const getProductionRunVars: GetProductionRunVariables = {
  number: ..., 
};

// Call the `getProductionRun()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProductionRun(getProductionRunVars);
// Variables can be defined inline as well.
const { data } = await getProductionRun({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProductionRun(dataConnect, getProductionRunVars);

console.log(data.productionRuns);

// Or, you can use the `Promise` API.
getProductionRun(getProductionRunVars).then((response) => {
  const data = response.data;
  console.log(data.productionRuns);
});
```

### Using `GetProductionRun`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProductionRunRef, GetProductionRunVariables } from '@basis/dataconnect-platform';

// The `GetProductionRun` query requires an argument of type `GetProductionRunVariables`:
const getProductionRunVars: GetProductionRunVariables = {
  number: ..., 
};

// Call the `getProductionRunRef()` function to get a reference to the query.
const ref = getProductionRunRef(getProductionRunVars);
// Variables can be defined inline as well.
const ref = getProductionRunRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProductionRunRef(dataConnect, getProductionRunVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.productionRuns);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.productionRuns);
});
```

## GetLot
You can execute the `GetLot` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getLot(vars: GetLotVariables, options?: ExecuteQueryOptions): QueryPromise<GetLotData, GetLotVariables>;

interface GetLotRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLotVariables): QueryRef<GetLotData, GetLotVariables>;
}
export const getLotRef: GetLotRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLot(dc: DataConnect, vars: GetLotVariables, options?: ExecuteQueryOptions): QueryPromise<GetLotData, GetLotVariables>;

interface GetLotRef {
  ...
  (dc: DataConnect, vars: GetLotVariables): QueryRef<GetLotData, GetLotVariables>;
}
export const getLotRef: GetLotRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLotRef:
```typescript
const name = getLotRef.operationName;
console.log(name);
```

### Variables
The `GetLot` query requires an argument of type `GetLotVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetLotVariables {
  number: string;
}
```
### Return Type
Recall that executing the `GetLot` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLotData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLotData {
  lots: ({
    id: UUIDString;
    number: string;
    millLotRef?: string | null;
    producedQuantity: Int64String;
    producedOn?: DateString | null;
    qualityState: LotQualityState;
    createdAt: TimestampString;
    sku: {
      code: string;
      rollTracking: boolean;
      product: {
        name: string;
      };
      variant: {
        name: string;
      };
      shade: {
        code: string;
        name: string;
        hex?: string | null;
      } & Shade_Key;
      putUp: {
        rollLengthM: number;
        rollsPerCarton?: number | null;
        cartonLengthCm?: number | null;
        cartonWidthCm?: number | null;
        cartonHeightCm?: number | null;
      };
    } & Sku_Key;
    rolls_on_lot: ({
      id: UUIDString;
      number: string;
      rollNo: number;
      measuredLength: Int64String;
      usableWidthCm?: number | null;
      weightG?: number | null;
      grade?: string | null;
      defectPoints?: number | null;
      handlingUnitContents_on_roll: ({
        handlingUnit: {
          number: string;
        };
      })[];
    } & Roll_Key)[];
    handlingUnitContents_on_lot: ({
      quantity?: Int64String | null;
      handlingUnit: {
        number: string;
      };
    })[];
    run: {
      number: string;
      purchaseOrder: {
        number: string;
        supplier: {
          tradingName?: string | null;
          legalName: string;
        };
      };
    };
  } & Lot_Key)[];
}
```
### Using `GetLot`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLot, GetLotVariables } from '@basis/dataconnect-platform';

// The `GetLot` query requires an argument of type `GetLotVariables`:
const getLotVars: GetLotVariables = {
  number: ..., 
};

// Call the `getLot()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLot(getLotVars);
// Variables can be defined inline as well.
const { data } = await getLot({ number: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLot(dataConnect, getLotVars);

console.log(data.lots);

// Or, you can use the `Promise` API.
getLot(getLotVars).then((response) => {
  const data = response.data;
  console.log(data.lots);
});
```

### Using `GetLot`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLotRef, GetLotVariables } from '@basis/dataconnect-platform';

// The `GetLot` query requires an argument of type `GetLotVariables`:
const getLotVars: GetLotVariables = {
  number: ..., 
};

// Call the `getLotRef()` function to get a reference to the query.
const ref = getLotRef(getLotVars);
// Variables can be defined inline as well.
const ref = getLotRef({ number: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLotRef(dataConnect, getLotVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.lots);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.lots);
});
```

## ListProcessTemplates
You can execute the `ListProcessTemplates` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listProcessTemplates(options?: ExecuteQueryOptions): QueryPromise<ListProcessTemplatesData, undefined>;

interface ListProcessTemplatesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProcessTemplatesData, undefined>;
}
export const listProcessTemplatesRef: ListProcessTemplatesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProcessTemplates(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListProcessTemplatesData, undefined>;

interface ListProcessTemplatesRef {
  ...
  (dc: DataConnect): QueryRef<ListProcessTemplatesData, undefined>;
}
export const listProcessTemplatesRef: ListProcessTemplatesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProcessTemplatesRef:
```typescript
const name = listProcessTemplatesRef.operationName;
console.log(name);
```

### Variables
The `ListProcessTemplates` query has no variables.
### Return Type
Recall that executing the `ListProcessTemplates` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProcessTemplatesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListProcessTemplatesData {
  processTemplates: ({
    id: UUIDString;
    name: string;
    isDefault: boolean;
    family?: {
      code: string;
      name: string;
    } & FabricFamily_Key;
    supplier?: {
      id: UUIDString;
      tradingName?: string | null;
      legalName: string;
    } & Company_Key;
    processTemplateSteps_on_template: ({
      id: UUIDString;
      key: string;
      name: string;
      category: string;
      sequence: number;
      durationDays: number;
      dependsOnKey?: string | null;
      gate: MilestoneGate;
    } & ProcessTemplateStep_Key)[];
  } & ProcessTemplate_Key)[];
}
```
### Using `ListProcessTemplates`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProcessTemplates } from '@basis/dataconnect-platform';


// Call the `listProcessTemplates()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProcessTemplates();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProcessTemplates(dataConnect);

console.log(data.processTemplates);

// Or, you can use the `Promise` API.
listProcessTemplates().then((response) => {
  const data = response.data;
  console.log(data.processTemplates);
});
```

### Using `ListProcessTemplates`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProcessTemplatesRef } from '@basis/dataconnect-platform';


// Call the `listProcessTemplatesRef()` function to get a reference to the query.
const ref = listProcessTemplatesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProcessTemplatesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.processTemplates);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.processTemplates);
});
```

## ListCompanies
You can execute the `ListCompanies` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listCompanies(options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listCompanies(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListCompaniesData, undefined>;

interface ListCompaniesRef {
  ...
  (dc: DataConnect): QueryRef<ListCompaniesData, undefined>;
}
export const listCompaniesRef: ListCompaniesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listCompaniesRef:
```typescript
const name = listCompaniesRef.operationName;
console.log(name);
```

### Variables
The `ListCompanies` query has no variables.
### Return Type
Recall that executing the `ListCompanies` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListCompaniesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListCompanies`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listCompanies } from '@basis/dataconnect-platform';


// Call the `listCompanies()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listCompanies();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listCompanies(dataConnect);

console.log(data.companies);

// Or, you can use the `Promise` API.
listCompanies().then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

### Using `ListCompanies`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listCompaniesRef } from '@basis/dataconnect-platform';


// Call the `listCompaniesRef()` function to get a reference to the query.
const ref = listCompaniesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listCompaniesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.companies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.companies);
});
```

## GetCompany
You can execute the `GetCompany` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
getCompany(vars: GetCompanyVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyData, GetCompanyVariables>;

interface GetCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCompanyVariables): QueryRef<GetCompanyData, GetCompanyVariables>;
}
export const getCompanyRef: GetCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCompany(dc: DataConnect, vars: GetCompanyVariables, options?: ExecuteQueryOptions): QueryPromise<GetCompanyData, GetCompanyVariables>;

interface GetCompanyRef {
  ...
  (dc: DataConnect, vars: GetCompanyVariables): QueryRef<GetCompanyData, GetCompanyVariables>;
}
export const getCompanyRef: GetCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCompanyRef:
```typescript
const name = getCompanyRef.operationName;
console.log(name);
```

### Variables
The `GetCompany` query requires an argument of type `GetCompanyVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCompanyVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetCompany` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCompanyData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `GetCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCompany, GetCompanyVariables } from '@basis/dataconnect-platform';

// The `GetCompany` query requires an argument of type `GetCompanyVariables`:
const getCompanyVars: GetCompanyVariables = {
  id: ..., 
};

// Call the `getCompany()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCompany(getCompanyVars);
// Variables can be defined inline as well.
const { data } = await getCompany({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCompany(dataConnect, getCompanyVars);

console.log(data.company);

// Or, you can use the `Promise` API.
getCompany(getCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company);
});
```

### Using `GetCompany`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCompanyRef, GetCompanyVariables } from '@basis/dataconnect-platform';

// The `GetCompany` query requires an argument of type `GetCompanyVariables`:
const getCompanyVars: GetCompanyVariables = {
  id: ..., 
};

// Call the `getCompanyRef()` function to get a reference to the query.
const ref = getCompanyRef(getCompanyVars);
// Variables can be defined inline as well.
const ref = getCompanyRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCompanyRef(dataConnect, getCompanyVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.company);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.company);
});
```

## ListFactories
You can execute the `ListFactories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listFactories(options?: ExecuteQueryOptions): QueryPromise<ListFactoriesData, undefined>;

interface ListFactoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListFactoriesData, undefined>;
}
export const listFactoriesRef: ListFactoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listFactories(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListFactoriesData, undefined>;

interface ListFactoriesRef {
  ...
  (dc: DataConnect): QueryRef<ListFactoriesData, undefined>;
}
export const listFactoriesRef: ListFactoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listFactoriesRef:
```typescript
const name = listFactoriesRef.operationName;
console.log(name);
```

### Variables
The `ListFactories` query has no variables.
### Return Type
Recall that executing the `ListFactories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListFactoriesData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ListFactories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listFactories } from '@basis/dataconnect-platform';


// Call the `listFactories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listFactories();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listFactories(dataConnect);

console.log(data.factories);

// Or, you can use the `Promise` API.
listFactories().then((response) => {
  const data = response.data;
  console.log(data.factories);
});
```

### Using `ListFactories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listFactoriesRef } from '@basis/dataconnect-platform';


// Call the `listFactoriesRef()` function to get a reference to the query.
const ref = listFactoriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listFactoriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.factories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.factories);
});
```

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

## ListStaff
You can execute the `ListStaff` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listStaff(options?: ExecuteQueryOptions): QueryPromise<ListStaffData, undefined>;

interface ListStaffRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListStaffData, undefined>;
}
export const listStaffRef: ListStaffRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listStaff(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListStaffData, undefined>;

interface ListStaffRef {
  ...
  (dc: DataConnect): QueryRef<ListStaffData, undefined>;
}
export const listStaffRef: ListStaffRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listStaffRef:
```typescript
const name = listStaffRef.operationName;
console.log(name);
```

### Variables
The `ListStaff` query has no variables.
### Return Type
Recall that executing the `ListStaff` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListStaffData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListStaffData {
  users: ({
    uid: string;
    name: string;
    role: Role;
  } & User_Key)[];
}
```
### Using `ListStaff`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listStaff } from '@basis/dataconnect-platform';


// Call the `listStaff()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listStaff();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listStaff(dataConnect);

console.log(data.users);

// Or, you can use the `Promise` API.
listStaff().then((response) => {
  const data = response.data;
  console.log(data.users);
});
```

### Using `ListStaff`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listStaffRef } from '@basis/dataconnect-platform';


// Call the `listStaffRef()` function to get a reference to the query.
const ref = listStaffRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listStaffRef(dataConnect);

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

## ListOpenTasks
You can execute the `ListOpenTasks` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
listOpenTasks(options?: ExecuteQueryOptions): QueryPromise<ListOpenTasksData, undefined>;

interface ListOpenTasksRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListOpenTasksData, undefined>;
}
export const listOpenTasksRef: ListOpenTasksRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listOpenTasks(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListOpenTasksData, undefined>;

interface ListOpenTasksRef {
  ...
  (dc: DataConnect): QueryRef<ListOpenTasksData, undefined>;
}
export const listOpenTasksRef: ListOpenTasksRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listOpenTasksRef:
```typescript
const name = listOpenTasksRef.operationName;
console.log(name);
```

### Variables
The `ListOpenTasks` query has no variables.
### Return Type
Recall that executing the `ListOpenTasks` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListOpenTasksData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListOpenTasksData {
  tasks: ({
    id: UUIDString;
    title: string;
    details?: string | null;
    dueOn?: DateString | null;
    state: TaskState;
    entityType?: string | null;
    entityId?: string | null;
    createdAt: TimestampString;
    assignee?: {
      uid: string;
      name: string;
    } & User_Key;
    createdBy?: {
      uid: string;
      name: string;
    } & User_Key;
  } & Task_Key)[];
}
```
### Using `ListOpenTasks`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listOpenTasks } from '@basis/dataconnect-platform';


// Call the `listOpenTasks()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listOpenTasks();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listOpenTasks(dataConnect);

console.log(data.tasks);

// Or, you can use the `Promise` API.
listOpenTasks().then((response) => {
  const data = response.data;
  console.log(data.tasks);
});
```

### Using `ListOpenTasks`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listOpenTasksRef } from '@basis/dataconnect-platform';


// Call the `listOpenTasksRef()` function to get a reference to the query.
const ref = listOpenTasksRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listOpenTasksRef(dataConnect);

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

## UpsertFamily
You can execute the `UpsertFamily` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertFamily(vars: UpsertFamilyVariables): MutationPromise<UpsertFamilyData, UpsertFamilyVariables>;

interface UpsertFamilyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertFamilyVariables): MutationRef<UpsertFamilyData, UpsertFamilyVariables>;
}
export const upsertFamilyRef: UpsertFamilyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertFamily(dc: DataConnect, vars: UpsertFamilyVariables): MutationPromise<UpsertFamilyData, UpsertFamilyVariables>;

interface UpsertFamilyRef {
  ...
  (dc: DataConnect, vars: UpsertFamilyVariables): MutationRef<UpsertFamilyData, UpsertFamilyVariables>;
}
export const upsertFamilyRef: UpsertFamilyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertFamilyRef:
```typescript
const name = upsertFamilyRef.operationName;
console.log(name);
```

### Variables
The `UpsertFamily` mutation requires an argument of type `UpsertFamilyVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertFamilyVariables {
  code: string;
  name: string;
  slug: string;
  description?: string | null;
  specSchema?: unknown | null;
  hsCode?: string | null;
  sort: number;
}
```
### Return Type
Recall that executing the `UpsertFamily` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertFamilyData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertFamilyData {
  fabricFamily_upsert: FabricFamily_Key;
}
```
### Using `UpsertFamily`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertFamily, UpsertFamilyVariables } from '@basis/dataconnect-platform';

// The `UpsertFamily` mutation requires an argument of type `UpsertFamilyVariables`:
const upsertFamilyVars: UpsertFamilyVariables = {
  code: ..., 
  name: ..., 
  slug: ..., 
  description: ..., // optional
  specSchema: ..., // optional
  hsCode: ..., // optional
  sort: ..., 
};

// Call the `upsertFamily()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertFamily(upsertFamilyVars);
// Variables can be defined inline as well.
const { data } = await upsertFamily({ code: ..., name: ..., slug: ..., description: ..., specSchema: ..., hsCode: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertFamily(dataConnect, upsertFamilyVars);

console.log(data.fabricFamily_upsert);

// Or, you can use the `Promise` API.
upsertFamily(upsertFamilyVars).then((response) => {
  const data = response.data;
  console.log(data.fabricFamily_upsert);
});
```

### Using `UpsertFamily`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertFamilyRef, UpsertFamilyVariables } from '@basis/dataconnect-platform';

// The `UpsertFamily` mutation requires an argument of type `UpsertFamilyVariables`:
const upsertFamilyVars: UpsertFamilyVariables = {
  code: ..., 
  name: ..., 
  slug: ..., 
  description: ..., // optional
  specSchema: ..., // optional
  hsCode: ..., // optional
  sort: ..., 
};

// Call the `upsertFamilyRef()` function to get a reference to the mutation.
const ref = upsertFamilyRef(upsertFamilyVars);
// Variables can be defined inline as well.
const ref = upsertFamilyRef({ code: ..., name: ..., slug: ..., description: ..., specSchema: ..., hsCode: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertFamilyRef(dataConnect, upsertFamilyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.fabricFamily_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.fabricFamily_upsert);
});
```

## UpsertProduct
You can execute the `UpsertProduct` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertProduct(vars: UpsertProductVariables): MutationPromise<UpsertProductData, UpsertProductVariables>;

interface UpsertProductRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertProductVariables): MutationRef<UpsertProductData, UpsertProductVariables>;
}
export const upsertProductRef: UpsertProductRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertProduct(dc: DataConnect, vars: UpsertProductVariables): MutationPromise<UpsertProductData, UpsertProductVariables>;

interface UpsertProductRef {
  ...
  (dc: DataConnect, vars: UpsertProductVariables): MutationRef<UpsertProductData, UpsertProductVariables>;
}
export const upsertProductRef: UpsertProductRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertProductRef:
```typescript
const name = upsertProductRef.operationName;
console.log(name);
```

### Variables
The `UpsertProduct` mutation requires an argument of type `UpsertProductVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpsertProduct` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertProductData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertProductData {
  product_upsert: Product_Key;
}
```
### Using `UpsertProduct`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertProduct, UpsertProductVariables } from '@basis/dataconnect-platform';

// The `UpsertProduct` mutation requires an argument of type `UpsertProductVariables`:
const upsertProductVars: UpsertProductVariables = {
  code: ..., 
  familyCode: ..., 
  index: ..., 
  name: ..., 
  slug: ..., 
  tagline: ..., // optional
  description: ..., // optional
  composition: ..., // optional
  construction: ..., // optional
  care: ..., // optional
  specs: ..., // optional
  status: ..., 
  isPublic: ..., 
};

// Call the `upsertProduct()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertProduct(upsertProductVars);
// Variables can be defined inline as well.
const { data } = await upsertProduct({ code: ..., familyCode: ..., index: ..., name: ..., slug: ..., tagline: ..., description: ..., composition: ..., construction: ..., care: ..., specs: ..., status: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertProduct(dataConnect, upsertProductVars);

console.log(data.product_upsert);

// Or, you can use the `Promise` API.
upsertProduct(upsertProductVars).then((response) => {
  const data = response.data;
  console.log(data.product_upsert);
});
```

### Using `UpsertProduct`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertProductRef, UpsertProductVariables } from '@basis/dataconnect-platform';

// The `UpsertProduct` mutation requires an argument of type `UpsertProductVariables`:
const upsertProductVars: UpsertProductVariables = {
  code: ..., 
  familyCode: ..., 
  index: ..., 
  name: ..., 
  slug: ..., 
  tagline: ..., // optional
  description: ..., // optional
  composition: ..., // optional
  construction: ..., // optional
  care: ..., // optional
  specs: ..., // optional
  status: ..., 
  isPublic: ..., 
};

// Call the `upsertProductRef()` function to get a reference to the mutation.
const ref = upsertProductRef(upsertProductVars);
// Variables can be defined inline as well.
const ref = upsertProductRef({ code: ..., familyCode: ..., index: ..., name: ..., slug: ..., tagline: ..., description: ..., composition: ..., construction: ..., care: ..., specs: ..., status: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertProductRef(dataConnect, upsertProductVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.product_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.product_upsert);
});
```

## InsertVariant
You can execute the `InsertVariant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertVariant(vars: InsertVariantVariables): MutationPromise<InsertVariantData, InsertVariantVariables>;

interface InsertVariantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertVariantVariables): MutationRef<InsertVariantData, InsertVariantVariables>;
}
export const insertVariantRef: InsertVariantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertVariant(dc: DataConnect, vars: InsertVariantVariables): MutationPromise<InsertVariantData, InsertVariantVariables>;

interface InsertVariantRef {
  ...
  (dc: DataConnect, vars: InsertVariantVariables): MutationRef<InsertVariantData, InsertVariantVariables>;
}
export const insertVariantRef: InsertVariantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertVariantRef:
```typescript
const name = insertVariantRef.operationName;
console.log(name);
```

### Variables
The `InsertVariant` mutation requires an argument of type `InsertVariantVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `InsertVariant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertVariantData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertVariantData {
  productVariant_insert: ProductVariant_Key;
}
```
### Using `InsertVariant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertVariant, InsertVariantVariables } from '@basis/dataconnect-platform';

// The `InsertVariant` mutation requires an argument of type `InsertVariantVariables`:
const insertVariantVars: InsertVariantVariables = {
  productCode: ..., 
  fullCode: ..., 
  code: ..., 
  name: ..., 
  widthCm: ..., // optional
  usableWidthCm: ..., // optional
  gsm: ..., // optional
  stretchWarpPercent: ..., // optional
  stretchWeftPercent: ..., // optional
  finish: ..., // optional
  specs: ..., // optional
  status: ..., 
  sort: ..., 
};

// Call the `insertVariant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertVariant(insertVariantVars);
// Variables can be defined inline as well.
const { data } = await insertVariant({ productCode: ..., fullCode: ..., code: ..., name: ..., widthCm: ..., usableWidthCm: ..., gsm: ..., stretchWarpPercent: ..., stretchWeftPercent: ..., finish: ..., specs: ..., status: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertVariant(dataConnect, insertVariantVars);

console.log(data.productVariant_insert);

// Or, you can use the `Promise` API.
insertVariant(insertVariantVars).then((response) => {
  const data = response.data;
  console.log(data.productVariant_insert);
});
```

### Using `InsertVariant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertVariantRef, InsertVariantVariables } from '@basis/dataconnect-platform';

// The `InsertVariant` mutation requires an argument of type `InsertVariantVariables`:
const insertVariantVars: InsertVariantVariables = {
  productCode: ..., 
  fullCode: ..., 
  code: ..., 
  name: ..., 
  widthCm: ..., // optional
  usableWidthCm: ..., // optional
  gsm: ..., // optional
  stretchWarpPercent: ..., // optional
  stretchWeftPercent: ..., // optional
  finish: ..., // optional
  specs: ..., // optional
  status: ..., 
  sort: ..., 
};

// Call the `insertVariantRef()` function to get a reference to the mutation.
const ref = insertVariantRef(insertVariantVars);
// Variables can be defined inline as well.
const ref = insertVariantRef({ productCode: ..., fullCode: ..., code: ..., name: ..., widthCm: ..., usableWidthCm: ..., gsm: ..., stretchWarpPercent: ..., stretchWeftPercent: ..., finish: ..., specs: ..., status: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertVariantRef(dataConnect, insertVariantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.productVariant_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.productVariant_insert);
});
```

## UpdateVariant
You can execute the `UpdateVariant` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
updateVariant(vars: UpdateVariantVariables): MutationPromise<UpdateVariantData, UpdateVariantVariables>;

interface UpdateVariantRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateVariantVariables): MutationRef<UpdateVariantData, UpdateVariantVariables>;
}
export const updateVariantRef: UpdateVariantRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateVariant(dc: DataConnect, vars: UpdateVariantVariables): MutationPromise<UpdateVariantData, UpdateVariantVariables>;

interface UpdateVariantRef {
  ...
  (dc: DataConnect, vars: UpdateVariantVariables): MutationRef<UpdateVariantData, UpdateVariantVariables>;
}
export const updateVariantRef: UpdateVariantRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateVariantRef:
```typescript
const name = updateVariantRef.operationName;
console.log(name);
```

### Variables
The `UpdateVariant` mutation requires an argument of type `UpdateVariantVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpdateVariant` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateVariantData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateVariantData {
  productVariant_update?: ProductVariant_Key | null;
}
```
### Using `UpdateVariant`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateVariant, UpdateVariantVariables } from '@basis/dataconnect-platform';

// The `UpdateVariant` mutation requires an argument of type `UpdateVariantVariables`:
const updateVariantVars: UpdateVariantVariables = {
  id: ..., 
  name: ..., 
  widthCm: ..., // optional
  usableWidthCm: ..., // optional
  gsm: ..., // optional
  stretchWarpPercent: ..., // optional
  stretchWeftPercent: ..., // optional
  finish: ..., // optional
  specs: ..., // optional
  status: ..., 
  sort: ..., 
};

// Call the `updateVariant()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateVariant(updateVariantVars);
// Variables can be defined inline as well.
const { data } = await updateVariant({ id: ..., name: ..., widthCm: ..., usableWidthCm: ..., gsm: ..., stretchWarpPercent: ..., stretchWeftPercent: ..., finish: ..., specs: ..., status: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateVariant(dataConnect, updateVariantVars);

console.log(data.productVariant_update);

// Or, you can use the `Promise` API.
updateVariant(updateVariantVars).then((response) => {
  const data = response.data;
  console.log(data.productVariant_update);
});
```

### Using `UpdateVariant`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateVariantRef, UpdateVariantVariables } from '@basis/dataconnect-platform';

// The `UpdateVariant` mutation requires an argument of type `UpdateVariantVariables`:
const updateVariantVars: UpdateVariantVariables = {
  id: ..., 
  name: ..., 
  widthCm: ..., // optional
  usableWidthCm: ..., // optional
  gsm: ..., // optional
  stretchWarpPercent: ..., // optional
  stretchWeftPercent: ..., // optional
  finish: ..., // optional
  specs: ..., // optional
  status: ..., 
  sort: ..., 
};

// Call the `updateVariantRef()` function to get a reference to the mutation.
const ref = updateVariantRef(updateVariantVars);
// Variables can be defined inline as well.
const ref = updateVariantRef({ id: ..., name: ..., widthCm: ..., usableWidthCm: ..., gsm: ..., stretchWarpPercent: ..., stretchWeftPercent: ..., finish: ..., specs: ..., status: ..., sort: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateVariantRef(dataConnect, updateVariantVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.productVariant_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.productVariant_update);
});
```

## UpsertShade
You can execute the `UpsertShade` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertShade(vars: UpsertShadeVariables): MutationPromise<UpsertShadeData, UpsertShadeVariables>;

interface UpsertShadeRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertShadeVariables): MutationRef<UpsertShadeData, UpsertShadeVariables>;
}
export const upsertShadeRef: UpsertShadeRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertShade(dc: DataConnect, vars: UpsertShadeVariables): MutationPromise<UpsertShadeData, UpsertShadeVariables>;

interface UpsertShadeRef {
  ...
  (dc: DataConnect, vars: UpsertShadeVariables): MutationRef<UpsertShadeData, UpsertShadeVariables>;
}
export const upsertShadeRef: UpsertShadeRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertShadeRef:
```typescript
const name = upsertShadeRef.operationName;
console.log(name);
```

### Variables
The `UpsertShade` mutation requires an argument of type `UpsertShadeVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpsertShade` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertShadeData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertShadeData {
  shade_upsert: Shade_Key;
}
```
### Using `UpsertShade`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertShade, UpsertShadeVariables } from '@basis/dataconnect-platform';

// The `UpsertShade` mutation requires an argument of type `UpsertShadeVariables`:
const upsertShadeVars: UpsertShadeVariables = {
  code: ..., 
  collectionCode: ..., // optional
  name: ..., 
  slug: ..., 
  hex: ..., // optional
  labL: ..., // optional
  labA: ..., // optional
  labB: ..., // optional
  sort: ..., 
  status: ..., 
};

// Call the `upsertShade()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertShade(upsertShadeVars);
// Variables can be defined inline as well.
const { data } = await upsertShade({ code: ..., collectionCode: ..., name: ..., slug: ..., hex: ..., labL: ..., labA: ..., labB: ..., sort: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertShade(dataConnect, upsertShadeVars);

console.log(data.shade_upsert);

// Or, you can use the `Promise` API.
upsertShade(upsertShadeVars).then((response) => {
  const data = response.data;
  console.log(data.shade_upsert);
});
```

### Using `UpsertShade`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertShadeRef, UpsertShadeVariables } from '@basis/dataconnect-platform';

// The `UpsertShade` mutation requires an argument of type `UpsertShadeVariables`:
const upsertShadeVars: UpsertShadeVariables = {
  code: ..., 
  collectionCode: ..., // optional
  name: ..., 
  slug: ..., 
  hex: ..., // optional
  labL: ..., // optional
  labA: ..., // optional
  labB: ..., // optional
  sort: ..., 
  status: ..., 
};

// Call the `upsertShadeRef()` function to get a reference to the mutation.
const ref = upsertShadeRef(upsertShadeVars);
// Variables can be defined inline as well.
const ref = upsertShadeRef({ code: ..., collectionCode: ..., name: ..., slug: ..., hex: ..., labL: ..., labA: ..., labB: ..., sort: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertShadeRef(dataConnect, upsertShadeVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shade_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shade_upsert);
});
```

## UpsertPutUp
You can execute the `UpsertPutUp` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertPutUp(vars: UpsertPutUpVariables): MutationPromise<UpsertPutUpData, UpsertPutUpVariables>;

interface UpsertPutUpRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertPutUpVariables): MutationRef<UpsertPutUpData, UpsertPutUpVariables>;
}
export const upsertPutUpRef: UpsertPutUpRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertPutUp(dc: DataConnect, vars: UpsertPutUpVariables): MutationPromise<UpsertPutUpData, UpsertPutUpVariables>;

interface UpsertPutUpRef {
  ...
  (dc: DataConnect, vars: UpsertPutUpVariables): MutationRef<UpsertPutUpData, UpsertPutUpVariables>;
}
export const upsertPutUpRef: UpsertPutUpRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertPutUpRef:
```typescript
const name = upsertPutUpRef.operationName;
console.log(name);
```

### Variables
The `UpsertPutUp` mutation requires an argument of type `UpsertPutUpVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertPutUpVariables {
  code: string;
  name: string;
  rollLengthM: number;
  widthCm: number;
  core?: string | null;
  wrap?: string | null;
  rollsPerCarton?: number | null;
}
```
### Return Type
Recall that executing the `UpsertPutUp` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertPutUpData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertPutUpData {
  putUp_upsert: PutUp_Key;
}
```
### Using `UpsertPutUp`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertPutUp, UpsertPutUpVariables } from '@basis/dataconnect-platform';

// The `UpsertPutUp` mutation requires an argument of type `UpsertPutUpVariables`:
const upsertPutUpVars: UpsertPutUpVariables = {
  code: ..., 
  name: ..., 
  rollLengthM: ..., 
  widthCm: ..., 
  core: ..., // optional
  wrap: ..., // optional
  rollsPerCarton: ..., // optional
};

// Call the `upsertPutUp()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertPutUp(upsertPutUpVars);
// Variables can be defined inline as well.
const { data } = await upsertPutUp({ code: ..., name: ..., rollLengthM: ..., widthCm: ..., core: ..., wrap: ..., rollsPerCarton: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertPutUp(dataConnect, upsertPutUpVars);

console.log(data.putUp_upsert);

// Or, you can use the `Promise` API.
upsertPutUp(upsertPutUpVars).then((response) => {
  const data = response.data;
  console.log(data.putUp_upsert);
});
```

### Using `UpsertPutUp`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertPutUpRef, UpsertPutUpVariables } from '@basis/dataconnect-platform';

// The `UpsertPutUp` mutation requires an argument of type `UpsertPutUpVariables`:
const upsertPutUpVars: UpsertPutUpVariables = {
  code: ..., 
  name: ..., 
  rollLengthM: ..., 
  widthCm: ..., 
  core: ..., // optional
  wrap: ..., // optional
  rollsPerCarton: ..., // optional
};

// Call the `upsertPutUpRef()` function to get a reference to the mutation.
const ref = upsertPutUpRef(upsertPutUpVars);
// Variables can be defined inline as well.
const ref = upsertPutUpRef({ code: ..., name: ..., rollLengthM: ..., widthCm: ..., core: ..., wrap: ..., rollsPerCarton: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertPutUpRef(dataConnect, upsertPutUpVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.putUp_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.putUp_upsert);
});
```

## UpsertSku
You can execute the `UpsertSku` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertSku(vars: UpsertSkuVariables): MutationPromise<UpsertSkuData, UpsertSkuVariables>;

interface UpsertSkuRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertSkuVariables): MutationRef<UpsertSkuData, UpsertSkuVariables>;
}
export const upsertSkuRef: UpsertSkuRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertSku(dc: DataConnect, vars: UpsertSkuVariables): MutationPromise<UpsertSkuData, UpsertSkuVariables>;

interface UpsertSkuRef {
  ...
  (dc: DataConnect, vars: UpsertSkuVariables): MutationRef<UpsertSkuData, UpsertSkuVariables>;
}
export const upsertSkuRef: UpsertSkuRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertSkuRef:
```typescript
const name = upsertSkuRef.operationName;
console.log(name);
```

### Variables
The `UpsertSku` mutation requires an argument of type `UpsertSkuVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpsertSku` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertSkuData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertSkuData {
  sku_upsert: Sku_Key;
}
```
### Using `UpsertSku`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertSku, UpsertSkuVariables } from '@basis/dataconnect-platform';

// The `UpsertSku` mutation requires an argument of type `UpsertSkuVariables`:
const upsertSkuVars: UpsertSkuVariables = {
  code: ..., 
  productCode: ..., 
  variantId: ..., 
  shadeCode: ..., 
  putUpCode: ..., 
  salesUom: ..., 
  salesMoq: ..., // optional
  status: ..., 
  isPublic: ..., 
  rollTracking: ..., 
};

// Call the `upsertSku()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertSku(upsertSkuVars);
// Variables can be defined inline as well.
const { data } = await upsertSku({ code: ..., productCode: ..., variantId: ..., shadeCode: ..., putUpCode: ..., salesUom: ..., salesMoq: ..., status: ..., isPublic: ..., rollTracking: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertSku(dataConnect, upsertSkuVars);

console.log(data.sku_upsert);

// Or, you can use the `Promise` API.
upsertSku(upsertSkuVars).then((response) => {
  const data = response.data;
  console.log(data.sku_upsert);
});
```

### Using `UpsertSku`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertSkuRef, UpsertSkuVariables } from '@basis/dataconnect-platform';

// The `UpsertSku` mutation requires an argument of type `UpsertSkuVariables`:
const upsertSkuVars: UpsertSkuVariables = {
  code: ..., 
  productCode: ..., 
  variantId: ..., 
  shadeCode: ..., 
  putUpCode: ..., 
  salesUom: ..., 
  salesMoq: ..., // optional
  status: ..., 
  isPublic: ..., 
  rollTracking: ..., 
};

// Call the `upsertSkuRef()` function to get a reference to the mutation.
const ref = upsertSkuRef(upsertSkuVars);
// Variables can be defined inline as well.
const ref = upsertSkuRef({ code: ..., productCode: ..., variantId: ..., shadeCode: ..., putUpCode: ..., salesUom: ..., salesMoq: ..., status: ..., isPublic: ..., rollTracking: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertSkuRef(dataConnect, upsertSkuVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.sku_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.sku_upsert);
});
```

## SetSkuStatus
You can execute the `SetSkuStatus` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
setSkuStatus(vars: SetSkuStatusVariables): MutationPromise<SetSkuStatusData, SetSkuStatusVariables>;

interface SetSkuStatusRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetSkuStatusVariables): MutationRef<SetSkuStatusData, SetSkuStatusVariables>;
}
export const setSkuStatusRef: SetSkuStatusRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
setSkuStatus(dc: DataConnect, vars: SetSkuStatusVariables): MutationPromise<SetSkuStatusData, SetSkuStatusVariables>;

interface SetSkuStatusRef {
  ...
  (dc: DataConnect, vars: SetSkuStatusVariables): MutationRef<SetSkuStatusData, SetSkuStatusVariables>;
}
export const setSkuStatusRef: SetSkuStatusRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the setSkuStatusRef:
```typescript
const name = setSkuStatusRef.operationName;
console.log(name);
```

### Variables
The `SetSkuStatus` mutation requires an argument of type `SetSkuStatusVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SetSkuStatusVariables {
  code: string;
  status: SkuStatus;
}
```
### Return Type
Recall that executing the `SetSkuStatus` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SetSkuStatusData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SetSkuStatusData {
  sku_update?: Sku_Key | null;
}
```
### Using `SetSkuStatus`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, setSkuStatus, SetSkuStatusVariables } from '@basis/dataconnect-platform';

// The `SetSkuStatus` mutation requires an argument of type `SetSkuStatusVariables`:
const setSkuStatusVars: SetSkuStatusVariables = {
  code: ..., 
  status: ..., 
};

// Call the `setSkuStatus()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await setSkuStatus(setSkuStatusVars);
// Variables can be defined inline as well.
const { data } = await setSkuStatus({ code: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await setSkuStatus(dataConnect, setSkuStatusVars);

console.log(data.sku_update);

// Or, you can use the `Promise` API.
setSkuStatus(setSkuStatusVars).then((response) => {
  const data = response.data;
  console.log(data.sku_update);
});
```

### Using `SetSkuStatus`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, setSkuStatusRef, SetSkuStatusVariables } from '@basis/dataconnect-platform';

// The `SetSkuStatus` mutation requires an argument of type `SetSkuStatusVariables`:
const setSkuStatusVars: SetSkuStatusVariables = {
  code: ..., 
  status: ..., 
};

// Call the `setSkuStatusRef()` function to get a reference to the mutation.
const ref = setSkuStatusRef(setSkuStatusVars);
// Variables can be defined inline as well.
const ref = setSkuStatusRef({ code: ..., status: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = setSkuStatusRef(dataConnect, setSkuStatusVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.sku_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.sku_update);
});
```

## UpdateProductDetails
You can execute the `UpdateProductDetails` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
updateProductDetails(vars: UpdateProductDetailsVariables): MutationPromise<UpdateProductDetailsData, UpdateProductDetailsVariables>;

interface UpdateProductDetailsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateProductDetailsVariables): MutationRef<UpdateProductDetailsData, UpdateProductDetailsVariables>;
}
export const updateProductDetailsRef: UpdateProductDetailsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateProductDetails(dc: DataConnect, vars: UpdateProductDetailsVariables): MutationPromise<UpdateProductDetailsData, UpdateProductDetailsVariables>;

interface UpdateProductDetailsRef {
  ...
  (dc: DataConnect, vars: UpdateProductDetailsVariables): MutationRef<UpdateProductDetailsData, UpdateProductDetailsVariables>;
}
export const updateProductDetailsRef: UpdateProductDetailsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateProductDetailsRef:
```typescript
const name = updateProductDetailsRef.operationName;
console.log(name);
```

### Variables
The `UpdateProductDetails` mutation requires an argument of type `UpdateProductDetailsVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpdateProductDetails` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateProductDetailsData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateProductDetailsData {
  product_update?: Product_Key | null;
}
```
### Using `UpdateProductDetails`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateProductDetails, UpdateProductDetailsVariables } from '@basis/dataconnect-platform';

// The `UpdateProductDetails` mutation requires an argument of type `UpdateProductDetailsVariables`:
const updateProductDetailsVars: UpdateProductDetailsVariables = {
  code: ..., 
  name: ..., 
  slug: ..., 
  tagline: ..., // optional
  description: ..., // optional
  composition: ..., // optional
  construction: ..., // optional
  care: ..., // optional
  specs: ..., // optional
  status: ..., 
  isPublic: ..., 
};

// Call the `updateProductDetails()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateProductDetails(updateProductDetailsVars);
// Variables can be defined inline as well.
const { data } = await updateProductDetails({ code: ..., name: ..., slug: ..., tagline: ..., description: ..., composition: ..., construction: ..., care: ..., specs: ..., status: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateProductDetails(dataConnect, updateProductDetailsVars);

console.log(data.product_update);

// Or, you can use the `Promise` API.
updateProductDetails(updateProductDetailsVars).then((response) => {
  const data = response.data;
  console.log(data.product_update);
});
```

### Using `UpdateProductDetails`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateProductDetailsRef, UpdateProductDetailsVariables } from '@basis/dataconnect-platform';

// The `UpdateProductDetails` mutation requires an argument of type `UpdateProductDetailsVariables`:
const updateProductDetailsVars: UpdateProductDetailsVariables = {
  code: ..., 
  name: ..., 
  slug: ..., 
  tagline: ..., // optional
  description: ..., // optional
  composition: ..., // optional
  construction: ..., // optional
  care: ..., // optional
  specs: ..., // optional
  status: ..., 
  isPublic: ..., 
};

// Call the `updateProductDetailsRef()` function to get a reference to the mutation.
const ref = updateProductDetailsRef(updateProductDetailsVars);
// Variables can be defined inline as well.
const ref = updateProductDetailsRef({ code: ..., name: ..., slug: ..., tagline: ..., description: ..., composition: ..., construction: ..., care: ..., specs: ..., status: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateProductDetailsRef(dataConnect, updateProductDetailsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.product_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.product_update);
});
```

## SetSkuPublic
You can execute the `SetSkuPublic` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
setSkuPublic(vars: SetSkuPublicVariables): MutationPromise<SetSkuPublicData, SetSkuPublicVariables>;

interface SetSkuPublicRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: SetSkuPublicVariables): MutationRef<SetSkuPublicData, SetSkuPublicVariables>;
}
export const setSkuPublicRef: SetSkuPublicRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
setSkuPublic(dc: DataConnect, vars: SetSkuPublicVariables): MutationPromise<SetSkuPublicData, SetSkuPublicVariables>;

interface SetSkuPublicRef {
  ...
  (dc: DataConnect, vars: SetSkuPublicVariables): MutationRef<SetSkuPublicData, SetSkuPublicVariables>;
}
export const setSkuPublicRef: SetSkuPublicRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the setSkuPublicRef:
```typescript
const name = setSkuPublicRef.operationName;
console.log(name);
```

### Variables
The `SetSkuPublic` mutation requires an argument of type `SetSkuPublicVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface SetSkuPublicVariables {
  code: string;
  isPublic: boolean;
}
```
### Return Type
Recall that executing the `SetSkuPublic` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `SetSkuPublicData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface SetSkuPublicData {
  sku_update?: Sku_Key | null;
}
```
### Using `SetSkuPublic`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, setSkuPublic, SetSkuPublicVariables } from '@basis/dataconnect-platform';

// The `SetSkuPublic` mutation requires an argument of type `SetSkuPublicVariables`:
const setSkuPublicVars: SetSkuPublicVariables = {
  code: ..., 
  isPublic: ..., 
};

// Call the `setSkuPublic()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await setSkuPublic(setSkuPublicVars);
// Variables can be defined inline as well.
const { data } = await setSkuPublic({ code: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await setSkuPublic(dataConnect, setSkuPublicVars);

console.log(data.sku_update);

// Or, you can use the `Promise` API.
setSkuPublic(setSkuPublicVars).then((response) => {
  const data = response.data;
  console.log(data.sku_update);
});
```

### Using `SetSkuPublic`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, setSkuPublicRef, SetSkuPublicVariables } from '@basis/dataconnect-platform';

// The `SetSkuPublic` mutation requires an argument of type `SetSkuPublicVariables`:
const setSkuPublicVars: SetSkuPublicVariables = {
  code: ..., 
  isPublic: ..., 
};

// Call the `setSkuPublicRef()` function to get a reference to the mutation.
const ref = setSkuPublicRef(setSkuPublicVars);
// Variables can be defined inline as well.
const ref = setSkuPublicRef({ code: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = setSkuPublicRef(dataConnect, setSkuPublicVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.sku_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.sku_update);
});
```

## InsertSupplierItem
You can execute the `InsertSupplierItem` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertSupplierItem(vars: InsertSupplierItemVariables): MutationPromise<InsertSupplierItemData, InsertSupplierItemVariables>;

interface InsertSupplierItemRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertSupplierItemVariables): MutationRef<InsertSupplierItemData, InsertSupplierItemVariables>;
}
export const insertSupplierItemRef: InsertSupplierItemRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertSupplierItem(dc: DataConnect, vars: InsertSupplierItemVariables): MutationPromise<InsertSupplierItemData, InsertSupplierItemVariables>;

interface InsertSupplierItemRef {
  ...
  (dc: DataConnect, vars: InsertSupplierItemVariables): MutationRef<InsertSupplierItemData, InsertSupplierItemVariables>;
}
export const insertSupplierItemRef: InsertSupplierItemRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertSupplierItemRef:
```typescript
const name = insertSupplierItemRef.operationName;
console.log(name);
```

### Variables
The `InsertSupplierItem` mutation requires an argument of type `InsertSupplierItemVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `InsertSupplierItem` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertSupplierItemData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertSupplierItemData {
  supplierItem_insert: SupplierItem_Key;
}
```
### Using `InsertSupplierItem`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertSupplierItem, InsertSupplierItemVariables } from '@basis/dataconnect-platform';

// The `InsertSupplierItem` mutation requires an argument of type `InsertSupplierItemVariables`:
const insertSupplierItemVars: InsertSupplierItemVariables = {
  skuCode: ..., 
  supplierId: ..., 
  factoryId: ..., // optional
  supplierSku: ..., // optional
  moq: ..., // optional
  leadTimeDays: ..., // optional
  isPreferred: ..., 
  notes: ..., // optional
};

// Call the `insertSupplierItem()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertSupplierItem(insertSupplierItemVars);
// Variables can be defined inline as well.
const { data } = await insertSupplierItem({ skuCode: ..., supplierId: ..., factoryId: ..., supplierSku: ..., moq: ..., leadTimeDays: ..., isPreferred: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertSupplierItem(dataConnect, insertSupplierItemVars);

console.log(data.supplierItem_insert);

// Or, you can use the `Promise` API.
insertSupplierItem(insertSupplierItemVars).then((response) => {
  const data = response.data;
  console.log(data.supplierItem_insert);
});
```

### Using `InsertSupplierItem`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertSupplierItemRef, InsertSupplierItemVariables } from '@basis/dataconnect-platform';

// The `InsertSupplierItem` mutation requires an argument of type `InsertSupplierItemVariables`:
const insertSupplierItemVars: InsertSupplierItemVariables = {
  skuCode: ..., 
  supplierId: ..., 
  factoryId: ..., // optional
  supplierSku: ..., // optional
  moq: ..., // optional
  leadTimeDays: ..., // optional
  isPreferred: ..., 
  notes: ..., // optional
};

// Call the `insertSupplierItemRef()` function to get a reference to the mutation.
const ref = insertSupplierItemRef(insertSupplierItemVars);
// Variables can be defined inline as well.
const ref = insertSupplierItemRef({ skuCode: ..., supplierId: ..., factoryId: ..., supplierSku: ..., moq: ..., leadTimeDays: ..., isPreferred: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertSupplierItemRef(dataConnect, insertSupplierItemVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.supplierItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.supplierItem_insert);
});
```

## InsertSupplierPrice
You can execute the `InsertSupplierPrice` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertSupplierPrice(vars: InsertSupplierPriceVariables): MutationPromise<InsertSupplierPriceData, InsertSupplierPriceVariables>;

interface InsertSupplierPriceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertSupplierPriceVariables): MutationRef<InsertSupplierPriceData, InsertSupplierPriceVariables>;
}
export const insertSupplierPriceRef: InsertSupplierPriceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertSupplierPrice(dc: DataConnect, vars: InsertSupplierPriceVariables): MutationPromise<InsertSupplierPriceData, InsertSupplierPriceVariables>;

interface InsertSupplierPriceRef {
  ...
  (dc: DataConnect, vars: InsertSupplierPriceVariables): MutationRef<InsertSupplierPriceData, InsertSupplierPriceVariables>;
}
export const insertSupplierPriceRef: InsertSupplierPriceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertSupplierPriceRef:
```typescript
const name = insertSupplierPriceRef.operationName;
console.log(name);
```

### Variables
The `InsertSupplierPrice` mutation requires an argument of type `InsertSupplierPriceVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertSupplierPriceVariables {
  supplierItemId: UUIDString;
  minQuantity: Int64String;
  unitPrice: Int64String;
  currency: string;
  validFrom?: DateString | null;
  validTo?: DateString | null;
  quotationRef?: string | null;
}
```
### Return Type
Recall that executing the `InsertSupplierPrice` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertSupplierPriceData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertSupplierPriceData {
  supplierPrice_insert: SupplierPrice_Key;
}
```
### Using `InsertSupplierPrice`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertSupplierPrice, InsertSupplierPriceVariables } from '@basis/dataconnect-platform';

// The `InsertSupplierPrice` mutation requires an argument of type `InsertSupplierPriceVariables`:
const insertSupplierPriceVars: InsertSupplierPriceVariables = {
  supplierItemId: ..., 
  minQuantity: ..., 
  unitPrice: ..., 
  currency: ..., 
  validFrom: ..., // optional
  validTo: ..., // optional
  quotationRef: ..., // optional
};

// Call the `insertSupplierPrice()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertSupplierPrice(insertSupplierPriceVars);
// Variables can be defined inline as well.
const { data } = await insertSupplierPrice({ supplierItemId: ..., minQuantity: ..., unitPrice: ..., currency: ..., validFrom: ..., validTo: ..., quotationRef: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertSupplierPrice(dataConnect, insertSupplierPriceVars);

console.log(data.supplierPrice_insert);

// Or, you can use the `Promise` API.
insertSupplierPrice(insertSupplierPriceVars).then((response) => {
  const data = response.data;
  console.log(data.supplierPrice_insert);
});
```

### Using `InsertSupplierPrice`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertSupplierPriceRef, InsertSupplierPriceVariables } from '@basis/dataconnect-platform';

// The `InsertSupplierPrice` mutation requires an argument of type `InsertSupplierPriceVariables`:
const insertSupplierPriceVars: InsertSupplierPriceVariables = {
  supplierItemId: ..., 
  minQuantity: ..., 
  unitPrice: ..., 
  currency: ..., 
  validFrom: ..., // optional
  validTo: ..., // optional
  quotationRef: ..., // optional
};

// Call the `insertSupplierPriceRef()` function to get a reference to the mutation.
const ref = insertSupplierPriceRef(insertSupplierPriceVars);
// Variables can be defined inline as well.
const ref = insertSupplierPriceRef({ supplierItemId: ..., minQuantity: ..., unitPrice: ..., currency: ..., validFrom: ..., validTo: ..., quotationRef: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertSupplierPriceRef(dataConnect, insertSupplierPriceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.supplierPrice_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.supplierPrice_insert);
});
```

## InsertShadeStandard
You can execute the `InsertShadeStandard` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertShadeStandard(vars: InsertShadeStandardVariables): MutationPromise<InsertShadeStandardData, InsertShadeStandardVariables>;

interface InsertShadeStandardRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertShadeStandardVariables): MutationRef<InsertShadeStandardData, InsertShadeStandardVariables>;
}
export const insertShadeStandardRef: InsertShadeStandardRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertShadeStandard(dc: DataConnect, vars: InsertShadeStandardVariables): MutationPromise<InsertShadeStandardData, InsertShadeStandardVariables>;

interface InsertShadeStandardRef {
  ...
  (dc: DataConnect, vars: InsertShadeStandardVariables): MutationRef<InsertShadeStandardData, InsertShadeStandardVariables>;
}
export const insertShadeStandardRef: InsertShadeStandardRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertShadeStandardRef:
```typescript
const name = insertShadeStandardRef.operationName;
console.log(name);
```

### Variables
The `InsertShadeStandard` mutation requires an argument of type `InsertShadeStandardVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertShadeStandardVariables {
  shadeCode: string;
  productCode: string;
  factoryId?: UUIDString | null;
  reference?: string | null;
  approvedOn?: DateString | null;
  toleranceDeltaE?: number | null;
  physicalLocation?: string | null;
}
```
### Return Type
Recall that executing the `InsertShadeStandard` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertShadeStandardData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertShadeStandardData {
  shadeStandard_insert: ShadeStandard_Key;
}
```
### Using `InsertShadeStandard`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertShadeStandard, InsertShadeStandardVariables } from '@basis/dataconnect-platform';

// The `InsertShadeStandard` mutation requires an argument of type `InsertShadeStandardVariables`:
const insertShadeStandardVars: InsertShadeStandardVariables = {
  shadeCode: ..., 
  productCode: ..., 
  factoryId: ..., // optional
  reference: ..., // optional
  approvedOn: ..., // optional
  toleranceDeltaE: ..., // optional
  physicalLocation: ..., // optional
};

// Call the `insertShadeStandard()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertShadeStandard(insertShadeStandardVars);
// Variables can be defined inline as well.
const { data } = await insertShadeStandard({ shadeCode: ..., productCode: ..., factoryId: ..., reference: ..., approvedOn: ..., toleranceDeltaE: ..., physicalLocation: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertShadeStandard(dataConnect, insertShadeStandardVars);

console.log(data.shadeStandard_insert);

// Or, you can use the `Promise` API.
insertShadeStandard(insertShadeStandardVars).then((response) => {
  const data = response.data;
  console.log(data.shadeStandard_insert);
});
```

### Using `InsertShadeStandard`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertShadeStandardRef, InsertShadeStandardVariables } from '@basis/dataconnect-platform';

// The `InsertShadeStandard` mutation requires an argument of type `InsertShadeStandardVariables`:
const insertShadeStandardVars: InsertShadeStandardVariables = {
  shadeCode: ..., 
  productCode: ..., 
  factoryId: ..., // optional
  reference: ..., // optional
  approvedOn: ..., // optional
  toleranceDeltaE: ..., // optional
  physicalLocation: ..., // optional
};

// Call the `insertShadeStandardRef()` function to get a reference to the mutation.
const ref = insertShadeStandardRef(insertShadeStandardVars);
// Variables can be defined inline as well.
const ref = insertShadeStandardRef({ shadeCode: ..., productCode: ..., factoryId: ..., reference: ..., approvedOn: ..., toleranceDeltaE: ..., physicalLocation: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertShadeStandardRef(dataConnect, insertShadeStandardVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.shadeStandard_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.shadeStandard_insert);
});
```

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

## RecordEvent
You can execute the `RecordEvent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
recordEvent(vars: RecordEventVariables): MutationPromise<RecordEventData, RecordEventVariables>;

interface RecordEventRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordEventVariables): MutationRef<RecordEventData, RecordEventVariables>;
}
export const recordEventRef: RecordEventRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
recordEvent(dc: DataConnect, vars: RecordEventVariables): MutationPromise<RecordEventData, RecordEventVariables>;

interface RecordEventRef {
  ...
  (dc: DataConnect, vars: RecordEventVariables): MutationRef<RecordEventData, RecordEventVariables>;
}
export const recordEventRef: RecordEventRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the recordEventRef:
```typescript
const name = recordEventRef.operationName;
console.log(name);
```

### Variables
The `RecordEvent` mutation requires an argument of type `RecordEventVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RecordEventVariables {
  entityType: string;
  entityId: string;
  kind: string;
  note?: string | null;
  payload?: unknown | null;
}
```
### Return Type
Recall that executing the `RecordEvent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RecordEventData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RecordEventData {
  timelineEvent_insert: TimelineEvent_Key;
}
```
### Using `RecordEvent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, recordEvent, RecordEventVariables } from '@basis/dataconnect-platform';

// The `RecordEvent` mutation requires an argument of type `RecordEventVariables`:
const recordEventVars: RecordEventVariables = {
  entityType: ..., 
  entityId: ..., 
  kind: ..., 
  note: ..., // optional
  payload: ..., // optional
};

// Call the `recordEvent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await recordEvent(recordEventVars);
// Variables can be defined inline as well.
const { data } = await recordEvent({ entityType: ..., entityId: ..., kind: ..., note: ..., payload: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await recordEvent(dataConnect, recordEventVars);

console.log(data.timelineEvent_insert);

// Or, you can use the `Promise` API.
recordEvent(recordEventVars).then((response) => {
  const data = response.data;
  console.log(data.timelineEvent_insert);
});
```

### Using `RecordEvent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, recordEventRef, RecordEventVariables } from '@basis/dataconnect-platform';

// The `RecordEvent` mutation requires an argument of type `RecordEventVariables`:
const recordEventVars: RecordEventVariables = {
  entityType: ..., 
  entityId: ..., 
  kind: ..., 
  note: ..., // optional
  payload: ..., // optional
};

// Call the `recordEventRef()` function to get a reference to the mutation.
const ref = recordEventRef(recordEventVars);
// Variables can be defined inline as well.
const ref = recordEventRef({ entityType: ..., entityId: ..., kind: ..., note: ..., payload: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = recordEventRef(dataConnect, recordEventVars);

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

## ResolveAlert
You can execute the `ResolveAlert` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
resolveAlert(vars: ResolveAlertVariables): MutationPromise<ResolveAlertData, ResolveAlertVariables>;

interface ResolveAlertRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ResolveAlertVariables): MutationRef<ResolveAlertData, ResolveAlertVariables>;
}
export const resolveAlertRef: ResolveAlertRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
resolveAlert(dc: DataConnect, vars: ResolveAlertVariables): MutationPromise<ResolveAlertData, ResolveAlertVariables>;

interface ResolveAlertRef {
  ...
  (dc: DataConnect, vars: ResolveAlertVariables): MutationRef<ResolveAlertData, ResolveAlertVariables>;
}
export const resolveAlertRef: ResolveAlertRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the resolveAlertRef:
```typescript
const name = resolveAlertRef.operationName;
console.log(name);
```

### Variables
The `ResolveAlert` mutation requires an argument of type `ResolveAlertVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ResolveAlertVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ResolveAlert` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ResolveAlertData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ResolveAlertData {
  alert_update?: Alert_Key | null;
}
```
### Using `ResolveAlert`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, resolveAlert, ResolveAlertVariables } from '@basis/dataconnect-platform';

// The `ResolveAlert` mutation requires an argument of type `ResolveAlertVariables`:
const resolveAlertVars: ResolveAlertVariables = {
  id: ..., 
};

// Call the `resolveAlert()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await resolveAlert(resolveAlertVars);
// Variables can be defined inline as well.
const { data } = await resolveAlert({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await resolveAlert(dataConnect, resolveAlertVars);

console.log(data.alert_update);

// Or, you can use the `Promise` API.
resolveAlert(resolveAlertVars).then((response) => {
  const data = response.data;
  console.log(data.alert_update);
});
```

### Using `ResolveAlert`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, resolveAlertRef, ResolveAlertVariables } from '@basis/dataconnect-platform';

// The `ResolveAlert` mutation requires an argument of type `ResolveAlertVariables`:
const resolveAlertVars: ResolveAlertVariables = {
  id: ..., 
};

// Call the `resolveAlertRef()` function to get a reference to the mutation.
const ref = resolveAlertRef(resolveAlertVars);
// Variables can be defined inline as well.
const ref = resolveAlertRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = resolveAlertRef(dataConnect, resolveAlertVars);

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

## ReopenTask
You can execute the `ReopenTask` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
reopenTask(vars: ReopenTaskVariables): MutationPromise<ReopenTaskData, ReopenTaskVariables>;

interface ReopenTaskRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ReopenTaskVariables): MutationRef<ReopenTaskData, ReopenTaskVariables>;
}
export const reopenTaskRef: ReopenTaskRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
reopenTask(dc: DataConnect, vars: ReopenTaskVariables): MutationPromise<ReopenTaskData, ReopenTaskVariables>;

interface ReopenTaskRef {
  ...
  (dc: DataConnect, vars: ReopenTaskVariables): MutationRef<ReopenTaskData, ReopenTaskVariables>;
}
export const reopenTaskRef: ReopenTaskRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the reopenTaskRef:
```typescript
const name = reopenTaskRef.operationName;
console.log(name);
```

### Variables
The `ReopenTask` mutation requires an argument of type `ReopenTaskVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ReopenTaskVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ReopenTask` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ReopenTaskData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ReopenTaskData {
  task_update?: Task_Key | null;
}
```
### Using `ReopenTask`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, reopenTask, ReopenTaskVariables } from '@basis/dataconnect-platform';

// The `ReopenTask` mutation requires an argument of type `ReopenTaskVariables`:
const reopenTaskVars: ReopenTaskVariables = {
  id: ..., 
};

// Call the `reopenTask()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await reopenTask(reopenTaskVars);
// Variables can be defined inline as well.
const { data } = await reopenTask({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await reopenTask(dataConnect, reopenTaskVars);

console.log(data.task_update);

// Or, you can use the `Promise` API.
reopenTask(reopenTaskVars).then((response) => {
  const data = response.data;
  console.log(data.task_update);
});
```

### Using `ReopenTask`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, reopenTaskRef, ReopenTaskVariables } from '@basis/dataconnect-platform';

// The `ReopenTask` mutation requires an argument of type `ReopenTaskVariables`:
const reopenTaskVars: ReopenTaskVariables = {
  id: ..., 
};

// Call the `reopenTaskRef()` function to get a reference to the mutation.
const ref = reopenTaskRef(reopenTaskVars);
// Variables can be defined inline as well.
const ref = reopenTaskRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = reopenTaskRef(dataConnect, reopenTaskVars);

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

## InsertCompany
You can execute the `InsertCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertCompany(vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface InsertCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
}
export const insertCompanyRef: InsertCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertCompany(dc: DataConnect, vars: InsertCompanyVariables): MutationPromise<InsertCompanyData, InsertCompanyVariables>;

interface InsertCompanyRef {
  ...
  (dc: DataConnect, vars: InsertCompanyVariables): MutationRef<InsertCompanyData, InsertCompanyVariables>;
}
export const insertCompanyRef: InsertCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertCompanyRef:
```typescript
const name = insertCompanyRef.operationName;
console.log(name);
```

### Variables
The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertCompanyVariables {
  legalName: string;
  tradingName?: string | null;
  countryCode?: string | null;
  website?: string | null;
  status: CompanyStatus;
  notes?: string | null;
}
```
### Return Type
Recall that executing the `InsertCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertCompanyData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertCompanyData {
  company_insert: Company_Key;
}
```
### Using `InsertCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertCompany, InsertCompanyVariables } from '@basis/dataconnect-platform';

// The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`:
const insertCompanyVars: InsertCompanyVariables = {
  legalName: ..., 
  tradingName: ..., // optional
  countryCode: ..., // optional
  website: ..., // optional
  status: ..., 
  notes: ..., // optional
};

// Call the `insertCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertCompany(insertCompanyVars);
// Variables can be defined inline as well.
const { data } = await insertCompany({ legalName: ..., tradingName: ..., countryCode: ..., website: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertCompany(dataConnect, insertCompanyVars);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
insertCompany(insertCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

### Using `InsertCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertCompanyRef, InsertCompanyVariables } from '@basis/dataconnect-platform';

// The `InsertCompany` mutation requires an argument of type `InsertCompanyVariables`:
const insertCompanyVars: InsertCompanyVariables = {
  legalName: ..., 
  tradingName: ..., // optional
  countryCode: ..., // optional
  website: ..., // optional
  status: ..., 
  notes: ..., // optional
};

// Call the `insertCompanyRef()` function to get a reference to the mutation.
const ref = insertCompanyRef(insertCompanyVars);
// Variables can be defined inline as well.
const ref = insertCompanyRef({ legalName: ..., tradingName: ..., countryCode: ..., website: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertCompanyRef(dataConnect, insertCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_insert);
});
```

## UpdateCompany
You can execute the `UpdateCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
updateCompany(vars: UpdateCompanyVariables): MutationPromise<UpdateCompanyData, UpdateCompanyVariables>;

interface UpdateCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateCompanyVariables): MutationRef<UpdateCompanyData, UpdateCompanyVariables>;
}
export const updateCompanyRef: UpdateCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateCompany(dc: DataConnect, vars: UpdateCompanyVariables): MutationPromise<UpdateCompanyData, UpdateCompanyVariables>;

interface UpdateCompanyRef {
  ...
  (dc: DataConnect, vars: UpdateCompanyVariables): MutationRef<UpdateCompanyData, UpdateCompanyVariables>;
}
export const updateCompanyRef: UpdateCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateCompanyRef:
```typescript
const name = updateCompanyRef.operationName;
console.log(name);
```

### Variables
The `UpdateCompany` mutation requires an argument of type `UpdateCompanyVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateCompanyVariables {
  id: UUIDString;
  legalName: string;
  tradingName?: string | null;
  countryCode?: string | null;
  website?: string | null;
  status: CompanyStatus;
  notes?: string | null;
}
```
### Return Type
Recall that executing the `UpdateCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateCompanyData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateCompanyData {
  company_update?: Company_Key | null;
}
```
### Using `UpdateCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateCompany, UpdateCompanyVariables } from '@basis/dataconnect-platform';

// The `UpdateCompany` mutation requires an argument of type `UpdateCompanyVariables`:
const updateCompanyVars: UpdateCompanyVariables = {
  id: ..., 
  legalName: ..., 
  tradingName: ..., // optional
  countryCode: ..., // optional
  website: ..., // optional
  status: ..., 
  notes: ..., // optional
};

// Call the `updateCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateCompany(updateCompanyVars);
// Variables can be defined inline as well.
const { data } = await updateCompany({ id: ..., legalName: ..., tradingName: ..., countryCode: ..., website: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateCompany(dataConnect, updateCompanyVars);

console.log(data.company_update);

// Or, you can use the `Promise` API.
updateCompany(updateCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_update);
});
```

### Using `UpdateCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateCompanyRef, UpdateCompanyVariables } from '@basis/dataconnect-platform';

// The `UpdateCompany` mutation requires an argument of type `UpdateCompanyVariables`:
const updateCompanyVars: UpdateCompanyVariables = {
  id: ..., 
  legalName: ..., 
  tradingName: ..., // optional
  countryCode: ..., // optional
  website: ..., // optional
  status: ..., 
  notes: ..., // optional
};

// Call the `updateCompanyRef()` function to get a reference to the mutation.
const ref = updateCompanyRef(updateCompanyVars);
// Variables can be defined inline as well.
const ref = updateCompanyRef({ id: ..., legalName: ..., tradingName: ..., countryCode: ..., website: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateCompanyRef(dataConnect, updateCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_update);
});
```

## ArchiveCompany
You can execute the `ArchiveCompany` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
archiveCompany(vars: ArchiveCompanyVariables): MutationPromise<ArchiveCompanyData, ArchiveCompanyVariables>;

interface ArchiveCompanyRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ArchiveCompanyVariables): MutationRef<ArchiveCompanyData, ArchiveCompanyVariables>;
}
export const archiveCompanyRef: ArchiveCompanyRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
archiveCompany(dc: DataConnect, vars: ArchiveCompanyVariables): MutationPromise<ArchiveCompanyData, ArchiveCompanyVariables>;

interface ArchiveCompanyRef {
  ...
  (dc: DataConnect, vars: ArchiveCompanyVariables): MutationRef<ArchiveCompanyData, ArchiveCompanyVariables>;
}
export const archiveCompanyRef: ArchiveCompanyRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the archiveCompanyRef:
```typescript
const name = archiveCompanyRef.operationName;
console.log(name);
```

### Variables
The `ArchiveCompany` mutation requires an argument of type `ArchiveCompanyVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ArchiveCompanyVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `ArchiveCompany` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ArchiveCompanyData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ArchiveCompanyData {
  company_update?: Company_Key | null;
}
```
### Using `ArchiveCompany`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, archiveCompany, ArchiveCompanyVariables } from '@basis/dataconnect-platform';

// The `ArchiveCompany` mutation requires an argument of type `ArchiveCompanyVariables`:
const archiveCompanyVars: ArchiveCompanyVariables = {
  id: ..., 
};

// Call the `archiveCompany()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await archiveCompany(archiveCompanyVars);
// Variables can be defined inline as well.
const { data } = await archiveCompany({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await archiveCompany(dataConnect, archiveCompanyVars);

console.log(data.company_update);

// Or, you can use the `Promise` API.
archiveCompany(archiveCompanyVars).then((response) => {
  const data = response.data;
  console.log(data.company_update);
});
```

### Using `ArchiveCompany`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, archiveCompanyRef, ArchiveCompanyVariables } from '@basis/dataconnect-platform';

// The `ArchiveCompany` mutation requires an argument of type `ArchiveCompanyVariables`:
const archiveCompanyVars: ArchiveCompanyVariables = {
  id: ..., 
};

// Call the `archiveCompanyRef()` function to get a reference to the mutation.
const ref = archiveCompanyRef(archiveCompanyVars);
// Variables can be defined inline as well.
const ref = archiveCompanyRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = archiveCompanyRef(dataConnect, archiveCompanyVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.company_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.company_update);
});
```

## AddCompanyRole
You can execute the `AddCompanyRole` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
addCompanyRole(vars: AddCompanyRoleVariables): MutationPromise<AddCompanyRoleData, AddCompanyRoleVariables>;

interface AddCompanyRoleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddCompanyRoleVariables): MutationRef<AddCompanyRoleData, AddCompanyRoleVariables>;
}
export const addCompanyRoleRef: AddCompanyRoleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addCompanyRole(dc: DataConnect, vars: AddCompanyRoleVariables): MutationPromise<AddCompanyRoleData, AddCompanyRoleVariables>;

interface AddCompanyRoleRef {
  ...
  (dc: DataConnect, vars: AddCompanyRoleVariables): MutationRef<AddCompanyRoleData, AddCompanyRoleVariables>;
}
export const addCompanyRoleRef: AddCompanyRoleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addCompanyRoleRef:
```typescript
const name = addCompanyRoleRef.operationName;
console.log(name);
```

### Variables
The `AddCompanyRole` mutation requires an argument of type `AddCompanyRoleVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddCompanyRoleVariables {
  companyId: UUIDString;
  kind: CompanyRoleKind;
  since?: DateString | null;
}
```
### Return Type
Recall that executing the `AddCompanyRole` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddCompanyRoleData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddCompanyRoleData {
  companyRole_insert: CompanyRole_Key;
}
```
### Using `AddCompanyRole`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addCompanyRole, AddCompanyRoleVariables } from '@basis/dataconnect-platform';

// The `AddCompanyRole` mutation requires an argument of type `AddCompanyRoleVariables`:
const addCompanyRoleVars: AddCompanyRoleVariables = {
  companyId: ..., 
  kind: ..., 
  since: ..., // optional
};

// Call the `addCompanyRole()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addCompanyRole(addCompanyRoleVars);
// Variables can be defined inline as well.
const { data } = await addCompanyRole({ companyId: ..., kind: ..., since: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addCompanyRole(dataConnect, addCompanyRoleVars);

console.log(data.companyRole_insert);

// Or, you can use the `Promise` API.
addCompanyRole(addCompanyRoleVars).then((response) => {
  const data = response.data;
  console.log(data.companyRole_insert);
});
```

### Using `AddCompanyRole`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addCompanyRoleRef, AddCompanyRoleVariables } from '@basis/dataconnect-platform';

// The `AddCompanyRole` mutation requires an argument of type `AddCompanyRoleVariables`:
const addCompanyRoleVars: AddCompanyRoleVariables = {
  companyId: ..., 
  kind: ..., 
  since: ..., // optional
};

// Call the `addCompanyRoleRef()` function to get a reference to the mutation.
const ref = addCompanyRoleRef(addCompanyRoleVars);
// Variables can be defined inline as well.
const ref = addCompanyRoleRef({ companyId: ..., kind: ..., since: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addCompanyRoleRef(dataConnect, addCompanyRoleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.companyRole_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.companyRole_insert);
});
```

## RemoveCompanyRole
You can execute the `RemoveCompanyRole` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
removeCompanyRole(vars: RemoveCompanyRoleVariables): MutationPromise<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;

interface RemoveCompanyRoleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RemoveCompanyRoleVariables): MutationRef<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;
}
export const removeCompanyRoleRef: RemoveCompanyRoleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
removeCompanyRole(dc: DataConnect, vars: RemoveCompanyRoleVariables): MutationPromise<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;

interface RemoveCompanyRoleRef {
  ...
  (dc: DataConnect, vars: RemoveCompanyRoleVariables): MutationRef<RemoveCompanyRoleData, RemoveCompanyRoleVariables>;
}
export const removeCompanyRoleRef: RemoveCompanyRoleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the removeCompanyRoleRef:
```typescript
const name = removeCompanyRoleRef.operationName;
console.log(name);
```

### Variables
The `RemoveCompanyRole` mutation requires an argument of type `RemoveCompanyRoleVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RemoveCompanyRoleVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `RemoveCompanyRole` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RemoveCompanyRoleData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RemoveCompanyRoleData {
  companyRole_delete?: CompanyRole_Key | null;
}
```
### Using `RemoveCompanyRole`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, removeCompanyRole, RemoveCompanyRoleVariables } from '@basis/dataconnect-platform';

// The `RemoveCompanyRole` mutation requires an argument of type `RemoveCompanyRoleVariables`:
const removeCompanyRoleVars: RemoveCompanyRoleVariables = {
  id: ..., 
};

// Call the `removeCompanyRole()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await removeCompanyRole(removeCompanyRoleVars);
// Variables can be defined inline as well.
const { data } = await removeCompanyRole({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await removeCompanyRole(dataConnect, removeCompanyRoleVars);

console.log(data.companyRole_delete);

// Or, you can use the `Promise` API.
removeCompanyRole(removeCompanyRoleVars).then((response) => {
  const data = response.data;
  console.log(data.companyRole_delete);
});
```

### Using `RemoveCompanyRole`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, removeCompanyRoleRef, RemoveCompanyRoleVariables } from '@basis/dataconnect-platform';

// The `RemoveCompanyRole` mutation requires an argument of type `RemoveCompanyRoleVariables`:
const removeCompanyRoleVars: RemoveCompanyRoleVariables = {
  id: ..., 
};

// Call the `removeCompanyRoleRef()` function to get a reference to the mutation.
const ref = removeCompanyRoleRef(removeCompanyRoleVars);
// Variables can be defined inline as well.
const ref = removeCompanyRoleRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = removeCompanyRoleRef(dataConnect, removeCompanyRoleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.companyRole_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.companyRole_delete);
});
```

## InsertContact
You can execute the `InsertContact` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertContact(vars: InsertContactVariables): MutationPromise<InsertContactData, InsertContactVariables>;

interface InsertContactRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertContactVariables): MutationRef<InsertContactData, InsertContactVariables>;
}
export const insertContactRef: InsertContactRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertContact(dc: DataConnect, vars: InsertContactVariables): MutationPromise<InsertContactData, InsertContactVariables>;

interface InsertContactRef {
  ...
  (dc: DataConnect, vars: InsertContactVariables): MutationRef<InsertContactData, InsertContactVariables>;
}
export const insertContactRef: InsertContactRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertContactRef:
```typescript
const name = insertContactRef.operationName;
console.log(name);
```

### Variables
The `InsertContact` mutation requires an argument of type `InsertContactVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `InsertContact` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertContactData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertContactData {
  contact_insert: Contact_Key;
}
```
### Using `InsertContact`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertContact, InsertContactVariables } from '@basis/dataconnect-platform';

// The `InsertContact` mutation requires an argument of type `InsertContactVariables`:
const insertContactVars: InsertContactVariables = {
  companyId: ..., 
  name: ..., 
  title: ..., // optional
  email: ..., // optional
  phone: ..., // optional
  messaging: ..., // optional
  language: ..., // optional
  isPrimary: ..., 
  notes: ..., // optional
};

// Call the `insertContact()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertContact(insertContactVars);
// Variables can be defined inline as well.
const { data } = await insertContact({ companyId: ..., name: ..., title: ..., email: ..., phone: ..., messaging: ..., language: ..., isPrimary: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertContact(dataConnect, insertContactVars);

console.log(data.contact_insert);

// Or, you can use the `Promise` API.
insertContact(insertContactVars).then((response) => {
  const data = response.data;
  console.log(data.contact_insert);
});
```

### Using `InsertContact`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertContactRef, InsertContactVariables } from '@basis/dataconnect-platform';

// The `InsertContact` mutation requires an argument of type `InsertContactVariables`:
const insertContactVars: InsertContactVariables = {
  companyId: ..., 
  name: ..., 
  title: ..., // optional
  email: ..., // optional
  phone: ..., // optional
  messaging: ..., // optional
  language: ..., // optional
  isPrimary: ..., 
  notes: ..., // optional
};

// Call the `insertContactRef()` function to get a reference to the mutation.
const ref = insertContactRef(insertContactVars);
// Variables can be defined inline as well.
const ref = insertContactRef({ companyId: ..., name: ..., title: ..., email: ..., phone: ..., messaging: ..., language: ..., isPrimary: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertContactRef(dataConnect, insertContactVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.contact_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.contact_insert);
});
```

## UpdateContact
You can execute the `UpdateContact` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
updateContact(vars: UpdateContactVariables): MutationPromise<UpdateContactData, UpdateContactVariables>;

interface UpdateContactRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateContactVariables): MutationRef<UpdateContactData, UpdateContactVariables>;
}
export const updateContactRef: UpdateContactRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateContact(dc: DataConnect, vars: UpdateContactVariables): MutationPromise<UpdateContactData, UpdateContactVariables>;

interface UpdateContactRef {
  ...
  (dc: DataConnect, vars: UpdateContactVariables): MutationRef<UpdateContactData, UpdateContactVariables>;
}
export const updateContactRef: UpdateContactRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateContactRef:
```typescript
const name = updateContactRef.operationName;
console.log(name);
```

### Variables
The `UpdateContact` mutation requires an argument of type `UpdateContactVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `UpdateContact` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateContactData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateContactData {
  contact_update?: Contact_Key | null;
}
```
### Using `UpdateContact`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateContact, UpdateContactVariables } from '@basis/dataconnect-platform';

// The `UpdateContact` mutation requires an argument of type `UpdateContactVariables`:
const updateContactVars: UpdateContactVariables = {
  id: ..., 
  name: ..., 
  title: ..., // optional
  email: ..., // optional
  phone: ..., // optional
  messaging: ..., // optional
  language: ..., // optional
  isPrimary: ..., 
  status: ..., 
  notes: ..., // optional
};

// Call the `updateContact()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateContact(updateContactVars);
// Variables can be defined inline as well.
const { data } = await updateContact({ id: ..., name: ..., title: ..., email: ..., phone: ..., messaging: ..., language: ..., isPrimary: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateContact(dataConnect, updateContactVars);

console.log(data.contact_update);

// Or, you can use the `Promise` API.
updateContact(updateContactVars).then((response) => {
  const data = response.data;
  console.log(data.contact_update);
});
```

### Using `UpdateContact`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateContactRef, UpdateContactVariables } from '@basis/dataconnect-platform';

// The `UpdateContact` mutation requires an argument of type `UpdateContactVariables`:
const updateContactVars: UpdateContactVariables = {
  id: ..., 
  name: ..., 
  title: ..., // optional
  email: ..., // optional
  phone: ..., // optional
  messaging: ..., // optional
  language: ..., // optional
  isPrimary: ..., 
  status: ..., 
  notes: ..., // optional
};

// Call the `updateContactRef()` function to get a reference to the mutation.
const ref = updateContactRef(updateContactVars);
// Variables can be defined inline as well.
const ref = updateContactRef({ id: ..., name: ..., title: ..., email: ..., phone: ..., messaging: ..., language: ..., isPrimary: ..., status: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateContactRef(dataConnect, updateContactVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.contact_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.contact_update);
});
```

## InsertLocation
You can execute the `InsertLocation` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertLocation(vars: InsertLocationVariables): MutationPromise<InsertLocationData, InsertLocationVariables>;

interface InsertLocationRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertLocationVariables): MutationRef<InsertLocationData, InsertLocationVariables>;
}
export const insertLocationRef: InsertLocationRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertLocation(dc: DataConnect, vars: InsertLocationVariables): MutationPromise<InsertLocationData, InsertLocationVariables>;

interface InsertLocationRef {
  ...
  (dc: DataConnect, vars: InsertLocationVariables): MutationRef<InsertLocationData, InsertLocationVariables>;
}
export const insertLocationRef: InsertLocationRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertLocationRef:
```typescript
const name = insertLocationRef.operationName;
console.log(name);
```

### Variables
The `InsertLocation` mutation requires an argument of type `InsertLocationVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
```
### Return Type
Recall that executing the `InsertLocation` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertLocationData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertLocationData {
  location_insert: Location_Key;
}
```
### Using `InsertLocation`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertLocation, InsertLocationVariables } from '@basis/dataconnect-platform';

// The `InsertLocation` mutation requires an argument of type `InsertLocationVariables`:
const insertLocationVars: InsertLocationVariables = {
  companyId: ..., // optional
  type: ..., 
  name: ..., 
  addressLine1: ..., // optional
  addressLine2: ..., // optional
  city: ..., // optional
  region: ..., // optional
  postalCode: ..., // optional
  countryCode: ..., // optional
  timeZone: ..., // optional
  locationCode: ..., // optional
  notes: ..., // optional
};

// Call the `insertLocation()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertLocation(insertLocationVars);
// Variables can be defined inline as well.
const { data } = await insertLocation({ companyId: ..., type: ..., name: ..., addressLine1: ..., addressLine2: ..., city: ..., region: ..., postalCode: ..., countryCode: ..., timeZone: ..., locationCode: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertLocation(dataConnect, insertLocationVars);

console.log(data.location_insert);

// Or, you can use the `Promise` API.
insertLocation(insertLocationVars).then((response) => {
  const data = response.data;
  console.log(data.location_insert);
});
```

### Using `InsertLocation`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertLocationRef, InsertLocationVariables } from '@basis/dataconnect-platform';

// The `InsertLocation` mutation requires an argument of type `InsertLocationVariables`:
const insertLocationVars: InsertLocationVariables = {
  companyId: ..., // optional
  type: ..., 
  name: ..., 
  addressLine1: ..., // optional
  addressLine2: ..., // optional
  city: ..., // optional
  region: ..., // optional
  postalCode: ..., // optional
  countryCode: ..., // optional
  timeZone: ..., // optional
  locationCode: ..., // optional
  notes: ..., // optional
};

// Call the `insertLocationRef()` function to get a reference to the mutation.
const ref = insertLocationRef(insertLocationVars);
// Variables can be defined inline as well.
const ref = insertLocationRef({ companyId: ..., type: ..., name: ..., addressLine1: ..., addressLine2: ..., city: ..., region: ..., postalCode: ..., countryCode: ..., timeZone: ..., locationCode: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertLocationRef(dataConnect, insertLocationVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.location_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.location_insert);
});
```

## InsertFactory
You can execute the `InsertFactory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
insertFactory(vars: InsertFactoryVariables): MutationPromise<InsertFactoryData, InsertFactoryVariables>;

interface InsertFactoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertFactoryVariables): MutationRef<InsertFactoryData, InsertFactoryVariables>;
}
export const insertFactoryRef: InsertFactoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertFactory(dc: DataConnect, vars: InsertFactoryVariables): MutationPromise<InsertFactoryData, InsertFactoryVariables>;

interface InsertFactoryRef {
  ...
  (dc: DataConnect, vars: InsertFactoryVariables): MutationRef<InsertFactoryData, InsertFactoryVariables>;
}
export const insertFactoryRef: InsertFactoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertFactoryRef:
```typescript
const name = insertFactoryRef.operationName;
console.log(name);
```

### Variables
The `InsertFactory` mutation requires an argument of type `InsertFactoryVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertFactoryVariables {
  locationId: UUIDString;
  operatorId: UUIDString;
  capabilities?: unknown | null;
  auditStatus?: string | null;
  notes?: string | null;
}
```
### Return Type
Recall that executing the `InsertFactory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertFactoryData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertFactoryData {
  factory_insert: Factory_Key;
}
```
### Using `InsertFactory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertFactory, InsertFactoryVariables } from '@basis/dataconnect-platform';

// The `InsertFactory` mutation requires an argument of type `InsertFactoryVariables`:
const insertFactoryVars: InsertFactoryVariables = {
  locationId: ..., 
  operatorId: ..., 
  capabilities: ..., // optional
  auditStatus: ..., // optional
  notes: ..., // optional
};

// Call the `insertFactory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertFactory(insertFactoryVars);
// Variables can be defined inline as well.
const { data } = await insertFactory({ locationId: ..., operatorId: ..., capabilities: ..., auditStatus: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertFactory(dataConnect, insertFactoryVars);

console.log(data.factory_insert);

// Or, you can use the `Promise` API.
insertFactory(insertFactoryVars).then((response) => {
  const data = response.data;
  console.log(data.factory_insert);
});
```

### Using `InsertFactory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertFactoryRef, InsertFactoryVariables } from '@basis/dataconnect-platform';

// The `InsertFactory` mutation requires an argument of type `InsertFactoryVariables`:
const insertFactoryVars: InsertFactoryVariables = {
  locationId: ..., 
  operatorId: ..., 
  capabilities: ..., // optional
  auditStatus: ..., // optional
  notes: ..., // optional
};

// Call the `insertFactoryRef()` function to get a reference to the mutation.
const ref = insertFactoryRef(insertFactoryVars);
// Variables can be defined inline as well.
const ref = insertFactoryRef({ locationId: ..., operatorId: ..., capabilities: ..., auditStatus: ..., notes: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertFactoryRef(dataConnect, insertFactoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.factory_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.factory_insert);
});
```

## UpsertSupplierProfile
You can execute the `UpsertSupplierProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [platform/index.d.ts](./index.d.ts):
```typescript
upsertSupplierProfile(vars: UpsertSupplierProfileVariables): MutationPromise<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;

interface UpsertSupplierProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpsertSupplierProfileVariables): MutationRef<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;
}
export const upsertSupplierProfileRef: UpsertSupplierProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
upsertSupplierProfile(dc: DataConnect, vars: UpsertSupplierProfileVariables): MutationPromise<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;

interface UpsertSupplierProfileRef {
  ...
  (dc: DataConnect, vars: UpsertSupplierProfileVariables): MutationRef<UpsertSupplierProfileData, UpsertSupplierProfileVariables>;
}
export const upsertSupplierProfileRef: UpsertSupplierProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the upsertSupplierProfileRef:
```typescript
const name = upsertSupplierProfileRef.operationName;
console.log(name);
```

### Variables
The `UpsertSupplierProfile` mutation requires an argument of type `UpsertSupplierProfileVariables`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpsertSupplierProfileVariables {
  id?: UUIDString | null;
  companyId: UUIDString;
  paymentTerms?: string | null;
  defaultIncotermCode?: string | null;
  namedPlace?: string | null;
  standardLeadTimeDays?: number | null;
  onboardingStatus?: string | null;
}
```
### Return Type
Recall that executing the `UpsertSupplierProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpsertSupplierProfileData`, which is defined in [platform/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpsertSupplierProfileData {
  supplierProfile_upsert: SupplierProfile_Key;
}
```
### Using `UpsertSupplierProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, upsertSupplierProfile, UpsertSupplierProfileVariables } from '@basis/dataconnect-platform';

// The `UpsertSupplierProfile` mutation requires an argument of type `UpsertSupplierProfileVariables`:
const upsertSupplierProfileVars: UpsertSupplierProfileVariables = {
  id: ..., // optional
  companyId: ..., 
  paymentTerms: ..., // optional
  defaultIncotermCode: ..., // optional
  namedPlace: ..., // optional
  standardLeadTimeDays: ..., // optional
  onboardingStatus: ..., // optional
};

// Call the `upsertSupplierProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await upsertSupplierProfile(upsertSupplierProfileVars);
// Variables can be defined inline as well.
const { data } = await upsertSupplierProfile({ id: ..., companyId: ..., paymentTerms: ..., defaultIncotermCode: ..., namedPlace: ..., standardLeadTimeDays: ..., onboardingStatus: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await upsertSupplierProfile(dataConnect, upsertSupplierProfileVars);

console.log(data.supplierProfile_upsert);

// Or, you can use the `Promise` API.
upsertSupplierProfile(upsertSupplierProfileVars).then((response) => {
  const data = response.data;
  console.log(data.supplierProfile_upsert);
});
```

### Using `UpsertSupplierProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, upsertSupplierProfileRef, UpsertSupplierProfileVariables } from '@basis/dataconnect-platform';

// The `UpsertSupplierProfile` mutation requires an argument of type `UpsertSupplierProfileVariables`:
const upsertSupplierProfileVars: UpsertSupplierProfileVariables = {
  id: ..., // optional
  companyId: ..., 
  paymentTerms: ..., // optional
  defaultIncotermCode: ..., // optional
  namedPlace: ..., // optional
  standardLeadTimeDays: ..., // optional
  onboardingStatus: ..., // optional
};

// Call the `upsertSupplierProfileRef()` function to get a reference to the mutation.
const ref = upsertSupplierProfileRef(upsertSupplierProfileVars);
// Variables can be defined inline as well.
const ref = upsertSupplierProfileRef({ id: ..., companyId: ..., paymentTerms: ..., defaultIncotermCode: ..., namedPlace: ..., standardLeadTimeDays: ..., onboardingStatus: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = upsertSupplierProfileRef(dataConnect, upsertSupplierProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.supplierProfile_upsert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.supplierProfile_upsert);
});
```

