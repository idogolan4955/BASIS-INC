# BASIS INC. — instructions for any agent working in this repository

BASIS INC. is a premium international bridal-fabric brand and the operating platform behind it: products, suppliers, manufacturing, QC, inventory, logistics from China, B2B customers, marketing and the public brand site. The owner is Ido.

**Read `docs/` before changing anything.** Start with `docs/PRODUCT_BLUEPRINT.md` and `docs/SYSTEM_ARCHITECTURE.md`; `docs/IMPLEMENTATION_PLAN.md` says what is built in which order. Do not ask what the system is — the answer is there.

What must be remembered even without opening the docs:

- **Language.** The owner writes in Hebrew, briefly — reply in Hebrew. Code, comments, commits, documents and the product interface are in English.
- **Stack.** pnpm monorepo. React 19 + Vite + Tailwind CSS 4. PostgreSQL through Firebase Data Connect (schema in GraphQL, every operation with `@auth` by role). Cloud Functions v2, `europe-west1`. Firebase Auth (role in custom claim), Storage, Hosting.
- **Firebase project** `basis-inc`. Hosting targets: `web` → site `basis-inc` (public brand site), `platform` → site `basis-inc-hq` (management platform).
- **Working chain.** Every change ends deployed, committed and pushed to `main`: `tsc --noEmit` → build → `firebase deploy` (dataconnect / functions / hosting, according to what changed) → commit → push. Vite builds even with type errors, so `tsc` comes first. Commit messages in English, explaining why.
- **Schema.** `firebase dataconnect:sql:diff` and read the SQL. Only `CREATE` and `ADD COLUMN`. Never `DROP` without the owner's explicit approval.
- **Secrets** are set only by the owner in his terminal (`firebase functions:secrets:set`). Never in chat, never in code, never printed.
- **Cost confidentiality is a data rule.** Roles without cost access must not receive purchase prices, landed costs or supplier identity — in the query, not only in the interface.
- **Status is derived.** Health and progress come from facts (milestones, legs, inspections, movements). Never add a hand-edited status for them.
- **Money and quantities** are fixed-point integers, never floats. Arithmetic happens only in the value types in `packages/shared`.
- **No business data in components**, no mock structures that cannot become real tables, no demo-only paths.
- **Design.** `docs/DESIGN_SYSTEM.md` is binding: tokens only, the five signatures, and the "never" list. No generic SaaS dashboard patterns.
- **Interface checks** run on emulators or sample data, not on production data. `pnpm --filter @basis/platform dev:sample` (port 5180) runs the platform on sample records with no backend; `.claude/launch.json` has it as `platform-sample`.
- **Design work** is done with the owner's design skills: impeccable, ui-ux-pro-max and design-taste-frontend. The owner's reference for the back office and how it was read are in `docs/DESIGN_SYSTEM.md` §0.
- **Local loop.** `pnpm emulators` starts Auth, Data Connect and Functions; `pnpm seed:emulator` creates the test owner (credentials in `functions/scripts/seed-emulator.mjs`) and reference data; `pnpm dev:platform` runs the live interface against them. After a schema or connector change run `pnpm sdk` to regenerate the SDKs in `packages/shared/src/dataconnect-generated` (never edited by hand).
- **Tooling notes.** TypeScript 7 compiles the packages; the root keeps TypeScript 6 only so typescript-eslint can run. `functions` lists `@google-cloud/firestore` because the Admin SDK requires it at load time. Functions are bundled with tsup so `@basis/shared` ships inside the bundle.
- **Documents stay true.** When the build diverges from a document in `docs/`, update the document in the same change.
- **BASIS is independent of Fabrica.** Never touch the `fabrica-erp-il` project or the Fabrica repository from here.
- Before an action that is hard to reverse — deletion, migration, production settings, anything that costs money — stop and confirm with the owner.
