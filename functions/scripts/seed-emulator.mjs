// Seeds the LOCAL emulators only: a test owner account, its User row and the
// reference data every module relies on. Never points at production; it
// refuses to run unless the emulator hosts are set.
//
// Run with the emulators up:  pnpm seed:emulator
// Test sign-in (emulator only): owner@basis.test / basis-owner-sample-2026

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDataConnect } from 'firebase-admin/data-connect';
import catalog from '../../packages/shared/src/launch-catalog.json' with { type: 'json' };

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
  // The Auth emulator forgets its users on restart while Data Connect keeps
  // its data, so the account is recreated under the uid the record already has.
  const { users } = await gql(`query ($email: String!) { users(where: { email: { eq: $email } }, limit: 1) { uid } }`, { email: OWNER.email });
  const storedUid = users[0]?.uid;
  let user = await auth.getUserByEmail(OWNER.email).catch(() => null);
  if (user && storedUid && user.uid !== storedUid) {
    await auth.deleteUser(user.uid);
    user = null;
  }
  if (!user) {
    user = await auth.createUser({ ...(storedUid ? { uid: storedUid } : {}), email: OWNER.email, password: OWNER.password, displayName: OWNER.name, emailVerified: true });
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
  // Sequences start at 1 once and are never reset: a re-seed must not hand
  // out a number that is already taken.
  for (const prefix of ['PO', 'RUN', 'INS', 'CAR', 'SHP', 'QTN', 'RFQ', 'QUO', 'SO', 'SMP', 'LOT', 'CTN', 'PLT', 'INQ']) {
    const { numberSequence } = await gql(`query ($prefix: String!, $year: Int!) { numberSequence(key: { prefix: $prefix, year: $year }) { nextValue } }`, { prefix, year });
    if (!numberSequence) await gql(`mutation ($prefix: String!, $year: Int!) { numberSequence_insert(data: { prefix: $prefix, year: $year, nextValue: 1 }) }`, { prefix, year });
  }
}

// The launch range from the brand booklet. SKUs start in development: shade
// availability is confirmed per production standard, not assumed.
async function seedCatalog() {
  for (const putUp of catalog.putUps) {
    await gql(`mutation ($code: String!, $name: String!, $rollLengthM: Int!, $widthCm: Int!, $core: String, $wrap: String, $rollsPerCarton: Int) {
      putUp_upsert(data: { code: $code, name: $name, rollLengthM: $rollLengthM, widthCm: $widthCm, core: $core, wrap: $wrap, rollsPerCarton: $rollsPerCarton }) }`, putUp);
  }
  for (const collection of catalog.shadeCollections) {
    await gql(`mutation ($code: String!, $name: String!, $sort: Int!) { shadeCollection_upsert(data: { code: $code, name: $name, sort: $sort }) }`, collection);
  }
  for (const shade of catalog.shades) {
    await gql(`mutation ($code: String!, $collectionCode: String, $name: String!, $slug: String!, $hex: String, $sort: Int!) {
      shade_upsert(data: { code: $code, collectionCode: $collectionCode, name: $name, slug: $slug, hex: $hex, sort: $sort, status: active }) }`,
      { code: shade.code, collectionCode: shade.collection, name: shade.name, slug: shade.slug, hex: shade.hex, sort: shade.sort });
  }
  for (const family of catalog.families) {
    await gql(`mutation ($code: String!, $name: String!, $slug: String!, $description: String, $specSchema: Any, $sort: Int!) {
      fabricFamily_upsert(data: { code: $code, name: $name, slug: $slug, description: $description, specSchema: $specSchema, sort: $sort }) }`, family);
  }
  for (const product of catalog.products) {
    await gql(`mutation ($code: String!, $familyCode: String!, $index: Int!, $name: String!, $slug: String!, $tagline: String, $description: String, $specs: Any) {
      product_upsert(data: { code: $code, familyCode: $familyCode, index: $index, name: $name, slug: $slug, tagline: $tagline, description: $description, specs: $specs, status: active, isPublic: true }) }`,
      { code: product.code, familyCode: product.family, index: product.index, name: product.name, slug: product.slug, tagline: product.tagline, description: product.description, specs: product.specs });
  }
  const variantIds = {};
  for (const variant of catalog.variants) {
    const fullCode = `${variant.product}-${variant.code}`;
    const existing = await gql(`query ($fullCode: String!) { productVariants(where: { fullCode: { eq: $fullCode } }, limit: 1) { id } }`, { fullCode });
    let id = existing.productVariants[0]?.id;
    if (!id) {
      const inserted = await gql(`mutation ($productCode: String!, $fullCode: String!, $code: String!, $name: String!, $widthCm: Int) {
        productVariant_insert(data: { productCode: $productCode, fullCode: $fullCode, code: $code, name: $name, widthCm: $widthCm, status: active, sort: 1 }) }`,
        { productCode: variant.product, fullCode, code: variant.code, name: variant.name, widthCm: variant.widthCm });
      id = inserted.productVariant_insert.id;
    }
    variantIds[fullCode] = id;
  }
  let skus = 0;
  for (const variant of catalog.variants) {
    for (const shade of catalog.shades) {
      const code = `${variant.product}-${variant.code}-${shade.code}`;
      await gql(`mutation ($code: String!, $productCode: String!, $variantId: UUID!, $shadeCode: String!, $putUpCode: String!) {
        sku_upsert(data: { code: $code, productCode: $productCode, variantId: $variantId, shadeCode: $shadeCode, putUpCode: $putUpCode, salesUom: "m", status: development, isPublic: false, rollTracking: true }) }`,
        { code, productCode: variant.product, variantId: variantIds[`${variant.product}-${variant.code}`], shadeCode: shade.code, putUpCode: catalog.putUps[0].code });
      skus += 1;
    }
  }
  return skus;
}

// Production processes per family. Durations are working assumptions until
// a supplier's real lead times replace them on its own template.
const TEMPLATES = [
  { name: 'Warp-knit mesh', family: 'MSH', steps: [
    ['yarn', 'Yarn sourcing', 'materials', 7, null, 'none'],
    ['knit', 'Knitting', 'production', 10, 'yarn', 'none'],
    ['labdip', 'Lab dip approval', 'colour', 3, 'yarn', 'approval'],
    ['dye', 'Dyeing', 'production', 7, 'knit', 'none'],
    ['finish', 'Finishing', 'production', 4, 'dye', 'none'],
    ['inspect', 'Inspection', 'quality', 2, 'finish', 'inspection'],
    ['pack', 'Packing', 'logistics', 2, 'inspect', 'none'],
  ] },
  { name: 'Woven lining', family: 'LIN', steps: [
    ['yarn', 'Yarn sourcing', 'materials', 5, null, 'none'],
    ['weave', 'Weaving', 'production', 10, 'yarn', 'none'],
    ['labdip', 'Lab dip approval', 'colour', 3, 'yarn', 'approval'],
    ['dye', 'Dyeing', 'production', 7, 'weave', 'none'],
    ['finish', 'Finishing', 'production', 3, 'dye', 'none'],
    ['inspect', 'Inspection', 'quality', 2, 'finish', 'inspection'],
    ['pack', 'Packing', 'logistics', 2, 'inspect', 'none'],
  ] },
  { name: 'Bridal tulle', family: 'TUL', steps: [
    ['yarn', 'Yarn sourcing', 'materials', 5, null, 'none'],
    ['knit', 'Knitting', 'production', 8, 'yarn', 'none'],
    ['dye', 'Dyeing', 'production', 6, 'knit', 'none'],
    ['finish', 'Finishing', 'production', 4, 'dye', 'none'],
    ['inspect', 'Inspection', 'quality', 2, 'finish', 'inspection'],
    ['pack', 'Packing', 'logistics', 2, 'inspect', 'none'],
  ] },
];

// Inspection checklists. Thresholds and tolerances are working assumptions
// until the production standards fix them per fabric.
const INSPECTION_TEMPLATES = [
  { name: 'Pre-shipment, mesh and tulle', type: 'pre_shipment', family: null, sampling: '10% of rolls, at least 3, full length', maxPoints: 20, maxDeltaE: 100, checks: [
    ['shade_std', 'shade', 'Shade against the standard', 'Spectrophotometer, D65, three readings per roll', 'measurement', 'dE', 0, 0, 1000, true],
    ['shade_lot', 'shade', 'Shade within the lot', 'Roll to roll, D65', 'pass_fail', null, null, null, null, false],
    ['width', 'dimension', 'Usable width', 'Measured at three points per roll', 'measurement', 'cm', 158000, 2000, 5000, true],
    ['gsm', 'dimension', 'Weight', 'Cut and weighed, three samples', 'measurement', 'gsm', null, null, null, false],
    ['length', 'quantity', 'Roll length against the label', 'Measured on the table', 'measurement', '%', 100000, 2000, 5000, false],
    ['stretch', 'dimension', 'Stretch and recovery', 'Against the specification', 'pass_fail', null, null, null, null, true],
    ['defects', 'defect', 'Defects per roll', '4-point system, continuous', 'count', 'pts', null, null, null, false],
    ['rolls', 'quantity', 'Rolls and metres against the packing list', 'Counted', 'pass_fail', null, null, null, null, true],
    ['packaging', 'packaging', 'Wrap, core and end-cap labels', 'Shade, product code, lot, width, length, origin present', 'pass_fail', null, null, null, null, false],
    ['cartons', 'packaging', 'Cartons and marks', 'Against the packing list', 'pass_fail', null, null, null, null, false],
  ] },
  { name: 'Lab dip', type: 'lab_dip', family: null, sampling: 'One dip card per shade', maxPoints: null, maxDeltaE: 80, checks: [
    ['shade_std', 'shade', 'Shade against the standard', 'Spectrophotometer, D65', 'measurement', 'dE', 0, 0, 800, true],
    ['visual', 'shade', 'Visual match in daylight', 'Light box D65, then daylight', 'pass_fail', null, null, null, null, true],
    ['hand', 'dimension', 'Hand feel after dyeing', 'Against the approved standard', 'pass_fail', null, null, null, null, false],
  ] },
  { name: 'Receiving', type: 'receiving', family: null, sampling: 'Every carton opened; 10% of rolls measured', maxPoints: null, maxDeltaE: null, checks: [
    ['cartons', 'packaging', 'Cartons intact and marks legible', 'Visual', 'pass_fail', null, null, null, null, false],
    ['count', 'quantity', 'Rolls against the packing list', 'Counted', 'pass_fail', null, null, null, null, true],
    ['labels', 'packaging', 'Roll labels match the lot', 'Shade, product code, lot', 'pass_fail', null, null, null, null, true],
    ['damage', 'defect', 'Transit damage', 'Visual, every roll', 'count', 'pts', null, null, null, false],
  ] },
];

async function seedInspectionTemplates() {
  for (const template of INSPECTION_TEMPLATES) {
    const existing = await gql(`query ($name: String!) { inspectionTemplates(where: { name: { eq: $name } }, limit: 1) { id } }`, { name: template.name });
    if (existing.inspectionTemplates[0]) continue;
    const inserted = await gql(`mutation ($name: String!, $type: InspectionType!, $sampling: String, $maxPoints: Int, $maxDeltaE: Int) {
      inspectionTemplate_insert(data: { name: $name, type: $type, isDefault: true, samplingRule: $sampling, maxDefectPointsPer100m: $maxPoints, maxDeltaE: $maxDeltaE }) }`,
      { name: template.name, type: template.type, sampling: template.sampling, maxPoints: template.maxPoints, maxDeltaE: template.maxDeltaE });
    const id = inserted.inspectionTemplate_insert.id;
    let sequence = 1;
    for (const [key, category, parameter, method, kind, unit, expected, minus, plus, critical] of template.checks) {
      await gql(`mutation ($id: UUID!, $key: String!, $sequence: Int!, $category: CheckCategory!, $parameter: String!, $method: String, $kind: CheckKind!, $unit: String, $expected: Int64, $minus: Int64, $plus: Int64, $critical: Boolean!) {
        inspectionTemplateCheck_insert(data: { templateId: $id, key: $key, sequence: $sequence, category: $category, parameter: $parameter, method: $method, kind: $kind, unit: $unit, expected: $expected, toleranceMinus: $minus, tolerancePlus: $plus, isCritical: $critical }) }`,
        { id, key, sequence, category, parameter, method, kind, unit, expected: expected === null ? null : String(expected), minus: minus === null ? null : String(minus), plus: plus === null ? null : String(plus), critical });
      sequence += 1;
    }
  }
}

async function seedTemplates() {
  for (const template of TEMPLATES) {
    const existing = await gql(`query ($name: String!) { processTemplates(where: { name: { eq: $name } }, limit: 1) { id } }`, { name: template.name });
    if (existing.processTemplates[0]) continue;
    const inserted = await gql(`mutation ($name: String!, $family: String!) { processTemplate_insert(data: { name: $name, familyCode: $family, isDefault: true }) }`, { name: template.name, family: template.family });
    const id = inserted.processTemplate_insert.id;
    let sequence = 1;
    for (const [key, name, category, durationDays, dependsOnKey, gate] of template.steps) {
      await gql(`mutation ($id: UUID!, $key: String!, $name: String!, $category: String!, $sequence: Int!, $duration: Int!, $dependsOnKey: String, $gate: MilestoneGate!) {
        processTemplateStep_insert(data: { templateId: $id, key: $key, name: $name, category: $category, sequence: $sequence, durationDays: $duration, dependsOnKey: $dependsOnKey, gate: $gate }) }`,
        { id, key, name, category, sequence, duration: durationDays, dependsOnKey, gate });
      sequence += 1;
    }
  }
}


// Places goods pass through, and what a shipment must carry. Ports and
// airports carry their UN/LOCODE or IATA code; the warehouse is BASIS's own.
const PLACES = [
  ['port', 'Port of Ningbo', 'Ningbo', 'CN', 'CNNGB', 'Asia/Shanghai'],
  ['port', 'Port of Shanghai', 'Shanghai', 'CN', 'CNSHA', 'Asia/Shanghai'],
  ['airport', 'Shanghai Pudong', 'Shanghai', 'CN', 'PVG', 'Asia/Shanghai'],
  ['consolidation_hub', 'Ningbo consolidation hub', 'Ningbo', 'CN', '', 'Asia/Shanghai'],
  ['port', 'Port of Ashdod', 'Ashdod', 'IL', 'ILASH', 'Asia/Jerusalem'],
  ['port', 'Port of Haifa', 'Haifa', 'IL', 'ILHFA', 'Asia/Jerusalem'],
  ['airport', 'Ben Gurion', 'Tel Aviv', 'IL', 'TLV', 'Asia/Jerusalem'],
  ['port', 'Port of Rotterdam', 'Rotterdam', 'NL', 'NLRTM', 'Europe/Amsterdam'],
  ['port', 'Port of Genoa', 'Genoa', 'IT', 'ITGOA', 'Europe/Rome'],
  ['airport', 'JFK', 'New York', 'US', 'JFK', 'America/New_York'],
  ['warehouse', 'BASIS warehouse', 'Tel Aviv', 'IL', '', 'Asia/Jerusalem'],
];
const DOCUMENT_REQUIREMENTS = [
  // mode, flow, destination country, document kind, days before departure
  [null, 'inbound', null, 'commercial_invoice', 2],
  [null, 'inbound', null, 'packing_list', 2],
  ['sea', null, null, 'bill_of_lading', 0],
  ['air', null, null, 'air_waybill', 0],
  [null, null, 'IL', 'certificate_of_origin', 3],
];
async function seedLogistics() {
  for (const [type, name, city, country, locationCode, timeZone] of PLACES) {
    const existing = await gql(`query ($name: String!) { locations(where: { name: { eq: $name }, companyId: { isNull: true } }, limit: 1) { id } }`, { name });
    if (existing.locations[0]) continue;
    await gql(`mutation ($type: LocationType!, $name: String!, $city: String!, $country: String!, $code: String, $tz: String!) {
      location_insert(data: { type: $type, name: $name, city: $city, countryCode: $country, locationCode: $code, timeZone: $tz }) }`,
      { type, name, city, country, code: locationCode || null, tz: timeZone });
  }
  const { documentRequirements } = await gql(`query { documentRequirements(limit: 200) { documentKind mode flow destinationCountry { code } } }`);
  for (const [mode, flow, country, documentKind, daysBeforeEtd] of DOCUMENT_REQUIREMENTS) {
    if (documentRequirements.some((rule) => rule.documentKind === documentKind && (rule.mode ?? null) === mode && (rule.flow ?? null) === flow && (rule.destinationCountry?.code ?? null) === country)) continue;
    await gql(`mutation ($mode: TransportMode, $flow: ShipmentFlow, $country: String, $kind: DocumentKind!, $days: Int!) {
      documentRequirement_insert(data: { mode: $mode, flow: $flow, destinationCountryCode: $country, documentKind: $kind, daysBeforeEtd: $days }) }`,
      { mode, flow, country, kind: documentKind, days: daysBeforeEtd });
  }
}

const uid = await seedOwner();
await seedTemplates();
await seedInspectionTemplates();
await seedReference();
const skuCount = await seedCatalog();
await seedLogistics();
console.log(`Seeded emulators: owner ${OWNER.email} (${uid}), ${COUNTRIES.length} countries, ${CURRENCIES.length} currencies, ${UOMS.length} units, ${INCOTERMS.length} Incoterms, number sequences, ${catalog.products.length} products, ${skuCount} SKUs, ${TEMPLATES.length} process templates, ${INSPECTION_TEMPLATES.length} inspection templates, ${PLACES.length} places, ${DOCUMENT_REQUIREMENTS.length} document requirements.`);
