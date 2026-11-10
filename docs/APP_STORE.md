# The BASIS app for iPhone — App Store

The customer portal of the brand site ([CUSTOMER_PORTAL_PLAN](CUSTOMER_PORTAL_PLAN.md)) as an app on the App Store: a trade customer signs in, answers quotes, follows orders and shipments, opens documents, asks for samples and talks to the assistant, and is told on the phone when a quote arrives or a shipment lands. Asked for by the owner on 2026-11-10 ("when you finish building the customer front, open a session for the App Store"). This document is the decision record, the release procedure, and everything that is sent to Apple. Nothing is submitted for review without the owner's explicit yes.

**State (2026-11-11).** Built and checked in the iOS Simulator against the emulators (§10); the store listing, the screenshots and the review notes below are ready; the production API keys are set. Not yet uploaded: the archive stopped at Xcode's "No Accounts" — this Mac's Xcode is not signed in to an Apple account, so automatic signing can neither register the App ID nor make profiles. The production schema is waiting on the owner too. The steps that are his alone are §9; the archive, the upload to TestFlight and the production deploys follow them.

---

## 1. What the app is, and the decisions taken

| Decision | Taken | Why |
|---|---|---|
| Technology | **Capacitor 8** around the portal of `apps/web`, in a workspace package `apps/ios` (`@basis/ios`); Swift Package Manager, no CocoaPods | The portal already exists, in English and Hebrew, with its design and its permissions; a second client in Swift would duplicate every screen and every rule. Capacitor gives the web view real native plugins |
| Bundled or remote | **Bundled.** `apps/ios/scripts/bundle.mjs` builds `apps/web` as a single-page app (`VITE_BASIS_APP=1`, into `apps/web/build-app`, never touching the site Hosting serves) and copies it into the app; data is always live from Firebase over HTTPS | The app starts instantly and draws its frame without a network; nothing breaks if the site is mid-deploy; it is Capacitor's production mode (its `server.url` is "not intended for production"); and App Review sees an app, not a website in a frame (guidelines 2.5.2 and 4.2). The price: a portal change reaches the app with its next build, so the functions stay backward compatible with the version in the store (they only ever add fields and functions) |
| Where it opens | `/account` (the site's home route sends the app there): signed out, the sign-in; signed in, the overview | It is the customer's account, not the brochure; the brand's pages stay one tap away under Index and More |
| Devices | **iPhone only**, portrait, light appearance | The portal is designed at 390 px; an iPad version adds a second set of screenshots and review for little use. Revisit if customers ask |
| Sign-in | Email and password through Firebase Auth, the same logins as the site; no third-party login | Sign in with Apple (guideline 4.8) is required only when a third-party or social login is offered. If Google sign-in is ever added, Sign in with Apple is added with it |
| Bundle ID | `com.basisinc.customer`, team `97HE63NNKZ` (the owner's membership), automatic signing | BASIS's own App ID, certificates and profiles; nothing shared with another project |
| Name | **BASIS** on the home screen. In the store, "BASIS" if free; else "BASIS INC." | App Store names are unique across the store |

### 1.1 What makes it an app (guideline 4.2)

- **Notifications**: a quote sent by BASIS and a shipment that has arrived, on the phone, in the language the app is set to; tapping one opens the quote or the shipment.
- **Links open in the app** (Universal Links): an invitation link sent by WhatsApp or email, and any `/account` link of `basis-inc.web.app`, open the app at that page. `basisinc://account/…` does the same for links made inside BASIS.
- **Passwords**: the app and the site share credentials (`webcredentials`), so iCloud Keychain fills a password saved on the site and saves one made in the app.
- **Documents** open in Quick Look (print, mark up, save to Files) and go straight to the share sheet (Mail, WhatsApp, AirDrop) — fetched with the person's own sign-in, never through a public link.
- **Native frame**: a numbered tab bar (Overview, Quotes, Orders, Shipments, More, mirrored in Hebrew), the assistant and the brand's index as words in the top bar, swipe back, no link previews, a launch screen in the site's bone, safe areas respected.
- **Without an account**: the fabrics, the Shade System and the applications can be browsed, samples asked for and a trade account applied for, and the assistant answers.

### 1.2 How it is built

```
apps/ios/
├─ capacitor.config.ts      app id and name, launch screen and notification options
├─ scripts/bundle.mjs       builds apps/web for the app into www/ (--local: the emulators)
├─ scripts/assets.sh        renders the icon and the launch image from assets/*.html
├─ assets/                  icon.html (opaque, full bleed), splash.html
└─ ios/App/                 the Xcode project (Capacitor 8, Swift Package Manager)
   ├─ App/BasisNative.swift      MainViewController (swipe back, no link previews) and the
   │                             BasisDocument plugin (Quick Look, share sheet)
   ├─ App/AppDelegate.swift      hands the APNs token to Firebase Cloud Messaging
   ├─ App/Info.plist             iPhone only, portrait, light, ITSAppUsesNonExemptEncryption = NO
   ├─ App/App.entitlements       aps-environment, applinks: and webcredentials:basis-inc.web.app
   ├─ App/PrivacyInfo.xcprivacy  the privacy manifest (no tracking; data collected, §6.4)
   └─ App/GoogleService-Info.plist  the Firebase iOS app (public configuration, like the web one)
```

Inside `apps/web`: `app/native/platform.ts` (the build flag `IN_APP`, the API base, link-to-page), `app/native/bridge.ts` (Capacitor plugins, loaded only by the app's bundle), `app/native/push.ts`; the app's frame in `app/site/shell.tsx` (`AppShell`, `AppTabs`); `account/profile.tsx` and `account/more.tsx`. In the app, sign-in uses `initializeAuth` with IndexedDB persistence (no pop-up resolver), and the functions are called at `https://basis-inc.web.app/api`. The site that Hosting serves is unchanged by all of this.

Plugins: `@capacitor/app` (links), `@capacitor/splash-screen`, `@capacitor/keyboard`, `@capacitor-firebase/messaging` (FCM tokens and taps).

## 2. Apple's requirements, and how each is met

| Requirement | How |
|---|---|
| Account deletion inside the app (5.1.1(v)) | More › Profile › **Delete my login** (`deleteMyLogin`): removes the Firebase login, the person's `CustomerUser` and `User` rows, their conversations with the assistant and their phones' tokens, at once, after a confirmation. The company's quotes, orders, invoices, documents and timeline stay: they are its business records. Refused only to the last active admin of an account that still has other active people, with what to do ("make a colleague admin first"); a person alone in an account can always delete their login |
| Privacy policy | `https://basis-inc.web.app/legal/privacy`, rewritten 2026-11-11 for accounts, the assistant, notifications, processors and deletion; linked from the store, the assistant and More |
| Encryption export compliance | Only HTTPS: `ITSAppUsesNonExemptEncryption = NO` in Info.plist, so no question at each upload |
| Sign in with Apple (4.8) | Not required: no third-party login |
| Demo account (2.1) | A real trade account in production for App Review, with a few real records (§7); never a demo-only code path |
| Minimum functionality (4.2) | §1.1 |
| Privacy manifest | `PrivacyInfo.xcprivacy`: no tracking, the collected types of §6.4, `UserDefaults` reason CA92.1 |
| Push entitlement and associated domains | `App.entitlements`; Xcode's automatic signing adds Push Notifications and Associated Domains to the App ID |
| The association file | `apps/web/public/.well-known/apple-app-site-association`, served by Hosting as `application/json` (`firebase.json`); Apple's CDN fetches it once the site is deployed |
| IPv6, HTTPS only | Firebase endpoints only; `NSAllowsLocalNetworking` allows the emulators in development and nothing else |

## 3. Notifications

- The app asks for permission only when the person chooses to (Overview offers it once; Profile › Notifications), never at launch.
- With permission, the phone's Firebase Cloud Messaging token is registered for the signed-in person (`registerPushDevice` → `PushDevice`, keyed by the token, with the app's language and version); signing out gives it up (`unregisterPushDevice`); deleting the login deletes it.
- What is sent (`functions/src/notify.ts`, from the outbox in the sweep, every 10 minutes): **a quote sent** to the customer (`quote.sent`, emitted by the quote's transition) and **a shipment delivered** to them (`shipment.delivered`, when the last leg arrives). Every active person of the customer's account hears it, in English or Hebrew; the text names the record and never an amount (`portalPush` in `packages/shared`). Tokens FCM rejects as gone are forgotten; anything else is logged and the sweep moves on. Events older than two days are not sent.
- **APNs key (owner, once):** without it Firebase cannot reach Apple's push service. developer.apple.com › Certificates, IDs & Profiles › Keys › **+** › name "BASIS Push", tick *Apple Push Notifications service (APNs)*, Continue, Register, **Download** the `.p8` (it downloads once) and note the Key ID. Then console.firebase.google.com › basis-inc › Project settings › Cloud Messaging › *Apple app configuration* › the app **BASIS (iOS)** › APNs Authentication Key › Upload: the `.p8`, the Key ID and the Team ID `97HE63NNKZ`. The key stays with Apple and Firebase; it is never put in the repository or in a chat.

## 4. Identifiers

| | |
|---|---|
| Team | `97HE63NNKZ` |
| Bundle ID | `com.basisinc.customer` |
| Firebase iOS app | `1:355671529737:ios:2ce318a3c83d88d72f1bd8` ("BASIS (iOS)"), registered 2026-11-11; its API key "iOS key (auto created by Firebase)" |
| App Store Connect record | Name **BASIS**, primary language **English (U.S.)**, bundle ID `com.basisinc.customer`, SKU **BASIS-IOS-1**, user access Full |
| Version | `MARKETING_VERSION` 1.0.0; `CURRENT_PROJECT_VERSION` (the build number) rises by one with every upload |
| Universal Links domain | `basis-inc.web.app` (moves with the domain when `basis-inc.net` is bought: a new entitlement and a new build) |

## 5. Building, running and releasing

All from the repository root. The Capacitor CLI needs Node 22 (`~/.nvm/versions/node/v22.*`); a fresh checkout runs `pnpm install` and `npx cap sync ios` (from `apps/ios`) before Xcode can build, because the copied web bundle and `capacitor.config.json` are not committed.

```bash
# The Simulator against the local emulators (pnpm emulators; pnpm seed:emulator)
node apps/ios/scripts/bundle.mjs --local && (cd apps/ios && npx cap sync ios)
xcodebuild -project apps/ios/ios/App/App.xcodeproj -scheme App -configuration Debug \
  -sdk iphonesimulator -destination 'name=iPhone 17 Pro Max' build

# A release for TestFlight (production Firebase); <n> is the next build number
node apps/ios/scripts/bundle.mjs && (cd apps/ios && npx cap sync ios)
xcodebuild -project apps/ios/ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath apps/ios/build/BASIS-<n>.xcarchive \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION=<n> archive
xcodebuild -exportArchive -archivePath apps/ios/build/BASIS-<n>.xcarchive \
  -exportOptionsPlist apps/ios/ExportOptions.plist -exportPath apps/ios/build/export-<n> -allowProvisioningUpdates
```

A Simulator build must be signed (not `CODE_SIGNING_ALLOWED=NO`), or it carries no `aps-environment` and iOS gives it no push address. `apps/ios/scripts/assets.sh` renders the icon and the launch image again after a change to `apps/ios/assets/*.html`.

`ExportOptions.plist` uploads to App Store Connect (`destination: upload`, method `app-store-connect`) with the Apple account signed in to Xcode on this Mac; no App Store Connect API key is stored anywhere. A build appears in TestFlight after Apple's processing (usually 10–30 minutes); internal testers (the owner) install it with the TestFlight app.

What must be live in production for the app to work, beyond the app itself: the portal's schema, functions and Hosting (slices 1–2 of the portal, the `PushDevice` table, `registerPushDevice`, `unregisterPushDevice`, `deleteMyLogin`, the notification handlers, the `api` function's CORS for `capacitor://localhost`, the association file), and `capacitor://localhost/*` among the web API key's allowed referrers (the app's page sends that origin).

## 6. The store listing

### 6.1 English (U.S.) — primary

- **Name:** BASIS
- **Subtitle (30):** Bridal fabrics, trade account
- **Promotional text (170):** Quotes, orders and shipments from BASIS in one place: answer a quote, follow a shipment leg by leg, open your documents, and ask about any fabric or shade.
- **Description:**

  > BASIS supplies the foundation fabrics a gown is built on — powermesh, stretch mesh, lining and tulle, in one Shade System — to bridal ateliers, designers and manufacturers.
  >
  > The BASIS app is your trade account with us.
  >
  > QUOTES — Read a quote as we sent it, accept it with the date you need the goods by, or decline it with a reason. Accepting opens your order.
  >
  > ORDERS — Every line, how much has shipped, and the invoices that belong to it.
  >
  > SHIPMENTS — Follow the journey leg by leg, from the mill to your door, with the expected arrival.
  >
  > DOCUMENTS — Quotations, packing lists, shipping papers and certificates open in the iPhone's own viewer, ready to print, save to Files or share.
  >
  > NOTIFICATIONS — Be told when we send you a quote and when a shipment arrives.
  >
  > SAMPLES — Ask for swatches of any fabric in any shade, delivered to one of your addresses with their technical sheets.
  >
  > YOUR TEAM — Admins invite colleagues and choose what each of them can do.
  >
  > ASK BASIS — An AI assistant that knows our fabrics and the Shade System and, when you are signed in, your own account. Anything it would send waits for your tap, and a person in sales is one message away.
  >
  > In English and in Hebrew.
  >
  > Trade accounts are opened by invitation. Apply at basis-inc.web.app/wholesale, or ask your contact at BASIS. Without an account you can browse the fabrics and the Shade System and ask for samples.

- **Keywords (100):** `bridal,fabric,tulle,powermesh,lining,mesh,atelier,wholesale,textile,swatch,shade,trade,gown,quote`
- **Support URL:** https://basis-inc.web.app/contact
- **Marketing URL:** https://basis-inc.web.app
- **Privacy policy URL:** https://basis-inc.web.app/legal/privacy
- **Category:** Business (primary); no secondary
- **Copyright:** © 2026 BASIS INC.
- **Price:** Free; no in-app purchases. Goods are physical and ordered and invoiced under trade terms, which guideline 3.1.5(a) keeps outside in-app purchase
- **Availability:** all territories

### 6.2 Hebrew localization

- **Name:** BASIS
- **Subtitle:** בדי כלה, חשבון סחר
- **Promotional text:** הצעות מחיר, הזמנות ומשלוחים מ-BASIS במקום אחד: לענות על הצעה, לעקוב אחרי משלוח שלב אחר שלב, לפתוח מסמכים ולשאול על כל בד וגוון.
- **Description:**

  > BASIS מספקת את בדי הבסיס שעליהם נבנית שמלה — פאוורמש, רשת נמתחת, בטנה וטול, במערכת גוונים אחת — לאטליירים, למעצבים וליצרנים של שמלות כלה.
  >
  > אפליקציית BASIS היא חשבון הסחר שלכם מולנו.
  >
  > הצעות מחיר — לקרוא הצעה כפי ששלחנו, לאשר אותה עם התאריך שבו אתם צריכים את הסחורה, או לדחות עם סיבה. אישור פותח את ההזמנה.
  >
  > הזמנות — כל שורה, כמה כבר נשלח, והחשבוניות של ההזמנה.
  >
  > משלוחים — לעקוב אחרי המסע שלב אחר שלב, מהמפעל עד הדלת, עם מועד ההגעה הצפוי.
  >
  > מסמכים — הצעות מחיר, רשימות אריזה, מסמכי משלוח ותעודות נפתחים במציג של האייפון, מוכנים להדפסה, לשמירה ב-Files או לשיתוף.
  >
  > התראות — הודעה כששלחנו לכם הצעת מחיר וכשמשלוח מגיע.
  >
  > דוגמאות — לבקש דוגמיות של כל בד בכל גוון, לאחת הכתובות שלכם, עם הגיליונות הטכניים.
  >
  > הצוות שלכם — מנהלים מזמינים עמיתים ובוחרים מה כל אחד יכול לעשות.
  >
  > שאלו את BASIS — עוזר AI שמכיר את הבדים ואת מערכת הגוונים, וכשאתם מחוברים גם את החשבון שלכם. כל דבר שהוא היה שולח מחכה ללחיצה שלכם, ואדם ממחלקת המכירות במרחק הודעה.
  >
  > באנגלית ובעברית.
  >
  > חשבונות סחר נפתחים בהזמנה. אפשר להגיש בקשה ב-basis-inc.web.app/wholesale או לפנות לאיש הקשר שלכם ב-BASIS. גם בלי חשבון אפשר לעיין בבדים ובמערכת הגוונים ולבקש דוגמאות.

- **Keywords:** `כלה,בדים,טול,רשת,בטנה,שמלה,אטלייה,סיטונאות,טקסטיל,דוגמיות,גוונים,הצעת מחיר`

### 6.3 Age rating

Every content question answered **None / No**: no violence, no sexual content or nudity, no profanity, no drugs, alcohol or tobacco, no gambling or contests, no horror, no medical or wellness topics, no mature themes; **unrestricted web access: No** (the app opens only BASIS's own pages; outside links go to Safari); **user-generated content: No** (nothing a customer writes is shown to anyone else; the assistant answers about BASIS only); **messaging and chat: No** between users (the assistant is an AI tool, not a chat with other people); **advertising: No**; **age assurance and parental controls: No**. Expected rating: **4+**.

### 6.4 App privacy ("nutrition label")

Tracking: **No** (no data used to track across other companies' apps or sites; no advertising identifier).

| Data type | Collected | Linked to the user | Used for tracking | Purpose |
|---|---|---|---|---|
| Contact info › Name | Yes | Yes | No | App functionality |
| Contact info › Email address | Yes | Yes | No | App functionality |
| Contact info › Phone number | Yes (only if typed in a contact or wholesale form) | Yes | No | App functionality |
| Contact info › Physical address | Yes (the account's addresses, a sample delivery address) | Yes | No | App functionality |
| User content › Customer support | Yes (messages to sales, hand-offs from the assistant) | Yes | No | App functionality |
| User content › Other user content | Yes (questions to the assistant) | Yes | No | App functionality |
| Identifiers › User ID | Yes (the login's id) | Yes | No | App functionality |
| Identifiers › Device ID | Yes (the notification token) | Yes | No | App functionality |

Not collected: health, financial info, location, sensitive info, contacts, browsing or search history, usage data, diagnostics, purchases (orders are business records BASIS creates, not data the app collects from the person).

### 6.5 Screenshots

6.9-inch iPhone (1320 × 2868, RGB, iPhone 17 Pro Max Simulator), from the emulators' sample trade account (Atelier Lumière), status bar set to 9:41, in `apps/ios/store/screenshots/` (not shipped in the app). English (U.S.), in this order: `en-01-overview.png` (what is open), `en-02-quote.png` (a quote waiting for an answer), `en-03-shipment.png` (the journey leg by leg), `en-04-document.png` (the quotation in Quick Look), `en-05-assistant.png` (Ask BASIS answering from the account's own shipment). Hebrew localization: `he-01-overview.png`, with the English ones after it until Hebrew versions of the others are taken. Sample names only; nothing from a real customer.

## 7. App Review information

- **Sign-in required:** Yes.
- **Demo account:** a real trade account in production, "BASIS App Review", created through the platform like any customer (a customer company with a few real records: a quote awaiting an answer, an order, an invoice), with two logins invited from its Portal tab: the admin (kept by BASIS) and the reviewer's login as a buyer, so that deleting the reviewer's login is possible without leaving the account without an admin. The owner opens the reviewer's invitation link and sets its password himself, and enters the email and password in App Store Connect › App Review Information. Approved by the owner on 2026-11-11; created as soon as production has the portal's schema and functions (on 2026-11-11 the database still lacked the portal tables, the portal functions were not deployed and `/account` answered 404).
- **Notes for the reviewer:**

  > BASIS supplies bridal foundation fabrics to the trade (ateliers, designers, manufacturers). Customer accounts are opened by invitation; the demo account is a real trade account set up for review with real records.
  >
  > 1. Sign in with the demo account on the first screen.
  > 2. Overview shows what is open. Quotes › the open quote: Accept or Decline (accepting opens an order). Shipments shows the journey leg by leg.
  > 3. Documents › Open shows a PDF in Quick Look; Share opens the share sheet. The PDF is fetched with the signed-in session.
  > 4. Notifications: the Overview offers to turn them on. BASIS sends one when a quote is sent to the account or a shipment arrives.
  > 5. "Ask BASIS" is an AI assistant (Anthropic's Claude) limited to our fabrics and, when signed in, the person's own account; anything it would send waits for the person's tap.
  > 6. Account deletion: More › Profile › Delete my login. It deletes the login immediately and permanently (the company's business records stay). Please use it last, or tell us and we will invite the login again.
  > 7. Without signing in, the sign-in screen links to the fabrics and the Shade System, the samples form and the trade application.
  >
  > The app is iPhone only. No purchases are made in the app; trade orders are invoiced under the customer's terms.

- **Contact:** the owner's name, phone and email, entered by him in App Store Connect.

## 8. What "Submit for Review" sends

Version 1.0.0 with the build chosen in TestFlight, the English listing (§6.1) and the Hebrew localization (§6.2), the screenshots (§6.5), the age rating (§6.3), the privacy answers (§6.4), the review information (§7), price Free in all territories, and release **manually after approval** (so the owner chooses the day). Submitting is the owner's yes, and only then.

## 9. What only the owner does

1. **Sign in to Xcode** on this Mac with the Apple account of team `97HE63NNKZ`: Xcode › Settings › Accounts › **+** › Apple Account. Without it nothing can be signed here (the archive stopped at "No Accounts").
2. **The App ID** — either let the agent's first archive register it (it does once Xcode is signed in), or register it by hand: developer.apple.com › Certificates, IDs & Profiles › Identifiers › **+** › App IDs › App › description "BASIS", explicit bundle ID **com.basisinc.customer**, capabilities **Associated Domains** and **Push Notifications** › Register.
3. **Create the app record** in App Store Connect (appstoreconnect.apple.com › Apps › **+** › New App): platform iOS, name **BASIS** (if taken, **BASIS INC.**), primary language English (U.S.), bundle ID **com.basisinc.customer**, SKU **BASIS-IOS-1**, user access Full. After that the agent archives and uploads build 1 to TestFlight.
4. **The APNs key** (§3), uploaded to Firebase.
5. **The production schema**, once, from the repository root: `firebase deploy --only dataconnect --project basis-inc`, answering yes to the SQL it shows (only new tables and one new column; [GO_LIVE](GO_LIVE.md)). The agent then deploys the functions and the site.
6. **The review account** in production (§7): approved 2026-11-11. Once it exists he sets the reviewer's password from the invitation link and enters it, with his contact details, in App Store Connect › App Review Information.
7. **Submit for Review** — only after reading §8, and only by his decision.

## 10. What was checked, and how

In the iOS Simulator (iPhone 17 Pro Max, iOS 26.3) with the app bundled against the local emulators, on 2026-11-11:

| Check | Result |
|---|---|
| Launch | The launch screen, then `/account`; signed out, the sign-in |
| Sign-in | An emulator trade customer signs in; the overview shows what is open |
| English and Hebrew | Profile › Language switches every page, the tab bar mirrored, the assistant's word in the top bar in Hebrew |
| Assistant | "When does my shipment to Paris arrive?" answered from the customer's own shipment, its legs and dates (Opus 5.5, cached prompt) |
| Documents | The quotation opens in Quick Look (print, mark up, Files, share); fetched with the person's token |
| Invitation link | `basisinc://account/invite/<token>` opens the app at the invitation from a cold start (`https://basis-inc.web.app/account/invite/…` does the same once the association file is live) |
| Notifications | Permission asked from the Overview's offer; the phone's FCM token stored against the person; the `quote.sent` handler sends through FCM, which answers `third-party-auth-error` until the APNs key is in Firebase; a tapped notification (`simctl push`) opens its quote from a cold start |
| Deleting a login | Over HTTP against the emulators: a viewer's login, rows and phone token gone, the audit and timeline entries kept without the link, signing in again refused; the last admin of a team with an active buyer refused with what to do |
| Production key | `capacitor://localhost/` accepted by the web key (sign-in answers "invalid credentials" for a made-up email), other referrers still refused |
