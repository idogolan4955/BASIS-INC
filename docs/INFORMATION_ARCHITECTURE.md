# BASIS INC. — Information Architecture

Status: v0.1 · 2026-10-06 · Phase 0 foundation document
Related: [PRODUCT_BLUEPRINT](PRODUCT_BLUEPRINT.md) · [DOMAIN_MODEL](DOMAIN_MODEL.md) · [ROUTE_MAP](ROUTE_MAP.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md)

BASIS has two navigation systems: the **management platform** (Gateway and its modules) and the **public website**. This document defines the hierarchy, navigation and page anatomy of both. URLs are in [ROUTE_MAP](ROUTE_MAP.md); visual treatment is in [DESIGN_SYSTEM](DESIGN_SYSTEM.md).

---

## Part A — Management platform

### A1. Organising idea

The platform is organised like a swatch book: a numbered **index** of modules, each opening onto ledgers (lists) and sheets (records). The Gateway is the cover and the index at once.

Three rules shape everything:

1. **Attention before navigation.** What needs a decision is shown before where things live.
2. **Follow the goods.** Every record links along the traceability chain — SKU ↔ supplier ↔ purchase order ↔ production run ↔ lot ↔ inspection ↔ shipment ↔ stock ↔ order ↔ customer — in both directions, from every sheet.
3. **Lists are the product.** Most work happens in filtered, saved, shareable ledgers, not in dashboards.

### A2. The Gateway

The first screen after sign-in. Four zones in fixed order, top to bottom on desktop, same order stacked on mobile.

| Zone | Content | Source |
|---|---|---|
| **1. Requires attention** | A ranked ledger of open alerts: delayed production, pending QC, supplier issues, shipment exceptions, missing documents, low stock, tasks due. Each row: what, which record, how late, who owns it, one primary action | `alert`, `task` |
| **2. In motion** | The pipeline of goods as one horizontal strip — *In production → In QC → Ready to ship → In transit → In customs → In stock* — with metres and record counts per stage. Below it, an ETA rail for the next 30 days and the five most recent orders | Derived from runs, lots, shipments, legs, orders |
| **3. Figures** | Eight business figures, each with period comparison: inventory value at landed cost · open purchase commitments · goods in transit (value) · order intake (period) · sample → order conversion · on-time production · first-pass QC rate · average landed-cost uplift | Read models |
| **4. Index** | The fifteen modules, numbered, each with one live figure (e.g. *04 Manufacturing — 6 runs active, 1 delayed*) | Per-module summary queries |

Gateway behaviour:
- Content is filtered by role. A QC inspector's Gateway is their inspection queue; a sales user sees no purchase figures.
- Every figure and stage is a link to the ledger that explains it, pre-filtered.
- Nothing on the Gateway is editable. It is derived.

### A3. Global navigation

| Element | Behaviour |
|---|---|
| **Index rail** (left, desktop) | The numbered module list. Text labels, not icon-only. Collapsible to numbers. Current module marked by a selvedge bar |
| **Masthead** (top) | BASIS mark → Gateway; breadcrumb of the current record; global search; alerts count; user menu |
| **Command palette** (`⌘K`) | Jump to any module or record by number, code or name (`PO-26-0041`, `PWM-02`, a supplier name); run actions ("new purchase order") |
| **Global search** | Searches business numbers, SKU codes, supplier SKUs, company and contact names, container / BL / AWB / tracking references |
| **Mobile** | Bottom bar: Gateway · Search · Attention · Index. Modules open as full-screen ledgers. Inspection and receiving flows are designed mobile-first |

### A4. Module index

| No. | Module | Purpose | Primary sections |
|---|---|---|---|
| 01 | **Operations** | Cross-module flow view: order-to-stock pipeline and calendar | Pipeline board · Calendar (ex-factory dates, ETDs, ETAs, inspections) · Tasks |
| 02 | **Products** | The catalog | Families · Products · Variants · SKUs · Shade System (collections, shades, standards) · Put-ups · Media |
| 03 | **Suppliers** | Supplier companies and factories | Suppliers · Factories · Contacts · RFQs & quotations · Certifications · Performance |
| 04 | **Manufacturing** | Purchasing and production | Purchase orders · Production runs · Milestone board · Supplier payments · Process templates |
| 05 | **QC** | Quality control | Inspections · Queue (pending) · Corrective actions · Shade readings · Defect library · Inspection templates |
| 06 | **Inventory** | Stock | Stock by SKU · Lots · Rolls · Movements · Locations · Reorder |
| 07 | **Logistics** | International movement | Shipments · Arrivals (ETA board) · Customs · Documents check · Partners (forwarders, brokers, carriers) · Routes & locations |
| 08 | **Orders** | Customer orders | Quotes · Sales orders · Allocation · Fulfilment · Invoices (references) |
| 09 | **Customers** | Accounts and relationships | Companies · Contacts · Leads · Sample requests · Pipeline · Interactions |
| 10 | **Marketing** | Growth activity | Campaigns · Segments · Sample kits · Lead sources · Outreach |
| 11 | **Website** | Public-site content | Pages · Fabric stories · Applications · Shade presentation · Media library · Inquiries · Publishing |
| 12 | **Documents** | Every document, across modules | All documents · By type · Expiring · Missing (requirements) |
| 13 | **Costing** | Cost and price | Landed cost (allocation runs) · Lot costs · Price lists · Margins · FX rates |
| 14 | **Analytics** | Analysis | Supply (lead times, on-time, QC) · Logistics (transit times, cost per metre) · Commercial (conversion, repeat, customer value) · Inventory (ageing, turns) |
| 15 | **Settings** | Configuration | Users & roles · Legal entities · Reference data · Number sequences · Templates · Alert rules · Audit log |

Layer mapping: Gateway = the launchpad. **Operations** layer = modules 01–06. **Logistics** layer = 07, with 13. **Growth** layer = 08–10. **Brand / Web** management = 11. Shared = 12, 14, 15.

### A5. Module hierarchies

```
02 Products
├─ Families ─ Family
│   └─ Products ─ Product
│       ├─ Overview (specification, composition, status)
│       ├─ Variants ─ Variant (width, GSM, stretch, family specs)
│       │   └─ SKUs ─ SKU
│       │       ├─ Sourcing (supplier items, purchase prices)   [cost:view]
│       │       ├─ Stock (lots, rolls)
│       │       ├─ Pricing (wholesale)
│       │       └─ History (orders, shipments, inspections)
│       ├─ Media & technical documents
│       └─ Website story (→ 11)
└─ Shade System
    ├─ Collections ─ Shades ─ Shade
    │   ├─ Reference values
    │   ├─ Standards by factory
    │   └─ SKUs in this shade
    └─ Standards (approvals, lab dips)

03 Suppliers
├─ Suppliers ─ Supplier
│   ├─ Overview (terms, currency, lead time, MOQ)
│   ├─ Factories ─ Factory (capabilities, certifications, location)
│   ├─ Contacts
│   ├─ Quotations
│   ├─ Purchase orders (→ 04)
│   ├─ Performance (scorecard, corrective actions)
│   ├─ Documents
│   └─ Timeline
└─ RFQs & quotations

04 Manufacturing
├─ Purchase orders ─ PO
│   ├─ Lines
│   ├─ Production (runs)
│   ├─ Shipments (→ 07, derived from shipment lines)
│   ├─ Payments
│   ├─ Documents
│   └─ Timeline
├─ Production runs ─ Run
│   ├─ Timeline (milestones: planned / forecast / actual)
│   ├─ Lots & rolls
│   ├─ Inspections (→ 05)
│   ├─ Packing (handling units)
│   └─ Documents & evidence
└─ Milestone board (all runs by current milestone)

05 QC
├─ Queue (scheduled, awaiting sign-off)
├─ Inspections ─ Inspection
│   ├─ Checks (shade · dimension · defect · quantity · packaging)
│   ├─ Defects (per roll, photos)
│   ├─ Shade readings
│   ├─ Result & disposition
│   └─ Corrective actions
└─ Corrective actions ─ Action

07 Logistics
├─ Shipments ─ Shipment
│   ├─ Route (legs: planned / actual, tracking)
│   ├─ Contents (lines by PO / order, lots, handling units, totals)
│   ├─ Documents (required vs. present)
│   ├─ Customs
│   ├─ Costs (estimate / actual → landed cost)
│   └─ Timeline
├─ Arrivals (ETA board)
├─ Customs entries
└─ Partners

09 Customers
├─ Companies ─ Company
│   ├─ Overview (type, tier, country, owner)
│   ├─ Contacts
│   ├─ Samples
│   ├─ Opportunities & quotes
│   ├─ Orders (→ 08)
│   ├─ Interactions
│   └─ Value (derived metrics)
├─ Leads ─ Lead (→ convert)
├─ Sample requests
└─ Pipeline (board by stage)
```

Modules not expanded here follow the same pattern: ledgers at the top, sheets beneath, tabs on the sheet.

### A6. Page anatomy

**Ledger (list page).**
- Title with index number; primary action (e.g. *New purchase order*).
- Saved views as tabs (e.g. *Open · Delayed · Awaiting QC · All*); views are shareable URLs.
- Filter bar: structured filters, free-text search, column chooser, density toggle.
- Table: sortable, keyboard navigable, sticky header and identity column, numeric columns right-aligned in tabular figures, inline status, row opens the sheet; bulk actions on selection.
- Footer: count, totals for numeric columns, pagination.

**Sheet (record page).**
- **Label header** — the record's identity presented like a roll label: number/code, name, lifecycle state, health, the three or four facts that matter (for a shipment: mode, route, ETD/ETA, CBM), owner, primary actions.
- **Tabs** in consistent order: *Overview · [domain tabs] · Documents · Costs · Timeline*. *Costs* appears only with permission.
- **Chain panel** (right, collapsible): the upstream and downstream records on the traceability chain.
- **Timeline**: the unified event history with notes and attachments.

**Flow (guided task).** Used when order matters: issue a PO, perform an inspection, book a shipment, receive goods, allocate landed cost. Full-screen, stepwise, resumable, saves drafts.

### A7. Visibility by role

| Module | Owner | Ops | Purchasing | QC | Logistics | Sales | Marketing | Finance |
|---|---|---|---|---|---|---|---|---|
| 01 Operations | ● | ● | ● | ◐ | ● | ◐ | – | ○ |
| 02 Products | ● | ● | ● | ○ | ○ | ○ | ○ | ○ |
| 03 Suppliers | ● | ● | ● | ○ | ○ | – | – | ○ |
| 04 Manufacturing | ● | ● | ● | ○ | ○ | – | – | ○ |
| 05 QC | ● | ● | ○ | ● | ○ | – | – | – |
| 06 Inventory | ● | ● | ○ | ○ | ● | ○ | – | ○ |
| 07 Logistics | ● | ● | ○ | – | ● | ◐ | – | ○ |
| 08 Orders | ● | ● | – | – | ◐ | ● | – | ○ |
| 09 Customers | ● | ○ | – | – | – | ● | ● | ○ |
| 10 Marketing | ● | – | – | – | – | ◐ | ● | – |
| 11 Website | ● | – | – | – | – | – | ● | – |
| 12 Documents | ● | ● | ◐ | ◐ | ◐ | ◐ | – | ○ |
| 13 Costing | ● | ● | ◐ | – | ◐ | – | – | ● |
| 14 Analytics | ● | ● | ◐ | ◐ | ◐ | ◐ | ◐ | ● |
| 15 Settings | ● | ◐ | – | – | – | – | – | – |

● manage · ◐ limited / own scope · ○ read · – hidden. Purchase costs, landed costs and supplier identity require `cost:view` regardless of module access.

### A8. Vocabulary

One word per thing, everywhere:

| Use | Not |
|---|---|
| Supplier (company), Factory (site) | Vendor, manufacturer |
| Purchase order | Order (alone — ambiguous with sales) |
| Sales order / Order (in Orders module only) | Deal, purchase |
| Production run | Job, batch (batch means lot) |
| Lot | Batch (in UI), dye lot (only for the mill's reference) |
| Inspection | Check, audit |
| Shipment, Leg | Delivery, segment |
| Shade | Colour (except in customer-facing prose) |
| Customer (company), Contact (person) | Client, account, user |

---

## Part B — Public website

### B1. Organising idea

The site is a flagship, read as an editorial sequence and usable as a technical reference. Two reading modes share every page:

- **Feel it** — large type, macro material imagery, motion.
- **Specify it** — exact composition, width, weight, stretch, shades, applications; request samples.

Every fabric page must satisfy both in one scroll, with the path to a sample request always one action away.

### B2. Site hierarchy

```
Brand Home
├─ Fabrics                              (index of families)
│   ├─ Mesh                             (family, with the mesh comparison guide)
│   │   ├─ Powermesh                    (product)
│   │   ├─ Illusion Stretch Mesh
│   │   └─ N58 Semi-Stretch Mesh
│   ├─ Lining
│   │   └─ Shanel Lining
│   └─ Tulle
│       └─ Bridal Tulle
├─ Shade System                         (Skin 01, Skin 02, Skin 03, Milk, Bone, Pure)
│   └─ Shade                            (which products come in it)
├─ Applications                         (index)
│   └─ Application                      (e.g. corsetry, illusion, lining, veils)
├─ Material                             (Technology / Material Story)
├─ About BASIS
├─ Wholesale                            (programme, terms, apply)
├─ Sample Request                       (flow)
├─ Contact
└─ Legal (privacy, terms, cookies)
```

New families and products appear under Fabrics automatically when published from the platform; nothing in the navigation is hardcoded to the launch range.

### B3. Navigation

| Element | Content |
|---|---|
| **Primary** | Fabrics · Shade System · Applications · Material · About |
| **Action** | *Request samples* — persistent, the single primary call to action |
| **Secondary** | Wholesale · Contact |
| **Fabrics panel** | Opening Fabrics reveals the families as a typographic index with a material image per family — not a dropdown list |
| **Footer** | Full index of pages, families, contact details, wholesale, legal, language selector |

**Mobile is designed independently**, not collapsed from desktop:
- A minimal top bar (wordmark + index trigger) and a bottom-anchored *Request samples* action within thumb reach.
- The menu is a full-screen typographic index.
- Shade exploration is a horizontal, swipeable swatch strip; specifications become accordions; long sequences are re-choreographed for vertical viewing, with shorter scroll distances.

### B4. Page purposes and content

| Page | Job | Core content |
|---|---|---|
| **Brand Home** | State what BASIS is in one screen; lead into the fabrics | Brand statement · the three families as material moments · Shade System teaser · applications · wholesale invitation |
| **Fabrics** | Orient | Families as an index: name, one-line role in a gown, material image |
| **Family** (Mesh, Lining, Tulle) | Make the material understood and wanted | Material hero · what it does in a gown · products in the family (for Mesh, the comparison guide) · shade availability · applications · sample CTA |
| **Product** (*Powermesh*) | Let a professional specify | Handwritten product mark · full specification (composition, width, GSM, stretch, put-up) · shades available as circular swatches · close-up media · applications · technical sheet download · sample CTA |
| **Shade System** | Establish shade as a BASIS strength | The system and its logic · the six shades with name and code · which products come in each shade · note on screen vs. physical colour → sample kit |
| **Applications** | Start from the garment problem | Each application: the problem, the recommended fabrics, construction notes |
| **Material** | Prove expertise | How the fabrics are made, tested and controlled: shade control, lot consistency, QC |
| **About** | Who stands behind it | Brand idea, standards, international reach |
| **Wholesale** | Qualify and convert trade customers | Who it is for · how ordering works · minimums and lead times in principle · application form |
| **Sample Request** | Convert | Short flow: who you are → what you make → which fabrics / kit → delivery address → confirmation |
| **Contact** | Reach BASIS | Inquiry form routed by topic; direct details |

### B5. Conversion paths

```
Any fabric / shade / application page
        │
        ├── Request samples ──► Sample Request flow ──► lead + sample request in the platform
        │
        └── Wholesale ──► Application form ──► lead (qualified by customer type, country, volume)

Contact ──► Inquiry ──► lead (by topic)
```

Every submission carries its context: the page it came from, the fabrics viewed or selected, campaign parameters. That context becomes the lead's source in Growth.

### B6. Content sources

| Content | Maintained in | Published as |
|---|---|---|
| Specifications, shades, product structure | Platform → Products | Published catalog |
| Stories, headlines, application articles, page copy | Platform → Website | Pages / sections |
| Imagery and film | Platform → Website → Media library | Renditions |
| Navigation of families and products | Derived from the published catalog | — |

### B7. Languages

The site launches in English with locale-ready routing and content model, so further languages are an editorial task rather than a rebuild. See open decision in [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md).
