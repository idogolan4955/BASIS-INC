# BASIS INC. — Implementation Plan

Status: v0.1 · 2026-10-06 · Phase 0 foundation document
Related: [PRODUCT_BLUEPRINT](PRODUCT_BLUEPRINT.md) · [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md) · [DOMAIN_MODEL](DOMAIN_MODEL.md) · [INFORMATION_ARCHITECTURE](INFORMATION_ARCHITECTURE.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md) · [ROUTE_MAP](ROUTE_MAP.md)

---

## 1. Starting position

- The repository is empty. This is a greenfield build; there is no existing code to migrate, preserve or refactor.
- Phase 0 (this document set) defines the product, architecture, domain, navigation, design direction and routes.
- No visual redesign or feature build begins until Phase 0 is accepted and the blocking decisions in §6 are answered.

## 2. How the work is organised

Two tracks run in parallel after a shared foundation:

- **Track P — Platform**: Gateway, Operations, Logistics, Growth.
- **Track B — Brand**: the public website.

They share Phase 1 (foundation) and Phase 2 (catalog), because the site publishes from the catalog and the platform is built from the same design tokens.

```
Phase 0  Foundation documents ───────────────────────────────────────────── (done)
Phase 1  Repository, tokens, data foundation, auth, app shells
Phase 2  Master data: parties, catalog, shade system, documents
             │
             ├── Track P ─► P3 Gateway v1 ─► P4 Sourcing & manufacturing ─► P5 Quality
             │              ─► P6 Logistics & landed cost ─► P7 Inventory ─► P8 Orders & CRM
             │              ─► P9 Marketing, analytics, integrations
             │
             └── Track B ─► B3 Brand design ─► B4 Site build ─► B5 Launch
                                                    ▲
                                    needs: published catalog (Phase 2) · intake → leads (P8-lite)
```

Sizes are relative (S / M / L / XL), not calendar estimates; durations depend on team size and on how quickly content and decisions arrive.

## 3. Shared phases

### Phase 1 — Foundation (L)

Goal: a running, deployable skeleton in which every later feature has an obvious place.

| Deliverable | Detail |
|---|---|
| Repository | Git on `main` with a GitHub remote; pnpm workspace (`apps/*`, `packages/*`, `functions`); TypeScript strict; ESLint; agent instructions (`CLAUDE.md`) carrying the working chain and the rules |
| Firebase project | Project on the Blaze plan; two Hosting sites (`web`, `platform`); Auth; Storage; Data Connect service with its Cloud SQL instance; `firebase.json`, `.firebaserc`, emulators |
| Packages | `@basis/shared` (domain code + generated SDKs) and `@basis/ui` (design system) |
| Data foundation | `dataconnect/schema/foundation.gql`: users, permission matrix, reference data, number sequences, documents, timeline, alerts, audit, domain events. `platform` and `public` connectors. Reference-data seed (countries, currencies, units, Incoterms) |
| Value types | Fixed-point money, quantity + unit, local date, business numbers — implemented and unit-tested in `@basis/shared` |
| Functions plumbing | Region, error taxonomy, role guard, audit helper, function-name registry; invite-user function; event sweep skeleton |
| Authentication | Firebase Auth, invitation only; role in custom claim; route guard; `storage.rules` deny by default |
| Design tokens | Primitives, semantic tokens, both registers, motion tokens; Tailwind preset; automated contrast test |
| UI primitives | Button, input, select, dialog, menu, tabs, table shell, status chip, label header — operational register first |
| App shells | `apps/platform` with masthead, index rail, empty Gateway; `apps/web` with editorial layout and a prerendered holding page |
| Delivery | The working chain exercised end to end: typecheck → build → `firebase deploy` → commit → push. Emulator development loop with seed data |
| Verification | Reachability from mainland China, tested with a real factory-side user |

Exit: a signed-in manager sees an empty Gateway in production; a schema migration, a transactional command, a role check and an audit record work end to end; tokens render both registers.

Depends on: F1 and F2 (§6) for the first deploy and push. Local work on the emulators is not blocked.

#### Phase 1 progress (2026-10-06)

| Done | Remaining |
|---|---|
| Git repository, pnpm workspace, TypeScript strict, ESLint with dependency-boundary rules | Push to GitHub (the owner runs it) |
| Firebase project `basis-inc`, Hosting sites and targets, web app registration | Blaze plan; Email/Password sign-in enabled in the console; Data Connect service and Cloud SQL on first deploy |
| `@basis/shared`: fixed-point money and quantity, local dates, business numbers, roles and module access, entity map, error taxonomy, Gateway read models. 25 tests | |
| `dataconnect/`: foundation schema (identity, permission matrix, reference data, legal entities, number sequences, documents, timeline, tasks, alerts, audit, outbox); `platform` and `public` connectors; SDKs generated; emulator seed with a test owner and reference data | Module schemas, one file per module, as each phase lands |
| `functions/`: `api` (health), `inviteUser`, `setUserRole` with audit and outbox records, `sweepEvents` skeleton; bundled with the shared domain code; exercised against the emulators | First deploy (needs Blaze); email delivery of invitations |
| `@basis/ui`: tokens with contrast tests, typefaces, status chip, panel, figure tile, charts, timeline, ledger, fabric structure drawings | Buttons, inputs, select, dialog, menu, tabs, label header as reusable components (the sign-in form has the first field and button styles) |
| `apps/platform`: Firebase Auth sign-in with role from the custom claim, no-role and loading states, sign-out; shell, command palette, phone layout; Gateway reads open alerts live and shows true empty states elsewhere; full sample mode for design review | Live figures and panels as their modules land |
| `apps/web`: holding page prerendered to static HTML | Brand design (B3) and site build (B4) |

Local workflow: `pnpm emulators` (Auth, Data Connect, Functions), `pnpm seed:emulator`, then `pnpm dev:platform` for the live interface or `pnpm --filter @basis/platform dev:sample` for sample records.

### Phase 2 — Master data and catalog (L)

Goal: the things everything else refers to.

| Deliverable | Detail |
|---|---|
| Parties & places | Companies with roles, contacts, locations, factories |
| Catalog | Fabric families (with family specification schemas), products, variants, put-ups, SKUs; SKU code generation |
| Shade System | Collections, shades, reference values, shade standards |
| Sourcing links | Supplier items and tiered purchase prices (cost-permission enforced in queries) |
| Documents | Upload, typed documents, links to any entity, signed access |
| Timeline & notes | Shared timeline component and events on all master records |
| Module UI | 02 Products and the party parts of 03 Suppliers: ledgers, sheets, forms; global search and command palette over these records |
| Data entry | Import path (CSV) for initial catalog and supplier data; the three launch families entered as data |

Exit: the five launch products exist as real catalog data down to SKU, with shades, specifications, supplier mappings and documents. No business data lives in component code.

#### Phase 2 progress (2026-10-06)

| Done | Remaining |
|---|---|
| Schema: `parties.gql` (companies with roles, supplier terms, contacts, locations, factories, certifications) and `catalog.gql` (families with specification schemas, products, variants, shade collections and shades, shade standards, put-ups, SKUs, supplier items and tiered purchase prices, price lists) | Media assets; CSV import |
| Connector operations for reading and changing the catalog and the party register; purchase prices and supplier identity in cost-only operations; one `RecordEvent` operation for every record's timeline | Price-list mutations |
| The launch range as data (`packages/shared/src/launch-catalog.json`): three families, five products, six shades, the 160 cm × 50 m put-up, 30 SKUs that start in development; seeded into the emulator | First production seed (after Blaze) |
| Screens: Products (families, ledger, new product), product sheet with edit (details and family specification), new variant, new SKUs across chosen shades, SKU status and publishing per row, shade availability, shade standards with recording, and the record's timeline with notes; SKU ledger and sheet with cost-gated sourcing and adding a source with its first price tier; Shade System; Suppliers and Customers through one register with the company sheet (edit, contacts with new contact, factories and locations, timeline) | Edit variant and SKU details; price lists; certifications |
| Command palette reaches products, SKUs and companies | Global search over document numbers and references |
| Form primitives: button, text, select, textarea, checkbox, dialog; label header, sheet tabs, empty state, shade circle, timeline | Menu, tabs as components, table virtualisation |
| Every change is verified live against the emulators: variant and SKUs created, status changed, note recorded, company created and edited | |
| | Documents: upload through Storage, links on records, signed access (the Storage emulator needs Java on this machine) |

## 4. Track P — Platform

### P3 — Gateway v1 (M)

- Alert engine: rule interface, scheduled and event-driven evaluation, alert lifecycle.
- Gateway zones built against real data available so far (catalog completeness, expiring documents, tasks); remaining zones show their true empty state and fill as modules land.
- Tasks; role-filtered Gateway.

Exit: the Gateway is the real landing screen, entirely derived, with at least the first alert rules live.
Depends on: Phase 2.

#### Phase 3 progress (2026-10-06)

| Done | Remaining |
|---|---|
| Alert engine in `functions/src/alerts.ts`: a rule is a pure function from facts to findings; the engine raises, refreshes, revives and resolves alerts by dedupe key. Seven rules live: product without SKUs, published product without an active SKU, active SKU not published, variant specification incomplete, document expiring or expired, task overdue, supplier without a contact | Rules for production, QC, logistics and stock arrive with those modules |
| Evaluation runs in the scheduled sweep and on demand through `evaluateAlerts` (owner and operations), with a Run checks action on the Gateway | Event-driven evaluation narrowed to the rules an event touches |
| Alert lifecycle on the Gateway: acknowledge, dismiss; acknowledged items sink and fade | |
| Tasks: open-task ledger at `/operations/tasks`, new task from the Gateway or the ledger, assignee from the staff directory, mark done; tasks due within a week join the attention ledger and the overdue rule raises what is late | Tasks created from a record's sheet |
| Gateway live: attention from alerts and tasks; figures and panels show their true empty state until their modules land. Verified against the emulators: 12 alerts raised from the seeded catalog, idempotent on re-run, acknowledgement and a task recorded | |


### P4 — Sourcing and manufacturing (XL)

- RFQs and quotations; supplier terms; certifications.
- Purchase orders: creation flow, issue, confirm, PDF, payment milestones.
- Process templates; production runs; milestone timeline with planned / forecast / actual, dependencies and gates; derived run health.
- Lots and rolls; packing into handling units; "available to ship" quantity.
- Module 04 Manufacturing and 01 Operations (pipeline, calendar).
- Alert rules: milestone overdue, run at risk, payment due.

Exit: a real purchase order can be followed from issue to packed, released-pending-QC lots; delays appear on the Gateway without anyone setting a status.
Depends on: Phase 2, P3.

#### Phase 4 progress (2026-10-06)

| Done | Remaining |
|---|---|
| Schema and connector for purchasing and manufacturing (`dataconnect/schema/manufacturing.gql`): purchase orders with lines, tolerances and payment milestones; process templates with steps, dependencies and gates; production runs with lines, milestones and lots. Prices and payments are read only through cost-role operations | RFQs and quotations; supplier terms; PO PDF |
| Rules in `packages/shared/src/manufacturing.ts` with tests: milestones planned from a template by dependency; run health, forecast end, progress and state derived from the milestones; a slip on one step pushes every open step that depends on it | Lots and rolls, packing, "available to ship" |
| Functions: `createPurchaseOrder`, `issuePurchaseOrder`, `confirmPurchaseOrder`, `cancelPurchaseOrder`, `createProductionRun`, `updateMilestone`; numbers from the sequence, deposit and balance milestones from the deposit share, the deposit falling due on issue, every change in the timeline. Inspection gates close only by QC or the owner | Operations pipeline and calendar |
| Alert rules: milestone overdue, run at risk or delayed, payment due | Event-driven re-evaluation |
| Module 04 Manufacturing: purchase-order ledger, order sheet (lines, production, payments for cost roles, timeline) with issue / confirm / cancel / open-run actions, new-order dialog; run ledger; run sheet with the milestone track, milestone update dialog, lines and lots; process-template ledger. The Gateway's production figure and timeline read the real runs | Gateway production figure counts runs on schedule only once lots and shipments report |
| Verified against the emulators: PO-26-0001 created, issued (deposit due the same day), confirmed; RUN-26-0001 planned from the Warp-knit mesh template; a dye slip recorded with `updateMilestone` propagated to finishing, inspection and packing, turned the run `delayed`, and `evaluateAlerts` raised the run and the deposit | |

#### Phase 4 progress, second slice (2026-10-06)

| Done | Remaining |
|---|---|
| Lots, rolls and handling units in the schema: a lot is recorded on a run with its rolls (measured length, usable width, weight, grade, defect points); a carton or pallet holds rolls, or a quantity of a lot that is not tracked by roll, and nests in a parent. `recordLot` also moves the run line's produced quantity; `packHandlingUnit` refuses a roll that is already packed and starts the run's packing step on the first carton | Roll labels and the packing list as PDF; pallets built from cartons in the interface (the function already takes a parent) |
| "Ready to ship" is a quantity: `availableToShip` in `packages/shared` adds up what is released by quality and already packed; the run sheet and the lot sheet show it, never a label. Lot quality is set by QC or the owner through `setLotQuality` with the finding recorded; the inspection module will drive the same transition from dispositions | Inspections (P5) replacing the manual quality record |
| Interface: Lots and Packing tabs on the run sheet with the record-lot dialog (count and nominal length, or measured lengths pasted from the winder) and the pack dialog (rolls chosen from the lot, carton dimensions from the put-up, marks, weights, CBM derived); a lot sheet at `/inventory/lots/[lot]` with its rolls and where each is packed, the quality record and its timeline | Inventory module proper: stock by SKU, locations, movements, receiving from a shipment |
| Verified against the emulators: two lots recorded on RUN-26-0001 (six rolls), three rolls packed into CTN-26-0001 with packing started on the run, a repack refused, LOT-26-0001 released, a second carton across two lots; the run reports 200.1 m ready to ship | |

#### Phase 4 progress, third slice (2026-10-06)

| Done | Remaining |
|---|---|
| Generated documents behind `/api/pdf/<kind>/<number>` on the `api` function (Hosting rewrites `/api/**` on the platform site; development reaches the emulator directly): the purchase order for cost roles, the packing list and roll labels for production and logistics roles. Rendered on demand from the records with PDFKit in the brand's type (EB Garamond, Source Sans 3, Martian Mono, Archivo), never stored retyped; a draft order has no document until it is issued | Filing a generated PDF as a `document` record once Storage is available (needs Java locally, Blaze in production) |
| Purchase order: parties, delivery terms, lines with tolerances, prices and amounts, the payment schedule, notes, terms and signature lines. Packing list (landscape): carton ledger with marks, lots, rolls, metres, dimensions, CBM and weights, the lots with their quality, and the roll detail per carton. Roll labels: one 100 × 60 mm label per roll — shade, product code and lot; width, measured length and origin | Technical sheets; the sales documents (quotation, order confirmation, invoice) with their modules |
| Interface: PDF on the order sheet, Packing list on the run's packing tab, Roll labels on the lot sheet; the browser fetches with the session token and saves the file. Sample mode has no functions, so the actions are not shown there | A print view for sample mode, if the demo needs one |
| The emulator seed now survives an Auth-emulator restart: the owner account is recreated under the uid the Data Connect record already carries | |

#### Phase 4 progress, fourth slice (2026-10-06)

| Done | Remaining |
|---|---|
| Filing: a generated document becomes a `Document` record linked to its record (`fileGeneratedDocument`; a purchase order is filed the moment it is issued). The bytes go to Storage under `documents/<entity>/<number>/` where Storage is reachable, with `storage.rules` opening purchase orders to cost roles and the rest to staff; without Storage the record points at the generator and the document is regenerated on open. Documents tab on the order, run and lot sheets; module 12 Documents lists everything by kind | Uploads of external documents (supplier invoices, certificates) once Storage runs locally (Java) and in production (Blaze); document requirements per shipment (P6) |
| Sharing: every generated or filed document can be handed to WhatsApp — on a phone through the share sheet with the file itself; on a desktop the file is saved and a WhatsApp message opens naming it | WhatsApp Business API delivery with message history (Growth) |
| Exports at `/api/export/<ledger>.csv|xlsx` with `run`, `po` and `lot` scopes: purchase orders, order lines, production runs, lots, rolls, cartons and pallets, SKUs. One ledger definition in `packages/shared/src/exports.ts` drives the function (ExcelJS for XLSX; CSV with BOM, CRLF and formula guarding) and the sample interface (CSV built in the browser). Cost columns leave only with cost roles. Export menus on the order, run, SKU ledgers, on the packing tab and the lot's rolls | Exports for the modules still to come; a scheduled accounting export (P9) |
| Phones have a menu: the bottom bar carries Gateway, Attention, Search and Menu; Menu opens the rail as a drawer | |
| Seed: number sequences are never reset by a re-seed | |

#### Phase 4 progress, fifth slice: connectors (2026-10-06)

| Done | Remaining |
|---|---|
| Settings › Connectors (module 15): Email (provider Resend or Postmark, sender, reply-to; the API key is a Functions secret `EMAIL_API_KEY` the owner sets in the terminal — the screen only shows whether the functions can see it), WhatsApp (share sheet today; business number kept for documents), Assistant and API (tokens) | Users and roles screen on the existing `inviteUser` / `setUserRole`; legal entities, reference data, sequences, templates, alert thresholds, audit log |
| Email: `sendDocumentEmail` renders a purchase order, packing list or roll labels and sends it as an attachment through the connector; every attempt is a `Message` on the record (sent or failed, with the provider's answer) and a timeline entry. Email buttons on the order sheet and the packing tab | Inbound email; templates per document; WhatsApp Business API delivery |
| API tokens (`ApiToken`: name, prefix, SHA-256 hash, role, expiry, revocation; shown once): `createApiToken`, `revokeApiToken`. A `bsk_…` bearer on `/api/**` acts as the person who issued it, with the token's role, named on the request | Scopes narrower than a role |
| Machine surface on the `api` function: `GET /api/attention`, `GET /api/export/<ledger>.json`, `POST /api/commands/<name>` running the same callable functions (`CallableFunction.run`) with the same role checks | Rate limits per token |
| `apps/assistant`: an MCP server (`@modelcontextprotocol/sdk`, stdio) with `basis_attention`, `basis_ledger`, `basis_document`, `basis_command`; configured with a token and the API URL; README with the client configuration. Verified against the emulators through an MCP client: tools listed, attention and lots read, packing list saved locally, a command refused with the function's own message | Resources (ledgers as MCP resources); a hosted (HTTP) transport once Functions are deployed |

#### Phase 4 progress, sixth slice: Operations (2026-10-06)

| Done | Remaining |
|---|---|
| Module 01 Operations at `/operations`: the pipeline of goods as one strip (in production, in QC, ready to ship, in transit, in customs, in stock) with metres and record counts, derived in `packages/shared/src/operations.ts` from runs, lots and packing; transit, customs and stock report as pending until logistics and inventory land | Shipments, customs and stock feeding the last three stages (P6, P7) |
| The calendar of the next 30 days: open milestones at their expected date (moved ones marked), requested ex-factory dates, unpaid payments due, tasks due; overdue items lead. The ETA rail marks each day that carries something | A month view; export of the calendar |
| The Gateway's second zone, "In motion" and "Next 30 days", reads the same derivation; Tasks sits under Operations as a tab | |

#### Review and Hebrew (2026-10-07)

| Done | Remaining |
|---|---|
| Review of the build: every package's tests, typecheck and lint pass; every platform route checked at phone width in both directions for overflow and error boundaries; all 56 physical left/right utilities replaced with logical ones | A written QA checklist per module; end-to-end tests against the emulators |
| The platform speaks Hebrew: a locale switch in the rail, `dir="rtl"` on the document, Hebrew faces behind the display serif and the sans (Frank Ruhl Libre, Heebo), codes and measurements isolated left-to-right. Every visible string in the platform goes through `t()` (about 500 keys): shell, modules, roles, Gateway, Operations, Manufacturing, Products, Suppliers, Customers, Documents, Settings, statuses, timeline kinds, dialogs and empty states | The user's locale kept on the `User` row; Hebrew for data-level text (alert titles, seeded copy) where it is English by design; the public site in Hebrew once the locale decision (D8) is taken |

### P5 — Quality (L)

- Inspection templates and sampling rules; inspections for lab dip, inline, pre-shipment, receiving.
- Checks by category; shade readings against standards; defect capture per roll with photos; quantity and packaging verification.
- Result, disposition and their effect on lot quality state; milestone gates.
- Corrective actions through to verification.
- **Mobile-first inspection flow**, tolerant of poor connectivity (local draft, queued uploads).
- Supplier performance snapshots computed from milestones and inspections.

Exit: an inspector completes a pre-shipment inspection on a phone at a factory; a conditional pass holds the lot until its corrective action is verified.
Depends on: P4; the China reachability check ([SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md) O5).

#### Phase 5 progress (2026-10-07)

| Done | Remaining |
|---|---|
| Schema for quality (`dataconnect/schema/quality.gql`): inspection templates with checks (category, method, kind, unit, expected and tolerances in thousandths, critical flag), sampling rule and thresholds (defect points per 100 m, ΔE in hundredths); inspections on a lot or a run with their recorded checks, shade readings (L\*a\*b\*, ΔE, grade, standard) and defects per roll (4-point); corrective actions with owner, due date and verification | Inspections on shipments (receiving at the warehouse, P6/P7); photos on defects once Storage runs |
| Rules in `packages/shared/src/quality.ts` with tests: a measurement judged by its tolerance; defect points per 100 m; the result read from the checks, readings and defects against the template's thresholds (critical fail → fail; shade or defect rate beyond threshold → fail; non-critical fails → conditional); the dispositions a result allows; the lot state a disposition produces; a conditional release only with a corrective action or a concession | Supplier performance snapshot from inspections and actions |
| Functions: `createInspection` (template by type, family-specific first; checks copied), `recordInspection` (checks, readings, defects, on a phone, in any number of saves), `submitInspection` (result derived, refused while checks are pending), `signOffInspection` (QC or owner; moves the lot through the one lot transition and completes the run's gated inspection milestone on a release), `createCorrectiveAction`, `updateCorrectiveAction` (closing only from verification, by QC or the owner). Alert rules: inspection past its date, submitted and waiting for sign-off, corrective action overdue. Templates seeded: pre-shipment, lab dip, receiving | Lab-dip approvals linked to the approval-gated milestone; inline inspections against a run's lines |
| Module 05 QC: inspection queue (work first, then sign-off), the inspection sheet built for a phone (one check per row with Pass / Fail / N/A targets at 44 px, measurements typed in their unit, a draft kept in the browser until saved), shade readings and defects per roll with the running rate against the threshold, submit and sign-off with the allowed dispositions, corrective actions with their own ledger and update dialog, templates. Lot sheet opens an inspection and lists its inspections. Hebrew throughout | Defect library and shade-reading history across lots; the inspection as a PDF report |
| Verified against the emulators: INS-26-0001 opened on LOT-26-0002 from the seeded template, ten checks recorded with measurements and a failed packaging check, one reading and one defect, submitted as a conditional pass, a release refused without an action, CAR-26-0001 opened, signed off as release: the lot released and the run's inspection milestone done | |

### P6 — Logistics and landed cost (XL)

- Shipments with flow, mode and load type; legs with planned and actual dates; references (booking, BL, AWB, container, tracking).
- Shipment lines linking PO lines and lots, enforcing the split and over-shipment rules; handling units and totals (cartons, pallets, rolls, CBM, weights).
- Document requirements per shipment; documents check.
- Customs entries; HS codes.
- Shipment costs (estimate and actual), FX rates; allocation runs; lot landed cost; finalisation.
- Modules 07 Logistics and 13 Costing; arrivals board.
- Alert rules: ETA slipped, document missing before departure, customs held.

Exit: one shipment combining two purchase orders — and one purchase order split over two shipments — are both handled correctly, with documents, dates and a final landed cost per metre for every lot.
Depends on: P4, P5.

### P7 — Inventory (L)

- Stock locations; append-only movement ledger; derived balances.
- Receiving flow from a shipment (by lot and roll, discrepancies recorded); receiving inspection hook.
- Transfers, adjustments, sample cuts; reorder policies and low-stock alerts.
- Inventory valued at landed cost by lot.

Exit: stock on hand, by lot and location, at landed cost, reconciles to movements; low stock appears on the Gateway.
Depends on: P6.

### P8 — Orders and customer relationships (XL)

Delivered in two steps so the website is never blocked:

- **P8-lite (S, early — alongside B4):** inquiry intake → leads, lead ledger and sheet, sample requests with dispatch, lead sources. Enough for the site to launch into a real system.
- **P8-full:** customer profiles, types and tiers; interactions; opportunities and pipeline; quotes; sales orders; allocation by lot and roll; outbound shipments through the shared shipment model; invoice and payment references; derived customer metrics.

Exit: the full lifecycle lead → sample → quote → order → fulfilment → repeat is recorded for a real customer, with margin known from landed cost.
Depends on: Phase 2 (lite); P7 (full).

### P9 — Marketing, analytics, integrations (L, ongoing)

- Campaigns, segments, sample kits, outreach tracking.
- Analytics areas: supply, logistics, commercial, inventory.
- Integrations: FX feed, carrier tracking, accounting export, email / messaging history.
- Later candidates: supplier portal, customer portal, charcoal theme.

Depends on: P8.

## 5. Track B — Brand website

### B3 — Brand design (L)

Starts when Phase 1 tokens exist; does not wait for Track P.

- Art direction for Soft Industrial Luxury: palette tuned against real fabric, typeface decision, hand-lettered product marks, photography direction.
- Motion language prototypes: unfold, layer, stretch, shade transition — tested for performance on a mid-range phone before adoption.
- Decision on where, if anywhere, WebGL earns its place.
- Page designs for Brand Home, a fabric family, a product, the Shade System and the sample request — **each designed twice, at 390 and at 1440**.
- Editorial component set specified in `@basis/ui`.

Exit: approved designs and working motion prototypes for the five key pages on desktop and mobile.
Depends on: Phase 1; decisions D5, D6; brand assets.

### B4 — Site build (XL)

- Published content tables and publishing workflow (module 11 Website); the read-only `public` connector; automatic site rebuild and deploy on publish.
- Editorial components; pages per [ROUTE_MAP](ROUTE_MAP.md); responsive media pipeline.
- Sample request, wholesale application and contact flows → intake → leads (with P8-lite).
- SEO foundations: metadata, structured data, sitemap, Open Graph images; technical sheet generation.
- Accessibility and performance budgets checked as part of the build.

Exit: all launch pages built from published catalog and content; budgets met on mobile; a sample request on the site becomes a lead in the platform.
Depends on: Phase 2, B3, P8-lite.

#### Track B progress (2026-10-06)

| Done | Remaining |
|---|---|
| The launch site built as static pages from the launch catalog in `@basis/shared` (`apps/web`): Brand Home, Fabrics, the three families with the mesh comparison, the five products with the hand-written mark, specification label, shades and applications, the Shade System and each shade, Applications, Material, About, Wholesale with its application, Sample request with the shade kit, Contact, Legal. Every path prerendered; sitemap and robots written at build; metadata, Open Graph and Product JSON-LD per page | Publishing workflow (module 11) and the public connector so the site reads published tables instead of the typed launch catalog; real material photography and film replacing the structure drawings; motion choreography per section; the technical sheet PDF per product |
| Editorial component set in the site (`app/site/ui.tsx`): the hand, the index number, round shade swatches, the label block, the material window, the selvedge; mobile designed on its own: wordmark and index trigger, full-screen typographic index, bottom-anchored Request samples | Moving the set into `@basis/ui` once a second consumer exists |
| Intake: `POST /api/inquiries` (and `/api/sample-requests`) validates, rate-limits per address, drops honeypot hits, stores an `Inquiry` with its context and raises `customers.inquiry_new` on the Gateway; `/customers/inquiries` lists them with the detail and a handled state (`markInquiry`). Hosting rewrites `/api/**` on the public site too | Leads: an inquiry becoming a customer record (P8-lite); email acknowledgement to the sender through the email connector |

### B5 — Launch (M)

- Content entry and review; real photography and film in place.
- Redirects, analytics with consent, legal pages, monitoring.
- Launch checklist: performance, accessibility, cross-device, form deliverability.

Depends on: B4; decisions D7, D8.

## 6. Decisions needed from the owner

### Resolved

| # | Decision | Outcome |
|---|---|---|
| D0 | Existing BASIS prototype | None found; none pointed to. Greenfield |
| D1 | Stack | **Firebase + Git, as in the owner's other projects** (owner, 2026-10-06): pnpm monorepo, React + Vite, PostgreSQL through Firebase Data Connect, Cloud Functions, Firebase Auth, Storage and Hosting. See [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md) |
| D2 | Hosting and database provider | Firebase / Google Cloud, region `europe-west1` unless changed before the first Data Connect deploy |

### Blocking the first deploy and push (not local work)

| # | Needed from the owner | Recommendation |
|---|---|---|
| F1 | Switch the Firebase project to the Blaze plan (required for Data Connect and Functions; the Cloud SQL instance has a monthly cost). The project `basis-inc` and its two Hosting sites already exist (created 2026-10-06) | Upgrade in the Firebase console before the first Data Connect deploy |
| F2 | Create the GitHub repository | `idogolan4955/basis`, private, empty. `origin` already points there |

### Needed soon, with working defaults

| # | Decision | Default until decided | Needed by |
|---|---|---|---|
| D3 | Base currency, sales unit (metres / yards), roll-only vs. cut-length sales | USD · metres · per-SKU setting | Phase 2 |
| D4 | SKU code grammar and the real launch catalog (products, variants, shades, specifications) | Proposed grammar; demo seed data | Phase 2 |
| D5 | Typefaces: licensed foundry sans vs. open-source; who draws the product lettering | Open-source stand-ins behind tokens | B3 |
| D6 | Brand assets: logo / wordmark, fabric photography and film | Placeholders in design only; no launch without real assets | B3, B5 |
| D7 | Brand domain and the platform subdomain | Placeholders | First production deploy, B5 |
| D8 | Languages: website locales; platform interface language | English for both; locale-ready routing; logical CSS so right-to-left stays possible | B4 |

### Later

| # | Decision | Needed by |
|---|---|---|
| D9 | Relationship to the existing Fabrica system: independent, integrated, or a future customer/distributor of BASIS | P8 |
| D10 | Accounting system to integrate with | P8–P9 |
| D11 | Legal entities acting as buyer / importer of record; warehouse locations (own or third party) | P6–P7 |
| D12 | Who performs inspections (in-house, agency) and on what devices | P5 |
| D13 | Whether to show availability publicly | B4 |

## 7. Risks

| Risk | Mitigation |
|---|---|
| Scope: fifteen modules are a multi-phase build | Strict phase exits; each phase ends in something used with real data; no parallel half-modules |
| Real catalog and supplier data arrive late | CSV import path in Phase 2; realistic seed data so development is not blocked |
| Brand site blocked by missing photography | B3 fixes the photography brief early; design proceeds on tokens and type; launch gated on real assets |
| Motion and WebGL damage performance | Prototype and measure on a mid-range phone in B3; budgets checked at build; static fallbacks |
| Factory-side access from mainland China — Google services are generally blocked there | Tested with a real factory-side user in Phase 1. Fallback: factory-side flows served through the site's own origin (`/api/**` → functions). Offline-tolerant inspection capture |
| No staging environment | Emulator loop with seed data; schema changes only through the reviewed SQL diff; never `DROP` without explicit approval |
| Landed-cost errors are expensive | Allocation logic is pure, exhaustively unit-tested, versioned and audited; estimate and final kept separate |
| Status drift | Health and progress are derived only; no hand-editable status for them |
| Generic-looking interface | Design system signatures and an explicit "never" list; component catalogue reviewed against it |

## 8. Definition of done (every phase)

1. Works with real data through the real database — no hardcoded business data, no mock-only paths.
2. Domain rules covered by unit tests; commands by integration tests; the phase's main journey by an end-to-end test.
3. Permissions enforced by `@auth` on every connector operation and by every function; cost visibility verified for a role without cost access.
4. Meets the accessibility standard and the performance budget for its application.
5. Uses design-system components and tokens only; new patterns are added to the system, not to a page.
6. Documented: the relevant document in `/docs` is updated when the build diverges from it.

## 9. Recommended build sequence

1. F1 and F2 — Firebase project and GitHub repository.
2. Phase 1 — foundation.
3. Phase 2 — master data and catalog. Start B3 (brand design) in parallel as soon as tokens exist.
4. P3 — Gateway v1.
5. P4 — sourcing and manufacturing.
6. P8-lite + B4 — lead intake and the site build, in parallel with P5.
7. P5 — quality.
8. B5 — site launch.
9. P6 — logistics and landed cost.
10. P7 — inventory.
11. P8-full — orders and customer relationships.
12. P9 — marketing, analytics, integrations.

The order of Track P follows the goods: nothing can be shipped before it is produced and inspected, received before it is shipped, or sold from stock before it is received. If commercial pressure requires selling before the supply side is complete, P7 and P8-full can be brought forward with opening stock entered by adjustment — at the price of manual cost entry until P6 exists.
