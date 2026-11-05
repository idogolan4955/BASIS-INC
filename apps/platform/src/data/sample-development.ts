import { BRAND_PALETTE, DEVELOPMENT_CATALOG, addDays, developmentHealth, gateCheck, localDate, nextStages, slugOf, todayIn, type BrandAssetView, type CollectionView, type DevelopmentCostingView, type DevelopmentProductDetail, type DevelopmentProductSummary, type DevelopmentSourcingView, type DevelopmentStage, type LocalDate, type ProductCategoryView } from '@basis/shared';
import type { FiledDocument } from './documents';
import type { BrandAssetInput, CategoryInput, CollectionInput, CostingInput, PartInput, ProductInput, SampleInput, SourcingInput, TransitionInput } from './development';

// SAMPLE DATA for `--mode sample`: the owner's consumer line exactly as the
// seed opens it (the same catalogue, the same order, so the same numbers),
// the brand palette as colour assets, and the concept boards as proposal
// files. Every dossier starts at the idea stage with no samples, sourcing or
// costing: none exist yet. The gate and the health run on the same rules as
// the functions.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const now = () => new Date().toISOString();
const ago = (days: number) => `${addDays(todayIn('Asia/Jerusalem'), -days)}T10:00:00Z`;

const SUPPLIERS: Record<string, string> = { 'co-jinyu': 'Jinyu Knitting', 'co-lanrui': 'Lanrui Textile' };

type DetailRecord = Mutable<Omit<DevelopmentProductDetail, 'health' | 'latestSample' | 'categoryName' | 'collectionName' | 'specSchema'>> & { materials: Mutable<DevelopmentProductDetail['materials'][number]>[]; variants: Mutable<DevelopmentProductDetail['variants'][number]>[]; packaging: Mutable<DevelopmentProductDetail['packaging'][number]>[]; samples: Mutable<DevelopmentProductDetail['samples'][number]>[]; approvals: Mutable<DevelopmentProductDetail['approvals'][number]>[] };

function product(over: Partial<DetailRecord> & { id: string; number: string; name: string; categoryCode: string; stage: DevelopmentStage }): DetailRecord {
  return { workingTitle: '', collectionCode: null, priority: 'normal', ownerUid: 'sample-owner', ownerName: 'Owner', targetLaunch: null, budgetAmount: null, budgetCurrency: 'USD', catalogProductCode: null, lastActivityAt: ago(0), createdAt: ago(0), description: '', intent: '', specs: {}, handedOverAt: null, materials: [], variants: [], packaging: [], samples: [], approvals: [], ...over };
}

const numberOf = (index: number) => `DEV-26-${String(index + 1).padStart(4, '0')}`;

const store = {
  categories: DEVELOPMENT_CATALOG.categories.map((category) => ({ code: category.code, name: category.name, slug: slugOf(category.name), description: category.description, parentCode: category.parent, sort: category.sort, status: 'active', specSchema: [...category.specSchema] })) as Mutable<ProductCategoryView>[],
  collections: DEVELOPMENT_CATALOG.collections.map((collection) => ({ ...collection, targetLaunch: collection.targetLaunch ? localDate(collection.targetLaunch) : null })) as Mutable<CollectionView>[],
  assets: [
    { id: 'ba-story', kind: 'story', title: 'The materials that shape the dress', summary: 'BASIS makes the foundation layers of bridal construction: the mesh that shapes, the lining that lets the silk fall, the tulle that carries volume. The objects carry the same idea into the everyday: better basics, everyday luxury, inspired by the materials behind fashion. Quiet luxury, industrial precision, skin tones first.', colourHex: null, colourName: '', paletteNumber: '', tags: ['brand'], collectionCode: null, status: 'approved', sort: 1, document: null, updatedAt: ago(40) },
    ...BRAND_PALETTE.filter((tone) => tone.group === 'material').map((tone, index) => ({ id: `ba-colour-${tone.number}`, kind: 'colour' as const, title: tone.name, summary: tone.use, colourHex: tone.hex, colourName: tone.name, paletteNumber: tone.number, tags: ['palette'], collectionCode: null, status: 'approved' as const, sort: index + 1, document: null, updatedAt: ago(40) })),
    { id: 'ba-type', kind: 'typeface', title: 'EB Garamond and Source Sans 3', summary: 'Display in a high-contrast serif with tracked small capitals; body in a humanist sans; codes in Martian Mono.', colourHex: null, colourName: '', paletteNumber: '', tags: ['brand'], collectionCode: null, status: 'approved', sort: 1, document: null, updatedAt: ago(40) },
    { id: 'ba-guide', kind: 'guideline', title: 'Packaging: matte wrap, shade-matched', summary: 'Every object ships in a shade-matched matte wrap with an end-cap label carrying the code, as the rolls do.', colourHex: null, colourName: '', paletteNumber: '', tags: ['packaging'], collectionCode: 'FW27', status: 'approved', sort: 1, document: null, updatedAt: ago(12) },
  ] as Mutable<BrandAssetView>[],
  products: DEVELOPMENT_CATALOG.products.map((entry, index) =>
    product({
      id: entry.id,
      number: numberOf(index),
      name: entry.name,
      workingTitle: entry.workingTitle,
      categoryCode: entry.category,
      collectionCode: entry.collection,
      stage: 'idea',
      priority: entry.priority,
      description: entry.description,
      intent: entry.intent,
      specs: { ...entry.specs },
      materials: entry.materials.map((material, at) => ({ id: `${entry.id}-m${at + 1}`, role: material.role, name: material.name, specification: material.specification, skuCode: null, supplierId: null, supplierName: '', status: 'proposed' as const, notes: material.notes })),
      variants: entry.variants.map((variant, at) => ({ id: `${entry.id}-v${at + 1}`, code: variant.code, name: variant.name, shadeCode: null, shadeName: '', colourHex: variant.colourHex, colourName: variant.colourName, sizeLabel: variant.sizeLabel, dimensions: { ...variant.dimensions }, status: 'proposed' as const, sort: at + 1 })),
      packaging: entry.packaging.map((component, at) => ({ id: `${entry.id}-p${at + 1}`, component: component.component, specification: component.specification, material: component.material, dimensions: { ...component.dimensions }, supplierId: null, supplierName: '', status: 'proposed' as const })),
    }),
  ) as DetailRecord[],
  sourcing: new Map<string, Mutable<DevelopmentSourcingView>[]>(),
  costing: new Map<string, Mutable<DevelopmentCostingView>[]>(),
  files: new Map<string, FiledDocument[]>(),
  sequence: { DEV: DEVELOPMENT_CATALOG.products.length, part: 0, sample: 0, sourcing: 0, costing: 0, asset: 30, doc: 0 },
};

// The owner's concept boards of 2026-11-05, filed as proposals on the
// dossiers they show. Sample mode lists them; it holds no image.
const BOARDS: readonly { title: string; file: string; sizeBytes: number; products: readonly string[] }[] = [
  { title: 'The T-Shirt Collection board', file: 't-shirt-collection.webp', sizeBytes: 121898, products: ['Essential Tee', 'Baby Tee', 'Sculpt Tee', 'Relaxed Tee'] },
  { title: 'Baby Tee and Sculpt Tee board', file: 't-shirt-collection-baby-sculpt.webp', sizeBytes: 83458, products: ['Baby Tee', 'Sculpt Tee'] },
  { title: 'The Everyday Edit board', file: 'everyday-edit.webp', sizeBytes: 93784, products: ['Essential Tee', 'Relaxed Tee'] },
  { title: 'Model 1 board', file: 'model-1.webp', sizeBytes: 270892, products: ['Model 1'] },
  { title: 'Model 1 material stories board', file: 'model-1-materials.webp', sizeBytes: 309528, products: ['Model 1'] },
  { title: 'iPhone 18 Case Collection, Drop 01 board', file: 'iphone-18-case-drop-01.webp', sizeBytes: 288290, products: ['iPhone 18 Case'] },
  { title: 'Home Fragrance board', file: 'home-fragrance.webp', sizeBytes: 170482, products: ['Home Fragrance Reed Diffuser'] },
  { title: 'Flow Form board', file: 'flow-form.webp', sizeBytes: 289388, products: ['Flow Form 01'] },
  { title: 'Flow Form 01 One Tone board', file: 'flow-form-01-one-tone.webp', sizeBytes: 184834, products: ['Flow Form 01'] },
  // The fragrance and sleepwear boards arrived in the conversation, not as files: their sizes are nominal.
  { title: 'Second Skin Eau de Parfum board', file: 'second-skin.webp', sizeBytes: 150000, products: ['Second Skin'] },
  { title: 'Eau de Parfum trio board', file: 'eau-de-parfum-trio.webp', sizeBytes: 150000, products: ['Second Skin', 'Illusion Mesh', 'N58'] },
  { title: 'Sleepwear / Babydoll Collection board', file: 'sleepwear-babydoll-collection.webp', sizeBytes: 150000, products: ['Classic Pajama Set', 'Satin Pajama Set', 'Ribbed Pajama Set', 'Lace Babydoll', 'Sheer Babydoll', 'Silk Touch Babydoll', 'Mesh Babydoll', 'Short Robe', 'Long Robe', 'Lace Kimono', 'Satin Robe', 'Cami Set', 'Tank Set', 'Long Sleeve', 'Soft Shorts', 'Cami Top'] },
];
BOARDS.forEach((board, index) => {
  for (const name of board.products) {
    const record = store.products.find((candidate) => candidate.name === name);
    if (!record) continue;
    store.files.set(record.number, [...(store.files.get(record.number) ?? []), { id: `f-${index + 1}-${record.number}`, kind: 'photo', title: board.title, number: '', issuedOn: null, expiresOn: null, storagePath: `sample://proposal/${board.file}`, mimeType: 'image/webp', sizeBytes: board.sizeBytes, createdAt: ago(0), uploadedBy: 'Owner', links: [{ entityType: 'development_product', entityId: record.number, role: 'proposal' }] }]);
  }
});

const categoryName = (code: string) => store.categories.find((category) => category.code === code)?.name ?? code;
const collectionName = (code: string | null) => (code ? (store.collections.find((collection) => collection.code === code)?.name ?? code) : '');

function summaryOf(record: DetailRecord, day: LocalDate): DevelopmentProductSummary {
  const latest = [...record.samples].sort((a, b) => b.round - a.round)[0];
  const latestSample = latest ? { round: latest.round, verdict: latest.verdict, receivedOn: latest.receivedOn } : null;
  return { ...record, categoryName: categoryName(record.categoryCode), collectionName: collectionName(record.collectionCode), latestSample, health: developmentHealth({ stage: record.stage, targetLaunch: record.targetLaunch, lastActivityAt: record.lastActivityAt, latestSample }, day) };
}

const find = (number: string) => {
  const record = store.products.find((candidate) => candidate.number === number);
  if (!record) throw new Error(`No development product ${number}.`);
  return record;
};
const touch = (record: DetailRecord) => {
  record.lastActivityAt = now();
};

export const sampleDevelopment = {
  async categories(): Promise<ProductCategoryView[]> {
    return structuredClone(store.categories);
  },
  async collections(): Promise<CollectionView[]> {
    return structuredClone(store.collections);
  },
  async brandAssets(): Promise<BrandAssetView[]> {
    return structuredClone(store.assets);
  },
  async products(day: LocalDate): Promise<DevelopmentProductSummary[]> {
    return store.products.map((record) => summaryOf(record, day));
  },
  async product(number: string, day: LocalDate): Promise<DevelopmentProductDetail | null> {
    const record = store.products.find((candidate) => candidate.number === number);
    if (!record) return null;
    return structuredClone({ ...record, ...summaryOf(record, day), specSchema: store.categories.find((category) => category.code === record.categoryCode)?.specSchema ?? [] });
  },
  async sourcing(productId: string): Promise<DevelopmentSourcingView[]> {
    return structuredClone(store.sourcing.get(productId) ?? []);
  },
  async costing(productId: string): Promise<DevelopmentCostingView[]> {
    return structuredClone(store.costing.get(productId) ?? []);
  },
  /** Files of a dossier: module 12's sample list does not know them, so the dossier asks here. */
  filesFor(entityId: string): FiledDocument[] {
    return structuredClone(store.files.get(entityId) ?? []);
  },
  async upload(input: { entityType: string; entityId: string; role: string; file: File; title?: string }): Promise<FiledDocument> {
    store.sequence.doc += 1;
    const document: FiledDocument = { id: `f-up-${store.sequence.doc}`, kind: input.file.type.startsWith('image/') ? 'photo' : 'other', title: input.title?.trim() || input.file.name, number: '', issuedOn: null, expiresOn: null, storagePath: `sample://${input.role}/${input.file.name}`, mimeType: input.file.type, sizeBytes: input.file.size, createdAt: now(), uploadedBy: 'Owner', links: [{ entityType: input.entityType, entityId: input.entityId, role: input.role }] };
    store.files.set(input.entityId, [...(store.files.get(input.entityId) ?? []), document]);
    const record = store.products.find((candidate) => candidate.number === input.entityId);
    if (record) touch(record);
    return document;
  },

  async saveCategory(input: CategoryInput): Promise<{ code: string }> {
    const next = { ...input, slug: slugOf(input.name) };
    const index = store.categories.findIndex((category) => category.code === input.code);
    if (index >= 0) store.categories[index] = next;
    else store.categories.push(next);
    return { code: input.code };
  },
  async saveCollection(input: CollectionInput): Promise<{ code: string }> {
    const next = { ...input, targetLaunch: input.targetLaunch ? localDate(input.targetLaunch) : null };
    const index = store.collections.findIndex((collection) => collection.code === input.code);
    if (index >= 0) store.collections[index] = next;
    else store.collections.push(next);
    return { code: input.code };
  },
  async saveBrandAsset(input: BrandAssetInput): Promise<{ id: string }> {
    if (input.kind === 'colour' && !input.colourHex) throw new Error('A colour asset needs its hex.');
    const existing = input.id ? store.assets.find((asset) => asset.id === input.id) : undefined;
    const facts = { kind: input.kind, title: input.title.trim(), summary: input.summary, colourHex: input.colourHex, colourName: input.colourName, paletteNumber: input.paletteNumber, tags: input.tags, collectionCode: input.collectionCode, status: input.status, sort: input.sort, updatedAt: now() };
    if (existing) {
      Object.assign(existing, facts);
      return { id: existing.id };
    }
    store.sequence.asset += 1;
    const id = `ba-${store.sequence.asset}`;
    store.assets.push({ ...facts, id, document: null });
    return { id };
  },
  async saveProduct(input: ProductInput): Promise<{ number: string; id: string }> {
    const facts = { categoryCode: input.categoryCode, collectionCode: input.collectionCode, name: input.name.trim(), workingTitle: input.workingTitle, description: input.description, intent: input.intent, priority: input.priority, targetLaunch: input.targetLaunch ? localDate(input.targetLaunch) : null, budgetAmount: input.budgetAmount, budgetCurrency: input.budgetCurrency, specs: input.specs };
    if (input.number) {
      const record = find(input.number);
      Object.assign(record, facts);
      touch(record);
      return { number: record.number, id: record.id };
    }
    store.sequence.DEV += 1;
    const number = `DEV-26-${String(store.sequence.DEV).padStart(4, '0')}`;
    const record = product({ id: `dev-${store.sequence.DEV}`, number, stage: 'idea', ...facts, lastActivityAt: now(), createdAt: now() });
    store.products.unshift(record);
    return { number, id: record.id };
  },
  async transition(input: TransitionInput): Promise<{ number: string; stage: DevelopmentStage; missing: string[] }> {
    const record = find(input.number);
    if (!nextStages(record.stage).includes(input.to)) throw new Error(`${record.number} is ${record.stage}; it cannot move to ${input.to}.`);
    if (input.decision && input.decision !== 'approved') {
      record.approvals.unshift({ id: `a-${Date.now()}`, gate: input.to, decision: input.decision, decidedByName: 'Owner', decidedAt: now(), note: input.note });
      touch(record);
      return { number: record.number, stage: record.stage, missing: [] };
    }
    const sourcing = store.sourcing.get(record.id) ?? [];
    const latest = [...record.samples].sort((a, b) => b.round - a.round)[0];
    const missing = gateCheck(input.to, { hasDescription: Boolean(record.description.trim()), fileRoles: (store.files.get(record.number) ?? []).flatMap((file) => file.links.map((link) => link.role)), sourcingCount: sourcing.filter((row) => row.status !== 'dropped').length, selectedSourcing: sourcing.some((row) => row.isSelected), sampleRequested: record.samples.length > 0, latestSampleVerdict: latest?.verdict ?? null, costingBases: (store.costing.get(record.id) ?? []).map((row) => row.basis) });
    if (missing.length > 0) throw new Error(`${record.number} is not ready for ${input.to}: ${missing.join(' ')}`);
    record.stage = input.to;
    if (['concept', 'feasibility', 'sampling', 'approved_for_production'].includes(input.to)) record.approvals.unshift({ id: `a-${Date.now()}`, gate: input.to, decision: 'approved', decidedByName: 'Owner', decidedAt: now(), note: input.note });
    touch(record);
    return { number: record.number, stage: input.to, missing: [] };
  },
  async savePart(input: PartInput): Promise<{ id: string }> {
    const record = find(input.number);
    store.sequence.part += 1;
    const id = input.id ?? `part-${store.sequence.part}`;
    if (input.kind === 'material') {
      const next = { id, role: input.role, name: input.name, specification: input.specification, skuCode: input.skuCode, supplierId: input.supplierId, supplierName: input.supplierId ? (SUPPLIERS[input.supplierId] ?? input.supplierId) : '', status: input.status, notes: input.notes };
      const index = record.materials.findIndex((row) => row.id === id);
      if (index >= 0) record.materials[index] = next;
      else record.materials.push(next);
    } else if (input.kind === 'variant') {
      const next = { id, code: input.code, name: input.name, shadeCode: input.shadeCode, shadeName: input.shadeCode ?? '', colourHex: input.colourHex, colourName: input.colourName, sizeLabel: input.sizeLabel, dimensions: input.dimensions, status: input.status, sort: input.sort };
      const index = record.variants.findIndex((row) => row.id === id);
      if (index >= 0) record.variants[index] = next;
      else record.variants.push(next);
    } else {
      const next = { id, component: input.component, specification: input.specification, material: input.material, dimensions: input.dimensions, supplierId: input.supplierId, supplierName: input.supplierId ? (SUPPLIERS[input.supplierId] ?? input.supplierId) : '', status: input.status };
      const index = record.packaging.findIndex((row) => row.id === id);
      if (index >= 0) record.packaging[index] = next;
      else record.packaging.push(next);
    }
    touch(record);
    return { id };
  },
  async saveSample(input: SampleInput): Promise<{ id: string; round: number }> {
    const record = find(input.number);
    const existing = input.id ? record.samples.find((row) => row.id === input.id) : undefined;
    const round = existing?.round ?? Math.max(0, ...record.samples.map((row) => row.round)) + 1;
    const judged = input.verdict !== 'pending' && existing?.verdict !== input.verdict;
    const next = { id: existing?.id ?? `s-${Date.now()}`, round, kind: input.kind, supplierId: input.supplierId, supplierName: input.supplierId ? (SUPPLIERS[input.supplierId] ?? input.supplierId) : '', requestedOn: input.requestedOn ? localDate(input.requestedOn) : (existing?.requestedOn ?? todayIn('Asia/Jerusalem')), receivedOn: input.receivedOn ? localDate(input.receivedOn) : null, verdict: input.verdict, verdictByName: judged ? 'Owner' : (existing?.verdictByName ?? ''), verdictOn: judged ? todayIn('Asia/Jerusalem') : (existing?.verdictOn ?? null), findings: input.findings, costAmount: input.costAmount, costCurrency: input.costCurrency };
    if (existing) Object.assign(existing, next);
    else record.samples.push(next);
    if (judged && input.verdict === 'revise' && record.stage === 'sampling') record.stage = 'revision';
    touch(record);
    return { id: next.id, round };
  },
  async saveSourcing(input: SourcingInput): Promise<{ id: string }> {
    const record = find(input.number);
    const rows = store.sourcing.get(record.id) ?? [];
    if (input.select) for (const row of rows) if (row.isSelected) { row.isSelected = false; row.status = 'quoted'; }
    store.sequence.sourcing += 1;
    const id = input.id ?? `src-${store.sequence.sourcing}`;
    const next = { id, supplierId: input.supplierId, supplierName: SUPPLIERS[input.supplierId] ?? input.supplierId, factoryId: input.factoryId, factoryName: '', kind: input.kind, status: input.select ? 'selected' as const : input.status, moq: input.moq, leadTimeDays: input.leadTimeDays, sampleLeadDays: input.sampleLeadDays, unitCost: input.unitCost, currency: input.currency, sampleCost: input.sampleCost, developmentCost: input.developmentCost, toolingCost: input.toolingCost, paymentTerms: input.paymentTerms, incoterm: input.incoterm ?? '', namedPlace: input.namedPlace, quotedOn: input.quotedOn ? localDate(input.quotedOn) : null, validUntil: input.validUntil ? localDate(input.validUntil) : null, isSelected: input.select, notes: input.notes };
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows[index] = next;
    else rows.push(next);
    store.sourcing.set(record.id, rows);
    touch(record);
    return { id };
  },
  async saveCosting(input: CostingInput): Promise<{ id: string }> {
    const record = find(input.number);
    if (input.basis === 'quotation' && !input.sourcingId) throw new Error('A quotation costing rests on a sourcing quotation; choose it.');
    const rows = store.costing.get(record.id) ?? [];
    store.sequence.costing += 1;
    const id = input.id ?? `c-${store.sequence.costing}`;
    const next = { id, basis: input.basis, currency: input.currency, unitCost: input.unitCost, packagingCost: input.packagingCost, freightCost: input.freightCost, dutyCost: input.dutyCost, otherCost: input.otherCost, quantity: input.quantity, plannedPrice: input.plannedPrice, wholesalePrice: input.wholesalePrice, sourcingId: input.sourcingId, notes: input.notes, createdByName: 'Owner', createdAt: now() };
    const index = rows.findIndex((row) => row.id === id);
    if (index >= 0) rows[index] = { ...rows[index]!, ...next, createdAt: rows[index]!.createdAt };
    else rows.push(next);
    store.costing.set(record.id, rows);
    touch(record);
    return { id };
  },
  async decide(input: { number: string; note: string }): Promise<{ number: string }> {
    touch(find(input.number));
    return { number: input.number };
  },
};
