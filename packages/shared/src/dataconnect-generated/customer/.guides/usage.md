# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { customerMe, customerQuotes, customerQuote, customerOrders, customerOrder, customerShipments, customerShipment, customerShipmentLines, customerInvoices, customerSampleRequests } from '@basis/dataconnect-customer';


// Operation CustomerMe: 
const { data } = await CustomerMe(dataConnect);

// Operation CustomerQuotes: 
const { data } = await CustomerQuotes(dataConnect);

// Operation CustomerQuote:  For variables, look at type CustomerQuoteVars in ../index.d.ts
const { data } = await CustomerQuote(dataConnect, customerQuoteVars);

// Operation CustomerOrders: 
const { data } = await CustomerOrders(dataConnect);

// Operation CustomerOrder:  For variables, look at type CustomerOrderVars in ../index.d.ts
const { data } = await CustomerOrder(dataConnect, customerOrderVars);

// Operation CustomerShipments: 
const { data } = await CustomerShipments(dataConnect);

// Operation CustomerShipment:  For variables, look at type CustomerShipmentVars in ../index.d.ts
const { data } = await CustomerShipment(dataConnect, customerShipmentVars);

// Operation CustomerShipmentLines:  For variables, look at type CustomerShipmentLinesVars in ../index.d.ts
const { data } = await CustomerShipmentLines(dataConnect, customerShipmentLinesVars);

// Operation CustomerInvoices: 
const { data } = await CustomerInvoices(dataConnect);

// Operation CustomerSampleRequests: 
const { data } = await CustomerSampleRequests(dataConnect);


```