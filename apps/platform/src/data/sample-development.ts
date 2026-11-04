import { BRAND_PALETTE, addDays, developmentHealth, gateCheck, localDate, nextStages, slugOf, todayIn, type BrandAssetView, type CollectionView, type DevelopmentCostingView, type DevelopmentProductDetail, type DevelopmentProductSummary, type DevelopmentSourcingView, type DevelopmentStage, type LocalDate, type ProductCategoryView } from '@basis/shared';
import type { FiledDocument } from './documents';
import type { BrandAssetInput, CategoryInput, CollectionInput, CostingInput, PartInput, ProductInput, SampleInput, SourcingInput, TransitionInput } from './development';

// SAMPLE DATA for `--mode sample`: six categories, one collection, the brand
// palette as colour assets, and four products at different stages of the
// gate. The gate and the health run on the same rules as the functions.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const now = () => new Date().toISOString();
const ago = (days: number) => `${addDays(todayIn('Asia/Jerusalem'), -days)}T10:00:00Z`;
const dayAgo = (days: number) => addDays(todayIn('Asia/Jerusalem'), -days);
const dayAhead = (days: number) => addDays(todayIn('Asia/Jerusalem'), days);

const SUPPLIERS: Record<string, string> = { 'co-jinyu': 'Jinyu Knitting', 'co-lanrui': 'Lanrui Textile', 'co-ferrante': 'Ferrante Pelletteria', 'co-aromes': 'Arômes de Grasse' };

type DetailRecord = Mutable<Omit<DevelopmentProductDetail, 'health' | 'latestSample' | 'categoryName' | 'collectionName' | 'specSchema'>> & { materials: Mutable<DevelopmentProductDetail['materials'][number]>[]; variants: Mutable<DevelopmentProductDetail['variants'][number]>[]; packaging: Mutable<DevelopmentProductDetail['packaging'][number]>[]; samples: Mutable<DevelopmentProductDetail['samples'][number]>[]; approvals: Mutable<DevelopmentProductDetail['approvals'][number]>[] };

const store = {
  categories: [
    { code: 'APP', name: 'Apparel', slug: 'apparel', description: 'Garments under the brand: robes, slips, knitwear.', parentCode: null, sort: 1, status: 'active', specSchema: [{ key: 'composition', label: 'Composition', kind: 'text' }, { key: 'weightGsm', label: 'Weight', kind: 'number', unit: 'gsm' }, { key: 'sizeRange', label: 'Size range', kind: 'text' }, { key: 'care', label: 'Care', kind: 'text' }] },
    { code: 'FRG', name: 'Fragrance', slug: 'fragrance', description: 'Eau de parfum and extraits.', parentCode: null, sort: 2, status: 'active', specSchema: [{ key: 'concentration', label: 'Concentration', kind: 'select', options: ['EDT', 'EDP', 'Extrait'] }, { key: 'volumeMl', label: 'Volume', kind: 'number', unit: 'ml' }, { key: 'notes', label: 'Olfactive notes', kind: 'text' }] },
    { code: 'HOM', name: 'Home scent', slug: 'home-scent', description: 'Candles, diffusers, linen water.', parentCode: null, sort: 3, status: 'active', specSchema: [{ key: 'format', label: 'Format', kind: 'select', options: ['Candle', 'Diffuser', 'Linen water'] }, { key: 'burnHours', label: 'Burn time', kind: 'number', unit: 'h' }, { key: 'wax', label: 'Wax', kind: 'text' }] },
    { code: 'BAG', name: 'Bags', slug: 'bags', description: '', parentCode: null, sort: 4, status: 'active', specSchema: [{ key: 'material', label: 'Material', kind: 'text' }, { key: 'dimensions', label: 'Dimensions', kind: 'text' }, { key: 'hardware', label: 'Hardware', kind: 'text' }] },
    { code: 'SHO', name: 'Shoes', slug: 'shoes', description: '', parentCode: null, sort: 5, status: 'active', specSchema: [{ key: 'upper', label: 'Upper', kind: 'text' }, { key: 'sole', label: 'Sole', kind: 'text' }, { key: 'heelMm', label: 'Heel', kind: 'number', unit: 'mm' }] },
    { code: 'ACC', name: 'Accessories', slug: 'accessories', description: 'Veils, gloves, hair pieces, belts.', parentCode: null, sort: 6, status: 'active', specSchema: [{ key: 'material', label: 'Material', kind: 'text' }] },
  ] as Mutable<ProductCategoryView>[],
  collections: [
    { code: 'FW27', name: 'Autumn Winter 2027', season: 'FW', year: 2027, theme: 'The first objects: a robe, a scent, a bag. Foundation materials made visible.', targetLaunch: localDate('2027-09-01'), status: 'in_development' },
    { code: 'BRIDAL-CORE', name: 'Bridal Core', season: '', year: null, theme: 'The accessories a gown needs: veil, gloves, slip.', targetLaunch: null, status: 'planning' },
  ] as Mutable<CollectionView>[],
  assets: [
    { id: 'ba-story', kind: 'story', title: 'The materials that shape the dress', summary: 'BASIS makes the foundation layers of bridal construction: the mesh that shapes, the lining that lets the silk fall, the tulle that carries volume. The objects extend the same idea to what the bride wears before and after the dress: a robe, a scent, a bag. Quiet luxury, industrial precision, skin tones first.', colourHex: null, colourName: '', paletteNumber: '', tags: ['brand'], collectionCode: null, status: 'approved', sort: 1, document: null, updatedAt: ago(40) },
    ...BRAND_PALETTE.filter((tone) => tone.group === 'material').map((tone, index) => ({ id: `ba-colour-${tone.number}`, kind: 'colour' as const, title: tone.name, summary: tone.use, colourHex: tone.hex, colourName: tone.name, paletteNumber: tone.number, tags: ['palette'], collectionCode: null, status: 'approved' as const, sort: index + 1, document: null, updatedAt: ago(40) })),
    { id: 'ba-type', kind: 'typeface', title: 'EB Garamond and Source Sans 3', summary: 'Display in a high-contrast serif with tracked small capitals; body in a humanist sans; codes in Martian Mono.', colourHex: null, colourName: '', paletteNumber: '', tags: ['brand'], collectionCode: null, status: 'approved', sort: 1, document: null, updatedAt: ago(40) },
    { id: 'ba-guide', kind: 'guideline', title: 'Packaging: matte wrap, shade-matched', summary: 'Every object ships in a shade-matched matte wrap with an end-cap label carrying the code, as the rolls do.', colourHex: null, colourName: '', paletteNumber: '', tags: ['packaging'], collectionCode: 'FW27', status: 'approved', sort: 1, document: null, updatedAt: ago(12) },
    { id: 'ba-insp-1', kind: 'inspiration', title: 'Robe references, Milan showroom', summary: 'Three silhouettes photographed at the fair; the belted one is the direction.', colourHex: null, colourName: '', paletteNumber: '', tags: ['robe', 'fw27'], collectionCode: 'FW27', status: 'draft', sort: 1, document: null, updatedAt: ago(6) },
  ] as Mutable<BrandAssetView>[],
  products: [] as DetailRecord[],
  sourcing: new Map<string, Mutable<DevelopmentSourcingView>[]>(),
  costing: new Map<string, Mutable<DevelopmentCostingView>[]>(),
  files: new Map<string, FiledDocument[]>(),
  sequence: { DEV: 4, part: 20, sample: 5, sourcing: 6, costing: 4, asset: 30, doc: 10 },
};

function product(over: Partial<DetailRecord> & { id: string; number: string; name: string; categoryCode: string; stage: DevelopmentStage }): DetailRecord {
  return { workingTitle: '', collectionCode: 'FW27', priority: 'normal', ownerUid: 'sample-owner', ownerName: 'Owner', targetLaunch: localDate('2027-09-01'), budgetAmount: null, budgetCurrency: 'USD', catalogProductCode: null, lastActivityAt: ago(1), createdAt: ago(30), description: '', intent: '', specs: {}, handedOverAt: null, materials: [], variants: [], packaging: [], samples: [], approvals: [], ...over };
}

store.products = [
  product({ id: 'dev-1', number: 'DEV-26-0001', name: 'Silk robe', workingTitle: 'The dressing robe', categoryCode: 'APP', stage: 'sampling', priority: 'high', budgetAmount: '120000000', description: 'A long belted robe in sand-washed silk charmeuse, lined with Shanel Lining in Milk, for the morning of the wedding. Deep kimono sleeve, hidden pocket, belt in the same silk.', intent: 'The first object: what the bride wears while the dress waits. It carries the brand\'s lining visibly.', specs: { composition: '100% silk charmeuse, 19 momme; lining Shanel Lining', weightGsm: '82', sizeRange: 'XS–XL', care: 'Dry clean' }, lastActivityAt: ago(2), createdAt: ago(60),
    materials: [{ id: 'm-1', role: 'shell', name: 'Silk charmeuse 19 mm, sand-washed', specification: 'Ivory, 114 cm', skuCode: null, supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', status: 'sampled', notes: '' }, { id: 'm-2', role: 'lining', name: 'Shanel Lining, Milk', specification: '', skuCode: 'SHL-160-MLK', supplierId: null, supplierName: '', status: 'approved', notes: 'Our own.' }, { id: 'm-3', role: 'trim', name: 'Covered buttons, 18 mm', specification: 'Self fabric', skuCode: null, supplierId: null, supplierName: '', status: 'proposed', notes: '' }],
    variants: [{ id: 'v-1', code: 'MLK', name: 'Milk', shadeCode: 'MLK', shadeName: 'Milk', colourHex: null, colourName: '', sizeLabel: 'XS–XL', dimensions: { sizes: 'XS, S, M, L, XL' }, status: 'sampled', sort: 1 }, { id: 'v-2', code: 'SK02', name: 'Skin 02', shadeCode: 'SK02', shadeName: 'Skin 02', colourHex: null, colourName: '', sizeLabel: 'XS–XL', dimensions: { sizes: 'XS, S, M, L, XL' }, status: 'proposed', sort: 2 }],
    packaging: [{ id: 'p-1', component: 'box', specification: 'Rigid box, matte wrap in the shade, end label', material: 'Greyboard 2 mm, uncoated wrap', dimensions: { w: '32', d: '24', h: '8', unit: 'cm' }, supplierId: null, supplierName: '', status: 'proposed' }],
    samples: [{ id: 's-1', round: 1, kind: 'proto', supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', requestedOn: dayAgo(40), receivedOn: dayAgo(26), verdict: 'revise', verdictByName: 'Owner', verdictOn: dayAgo(24), findings: 'Sleeve too narrow at the elbow; belt loops 4 cm too high; lining shade reads yellow against the silk, switch to Milk.', costAmount: '1800000', costCurrency: 'USD' }, { id: 's-2', round: 2, kind: 'fit', supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', requestedOn: dayAgo(20), receivedOn: dayAgo(3), verdict: 'pending', verdictByName: '', verdictOn: null, findings: '', costAmount: '1500000', costCurrency: 'USD' }],
    approvals: [{ id: 'a-1', gate: 'concept', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(52), note: '' }, { id: 'a-2', gate: 'feasibility', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(45), note: 'Two mills quoted.' }, { id: 'a-3', gate: 'sampling', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(41), note: '' }] }),
  product({ id: 'dev-2', number: 'DEV-26-0002', name: 'Eau de parfum No. 1', workingTitle: 'Powder and linen', categoryCode: 'FRG', stage: 'feasibility', description: 'A powdery iris and linen accord, 50 ml, in a heavy glass bottle with a sand-coloured cap.', intent: 'The scent of the showroom.', specs: { concentration: 'EDP', volumeMl: '50', notes: 'Iris, orris butter, white musk, linen accord' }, lastActivityAt: ago(5), createdAt: ago(35), approvals: [{ id: 'a-4', gate: 'concept', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(30), note: '' }, { id: 'a-5', gate: 'feasibility', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(20), note: 'Grasse house quoted.' }], variants: [{ id: 'v-3', code: '50', name: '50 ml', shadeCode: null, shadeName: '', colourHex: '#F0DFD5', colourName: 'Powder glass', sizeLabel: '50 ml', dimensions: {}, status: 'proposed', sort: 1 }] }),
  product({ id: 'dev-3', number: 'DEV-26-0003', name: 'Structured tote', categoryCode: 'BAG', stage: 'concept', description: 'A tote in nude vegetable-tanned leather with a Powermesh inner pocket, for the dress bag and the day after.', lastActivityAt: ago(25), createdAt: ago(28), approvals: [{ id: 'a-6', gate: 'concept', decision: 'approved', decidedByName: 'Owner', decidedAt: ago(26), note: '' }] }),
  product({ id: 'dev-4', number: 'DEV-26-0004', name: 'Cathedral veil', categoryCode: 'ACC', collectionCode: 'BRIDAL-CORE', stage: 'idea', targetLaunch: null, lastActivityAt: ago(3), createdAt: ago(3), description: '' }),
];
store.sourcing.set('dev-1', [
  { id: 'src-1', supplierId: 'co-lanrui', supplierName: 'Lanrui Textile', factoryId: null, factoryName: 'Shaoxing', kind: 'odm', status: 'selected', moq: '300000', leadTimeDays: 60, sampleLeadDays: 14, unitCost: '420000', currency: 'USD', sampleCost: '1800000', developmentCost: '6000000', toolingCost: null, paymentTerms: '30% deposit, 70% before shipment', incoterm: 'FOB', namedPlace: 'Ningbo', quotedOn: dayAgo(44), validUntil: dayAhead(40), isSelected: true, notes: 'Cut and sew in-house; silk from their mill.' },
  { id: 'src-2', supplierId: 'co-jinyu', supplierName: 'Jinyu Knitting', factoryId: null, factoryName: 'Haining', kind: 'odm', status: 'quoted', moq: '500000', leadTimeDays: 75, sampleLeadDays: 21, unitCost: '385000', currency: 'USD', sampleCost: '2200000', developmentCost: '9000000', toolingCost: null, paymentTerms: '50% deposit', incoterm: 'FOB', namedPlace: 'Shanghai', quotedOn: dayAgo(43), validUntil: dayAhead(10), isSelected: false, notes: 'Cheaper per unit, higher MOQ and development.' },
]);
store.sourcing.set('dev-2', [{ id: 'src-3', supplierId: 'co-aromes', supplierName: 'Arômes de Grasse', factoryId: null, factoryName: '', kind: 'odm', status: 'quoted', moq: '1000000', leadTimeDays: 120, sampleLeadDays: 30, unitCost: '1150000', currency: 'EUR', sampleCost: '4500000', developmentCost: '18000000', toolingCost: '12000000', paymentTerms: '50% on order', incoterm: 'EXW', namedPlace: 'Grasse', quotedOn: dayAgo(22), validUntil: dayAhead(60), isSelected: false, notes: 'Includes the bottle mould.' }]);
store.costing.set('dev-1', [
  { id: 'c-1', basis: 'estimate', currency: 'USD', unitCost: '400000', packagingCost: '60000', freightCost: '25000', dutyCost: '48000', otherCost: '0', quantity: '300000', plannedPrice: '2900000', wholesalePrice: '1450000', sourcingId: null, notes: 'Before quotes.', createdByName: 'Owner', createdAt: ago(50) },
  { id: 'c-2', basis: 'quotation', currency: 'USD', unitCost: '420000', packagingCost: '55000', freightCost: '22000', dutyCost: '50400', otherCost: '10000', quantity: '300000', plannedPrice: '2900000', wholesalePrice: '1450000', sourcingId: 'src-1', notes: 'Lanrui quote; packaging from the box maker.', createdByName: 'Finance', createdAt: ago(42) },
]);
store.files.set('DEV-26-0001', [
  { id: 'f-1', kind: 'photo', title: 'Belted silhouette, Milan', number: '', issuedOn: null, expiresOn: null, storagePath: 'sample://inspiration/robe-1.jpg', mimeType: 'image/jpeg', sizeBytes: 420000, createdAt: ago(58), uploadedBy: 'Owner', links: [{ entityType: 'development_product', entityId: 'DEV-26-0001', role: 'inspiration' }] },
  { id: 'f-2', kind: 'photo', title: 'Robe sketch v2', number: '', issuedOn: null, expiresOn: null, storagePath: 'sample://proposal/robe-sketch-2.pdf', mimeType: 'application/pdf', sizeBytes: 1200000, createdAt: ago(50), uploadedBy: 'Marketing', links: [{ entityType: 'development_product', entityId: 'DEV-26-0001', role: 'proposal' }] },
  { id: 'f-3', kind: 'photo', title: 'Round 1 on the form', number: '', issuedOn: null, expiresOn: null, storagePath: 'sample://sample/round-1.jpg', mimeType: 'image/jpeg', sizeBytes: 800000, createdAt: ago(26), uploadedBy: 'Owner', links: [{ entityType: 'development_product', entityId: 'DEV-26-0001', role: 'sample' }] },
  { id: 'f-4', kind: 'quotation', title: 'Lanrui quotation', number: 'LR-2026-118', issuedOn: dayAgo(44), expiresOn: dayAhead(40), storagePath: 'sample://quotation/lanrui.pdf', mimeType: 'application/pdf', sizeBytes: 300000, createdAt: ago(44), uploadedBy: 'Purchasing', links: [{ entityType: 'development_product', entityId: 'DEV-26-0001', role: 'quotation' }] },
]);

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
    const document: FiledDocument = { id: `f-${store.sequence.doc}`, kind: input.file.type.startsWith('image/') ? 'photo' : 'other', title: input.title?.trim() || input.file.name, number: '', issuedOn: null, expiresOn: null, storagePath: `sample://${input.role}/${input.file.name}`, mimeType: input.file.type, sizeBytes: input.file.size, createdAt: now(), uploadedBy: 'Owner', links: [{ entityType: input.entityType, entityId: input.entityId, role: input.role }] };
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
