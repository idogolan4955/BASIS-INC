# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { acknowledgeAlert, createTask, completeTask, addNote, updateMyPreferences, recordEvent, resolveAlert, reopenTask, listCompanies, getCompany } from '@basis/dataconnect-platform';


// Operation AcknowledgeAlert:  For variables, look at type AcknowledgeAlertVars in ../index.d.ts
const { data } = await AcknowledgeAlert(dataConnect, acknowledgeAlertVars);

// Operation CreateTask:  For variables, look at type CreateTaskVars in ../index.d.ts
const { data } = await CreateTask(dataConnect, createTaskVars);

// Operation CompleteTask:  For variables, look at type CompleteTaskVars in ../index.d.ts
const { data } = await CompleteTask(dataConnect, completeTaskVars);

// Operation AddNote:  For variables, look at type AddNoteVars in ../index.d.ts
const { data } = await AddNote(dataConnect, addNoteVars);

// Operation UpdateMyPreferences:  For variables, look at type UpdateMyPreferencesVars in ../index.d.ts
const { data } = await UpdateMyPreferences(dataConnect, updateMyPreferencesVars);

// Operation RecordEvent:  For variables, look at type RecordEventVars in ../index.d.ts
const { data } = await RecordEvent(dataConnect, recordEventVars);

// Operation ResolveAlert:  For variables, look at type ResolveAlertVars in ../index.d.ts
const { data } = await ResolveAlert(dataConnect, resolveAlertVars);

// Operation ReopenTask:  For variables, look at type ReopenTaskVars in ../index.d.ts
const { data } = await ReopenTask(dataConnect, reopenTaskVars);

// Operation ListCompanies: 
const { data } = await ListCompanies(dataConnect);

// Operation GetCompany:  For variables, look at type GetCompanyVars in ../index.d.ts
const { data } = await GetCompany(dataConnect, getCompanyVars);


```