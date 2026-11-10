# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listBoardNotes, insertBoardNote, editBoardNote, moveBoardNote, deleteOwnBoardNote, deleteBoardNote, listGoals, listFamilies, listProducts, getProduct } from '@basis/dataconnect-platform';


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

// Operation ListGoals: 
const { data } = await ListGoals(dataConnect);

// Operation ListFamilies: 
const { data } = await ListFamilies(dataConnect);

// Operation ListProducts: 
const { data } = await ListProducts(dataConnect);

// Operation GetProduct:  For variables, look at type GetProductVars in ../index.d.ts
const { data } = await GetProduct(dataConnect, getProductVars);


```