# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listShipments, getShipment, listShippableUnits, listLocations, listDocumentRequirements, listBoardNotes, insertBoardNote, editBoardNote, moveBoardNote, deleteOwnBoardNote } from '@basis/dataconnect-platform';


// Operation ListShipments: 
const { data } = await ListShipments(dataConnect);

// Operation GetShipment:  For variables, look at type GetShipmentVars in ../index.d.ts
const { data } = await GetShipment(dataConnect, getShipmentVars);

// Operation ListShippableUnits: 
const { data } = await ListShippableUnits(dataConnect);

// Operation ListLocations: 
const { data } = await ListLocations(dataConnect);

// Operation ListDocumentRequirements: 
const { data } = await ListDocumentRequirements(dataConnect);

// Operation ListBoardNotes: 
const { data } = await ListBoardNotes(dataConnect);

// Operation InsertBoardNote:  For variables, look at type InsertBoardNoteVars in ../index.d.ts
const { data } = await InsertBoardNote(dataConnect, insertBoardNoteVars);

// Operation EditBoardNote:  For variables, look at type EditBoardNoteVars in ../index.d.ts
const { data } = await EditBoardNote(dataConnect, editBoardNoteVars);

// Operation MoveBoardNote:  For variables, look at type MoveBoardNoteVars in ../index.d.ts
const { data } = await MoveBoardNote(dataConnect, moveBoardNoteVars);

// Operation DeleteOwnBoardNote:  For variables, look at type DeleteOwnBoardNoteVars in ../index.d.ts
const { data } = await DeleteOwnBoardNote(dataConnect, deleteOwnBoardNoteVars);


```