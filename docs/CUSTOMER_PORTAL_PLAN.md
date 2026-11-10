# Customer portal — accounts, ordering, payments, cashback and the assistant

How BASIS customers get a site of their own: they sign in, see and manage everything they have with BASIS, order and pay (including Apple Pay and Google Pay), earn and spend cashback, carry a member card in their phone's wallet, and talk to an assistant that knows the catalog and their account. Written before the build, from the owner's brief of 2026-11-10: "ואני רוצה אתר לקוחות עם משתמשים וניהול מלא כולל מערכת קאשבאק וכרטיס אשראי דיגיטלי ותשלומים בapple pay ו גוגל wallet" — a customer site with users and full management, including a cashback system, a digital credit card and payments with Apple Pay and Google Wallet. Extended the same day: "אני רוצה bot ai עוזר באתר לקוחות" — an AI assistant bot on the customer site (§9).

This document decides who the portal serves, the accounts and how they are kept apart from staff, what a customer can do, how payments work, the cashback ledger, what "a digital credit card" can honestly mean, the assistant, the screens, the schema, the permissions and the order of the build (§12). It ends with what the owner must open or buy (§13) and the questions for the owner (§14). Nothing is built beyond it until the owner approves it. What is already in the system is reused, never duplicated.

**State.** Designed 2026-11-10. The owner asked for it to be built the same day ("when you finish building the customer front, open a session for the App Store"), which is taken as approval with the proposed answers to §14, as with the department plans before it: trade first, invitation-only for trade, the cashback and card proposals, Opus for the site assistant. The selling entity and the processor (question 2) and the domain (question 6) still wait for him and gate slice 3.

**Slice 1 is built (2026-11-10):** accounts, users and invitations; the `customer` connector; the portal under `/account` on the brand site (sign-in, invitation, password reset, overview, quotes with accept and decline and the quotation PDF, orders, shipments, invoices, documents, samples, team, addresses) in English and Hebrew; the Portal tab on the customer's page in the platform. As built, against this plan:
- Shipments reach the customer through `Shipment.consignee`, which `shipSalesOrder` sets to the order's customer and which only that function sets; only it puts sales-order lines on a shipment, so a consignee's shipment carries only their goods. A shipment's lines are read by their own query: one query with the journey and the lines is more than the local emulator's database plans. Places on a shipment show their kind and city, never their name (a direct shipment starts at the mill).
- Documents are listed and opened through functions (`customerDocuments`, `/api/customer/files/<id>`, the customer branch of `/api/pdf/*`), not the connector, because a document is linked to a record by its number: the function finds the person's own records first. Commercial invoices only on their own orders; papers of a direct shipment and inspection reports never; a shipment's papers only when every line on it is theirs.
- Invitations are not emailed yet (no mail provider): whoever invites gets the one-time link to send, with Copy and WhatsApp. The link is valid 14 days; only its hash is stored.
- `transitionQuote` no longer clears a quote's sent date when it is answered.

**Slice 2 is built (2026-11-10):** the assistant on every page of the brand site (§9). As built, against this plan:
- Its records are `SiteConversation`, `SiteTurn` and `SiteAction` (the plan's `AssistantConversation` and `AssistantTurn`, renamed beside the staff assistant's `AssistantThread`). An anonymous conversation is held by a key only the visitor's browser has; its hash is stored, and the visitor's address only as a hash.
- Visitors get the catalogue and the Shade System in the prompt (they are public) and two actions: a sample request and a hand-off to sales. Signed-in customers also read their own quotes, orders, shipments, invoices, sample requests and addresses through the `customer` connector impersonating them, and can answer a quote. Every action is a card the visitor confirms; confirming runs the same path as the site's own forms (`createInquiryRecord`, `askForSamples`, `answerQuote`).
- A hand-off is an `Inquiry` (`source = assistant`, on the account when signed in) carrying the question and the conversation, not an `Interaction`: inquiries are where sales already answers.
- App Check is not yet on (it needs reCAPTCHA Enterprise set up in the console by the owner). Until then the limits in the database bound the spend: 20 messages a conversation, 40 an hour from one address, 600 anonymous messages a day across the site, 200 a day for a customer, short messages and a few model calls per answer. The switch is in Settings › Connectors › Assistant on the site, per audience.

---

## 1. What the system already has, and what the portal reuses

| Need | Already in the platform | Reused as |
|---|---|---|
| Who the customer is | `Company` with the `customer` role (`CompanyRole`), `CustomerProfile` (type, tier `standard`/`preferred`/`key`, payment terms, currency), `Contact` (email, language) | A trade account **is** a customer company. Its people are its contacts. No second customer table for trade |
| External sign-in | Firebase Auth; `User` already carries `principalType` (`staff`/`supplier`/`customer`) and `companyId`, and the `Role` enum already reserves `customer` — "reserved so portals can be added later without re-plumbing" (SYSTEM_ARCHITECTURE) | Customer users are `User` rows with `principalType = customer` and the claim `role = customer`. The platform's `ROLES` list in `packages/shared/src/access.ts` does not contain `customer`, so `callerOf` already refuses a customer token on every staff function |
| Quotes and orders | `Quote`/`QuoteLine` (`sent`, `accepted`, `declined`, `expired`), `transitionQuote` (accepting opens the confirmed sales order), `SalesOrder`/`SalesOrderLine`, `createSalesOrder`, `transitionSalesOrder` | The customer accepts or declines a sent quote through the same transition; a portal order is a `SalesOrder` with `source = portal` |
| Prices | `PriceList`, `PriceListItem` (by SKU), `PriceListProductItem` (by product, with quantity breaks), `priceFor` in `packages/shared/src/relationships.ts` | The catalog in the portal shows the account's own price list and nothing else |
| Shipments | `Shipment`, `ShipmentLeg`, `ShipmentLine`, `Allocation.shipment`, the leg timeline | Tracking in the portal is read from legs; status stays derived from legs |
| Invoices and payments received | `InvoiceRef` (number, amount, due, paid — pointers to the accounting system) | Shown to the customer; a portal payment against an invoice records the payment and, once accounting confirms, the paid fields |
| Documents | `Document` + `DocumentLink`, PDF routes (`quote`, `packing-list`, `shipment-packing-list`, …), `fileGeneratedDocument` | The customer opens the documents linked to its own quotes, orders and shipments; generated documents are rendered on demand as today |
| Samples and inquiries | `Inquiry` (kinds sample, wholesale, contact; `source` site or email), `receiveInquiry` with its per-IP limit and honeypot | A signed-in sample request is an `Inquiry` with the account attached; the assistant's hand-off is an `Inquiry` with `source = assistant` |
| Conversations with customers | `Interaction`, `Opportunity`, `logInteraction` | Portal activity that sales should see (a reorder request, an assistant hand-off) is an `Interaction` on the customer |
| The public site | `apps/web` (React Router, prerendered, `basis-inc.web.app`), the `public` connector with `@auth(level: PUBLIC)` reads of the catalog and Shade System, `/api/**` rewritten to the `api` function | The portal lives on the same site under `/account` (§10); the catalog pages are shared |
| Consumer products | Module 18 (Development) and its handover to the catalog (`PRODUCT_DEVELOPMENT_PLAN` §3.7) | The consumer line reaches the portal's shop only after handover, as catalog products with prices |
| Connectors and secrets | `Connector` (settings, not secret), `CONNECTOR_SECRETS` listed by name, secrets set by the owner with `firebase functions:secrets:set` | New connector keys `payments`, `wallet`, `site_assistant`; their secrets are listed by name only |
| Alerts | Rules in `functions/src/alerts.ts`, the Gateway attention ledger | New rules (§11), derived from facts |
| The staff assistant | Being built now: a function `assistant` calling Claude (`claude-opus-5-5`, Anthropic TypeScript SDK, secret `ANTHROPIC_API_KEY`) in a tool loop over the machine surface, with commands proposed by the model and confirmed by the person | The site assistant reuses the same core with a far narrower tool set per audience (§9) |

What does **not** exist and is built here: customer accounts for consumers, customer users and invitations, customer-scoped reads, the portal screens, checkout and payments, the payment provider connection, the cashback ledger and rules, wallet passes, and the site assistant.

## 2. Who the portal serves

BASIS sells two ways, and the brief covers both:

- **Trade** — bridal ateliers, designers, salons, manufacturers, wholesalers (`CustomerType`). A company with several people. Orders are large, often against a quote, with payment terms, deposits before production and invoices.
- **Consumers** — the consumer line of module 18 (fragrance, apparel, bags, home scent). One person. Pays at checkout. Cashback and a wallet card matter most here.

**Proposed: one portal, one account model, two kinds of account.** `CustomerAccount.kind` is `trade` (linked to a customer `Company`) or `consumer` (a person, no company). Everything a customer sees is read through the account, so the rules (§3) are the same for both. Built trade-first (§12): trade customers exist today with real quotes, orders and shipments, while the consumer line has no commercial product yet. Cashback and the wallet card are designed for both kinds; whether trade earns cashback is question 3.

## 3. Accounts, users and keeping customers out of staff data

### 3.1 Identity

- Customers sign in with **the same Firebase Auth project** (`basis-inc`): email and password, plus Sign in with Apple and Google for consumers. Staff and customers are told apart by the custom claim `role` (`customer`) and by `User.principalType`. A separate Identity Platform tenant for customers was weighed: cleaner isolation, but it is a paid upgrade and needs a second sign-in configuration everywhere; the claim plus `@auth` (below) gives the same separation in data. Revisit if customer numbers grow large.
- `CustomerUser` links a signed-in person (`uid`) to one `CustomerAccount`, with a role **inside** that account: `admin` (manages the team, addresses, payment methods, sees money), `buyer` (orders, accepts quotes, pays), `viewer` (reads). A consumer account has one user, its admin.
- A staff member can never hold the `customer` claim on the same login, and a customer login can never be given a staff role: `setUserRole` refuses to cross `principalType`.

### 3.2 How customers arrive

- **Trade: invite only.** Sales invites a contact from the customer's page in the platform (`inviteCustomerUser`): an email with a one-time link (token stored only as a hash, valid 14 days); accepting sets the password and the claims. A customer admin can then invite colleagues. The site's existing wholesale application stays the front door: sales approves it, which opens the company, its profile and the first invitation.
- **Consumers: self sign-up** on `/account/register` (email verification required before ordering), or Sign in with Apple / Google. Each new consumer gets a `CustomerAccount` of kind `consumer` and a member number.

### 3.3 Data rules — enforced in `@auth`, not in the interface

- A new connector, `customer` (beside `platform` and `public`), holds every operation the portal calls. No portal screen calls a `platform` operation, and no `customer` operation is reachable with a staff role.
- Every `customer` query is scoped by the signed-in user, through `auth.uid`, never by an id the browser sends:
  ```graphql
  query MyOrders @auth(expr: "auth.token.role == 'customer'") {
    salesOrders(where: { customer: { customerAccounts_on_company: { exist: {
      customerUsers_on_account: { exist: { uid: { eq_expr: "auth.uid" }, status: { eq: active } } } } } } }) { … }
  }
  ```
  The same pattern covers quotes, shipments (through allocations of the account's orders), invoices, documents linked to those records, inquiries, payments, cashback entries and addresses.
- What never reaches a customer, by field selection in the `customer` connector: purchase prices, landed cost, margin, supplier identity, factory, lot and roll numbers beyond what a packing list already shows, internal notes, other customers, allocations' warehouse locations. A quote line shows the customer's price; a shipment shows the carrier, legs and ETA, never the cost.
- Writes go through functions that check the claim, the account membership and the account role, as the staff functions do (`callerOf` becomes `customerCallerOf` for these).

## 4. What a customer can do

| Area | Trade | Consumer |
|---|---|---|
| Overview | What is open: quotes awaiting an answer, orders in production or in transit with their next date, invoices due, cashback balance | Orders, cashback balance, the member card |
| Catalog | Fabrics and the Shade System with **their** price list and quantity breaks; specifications and shade cards from the existing catalog | The consumer line after handover, with retail prices |
| Quotes | Read, download the quotation PDF, accept or decline (`transitionQuote`; accepting opens the sales order as today) | — |
| Orders | Place an order from the price list or **reorder** a past one; a portal order arrives in the platform as `SalesOrder` `draft` with `source = portal` and is confirmed by sales (stock, lead time); see status, lines, documents | Checkout; paid orders confirm on payment |
| Payments | Deposits and balances per the order's schedule (§5.4), invoices due, pay by card, Apple Pay, Google Pay or bank transfer details | Pay at checkout |
| Shipments | Legs, ETA, documents (packing list, BL when filed) | Tracking |
| Documents | Everything linked to their quotes, orders and shipments | Receipts |
| Samples | Request samples and shade cards; see their status | — |
| Team and addresses | Admin invites and removes colleagues, sets roles, keeps ship-to and bill-to addresses (`Location` rows of the company) | Addresses |
| Cashback and card | Statement, balance, expiry; add the member card to Apple Wallet or Google Wallet (§6, §7) | Same |
| Assistant | Questions about the catalog and their own account; reorder proposals they confirm (§9) | Same |

**What staff see in the platform.** On the customer's page (module 09 Customers): an **Accounts** tab (users, roles, invitations, last sign-in, resend or revoke), portal orders arriving as drafts in the existing order ledger with their source marked, a **Payments** tab, and a **Cashback** tab (ledger and adjustments). Module 09 gains Payments and Cashback ledgers across customers; cashback rules live in Settings. Every portal action writes a `TimelineEvent` on the record it touched, so sales sees "accepted in the portal by …" on the quote.

## 5. Payments

### 5.1 Apple Pay and Google Pay are wallets, not processors

Apple Pay and Google Pay hand a tokenised card to a **payment processor**, which charges it. So the decision is which processor, and that processor must support both wallets on the web. On the web Apple Pay also requires the paying page's **domain to be verified** with Apple (a file served at `/.well-known/apple-developer-merchantid-domain-association`, registered through the processor), and it appears only in Safari and on Apple devices; Google Pay appears in Chrome and on Android.

### 5.2 Which processor

The processor follows **the legal entity that sells and receives the money**:

| Option | Fits when | Notes |
|---|---|---|
| **Stripe** (design default) | The seller is a company in a country Stripe supports | One integration covers cards, Apple Pay and Google Pay (Payment Element / Express Checkout Element), refunds, multi-currency, webhooks, domain registration for Apple Pay. Stripe has historically not onboarded Israeli-registered businesses — check current availability. If BASIS sells through an entity abroad (for example a Hong Kong company, which Stripe supports), Stripe is the natural choice |
| **PayPlus** | The seller is the Israeli entity and wants a modern API with hosted pages | Israeli acquirers' gateways; check that Apple Pay and Google Pay on the web are enabled on the account and their fees |
| **CardCom** | Israeli entity; long-established, invoices/receipts integrated | Same check |
| **Tranzila** | Israeli entity; widely used terminal and gateway | Same check |
| **Grow (formerly Meshulam)** | Israeli entity, smaller volumes, quick set-up with wallet payments and Bit | Same check |

Israeli sales also need a **tax receipt / invoice** for every payment from the accounting system; the Israeli gateways often produce it directly, Stripe does not. The existing `InvoiceRef` stays a pointer to that system; an integration with the accounting software is a later item.

The platform talks to the processor through one adapter (`PaymentProvider`: create a payment, confirm, refund, verify a webhook), so the choice is a connector setting plus one implementation, not a redesign. Question 2.

### 5.3 The flow

1. The portal asks a function (`startPayment`) for a payment against an order, a payment-schedule line or an invoice. The function computes the amount from the records (never from the browser), applies redeemable cashback if the customer chose it (§6.3), creates the payment at the processor and returns the client secret or hosted-page link.
2. The customer pays with card, Apple Pay or Google Pay in the processor's own element — **card details never touch BASIS servers** (PCI scope stays with the processor).
3. The processor calls `/api/payments/webhook/<provider>`; the function verifies the signature with the webhook secret, and appends a `PaymentEvent`. The payment's state (pending, authorised, captured, failed, refunded, disputed) is **derived from its events**, never set by hand.
4. A captured payment marks the schedule line or invoice as paid (the paid fields are derived from captured payments), confirms a consumer order, writes the timeline, and earns cashback (§6).
5. Refunds (`refundPayment`, finance and owner) go through the processor; the refund's events reverse the cashback earned on that money.

### 5.4 Trade terms

- `CustomerProfile.paymentTerms` stays the default. An order can carry a **payment schedule** in the shape purchase orders already use (`PaymentMilestone`: label, percent or amount, trigger `on_order` / `before_shipment` / `on_date` / net days, due date): for example 30% deposit on confirmation, 70% before shipment. A production run for a trade order can wait on the deposit as a gated milestone, as the supplier side does.
- Net terms (pay after invoice) remain; the portal shows the due date and offers to pay, it does not force it.
- Currencies: the order's currency (USD, EUR, ILS…). Money is fixed-point Int64 as everywhere (ten-thousandths in the database, converted to the processor's minor units only at the adapter's edge, in `packages/shared` value types).

### 5.5 Secrets

`PAYMENTS_API_KEY` and `PAYMENTS_WEBHOOK_SECRET` (names generic so the provider can change), set only by the owner in his terminal, listed by name in `CONNECTOR_SECRETS`. The publishable key is not secret and lives in the `payments` connector settings.

## 6. Cashback

### 6.1 The ledger

Cashback is a **ledger of entries**, append-only. The balance is the sum, never a stored number.

| Entry kind | When | Amount |
|---|---|---|
| `earned` | A payment is captured on an order | + percent of the paid goods value (not shipping, not tax), per the rule that applied; `availableOn` = after the return window (proposed: when the order is delivered + 14 days) |
| `redeemed` | Used at checkout | − the amount applied |
| `reversed` | A refund or cancellation of money that earned cashback | − proportional to the refund |
| `expired` | The sweep finds earned cashback past `expiresOn` and not used | − the unused remainder, oldest first |
| `adjusted` | A person with finance or owner role corrects or grants (goodwill, migration) | ±, with a reason, audited |

The statement in the portal and the staff ledger are the same entries. "Pending" and "available" are derived from `availableOn`; nothing is a hand-set status.

### 6.2 Rules

`CashbackRule`: who (account kind, `CustomerTier`, or a specific account), what (all, a product category from module 18, a fabric family, a product), rate in basis points, minimum order, cap per order, validity window, expiry period. The most specific active rule wins; the rule applied is stored on the entry, so changing a rule never rewrites history. Proposed starting point in question 3.

### 6.3 Redemption

At checkout the customer chooses to use available cashback; it becomes a **discount line** on the order (`SalesOrderLine` of kind discount — an `ADD COLUMN`), capped (proposed: up to 30% of the goods value), in the order's currency. Cashback is held in the account's currency; redemption across currencies is not offered at first.

### 6.4 Accounting

Unredeemed cashback is a **liability** in the books until used or expired. The ledger gives the accountant the month-end figure (earned, redeemed, expired, outstanding). The accountant should confirm the treatment, and whether VAT applies at earning or at redemption.

## 7. "A digital credit card" — what is possible, honestly

**A real payment card** (credit, debit or prepaid, usable in any shop) cannot be issued by BASIS itself. It needs a licensed issuer: in Israel, a licence under the payment-services regulation or a partnership with a licensed issuer — a bank or a credit-card company (Isracard, Max, Cal) that runs co-branded "club" cards; abroad, issuing platforms (Stripe Issuing, Marqeta and the like) are offered only in some countries and only to approved businesses, behind a sponsor bank. That is a commercial partnership with its own agreements, credit checks and regulation, not something this platform builds. It is kept as a later step: **a co-branded BASIS card with an issuer**, once the customer base justifies the conversation.

**What is buildable now, without a licence, and covers what the brief is after** — a card in the phone's wallet that identifies the member and shows their cashback:

- **Apple Wallet member card**: a pass (`.pkpass`) of style store card, signed with a Pass Type ID certificate from the owner's Apple Developer account. It shows the member number (with a QR or barcode for the showroom), name, tier and **live cashback balance**. Apple's pass web service (endpoints under `/api/wallet/v1/…`) lets the platform **push an update** whenever the balance changes; the phone refreshes the pass and can show a notification ("₪40 cashback added").
- **Google Wallet loyalty card**: a loyalty class for BASIS and a loyalty object per member through the Google Wallet API, added with a "Save to Google Wallet" link; the platform updates the object when the balance changes and Google pushes it to the phone. The functions' own Google service account can be the issuer's API user, so no extra key is stored.
- Both cards are **identity and balance only**. Paying at checkout still happens with the customer's own card through Apple Pay or Google Pay (§5); cashback is applied there.
- **Store credit and gift cards** (closed loop, spendable only at BASIS) can ride the same ledger and wallet pass later. Closed-loop credit is generally outside card-issuing regulation, but Israeli consumer-protection rules on gift vouchers (for example their minimum validity) apply — a lawyer should confirm before it is offered.

## 8. Ordering from the portal into operations

A portal order never bypasses operations: trade orders arrive as drafts for sales to confirm (stock and lead time are human decisions today), consumer orders confirm on payment and enter the existing allocation and shipping flow (`allocateSalesOrder`, `shipSalesOrder`). Reorder copies the lines of a past order at today's prices from the account's price list. Quantity units and put-ups follow the SKU, as in the platform.

## 9. The assistant on the customer site

The owner asked for an AI assistant on the customer site (2026-11-10). It reuses the core of the staff assistant being built now — the `assistant` function's loop around Claude through the Anthropic TypeScript SDK, its streaming, its confirmation of anything that changes data — with **a different and much narrower set of tools for each audience**. The tools are the boundary: the model can only do what its tools do, and every tool runs as the person (or the anonymous visitor) asking.

### 9.1 Two audiences, two tool sets

| | Anonymous visitor on the public site | Signed-in customer user |
|---|---|---|
| Can ask about | Fabrics and families, specifications, the Shade System and shade matching, applications, lead times as published, the brand story, how to order and become a trade customer | Everything on the left, plus **their own** orders, shipments, quotes, documents, invoices due, sample requests, cashback balance and statement |
| Tools | Reads through the `public` connector only (`@auth(level: PUBLIC)`): catalog, shades, published content. `requestSample` and `sendInquiry` go through the existing `receiveInquiry` path, with its limits | Reads through the `customer` connector, executed as the user (the Admin SDK's impersonation with the user's own claims, so `@auth` applies exactly as in the portal) — never staff ledgers, never `exportRows`. Proposals: reorder, accept a quote, request samples — each shown as a card the customer confirms, then run by the same function the portal's button runs |
| Never | Any customer, order or price-list data; prices beyond what the public site shows | Any data of another account; costs, suppliers, internal notes (the `customer` connector does not select them, so no prompt can reach them) |
| Hand-off to a person | "Talk to sales" creates an `Inquiry` (`source = assistant`) with the conversation attached | Creates an `Interaction` (or an `Inquiry` for a new topic) on the customer for sales, with the transcript; the customer sees "sales will answer by email" |

### 9.2 Model and effort

- **Default: `claude-opus-5-5`**, the current Opus, as in the staff assistant and the mail classifier. Effort `low` for anonymous visitors (catalog questions are routine) and `medium` for signed-in customers (several lookups across their records). The server-side refusal fallback is enabled (`fallbacks: "default"`), and a final refusal hands off to a person.
- **Cost option: `claude-haiku-5-5`** costs about a fortieth of Opus per token and is enough for many catalog questions, with less judgement on hard ones. That is the owner's decision (question 8); the model id and the effort are connector settings (`site_assistant`), so changing them is not a release.
- The system prompt, the tool definitions and the catalog summary are a frozen prefix with `cache_control`, so every turn after the first reads them at the cached rate.

### 9.3 Abuse and spend

- **Firebase App Check with reCAPTCHA Enterprise** on the assistant endpoint: only the real site can call it.
- Limits, kept in the database (not in a single instance's memory): per IP and per anonymous session (proposed: 20 turns a conversation, 60 turns an hour per IP, a few new conversations a minute), per signed-in user a daily turn limit; `max_tokens` capped per turn; long inputs cut at a fixed size with the visitor told.
- A **monthly spend limit** set by the owner in console.anthropic.com on the API key, and a switch in Settings › Connectors that turns the site assistant off (anonymous, customers, or both) without a release. An alert fires when the month's recorded usage passes a threshold (§11).

### 9.4 Prompt injection and safety

Text from visitors, customers, product descriptions and documents is data to the model, never instructions. The posture does not rely on the model resisting: no tool can reach data beyond the caller, every write needs the customer's click, and the anonymous assistant has no write tool except the same intake the public form already exposes. The assistant never asks for or accepts card numbers or passwords; payment always happens in the processor's element.

### 9.5 Languages

It answers in the visitor's language — Hebrew and English first, and the customer's own language (the `Contact.language`, or the language they write in) for trade customers abroad. The widget's interface strings go through the site's own translation, right to left in Hebrew. Hand-off summaries for sales are written in English and Hebrew, as the mail plan's summaries are.

### 9.6 Conversations and privacy

- Conversations are stored (`AssistantConversation`, `AssistantTurn`: audience, account if signed in, the turns, tool calls, token usage) so a hand-off carries its context and usage can be measured. Anonymous conversations are deleted after 90 days (proposed); a customer's stay with their account and are visible to them; staff see a conversation only when it was handed off, or with the owner role.
- The widget says it is an AI assistant, that conversations are kept to answer and improve service, and links to the privacy page. Conversation content goes to Anthropic's API under its commercial terms (API inputs are not used for training).

### 9.7 Cost — an estimate

At list prices for `claude-opus-5-5` ($4 per million input tokens, $20 per million output, $0.20 per million cached), one anonymous turn — about 5,000 cached tokens of prompt and tools, 1,500 fresh tokens of conversation and tool results, 400 tokens of thinking and answer — is roughly $0.015; a conversation of six turns, whose history grows, roughly $0.10–0.15. **Estimate:** 1,000 conversations a month ≈ $100–150 on Opus 5.5, a few dollars on Haiku 5.5. Signed-in conversations run more lookups at medium effort and cost perhaps twice as much each. Each turn records its token usage; Settings shows the month's figure.

## 10. Screens

### 10.1 The portal (public site, `apps/web`)

Proposed: under **`/account`** on the brand site, so the brand, the catalog and the account are one place and Apple Pay is verified on one domain. The site is prerendered; `/account/**` is a client-rendered section behind sign-in (the site's existing router), with `noindex`.

| Path | Screen |
|---|---|
| `/account/sign-in`, `/account/register`, `/account/invite/:token`, `/account/reset` | Sign-in (email, Apple, Google), consumer sign-up, accept an invitation, reset password |
| `/account` | Overview: what is open, next dates, balance, card |
| `/account/catalog`, `/account/catalog/:product` | The catalog with the account's prices, add to order |
| `/account/quotes`, `/account/quotes/:number` | Quotes; accept or decline; PDF |
| `/account/orders`, `/account/orders/:number`, `/account/orders/new` | Orders, an order with its payment schedule and documents, place or reorder |
| `/account/checkout/:number` | Payment: card, Apple Pay, Google Pay; cashback to apply |
| `/account/shipments/:number` | Tracking by legs |
| `/account/documents`, `/account/invoices` | Documents; invoices due and paid |
| `/account/samples` | Sample requests and their status |
| `/account/cashback` | Statement, balance, expiry; "Add to Apple Wallet" / "Save to Google Wallet" |
| `/account/team`, `/account/addresses`, `/account/profile` | Team (admins), addresses, own profile and language |

The assistant is a panel available on every public page (anonymous) and every account page (signed in). Hebrew and English with right-to-left in Hebrew, logical properties only, and the design system of the brand site (`docs/DESIGN_SYSTEM.md`) — the portal is the brand, not a SaaS dashboard. A separate hosting target (`portal`) was weighed and not proposed: a second site means a second domain to verify and a split brand.

### 10.2 The platform (staff)

| Where | Screen |
|---|---|
| Customers › a customer › Accounts | Users and roles, invitations (invite, resend, revoke), last sign-in, suspend |
| Customers › a customer › Payments, and Customers › Payments | Payments with their events, schedule lines due, refund (finance, owner) |
| Customers › a customer › Cashback, and Customers › Cashback | Ledger, balance, outstanding liability, adjust with a reason (finance, owner) |
| Customers › Assistant | Handed-off conversations, usage this month |
| Settings › Connectors | `payments` (provider, publishable key, whether the secrets are set), `wallet` (pass type id, issuer id), `site_assistant` (on/off per audience, model, effort, limits) |
| Settings › Cashback rules | Rules by tier, category, product, with validity |

## 11. Schema, functions, permissions, alerts

### 11.1 New types (only `CREATE` and `ADD COLUMN`)

```graphql
enum CustomerAccountKind { trade consumer }
enum CustomerUserRole { admin buyer viewer }
enum CustomerAccountStatus { active suspended closed }

type CustomerAccount @table {
  kind: CustomerAccountKind!
  company: Company                 # trade only
  displayName: String!             # consumer: the person; trade: the company's trading name
  memberNumber: String! @unique    # BM-000123, on the wallet card
  currency: String!                # cashback and default checkout currency
  locale: String
  status: CustomerAccountStatus!
  createdAt: Timestamp!
}

type CustomerUser @table(key: "uid") {
  uid: String!                     # = User.uid, principalType customer
  account: CustomerAccount!
  contact: Contact                 # trade: the company's contact
  role: CustomerUserRole!
  status: UserStatus!              # invited | active | suspended (existing enum)
  invitedByUid: String
  lastSignInAt: Timestamp
}

type CustomerInvitation @table {
  account: CustomerAccount!
  email: String!
  role: CustomerUserRole!
  tokenHash: String! @unique
  expiresAt: Timestamp!
  acceptedAt: Timestamp
  revokedAt: Timestamp
  createdByUid: String!
}

type CustomerAddress @table {
  account: CustomerAccount!
  location: Location!              # the existing Location table
  kind: String!                    # ship | bill
  isDefault: Boolean!
}

type OrderPaymentTerm @table {     # the customer-side twin of PaymentMilestone
  order: SalesOrder!
  label: String!
  percent: Int
  amount: Int64
  trigger: String!                 # on_order | before_shipment | on_date | net_days
  dueOn: Date
}

type CustomerPayment @table {
  account: CustomerAccount!
  order: SalesOrder
  term: OrderPaymentTerm
  invoice: InvoiceRef
  provider: String!                # stripe | payplus | cardcom | tranzila | grow
  providerRef: String! @unique
  amount: Int64!
  currency: String!
  method: String                   # card | apple_pay | google_pay | bank_transfer, as reported
  createdByUid: String
  createdAt: Timestamp!
}

type PaymentEvent @table {         # append-only; the payment's state is derived from these
  payment: CustomerPayment!
  type: String!                    # authorized | captured | failed | refunded | disputed | dispute_closed
  amount: Int64
  providerEventId: String! @unique # idempotency for webhooks
  occurredAt: Timestamp!
}

type CashbackRule @table {
  name: String!
  accountKind: CustomerAccountKind
  tier: CustomerTier
  account: CustomerAccount
  categoryCode: String             # module 18 category, fabric family or product code
  productCode: String
  rateBp: Int!                     # basis points
  minOrder: Int64
  capPerOrder: Int64
  expiryDays: Int
  validFrom: Date
  validTo: Date
}

type CashbackEntry @table {        # append-only; the balance is the sum
  account: CustomerAccount!
  kind: String!                    # earned | redeemed | reversed | expired | adjusted
  amount: Int64!                   # signed, in the account currency
  currency: String!
  order: SalesOrder
  payment: CustomerPayment
  rule: CashbackRule
  availableOn: Date
  expiresOn: Date
  reason: String
  createdByUid: String
  createdAt: Timestamp!
}

type WalletPass @table {
  account: CustomerAccount!
  platform: String!                # apple | google
  serial: String! @unique          # Apple serial or Google object id
  authTokenHash: String            # Apple pass web service
  lastPushedAt: Timestamp
}

type WalletDevice @table {         # Apple pass web service registrations
  pass: WalletPass!
  deviceLibraryId: String!
  pushToken: String!
}

type AssistantConversation @table {
  audience: String!                # anonymous | customer | staff
  account: CustomerAccount
  uid: String
  sessionHash: String              # anonymous: hashed session id, never the raw IP
  language: String
  handedOffAt: Timestamp
  inquiry: Inquiry
  createdAt: Timestamp!
}

type AssistantTurn @table {
  conversation: AssistantConversation!
  role: String!                    # user | assistant | tool
  content: Any!
  model: String
  inputTokens: Int
  outputTokens: Int
  cachedTokens: Int
  createdAt: Timestamp!
}
```

`ADD COLUMN`s: `SalesOrder.source` (platform | portal | assistant) and `SalesOrder.placedByUid`; `SalesOrderLine.kind` (goods | discount | shipping); `Inquiry.accountId`; `Inquiry.source` gains the value `assistant` (it is a string).

### 11.2 Functions

Accounts: `inviteCustomerUser`, `acceptCustomerInvitation`, `revokeCustomerInvitation`, `setCustomerUserRole`, `suspendCustomerUser`, `registerConsumer`, `saveCustomerAddress`. Ordering: `placePortalOrder`, `reorder`, `respondToQuote` (wraps `transitionQuote` for the customer), `requestSamplesAsCustomer`. Payments: `startPayment`, `paymentsWebhook` (on the `api` router), `refundPayment`, `saveOrderPaymentTerms`. Cashback: `saveCashbackRule`, `adjustCashback`, the earning and reversal handlers on `payment.captured` / `payment.refunded` in the outbox, and expiry in the sweep. Wallet: `walletPassApple` (issue the `.pkpass`), the Apple pass web service routes, `walletPassGoogle` (save link), the push on `cashback.changed`. Assistant: `siteAssistant` (anonymous and customer audiences, App Check enforced) sharing the core of `assistant`; `handOffConversation`.

### 11.3 Permissions

| Who | Can |
|---|---|
| Customer `viewer` | Read their account |
| Customer `buyer` | + order, reorder, accept or decline quotes, request samples, pay |
| Customer `admin` | + team, addresses, see invoices and money |
| Staff `sales`, `operations`, `owner` | Invite and manage customer users; see portal orders, payments and cashback |
| Staff `finance`, `owner` | Refunds, cashback adjustments, cashback rules, payment schedules |
| `owner` | Connectors and secrets (by name), assistant settings, all conversations |

### 11.4 Alert rules

`payments.failed` (a schedule payment failed or a dispute opened), `payments.deposit_overdue` (a deposit due before production not paid), `customers.invitation_pending` (not accepted after 14 days), `assistant.handoff_waiting` (a hand-off not answered within a working day), `assistant.spend_high` (the month's usage past the owner's threshold), `cashback.liability_high` (outstanding cashback past a threshold, for finance).

## 12. Slices

Each slice ends usable, deployed and in Hebrew.

1. **Accounts and the trade portal.** `CustomerAccount`, `CustomerUser`, invitations, the `customer` connector with `auth.uid` scoping, sign-in on `/account`; overview, quotes (accept/decline, PDF), orders (read), shipments, documents, invoices (read), samples, team and addresses; the Accounts tab in the platform. Trade customers can start using it at the end of this slice.
2. **The assistant on the site.** Once the staff assistant's core is in place: the anonymous assistant on the public pages (catalog, shades, intake, hand-off) and the signed-in assistant over the slice-1 reads, with App Check, limits, the connector switch and usage recording.
3. **Ordering and payments.** The processor chosen in question 2, `startPayment`, the webhook, `PaymentEvent`, order payment schedules, place and reorder, checkout with card, Apple Pay and Google Pay on the verified domain, refunds; the Payments tabs. Consumer accounts and self sign-up open here if the consumer line has a commercial product by then.
4. **Cashback.** Rules, the ledger, earning on captured payments after the return window, redemption at checkout, reversal on refund, expiry in the sweep, the statement in the portal, the Cashback tabs and the liability figure.
5. **The wallet card.** The Apple Wallet and Google Wallet member card with live balance and push updates; store credit and gift cards on the same ledger after the legal check.

## 13. What the owner opens or buys

| Item | For | Cost |
|---|---|---|
| A payment processor account with business verification (Stripe for an entity abroad, or an Israeli gateway for the Israeli entity — §5.2) | Slice 3 | Per-transaction fees; check current pricing with the chosen provider |
| A domain: **`basis-inc.net`** was found available on Google Cloud Domains at $12 a year (2026-11-05). Proposed: the brand site and `/account` move to it; Apple Pay on the web needs the domain verified | Slice 3 (sooner for brand and email) | $12 a year, plus about $0.20 a month for Cloud DNS |
| Apple Developer Program | The Apple Wallet pass certificate (and Sign in with Apple) | Already held: the owner's membership, team `97HE63NNKZ` (the team his other apps are signed with). BASIS gets its own Pass Type ID (`pass.com.basisinc.member`) and its own certificate in that team; nothing is shared with another project's certificates |
| Google Pay & Wallet Console issuer account | The Google Wallet loyalty card | No fee known; check at sign-up |
| The Anthropic API key (already planned for the mail classifier) with a monthly spend limit in console.anthropic.com | The assistant | Usage, §9.7 |
| A lawyer's check | Cashback terms, store credit and gift vouchers, the privacy notice for accounts and the assistant | — |
| The accountant | Cashback as a liability and its VAT treatment; receipts for portal payments | — |

## 14. Open questions for the owner

1. **Who first.** Proposed: trade customers first (slice 1 uses records that already exist); consumers join when the first consumer product is commercial. Or consumers first?
2. **Which entity sells, and so which processor.** Proposed: payments go to the entity that invoices. If it is the Israeli company, an Israeli gateway with Apple Pay and Google Pay (PayPlus or CardCom, after checking wallet support and fees); if a company abroad (for example in Hong Kong), Stripe. Which entity, and do you already work with a processor?
3. **Cashback.** Proposed: consumers and trade both earn, by tier — 2% standard, 3% preferred, 5% key as a starting point — available 14 days after delivery, expiring after 12 months, usable up to 30% of an order. Different rates, or consumers only?
4. **The digital card.** Proposed: now, a member card in Apple Wallet and Google Wallet with the live cashback balance; a real co-branded payment card later, as a partnership with an issuer (Isracard, Max or Cal). Agreed?
5. **Sign-up.** Proposed: trade by invitation only (the wholesale application approved by sales opens it); consumers sign up themselves with email, Apple or Google. Agreed?
6. **Domain.** Proposed: buy `basis-inc.net` now and move the brand site and the portal to it (needed for Apple Pay on the web and for email). Or keep `basis-inc.web.app/account` until payments?
7. **Trade orders.** Proposed: portal orders from trade customers arrive as drafts that sales confirms; only consumer orders confirm on payment. Should trade reorders of in-stock items confirm automatically?
8. **The assistant's model.** Proposed: `claude-opus-5-5` (low effort for visitors, medium for customers), about $100–150 a month per 1,000 visitor conversations (estimate), under a monthly limit you set; `claude-haiku-5-5` would cost a few dollars for the same. Which, and what monthly limit?
9. **The assistant for anonymous visitors.** Proposed: on from slice 2 on every public page, with the limits in §9.3 and hand-off to sales. Or only for signed-in customers at first?
