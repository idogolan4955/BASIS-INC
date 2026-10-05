# BASIS INC. — System Architecture

Status: v0.2 · 2026-10-06 · Phase 0 foundation document
Related: [PRODUCT_BLUEPRINT](PRODUCT_BLUEPRINT.md) · [DOMAIN_MODEL](DOMAIN_MODEL.md) · [ROUTE_MAP](ROUTE_MAP.md) · [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md)

> **v0.2 — stack decided by the owner (2026-10-06):** BASIS is built on **Firebase and Git, the same way as the owner's other projects**. This replaces the provider-neutral proposal of v0.1 (Next.js + Drizzle + self-hosted auth). The reference implementation of the pattern is the owner's `Fabrica` project.

---

## 1. Starting point

The repository was audited on 2026-10-06 before this document was written.

- The project directory `BASIS INC` contained **no source code** and was not a git repository. No BASIS prototype exists elsewhere on the machine. BASIS is a **greenfield build**.
- The pattern to follow was read from `Fabrica` (configuration, workspace layout, working brief — not a full audit):

| Layer | Fabrica pattern | Adopted for BASIS |
|---|---|---|
| Workspace | pnpm monorepo: `apps/*`, `packages/*`, `functions` | Same |
| Interface | React 19 + Vite + Tailwind CSS 4 + TanStack Query + React Router 7 | Same |
| Database | PostgreSQL through Firebase Data Connect; schema in GraphQL | Same |
| Queries and mutations | Data Connect connector, each operation with `@auth` by role | Same |
| Generated SDK | Typed functions generated into `packages/shared` | Same |
| Server logic | Cloud Functions v2 (Node, TypeScript), `europe-west1` | Same |
| Identity | Firebase Auth, role in a custom claim | Same |
| Files | Firebase Storage + `storage.rules` | Same |
| Hosting | Firebase Hosting | Same, two sites |
| Source control | Git, GitHub, `main` | Same |
| Delivery | Local chain: typecheck → build → `firebase deploy` → commit → push | Same |

## 2. Architectural drivers

| Driver | Consequence |
|---|---|
| Deeply relational domain: many-to-many between purchase orders and shipments, ledgers, allocations, traceability chains | PostgreSQL (through Data Connect), transactional mutations |
| Two very different front ends sharing one brand | Two applications, one shared design-system package |
| The public site must not expose operational data | Separate Hosting site, separate public connector limited to published content |
| The public site must be found and must be fast | Prerendered static HTML, not a client-rendered application |
| Status must be derived from facts | Append-only event tables, derived read models, state machines in pure shared code |
| International: currencies, units, time zones | Money, quantity and local-date value types from day one |
| Cost confidentiality | Enforced in the operations a role may call, not only in the interface |
| Small team, proven workflow | One language, one repository, the Firebase toolchain already in use |

## 3. System shape

```
basis/
├─ apps/
│  ├─ web/                 Public brand site — prerendered React (Vite)        → Hosting target `web`
│  └─ platform/            Management platform — React SPA (Vite)              → Hosting target `platform`
├─ packages/
│  ├─ shared/              Domain: types, zod schemas, enums, state machines, calculations,
│  │                       permission catalogue · generated Data Connect SDKs (never hand-edited)
│  └─ ui/                  Design system: tokens, primitives, operational and editorial components
├─ dataconnect/
│  ├─ schema/              PostgreSQL schema in GraphQL, one file per module
│  ├─ platform/            Connector for staff: queries and mutations with `@auth` by role
│  └─ public/              Connector for the website: published catalog and content only
├─ functions/              Cloud Functions v2: commands, alert engine, publishing, intake, REST, PDFs
├─ storage.rules
├─ firebase.json
└─ docs/
```

```
     Browser (public)                              Browser (managers, inspectors)
           │                                                  │
   ┌───────▼─────────┐                              ┌─────────▼─────────┐
   │ Hosting: web    │                              │ Hosting: platform │
   │ static HTML     │                              │ React SPA         │
   └───┬─────────┬───┘                              └───┬───────────┬───┘
       │         │ /api/** rewrite                      │           │ callable / /api/**
       │ public  │                                      │ platform  │
       │ connector                                      │ connector │
       │         │        ┌──────────────────┐          │           │
       │         └───────►│ Cloud Functions  │◄─────────┼───────────┘
       │                  │ v2               │          │
       │                  └────────┬─────────┘          │
       │                           │ Admin SDK          │
   ┌───▼───────────────────────────▼────────────────────▼───┐      ┌──────────────────┐
   │        Firebase Data Connect  →  PostgreSQL (Cloud SQL) │      │ Firebase Storage │
   └─────────────────────────────────────────────────────────┘      └──────────────────┘
                    Firebase Auth — identity, role in custom claim
```

### Differences from the Fabrica pattern, and why

| Difference | Reason |
|---|---|
| Two apps instead of one | The public flagship has opposite needs (search visibility, cinematic motion, no operational code) from the dense platform |
| `packages/ui` in addition to `packages/shared` | Two apps must share one design system |
| The public site is prerendered to static HTML | A client-rendered SPA is invisible to search and slow to first paint; a brand site cannot be |
| Schema and connectors split into one file per module from the first day | BASIS has ten modules; single multi-thousand-line files become hard to review |
| Two connectors (`platform`, `public`) | The website's access is limited by construction to published content |
| Money and quantities stored as fixed-point integers, not floats | Landed-cost allocation must sum exactly; see §8 |
| Interface in English, locale-ready | International brand |
| Local emulators with seeded data as the default development loop | Schema and functions are exercised before production |

## 4. Stack

| Concern | Choice |
|---|---|
| Language | TypeScript, `strict` |
| Workspace | pnpm workspaces |
| Platform app | React 19, Vite, React Router 7 (SPA, lazy module chunks), TanStack Query over the generated SDK |
| Public site | React 19, Vite, React Router 7 framework mode with full prerendering (static output, no server) |
| Styling | Tailwind CSS 4 over CSS-variable design tokens from `@basis/ui` |
| Component primitives | Headless accessible primitives wrapped as BASIS components; no pre-themed UI kit |
| Database | PostgreSQL (Cloud SQL) through Firebase Data Connect |
| Validation | zod — forms, function inputs, intake |
| Forms | react-hook-form + zod |
| Tables | TanStack Table + virtualisation |
| Identity | Firebase Auth; role in custom claim; accounts created by invitation only |
| Server logic | Cloud Functions v2, Node 20, `europe-west1` |
| Files | Firebase Storage |
| Hosting | Firebase Hosting, two sites in one project |
| Motion (site) | CSS scroll-driven animation first; Motion for component choreography; GSAP ScrollTrigger for long sequences; WebGL as isolated lazy islands — see [DESIGN_SYSTEM](DESIGN_SYSTEM.md) §9 |
| Tests | Vitest for shared domain code; emulator-backed tests for functions and connectors; Playwright for critical flows |
| Source control | Git, GitHub, `main` |

## 5. Boundaries

```
apps/web ──────► @basis/ui · @basis/shared (domain + public SDK)   ── never the platform SDK
apps/platform ─► @basis/ui · @basis/shared (domain + platform SDK)
functions ─────► @basis/shared (domain)                            ── Admin SDK for data
@basis/ui ─────► nothing from the data side
@basis/shared ─► nothing (domain code is pure; SDKs are generated)
```

- Business rules — state machines, calculations, validation — live once, in `@basis/shared`, and are used by both the interface and the functions.
- `@basis/ui` components receive data as props. They never query.
- Generated SDK folders are build output. They are regenerated, never edited.

## 6. Data layer — Firebase Data Connect

**Schema.** `dataconnect/schema/*.gql`, one file per module (`foundation`, `parties`, `catalog`, `sourcing`, `manufacturing`, `quality`, `inventory`, `logistics`, `costing`, `commercial`, `content`). The entities are those of [DOMAIN_MODEL](DOMAIN_MODEL.md). Enumerations are GraphQL enums mirrored in `@basis/shared`.

**Connectors.**

| Connector | Used by | Contents |
|---|---|---|
| `platform` | `apps/platform` | Queries and mutations for staff. Every operation carries `@auth` with an explicit role expression |
| `public` | `apps/web` (at build time and in the browser) | Read-only queries over published content, `@auth(level: PUBLIC)`. No operational table is reachable through it |

**Authorization in operations.** A role can do exactly what the operations it is allowed to call can do. Cost confidentiality follows from this: operations available to roles without cost access do not select purchase prices, landed costs or supplier identity; cost-bearing variants of those queries exist separately and are restricted. Row-level conditions use `@check` on lookup steps.

**Transactions and invariants.** Multi-step writes use `@transaction` mutations with `@check` guards, so an invariant violation aborts the whole write. Rules too complex for a mutation run in a function (§7), which computes with `@basis/shared` and commits through one transactional mutation.

**Schema changes** follow the chain already in use:

1. `firebase dataconnect:sql:diff` — read the SQL.
2. Only `CREATE` and `ADD COLUMN` proceed without discussion. **Never `DROP` without the owner's explicit approval.** Destructive change is expand → migrate → contract, in separate steps.
3. `firebase dataconnect:sql:migrate` → `firebase deploy --only dataconnect` → `firebase dataconnect:sdk:generate`.

## 7. Server logic — Cloud Functions v2

| Kind | Used for | Examples |
|---|---|---|
| Callable | Commands with multi-step rules or privileged effects | Issue a purchase order · sign off an inspection · receive a shipment · run and finalise landed-cost allocation · publish website content · invite a user and set their role |
| Scheduled | Time-based work | Alert rules (overdue milestones, ETA slippage, expiring documents, low stock) · FX rates · read-model refresh |
| HTTP (`api`, behind Hosting rewrites) | Endpoints that must be plain HTTP | Public intake (`/api/inquiries`, `/api/sample-requests`) · webhooks · ledger export · generated PDFs |
| Event-triggered | Reactions | Storage upload processing (image renditions) |

Every function: validates input with a zod schema from `@basis/shared`; verifies the caller's role from the auth token; reads and writes through the Admin SDK for Data Connect; returns typed results and typed errors (`validation`, `not_found`, `forbidden`, `conflict`, `invariant_violation`, `external_failure`). Function names are registered in `@basis/shared` so the interface and the functions cannot drift apart.

Secrets are set only by the owner in the terminal (`firebase functions:secrets:set`). They are never requested in chat, printed or committed.

## 8. Data rules

| Topic | Rule |
|---|---|
| Primary keys | UUID, generated by the database |
| Business numbers | Human-readable, from configurable sequences (`PO-26-0001`, `SHP-26-0014`), allocated inside the creating transaction |
| Money | **Fixed-point integer** (`Int64`, ten-thousandths of the currency unit) + ISO 4217 currency. Never floats. Documents snapshot the FX rate used |
| Quantity | **Fixed-point integer** (`Int64`, thousandths of the unit) + unit of measure. Length canonical in metres |
| Conversion | Fixed-point ↔ display happens only in value types in `@basis/shared`; components never do arithmetic on raw stored values |
| Timestamps | `Timestamp`, UTC |
| Local dates | Logistics dates (ETD, ETA) are `Date` with the location's time zone |
| Family-specific specifications | Typed columns for universal properties; validated JSON for per-family properties, schema held on the fabric family |
| History | Master data is archived, never hard-deleted. Transactional documents are cancelled or voided, never deleted |
| Ledgers | Stock movements, timeline events, tracking events and audit events are insert-only: no update or delete operation exists for them in any connector |
| Derived state | Health and progress are computed from facts and stored by functions — no operation lets a person edit them |
| Concurrency | Aggregate roots carry a `version`; mutations check it and fail with `conflict` instead of overwriting |
| Tenancy | Single tenant. A `LegalEntity` table supports more than one BASIS company acting as buyer or importer of record |

**Events.** Each command writes a `DomainEvent` row in the same transaction as the change. A scheduled sweep consumes unprocessed events to evaluate alert rules, refresh read models (run health, shipment progress, stock balances, supplier scorecards) and send notifications.

## 9. Authentication and authorization

**Authentication.** Firebase Auth. No public sign-up on the platform: an account is created by an invitation function called by an owner, which also sets the role claim. Second factor (TOTP) is planned for staff; it requires the Identity Platform upgrade — open decision O4.

**Principals.** Staff first. Roles `supplier` and `customer` are reserved so portals can be added later without re-plumbing.

**Roles.**

| Role | Scope |
|---|---|
| `owner` | Everything, including users and settings |
| `operations` | All operational modules; costs |
| `purchasing` | Suppliers, quotations, purchase orders, production; purchase costs |
| `qc` | Inspections, defects, corrective actions; no costs, no customers |
| `logistics` | Shipments, documents, customs, logistics costs |
| `sales` | Customers, leads, samples, quotes, orders; wholesale prices, no purchase costs |
| `marketing` | Campaigns, segments, website content, media; no costs |
| `finance` | Read across modules; costing, FX, payments |
| `viewer` | Read-only, no costs |

Rules:
- The role lives in the Firebase Auth custom claim and is checked by `@auth` on every operation and by every function. Navigation is filtered from the same permission catalogue in `@basis/shared`; a hidden screen is a courtesy, not the control.
- **Cost visibility is a data rule** (§6).
- Sensitive actions — issuing a purchase order, signing off an inspection, finalising landed cost, changing a role — run through functions and write an audit record with actor, time and before/after.
- `storage.rules` apply the same roles to files.

## 10. Public site ↔ platform contract

The website never reads operational tables.

- **Outbound (platform → site): published content.** Publishing in the Website module is a function that writes versioned rows to `Published*` tables: families, products, variants, shades, applications, pages, media. Only fields marked public are copied — never costs, suppliers or stock quantities.
- **Build.** `apps/web` is prerendered: at build time its route loaders read the `public` connector and every page is written as static HTML, then deployed to the `web` Hosting site. Hydrated pages may refresh live fields from the same connector.
- **Freshness.** A publish must be followed by a site rebuild and deploy. Initially this is the standard local chain. In phase B4 the publish function triggers the rebuild automatically (a GitHub Actions workflow dispatched from the function).
- **Inbound (site → platform): inquiries.** Sample requests, wholesale applications and contact messages post to `/api/**` on the site's own origin, rewritten by Hosting to the `api` function, which validates, rate-limits, applies bot protection and writes an intake row. Intake rows become leads.

## 11. Files and documents

- Binary files in Firebase Storage; metadata in the `Document` table (type, number, issue and expiry dates, checksum, uploader).
- Documents attach to any entity through `DocumentLink` — one commercial invoice can be linked to a shipment and to its purchase orders.
- Access is governed by `storage.rules` using the role claim; paths are structured by module. Nothing is publicly readable except published website media.
- Uploaded images get generated renditions; originals are kept. Inspection photos keep capture metadata.
- **Document requirements** are rules ("a sea shipment into country X requires commercial invoice, packing list, BL, certificate of origin"). A missing required document before a leg's ETD raises an alert.

## 12. The attention engine

The Gateway's attention list is produced by **alert rules**, each a small pure function over facts, evaluated by the scheduled sweep and after relevant commands:

| Rule (examples) | Trigger |
|---|---|
| Production milestone overdue | Forecast or today later than planned end, not complete |
| QC pending | Inspection scheduled or submitted beyond threshold without sign-off |
| Shipment ETA slipped | Leg forecast arrival later than planned by more than threshold |
| Document missing before departure | Required document absent N days before ETD |
| Low stock | Available below reorder point |
| Supplier issue | Open corrective action past due; repeated failures |
| Payment due | Purchase-order payment milestone approaching |

Rules write to `Alert` with a dedupe key, severity and state (`open`, `acknowledged`, `resolved`). An alert resolves itself when the underlying fact changes.

## 13. Integrations (planned)

| Integration | Purpose | Phase |
|---|---|---|
| Transactional email | Invitations, sample-request confirmations, alerts | Early |
| FX rates | Daily rates for costing | Costing |
| Carrier / container tracking | Tracking events for shipment legs | Logistics, later |
| Accounting system | Export invoices, costs, payments | After orders |
| Messaging (email, WhatsApp) | Customer and supplier interaction history | Growth |
| Document generation | Purchase orders, packing lists, roll labels, technical sheets as PDF | Manufacturing / Logistics |

Each is a module in `functions/src` behind an interface typed in `@basis/shared`, so a provider can be replaced without touching screens.

## 14. Quality, security, performance

**Testing.** Domain rules and calculations (state machines, landed-cost allocation, CBM, defect scoring, unit and fixed-point conversion) are unit-tested exhaustively in `@basis/shared`. Functions and connector operations are tested against the local emulators. Playwright covers the critical journeys: sign-in; purchase order → run → inspection → shipment → receipt; sample request from site to lead.

**Security.** Input validated at every boundary; every connector operation carries an explicit `@auth`; no operation is left at a permissive default; `storage.rules` deny by default; secrets only in Functions secrets; security headers on both Hosting sites; rate limiting and bot protection on public endpoints; audit log; scheduled database export for backup.

**Performance budgets.**

| | Public site | Platform |
|---|---|---|
| LCP (mid-range phone, 4G) | ≤ 2.0 s | — |
| INP | ≤ 200 ms | ≤ 200 ms |
| CLS | ≤ 0.05 | ≤ 0.05 |
| Initial JS per route (gzip) | ≤ 130 kB before lazy islands | ≤ 250 kB initial chunk; modules lazy-loaded |
| Ledgers | — | First rows ≤ 1 s; paging and filtering in the query |

WebGL, video and long scroll sequences are lazy, capability-gated and have static fallbacks.

**Accessibility.** WCAG 2.2 AA on both apps. Keyboard-complete platform. Reduced motion honoured on the site.

## 15. Environments and delivery

- **Local.** Firebase emulators (Auth, Functions, Data Connect, Storage) with seeded data — reference data plus a realistic demo dataset kept as typed fixtures. Business data is never embedded in components.
- **Production.** One Firebase project. There is no staging environment, as in the owner's other projects; the emulators and the schema-diff review are the safety net.
- **The working chain** — every change ends deployed, committed and pushed:
  1. Schema or connector changed → the Data Connect chain in §6.
  2. Functions → build → `firebase deploy --only functions:<name>`.
  3. Interface → **`tsc --noEmit` first** (Vite builds even with type errors) → build → `firebase deploy --only hosting:<target>`.
  4. Commit and push to `main`; message in English explaining why.
- Interface checks run against emulator or sample data, not against production data.

## 16. Decisions

### Made

| # | Decision | Notes |
|---|---|---|
| A1 | Greenfield monorepo | Nothing existed to extend |
| A2 | **Firebase + Git, as in the owner's other projects** | Owner decision, 2026-10-06. Supersedes the v0.1 proposal |
| A3 | PostgreSQL through Data Connect; connectors with `@auth` per operation | The domain model is unchanged — it was relational and remains so |
| A4 | Two apps (`web`, `platform`), two Hosting sites, two connectors | §3 |
| A5 | Public site prerendered to static HTML | §10 |
| A6 | Business rules in `@basis/shared`, used by interface and functions | §5 |
| A7 | Derived status via events and read models | Never hand-edited |
| A8 | Money and quantities as fixed-point integers | §8 |
| A9 | Website content structured in our own database | No second source of truth for catalog content |

### Open — owner input needed

| # | Decision | Default if not decided | Blocks |
|---|---|---|---|
| O1 | Firebase project: ID and creation; Blaze billing (required for Data Connect and Functions; Cloud SQL has a monthly cost) | Project ID `basis-inc`, region `europe-west1` | First deploy. Local development runs on emulators without it |
| O2 | GitHub repository | `idogolan4955/basis`, private | First push |
| O3 | Region | `europe-west1`, as in the other projects. The Data Connect location cannot be changed after creation | First Data Connect deploy |
| O4 | Second factor for staff (requires Identity Platform upgrade) | Email + password at first; TOTP when enabled | Nothing |
| O5 | Reachability from mainland China: Google services are generally blocked there, which affects factory-side users (inspectors, suppliers) | Verify with a real factory-side user before the QC phase. Fallback: factory-side flows served entirely through the site's own origin (`/api/**` → functions), with no direct Google endpoints in the browser | Factory-side QC rollout |
| O6 | Relationship between BASIS and the Fabrica system | Fully independent: separate project, database and repository | Nothing now |
| O7 | Accounting system to integrate with | Deferred | Orders phase |
