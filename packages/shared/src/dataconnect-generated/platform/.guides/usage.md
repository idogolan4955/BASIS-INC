# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listCompanies, getCompany, listFactories, insertCompany, updateCompany, archiveCompany, addCompanyRole, removeCompanyRole, insertContact, updateContact } from '@basis/dataconnect-platform';


// Operation ListCompanies: 
const { data } = await ListCompanies(dataConnect);

// Operation GetCompany:  For variables, look at type GetCompanyVars in ../index.d.ts
const { data } = await GetCompany(dataConnect, getCompanyVars);

// Operation ListFactories: 
const { data } = await ListFactories(dataConnect);

// Operation InsertCompany:  For variables, look at type InsertCompanyVars in ../index.d.ts
const { data } = await InsertCompany(dataConnect, insertCompanyVars);

// Operation UpdateCompany:  For variables, look at type UpdateCompanyVars in ../index.d.ts
const { data } = await UpdateCompany(dataConnect, updateCompanyVars);

// Operation ArchiveCompany:  For variables, look at type ArchiveCompanyVars in ../index.d.ts
const { data } = await ArchiveCompany(dataConnect, archiveCompanyVars);

// Operation AddCompanyRole:  For variables, look at type AddCompanyRoleVars in ../index.d.ts
const { data } = await AddCompanyRole(dataConnect, addCompanyRoleVars);

// Operation RemoveCompanyRole:  For variables, look at type RemoveCompanyRoleVars in ../index.d.ts
const { data } = await RemoveCompanyRole(dataConnect, removeCompanyRoleVars);

// Operation InsertContact:  For variables, look at type InsertContactVars in ../index.d.ts
const { data } = await InsertContact(dataConnect, insertContactVars);

// Operation UpdateContact:  For variables, look at type UpdateContactVars in ../index.d.ts
const { data } = await UpdateContact(dataConnect, updateContactVars);


```