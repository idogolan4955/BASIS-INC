# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listInspections, listInspectionsFor, getInspection, listInspectionTemplates, listCorrectiveActions, getMe, listUsers, listOpenAlerts, listMyTasks, listTimeline } from '@basis/dataconnect-platform';


// Operation ListInspections: 
const { data } = await ListInspections(dataConnect);

// Operation ListInspectionsFor:  For variables, look at type ListInspectionsForVars in ../index.d.ts
const { data } = await ListInspectionsFor(dataConnect, listInspectionsForVars);

// Operation GetInspection:  For variables, look at type GetInspectionVars in ../index.d.ts
const { data } = await GetInspection(dataConnect, getInspectionVars);

// Operation ListInspectionTemplates: 
const { data } = await ListInspectionTemplates(dataConnect);

// Operation ListCorrectiveActions: 
const { data } = await ListCorrectiveActions(dataConnect);

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


```