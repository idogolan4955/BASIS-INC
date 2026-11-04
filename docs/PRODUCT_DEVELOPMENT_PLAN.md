# Product Development — the brand and consumer-products department

How the new department (brand, apparel, fragrance and home scent, bags, shoes, accessories) sits inside the existing platform. Written before the build, from the owner's brief of 2026-10-31. The brief in one line: take a product from an idea to something ready to make and sell, under the BASIS brand, and hand it to the existing machinery (items, purchasing, stock, sales) without retyping.

This document decides entities, screens, relationships and permissions. The build follows it in slices (§8). What is already in the system is reused, never duplicated.

---

## 1. What the system already has, and what the department reuses

| Need in the brief | Already in the platform | Reused as |
|---|---|---|
| Suppliers, factories, ODM partners | `Company` with roles, `Factory`, `Contact`, `Location`, `SupplierProfile` (module 03) | The same companies. A new company role `odm` joins `supplier`, `forwarder`, `customer`. No second supplier table |
| Files, images, versions | `Document` + `DocumentLink` (any record, a `role` per link), Storage, filing of generated PDFs | Every image, render, tech pack, quotation and sample photo is a `Document` linked to the development record with a role (`inspiration`, `proposal`, `sample`, `approved`, `tech_pack`, `quotation`) |
| Tasks, owners, due dates | `Task` (assignee, due, entity link), module 01 Operations | Tasks attached to a development product; the department board shows the ones due |
| Decisions and history | `TimelineEvent` (append-only, actor, note, payload), `AuditEvent` | Every stage change, approval and decision is a timeline event; nothing is hand-edited after the fact |
| Permissions | Roles in the Auth claim, `MODULE_ACCESS`, `@auth` on every connector operation, `requireRole` in functions | A new module key with its own row in the access table; cost rules stay data rules |
| Money and currencies | Fixed-point money, `FxRate`, the costing module | Estimates, quotes and approved costs in their own currency, carried to the base currency through the same rates |
| The brand | `docs/brand/`, the palette (`brand-palette.ts`), the Shade System, the design system | Becomes live data in the Brand Centre instead of files in the repository |
| Commercial products | `FabricFamily → Product → Variant → Shade → SKU`, `SupplierItem`, `SupplierPrice`, stock, orders | The handover target: an approved development product becomes a catalog product with SKUs and supplier items, by a function, not by retyping |

What does **not** exist and is built here: the Brand Centre, product categories and collections outside fabrics, the development dossier, the stage gate with approvals, supplier comparison per development product, estimate-versus-quote costing, the handover, and the department's board.

## 2. Boundaries

- A development product is **not** a catalog product. It lives in its own tables until approved for production. The catalog stays the source for what is sold.
- The handover **creates** catalog records from the dossier (product, variants, SKUs, supplier items, first prices) and keeps a pointer back. After handover the dossier is read-only history; changes happen on the catalog record.
- Fabrics stay a product domain of their own (families `MSH`, `LIN`, `TUL`). The new categories sit beside them, not under them. The Shade System is shared: a garment's colourway may reference a BASIS shade, or define a colour of its own.
- Costs follow the existing rule: purchase costs, quotations and supplier identity are visible to the cost roles only. The department's own roles (below) are cost roles for development costs, not for fabric purchase costs unless they already hold them.

## 3. Data model

Schema file `dataconnect/schema/development.gql`. Only `CREATE` and `ADD COLUMN`, as always. Money `Int64` ten-thousandths; quantities `Int64` thousandths.

### 3.1 Brand Centre

```
BrandAsset @table
  kind: BrandAssetKind!     # story | logo | typeface | colour | material | imagery | guideline | approved_design | inspiration
  title, summary (text)
  document: Document        # the file, when there is one
  colourHex, colourName, paletteNumber   # for colour assets, tied to the 24-tone palette by number
  tags: Any                 # ["fragrance", "fw27"] free tags, filtered in the interface
  collection: Collection    # when the asset belongs to one collection
  status: approved | draft | retired
  sort: Int!
  createdBy, createdAt, updatedAt
```

One table with a kind, not one table per kind: the brief asks for flexibility, and the Brand Centre is a library, not a workflow. The brand story is a `story` asset whose body is text; the palette is `colour` assets seeded from `brand-palette.ts` so the numbers the owner already uses (01 milk … 24 line-strong) carry over.

### 3.2 Categories and collections

```
ProductCategory @table(key: "code")
  code: varchar(16)          # APP, FRG, HOM, BAG, SHO, ACC, …
  name, slug, description
  parent: ProductCategory    # one level of nesting is enough: Apparel › Knitwear
  specSchema: Any            # the fields a product of this category carries, like FabricFamily.specSchema today
  sort, status

Collection @table(key: "code")
  code: varchar(16)          # FW27, BRIDAL-CORE, HOME-01
  name, season, year, theme (text)
  targetLaunch: Date
  status: planning | in_development | launched | archived
  moodDocument: Document
```

A category defines **which specification fields** its products carry (`specSchema`, the same pattern the fabric families use: key, label, kind, unit, options). Adding a product domain is adding a category row with its schema, not a code change. A collection groups products across categories for a season.

### 3.3 The development dossier

```
DevelopmentProduct @table
  number: varchar(16) @unique      # DEV-26-0001, from the number sequence
  category: ProductCategory!
  collection: Collection
  name, workingTitle, description, intent (text)
  stage: DevelopmentStage!         # §4
  owner: User                      # the person responsible
  priority: low | normal | high
  targetLaunch: Date
  budgetAmount, budgetCurrency     # planned development budget
  specs: Any                       # values for the category's specSchema
  catalogProduct: Product          # set by the handover; null while in development
  handedOverAt: Timestamp
  createdBy, createdAt, updatedAt, archivedAt

DevelopmentMaterial @table          # what it is made of
  product: DevelopmentProduct!
  role: varchar(40)                # shell, lining, trim, hardware, bottle, cap, box, …
  name, specification (text)
  sku: Sku                         # when the material is one of our own fabrics
  supplier: Company                # when a supplier is known
  status: proposed | sampled | approved | rejected
  notes

DevelopmentVariant @table           # the colourways / sizes / volumes the product comes in
  product: DevelopmentProduct!
  code: varchar(16)                # 01, 02 … or S, M, L, or 50ML
  name
  shade: Shade                     # when a BASIS shade is used
  colourHex, colourName            # when the colour is the product's own
  sizeLabel, dimensions: Any       # free dimensions, by category
  status: proposed | sampled | approved | dropped
  sort

DevelopmentPackaging @table
  product: DevelopmentProduct!
  component: varchar(60)           # box, pouch, hangtag, label, insert, carton
  specification (text), material, dimensions: Any
  supplier: Company
  status: proposed | sampled | approved

DevelopmentSample @table            # a physical round
  product: DevelopmentProduct!
  round: Int!                      # 1, 2, 3 …
  kind: proto | fit | pre_production | shipment
  supplier: Company, factory: Factory
  requestedOn, receivedOn: Date
  verdict: pending | approved | revise | rejected
  verdictBy: User, verdictOn: Date
  findings (text)                  # what to change
  costAmount, costCurrency         # what the sample cost
  photosRole = documents linked with role "sample" and payload { round }
```

Files: a `DocumentLink` with `entityType: "development_product"` and a `role` from the fixed list **`inspiration` · `proposal` · `sample` · `approved` · `tech_pack` · `quotation` · `other`**. The dossier's Files tab groups by role, so inspiration never sits next to an approved design without a label. Versions: a document uploaded again with the same title and role is a new `Document` with `payload.version = n+1`; the interface shows the latest and the history.

### 3.4 Workflow, approvals and decisions

```
DevelopmentApproval @table          # a gate passed or refused
  product: DevelopmentProduct!
  gate: DevelopmentStage!          # the stage being entered
  decision: approved | returned | rejected
  decidedBy: User!, decidedAt
  note (text)
```

The stage itself lives on the product (§4). Every change writes a `TimelineEvent` (`kind: stage_changed | approval | decision | note`) with the actor and a payload; a decision that is not a gate (for example "we drop the leather version") is a timeline event of kind `decision`, written from the dossier's Decisions tab. Tasks are the existing `Task` with `entityType: "development_product"`.

### 3.5 Suppliers and production

```
DevelopmentSourcing @table          # one candidate supplier for one product
  product: DevelopmentProduct!
  supplier: Company!
  factory: Factory
  kind: odm | oem | component | packaging
  status: candidate | quoted | sampled | selected | dropped
  moq: Int64, leadTimeDays, sampleLeadDays
  unitCost, unitCurrency           # the quoted unit cost at the MOQ
  sampleCost, developmentCost (money), toolingCost
  paymentTerms, incoterm, namedPlace
  quotationDocument: Document      # the quotation on file
  quotedOn, validUntil
  notes
  isSelected: Boolean!             # one per product at most, set by `selectSourcing`
```

Comparison is a view over the sourcing rows of one product: unit cost at MOQ, MOQ, lead time, sample cost, terms, side by side, in the base currency through `FxRate`. Selecting one marks it and the rest stay as history. Quotation documents link here as well as to the product.

### 3.6 Pricing and viability

```
DevelopmentCosting @table           # one costing per product per basis
  product: DevelopmentProduct!
  basis: estimate | quotation | approved
  currency
  unitCost, packagingCost, freightCost, dutyCost, otherCost   # per unit, money
  quantity: Int64                  # the quantity the costing assumes
  plannedPrice                     # per unit, money, the selling price
  wholesalePrice                   # optional
  source: DevelopmentSourcing      # the quotation it rests on, when basis = quotation
  notes, createdBy, createdAt
```

Derived, never stored: landed unit cost = sum of the cost columns; gross margin and margin percent per basis; the three bases side by side, so the owner reads "estimate 38 %, quotation 31 %, approved 33 %". Budget versus actual on the product = `budgetAmount` against the sum of `DevelopmentSample.cost` + `DevelopmentSourcing.developmentCost + toolingCost` where paid. Currencies convert through `FxRate` to the base currency for totals; each row keeps its own currency.

### 3.7 The handover

A function `handOverProduct(number)`, allowed from stage `approved_for_production`:

1. Creates a `ProductCategory`-aware catalog `Product` (family becomes category for non-fabric products: a nullable `Product.category` column is added; `family` stays required for fabrics). The slug, name, description and specs come from the dossier.
2. One `ProductVariant` per approved `DevelopmentVariant`; one `Sku` per variant (put-up: a new unit put-up `EA` for pieces, metres stay for fabrics).
3. A `SupplierItem` + `SupplierPrice` from the selected `DevelopmentSourcing`.
4. First selling price into the default price list from the approved costing's `plannedPrice`, when one exists.
5. Sets `catalogProduct` and `handedOverAt`, moves the stage to `commercial`, writes the timeline on both records.

Nothing is created twice: a second call refuses once `catalogProduct` is set. The product starts `development` in the catalog, not public, no stock. Opening stock, orders and purchase orders happen in their own modules on the new SKUs.

## 4. The stage gate

```
idea → concept → feasibility → sampling → revision → approved_for_production → commercial
                                                  ↘ on_hold / dropped (from any open stage)
```

| Stage | Enter when | Gate (who approves) |
|---|---|---|
| `idea` | created | none |
| `concept` | description, category, at least one inspiration or proposal file | product owner |
| `feasibility` | at least one sourcing candidate | product owner |
| `sampling` | a selected sourcing or a sample round requested | owner of the department or the platform owner |
| `revision` | a sample round came back `revise` | automatic from the verdict |
| `approved_for_production` | a sample round `approved`, a selected sourcing, a costing on basis `quotation` or `approved` | the platform owner (`owner` role) |
| `commercial` | handover done | by the function |

Each entry condition is checked in the function (`transitionDevelopment`), not in the form. Health is derived: a product with no timeline event for 21 days is **quiet**; one past `targetLaunch` and not commercial is **late**; one in `sampling` whose latest round has no verdict after its received date + 7 days is **awaiting verdict**.

## 5. Screens

New module **18 Development** in the rail, group *Brand* (with a future 19 Brand site content). Paths under `/development`.

| Path | Screen | What is on it |
|---|---|---|
| `/development` | **Department board** | The pipeline as stage columns (counts, products), approvals waiting for the signed-in person, tasks due this week, samples awaiting verdict, budget planned versus spent (base currency), launches by month |
| `/development/products` | Products ledger | Every development product: number, name, category, collection, stage, health, owner, target launch, selected supplier; filters by category, collection, stage, owner |
| `/development/products/:number` | **Dossier** | Label header (number, name, stage, health, owner). Tabs: Overview (description, intent, specs by category schema, variants, materials, packaging) · Files (by role, with versions) · Samples (rounds with photos, verdicts, findings) · Sourcing (candidates side by side, select one, quotations) · Costing (estimate / quotation / approved, margin, budget versus spent) · Tasks · Decisions (timeline, add a decision) · Approvals (gates passed, request the next) |
| `/development/brand` | **Brand Centre** | Story · palette (the 24 tones, numbered) · logos and typefaces · materials · imagery · guidelines · approved designs · inspiration; filters by tag and collection; upload with a kind |
| `/development/collections` | Collections | Ledger and a sheet per collection: theme, mood board (documents), target launch, its products by stage |
| `/development/categories` | Categories | The tree, each with its specification schema; add a category or a field without a release |
| `/development/suppliers` | Sourcing overview | Every candidate supplier across products, for the purchasing roles: who quoted what, MOQs, lead times; opens the company sheet (module 03) |

The company sheet (03 Suppliers) gains a tab **Development** listing the development products the company is a candidate or the selected supplier for. The catalog product sheet shows "Developed as DEV-26-0007" when it came from a dossier.

Design: the same system. The dossier is a sheet like the purchase order; the board uses the figure and lane patterns of the Gateway; the Brand Centre's palette is the numbered colour card already used on documents. Images use the documents panel; a gallery of linked images by role is the one new component. Hebrew and right-to-left from the first screen.

## 6. Permissions

Two new roles are **not** added yet. The brief's department maps onto the existing roles with a new module row; a dedicated `design` role can be added later with one line in the access table if the team grows.

| Module 18 Development | owner | operations | purchasing | qc | logistics | sales | marketing | finance | viewer |
|---|---|---|---|---|---|---|---|---|---|
| Brand Centre | manage | read | read | read | – | read | **manage** | read | read |
| Products, dossier, files, samples, decisions | manage | manage | limited (sourcing, samples) | limited (sample verdicts) | – | read | manage | read | read |
| Sourcing and quotations (supplier identity, costs) | manage | manage | manage | – | – | – | – | read | – |
| Costing and viability | manage | manage | read | – | – | – | – | manage | – |
| Approvals: gate to `approved_for_production` | manage | – | – | – | – | – | – | – | – |
| Handover | manage | manage | – | – | – | – | – | – | – |

Enforced as today: `@auth` expressions on each connector operation (sourcing and costing queries only answer the cost roles), `requireRole` in each function, the access table for navigation. Development costs are a data rule, not a hidden column.

## 7. Flexibility that is built in

- A new product domain = a `ProductCategory` row with its `specSchema`. No schema change.
- A new file kind = a role string on `DocumentLink`; the fixed list is in `@basis/shared` and grows there.
- A new gate = a stage in the enum plus its entry condition in one function; the board and the ledger read the enum.
- A new supplier kind (component, packaging) = a `DevelopmentSourcing.kind`.
- Partial data is fine everywhere: only the number, name, category and stage are required; every other field, material, variant, sample and cost arrives when it is known. Health and the board tell what is missing for the next gate.

## 8. Slices

1. **Structure.** Schema (§3.1–3.6), connector, functions (`createDevelopmentProduct`, `updateDevelopmentProduct`, `transitionDevelopment`, `recordApproval`, `saveMaterial/Variant/Packaging`, `requestSample`, `recordSampleVerdict`, `saveSourcing`, `selectSourcing`, `saveCosting`), module 18 with the board, the ledger, the dossier (all tabs), categories, collections, sample data, Hebrew. The Brand Centre with upload by kind and the palette seeded. The team can start entering products, materials and suppliers at the end of this slice.
2. **Handover.** `handOverProduct`, the catalog `category` column and the `EA` put-up, the pointers on both sheets, alerts (`development.quiet`, `development.late`, `development.awaiting_verdict`, `development.approval_waiting`).
3. **Depth.** Supplier comparison in the base currency through FX, budget versus spent on the board, the company sheet's Development tab, exports, the development product's own PDF (tech pack from the dossier).
4. **The brand site.** A page of its own on the public site for the brand's signature products (owner, 2026-11-04): the consumer products that reached `commercial` and are published, by category and collection, with the brand story from the Brand Centre, imagery from the dossier's approved files and the shade or colourway of each. Read through the public connector from the catalog, like the fabric pages; a product appears there only once it is public. Route proposed: `/collection` (with `/collection/[category]/[product]`), beside `/fabrics`.

Slice 1 is the one the brief asks for first. It is one large slice or two medium ones (dossier first, Brand Centre and collections second); the second order is recommended so products can be entered within the first delivery.

## 9. Open questions for the owner

1. **Category codes and the first collection.** Proposed: `APP` Apparel, `FRG` Fragrance, `HOM` Home scent, `BAG` Bags, `SHO` Shoes, `ACC` Accessories; first collection `FW27`. Confirm or rename.
2. **Who approves production.** Proposed: the platform owner only. If a head of development is appointed, a `design` role is one line.
3. **Base currency for viability.** USD as elsewhere, or EUR for consumer products sold in Europe.
4. **Numbering.** `DEV-26-0001` with the existing sequence, or per category (`APP-26-0001`). Proposed: one sequence, the category is a field.
5. **Sizes.** Apparel sizes as variants (S, M, L) multiply SKUs at handover; alternatively one SKU per colourway with size as a put-up. Proposed: size as a variant dimension recorded on `DevelopmentVariant.dimensions`, SKU grammar decided at handover per category.
6. **The signature-products page.** Which products it shows: the new consumer line only (apparel, fragrance, bags…), or also the fabrics the brand is known for (Powermesh, Shanel Lining)? Proposed: the consumer line, with a line of the signature fabrics linking into `/fabrics`.
