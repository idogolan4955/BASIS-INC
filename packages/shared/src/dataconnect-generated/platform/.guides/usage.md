# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { getMe, listUsers, listOpenAlerts, listMyTasks, listTimeline, listDocumentsFor, listCountries, listCurrencies, listUoms, listIncoterms } from '@basis/dataconnect-platform';


// Operation GetMe: 
const { data } = await GetMe(dataConnect);

// Operation ListUsers: 
const { data } = await ListUsers(dataConnect);

// Operation ListOpenAlerts: 
const { data } = await ListOpenAlerts(dataConnect);

// Operation ListMyTasks: 
const { data } = await ListMyTasks(dataConnect);

// Operation ListTimeline:  For variables, look at type ListTimelineVars in ../index.d.ts
const { data } = await ListTimeline(dataConnect, listTimelineVars);

// Operation ListDocumentsFor:  For variables, look at type ListDocumentsForVars in ../index.d.ts
const { data } = await ListDocumentsFor(dataConnect, listDocumentsForVars);

// Operation ListCountries: 
const { data } = await ListCountries(dataConnect);

// Operation ListCurrencies: 
const { data } = await ListCurrencies(dataConnect);

// Operation ListUoms: 
const { data } = await ListUoms(dataConnect);

// Operation ListIncoterms: 
const { data } = await ListIncoterms(dataConnect);


```