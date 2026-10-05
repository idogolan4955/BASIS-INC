# BASIS INC. — Route Map

Status: v0.1 · 2026-10-06 · Phase 0 foundation document
Related: [INFORMATION_ARCHITECTURE](INFORMATION_ARCHITECTURE.md) · [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md)

Proposed URLs for the public website and the management platform. Domains are placeholders until the brand domain is confirmed.

| Application | Host (placeholder) | Firebase Hosting target | Code |
|---|---|---|---|
| Public website | `www.{brand-domain}` | `web` | `apps/web` |
| Management platform | `hq.{brand-domain}` | `platform` | `apps/platform` |

Until the brand domain is connected, each site is served on its Firebase Hosting address: `basis-inc.web.app` (website) and `basis-inc-hq.web.app` (platform), in Firebase project `basis-inc`. Route parameters are written `[name]` in this document; in code they are React Router parameters (`:name`).

---

## 1. Conventions

- Lowercase, kebab-case, plural collection names, no trailing slash.
- **Public site**: slugs come from the published catalog (`/fabrics/mesh/powermesh`). Slugs are stable; a changed slug leaves a permanent redirect.
- **Platform**: transactional documents are addressed by their business number (`/manufacturing/purchase-orders/PO-26-0041`); master data by code where one exists (`/products/skus/PWM-02-150-C014`), otherwise by id. Example SKU: `/products/skus/PWM-160-SK02`.
- Ledger state (view, filters, sort, page) lives in the query string, so any view is a shareable link.
- Sheet tabs are path segments (`/logistics/shipments/SHP-26-0014/documents`), so a tab is linkable and loads independently.
- `new` is a reserved segment for creation flows.
- Public site is locale-ready: the default locale is unprefixed; further locales are prefixed (`/fr/fabrics/...`).

## 2. Public website — `apps/web`

### 2.1 Pages

| Route | Page | Rendering |
|---|---|---|
| `/` | Brand Home | Static (prerendered; rebuilt on publish) |
| `/fabrics` | Fabrics index | Static |
| `/fabrics/[family]` | Fabric family — `/fabrics/mesh`, `/fabrics/lining`, `/fabrics/tulle` | Static per published family |
| `/fabrics/[family]/[product]` | Product — `/fabrics/mesh/powermesh`, `/fabrics/mesh/illusion-stretch-mesh`, `/fabrics/mesh/n58`, `/fabrics/lining/shanel-lining`, `/fabrics/tulle/bridal-tulle` | Static per published product |
| `/shades` | Shade System | Static |
| `/shades/[shade]` | Shade — `/shades/skin-02`, `/shades/milk` | Static |
| `/applications` | Applications index | Static |
| `/applications/[application]` | Application | Static |
| `/material` | Technology / Material Story | Static |
| `/about` | About BASIS | Static |
| `/wholesale` | Wholesale programme | Static |
| `/wholesale/apply` | Wholesale application | Static shell + form |
| `/samples` | Sample Request flow | Static shell + form |
| `/samples/confirmation` | Sample request received | Static |
| `/contact` | Contact | Static shell + form |
| `/legal/privacy` | Privacy | Static |
| `/legal/terms` | Terms | Static |
| `/legal/cookies` | Cookies | Static |

The three launch families are data: `[family]` resolves any family published from the platform. A context can be passed to conversion pages without personal data, e.g. `/samples?product=powermesh&shade=skin-02`.

### 2.2 Endpoints and system routes

All pages are static files. `/api/**` is rewritten by Firebase Hosting to the `api` Cloud Function.

| Route | Method | Purpose |
|---|---|---|
| `/api/inquiries` | POST | Contact and wholesale submissions → intake |
| `/api/sample-requests` | POST | Sample request submissions → intake |
| `/sitemap.xml`, `/robots.txt` | GET | Generated at build from the published catalog |
| `/fabrics/[family]/[product]/technical-sheet.pdf` | GET | Technical data sheet, generated on publish and stored as a static file |
| Open Graph images | GET | Generated at build, per page |

### 2.3 Reserved for later

| Route | Purpose |
|---|---|
| `/journal`, `/journal/[entry]` | Editorial |
| `/account/*` | Trade customer area (orders, documents, reorders) |
| `/[locale]/*` | Additional languages |

## 3. Management platform — `apps/platform`

### 3.1 Access

| Route | Purpose |
|---|---|
| `/sign-in` | Sign in |
| `/sign-in/verify` | Second factor |
| `/invitation/[token]` | Accept an invitation, set credentials |
| `/account` | Own profile, security, sessions |

Everything below requires an authenticated session; each route additionally requires the module permission.

### 3.2 Gateway

| Route | Purpose |
|---|---|
| `/` | BASIS Gateway |
| `/attention` | Full attention ledger (alerts and tasks) |
| `/search?q=` | Global search results |

### 3.3 Modules

**01 Operations**

| Route | Purpose |
|---|---|
| `/operations` | Order-to-stock pipeline |
| `/operations/calendar` | Ex-factory dates, inspections, ETDs, ETAs |
| `/operations/tasks` | Tasks |

**02 Products**

| Route | Purpose |
|---|---|
| `/products` | Products ledger |
| `/products/families` · `/products/families/[family]` | Families |
| `/products/[product]` | Product sheet (tabs: `/variants`, `/media`, `/documents`, `/story`, `/timeline`) |
| `/products/[product]/variants/[variant]` | Variant sheet |
| `/products/skus` · `/products/skus/[sku]` | SKU ledger and sheet (tabs: `/sourcing`, `/stock`, `/pricing`, `/history`) |
| `/products/shades` | Shade System |
| `/products/shades/[shade]` | Shade sheet: reference values, standards by factory, products in this shade |
| `/products/shades/standards` | Shade standards |
| `/products/put-ups` | Put-ups |

**03 Suppliers**

| Route | Purpose |
|---|---|
| `/suppliers` · `/suppliers/[supplier]` | Suppliers (tabs: `/factories`, `/contacts`, `/quotations`, `/purchase-orders`, `/performance`, `/documents`, `/timeline`) |
| `/suppliers/factories` · `/suppliers/factories/[factory]` | Factories |
| `/suppliers/rfqs` · `/suppliers/rfqs/[rfq]` | Requests for quotation |
| `/suppliers/quotations` · `/suppliers/quotations/[quotation]` | Quotations |

**04 Manufacturing**

| Route | Purpose |
|---|---|
| `/manufacturing` | Manufacturing overview (milestone board) |
| `/manufacturing/purchase-orders` · `/manufacturing/purchase-orders/new` | PO ledger and creation flow |
| `/manufacturing/purchase-orders/[po]` | PO sheet (tabs: `/lines`, `/production`, `/shipments`, `/payments`, `/documents`, `/timeline`) |
| `/manufacturing/runs` · `/manufacturing/runs/[run]` | Production runs (tabs: `/milestones`, `/lots`, `/inspections`, `/packing`, `/documents`) |
| `/manufacturing/payments` | Supplier payment schedule |

**05 QC**

| Route | Purpose |
|---|---|
| `/qc` | QC queue |
| `/qc/inspections` · `/qc/inspections/new` | Inspections |
| `/qc/inspections/[inspection]` | Inspection sheet (tabs: `/checks`, `/defects`, `/shade`, `/result`, `/actions`) |
| `/qc/inspections/[inspection]/perform` | Mobile-first inspection flow |
| `/qc/corrective-actions` · `/qc/corrective-actions/[action]` | Corrective actions |
| `/qc/defects` | Defect library |

**06 Inventory**

| Route | Purpose |
|---|---|
| `/inventory` | Stock by SKU |
| `/inventory/lots` · `/inventory/lots/[lot]` | Lots |
| `/inventory/rolls` · `/inventory/rolls/[roll]` | Rolls |
| `/inventory/movements` | Movement ledger |
| `/inventory/locations` · `/inventory/locations/[location]` | Stock locations |
| `/inventory/receive/[shipment]` | Receiving flow |
| `/inventory/reorder` | Reorder list |

**07 Logistics**

| Route | Purpose |
|---|---|
| `/logistics` | Arrivals board (ETAs) |
| `/logistics/shipments` · `/logistics/shipments/new` | Shipments |
| `/logistics/shipments/[shipment]` | Shipment sheet (tabs: `/route`, `/contents`, `/documents`, `/customs`, `/costs`, `/timeline`) |
| `/logistics/customs` · `/logistics/customs/[entry]` | Customs entries |
| `/logistics/partners` · `/logistics/partners/[company]` | Forwarders, brokers, carriers |
| `/logistics/locations` | Ports, airports, hubs, warehouses |

**08 Orders**

| Route | Purpose |
|---|---|
| `/orders` · `/orders/new` | Sales orders |
| `/orders/[order]` | Order sheet (tabs: `/lines`, `/allocation`, `/fulfilment`, `/invoices`, `/documents`, `/timeline`) |
| `/orders/quotes` · `/orders/quotes/[quote]` | Quotes |

**09 Customers**

| Route | Purpose |
|---|---|
| `/customers` · `/customers/[company]` | Customer companies (tabs: `/contacts`, `/samples`, `/opportunities`, `/orders`, `/interactions`, `/value`) |
| `/customers/contacts` | Contacts |
| `/customers/leads` · `/customers/leads/[lead]` | Leads |
| `/customers/sample-requests` · `/customers/sample-requests/[request]` | Sample requests |
| `/customers/pipeline` | Pipeline board |

**10 Marketing**

| Route | Purpose |
|---|---|
| `/marketing` | Marketing overview |
| `/marketing/campaigns` · `/marketing/campaigns/[campaign]` | Campaigns |
| `/marketing/segments` · `/marketing/segments/[segment]` | Segments |
| `/marketing/sample-kits` · `/marketing/sample-kits/[kit]` | Sample kits |
| `/marketing/sources` | Lead sources |

**11 Website**

| Route | Purpose |
|---|---|
| `/website` | Publishing overview (what is live, what has unpublished changes) |
| `/website/pages` · `/website/pages/[page]` | Pages |
| `/website/fabrics` · `/website/fabrics/[family]` · `/website/fabrics/[family]/[product]` | Fabric stories and public presentation |
| `/website/shades` | Shade System presentation |
| `/website/applications` · `/website/applications/[application]` | Applications |
| `/website/media` | Media library |
| `/website/inquiries` | Inbound inquiries |

**12 Documents**

| Route | Purpose |
|---|---|
| `/documents` | All documents |
| `/documents/[document]` | Document sheet (links, versions) |
| `/documents/expiring` | Expiring certificates and documents |
| `/documents/missing` | Unmet document requirements |

**13 Costing**

| Route | Purpose |
|---|---|
| `/costing` | Costing overview |
| `/costing/landed` · `/costing/landed/[shipment]` | Landed cost allocation |
| `/costing/lots` | Lot costs |
| `/costing/price-lists` · `/costing/price-lists/[list]` | Wholesale price lists |
| `/costing/margins` | Margin analysis |
| `/costing/fx` | Exchange rates |

**14 Analytics**

| Route | Purpose |
|---|---|
| `/analytics` | Overview |
| `/analytics/supply` · `/analytics/logistics` · `/analytics/commercial` · `/analytics/inventory` | Analysis areas |

**15 Settings**

| Route | Purpose |
|---|---|
| `/settings` | Settings index |
| `/settings/users` · `/settings/roles` | Users and roles |
| `/settings/legal-entities` | BASIS legal entities |
| `/settings/reference` · `/settings/reference/[dataset]` | Reference data (units, currencies, ports, HS codes, defect types, delay reasons, document types) |
| `/settings/sequences` | Number sequences |
| `/settings/templates/processes` · `/settings/templates/inspections` · `/settings/templates/documents` | Process, inspection and document-requirement templates |
| `/settings/alerts` | Alert rules and thresholds |
| `/settings/audit` | Audit log |

### 3.4 Platform endpoints

The platform is a single-page application: every path is rewritten to `index.html` except `/api/**`. Reads and simple writes use the generated SDK of the Data Connect `platform` connector. Multi-step commands are callable Cloud Functions. Sign-in uses the Firebase Auth SDK; files use the Firebase Storage SDK under `storage.rules`. Plain HTTP endpoints exist only where required, rewritten by Hosting to the `api` function:

| Route | Purpose |
|---|---|
| `/api/webhooks/tracking` | Carrier / forwarder tracking events |
| `/api/webhooks/email` | Email delivery events |
| `/api/export/[ledger]` | CSV / XLSX export of a ledger view |
| `/api/pdf/[document]` | Generated PDFs (purchase order, packing list, labels) |
| `/api/health` | Health check |

## 4. Code layout

```
apps/web/                                   React Router framework mode, prerendered to static HTML
├─ react-router.config.ts                   no server; prerender every published path (read from the public connector)
└─ app/
   ├─ root.tsx                              document shell, editorial register
   ├─ routes.ts                             route table
   └─ routes/
      ├─ home.tsx                           /
      ├─ fabrics.tsx                        /fabrics
      ├─ fabrics.family.tsx                 /fabrics/:family
      ├─ fabrics.product.tsx                /fabrics/:family/:product
      └─ shades…  applications…  material  about  wholesale  samples  contact  legal

apps/platform/                              React SPA (Vite)
└─ src/
   ├─ main.tsx · routes.tsx                 route table; one lazy chunk per module
   ├─ layout/                               masthead, index rail, auth guard, module index + permissions
   ├─ pages/
   │  ├─ access/                            sign-in, verify, invitation
   │  ├─ gateway/                           Gateway, attention, search
   │  └─ operations/  products/  suppliers/  manufacturing/  qc/  inventory/  logistics/
   │     orders/  customers/  marketing/  website/  documents/  costing/  analytics/  settings/
   ├─ lib/                                  logic without interface
   └─ components/                           components shared between modules

functions/src/
├─ index.ts · region.ts                     exports, region
├─ api/                                     HTTP: intake, webhooks, export, pdf
└─ <module>.ts                              callable commands and scheduled jobs per module
```

Each module folder owns its screens, loading and error states, and module-specific components. Design-system components come from `@basis/ui`; business rules from `@basis/shared`; data through the generated connector SDK and callable functions.
