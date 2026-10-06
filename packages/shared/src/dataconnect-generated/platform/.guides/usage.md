# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listPurchaseOrders, getPurchaseOrder, getPurchaseOrderCosts, listProductionRuns, getProductionRun, getLot, listProcessTemplates, acknowledgeAlert, createTask, completeTask } from '@basis/dataconnect-platform';


// Operation ListPurchaseOrders: 
const { data } = await ListPurchaseOrders(dataConnect);

// Operation GetPurchaseOrder:  For variables, look at type GetPurchaseOrderVars in ../index.d.ts
const { data } = await GetPurchaseOrder(dataConnect, getPurchaseOrderVars);

// Operation GetPurchaseOrderCosts:  For variables, look at type GetPurchaseOrderCostsVars in ../index.d.ts
const { data } = await GetPurchaseOrderCosts(dataConnect, getPurchaseOrderCostsVars);

// Operation ListProductionRuns: 
const { data } = await ListProductionRuns(dataConnect);

// Operation GetProductionRun:  For variables, look at type GetProductionRunVars in ../index.d.ts
const { data } = await GetProductionRun(dataConnect, getProductionRunVars);

// Operation GetLot:  For variables, look at type GetLotVars in ../index.d.ts
const { data } = await GetLot(dataConnect, getLotVars);

// Operation ListProcessTemplates: 
const { data } = await ListProcessTemplates(dataConnect);

// Operation AcknowledgeAlert:  For variables, look at type AcknowledgeAlertVars in ../index.d.ts
const { data } = await AcknowledgeAlert(dataConnect, acknowledgeAlertVars);

// Operation CreateTask:  For variables, look at type CreateTaskVars in ../index.d.ts
const { data } = await CreateTask(dataConnect, createTaskVars);

// Operation CompleteTask:  For variables, look at type CompleteTaskVars in ../index.d.ts
const { data } = await CompleteTask(dataConnect, completeTaskVars);


```