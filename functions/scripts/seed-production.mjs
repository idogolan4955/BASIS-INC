// Seeds PRODUCTION once the backend is deployed: the owner's account with the
// owner role, and the reference data every module relies on. Idempotent; it
// never deletes. It refuses to run without the explicit flag, and it never
// sets a password: the owner chooses one through "Reset password" on the
// sign-in page, which Firebase Auth emails on its own.
//
//   node functions/scripts/seed-production.mjs --production --owner you@example.com --name "Your Name" [--with-skus]
//
// Needs Application Default Credentials for project basis-inc:
//   gcloud auth application-default login

import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";
import { seeder } from "./seed-lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};

if (!flag("production"))
  throw new Error("Refusing: pass --production to seed the live project.");
if (
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  process.env.DATA_CONNECT_EMULATOR_HOST
)
  throw new Error(
    "Refusing: emulator hosts are set. Unset them to seed production.",
  );
const email = value("owner");
if (!email) throw new Error("Pass --owner <email> for the owner account.");
const name = value("name") ?? email.split("@")[0];

initializeApp({ credential: applicationDefault(), projectId: "basis-inc" });
const seed = seeder(
  getDataConnect({ serviceId: "basis", location: "europe-west1" }),
);

const uid = await seed.seedOwner(getAuth(), { email, name, recreate: false });
await seed.seedTemplates();
await seed.seedInspectionTemplates();
await seed.seedReference();
const skuCount = await seed.seedCatalog({ withSkus: flag("with-skus") });
await seed.seedLogistics();
const c = seed.counts;
console.log(
  `Seeded production: owner ${email} (${uid}), ${c.countries} countries, ${c.currencies} currencies, ${c.uoms} units, ${c.incoterms} Incoterms, number sequences, ${c.products} products, ${skuCount} SKUs, ${c.templates} process templates, ${c.inspectionTemplates} inspection templates, ${c.places} places, ${c.documentRequirements} document requirements.`,
);
console.log(
  `Next: open the platform, enter ${email}, choose "Reset password", and set the password from the email.`,
);
