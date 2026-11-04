import {
  APPROVAL_DECISIONS,
  BRAND_ASSET_KINDS,
  BRAND_ASSET_STATUSES,
  COLLECTION_STATUSES,
  COSTING_BASES,
  DEVELOPMENT_STAGES,
  GATES,
  PART_STATUSES,
  PRIORITIES,
  SAMPLE_KINDS,
  SAMPLE_VERDICTS,
  SOURCING_KINDS,
  SOURCING_STATUSES,
  gateCheck,
  nextStages,
  slugOf,
  type DevelopmentStage,
  type GateFacts,
} from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, emit, failure, graphql, requireRole } from './lib';
import { allocateNumber, timeline } from './manufacturing';

// Product development. Every write lands here so the gate's entry conditions
// are counted on the server, the stage is never typed past them, costs stay
// with the cost roles, and every change leaves an audit and a timeline event.

const DEPARTMENT = ['owner', 'operations', 'marketing'] as const;
const BRAND = ['owner', 'marketing'] as const;
const SOURCING = ['owner', 'operations', 'purchasing'] as const;
const COSTING = ['owner', 'operations', 'finance'] as const;
const VERDICT = ['owner', 'operations', 'marketing', 'qc'] as const;
const stored = z.string().regex(/^\d+$/, 'Fixed-point amount expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');
const currency = z.string().regex(/^[A-Z]{3}$/);
const today = () => new Date().toISOString().slice(0, 10);

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) validationFailure(parsed.error);
  return parsed.data;
}

interface ProductRow {
  id: string;
  number: string;
  name: string;
  stage: DevelopmentStage;
  description: string | null;
  category: { code: string };
}

async function loadProduct(number: string): Promise<ProductRow> {
  const { developmentProducts } = await graphql<{ developmentProducts: ProductRow[] }>(`query ($number: String!) { developmentProducts(where: { number: { eq: $number } }, limit: 1) { id number name stage description category { code } } }`, { number });
  const product = developmentProducts[0];
  if (!product) throw failure('not_found', `No development product ${number}.`);
  return product;
}

/** Every write touches the dossier's clock, so quiet is read from facts. */
async function touch(id: string): Promise<void> {
  await graphql(`mutation ($id: UUID!) { developmentProduct_update(id: $id, data: { lastActivityAt_expr: "request.time", updatedAt_expr: "request.time" }) }`, { id });
}

// ---------------------------------------------------------------- categories, collections, brand

const specField = z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(80), kind: z.enum(['text', 'number', 'select']), unit: z.string().max(16).optional(), options: z.array(z.string()).optional() });
const categoryInput = z.object({ code: z.string().regex(/^[A-Z0-9]{2,16}$/), name: z.string().min(1).max(80), description: z.string().max(2000).default(''), parentCode: z.string().nullable().default(null), specSchema: z.array(specField).default([]), sort: z.number().int().default(0), status: z.enum(['active', 'archived']).default('active') });

export const saveProductCategory = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, DEPARTMENT, 'Keeping product categories');
  const input = parse(categoryInput, request.data);
  if (input.parentCode === input.code) throw failure('validation', 'A category cannot be its own parent.');
  await graphql(
    `mutation ($code: String!, $name: String!, $slug: String!, $description: String, $parentCode: String, $specSchema: Any, $sort: Int!, $status: CategoryStatus!) {
      productCategory_upsert(data: { code: $code, name: $name, slug: $slug, description: $description, parentCode: $parentCode, specSchema: $specSchema, sort: $sort, status: $status }) }`,
    { code: input.code, name: input.name.trim(), slug: slugOf(input.name), description: input.description || null, parentCode: input.parentCode, specSchema: input.specSchema, sort: input.sort, status: input.status },
  );
  await audit(caller.uid, 'product_category.save', 'product_category', input.code, null, input);
  return { code: input.code };
});

const collectionInput = z.object({ code: z.string().regex(/^[A-Z0-9-]{2,16}$/), name: z.string().min(1).max(120), season: z.string().max(40).default(''), year: z.number().int().min(2020).max(2100).nullable().default(null), theme: z.string().max(4000).default(''), targetLaunch: date.nullable().default(null), status: z.enum(COLLECTION_STATUSES).default('planning'), moodDocumentId: z.string().nullable().default(null) });

export const saveCollection = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, DEPARTMENT, 'Keeping collections');
  const input = parse(collectionInput, request.data);
  await graphql(
    `mutation ($code: String!, $name: String!, $season: String, $year: Int, $theme: String, $targetLaunch: Date, $status: CollectionStatus!, $moodDocumentId: UUID) {
      collection_upsert(data: { code: $code, name: $name, season: $season, year: $year, theme: $theme, targetLaunch: $targetLaunch, status: $status, moodDocumentId: $moodDocumentId, updatedAt_expr: "request.time" }) }`,
    { code: input.code, name: input.name.trim(), season: input.season || null, year: input.year, theme: input.theme || null, targetLaunch: input.targetLaunch, status: input.status, moodDocumentId: input.moodDocumentId },
  );
  await audit(caller.uid, 'collection.save', 'collection', input.code, null, input);
  return { code: input.code };
});

const brandAssetInput = z.object({ id: z.string().optional(), kind: z.enum(BRAND_ASSET_KINDS), title: z.string().min(1).max(160), summary: z.string().max(8000).default(''), documentId: z.string().nullable().default(null), colourHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().default(null), colourName: z.string().max(80).default(''), paletteNumber: z.string().max(4).default(''), tags: z.array(z.string().max(40)).default([]), collectionCode: z.string().nullable().default(null), status: z.enum(BRAND_ASSET_STATUSES).default('draft'), sort: z.number().int().default(0) });

export const saveBrandAsset = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, BRAND, 'Keeping the Brand Centre');
  const input = parse(brandAssetInput, request.data);
  if (input.kind === 'colour' && !input.colourHex) throw failure('validation', 'A colour asset needs its hex.');
  const variables = { kind: input.kind, title: input.title.trim(), summary: input.summary || null, documentId: input.documentId, colourHex: input.colourHex?.toUpperCase() ?? null, colourName: input.colourName || null, paletteNumber: input.paletteNumber || null, tags: input.tags, collectionCode: input.collectionCode, status: input.status, sort: input.sort };
  const fields = `$kind: BrandAssetKind!, $title: String!, $summary: String, $documentId: UUID, $colourHex: String, $colourName: String, $paletteNumber: String, $tags: Any, $collectionCode: String, $status: BrandAssetStatus!, $sort: Int!`;
  const data = `kind: $kind, title: $title, summary: $summary, documentId: $documentId, colourHex: $colourHex, colourName: $colourName, paletteNumber: $paletteNumber, tags: $tags, collectionCode: $collectionCode, status: $status, sort: $sort`;
  let id: string;
  if (input.id) {
    await graphql(`mutation ($id: UUID!, ${fields}) { brandAsset_update(id: $id, data: { ${data}, updatedAt_expr: "request.time" }) }`, { id: input.id, ...variables });
    id = input.id;
  } else {
    const { brandAsset_insert } = await graphql<{ brandAsset_insert: { id: string } }>(`mutation (${fields}, $uid: String!) { brandAsset_insert(data: { ${data}, createdByUid: $uid }) }`, { ...variables, uid: caller.uid });
    id = brandAsset_insert.id;
  }
  await audit(caller.uid, input.id ? 'brand_asset.update' : 'brand_asset.create', 'brand_asset', id, null, variables);
  return { id };
});

// ---------------------------------------------------------------- the dossier

const productInput = z.object({
  number: z.string().regex(/^DEV-\d{2}-\d{4}$/).optional(),
  categoryCode: z.string().min(1),
  collectionCode: z.string().nullable().default(null),
  name: z.string().min(1).max(160),
  workingTitle: z.string().max(160).default(''),
  description: z.string().max(8000).default(''),
  intent: z.string().max(4000).default(''),
  priority: z.enum(PRIORITIES).default('normal'),
  ownerUid: z.string().nullable().default(null),
  targetLaunch: date.nullable().default(null),
  budgetAmount: stored.nullable().default(null),
  budgetCurrency: currency.default('USD'),
  specs: z.record(z.string(), z.string()).default({}),
});

/** A dossier opened or its facts changed. The stage is not here: it moves through the gate. */
export const saveDevelopmentProduct = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, DEPARTMENT, 'Keeping development products');
  const input = parse(productInput, request.data);
  const { productCategory } = await graphql<{ productCategory: { code: string } | null }>(`query ($code: String!) { productCategory(key: { code: $code }) { code } }`, { code: input.categoryCode });
  if (!productCategory) throw failure('not_found', `No category ${input.categoryCode}.`);
  const variables = { categoryCode: input.categoryCode, collectionCode: input.collectionCode, name: input.name.trim(), workingTitle: input.workingTitle || null, description: input.description || null, intent: input.intent || null, priority: input.priority, ownerUid: input.ownerUid ?? caller.uid, targetLaunch: input.targetLaunch, budgetAmount: input.budgetAmount, budgetCurrency: input.budgetCurrency, specs: input.specs };
  const fields = `$categoryCode: String!, $collectionCode: String, $name: String!, $workingTitle: String, $description: String, $intent: String, $priority: Priority!, $ownerUid: String, $targetLaunch: Date, $budgetAmount: Int64, $budgetCurrency: String, $specs: Any`;
  const data = `categoryCode: $categoryCode, collectionCode: $collectionCode, name: $name, workingTitle: $workingTitle, description: $description, intent: $intent, priority: $priority, ownerUid: $ownerUid, targetLaunch: $targetLaunch, budgetAmount: $budgetAmount, budgetCurrency: $budgetCurrency, specs: $specs`;
  if (input.number) {
    const product = await loadProduct(input.number);
    if (product.stage === 'commercial') throw failure('invariant_violation', `${product.number} is commercial; change the catalog product instead.`);
    await graphql(`mutation ($id: UUID!, ${fields}) { developmentProduct_update(id: $id, data: { ${data}, lastActivityAt_expr: "request.time", updatedAt_expr: "request.time" }) }`, { id: product.id, ...variables });
    await audit(caller.uid, 'development.update', 'development_product', product.number, null, variables);
    return { number: product.number, id: product.id };
  }
  const number = await allocateNumber('DEV');
  const { developmentProduct_insert } = await graphql<{ developmentProduct_insert: { id: string } }>(`mutation ($number: String!, ${fields}, $uid: String!) { developmentProduct_insert(data: { number: $number, ${data}, stage: idea, createdByUid: $uid }) }`, { number, ...variables, uid: caller.uid });
  await audit(caller.uid, 'development.create', 'development_product', number, null, variables);
  await timeline('development_product', number, 'created', caller.uid, `Opened as an idea: ${variables.name}`);
  await emit('development.opened', 'development_product', number, { name: variables.name, category: input.categoryCode });
  return { number, id: developmentProduct_insert.id };
});

async function gateFacts(product: ProductRow): Promise<GateFacts> {
  const [{ documentLinks }, { developmentSourcings }, { developmentSamples }, { developmentCostings }] = await Promise.all([
    graphql<{ documentLinks: { role: string | null }[] }>(`query ($id: String!) { documentLinks(where: { entityType: { eq: "development_product" }, entityId: { eq: $id } }, limit: 500) { role } }`, { id: product.number }),
    graphql<{ developmentSourcings: { isSelected: boolean; status: string }[] }>(`query ($id: UUID!) { developmentSourcings(where: { productId: { eq: $id } }, limit: 100) { isSelected status } }`, { id: product.id }),
    graphql<{ developmentSamples: { verdict: GateFacts['latestSampleVerdict'] }[] }>(`query ($id: UUID!) { developmentSamples(where: { productId: { eq: $id } }, orderBy: { round: DESC }, limit: 1) { verdict } }`, { id: product.id }),
    graphql<{ developmentCostings: { basis: GateFacts['costingBases'][number] }[] }>(`query ($id: UUID!) { developmentCostings(where: { productId: { eq: $id } }, limit: 100) { basis } }`, { id: product.id }),
  ]);
  const { developmentSamples: all } = await graphql<{ developmentSamples: { id: string }[] }>(`query ($id: UUID!) { developmentSamples(where: { productId: { eq: $id } }, limit: 1) { id } }`, { id: product.id });
  return {
    hasDescription: Boolean(product.description?.trim()),
    fileRoles: documentLinks.map((link) => link.role ?? 'other'),
    sourcingCount: developmentSourcings.filter((row) => row.status !== 'dropped').length,
    selectedSourcing: developmentSourcings.some((row) => row.isSelected),
    sampleRequested: all.length > 0,
    latestSampleVerdict: developmentSamples[0]?.verdict ?? null,
    costingBases: developmentCostings.map((row) => row.basis),
  };
}

const transitionInput = z.object({ number: z.string().regex(/^DEV-\d{2}-\d{4}$/), to: z.enum(DEVELOPMENT_STAGES), note: z.string().max(2000).default(''), decision: z.enum(APPROVAL_DECISIONS).default('approved') });

/** The gate. Entry conditions are counted here; a gate records who passed it. */
export const transitionDevelopment = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  const input = parse(transitionInput, request.data);
  const product = await loadProduct(input.number);
  if (!nextStages(product.stage).includes(input.to)) throw failure('invariant_violation', `${product.number} is ${product.stage}; it cannot move to ${input.to}.`);
  const gate = GATES[input.to];
  if (gate === 'owner') requireRole(caller, ['owner'], 'Approving production');
  else requireRole(caller, DEPARTMENT, 'Moving development products');
  if (gate && input.decision !== 'approved') {
    // A gate refused: the product stays where it is, and the refusal is on record.
    await graphql(`mutation ($id: UUID!, $gate: DevelopmentStage!, $decision: ApprovalDecision!, $uid: String!, $note: String) { developmentApproval_insert(data: { productId: $id, gate: $gate, decision: $decision, decidedByUid: $uid, note: $note }) }`, { id: product.id, gate: input.to, decision: input.decision, uid: caller.uid, note: input.note || null });
    await touch(product.id);
    await timeline('development_product', product.number, 'approval', caller.uid, `${input.to} ${input.decision}${input.note ? `: ${input.note}` : ''}`);
    await audit(caller.uid, 'development.gate', 'development_product', product.number, { stage: product.stage }, { gate: input.to, decision: input.decision });
    return { number: product.number, stage: product.stage, missing: [] };
  }
  const missing = gateCheck(input.to, await gateFacts(product));
  if (missing.length > 0) throw failure('invariant_violation', `${product.number} is not ready for ${input.to}: ${missing.join(' ')}`, Object.fromEntries(missing.map((item, index) => [`missing_${index + 1}`, item])));
  await graphql(`mutation ($id: UUID!, $stage: DevelopmentStage!) { developmentProduct_update(id: $id, data: { stage: $stage, lastActivityAt_expr: "request.time", updatedAt_expr: "request.time" }) }`, { id: product.id, stage: input.to });
  if (gate) await graphql(`mutation ($id: UUID!, $gate: DevelopmentStage!, $uid: String!, $note: String) { developmentApproval_insert(data: { productId: $id, gate: $gate, decision: approved, decidedByUid: $uid, note: $note }) }`, { id: product.id, gate: input.to, uid: caller.uid, note: input.note || null });
  await audit(caller.uid, 'development.transition', 'development_product', product.number, { stage: product.stage }, { stage: input.to, note: input.note || null });
  await emit(`development.${input.to}`, 'development_product', product.number, { name: product.name });
  await timeline('development_product', product.number, 'stage_changed', caller.uid, `${product.stage} to ${input.to}${input.note ? `: ${input.note}` : ''}`);
  return { number: product.number, stage: input.to, missing: [] };
});

const decisionInput = z.object({ number: z.string().regex(/^DEV-\d{2}-\d{4}$/), note: z.string().min(1).max(4000) });

/** A decision that is not a gate, on the record. */
export const recordDevelopmentDecision = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, [...DEPARTMENT, 'purchasing', 'finance', 'qc'], 'Recording decisions');
  const input = parse(decisionInput, request.data);
  const product = await loadProduct(input.number);
  await touch(product.id);
  await timeline('development_product', product.number, 'decision', caller.uid, input.note.trim());
  await audit(caller.uid, 'development.decision', 'development_product', product.number, null, { note: input.note.trim() });
  return { number: product.number };
});

// ---------------------------------------------------------------- parts

const partInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('material'), id: z.string().optional(), number: z.string(), role: z.string().min(1).max(40), name: z.string().min(1).max(160), specification: z.string().max(4000).default(''), skuCode: z.string().nullable().default(null), supplierId: z.string().nullable().default(null), status: z.enum(PART_STATUSES).default('proposed'), notes: z.string().max(2000).default('') }),
  z.object({ kind: z.literal('variant'), id: z.string().optional(), number: z.string(), code: z.string().min(1).max(16), name: z.string().min(1).max(120), shadeCode: z.string().nullable().default(null), colourHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().default(null), colourName: z.string().max(80).default(''), sizeLabel: z.string().max(40).default(''), dimensions: z.record(z.string(), z.string()).default({}), status: z.enum(PART_STATUSES).default('proposed'), sort: z.number().int().default(0) }),
  z.object({ kind: z.literal('packaging'), id: z.string().optional(), number: z.string(), component: z.string().min(1).max(60), specification: z.string().max(4000).default(''), material: z.string().max(120).default(''), dimensions: z.record(z.string(), z.string()).default({}), supplierId: z.string().nullable().default(null), status: z.enum(PART_STATUSES).default('proposed') }),
]);

/** A material, a variant or a packaging component of the dossier, added or changed. */
export const saveDevelopmentPart = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, DEPARTMENT, 'Keeping the dossier');
  const input = parse(partInput, request.data);
  const product = await loadProduct(input.number);
  let id: string;
  if (input.kind === 'material') {
    const v = { productId: product.id, role: input.role.trim(), name: input.name.trim(), specification: input.specification || null, skuCode: input.skuCode, supplierId: input.supplierId, status: input.status, notes: input.notes || null };
    const f = `$productId: UUID!, $role: String!, $name: String!, $specification: String, $skuCode: String, $supplierId: UUID, $status: PartStatus!, $notes: String`;
    const d = `productId: $productId, role: $role, name: $name, specification: $specification, skuCode: $skuCode, supplierId: $supplierId, status: $status, notes: $notes`;
    if (input.id) await graphql(`mutation ($id: UUID!, ${f}) { developmentMaterial_update(id: $id, data: { ${d} }) }`, { id: input.id, ...v });
    id = input.id ?? (await graphql<{ developmentMaterial_insert: { id: string } }>(`mutation (${f}) { developmentMaterial_insert(data: { ${d} }) }`, v)).developmentMaterial_insert.id;
  } else if (input.kind === 'variant') {
    const v = { productId: product.id, code: input.code.trim(), name: input.name.trim(), shadeCode: input.shadeCode, colourHex: input.colourHex?.toUpperCase() ?? null, colourName: input.colourName || null, sizeLabel: input.sizeLabel || null, dimensions: input.dimensions, status: input.status, sort: input.sort };
    const f = `$productId: UUID!, $code: String!, $name: String!, $shadeCode: String, $colourHex: String, $colourName: String, $sizeLabel: String, $dimensions: Any, $status: PartStatus!, $sort: Int!`;
    const d = `productId: $productId, code: $code, name: $name, shadeCode: $shadeCode, colourHex: $colourHex, colourName: $colourName, sizeLabel: $sizeLabel, dimensions: $dimensions, status: $status, sort: $sort`;
    if (input.id) await graphql(`mutation ($id: UUID!, ${f}) { developmentVariant_update(id: $id, data: { ${d} }) }`, { id: input.id, ...v });
    id = input.id ?? (await graphql<{ developmentVariant_insert: { id: string } }>(`mutation (${f}) { developmentVariant_insert(data: { ${d} }) }`, v)).developmentVariant_insert.id;
  } else {
    const v = { productId: product.id, component: input.component.trim(), specification: input.specification || null, material: input.material || null, dimensions: input.dimensions, supplierId: input.supplierId, status: input.status };
    const f = `$productId: UUID!, $component: String!, $specification: String, $material: String, $dimensions: Any, $supplierId: UUID, $status: PartStatus!`;
    const d = `productId: $productId, component: $component, specification: $specification, material: $material, dimensions: $dimensions, supplierId: $supplierId, status: $status`;
    if (input.id) await graphql(`mutation ($id: UUID!, ${f}) { developmentPackaging_update(id: $id, data: { ${d} }) }`, { id: input.id, ...v });
    id = input.id ?? (await graphql<{ developmentPackaging_insert: { id: string } }>(`mutation (${f}) { developmentPackaging_insert(data: { ${d} }) }`, v)).developmentPackaging_insert.id;
  }
  await touch(product.id);
  await audit(caller.uid, `development.${input.kind}.${input.id ? 'update' : 'add'}`, 'development_product', product.number, null, input);
  return { id };
});

// ---------------------------------------------------------------- samples

const sampleInput = z.object({ id: z.string().optional(), number: z.string(), kind: z.enum(SAMPLE_KINDS).default('proto'), supplierId: z.string().nullable().default(null), factoryId: z.string().nullable().default(null), requestedOn: date.nullable().default(null), receivedOn: date.nullable().default(null), verdict: z.enum(SAMPLE_VERDICTS).default('pending'), findings: z.string().max(8000).default(''), costAmount: stored.nullable().default(null), costCurrency: currency.default('USD') });

/** A sample round requested, received or judged. A verdict of revise moves the product to revision. */
export const saveDevelopmentSample = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  const input = parse(sampleInput, request.data);
  const product = await loadProduct(input.number);
  requireRole(caller, input.verdict === 'pending' ? [...DEPARTMENT, 'purchasing'] : VERDICT, input.verdict === 'pending' ? 'Requesting samples' : 'Judging samples');
  const { developmentSamples } = await graphql<{ developmentSamples: { id: string; round: number; verdict: string }[] }>(`query ($id: UUID!) { developmentSamples(where: { productId: { eq: $id } }, orderBy: { round: DESC }, limit: 100) { id round verdict } }`, { id: product.id });
  const existing = input.id ? developmentSamples.find((row) => row.id === input.id) : undefined;
  if (input.id && !existing) throw failure('not_found', 'No such sample round.');
  const judged = input.verdict !== 'pending' && existing?.verdict !== input.verdict;
  const variables = { productId: product.id, round: existing?.round ?? (developmentSamples[0]?.round ?? 0) + 1, kind: input.kind, supplierId: input.supplierId, factoryId: input.factoryId, requestedOn: input.requestedOn ?? (existing ? null : today()), receivedOn: input.receivedOn, verdict: input.verdict, verdictByUid: judged ? caller.uid : null, verdictOn: judged ? today() : null, findings: input.findings || null, costAmount: input.costAmount, costCurrency: input.costCurrency };
  const fields = `$productId: UUID!, $round: Int!, $kind: SampleKind!, $supplierId: UUID, $factoryId: UUID, $requestedOn: Date, $receivedOn: Date, $verdict: SampleVerdict!, $verdictByUid: String, $verdictOn: Date, $findings: String, $costAmount: Int64, $costCurrency: String`;
  let id: string;
  if (existing) {
    const data = `kind: $kind, supplierId: $supplierId, factoryId: $factoryId, ${input.requestedOn ? 'requestedOn: $requestedOn, ' : ''}receivedOn: $receivedOn, verdict: $verdict, ${judged ? 'verdictByUid: $verdictByUid, verdictOn: $verdictOn, ' : ''}findings: $findings, costAmount: $costAmount, costCurrency: $costCurrency`;
    await graphql(`mutation ($id: UUID!, ${fields}) { developmentSample_update(id: $id, data: { ${data} }) }`, { id: existing.id, ...variables });
    id = existing.id;
  } else {
    const { developmentSample_insert } = await graphql<{ developmentSample_insert: { id: string } }>(`mutation (${fields}) { developmentSample_insert(data: { productId: $productId, round: $round, kind: $kind, supplierId: $supplierId, factoryId: $factoryId, requestedOn: $requestedOn, receivedOn: $receivedOn, verdict: $verdict, verdictByUid: $verdictByUid, verdictOn: $verdictOn, findings: $findings, costAmount: $costAmount, costCurrency: $costCurrency }) }`, variables);
    id = developmentSample_insert.id;
  }
  await touch(product.id);
  if (judged && input.verdict === 'revise' && product.stage === 'sampling') {
    await graphql(`mutation ($id: UUID!) { developmentProduct_update(id: $id, data: { stage: revision }) }`, { id: product.id });
    await timeline('development_product', product.number, 'stage_changed', caller.uid, `sampling to revision: round ${variables.round} came back to revise`);
  }
  await timeline('development_product', product.number, judged ? 'sample_verdict' : 'sample', caller.uid, judged ? `Round ${variables.round} ${input.verdict}${input.findings ? `: ${input.findings.slice(0, 160)}` : ''}` : `Round ${variables.round} ${existing ? 'updated' : 'requested'} (${input.kind})`);
  await audit(caller.uid, existing ? 'development.sample.update' : 'development.sample.request', 'development_product', product.number, existing ?? null, variables);
  return { id, round: variables.round };
});

// ---------------------------------------------------------------- sourcing

const sourcingInput = z.object({ id: z.string().optional(), number: z.string(), supplierId: z.string().min(1), factoryId: z.string().nullable().default(null), kind: z.enum(SOURCING_KINDS).default('odm'), status: z.enum(SOURCING_STATUSES).default('candidate'), moq: stored.nullable().default(null), leadTimeDays: z.number().int().min(0).nullable().default(null), sampleLeadDays: z.number().int().min(0).nullable().default(null), unitCost: stored.nullable().default(null), currency: currency.default('USD'), sampleCost: stored.nullable().default(null), developmentCost: stored.nullable().default(null), toolingCost: stored.nullable().default(null), paymentTerms: z.string().max(120).default(''), incoterm: z.string().regex(/^[A-Z]{3}$/).nullable().default(null), namedPlace: z.string().max(120).default(''), quotationDocumentId: z.string().nullable().default(null), quotedOn: date.nullable().default(null), validUntil: date.nullable().default(null), notes: z.string().max(4000).default(''), select: z.boolean().default(false) });

/** A candidate supplier for a product, and the choice of one. Cost roles only. */
export const saveDevelopmentSourcing = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, SOURCING, 'Keeping sourcing');
  const input = parse(sourcingInput, request.data);
  const product = await loadProduct(input.number);
  const { company } = await graphql<{ company: { id: string; legalName: string; tradingName: string | null } | null }>(`query ($id: UUID!) { company(id: $id) { id legalName tradingName } }`, { id: input.supplierId });
  if (!company) throw failure('not_found', 'No such company.');
  const supplierName = company.tradingName || company.legalName;
  const status = input.select ? 'selected' : input.status === 'selected' && !input.select ? 'quoted' : input.status;
  if (input.select) await graphql(`mutation ($productId: UUID!) { developmentSourcing_updateMany(where: { productId: { eq: $productId }, isSelected: { eq: true } }, data: { isSelected: false, status: quoted }) }`, { productId: product.id });
  const variables = { productId: product.id, supplierId: company.id, factoryId: input.factoryId, kind: input.kind, status, moq: input.moq, leadTimeDays: input.leadTimeDays, sampleLeadDays: input.sampleLeadDays, unitCost: input.unitCost, currency: input.currency, sampleCost: input.sampleCost, developmentCost: input.developmentCost, toolingCost: input.toolingCost, paymentTerms: input.paymentTerms || null, incoterm: input.incoterm, namedPlace: input.namedPlace || null, quotationDocumentId: input.quotationDocumentId, quotedOn: input.quotedOn, validUntil: input.validUntil, isSelected: input.select, notes: input.notes || null };
  const fields = `$productId: UUID!, $supplierId: UUID!, $factoryId: UUID, $kind: SourcingKind!, $status: SourcingStatus!, $moq: Int64, $leadTimeDays: Int, $sampleLeadDays: Int, $unitCost: Int64, $currency: String!, $sampleCost: Int64, $developmentCost: Int64, $toolingCost: Int64, $paymentTerms: String, $incoterm: String, $namedPlace: String, $quotationDocumentId: UUID, $quotedOn: Date, $validUntil: Date, $isSelected: Boolean!, $notes: String`;
  const data = `productId: $productId, supplierId: $supplierId, factoryId: $factoryId, kind: $kind, status: $status, moq: $moq, leadTimeDays: $leadTimeDays, sampleLeadDays: $sampleLeadDays, unitCost: $unitCost, currency: $currency, sampleCost: $sampleCost, developmentCost: $developmentCost, toolingCost: $toolingCost, paymentTerms: $paymentTerms, incoterm: $incoterm, namedPlace: $namedPlace, quotationDocumentId: $quotationDocumentId, quotedOn: $quotedOn, validUntil: $validUntil, isSelected: $isSelected, notes: $notes`;
  let id: string;
  if (input.id) {
    await graphql(`mutation ($id: UUID!, ${fields}) { developmentSourcing_update(id: $id, data: { ${data}, updatedAt_expr: "request.time" }) }`, { id: input.id, ...variables });
    id = input.id;
  } else {
    const { developmentSourcing_insert } = await graphql<{ developmentSourcing_insert: { id: string } }>(`mutation (${fields}) { developmentSourcing_insert(data: { ${data} }) }`, variables);
    id = developmentSourcing_insert.id;
  }
  await touch(product.id);
  // The timeline names the supplier only to the cost roles' screens; the event itself stays neutral.
  await timeline('development_product', product.number, input.select ? 'supplier_selected' : 'sourcing', caller.uid, input.select ? 'A supplier was selected' : `Sourcing ${input.id ? 'updated' : 'candidate added'} (${input.kind})`);
  await audit(caller.uid, input.select ? 'development.sourcing.select' : input.id ? 'development.sourcing.update' : 'development.sourcing.add', 'development_product', product.number, null, { ...variables, supplierName });
  return { id };
});

// ---------------------------------------------------------------- costing

const costingInput = z.object({ id: z.string().optional(), number: z.string(), basis: z.enum(COSTING_BASES), currency: currency.default('USD'), unitCost: stored, packagingCost: stored.default('0'), freightCost: stored.default('0'), dutyCost: stored.default('0'), otherCost: stored.default('0'), quantity: stored.nullable().default(null), plannedPrice: stored.nullable().default(null), wholesalePrice: stored.nullable().default(null), sourcingId: z.string().nullable().default(null), notes: z.string().max(4000).default('') });

/** A costing on a basis: an estimate, a quotation, or the approved numbers. Landed cost and margin are read from it. */
export const saveDevelopmentCosting = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, COSTING, 'Keeping costings');
  const input = parse(costingInput, request.data);
  const product = await loadProduct(input.number);
  if (input.basis === 'quotation' && !input.sourcingId) throw failure('validation', 'A quotation costing rests on a sourcing quotation; choose it.');
  const variables = { productId: product.id, basis: input.basis, currency: input.currency, unitCost: input.unitCost, packagingCost: input.packagingCost, freightCost: input.freightCost, dutyCost: input.dutyCost, otherCost: input.otherCost, quantity: input.quantity, plannedPrice: input.plannedPrice, wholesalePrice: input.wholesalePrice, sourcingId: input.sourcingId, notes: input.notes || null };
  const fields = `$productId: UUID!, $basis: CostingBasis!, $currency: String!, $unitCost: Int64!, $packagingCost: Int64!, $freightCost: Int64!, $dutyCost: Int64!, $otherCost: Int64!, $quantity: Int64, $plannedPrice: Int64, $wholesalePrice: Int64, $sourcingId: UUID, $notes: String`;
  const data = `productId: $productId, basis: $basis, currency: $currency, unitCost: $unitCost, packagingCost: $packagingCost, freightCost: $freightCost, dutyCost: $dutyCost, otherCost: $otherCost, quantity: $quantity, plannedPrice: $plannedPrice, wholesalePrice: $wholesalePrice, sourcingId: $sourcingId, notes: $notes`;
  let id: string;
  if (input.id) {
    await graphql(`mutation ($id: UUID!, ${fields}) { developmentCosting_update(id: $id, data: { ${data} }) }`, { id: input.id, ...variables });
    id = input.id;
  } else {
    const { developmentCosting_insert } = await graphql<{ developmentCosting_insert: { id: string } }>(`mutation (${fields}, $uid: String!) { developmentCosting_insert(data: { ${data}, createdByUid: $uid }) }`, { ...variables, uid: caller.uid });
    id = developmentCosting_insert.id;
  }
  await touch(product.id);
  await timeline('development_product', product.number, 'costing', caller.uid, `Costing on ${input.basis} basis ${input.id ? 'updated' : 'added'}`);
  await audit(caller.uid, input.id ? 'development.costing.update' : 'development.costing.add', 'development_product', product.number, null, variables);
  return { id };
});
