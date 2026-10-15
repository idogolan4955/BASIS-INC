# Going live — the first production deploy of the backend

The platform at `basis-inc-hq.web.app` has so far been deployed from the
sample build (`pnpm build:demo`): the whole interface on in-memory sample
records, no backend. This document is the exact sequence that turns it into
the live system. Each step is idempotent; a step that has already happened
can be run again without harm.

State on 2026-10-14: F1 is done (billing account linked, APIs enabled).
Steps 2 onwards are open. Steps marked **owner** change account settings or
are refused to an agent; the rest can be run by anyone with access to the
project.

## 1. Blaze (done 2026-10-14)

`basis-inc` is linked to the billing account the owner chose. The APIs for
Cloud Functions, Cloud Run, Cloud Build, Artifact Registry, Eventarc, Pub/Sub,
Cloud Scheduler, Secret Manager and Storage are enabled. The Data Connect
Cloud SQL instance (`basis-db`, `europe-west1`) is the one recurring cost.

## 2. Firebase Authentication (owner)

In the Firebase console, Authentication › Get started, then Sign-in method ›
Email/Password › enable (password sign-in only; no email link). Under
Settings › Authorized domains add `basis-inc-hq.web.app`. The platform's
"Reset password" is Firebase's own email, so no mail provider is needed for
sign-in.

## 3. Storage (owner)

Firebase console › Storage › Get started, location `europe-west1`, production
rules. The default bucket must be `basis-inc.firebasestorage.app`, the name
the platform and the functions use. The rules file in the repository
(`storage.rules`) is deployed in step 6.

## 4. Data Connect and the database

```bash
firebase deploy --only dataconnect
```

The first run creates the Cloud SQL instance and database (10 to 15 minutes)
and applies the schema as `CREATE` statements. On later runs read the SQL
that `firebase dataconnect:sql:diff` prints before deploying: only `CREATE`
and `ADD COLUMN`, never `DROP` without the owner's explicit approval.

## 5. Secrets (owner, only for outgoing email)

```bash
firebase functions:secrets:set EMAIL_API_KEY
```

Two functions (`connectorStatus`, `sendDocumentEmail`) declare this secret,
and the CLI asks for its value at the first functions deploy even when only
other functions are being deployed. Without an email provider yet, answer
the prompt with the word `unset`: the functions treat that placeholder as
no key, the email connector reports the secret as missing, and the real
value replaces it later with the command above.

## 6. Functions and Storage rules

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

## 7. Reference data and the owner's account

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

## 8. The live platform build on Hosting

```bash
pnpm --filter @basis/platform build && firebase deploy --only hosting:platform
```

`build` (not `build:demo`) talks to Auth and Data Connect in production. The
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
