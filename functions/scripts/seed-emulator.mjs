// Seeds the LOCAL emulators only: a test owner account, its User row and the
// reference data every module relies on. Never points at production; it
// refuses to run unless the emulator hosts are set.
//
// Run with the emulators up:  pnpm seed:emulator
// Test sign-in (emulator only): owner@basis.test / basis-owner-sample-2026

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDataConnect } from "firebase-admin/data-connect";
import { seeder } from "./seed-lib.mjs";

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
process.env.DATA_CONNECT_EMULATOR_HOST ??= "127.0.0.1:9399";
process.env.GCLOUD_PROJECT ??= "basis-inc";

if (
  !process.env.FIREBASE_AUTH_EMULATOR_HOST.includes("127.0.0.1") ||
  !process.env.DATA_CONNECT_EMULATOR_HOST.includes("127.0.0.1")
) {
  throw new Error("This seed runs against local emulators only.");
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const seed = seeder(
  getDataConnect({ serviceId: "basis", location: "europe-west1" }),
);

// The Auth emulator forgets its users on restart while Data Connect keeps
// its data, so the account is recreated under the uid the record already has.
const OWNER = {
  email: "owner@basis.test",
  password: "basis-owner-sample-2026",
  name: "Sample Owner",
  recreate: true,
};

const uid = await seed.seedOwner(getAuth(), OWNER);
// Reference data and the catalog first: the process templates point at the
// fabric families, so a fresh database needs the families before them.
await seed.seedReference();
const skuCount = await seed.seedCatalog({ withSkus: true });
await seed.seedTemplates();
await seed.seedInspectionTemplates();
await seed.seedLogistics();
const line = await seed.seedDevelopment(uid);
const c = seed.counts;
console.log(
  `Seeded emulators: owner ${OWNER.email} (${uid}), ${c.countries} countries, ${c.currencies} currencies, ${c.uoms} units, ${c.incoterms} Incoterms, number sequences, ${c.products} products, ${skuCount} SKUs, ${c.templates} process templates, ${c.inspectionTemplates} inspection templates, ${c.places} places, ${c.documentRequirements} document requirements, development line: ${line.products} dossiers, ${line.categories} categories and ${line.collections} collections added.`,
);
