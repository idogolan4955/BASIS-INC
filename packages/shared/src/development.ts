// Product development: the brand and consumer-products department. A product
// goes from an idea to something ready to make and sell, through gates whose
// entry conditions are facts on the dossier, never a box someone ticks.
// Money is fixed-point ten-thousandths; quantities fixed-point thousandths.

import type { SpecField } from './catalog';
import type { LocalDate } from './local-date';
import { daysBetween } from './local-date';
import type { StatusTone } from './status';

// ---------------------------------------------------------------- vocabulary

export const DEVELOPMENT_STAGES = ['idea', 'concept', 'feasibility', 'sampling', 'revision', 'approved_for_production', 'commercial', 'on_hold', 'dropped'] as const;
export type DevelopmentStage = (typeof DEVELOPMENT_STAGES)[number];
/** The stages a product moves through; on hold and dropped sit beside them. */
export const OPEN_DEVELOPMENT_STAGES: readonly DevelopmentStage[] = ['idea', 'concept', 'feasibility', 'sampling', 'revision', 'approved_for_production'];
export const DEVELOPMENT_STAGE_LABEL: Record<DevelopmentStage, string> = { idea: 'Idea', concept: 'Concept', feasibility: 'Feasibility', sampling: 'Sampling', revision: 'Revision', approved_for_production: 'Approved for production', commercial: 'Commercial', on_hold: 'On hold', dropped: 'Dropped' };
export const DEVELOPMENT_STAGE_TONE: Record<DevelopmentStage, StatusTone> = { idea: 'neutral', concept: 'neutral', feasibility: 'transit', sampling: 'transit', revision: 'caution', approved_for_production: 'positive', commercial: 'positive', on_hold: 'caution', dropped: 'critical' };

export const PRIORITIES = ['low', 'normal', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', normal: 'Normal', high: 'High' };

/** What a file is to the dossier. Inspiration never sits beside an approved design without this word. */
export const FILE_ROLES = ['inspiration', 'proposal', 'sample', 'approved', 'tech_pack', 'quotation', 'other'] as const;
export type FileRole = (typeof FILE_ROLES)[number];
export const FILE_ROLE_LABEL: Record<FileRole, string> = { inspiration: 'Inspiration', proposal: 'Proposal', sample: 'Sample', approved: 'Approved design', tech_pack: 'Tech pack', quotation: 'Quotation', other: 'Other' };

export const BRAND_ASSET_KINDS = ['story', 'logo', 'typeface', 'colour', 'material', 'imagery', 'guideline', 'approved_design', 'inspiration'] as const;
export type BrandAssetKind = (typeof BRAND_ASSET_KINDS)[number];
export const BRAND_ASSET_KIND_LABEL: Record<BrandAssetKind, string> = { story: 'Brand story', logo: 'Logo', typeface: 'Typeface', colour: 'Colour', material: 'Material', imagery: 'Imagery', guideline: 'Guideline', approved_design: 'Approved design', inspiration: 'Inspiration' };
export const BRAND_ASSET_STATUSES = ['draft', 'approved', 'retired'] as const;
export type BrandAssetStatus = (typeof BRAND_ASSET_STATUSES)[number];

export const PART_STATUSES = ['proposed', 'sampled', 'approved', 'dropped'] as const;
export type PartStatus = (typeof PART_STATUSES)[number];
export const PART_STATUS_LABEL: Record<PartStatus, string> = { proposed: 'Proposed', sampled: 'Sampled', approved: 'Approved', dropped: 'Dropped' };
export const PART_STATUS_TONE: Record<PartStatus, StatusTone> = { proposed: 'neutral', sampled: 'transit', approved: 'positive', dropped: 'critical' };

export const SAMPLE_KINDS = ['proto', 'fit', 'pre_production', 'shipment'] as const;
export type SampleKind = (typeof SAMPLE_KINDS)[number];
export const SAMPLE_KIND_LABEL: Record<SampleKind, string> = { proto: 'Prototype', fit: 'Fit sample', pre_production: 'Pre-production', shipment: 'Shipment sample' };
export const SAMPLE_VERDICTS = ['pending', 'approved', 'revise', 'rejected'] as const;
export type SampleVerdict = (typeof SAMPLE_VERDICTS)[number];
export const SAMPLE_VERDICT_LABEL: Record<SampleVerdict, string> = { pending: 'Awaiting verdict', approved: 'Approved', revise: 'Revise', rejected: 'Rejected' };
export const SAMPLE_VERDICT_TONE: Record<SampleVerdict, StatusTone> = { pending: 'caution', approved: 'positive', revise: 'transit', rejected: 'critical' };

export const SOURCING_KINDS = ['odm', 'oem', 'component', 'packaging'] as const;
export type SourcingKind = (typeof SOURCING_KINDS)[number];
export const SOURCING_KIND_LABEL: Record<SourcingKind, string> = { odm: 'ODM', oem: 'OEM', component: 'Component', packaging: 'Packaging' };
export const SOURCING_STATUSES = ['candidate', 'quoted', 'sampled', 'selected', 'dropped'] as const;
export type SourcingStatus = (typeof SOURCING_STATUSES)[number];
export const SOURCING_STATUS_LABEL: Record<SourcingStatus, string> = { candidate: 'Candidate', quoted: 'Quoted', sampled: 'Sampled', selected: 'Selected', dropped: 'Dropped' };
export const SOURCING_STATUS_TONE: Record<SourcingStatus, StatusTone> = { candidate: 'neutral', quoted: 'transit', sampled: 'transit', selected: 'positive', dropped: 'critical' };

export const COSTING_BASES = ['estimate', 'quotation', 'approved'] as const;
export type CostingBasis = (typeof COSTING_BASES)[number];
export const COSTING_BASIS_LABEL: Record<CostingBasis, string> = { estimate: 'Estimate', quotation: 'Quotation', approved: 'Approved' };

export const APPROVAL_DECISIONS = ['approved', 'returned', 'rejected'] as const;
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

// ---------------------------------------------------------------- views

export interface ProductCategoryView {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly parentCode: string | null;
  readonly specSchema: readonly SpecField[];
  readonly sort: number;
  readonly status: 'active' | 'archived';
}

export interface CollectionView {
  readonly code: string;
  readonly name: string;
  readonly season: string;
  readonly year: number | null;
  readonly theme: string;
  readonly targetLaunch: LocalDate | null;
  readonly status: 'planning' | 'in_development' | 'launched' | 'archived';
}
export const COLLECTION_STATUSES = ['planning', 'in_development', 'launched', 'archived'] as const;
export const COLLECTION_STATUS_LABEL: Record<CollectionView['status'], string> = { planning: 'Planning', in_development: 'In development', launched: 'Launched', archived: 'Archived' };
export const COLLECTION_STATUS_TONE: Record<CollectionView['status'], StatusTone> = { planning: 'neutral', in_development: 'transit', launched: 'positive', archived: 'neutral' };

export interface BrandAssetView {
  readonly id: string;
  readonly kind: BrandAssetKind;
  readonly title: string;
  readonly summary: string;
  readonly colourHex: string | null;
  readonly colourName: string;
  readonly paletteNumber: string;
  readonly tags: readonly string[];
  readonly collectionCode: string | null;
  readonly status: BrandAssetStatus;
  readonly sort: number;
  readonly document: { id: string; title: string; storagePath: string; mimeType: string } | null;
  readonly updatedAt: string;
}

export interface DevelopmentMaterialView {
  readonly id: string;
  readonly role: string;
  readonly name: string;
  readonly specification: string;
  readonly skuCode: string | null;
  readonly supplierId: string | null;
  readonly supplierName: string;
  readonly status: PartStatus;
  readonly notes: string;
}

export interface DevelopmentVariantView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly shadeCode: string | null;
  readonly shadeName: string;
  readonly colourHex: string | null;
  readonly colourName: string;
  readonly sizeLabel: string;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly status: PartStatus;
  readonly sort: number;
}

export interface DevelopmentPackagingView {
  readonly id: string;
  readonly component: string;
  readonly specification: string;
  readonly material: string;
  readonly dimensions: Readonly<Record<string, string>>;
  readonly supplierId: string | null;
  readonly supplierName: string;
  readonly status: PartStatus;
}

export interface DevelopmentSampleView {
  readonly id: string;
  readonly round: number;
  readonly kind: SampleKind;
  readonly supplierId: string | null;
  readonly supplierName: string;
  readonly requestedOn: LocalDate | null;
  readonly receivedOn: LocalDate | null;
  readonly verdict: SampleVerdict;
  readonly verdictByName: string;
  readonly verdictOn: LocalDate | null;
  readonly findings: string;
  /** Fixed-point money, what the round cost. */
  readonly costAmount: string | null;
  readonly costCurrency: string;
}

export interface DevelopmentApprovalView {
  readonly id: string;
  readonly gate: DevelopmentStage;
  readonly decision: ApprovalDecision;
  readonly decidedByName: string;
  readonly decidedAt: string;
  readonly note: string;
}

/** Cost-bearing: supplier identity and costs. Only for the cost roles. */
export interface DevelopmentSourcingView {
  readonly id: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly factoryId: string | null;
  readonly factoryName: string;
  readonly kind: SourcingKind;
  readonly status: SourcingStatus;
  readonly moq: string | null;
  readonly leadTimeDays: number | null;
  readonly sampleLeadDays: number | null;
  readonly unitCost: string | null;
  readonly currency: string;
  readonly sampleCost: string | null;
  readonly developmentCost: string | null;
  readonly toolingCost: string | null;
  readonly paymentTerms: string;
  readonly incoterm: string;
  readonly namedPlace: string;
  readonly quotedOn: LocalDate | null;
  readonly validUntil: LocalDate | null;
  readonly isSelected: boolean;
  readonly notes: string;
}

/** Cost-bearing. */
export interface DevelopmentCostingView {
  readonly id: string;
  readonly basis: CostingBasis;
  readonly currency: string;
  readonly unitCost: string;
  readonly packagingCost: string;
  readonly freightCost: string;
  readonly dutyCost: string;
  readonly otherCost: string;
  /** Fixed-point units the costing assumes. */
  readonly quantity: string | null;
  readonly plannedPrice: string | null;
  readonly wholesalePrice: string | null;
  readonly sourcingId: string | null;
  readonly notes: string;
  readonly createdByName: string;
  readonly createdAt: string;
}

export interface DevelopmentProductSummary {
  readonly id: string;
  readonly number: string;
  readonly name: string;
  readonly workingTitle: string;
  readonly categoryCode: string;
  readonly categoryName: string;
  readonly collectionCode: string | null;
  readonly collectionName: string;
  readonly stage: DevelopmentStage;
  readonly priority: Priority;
  readonly ownerUid: string;
  readonly ownerName: string;
  readonly targetLaunch: LocalDate | null;
  readonly budgetAmount: string | null;
  readonly budgetCurrency: string;
  readonly catalogProductCode: string | null;
  readonly lastActivityAt: string;
  readonly createdAt: string;
  readonly latestSample: { round: number; verdict: SampleVerdict; receivedOn: LocalDate | null } | null;
  readonly health: DevelopmentHealth;
}

export interface DevelopmentProductDetail extends DevelopmentProductSummary {
  readonly description: string;
  readonly intent: string;
  readonly specs: Readonly<Record<string, string>>;
  readonly specSchema: readonly SpecField[];
  readonly materials: readonly DevelopmentMaterialView[];
  readonly variants: readonly DevelopmentVariantView[];
  readonly packaging: readonly DevelopmentPackagingView[];
  readonly samples: readonly DevelopmentSampleView[];
  readonly approvals: readonly DevelopmentApprovalView[];
  readonly handedOverAt: string | null;
}

// ---------------------------------------------------------------- the gate

/** The facts a transition is checked against. Counted on the server, never typed. */
export interface GateFacts {
  readonly hasDescription: boolean;
  readonly fileRoles: readonly string[];
  readonly sourcingCount: number;
  readonly selectedSourcing: boolean;
  readonly sampleRequested: boolean;
  readonly latestSampleVerdict: SampleVerdict | null;
  readonly costingBases: readonly CostingBasis[];
}

/** Where a product may go from a stage. */
export function nextStages(stage: DevelopmentStage): DevelopmentStage[] {
  switch (stage) {
    case 'idea':
      return ['concept', 'on_hold', 'dropped'];
    case 'concept':
      return ['feasibility', 'idea', 'on_hold', 'dropped'];
    case 'feasibility':
      return ['sampling', 'concept', 'on_hold', 'dropped'];
    case 'sampling':
      return ['revision', 'approved_for_production', 'feasibility', 'on_hold', 'dropped'];
    case 'revision':
      return ['sampling', 'approved_for_production', 'on_hold', 'dropped'];
    case 'approved_for_production':
      return ['commercial', 'revision', 'on_hold'];
    case 'on_hold':
      return ['idea', 'concept', 'feasibility', 'sampling', 'dropped'];
    case 'commercial':
    case 'dropped':
      return [];
  }
}

/** What is still missing before a stage can be entered. Empty means the gate is open. */
export function gateCheck(to: DevelopmentStage, facts: GateFacts): string[] {
  const missing: string[] = [];
  const hasFile = (...roles: string[]) => roles.some((role) => facts.fileRoles.includes(role));
  if (to === 'concept' || to === 'feasibility' || to === 'sampling' || to === 'approved_for_production') {
    if (!facts.hasDescription) missing.push('A description of the product.');
  }
  if (to === 'concept') {
    if (!hasFile('inspiration', 'proposal')) missing.push('At least one inspiration or proposal file.');
  }
  if (to === 'feasibility') {
    if (facts.sourcingCount === 0) missing.push('At least one sourcing candidate.');
  }
  if (to === 'sampling') {
    if (!facts.selectedSourcing && !facts.sampleRequested) missing.push('A selected supplier, or a sample round requested.');
  }
  if (to === 'approved_for_production') {
    if (facts.latestSampleVerdict !== 'approved') missing.push('The latest sample round approved.');
    if (!facts.selectedSourcing) missing.push('A selected supplier.');
    if (!facts.costingBases.includes('quotation') && !facts.costingBases.includes('approved')) missing.push('A costing on a quotation or an approved basis.');
  }
  if (to === 'commercial') missing.push('Commercial is entered by the handover, not by hand.');
  return missing;
}

/** Gates that record an approval, and who may pass them. */
export const GATES: Partial<Record<DevelopmentStage, 'owner' | 'department'>> = { concept: 'department', feasibility: 'department', sampling: 'department', approved_for_production: 'owner' };

// ---------------------------------------------------------------- health

export type DevelopmentHealth = 'on_track' | 'quiet' | 'late' | 'awaiting_verdict' | 'closed';
export const DEVELOPMENT_HEALTH_LABEL: Record<DevelopmentHealth, string> = { on_track: 'On track', quiet: 'Quiet', late: 'Late', awaiting_verdict: 'Awaiting verdict', closed: 'Closed' };
export const DEVELOPMENT_HEALTH_TONE: Record<DevelopmentHealth, StatusTone> = { on_track: 'positive', quiet: 'caution', late: 'critical', awaiting_verdict: 'caution', closed: 'neutral' };
export const DEVELOPMENT_QUIET_DAYS = 21;
export const VERDICT_GRACE_DAYS = 7;

/** Health read from the dates: nothing here is set by hand. */
export function developmentHealth(facts: { stage: DevelopmentStage; targetLaunch: LocalDate | null; lastActivityAt: string; latestSample: { verdict: SampleVerdict; receivedOn: LocalDate | null } | null }, today: LocalDate): DevelopmentHealth {
  if (facts.stage === 'commercial' || facts.stage === 'dropped' || facts.stage === 'on_hold') return 'closed';
  if (facts.targetLaunch !== null && facts.targetLaunch < today) return 'late';
  if (facts.stage === 'sampling' && facts.latestSample?.verdict === 'pending' && facts.latestSample.receivedOn !== null && daysBetween(facts.latestSample.receivedOn, today) > VERDICT_GRACE_DAYS) return 'awaiting_verdict';
  if (daysBetween(facts.lastActivityAt.slice(0, 10) as LocalDate, today) > DEVELOPMENT_QUIET_DAYS) return 'quiet';
  return 'on_track';
}

// ---------------------------------------------------------------- money

const sum = (...parts: (string | null | undefined)[]) => parts.reduce<bigint>((total, part) => total + (part ? BigInt(part) : 0n), 0n);

/** Landed unit cost of a development costing: every cost column, in its currency. */
export function developmentLandedCost(costing: Pick<DevelopmentCostingView, 'unitCost' | 'packagingCost' | 'freightCost' | 'dutyCost' | 'otherCost'>): string {
  return sum(costing.unitCost, costing.packagingCost, costing.freightCost, costing.dutyCost, costing.otherCost).toString();
}

/** Gross margin per unit and in basis points of the planned price; null without a price. */
export function costingMargin(costing: Pick<DevelopmentCostingView, 'unitCost' | 'packagingCost' | 'freightCost' | 'dutyCost' | 'otherCost' | 'plannedPrice'>): { margin: string; marginBasisPoints: number } | null {
  if (costing.plannedPrice === null) return null;
  const price = BigInt(costing.plannedPrice);
  if (price <= 0n) return null;
  const margin = price - BigInt(developmentLandedCost(costing));
  return { margin: margin.toString(), marginBasisPoints: Number((margin * 10000n) / price) };
}

/** What development has cost so far: sample rounds and the selected supplier's development and tooling, in one currency; other currencies counted. */
export function budgetSpent(samples: readonly Pick<DevelopmentSampleView, 'costAmount' | 'costCurrency'>[], sourcing: readonly Pick<DevelopmentSourcingView, 'developmentCost' | 'toolingCost' | 'currency' | 'isSelected'>[], currency: string): { spent: string; otherCurrencies: number } {
  let spent = 0n;
  let other = 0;
  for (const sample of samples) {
    if (!sample.costAmount) continue;
    if (sample.costCurrency === currency) spent += BigInt(sample.costAmount);
    else other += 1;
  }
  for (const row of sourcing) {
    if (!row.isSelected) continue;
    const amount = sum(row.developmentCost, row.toolingCost);
    if (amount === 0n) continue;
    if (row.currency === currency) spent += amount;
    else other += 1;
  }
  return { spent: spent.toString(), otherCurrencies: other };
}

/** Candidates side by side: the lowest unit cost first among those that quoted, then the rest. */
export function compareSourcing<T extends Pick<DevelopmentSourcingView, 'unitCost' | 'currency' | 'status' | 'isSelected'>>(rows: readonly T[], toBase: (amount: string, currency: string) => string | null): (T & { baseUnitCost: string | null; rank: number | null })[] {
  const priced = rows.map((row) => ({ ...row, baseUnitCost: row.unitCost ? toBase(row.unitCost, row.currency) : null, rank: null as number | null }));
  const ranked = priced.filter((row) => row.baseUnitCost !== null && row.status !== 'dropped').sort((a, b) => (BigInt(a.baseUnitCost!) < BigInt(b.baseUnitCost!) ? -1 : BigInt(a.baseUnitCost!) > BigInt(b.baseUnitCost!) ? 1 : 0));
  ranked.forEach((row, index) => {
    row.rank = index + 1;
  });
  return priced.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || Number(b.isSelected) - Number(a.isSelected));
}

/** How many products sit in each open stage. */
export function stageCounts(products: readonly Pick<DevelopmentProductSummary, 'stage'>[]): { stage: DevelopmentStage; count: number }[] {
  return OPEN_DEVELOPMENT_STAGES.map((stage) => ({ stage, count: products.filter((product) => product.stage === stage).length }));
}

/** A slug from a name: lower case, hyphens, nothing else. */
export function slugOf(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
