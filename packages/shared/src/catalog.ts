// Read models for the catalog screens. Built from the platform connector in
// live mode and from labelled fixtures in sample mode; the screens see one shape.

import type { StatusTone } from './status';

export const PRODUCT_STATUSES = ['draft', 'active', 'discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const SKU_STATUSES = ['development', 'sampling', 'active', 'phase_out', 'discontinued'] as const;
export type SkuStatus = (typeof SKU_STATUSES)[number];

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  discontinued: 'Discontinued',
};

export const PRODUCT_STATUS_TONE: Record<ProductStatus, StatusTone> = {
  draft: 'neutral',
  active: 'positive',
  discontinued: 'critical',
};

export const SKU_STATUS_LABEL: Record<SkuStatus, string> = {
  development: 'In development',
  sampling: 'Sampling',
  active: 'Active',
  phase_out: 'Phasing out',
  discontinued: 'Discontinued',
};

export const SKU_STATUS_TONE: Record<SkuStatus, StatusTone> = {
  development: 'neutral',
  sampling: 'transit',
  active: 'positive',
  phase_out: 'caution',
  discontinued: 'critical',
};

/** One attribute of a family's specification schema. */
export interface SpecField {
  readonly key: string;
  readonly label: string;
  readonly kind: 'text' | 'number' | 'select';
  readonly unit?: string;
  readonly options?: readonly string[];
}

export interface FamilyView {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly specSchema: readonly SpecField[];
  readonly sort: number;
  readonly products: readonly ProductSummary[];
}

export interface ProductSummary {
  readonly code: string;
  readonly index: number;
  readonly name: string;
  readonly slug: string;
  readonly tagline: string;
  readonly familyCode: string;
  readonly familyName: string;
  readonly status: ProductStatus;
  readonly isPublic: boolean;
  readonly skuCount: number;
  /** Shade codes with at least one active SKU. */
  readonly availableShades: readonly string[];
}

export interface CompositionPart {
  readonly fibre: string;
  readonly percent: number;
}

export interface VariantView {
  readonly id: string;
  readonly fullCode: string;
  readonly code: string;
  readonly name: string;
  readonly widthCm: number | null;
  readonly usableWidthCm: number | null;
  readonly gsm: number | null;
  readonly stretchWarpPercent: number | null;
  readonly stretchWeftPercent: number | null;
  readonly finish: string;
  readonly status: ProductStatus;
}

export interface SkuRow {
  readonly code: string;
  readonly productCode: string;
  readonly productName: string;
  readonly productIndex: number;
  readonly variantCode: string;
  readonly variantName: string;
  readonly shadeCode: string;
  readonly shadeName: string;
  readonly shadeHex: string;
  readonly shadeSort: number;
  readonly putUpName: string;
  readonly status: SkuStatus;
  readonly isPublic: boolean;
  readonly rollTracking: boolean;
  readonly salesUom: string;
}

export interface ProductDetail extends ProductSummary {
  readonly description: string;
  readonly composition: readonly CompositionPart[];
  readonly construction: string;
  readonly care: string;
  readonly specs: Readonly<Record<string, string>>;
  readonly specSchema: readonly SpecField[];
  readonly variants: readonly VariantView[];
  readonly skus: readonly SkuRow[];
}

export interface SkuDetail extends SkuRow {
  readonly familyCode: string;
  readonly familyName: string;
  readonly barcode: string;
  /** Fixed-point thousandths of the sales unit, or null. */
  readonly salesMoq: string | null;
  readonly widthCm: number | null;
  readonly usableWidthCm: number | null;
  readonly gsm: number | null;
  readonly rollLengthM: number;
}

/** Cost-bearing. Only returned to roles with cost access. */
export interface SkuSourcing {
  readonly supplierItems: readonly {
    readonly id: string;
    readonly supplierId: string;
    readonly supplierName: string;
    readonly factoryName: string;
    readonly supplierSku: string;
    readonly moq: string | null;
    readonly leadTimeDays: number | null;
    readonly isPreferred: boolean;
    readonly prices: readonly { readonly minQuantity: string; readonly unitPrice: string; readonly currency: string }[];
  }[];
}

export interface ShadeView {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly hex: string;
  readonly collection: string;
  readonly sort: number;
  readonly status: 'active' | 'inactive';
  /** Product codes with an active SKU in this shade. */
  readonly availableIn: readonly string[];
  /** Product codes with a SKU in this shade that is not active yet. */
  readonly pendingIn: readonly string[];
}

export interface PutUpView {
  readonly code: string;
  readonly name: string;
  readonly rollLengthM: number;
  readonly widthCm: number;
  readonly core: string;
  readonly wrap: string;
  readonly rollsPerCarton: number | null;
}

/** Proposed SKU code grammar: product, variant, shade. */
export function skuCode(productCode: string, variantCode: string, shadeCode: string): string {
  return `${productCode}-${variantCode}-${shadeCode}`.toUpperCase();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
