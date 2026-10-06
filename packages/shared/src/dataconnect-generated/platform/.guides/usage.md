# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listFamilies, listProducts, getProduct, listSkus, getSku, getSkuSourcing, listShades, listPutUps, upsertFamily, upsertProduct } from '@basis/dataconnect-platform';


// Operation ListFamilies: 
const { data } = await ListFamilies(dataConnect);

// Operation ListProducts: 
const { data } = await ListProducts(dataConnect);

// Operation GetProduct:  For variables, look at type GetProductVars in ../index.d.ts
const { data } = await GetProduct(dataConnect, getProductVars);

// Operation ListSkus: 
const { data } = await ListSkus(dataConnect);

// Operation GetSku:  For variables, look at type GetSkuVars in ../index.d.ts
const { data } = await GetSku(dataConnect, getSkuVars);

// Operation GetSkuSourcing:  For variables, look at type GetSkuSourcingVars in ../index.d.ts
const { data } = await GetSkuSourcing(dataConnect, getSkuSourcingVars);

// Operation ListShades: 
const { data } = await ListShades(dataConnect);

// Operation ListPutUps: 
const { data } = await ListPutUps(dataConnect);

// Operation UpsertFamily:  For variables, look at type UpsertFamilyVars in ../index.d.ts
const { data } = await UpsertFamily(dataConnect, upsertFamilyVars);

// Operation UpsertProduct:  For variables, look at type UpsertProductVars in ../index.d.ts
const { data } = await UpsertProduct(dataConnect, upsertProductVars);


```