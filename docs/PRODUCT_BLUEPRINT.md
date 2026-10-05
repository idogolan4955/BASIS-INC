# BASIS INC. — Product Blueprint

Status: v0.1 · 2026-10-06 · Phase 0 foundation document
Related: [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md) · [DOMAIN_MODEL](DOMAIN_MODEL.md) · [INFORMATION_ARCHITECTURE](INFORMATION_ARCHITECTURE.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md) · [ROUTE_MAP](ROUTE_MAP.md) · [IMPLEMENTATION_PLAN](IMPLEMENTATION_PLAN.md)

---

## 1. What BASIS is

BASIS INC. is a premium international bridal-fabric brand. It supplies the foundational materials — the layers a gown is built on before anything decorative is added: powermesh, lining, tulle.

The name is the thesis. A bridal gown is judged by its surface, but it is held together by its base. BASIS sells the base, and sells it the way a technical house would: exact shades, exact specifications, traceable lots, dependable supply.

BASIS is therefore two things that must be built as one:

1. **A brand** — a digital flagship that makes foundational fabric desirable and makes BASIS the obvious professional choice.
2. **An operating company** — an import business that sources in China, controls production and quality, moves goods internationally, holds inventory and serves B2B customers in many countries.

The software ecosystem described here is the company's operating system and its public face. It is not a website with an admin panel attached, and it is not an off-the-shelf ERP with a theme. Every layer is shaped around how a fabric business actually works: shade, lot, roll, meter, mill, container.

## 2. Who it serves

| Group | Who | What they need from BASIS |
|---|---|---|
| Management | Owner, operations lead | One place to see the state of the whole company and act on what needs attention |
| Sourcing & production | Purchasing, production follow-up | Supplier knowledge, quotations, purchase orders, production timelines that reflect reality |
| Quality | Inspectors (in-house or third party, often on a phone at a mill) | Structured inspections, shade and defect capture, corrective actions |
| Logistics | Logistics coordinator, forwarders, brokers | Shipments, legs, documents, dates, costs |
| Commercial | Sales, account management, marketing | Leads, sample requests, quotes, orders, customer history |
| Finance | Owner, bookkeeper | True landed cost, margins, payables schedule, inventory value |
| Customers | Bridal designers, bridal salons, ateliers, dress manufacturers, fashion manufacturers, distributors, wholesalers | Confidence in the material, exact shade and spec information, samples, a professional wholesale relationship |
| Partners | Supplier companies, factories, freight forwarders, customs brokers, carriers | Clear orders, clear requirements, clear documents |

## 2a. The range, as the brand booklet defines it

The owner's brand booklet (*BASIS INC. Foundation Fabrics, Brand / Product Architecture / Digital System / Physical Catalogue*, v3; pages kept in `docs/brand/`) is the source of truth for the product range and the brand language.

| Index | Family | Product | Role |
|---|---|---|---|
| 01 | Mesh | **Powermesh** | Shaping / support mesh: high support, strong recovery, smooth foundation for structured bridal construction |
| 02 | Mesh | **Illusion Stretch Mesh** | Transparent stretch mesh: fine, lightweight, highly transparent, for illusion areas and second-skin effects |
| 03 | Mesh | **N58 Semi-Stretch Mesh** | Controlled semi-stretch mesh: balanced stretch and stability for controlled support and coverage |
| 04 | Lining | **Shanel Lining** | Premium lining: smooth, soft, breathable foundation layer |
| 05 | Tulle | **Bridal Tulle** | Fine bridal tulle: lightweight, ethereal, for layering, volume and veils |

- **Shade System.** One shared shade language across products, packaging, samples, website and operations: **Skin 01, Skin 02, Skin 03, Milk, Bone, Pure**. A shade exists globally; its availability is product-specific until that fabric is approved in production.
- **Put-up.** Shade-matched matte rolls with the product name in the hand on the roll and an end-cap label: shade / product code / lot, width / length / origin. The booklet shows 160 cm width and 50 m rolls.
- **Naming rules.** BASIS is the master brand; product names are functional, memorable and international; mesh products form a visible family but stay distinct; the same names and codes run through packaging, website, catalogue and back office; technical attributes live in the system while public language stays concise and editorial.
- **Mesh comparison.** The three meshes are compared on primary role, stretch behaviour, transparency, support level, hand feel and best use. GSM, width, stretch percent, composition and exact shade availability are confirmed per production standard before publication.

## 3. The five layers

BASIS is built as five connected layers over one shared data foundation.

```
                     ┌────────────────────────────────────────────┐
                     │              1. BASIS GATEWAY              │
                     │  management launchpad · attention · KPIs   │
                     └───────┬──────────────┬─────────────┬───────┘
                             │              │             │
        ┌────────────────────▼───┐  ┌───────▼────────┐  ┌─▼────────────────────┐
        │  2. BASIS OPERATIONS   │  │ 3. BASIS       │  │  5. BASIS GROWTH     │
        │  products · suppliers  │◄─►   LOGISTICS    │◄─►  leads · samples     │
        │  manufacturing · QC    │  │ shipments ·    │  │  quotes · orders     │
        │  inventory             │  │ customs · cost │  │  customers           │
        └───────────┬────────────┘  └───────┬────────┘  └──────────┬───────────┘
                    │                       │                      │
                    └───────────┬───────────┴──────────────────────┘
                                │   published catalog · inbound inquiries
                     ┌──────────▼─────────────────────────────────┐
                     │          4. BASIS BRAND / WEB              │
                     │   public flagship · fabrics · shade system │
                     └────────────────────────────────────────────┘
```

### 3.1 BASIS Gateway

**Purpose.** The first screen after a manager signs in. The control center for the company.

**It answers three questions, in this order:**
1. *What needs me?* — delayed production, pending QC, supplier issues, missing shipment documents, low stock, overdue tasks.
2. *What is moving?* — goods in production, in transit, in customs; upcoming ETAs; recent orders.
3. *How is the business doing?* — a small set of figures that matter (inventory value at landed cost, open purchase commitments, goods in transit, order intake, first-pass QC rate, on-time production).

**It also is the index** to every module: Operations, Products, Suppliers, Manufacturing, QC, Inventory, Logistics, Orders, Customers, Marketing, Website CMS, Documents, Costing, Analytics, Settings.

**It owns nothing.** The Gateway has no data of its own. Everything it shows is derived from facts recorded in the other layers. If the Gateway says a production run is delayed, it is because a milestone's forecast date passed its planned date — not because someone set a flag.

### 3.2 BASIS Operations

**Purpose.** Everything about what BASIS sells and how it is made.

- **Products** — the catalog as a strict hierarchy: Fabric Family → Product → Variant → Shade → SKU → Batch/Lot → Roll. Launching with three families holding five products (see §2a); structured so a new family or product is data, not a code change.
- **Suppliers & factories** — companies, their factories, contacts, capabilities, terms, quotations, certifications and a performance history that is computed from real outcomes.
- **Manufacturing** — Purchase Order → Production Run → Milestones → QC → Packaging → Ready to Ship, on an extensible timeline rather than a single status.
- **Quality control** — inspections with shade matching, dimensional checks, defect logging, quantity and packaging verification, photographic evidence, a three-way result (pass / conditional pass / fail) and corrective actions.
- **Inventory** — what exists, where, in which lot and roll, in what state, at what cost.

### 3.3 BASIS Logistics

**Purpose.** Move goods from a factory in China to any chosen destination, and know exactly what it cost.

Factory → Pickup → Consolidation → Freight Forwarder → Port/Airport → International Freight → Customs → Local Delivery → Destination.

- Shipments made of legs, by sea (FCL/LCL), air or courier.
- Physical truth: cartons, pallets, rolls, CBM, gross and net weight.
- Commercial truth: Incoterm, documents (commercial invoice, packing list, BL/AWB, certificates, customs paperwork).
- Time truth: ETD, ETA, actual departure, actual arrival — per leg.
- Cost truth: freight, duties, taxes, brokerage, local delivery, allocated back onto the goods as landed cost.

A shipment may carry goods from several purchase orders; a purchase order may leave in several shipments. The destination may be a BASIS warehouse, a third-party warehouse or a customer directly.

### 3.4 BASIS Brand / Web

**Purpose.** The digital flagship. It makes the brand, explains the material and converts professional interest into sample requests and wholesale relationships.

- Concept: **Soft Industrial Luxury** — bone, milk, nude, sand, cocoa, charcoal; macro material photography; very large architectural typography; a handwritten marker accent for product names; motion that behaves like fabric.
- Structure: Brand Home, Fabrics (Powermesh, Shanel Lining, Bridal Tulle), Shade System, Applications, Technology / Material Story, About, Sample Request, Wholesale, Contact.
- It is fed by the operational catalog — specifications, shades and availability are published from the platform, not retyped — and it feeds Growth with leads and sample requests.
- It is a brand and lead-generation site, not a storefront. There is no public cart or checkout in the first version.

### 3.5 BASIS Growth

**Purpose.** Turn interest into repeat customers, measurably.

Lead → Company → Contact → Sample Request → Qualification → Quote → Order → Fulfilment → Repeat Purchase.

- Customer groups: bridal designers, bridal salons, ateliers, dress manufacturers, fashion manufacturers, distributors, wholesalers.
- Marketing functions planned for: lead source, campaigns, sample kits, outreach, segmentation, country, customer tier, sales pipeline, conversion, repeat orders, customer value.
- Growth is architected now and built later. The entities exist from the start so that the first lead captured by the website is already a first-class record.

## 4. One roll, end to end

The layers are connected by the physical object. Following one roll shows why they cannot be built separately.

1. **Growth.** A bridal designer finds *Powermesh* on the website and requests a sample kit. A lead is created with its source.
2. **Brand.** The page they read — composition, width, GSM, stretch, the Skin 02 shade — was published from the operational catalog.
3. **Operations · Products.** *Mesh → Powermesh → 160 cm variant → Skin 02* resolves to one internal SKU, mapped to a supplier SKU at a specific factory with a MOQ, a lead time and a purchase price.
4. **Operations · Suppliers.** The factory was chosen on the strength of a quotation and its history: on-time rate, first-pass QC rate, shade accuracy.
5. **Operations · Manufacturing.** A purchase order is issued. A production run opens with its milestones: materials, knitting, lab-dip approval against the shade standard, dyeing, finishing, inspection, packing. A dyeing delay moves the forecast; the Gateway shows it.
6. **Operations · QC.** A pre-shipment inspection measures shade deviation, usable width and GSM, scores defects, verifies quantity and packaging. Result: conditional pass, with a corrective action for relabelling. The lot is released when the action is verified.
7. **Operations · Manufacturing.** The lot is packed. Each roll gets an identity, a measured length and a place in a carton.
8. **Logistics.** The lot is consolidated with a Bridal Tulle order from another factory into one LCL shipment. Legs are planned, documents collected, the vessel departs, customs clears, the goods are delivered.
9. **Logistics · Costing.** Freight, duty, tax, brokerage and delivery invoices are recorded against the shipment and allocated across its contents. The lot now has a true landed cost per meter.
10. **Operations · Inventory.** The rolls are received into stock, by lot, at a location, at landed cost.
11. **Growth.** The designer's samples led to a quote, then an order. Rolls from that exact lot are allocated and shipped. The margin on the order is known, not estimated.
12. **Gateway.** At every step, the manager saw what was moving, what was late and what needed a decision.

## 5. Product principles

1. **One source of truth.** One catalog, one party register, one document store. The website, the purchase order and the packing list all read the same SKU.
2. **Facts over statuses.** Record what happened (a milestone completed, a leg departed, an inspection failed) and derive status from it. A status that someone has to remember to update will be wrong.
3. **Traceability to the roll.** From any roll: its lot, production run, purchase order, factory, inspections, shipment, cost and customer. From any customer complaint: back to the mill.
4. **Cost is landed cost.** Purchase price is the beginning of cost, not the cost. Margin decisions use landed cost.
5. **Shade is a system.** Shades are defined once, measured against standards, and controlled lot by lot. Shade is the product's most fragile promise.
6. **One brand, two registers.** The public site is editorial and emotional; the platform is precise and dense. Both are unmistakably BASIS.
7. **Built to be real.** No hardcoded business data in the interface, no mock structures that cannot become a database, no demo-only paths.
8. **Extensible by data.** A new fabric family, production process, inspection checklist, shipment route or customer segment is configuration.

## 6. Scope boundaries

Deliberately **not** part of the first versions:

- Public e-commerce checkout and online payment.
- A general ledger. BASIS records commercial documents and costs and will integrate with an accounting system; it does not replace one.
- A page-builder CMS. Website content is structured content bound to bespoke templates.
- Supplier and customer self-service portals. The model allows for them (external principals, row-level scoping); they are a later phase.
- Demand forecasting and automated replenishment. Reorder points first; forecasting once there is history.

## 7. Success measures

| Layer | Evidence that it works |
|---|---|
| Gateway | A manager can state, within a minute of signing in, what is late, what is arriving and what needs a decision |
| Operations | Every sellable SKU has a complete specification, a supplier mapping and a cost; every lot has an inspection result; no production status is entered by hand |
| Logistics | Every shipment has its legs, documents and costs; landed cost per meter is available for every received lot |
| Brand / Web | Excellent Core Web Vitals on a mid-range phone; sample requests arrive as structured leads; no specification is maintained in two places |
| Growth | Lead source → sample → quote → order conversion is measurable; repeat purchase and customer value are visible per customer |

## 8. Glossary

| Term | Meaning at BASIS |
|---|---|
| Fabric family | Top-level category of fabric (Mesh, Lining, Tulle) |
| Product | A named fabric within a family (Powermesh, Illusion Stretch Mesh, N58 Semi-Stretch Mesh, Shanel Lining, Bridal Tulle) |
| Variant | A width / weight / finish version of a product |
| Shade | A named, coded colour in the BASIS Shade System (Skin 01, Skin 02, Skin 03, Milk, Bone, Pure) |
| SKU | A sellable unit: variant × shade × put-up |
| Put-up | How the fabric is presented: roll length, core, wrap, carton |
| Lot (batch, dye lot) | Fabric produced and dyed together; the unit of shade consistency |
| Roll | One physical roll with its own measured length |
| Shade standard | The approved physical/measured reference a lot is matched against |
| Lab dip | A small dyed sample submitted by the mill for shade approval before bulk dyeing |
| ΔE | Measured colour difference between a sample and the standard |
| GSM | Fabric weight in grams per square metre |
| 4-point system | Industry method for scoring fabric defects per roll |
| MOQ | Minimum order quantity |
| Incoterm | International commercial term defining where cost and risk transfer (EXW, FOB, CIF, DAP, DDP…) |
| FCL / LCL | Full container load / less than container load |
| CBM | Cubic metres of cargo volume |
| BL / AWB | Bill of lading (sea) / air waybill (air) |
| ETD / ETA / ATD / ATA | Estimated and actual times of departure and arrival |
| HS code | Customs tariff classification |
| Landed cost | Purchase cost plus all costs of bringing goods to destination, per unit |
