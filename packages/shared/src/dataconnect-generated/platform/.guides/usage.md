# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getShipmentCosts, getAllocationRun, listLotCosts, listLotCostsFor, listFxRates, listStockLocations, listStockBalances, listStockMovements, listRecentMovements, listReceipts } from '@basis/dataconnect-platform';


// Operation GetShipmentCosts:  For variables, look at type GetShipmentCostsVars in ../index.d.ts
const { data } = await GetShipmentCosts(dataConnect, getShipmentCostsVars);

// Operation GetAllocationRun:  For variables, look at type GetAllocationRunVars in ../index.d.ts
const { data } = await GetAllocationRun(dataConnect, getAllocationRunVars);

// Operation ListLotCosts: 
const { data } = await ListLotCosts(dataConnect);

// Operation ListLotCostsFor:  For variables, look at type ListLotCostsForVars in ../index.d.ts
const { data } = await ListLotCostsFor(dataConnect, listLotCostsForVars);

// Operation ListFxRates: 
const { data } = await ListFxRates(dataConnect);

// Operation ListStockLocations: 
const { data } = await ListStockLocations(dataConnect);

// Operation ListStockBalances: 
const { data } = await ListStockBalances(dataConnect);

// Operation ListStockMovements:  For variables, look at type ListStockMovementsVars in ../index.d.ts
const { data } = await ListStockMovements(dataConnect, listStockMovementsVars);

// Operation ListRecentMovements:  For variables, look at type ListRecentMovementsVars in ../index.d.ts
const { data } = await ListRecentMovements(dataConnect, listRecentMovementsVars);

// Operation ListReceipts: 
const { data } = await ListReceipts(dataConnect);


```