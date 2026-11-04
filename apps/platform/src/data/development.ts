import {
  FUNCTION_NAMES,
  developmentHealth,
  isLocalDate,
  todayIn,
  type ApprovalDecision,
  type BrandAssetKind,
  type BrandAssetStatus,
  type BrandAssetView,
  type CollectionView,
  type CostingBasis,
  type DevelopmentCostingView,
  type DevelopmentProductDetail,
  type DevelopmentProductSummary,
  type DevelopmentSourcingView,
  type DevelopmentStage,
  type PartStatus,
  type Priority,
  type ProductCategoryView,
  type SampleKind,
  type SampleVerdict,
  type SourcingKind,
  type SourcingStatus,
  type SpecField,
} from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import type { FiledDocument } from './documents';
import { isSample } from './source';

// Product development data: the Brand Centre, categories, collections, the
// dossiers and, for the cost roles, sourcing and costing. Reads from the
// connector; writes through the development functions; files through
// Storage and the document tables.

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-development')).sampleDevelopment;
const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const asDate = (value: string | null | undefined) => (value && isLocalDate(value) ? value : null);
const nameOf = (company: { legalName: string; tradingName?: string | null } | null | undefined) => (company ? company.tradingName || company.legalName : '');
const record = (value: unknown): Record<string, string> => (value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry ?? '')])) : {});
const schema = (value: unknown): SpecField[] => (Array.isArray(value) ? (value as SpecField[]) : []);

export function useProductCategories() {
  return useQuery({
    queryKey: ['development', 'categories'],
    queryFn: async (): Promise<ProductCategoryView[]> => {
      if (isSample) return (await sample()).categories();
      const { dc, sdk } = await live();
      const { data } = await sdk.listProductCategories(dc);
      return data.productCategories.map((row) => ({ code: row.code, name: row.name, slug: row.slug, description: row.description ?? '', parentCode: row.parent?.code ?? null, specSchema: schema(row.specSchema), sort: row.sort, status: row.status as ProductCategoryView['status'] }));
    },
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ['development', 'collections'],
    queryFn: async (): Promise<CollectionView[]> => {
      if (isSample) return (await sample()).collections();
      const { dc, sdk } = await live();
      const { data } = await sdk.listCollections(dc);
      return data.collections.map((row) => ({ code: row.code, name: row.name, season: row.season ?? '', year: row.year ?? null, theme: row.theme ?? '', targetLaunch: asDate(row.targetLaunch), status: row.status as CollectionView['status'] }));
    },
  });
}

export function useBrandAssets() {
  return useQuery({
    queryKey: ['development', 'brand'],
    queryFn: async (): Promise<BrandAssetView[]> => {
      if (isSample) return (await sample()).brandAssets();
      const { dc, sdk } = await live();
      const { data } = await sdk.listBrandAssets(dc);
      return data.brandAssets.map((row) => ({ id: row.id, kind: row.kind as BrandAssetKind, title: row.title, summary: row.summary ?? '', colourHex: row.colourHex ?? null, colourName: row.colourName ?? '', paletteNumber: row.paletteNumber ?? '', tags: Array.isArray(row.tags) ? (row.tags as string[]) : [], collectionCode: row.collection?.code ?? null, status: row.status as BrandAssetStatus, sort: row.sort, document: row.document ? { id: row.document.id, title: row.document.title, storagePath: row.document.storagePath, mimeType: row.document.mimeType } : null, updatedAt: row.updatedAt }));
    },
  });
}

type SummaryRow = { id: string; number: string; name: string; workingTitle?: string | null; stage: string; priority: string; targetLaunch?: string | null; budgetAmount?: string | null; budgetCurrency?: string | null; lastActivityAt: string; createdAt: string; category: { code: string; name: string }; collection?: { code: string; name: string } | null; owner?: { uid: string; name: string } | null; catalogProduct?: { code: string } | null; developmentSamples_on_product: { round: number; verdict: string; receivedOn?: string | null }[] };
const summaryOf = (row: SummaryRow, day: ReturnType<typeof today>): DevelopmentProductSummary => {
  const latest = row.developmentSamples_on_product[0];
  const latestSample = latest ? { round: latest.round, verdict: latest.verdict as SampleVerdict, receivedOn: asDate(latest.receivedOn) } : null;
  const facts = { stage: row.stage as DevelopmentStage, targetLaunch: asDate(row.targetLaunch), lastActivityAt: row.lastActivityAt, latestSample };
  return { id: row.id, number: row.number, name: row.name, workingTitle: row.workingTitle ?? '', categoryCode: row.category.code, categoryName: row.category.name, collectionCode: row.collection?.code ?? null, collectionName: row.collection?.name ?? '', stage: facts.stage, priority: row.priority as Priority, ownerUid: row.owner?.uid ?? '', ownerName: row.owner?.name ?? '', targetLaunch: facts.targetLaunch, budgetAmount: row.budgetAmount ?? null, budgetCurrency: row.budgetCurrency ?? 'USD', catalogProductCode: row.catalogProduct?.code ?? null, lastActivityAt: row.lastActivityAt, createdAt: row.createdAt, latestSample, health: developmentHealth(facts, day) };
};

export function useDevelopmentProducts() {
  return useQuery({
    queryKey: ['development', 'products'],
    queryFn: async (): Promise<DevelopmentProductSummary[]> => {
      const day = today();
      if (isSample) return (await sample()).products(day);
      const { dc, sdk } = await live();
      const { data } = await sdk.listDevelopmentProducts(dc);
      return data.developmentProducts.map((row) => summaryOf(row as SummaryRow, day));
    },
  });
}

export function useDevelopmentProduct(number: string) {
  return useQuery({
    queryKey: ['development', 'product', number],
    enabled: Boolean(number),
    queryFn: async (): Promise<DevelopmentProductDetail | null> => {
      const day = today();
      if (isSample) return (await sample()).product(number, day);
      const { dc, sdk } = await live();
      const { data } = await sdk.getDevelopmentProduct(dc, { number });
      const row = data.developmentProducts[0];
      if (!row) return null;
      const samples = [...row.developmentSamples_on_product].sort((a, b) => b.round - a.round);
      const summary = summaryOf({ ...row, developmentSamples_on_product: samples.slice(0, 1) } as SummaryRow, day);
      return {
        ...summary,
        description: row.description ?? '',
        intent: row.intent ?? '',
        specs: record(row.specs),
        specSchema: schema(row.category.specSchema),
        handedOverAt: row.handedOverAt ?? null,
        materials: row.developmentMaterials_on_product.map((m) => ({ id: m.id, role: m.role, name: m.name, specification: m.specification ?? '', skuCode: m.sku?.code ?? null, supplierId: m.supplier?.id ?? null, supplierName: nameOf(m.supplier), status: m.status as PartStatus, notes: m.notes ?? '' })),
        variants: row.developmentVariants_on_product.map((v) => ({ id: v.id, code: v.code, name: v.name, shadeCode: v.shade?.code ?? null, shadeName: v.shade?.name ?? '', colourHex: v.colourHex ?? null, colourName: v.colourName ?? '', sizeLabel: v.sizeLabel ?? '', dimensions: record(v.dimensions), status: v.status as PartStatus, sort: v.sort })),
        packaging: row.developmentPackagings_on_product.map((p) => ({ id: p.id, component: p.component, specification: p.specification ?? '', material: p.material ?? '', dimensions: record(p.dimensions), supplierId: p.supplier?.id ?? null, supplierName: nameOf(p.supplier), status: p.status as PartStatus })),
        samples: row.developmentSamples_on_product.map((s) => ({ id: s.id, round: s.round, kind: s.kind as SampleKind, supplierId: s.supplier?.id ?? null, supplierName: nameOf(s.supplier), requestedOn: asDate(s.requestedOn), receivedOn: asDate(s.receivedOn), verdict: s.verdict as SampleVerdict, verdictByName: s.verdictBy?.name ?? '', verdictOn: asDate(s.verdictOn), findings: s.findings ?? '', costAmount: s.costAmount ?? null, costCurrency: s.costCurrency ?? 'USD' })),
        approvals: row.developmentApprovals_on_product.map((a) => ({ id: a.id, gate: a.gate as DevelopmentStage, decision: a.decision as ApprovalDecision, decidedByName: a.decidedBy?.name ?? '', decidedAt: a.decidedAt, note: a.note ?? '' })),
      };
    },
  });
}

/** Cost roles only: the connector refuses everyone else, and the query is not started for them. */
export function useDevelopmentSourcing(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['development', 'sourcing', productId],
    enabled: enabled && Boolean(productId),
    queryFn: async (): Promise<DevelopmentSourcingView[]> => {
      if (isSample) return (await sample()).sourcing(productId);
      const { dc, sdk } = await live();
      const { data } = await sdk.listDevelopmentSourcing(dc, { productId });
      return data.developmentSourcings.map((row) => ({ id: row.id, supplierId: row.supplier.id, supplierName: nameOf(row.supplier), factoryId: row.factory?.id ?? null, factoryName: row.factory?.location.name ?? '', kind: row.kind as SourcingKind, status: row.status as SourcingStatus, moq: row.moq ?? null, leadTimeDays: row.leadTimeDays ?? null, sampleLeadDays: row.sampleLeadDays ?? null, unitCost: row.unitCost ?? null, currency: row.currency, sampleCost: row.sampleCost ?? null, developmentCost: row.developmentCost ?? null, toolingCost: row.toolingCost ?? null, paymentTerms: row.paymentTerms ?? '', incoterm: row.incoterm ?? '', namedPlace: row.namedPlace ?? '', quotedOn: asDate(row.quotedOn), validUntil: asDate(row.validUntil), isSelected: row.isSelected, notes: row.notes ?? '' }));
    },
  });
}

export function useDevelopmentCosting(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['development', 'costing', productId],
    enabled: enabled && Boolean(productId),
    queryFn: async (): Promise<DevelopmentCostingView[]> => {
      if (isSample) return (await sample()).costing(productId);
      const { dc, sdk } = await live();
      const { data } = await sdk.listDevelopmentCosting(dc, { productId });
      return data.developmentCostings.map((row) => ({ id: row.id, basis: row.basis as CostingBasis, currency: row.currency, unitCost: row.unitCost, packagingCost: row.packagingCost, freightCost: row.freightCost, dutyCost: row.dutyCost, otherCost: row.otherCost, quantity: row.quantity ?? null, plannedPrice: row.plannedPrice ?? null, wholesalePrice: row.wholesalePrice ?? null, sourcingId: row.sourcing?.id ?? null, notes: row.notes ?? '', createdByName: row.createdBy?.name ?? '', createdAt: row.createdAt }));
    },
  });
}

// ---------------------------------------------------------------- files

/** Uploads a file to Storage under the record, files the document and links it with a role. */
export function useUploadFile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { entityType: string; entityId: string; role: string; file: File; title?: string }): Promise<FiledDocument> => {
      if (isSample) return (await sample()).upload(input);
      const [{ app, auth }, { getStorage, ref, uploadBytes }, { dc, sdk }] = await Promise.all([import('../lib/firebase'), import('firebase/storage'), live()]);
      const safe = input.file.name.replace(/[^\w.-]+/g, '-');
      const path = `documents/${input.entityType}/${input.entityId}/${Date.now()}-${safe}`;
      await uploadBytes(ref(getStorage(app), path), input.file, { contentType: input.file.type || 'application/octet-stream', customMetadata: { uploadedBy: auth.currentUser?.uid ?? '' } });
      const kind = input.file.type.startsWith('image/') ? 'photo' : input.role === 'tech_pack' ? 'technical_sheet' : input.role === 'quotation' ? 'quotation' : 'other';
      const { data } = await sdk.insertDocument(dc, { kind: sdk.DocumentKind[kind as keyof typeof sdk.DocumentKind], title: input.title?.trim() || input.file.name, storagePath: path, mimeType: input.file.type || 'application/octet-stream', sizeBytes: input.file.size });
      const id = data.document_insert.id;
      await sdk.linkDocument(dc, { documentId: id, entityType: input.entityType, entityId: input.entityId, role: input.role });
      return { id, kind, title: input.title?.trim() || input.file.name, number: '', issuedOn: null, expiresOn: null, storagePath: path, mimeType: input.file.type, sizeBytes: input.file.size, createdAt: new Date().toISOString(), uploadedBy: '', links: [{ entityType: input.entityType, entityId: input.entityId, role: input.role }] };
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['documents'] }), client.invalidateQueries({ queryKey: ['development'] })]),
  });
}

// ---------------------------------------------------------------- commands

export interface CategoryInput { code: string; name: string; description: string; parentCode: string | null; specSchema: SpecField[]; sort: number; status: 'active' | 'archived' }
export interface CollectionInput { code: string; name: string; season: string; year: number | null; theme: string; targetLaunch: string | null; status: CollectionView['status']; moodDocumentId: string | null }
export interface BrandAssetInput { id?: string; kind: BrandAssetKind; title: string; summary: string; documentId: string | null; colourHex: string | null; colourName: string; paletteNumber: string; tags: string[]; collectionCode: string | null; status: BrandAssetStatus; sort: number }
export interface ProductInput { number?: string; categoryCode: string; collectionCode: string | null; name: string; workingTitle: string; description: string; intent: string; priority: Priority; ownerUid: string | null; targetLaunch: string | null; budgetAmount: string | null; budgetCurrency: string; specs: Record<string, string> }
export interface TransitionInput { number: string; to: DevelopmentStage; note: string; decision?: ApprovalDecision }
export type PartInput =
  | { kind: 'material'; id?: string; number: string; role: string; name: string; specification: string; skuCode: string | null; supplierId: string | null; status: PartStatus; notes: string }
  | { kind: 'variant'; id?: string; number: string; code: string; name: string; shadeCode: string | null; colourHex: string | null; colourName: string; sizeLabel: string; dimensions: Record<string, string>; status: PartStatus; sort: number }
  | { kind: 'packaging'; id?: string; number: string; component: string; specification: string; material: string; dimensions: Record<string, string>; supplierId: string | null; status: PartStatus };
export interface SampleInput { id?: string; number: string; kind: SampleKind; supplierId: string | null; factoryId: string | null; requestedOn: string | null; receivedOn: string | null; verdict: SampleVerdict; findings: string; costAmount: string | null; costCurrency: string }
export interface SourcingInput { id?: string; number: string; supplierId: string; factoryId: string | null; kind: SourcingKind; status: SourcingStatus; moq: string | null; leadTimeDays: number | null; sampleLeadDays: number | null; unitCost: string | null; currency: string; sampleCost: string | null; developmentCost: string | null; toolingCost: string | null; paymentTerms: string; incoterm: string | null; namedPlace: string; quotationDocumentId: string | null; quotedOn: string | null; validUntil: string | null; notes: string; select: boolean }
export interface CostingInput { id?: string; number: string; basis: CostingBasis; currency: string; unitCost: string; packagingCost: string; freightCost: string; dutyCost: string; otherCost: string; quantity: string | null; plannedPrice: string | null; wholesalePrice: string | null; sourcingId: string | null; notes: string }

function command<TInput, TResult>(name: keyof typeof FUNCTION_NAMES, sampleCall: (input: TInput) => Promise<TResult>) {
  return () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: async (input: TInput): Promise<TResult> => {
        if (isSample) return sampleCall(input);
        return callFunction<TInput, TResult>(FUNCTION_NAMES[name], input);
      },
      onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['development'] }), client.invalidateQueries({ queryKey: ['timeline'] }), client.invalidateQueries({ queryKey: ['documents'] })]),
    });
  };
}

export const useSaveCategory = command<CategoryInput, { code: string }>('saveProductCategory', async (input) => (await sample()).saveCategory(input));
export const useSaveCollection = command<CollectionInput, { code: string }>('saveCollection', async (input) => (await sample()).saveCollection(input));
export const useSaveBrandAsset = command<BrandAssetInput, { id: string }>('saveBrandAsset', async (input) => (await sample()).saveBrandAsset(input));
export const useSaveDevelopmentProduct = command<ProductInput, { number: string; id: string }>('saveDevelopmentProduct', async (input) => (await sample()).saveProduct(input));
export const useTransitionDevelopment = command<TransitionInput, { number: string; stage: DevelopmentStage; missing: string[] }>('transitionDevelopment', async (input) => (await sample()).transition(input));
export const useSaveDevelopmentPart = command<PartInput, { id: string }>('saveDevelopmentPart', async (input) => (await sample()).savePart(input));
export const useSaveDevelopmentSample = command<SampleInput, { id: string; round: number }>('saveDevelopmentSample', async (input) => (await sample()).saveSample(input));
export const useSaveDevelopmentSourcing = command<SourcingInput, { id: string }>('saveDevelopmentSourcing', async (input) => (await sample()).saveSourcing(input));
export const useSaveDevelopmentCosting = command<CostingInput, { id: string }>('saveDevelopmentCosting', async (input) => (await sample()).saveCosting(input));
export const useRecordDevelopmentDecision = command<{ number: string; note: string }, { number: string }>('recordDevelopmentDecision', async (input) => (await sample()).decide(input));
