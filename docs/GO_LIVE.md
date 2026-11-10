# Going live — the first production deploy of the backend

The platform at `basis-inc-hq.web.app` was deployed until 2026-11-07 from the
sample build (`pnpm build:demo`): the whole interface on in-memory sample
records, no backend. This document is the exact sequence that turns it into
the live system. Each step is idempotent; a step that has already happened
can be run again without harm.

State on 2026-11-07: every step is done. Authentication has Email/Password on
and `basis-inc-hq.web.app` among its authorized domains (the "email link"
switch is still to be turned off: password only). The database was migrated
and Data Connect deployed; the production seed ran (owner account, reference
data, the launch catalog without SKUs, the consumer line of module 18); the
live build replaced the demo on `basis-inc-hq.web.app`. `EMAIL_API_KEY` holds
the `unset` placeholder and all 66 functions are deployed with the Storage
rules, so the platform reads and writes. Outgoing email waits for a provider
account (Resend or Postmark), a verified sending domain and the real key;
`basisinc25@gmail.com` is recorded as the email connector's reply-to. Function
images older than a day are cleaned up by the Artifact Registry policy in
`europe-west1` (`firebase functions:artifacts:setpolicy --location europe-west1`).
Steps marked **owner** change account settings or
are refused to an agent; the rest can be run by anyone with access to the
project.

## 1. Blaze (done 2026-10-14)

`basis-inc` is linked to the billing account the owner chose. The APIs for
Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc, Pub/Sub,
Cloud Scheduler, Secret Manager and Storage are enabled. The Data Connect
Cloud SQL instance (`basis-db`, `europe-west1`) is the one recurring cost.

## 2. Firebase Authentication (owner, done 2026-11-07)

In the Firebase console, Authentication › Get started, then Sign-in method ›
Email/Password › enable (password sign-in only; no email link). Under
Settings › Authorized domains add `basis-inc-hq.web.app`. The platform's
"Reset password" is Firebase's own email, so no mail provider is needed for
sign-in.

## 3. Storage (owner, done)

Firebase console › Storage › Get started, location `europe-west1`, production
rules. The default bucket must be `basis-inc.firebasestorage.app`, the name
the platform and the functions use. The rules file in the repository
(`storage.rules`) is deployed in step 6.

## 4. Data Connect and the database (done 2026-11-07)

```bash
firebase deploy --only dataconnect
```

The first run creates the Cloud SQL instance and database (10 to 15 minutes)
and applies the schema as `CREATE` statements. On later runs read the SQL
that `firebase dataconnect:sql:diff` prints before deploying: only `CREATE`
and `ADD COLUMN`, never `DROP` without the owner's explicit approval.

## 5. Secrets (owner, only for outgoing email; placeholder set 2026-11-07)

```bash
firebase functions:secrets:set EMAIL_API_KEY
```

Two functions (`connectorStatus`, `sendDocumentEmail`) declare this secret,
and the CLI asks for its value at the first functions deploy even when only
other functions are being deployed. Without an email provider yet, answer
the prompt with the word `unset`: the functions treat that placeholder as
no key, the email connector reports the secret as missing, and the real
value replaces it later with the command above.

Module 19 (Mail, [MAIL_PLAN](MAIL_PLAN.md)) adds one more secret, the
mailbox's Google App Password, which the mail functions declare. Create it in
the Google account `basisinc25@gmail.com` (2-Step Verification on, then
https://myaccount.google.com/apppasswords) and paste it when asked; until
then the placeholder `unset` lets the functions deploy:

```bash
firebase functions:secrets:set GMAIL_APP_PASSWORD
```

## 6. Functions and Storage rules (done 2026-11-07; module 19's schema, mail functions and interface deployed 2026-11-10, `GMAIL_APP_PASSWORD` set)

With the secret set, or the `unset` placeholder in place:

```bash
firebase deploy --only functions,storage
```

The long form, every function except the two email ones, is only needed
when the secret must not exist at all:

```bash
firebase deploy --only storage,functions:api,functions:evaluateAlerts,functions:inviteUser,functions:setUserRole,functions:sweepEvents,functions:createPurchaseOrder,functions:issuePurchaseOrder,functions:confirmPurchaseOrder,functions:cancelPurchaseOrder,functions:createProductionRun,functions:updateMilestone,functions:recordLot,functions:packHandlingUnit,functions:setLotQuality,functions:fileGeneratedDocument,functions:createApiToken,functions:revokeApiToken,functions:saveConnector,functions:markInquiry,functions:createInspection,functions:recordInspection,functions:submitInspection,functions:signOffInspection,functions:createCorrectiveAction,functions:updateCorrectiveAction,functions:createShipment,functions:updateShipment,functions:assignHandlingUnits,functions:removeHandlingUnits,functions:bookShipment,functions:cancelShipment,functions:updateLeg,functions:recordShipmentCost,functions:recordCustomsEntry,functions:setFxRate,functions:allocateShipmentCosts,functions:createStockLocation,functions:receiveShipment,functions:recordStockMovement,functions:setReorderPolicy,functions:upsertCustomerProfile,functions:saveQuote,functions:transitionQuote,functions:createSalesOrder,functions:transitionSalesOrder,functions:allocateSalesOrder,functions:shipSalesOrder,functions:recordInvoice
```

Functions run on Node 22 (`firebase.json`, `functions/package.json`). The
`api` function sits behind the Hosting rewrite `/api/**` on both sites.

## 7. Reference data and the owner's account (done 2026-11-07)

Needs Application Default Credentials for the project once:

```bash
gcloud auth application-default login
```

Then:

```bash
pnpm seed:production --owner idogolan40@gmail.com --name "Ido Golan"
```

This creates the owner's Auth account with the `owner` claim and its User
row, and seeds countries, currencies, units, Incoterms, number sequences, the
launch catalog (families, products, variants, shades, put-ups; no SKUs, those
are chosen per item in the platform; add `--with-skus` to create them all),
process and inspection templates, places and document requirements. No
password is set: on the sign-in page enter the email, choose "Reset
password", and set it from the email Firebase sends.

## 8. The live platform build on Hosting (done 2026-11-07)

```bash
pnpm --filter @basis/platform build && firebase deploy --only hosting:platform
```

`build` (not `build:demo`) talks to Auth and Data Connect in production. The
Vite config sets `strictExecutionOrder`: without it the chunk graph's cycles
made the first live build load blank. The
web API key is already restricted to the BASIS origins. From this point the
sample build is only for `pnpm --filter @basis/platform dev:sample`.

## 9. Check

- Sign in at `basis-inc-hq.web.app`; the Gateway opens empty, no "Sample mode" under the avatar.
- Settings › People shows the owner with the owner role.
- Products shows the launch range with no SKUs; create one SKU from the shade palette and open it.
- `https://basis-inc-hq.web.app/api/health` answers.
- Scheduled `sweepEvents` appears in Cloud Scheduler.

## Still local only

The Storage emulator needs Java; without it filed documents are regenerated
on open in development. Production is unaffected.

## BASIS AI (module 20, 2026-11-10)

`ANTHROPIC_API_KEY` holds the owner's second key (version 2, set
2026-11-10), which the API accepts; the first was not scoped to a workspace.
If a key without a workspace is ever set again, either of these fixes it
(owner):

- In the Anthropic Console, open a workspace, create an API key inside it,
  and set it: `firebase functions:secrets:set ANTHROPIC_API_KEY`; or
- keep the key and name the workspace: put `ANTHROPIC_WORKSPACE_ID=wrkspc_…`
  in `functions/.env.basis-inc` and deploy the functions again.

Set a monthly spend limit on the workspace in the Console. The schema for
BASIS AI (threads, messages, actions) deploys with `firebase deploy --only
dataconnect`; read the SQL first, it only creates tables and enums.

## Customer portal, slice 1 (2026-11-10)

`firebase deploy --only dataconnect` creates the portal's tables (customer
accounts, users, invitations, addresses) and adds `Inquiry.account`: read the
SQL first, it only creates tables and enums and adds one column. Then
`firebase deploy --only functions`, then the hosting of both sites
(`hosting:web` serves `/account/**` from the site's SPA fallback). Customers
sign in with email and password, which is already on; the password-reset email
is Firebase's own. `basis-inc.web.app` is already among the API key's allowed
referrers.

## The assistant on the site, slice 2 (2026-11-10)

It deploys with the rest (`dataconnect`, `functions`, `hosting:web`) and uses
the Anthropic key already set. Owner, when convenient: a monthly spend limit on
the key's workspace in the Anthropic Console, and Firebase App Check with
reCAPTCHA Enterprise for the site (until then the assistant's own limits bound
its use). Settings › Connectors › Assistant on the site turns it off for
visitors, for customers, or both.

## The customer app for iPhone (2026-11-11)

Everything about the app is in [APP_STORE](APP_STORE.md); what production needs for it:

- **The pending schema (owner).** The portal (slices 1–2), BASIS AI and the app's `push_device` table are not yet in the production database; the SQL was read on 2026-11-11 and only creates types, tables and indexes and adds `inquiry.account_id`. The agent's migration is refused as a production deploy, so from the repository root:

  ```bash
  firebase deploy --only dataconnect --project basis-inc
  ```

  and answer yes when it shows the SQL. Then the functions and the brand site deploy (`firebase deploy --only functions`, then `pnpm --filter @basis/web build && firebase deploy --only hosting:web`); the site then serves `/account` and `/.well-known/apple-app-site-association`.
- **API keys (done 2026-11-11).** The web key admits `capacitor://localhost/*` (the app's page), with its API list unchanged; the "iOS key (auto created by Firebase)" of the Firebase iOS app `BASIS (iOS)` is restricted to the bundle ID `com.basisinc.customer`.
- **Notifications (owner).** An APNs key from the Apple Developer account, uploaded to Firebase › Project settings › Cloud Messaging for the app `BASIS (iOS)` ([APP_STORE](APP_STORE.md) §3). Until then FCM answers `third-party-auth-error` and the sweep logs it.


## The project's API keys (2026-11-11)

GitHub's secret scanning flags the Firebase API keys in the repository; they
are public identifiers, not secrets, and the alerts are closed as false
positives. Each key is restricted in Google Cloud (APIs & Services ›
Credentials):

| Key | Used by | Restricted to |
|---|---|---|
| Browser key, created 2026-10-05 (`AIzaSyDq4B…`) | The platform and the brand site (`apps/platform/src/lib/firebase.ts`, `apps/web/app/account/firebase.ts`) | The BASIS sites, localhost and the iPhone app's `capacitor://localhost`; the Firebase services |
| iOS key, created 2026-11-10 (`AIzaSyBM6f…`) | The iPhone app (`GoogleService-Info.plist`) | The bundle `com.basisinc.customer`; the Firebase services |
| Browser key, created 2026-11-07 | Nothing in the code or in any Firebase app config | Since 2026-11-11, the same sites and services as the first key |

A new site must be added to the browser keys' referrers before it can sign in.
