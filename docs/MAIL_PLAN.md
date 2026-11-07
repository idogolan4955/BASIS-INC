# Mail — the email department

How the company mailbox becomes part of the platform: mail is read in, sorted, and every message that asks for work proposes that work as actions on real records (a task on a purchase order, an inquiry, a quotation filed on a development dossier), which a person accepts or dismisses with one click. Written before the build, from the owner's brief of 2026-11-07: "צריך מחלקה של מיילים עם מיון חכם להקמת משימות/ פעולות במערכת" — an email department with smart sorting that creates tasks and actions in the system.

This document decides how mail gets in, the entities, the sorting rules and where the language model sits, the screens, the permissions and the order of the build (§9). It ends with the questions for the owner (§10). Nothing is built beyond it until the owner approves it. What is already in the system is reused, never duplicated.

**State.** The owner approved the plan with the proposed answers on 2026-11-07 ("Approve, start slice 1"). Taken as decided: the Gmail API, read-only (1); `claude-opus-5-5` at low effort for slice 2 (2); bring in the last 30 days at connection, with 0 and 90 offered on the Connect button (3, which had no proposal); only exact-reference links and thread inheritance run without a click (4); unsorted mail is the owner's (5); the mailbox is business-only and bank, tax and legal senders are kept from the model by rules (6); sending from the mailbox (7) waits for slice 3; everything is kept (8, purging deferred); summaries in both languages (9); module 19 in the Team group (10).

**Slice 1 is built** (2026-11-07), and differs from the text below in these points:

- Sorting by facts runs inside the intake, not through the outbox: it is cheap and never blocks storing (a failure stores the message for the owner). The outbox event `mail.received` is written for slice 2's classifier.
- A category `supplier_correspondence` joins §5.2 for supplier mail the facts cannot narrow further (the classifier will split it into quotation, production and invoice).
- Messages can also be **imported** as `.eml` files (owner and operations), into a mailbox of provider `import`. It is the same intake path, used for mail kept in another inbox and for the emulator checks.
- The raw message and attachments are kept in Storage when Storage is on; until then an attachment is read again from Gmail on demand (`getMailAttachment`), and an imported attachment cannot be opened (the screen says so).
- In slice 1 a person chooses the actions (link, task, inquiry, interaction, file, company, done, ignore, reopen) through one function, `actOnMail`; each is recorded as an accepted `MailAction`. Proposals and one-click accept arrive with the classifier in slice 2.
- Functions: `connectMailbox`, `disconnectMailbox`, `syncMailboxNow`, `mailStatus`, `onGmailNotification` (Pub/Sub topic `gmail-mail`), `syncMail` (every 10 minutes: catch-up and watch renewal), `importMailMessage`, `actOnMail`, `sortMailMessage`, `saveMailRule`, `getMailAttachment`. Those that talk to Gmail declare the secrets `GMAIL_CLIENT_SECRET` and `GMAIL_REFRESH_TOKEN`.
- Alert rules built: `mail.sync_stalled` and `mail.customer_unanswered`.

---

## 1. What the system already has, and what mail reuses

| Need | Already in the platform | Reused as |
|---|---|---|
| Work to do, with an owner and a date | `Task` (assignee, due, `entityType`/`entityId`), the open-task ledger, the overdue alert rule | An accepted "create task" action is a `Task` on the record the mail is about. No mail-specific to-do list |
| What happened to a record | `TimelineEvent` (append-only) and `AuditEvent` | A message linked to a record writes `mail_received` (or `mail_sent`) on that record's timeline; every accept and dismiss is audited |
| What needs attention | `Alert` rules in `functions/src/alerts.ts`, the Gateway attention ledger | New rules (§7, alert rules): proposals waiting, customer mail unanswered. Derived, never typed |
| Outgoing mail | `Message` (channel, recipient, subject, entity, provider reference), `sendDocumentEmail` | Stays the log of what the platform sends. Inbound mail is a different table (§3) because it is received, threaded and classified; the two meet in the thread view |
| Connector settings | `Connector` (key, settings) and `CONNECTOR_SECRETS` in `packages/shared/src/connectors.ts`; secrets only as Functions secrets the owner sets | A new connector key `mail` with the mailbox address and sync state; its secrets are listed by name only. The `email` connector's `replyTo` (`basisinc25@gmail.com`, already in production) is the same mailbox |
| Website intake | `Inquiry` (reference `INQ-26-…`, kind, sender, message, state), `markInquiry`, the `customers.inquiry_new` rule, `/customers/inquiries` | A customer inquiry that arrives by mail becomes an `Inquiry` too, with `source = email` (an `ADD COLUMN`), so the site and the mailbox feed one queue |
| Customer conversations | `Interaction` (kind `email`, customer, contact, opportunity, next step) on the Relationship tab | An accepted "log interaction" action is an `Interaction` of kind `email` |
| Parties | `Company` with roles (`supplier`, `customer`, `forwarder`, `odm`…), `Contact.email` | The sender is resolved to a contact and company by address and domain (§5.1). No second address book |
| Files | `Document` + `DocumentLink` with a role, Storage, `DocumentKind` (commercial invoice, packing list, bill of lading, quotation, certificate…) | An attachment filed on a record becomes a `Document` linked to it; until filed it stays a mail attachment |
| Commands with role checks | Callable functions, `requireRole`, and `/api/commands/<name>`, which runs the same callable (`CallableFunction.run`) as the caller | Accepting an action runs the existing function that does that thing (`updateMilestone`, `updateLeg`, `saveSourcing`, `logInteraction`…) as the person who clicked, with that function's own role check. Mail never writes to another module's tables directly |
| Development sourcing | `DevelopmentSourcing` (supplier, MOQ, lead time, unit cost, quotation document), `saveSourcing` (module 18) | A supplier quotation for a consumer product becomes a sourcing row on its dossier through `saveSourcing` |
| Cost confidentiality | Cost-role operations; supplier identity, purchase prices and landed costs never reach roles without cost access | Mail carries prices and supplier identity, so every message has an audience decided from facts (§6) and every query filters on it |

What does **not** exist and is built here: the mailbox connection and sync, the inbound message, thread and attachment records, the sorting rules, the classifier, proposed actions and their accept/dismiss, the inbox and actions screens, and the mail tab on record sheets.

## 2. How mail gets in

Three ways were weighed. `basisinc25@gmail.com` is a consumer Gmail address (not Google Workspace), which narrows the choice.

| | A. Gmail API with OAuth (recommended) | B. Forwarding into a provider's inbound webhook | C. IMAP with an app password |
|---|---|---|---|
| How | The platform is authorised once to read the mailbox. Gmail pushes a notification to a Pub/Sub topic in `basis-inc` on every change; a Pub/Sub-triggered function reads what changed through the history API | Gmail forwards every message to an address at Postmark (or Resend) inbound; the provider posts it as JSON to `/api/mail/inbound` | A scheduled function logs in over IMAP every few minutes |
| What it sees | Inbox **and sent mail**, threads, read state. Sent mail lets the platform know a customer was answered (§7, alert rules) | Only what is forwarded; no sent mail, no threads as Gmail keeps them | Inbox and sent, threads by headers |
| Latency | Seconds (push), with a ten-minute catch-up in the sweep | Seconds | Minutes (polling) |
| Security | Least privilege: scope `gmail.readonly` (read only; no sending, no deleting). Revocable from the Google account. No public endpoint: Gmail → Pub/Sub → function, all inside Google | A third party receives and stores every message; a public webhook to protect | The app password opens the whole account over IMAP; it cannot be scoped |
| Cost | Gmail API and Pub/Sub at this volume: nothing measurable | Postmark from about $15 a month; another provider account | Nothing |
| Owner sets up | An OAuth client in Google Cloud and one consent in the browser (§2.2) | A Postmark account, the inbound address, a Gmail forwarding rule confirmed by code | 2-Step Verification on the mailbox and an app password |
| Weak points | Gmail's read scopes are "restricted". An app used by its own owner on fewer than 100 accounts may run unverified (Google's personal-use exception): the consent screen shows "Google hasn't verified this app" once. Left in *Testing* status, the authorisation expires every seven days, so the app is published to *In production* without verification. To be re-checked against Google's policy at build time | Mail lives in two places; forwarding breaks silently if Gmail suspends it | Google keeps narrowing password access; polling cost and lag |

**Recommendation: A.** It sees both directions, needs no new vendor, keeps the mail inside Google, and is scoped to reading. The same OAuth client can later be granted `gmail.send` (a "sensitive", not restricted, scope) so replies and documents go out **from `basisinc25@gmail.com` inside the customer's thread** — which would make Resend or Postmark unnecessary for sending and unblock the `EMAIL_API_KEY` wait. That is question 7 in §10.

### 2.1 The sync

1. `connectMailbox` (owner) records the mailbox in `MailMailbox` and calls Gmail `users.watch` on the topic `projects/basis-inc/topics/gmail-mail` for all labels; Gmail answers with a `historyId` and an expiry (at most seven days).
2. A function on the topic (`onMessagePublished`, `europe-west1`) reads `users.history.list` from the stored `historyId`, fetches each new message (`format=raw`), and stores it (§3) — idempotent on Gmail's message id, so a repeated notification changes nothing.
3. The scheduled sweep renews the watch daily and, every ten minutes, catches up from the stored `historyId` in case a notification was lost. If Gmail says the `historyId` is too old, it re-reads the last seven days by query, again idempotently.
4. Each stored message emits `mail.received` into the outbox; the sweep's handler runs the sorting (§5). The sorting never blocks storing.

### 2.2 What the owner sets up himself

1. **Google Cloud console, project `basis-inc`:** enable the Gmail API; OAuth consent screen *External*, app name BASIS, support email `basisinc25@gmail.com`, scope `gmail.readonly`; publish to *In production* (personal use, unverified). Create an OAuth client of type *Desktop app*. The client id is not secret and goes into Settings › Connectors › Mail; the client secret is.
2. **Terminal:**
   ```bash
   firebase functions:secrets:set GMAIL_CLIENT_SECRET
   pnpm mail:connect --client-id <id>.apps.googleusercontent.com
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
   `pnpm mail:connect` (built in slice 1) opens Google's consent in the browser, signed in as `basisinc25@gmail.com`, receives the authorisation on `localhost`, and writes the refresh token straight into the secret `GMAIL_REFRESH_TOKEN` through `firebase functions:secrets:set --data-file -`. The token is never printed, never in chat, never in the repository. The Anthropic key comes from console.anthropic.com, with a monthly spend limit set there.
3. **Recommended:** 2-Step Verification on `basisinc25@gmail.com`; the mailbox now feeds the company's records.

The Pub/Sub topic and its publisher grant to `gmail-api-push@system.gserviceaccount.com` are created by the agent with `gcloud` once the owner approves (no cost at this volume). Mail depends on the Functions deploy, which itself waits for `EMAIL_API_KEY` ([GO_LIVE](GO_LIVE.md) steps 5–6).

## 3. Data model

Schema file `dataconnect/schema/mail.gql`. Only `CREATE` and `ADD COLUMN`. Categories and action kinds are strings validated by the registry in `packages/shared/src/mail.ts` (like `DocumentLink.role`), so a new category or action is a code line in one place, not an enum migration.

```
MailMailbox @table                  # one today; the model allows sales@ on a domain later
  address: varchar(255) @unique
  provider: varchar(16)            # gmail
  historyId: varchar(40)           # the sync cursor
  watchExpiresAt: Timestamp
  lastSyncAt: Timestamp, lastError: String
  state: connected | paused | disconnected
  connectedByUid, createdAt

MailThread @table
  mailbox: MailMailbox!
  providerThreadId: varchar(40)    # unique per mailbox
  subject: varchar(300)
  firstAt, lastAt: Timestamp
  lastInboundAt, lastOutboundAt: Timestamp   # "answered" is derived from these
  audience: MailAudience!          # the most restrictive of its messages (§6)
  # the records the thread is about are MailLink rows

MailMessage @table
  mailbox: MailMailbox!, thread: MailThread!
  providerMessageId: varchar(40)   # unique per mailbox; storing twice is impossible
  internetMessageId: varchar(300)  # Message-ID header, for In-Reply-To matching
  direction: inbound | outbound    # outbound = seen in Sent, written outside the platform
  fromAddress, fromName, to: Any, cc: Any, replyTo
  subject, sentAt, receivedAt
  snippet: varchar(300)
  bodyText: String                 # plain text, quoted history trimmed for display, full text kept
  hasHtml: Boolean!
  rawPath: varchar(400)            # the .eml in Storage under mail/<mailbox>/<id>.eml
  contact: Contact, company: Company        # resolved sender (§5.1), null when unknown
  audience: MailAudience!          # restrictive until sorted (§6)
  state: received | sorted | needs_review | done | ignored
  flags: Any                       # bulk, auto_reply, phishing_suspect, has_prices, has_bank_details
  createdAt

MailAttachment @table
  message: MailMessage!
  filename, mimeType, sizeBytes, checksum
  storagePath: varchar(400)
  document: Document               # set when filed on a record; never filed twice

MailLink @table                     # what a thread or message is about
  thread: MailThread!, message: MailMessage
  entityType: varchar(40), entityId: varchar(80)   # purchase_order PO-26-0003, shipment SHP-26-0004, development_product DEV-26-0012…
  basis: reference | thread | sender | model | person   # how the link was made
  createdByUid, createdAt

MailClassification @table           # append-only; a re-sort is a new row, the latest counts
  message: MailMessage!
  method: rules | model | person
  category: varchar(40)            # §5.2
  audience: MailAudience!
  ownerRole: Role                  # the department it belongs to
  urgency: low | normal | high
  confidence: Int                  # 0–100, model only
  language: varchar(16)
  summary: varchar(400)            # one sentence, English; summaryHe for the Hebrew interface
  summaryHe: varchar(400)
  model: varchar(40)               # claude-opus-5-5, when method = model
  usage: Any                       # input, cached and output tokens, for the cost figure
  createdByUid, createdAt

MailAction @table                   # one proposed piece of work
  message: MailMessage!, classification: MailClassification
  kind: varchar(40)                # §4
  targetType, targetId             # the record it acts on, when there is one
  payload: Any                     # the fields of the action, validated by the kind's zod schema
  audience: MailAudience!          # an action is never more visible than its message
  state: proposed | accepted | dismissed | failed | superseded
  resultType, resultId             # what accepting created: task id, INQ-26-0012, document id
  decidedByUid, decidedAt, dismissReason, error
  version: Int!                    # accepting twice is refused on the version
  createdAt

MailRule @table                     # the owner's own sorting rules, checked before the model
  match: Any                       # { fromAddress | fromDomain | subjectContains | listId }
  category, audience, ownerRole
  skipModel: Boolean!              # never send matching mail to the model
  ignore: Boolean!
  sort: Int!, createdByUid, createdAt, archivedAt

enum MailAudience { general  commercial  supply  logistics  owner }
```

`Inquiry` gains `source` (`site` default, `email`) and `mailMessageId` — two `ADD COLUMN`s. Nothing else outside `mail.gql` changes.

Mail is not given business numbers: a message is found by sender, subject, record and date, and Gmail's volume would outrun a four-digit sequence.

## 4. Actions

An action is a proposal to run something the platform already does. The registry in `packages/shared/src/mail.ts` defines, per kind, its payload schema, the function that executes it, and the label shown on the button. Accepting is `acceptMailAction({ id, version, overrides })`: it validates the payload (with any fields the person changed), runs the executing function **as the caller** through `CallableFunction.run` (so its role check and invariants apply unchanged), records `resultType`/`resultId`, writes `MailLink` and a timeline event on the record, and audits. A failure leaves the action `failed` with the function's own message, ready to edit and retry.

| Kind | What accepting does | Executes through | Typical source |
|---|---|---|---|
| `link_record` | Links the thread to a record; the record's timeline shows the mail | mail (internal) | A reference in the subject, a reply in a linked thread |
| `create_task` | A `Task` on the record, title and due date proposed, assignee chosen at accept (preset when the department has one person) | `CreateTask` path used by the ledger | Any mail that asks for something |
| `create_inquiry` | An `Inquiry` with `source = email`, kind `sample_request`, `wholesale` or `contact`; the existing queue and alert take over | mail → `Inquiry` insert as `receiveInquiry` does | An unknown sender asking about fabrics or samples |
| `log_interaction` | An `Interaction` of kind `email` on the customer, with a next step if the mail implies one | `logInteraction` | Correspondence with a known customer |
| `file_attachment` | The attachment becomes a `Document` of the proposed kind, linked to the record | `fileGeneratedDocument`'s filing path, extended to uploads | A BL, invoice, packing list, certificate, inspection report, quotation |
| `record_sourcing_quote` | A `DevelopmentSourcing` row (supplier, MOQ, lead time, unit cost, currency, validity), quotation document attached | `saveSourcing` | A supplier or ODM quotation for a consumer product |
| `update_milestone` | Opens the milestone dialog prefilled with the new forecast date and the reason quoted from the mail; the person saves | `updateMilestone` | "Dyeing will finish on the 20th instead of the 14th" |
| `update_leg` | Opens the leg dialog prefilled with ETD/ETA or an actual departure or arrival | `updateLeg` | Forwarder booking confirmations, departure and arrival notices |
| `create_company` | A new company with the role proposed and the sender as its first contact | the company register's create path | A new supplier, forwarder or customer writing in |
| `mark_done` / `ignore` | The message leaves the queue; nothing else changes | mail (internal) | Notifications, newsletters, answered threads |

Two rules follow from "status is derived":

- **The model never changes a fact.** A date in a supplier's mail is evidence, not a fact, until a person with the right role accepts it. Milestone and leg updates therefore open the existing dialog prefilled instead of saving on click; every other kind is one click.
- **Nothing runs without a person,** except what is decided from facts and changes no business state: linking a thread by an exact reference that exists (`PO-26-0003` in the subject) and inheriting a thread's links on a reply. Wider automatic acceptance is question 4.

## 5. Sorting

Every message passes the same pipeline, cheapest first. Each stage can settle the message; the model sees only what the rules could not settle, and never mail the rules keep from it.

### 5.1 Facts first (no model)

1. **Sender.** `fromAddress` against `Contact.email`; then the domain against the domains of the company's contacts (public domains such as gmail.com, qq.com, 163.com, outlook.com match by full address only). The result is a contact, a company and its roles.
2. **References.** Regular expressions over subject, body and attachment names for the platform's numbers (`PO-`, `RUN-`, `LOT-`, `CTN-`, `SHP-`, `INS-`, `CAR-`, `INQ-`, `DEV-`, quote and order numbers), container numbers (ISO 6346, check digit verified), and the booking, BL and AWB references recorded on shipments. A match that exists is an exact link.
3. **Thread.** A reply (by `In-Reply-To`/`References` or Gmail's thread) inherits the thread's links and audience.
4. **Noise.** `List-Unsubscribe`, `Precedence: bulk`, auto-replies (`Auto-Submitted`), `no-reply` senders: category `newsletter` or `notification`, no model call.
5. **The owner's rules** (`MailRule`), in order: a sender or domain to a category, audience and department; `skipModel` for mail that must never leave Google (bank, accountant, legal); `ignore`.

### 5.2 Categories

| Category | Department (`ownerRole`) | Audience floor |
|---|---|---|
| `customer_inquiry` — a new party asking about fabric, samples, wholesale | sales | commercial |
| `customer_correspondence` — a known customer: quote, order, delivery, complaint | sales | commercial |
| `supplier_quotation` — prices, MOQ, lead times | purchasing | supply |
| `supplier_production` — progress, delays, lab dips, photos from a mill | purchasing | supply |
| `supplier_invoice` — invoices, payment requests, bank details | finance | supply (owner when it carries bank details) |
| `logistics` — bookings, BL/AWB, ETD/ETA, customs, arrival notices, forwarder invoices | logistics | logistics |
| `quality` — inspection reports, claims, corrective actions | qc | supply when from a supplier; general from an inspection agency |
| `development` — ODM samples, consumer-line quotations and proposals | operations | supply |
| `marketing` — press, collaborations, events, platforms | marketing | general |
| `finance_admin` — bank, tax, accountant, Google and other bills, account security | owner | owner |
| `notification` / `newsletter` | — | general |
| `spam` / `phishing_suspect` | — | owner |
| `other` | owner | owner |

### 5.3 The classifier

Where the rules leave a message unsorted (or sorted but with work to propose), one call to Claude through the Anthropic API from the sorting function in `europe-west1`.

- **Model.** `claude-opus-5-5` (the current Opus) at effort `low`: classification is routine work and lower effort spends far less. Structured output through `output_config.format` with a JSON schema generated from the zod schema in `packages/shared/src/mail.ts` — no tool use, no free text. Server-side refusal fallback enabled (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`); a final `refusal` leaves the message `needs_review`. The model id is a setting on the `mail` connector, so changing it is not a release (question 2).
- **What it receives.** Headers, the resolved sender and its company roles, the references found, the body as plain text (quoted history trimmed; long mail is sent whole up to a limit and, beyond it, the first and last parts with a stated gap), attachment names and sizes, and a short list of **candidate records** the facts point to: the sender's open purchase orders and runs, the forwarder's open shipments, the dossiers where the company is a sourcing candidate, the customer's open quotes and orders. PDFs are read only in slice 3 and only for categories whose actions need their content (quotations, invoices, BLs).
- **What it returns.** Category, department, urgency, confidence, language, a one-sentence summary in English and in Hebrew, flags (`has_prices`, `has_bank_details`, `phishing_suspect`), and up to five proposed actions, each naming a kind from the registry and, when it acts on a record, a record **from the candidate list**. A proposal naming a record that was not offered, or failing its payload schema, is dropped and logged.
- **Prompt injection.** Mail is written by strangers. The system prompt states that the message is data, the model has no tools, and its output is only proposals that a person reviews; at worst an injected message produces a wrong proposal that is dismissed. The model's audience can only be **raised** above the floor set by the facts, never lowered (§6).
- **Caching and cost.** The system prompt, taxonomy, action registry and schema are a frozen prefix with `cache_control`, so every call after the first reads them at the cached rate; the message comes after the breakpoint. At current list prices (Opus 5.5: $4 per million input tokens, $20 per million output, $0.20 cached) a typical message — about 3,000 cached tokens, 2,500 fresh tokens, 600 tokens of output and thinking — costs about $0.02–0.03. At 50 messages a day that is roughly $30–45 a month; the rules usually settle a third to a half of a business mailbox before the model is called. The same work on `claude-haiku-5-5` would cost about a twentieth of that. Each classification stores its token usage, and Settings › Connectors › Mail shows the month's figure.
- **Back-filling history** (question 3) runs through the Message Batches API, which costs half and has no hurry.
- **Data.** Mail content goes to Anthropic's API under its commercial terms (API inputs are not used for training). Mail under a `skipModel` rule, mail in the `owner` audience by rule, and mail flagged by the facts as carrying bank details is never sent.

### 5.4 Corrections

A person may change a message's category, audience or department, or dismiss an action with a reason. Each change is a `MailClassification` with `method = person`. Slice 3 turns repeated corrections into suggested `MailRule`s ("mail from @fastfreight.cn has been moved to logistics five times — make it a rule?") and adds the latest corrections as examples in the classifier's prefix, refreshed daily so the cache holds.

## 6. Who sees which mail

Every message has an audience. Queries filter on it **in the operation**, like the cost rule: there is one list operation per audience group, each with `@auth` for its roles, and the interface merges what the signed-in role may call. A hidden row in the interface is never the control.

| Audience | Who reads it | Why |
|---|---|---|
| `general` | every role with module 19 | Marketing, notifications, quality agencies |
| `commercial` | owner, operations, sales, marketing, finance | Customer identity and prices to customers, as in module 09 |
| `supply` | owner, operations, purchasing, finance | Supplier identity and purchase prices are cost data |
| `logistics` | owner, operations, logistics, purchasing, finance | Forwarder costs are logistics costs; forwarders are not suppliers of goods |
| `owner` | owner | Bank, tax, accounts, security, spam, and everything not yet sorted |

- **Restrictive until sorted.** A message is stored at `owner` and opens to its audience only once sorted. A thread's audience is the most restrictive of its messages.
- **The floor comes from facts.** A sender whose company has the `supplier` or `odm` role puts the message in `supply` whatever the model says; `forwarder` in `logistics`; `customer` in `commercial`. The model and the owner's rules can raise it; only a person with the owner role can lower it.
- **Actions inherit it.** A proposed action is never more visible than its message. A task created from supply mail for a QC inspector carries a title and the record's number, not the supplier's name or prices.
- **Attachments and raw mail** live under `mail/` in Storage, unreadable to the client in `storage.rules`; a function serves them after the same audience check, as signed short-lived links.
- **Record sheets** show a Mail tab with the linked threads the signed-in role may read, through the same operations.

### Module 19 access

| Module 19 Mail | owner | operations | purchasing | qc | logistics | sales | marketing | finance | viewer |
|---|---|---|---|---|---|---|---|---|---|
| Inbox and message (within audience) | manage | manage | manage | read | manage | manage | manage | read | – |
| Accept or dismiss actions | manage | manage | manage | limited | manage | manage | manage | limited | – |
| Change category, audience, department | manage | limited (not lower audience) | – | – | – | – | – | – | – |
| Rules | manage | – | – | – | – | – | – | – | – |
| Mailbox connection | manage | – | – | – | – | – | – | – | – |

`qc` and `finance` accept only the actions whose executing function they may already call. The executing function's own `requireRole` is the hard limit either way.

## 7. Screens

Module **19 Mail** in the rail, paths under `/mail`. The same system as every sheet and ledger: [DESIGN_SYSTEM](DESIGN_SYSTEM.md) applies, including its "never" list. Hebrew and right-to-left from the first screen; addresses, references and dates stay left-to-right.

| Path | Screen | What is on it |
|---|---|---|
| `/mail` | **Inbox** | A ledger, not a mail client: sections *Needs a decision* (messages with open proposals), *New*, *Filed*, *Ignored*. Row: received date (mono), sender (contact and company when known; the address when not), subject, category as a square chip and a word, the record references in mono, the number of open proposals, and unread shown as a dot and a word. Filters: department, category, audience (only the ones the role may read), record, sender. Phones: a list, newest first, proposals first |
| `/mail/:id` | **Message** | Label header: sender, company and its role, category, department, audience, received, thread length. Body as text; the HTML version in a sandboxed frame on request, remote images blocked (tracking pixels), every link shown with its real host. Attachments with *File to…*. **Proposed actions** as rows: verb, target record in mono, the key fields, and *Accept* (primary), *Edit*, *Dismiss*. The classification: summary, why, confidence, *Re-sort*, *Change*. The thread's other messages, inbound and sent. Timeline |
| `/mail/actions` | **Actions** | Every open proposal across mail the role may read, grouped by department and record: accept or dismiss on the row with one click, or with the keyboard (`A` accept, `D` dismiss, `E` edit, `J`/`K` move). The screen the owner opens to clear the morning's mail |
| `/mail/rules` | **Rules** | The owner's rules in order, with how many messages each matched in thirty days; senders the platform knows and the company each resolves to; suggested rules from corrections (slice 3) |
| Settings › Connectors › Mail | **Mailbox** | Address, state, last sync, watch expiry, the month's messages, model calls and cost; the OAuth client id; which secrets the functions can see (by name); the model in use; the command to reconnect |

On record sheets — company, purchase order, production run, shipment, inquiry, quote, sales order, development dossier — a **Mail** tab lists the linked threads. The Gateway's attention ledger shows the mail rules below; no new Gateway zone.

### Alert rules

| Rule | Raised when | Owner role |
|---|---|---|
| `mail.decision_waiting` | A message has open proposals older than 4 working hours (high urgency: 1 hour) | the department's |
| `mail.customer_unanswered` | A `commercial` thread's last message is inbound from a customer and no reply was sent from the mailbox within one working day — read from `lastInboundAt` and `lastOutboundAt`, never a flag | sales |
| `mail.unsorted` | A message stayed `needs_review` for a day | owner |
| `mail.sync_stalled` | No sync for an hour, or the watch expires within a day | owner |
| `mail.phishing_suspect` | A message from an unknown sender asks for payment or carries changed bank details | owner (critical) |

## 8. Security and privacy

- Read-only scope; the platform cannot send, delete or change mail in Gmail until `gmail.send` is approved (question 7). Revoking access in the Google account stops everything; the platform reports `mail.sync_stalled`.
- No public endpoint: Gmail → Pub/Sub → function inside the project.
- Secrets `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `ANTHROPIC_API_KEY`: set only by the owner in the terminal, listed by name in `CONNECTOR_SECRETS`, never stored in the database, never printed.
- HTML is never rendered unsandboxed; attachments are never opened by the platform beyond reading PDF text for the classifier.
- Mail is records, kept like timeline events: nothing is deleted when it is deleted in Gmail. Purging the bodies of spam and newsletters after a period is question 8.
- Every accept, dismiss, re-sort, audience change and rule change is an `AuditEvent`.

## 9. Slices

1. **Mail in, sorted by facts.** Schema (§3), the `mail` connector and `pnpm mail:connect`, `connectMailbox`, the Pub/Sub sync and catch-up, Storage, sender resolution, references, threads, noise and the owner's rules (§5.1), audiences (§6). The inbox, the message sheet, the Mail tab on record sheets, Settings › Connectors › Mail. Actions chosen by a person from the message (link, task, inquiry, interaction, file attachment, company, done, ignore) through `acceptMailAction`. Alert rules `mail.sync_stalled`, `mail.customer_unanswered`. Sample mode with sample mail; Hebrew. At the end of this slice every message is in the platform, linked to its records where a reference or a sender says so, and visible only to whom it should be.
2. **Smart sorting.** The classifier (§5.3), proposed actions with one-click accept and dismiss, the Actions screen, the categories and departments, `mail.decision_waiting`, `mail.unsorted`, `mail.phishing_suspect`, the cost figure in Settings.
3. **Depth.** Milestone and leg updates proposed with the dialogs prefilled; PDF reading for quotations, invoices and BLs; `record_sourcing_quote` into module 18; corrections into suggested rules and examples; back-fill through the Batches API; replies and documents sent from the mailbox through Gmail if question 7 is answered yes, with drafts written by the model in the sender's language and sent only by a person.

Slice 1 is useful without any model and without any new cost; slice 2 is the "smart" part of the brief.

## 10. Open questions for the owner

1. **How mail gets in.** Proposed: the Gmail API with read-only access (§2, option A). The alternatives are forwarding to Postmark (a paid provider holds a copy) or IMAP with an app password (full account access, polling).
2. **The model.** Proposed: `claude-opus-5-5` at low effort, about $30–45 a month at 50 messages a day. `claude-haiku-5-5` would cost about $2 a month for the same volume, with less judgement on hard mail. Which one, and is a monthly spend limit (for example $50) acceptable?
3. **Volume and history.** About how many messages a day reach `basisinc25@gmail.com`? Import the existing mail from the last 30 days, 90 days, or start from the day of connection?
4. **Automatic acceptance.** Proposed: only linking by an exact reference and replies inheriting their thread run without a click. Should more run on their own — for example filing a BL attached to a mail that names its shipment?
5. **Unsorted mail.** Proposed: only the owner sees a message until it is sorted. Should operations see it too?
6. **What else is in the mailbox.** Is `basisinc25@gmail.com` business-only? Bank, tax and account mail is kept from the model by rule; are there senders that must never leave Google at all?
7. **Sending from the mailbox.** With one more permission (`gmail.send`), the platform could send documents and replies from `basisinc25@gmail.com` inside the customer's thread, and Resend or Postmark would no longer be needed (nor would `EMAIL_API_KEY`). Yes, or keep a sending provider?
8. **Keeping mail.** Proposed: everything is kept; spam and newsletter bodies are purged after 90 days. Keep everything forever instead?
9. **Summaries in Hebrew.** Proposed: each summary in English and Hebrew (a few tokens more). Hebrew only, English only, or both?
10. **The module.** Proposed: 19 Mail in the rail, beside Board and Goals. A future brand-site content module takes the next number.
