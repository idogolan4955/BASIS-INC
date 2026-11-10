# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listAssistantThreads, getAssistantThread, listPendingAssistantActions, archiveAssistantThread, listBoardNotes, insertBoardNote, editBoardNote, moveBoardNote, deleteOwnBoardNote, deleteBoardNote } from '@basis/dataconnect-platform';


// Operation ListAssistantThreads: 
const { data } = await ListAssistantThreads(dataConnect);

// Operation GetAssistantThread:  For variables, look at type GetAssistantThreadVars in ../index.d.ts
const { data } = await GetAssistantThread(dataConnect, getAssistantThreadVars);

// Operation ListPendingAssistantActions: 
const { data } = await ListPendingAssistantActions(dataConnect);

// Operation ArchiveAssistantThread:  For variables, look at type ArchiveAssistantThreadVars in ../index.d.ts
const { data } = await ArchiveAssistantThread(dataConnect, archiveAssistantThreadVars);

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

// Operation DeleteBoardNote:  For variables, look at type DeleteBoardNoteVars in ../index.d.ts
const { data } = await DeleteBoardNote(dataConnect, deleteBoardNoteVars);


```