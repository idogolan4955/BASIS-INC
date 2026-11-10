# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listQuotes, getQuote, listSalesOrders, getSalesOrder, stockForSku, listSalesOrdersFor, listProductCategories, listCollections, listBrandAssets, listDevelopmentProducts } from '@basis/dataconnect-platform';


// Operation ListQuotes: 
const { data } = await ListQuotes(dataConnect);

// Operation GetQuote:  For variables, look at type GetQuoteVars in ../index.d.ts
const { data } = await GetQuote(dataConnect, getQuoteVars);

// Operation ListSalesOrders: 
const { data } = await ListSalesOrders(dataConnect);

// Operation GetSalesOrder:  For variables, look at type GetSalesOrderVars in ../index.d.ts
const { data } = await GetSalesOrder(dataConnect, getSalesOrderVars);

// Operation StockForSku:  For variables, look at type StockForSkuVars in ../index.d.ts
const { data } = await StockForSku(dataConnect, stockForSkuVars);

// Operation ListSalesOrdersFor:  For variables, look at type ListSalesOrdersForVars in ../index.d.ts
const { data } = await ListSalesOrdersFor(dataConnect, listSalesOrdersForVars);

// Operation ListProductCategories: 
const { data } = await ListProductCategories(dataConnect);

// Operation ListCollections: 
const { data } = await ListCollections(dataConnect);

// Operation ListBrandAssets: 
const { data } = await ListBrandAssets(dataConnect);

// Operation ListDevelopmentProducts: 
const { data } = await ListDevelopmentProducts(dataConnect);


```