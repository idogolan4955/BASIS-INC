// Seeds the LOCAL emulators only: a test owner account, its User row and the
// reference data every module relies on. Never points at production; it
// refuses to run unless the emulator hosts are set.
//
// Run with the emulators up:  pnpm seed:emulator
// Test sign-in (emulator only): owner@basis.test / basis-owner-sample-2026

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDataConnect } from 'firebase-admin/data-connect';

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.DATA_CONNECT_EMULATOR_HOST ??= '127.0.0.1:9399';
process.env.GCLOUD_PROJECT ??= 'basis-inc';

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST.includes('127.0.0.1') || !process.env.DATA_CONNECT_EMULATOR_HOST.includes('127.0.0.1')) {
  throw new Error('This seed runs against local emulators only.');
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const auth = getAuth();
const dc = getDataConnect({ serviceId: 'basis', location: 'europe-west1' });

async function gql(query, variables) {
  const result = await dc.executeGraphql(query, { variables });
  if (result.errors?.length) throw new Error(result.errors.map((e) => e.message).join('; '));
  return result.data;
}

const OWNER = { email: 'owner@basis.test', password: 'basis-owner-sample-2026', name: 'Sample Owner' };

async function seedOwner() {
  let user = await auth.getUserByEmail(OWNER.email).catch(() => null);
  if (!user) {
    user = await auth.createUser({ email: OWNER.email, password: OWNER.password, displayName: OWNER.name, emailVerified: true });
  }
  await auth.setCustomUserClaims(user.uid, { role: 'owner' });
  await gql(
    `mutation SeedOwner($uid: String!, $email: String!, $name: String!) {
      user_upsert(data: { uid: $uid, email: $email, name: $name, role: owner, principalType: staff, status: active })
    }`,
    { uid: user.uid, email: OWNER.email, name: OWNER.name },
  );
  return user.uid;
}

const COUNTRIES = [
  ['CN', 'China', 'Asia'],
  ['IL', 'Israel', 'Middle East'],
  ['US', 'United States', 'North America'],
  ['GB', 'United Kingdom', 'Europe'],
  ['NL', 'Netherlands', 'Europe'],
  ['IT', 'Italy', 'Europe'],
  ['FR', 'France', 'Europe'],
  ['ES', 'Spain', 'Europe'],
  ['DE', 'Germany', 'Europe'],
  ['AU', 'Australia', 'Oceania'],
];
const CURRENCIES = [
  ['USD', 'US dollar', 2],
  ['EUR', 'Euro', 2],
  ['CNY', 'Chinese yuan', 2],
  ['GBP', 'Pound sterling', 2],
  ['ILS', 'Israeli new shekel', 2],
];
const UOMS = [
  ['m', 'Metre', 'length', '1'],
  ['yd', 'Yard', 'length', '0.9144'],
  ['kg', 'Kilogram', 'mass', '1'],
  ['pcs', 'Piece', 'count', '1'],
  ['roll', 'Roll', 'count', '1'],
];
const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'].map((code) => [code, code, 2020]);
const INCOTERM_NAMES = {
  EXW: 'Ex Works', FCA: 'Free Carrier', FOB: 'Free On Board', CFR: 'Cost and Freight',
  CIF: 'Cost, Insurance and Freight', DAP: 'Delivered at Place', DDP: 'Delivered Duty Paid',
};

async function seedReference() {
  for (const [code, name, region] of COUNTRIES) {
    await gql(`mutation ($code: String!, $name: String!, $region: String) { country_upsert(data: { code: $code, name: $name, region: $region }) }`, { code, name, region });
  }
  for (const [code, name, minorUnits] of CURRENCIES) {
    await gql(`mutation ($code: String!, $name: String!, $minorUnits: Int!) { currency_upsert(data: { code: $code, name: $name, minorUnits: $minorUnits }) }`, { code, name, minorUnits });
  }
  for (const [code, name, dimension, toCanonical] of UOMS) {
    await gql(
      `mutation ($code: String!, $name: String!, $dimension: UomDimension!, $toCanonical: String!) { uom_upsert(data: { code: $code, name: $name, dimension: $dimension, toCanonical: $toCanonical }) }`,
      { code, name, dimension, toCanonical },
    );
  }
  for (const [code, , version] of INCOTERMS) {
    await gql(`mutation ($code: String!, $name: String!, $version: Int!) { incoterm_upsert(data: { code: $code, name: $name, version: $version }) }`, { code, name: INCOTERM_NAMES[code], version });
  }
  const year = new Date().getFullYear();
  for (const prefix of ['PO', 'RUN', 'INS', 'CAR', 'SHP', 'QTN', 'RFQ', 'QUO', 'SO', 'SMP', 'LOT']) {
    await gql(`mutation ($prefix: String!, $year: Int!) { numberSequence_upsert(data: { prefix: $prefix, year: $year, nextValue: 1 }) }`, { prefix, year });
  }
}

const uid = await seedOwner();
await seedReference();
console.log(`Seeded emulators: owner ${OWNER.email} (${uid}), ${COUNTRIES.length} countries, ${CURRENCIES.length} currencies, ${UOMS.length} units, ${INCOTERMS.length} Incoterms, number sequences.`);
