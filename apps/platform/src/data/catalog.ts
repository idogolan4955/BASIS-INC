import {
  SKU_STATUS_LABEL,
  skuCode,
  slugify,
  type CompositionPart,
  type FamilyView,
  type ProductDetail,
  type ProductStatus,
  type ProductSummary,
  type PutUpView,
  type ShadeStandardView,
  type ShadeView,
  type SkuDetail,
  type SkuRow,
  type SkuSourcing,
  type SkuStatus,
  type SpecField,
} from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSample } from './source';
import { recordEvent } from './timeline';

// Catalog data for the screens. Live mode maps the platform connector's
// result types onto the read models; sample mode serves the fixtures.

async function sample() {
  return (await import('./sample-catalog')).sampleCatalog;
}

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

const specSchema = (value: unknown): SpecField[] => (Array.isArray(value) ? (value as SpecField[]) : []);
const specs = (value: unknown): Record<string, string> =>
  value && typeof value === 'object' ? Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])) : {};
const composition = (value: unknown): CompositionPart[] => (Array.isArray(value) ? (value as CompositionPart[]) : []);

export function useFamilies() {
  return useQuery({
    queryKey: ['catalog', 'families'],
    queryFn: async (): Promise<FamilyView[]> => {
      if (isSample) return (await sample()).families();
      const { dc, sdk } = await live();
      const { data } = await sdk.listFamilies(dc);
      return data.fabricFamilies.map((family) => ({
        code: family.code,
        name: family.name,
        slug: family.slug,
        description: family.description ?? '',
        specSchema: specSchema(family.specSchema),
        sort: family.sort,
        products: family.products_on_family.map((product) => ({
          code: product.code,
          index: product.index,
          name: product.name,
          slug: product.slug,
          tagline: product.tagline ?? '',
          familyCode: family.code,
          familyName: family.name,
          status: product.status,
          isPublic: product.isPublic,
          skuCount: 0,
          availableShades: [],
        })),
      }));
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ['catalog', 'products'],
    queryFn: async (): Promise<ProductSummary[]> => {
      if (isSample) return (await sample()).products();
      const { dc, sdk } = await live();
      const { data } = await sdk.listProducts(dc);
      return data.products.map((product) => ({
        code: product.code,
        index: product.index,
        name: product.name,
        slug: product.slug,
        tagline: product.tagline ?? '',
        familyCode: product.family.code,
        familyName: product.family.name,
        status: product.status,
        isPublic: product.isPublic,
        skuCount: product.skus_on_product.length,
        availableShades: product.skus_on_product.filter((sku) => sku.status === 'active').map((sku) => sku.shade.code),
      }));
    },
  });
}

export function useProduct(code: string) {
  return useQuery({
    queryKey: ['catalog', 'product', code],
    queryFn: async (): Promise<ProductDetail | null> => {
      if (isSample) return (await sample()).product(code);
      const { dc, sdk } = await live();
      const { data } = await sdk.getProduct(dc, { code });
      const product = data.product;
      if (!product) return null;
      const skus: SkuRow[] = product.skus_on_product.map((sku) => ({
        code: sku.code,
        productCode: product.code,
        productName: product.name,
        productIndex: product.index,
        variantCode: sku.variant.fullCode.split('-').slice(1).join('-'),
        variantName: sku.variant.name,
        shadeCode: sku.shade.code,
        shadeName: sku.shade.name,
        shadeHex: sku.shade.hex ?? '#CCCCCC',
        shadeSort: sku.shade.sort,
        putUpName: sku.putUp.name,
        status: sku.status,
        isPublic: sku.isPublic,
        rollTracking: sku.rollTracking,
        salesUom: sku.salesUom,
      }));
      return {
        code: product.code,
        index: product.index,
        name: product.name,
        slug: product.slug,
        tagline: product.tagline ?? '',
        familyCode: product.family.code,
        familyName: product.family.name,
        status: product.status,
        isPublic: product.isPublic,
        skuCount: skus.length,
        availableShades: skus.filter((sku) => sku.status === 'active').map((sku) => sku.shadeCode),
        description: product.description ?? '',
        composition: composition(product.composition),
        construction: product.construction ?? '',
        care: product.care ?? '',
        specs: specs(product.specs),
        specSchema: specSchema(product.family.specSchema),
        variants: product.productVariants_on_product.map((variant) => ({
          id: variant.id,
          fullCode: variant.fullCode,
          code: variant.code,
          name: variant.name,
          widthCm: variant.widthCm ?? null,
          usableWidthCm: variant.usableWidthCm ?? null,
          gsm: variant.gsm ?? null,
          stretchWarpPercent: variant.stretchWarpPercent ?? null,
          stretchWeftPercent: variant.stretchWeftPercent ?? null,
          finish: variant.finish ?? '',
          status: variant.status,
        })),
        skus,
      };
    },
  });
}

export function useSkus() {
  return useQuery({
    queryKey: ['catalog', 'skus'],
    queryFn: async (): Promise<SkuRow[]> => {
      if (isSample) return (await sample()).skus();
      const { dc, sdk } = await live();
      const { data } = await sdk.listSkus(dc);
      return data.skus.map((sku) => ({
        code: sku.code,
        productCode: sku.product.code,
        productName: sku.product.name,
        productIndex: sku.product.index,
        variantCode: sku.variant.fullCode.split('-').slice(1).join('-'),
        variantName: sku.variant.name,
        shadeCode: sku.shade.code,
        shadeName: sku.shade.name,
        shadeHex: sku.shade.hex ?? '#CCCCCC',
        shadeSort: sku.shade.sort,
        putUpName: sku.putUp.name,
        status: sku.status,
        isPublic: sku.isPublic,
        rollTracking: sku.rollTracking,
        salesUom: sku.salesUom,
      }));
    },
  });
}

export function useSku(code: string) {
  return useQuery({
    queryKey: ['catalog', 'sku', code],
    queryFn: async (): Promise<SkuDetail | null> => {
      if (isSample) return (await sample()).sku(code);
      const { dc, sdk } = await live();
      const { data } = await sdk.getSku(dc, { code });
      const sku = data.sku;
      if (!sku) return null;
      return {
        code: sku.code,
        productCode: sku.product.code,
        productName: sku.product.name,
        productIndex: sku.product.index,
        variantCode: sku.variant.fullCode.split('-').slice(1).join('-'),
        variantName: sku.variant.name,
        shadeCode: sku.shade.code,
        shadeName: sku.shade.name,
        shadeHex: sku.shade.hex ?? '#CCCCCC',
        shadeSort: 0,
        putUpName: sku.putUp.name,
        status: sku.status,
        isPublic: sku.isPublic,
        rollTracking: sku.rollTracking,
        salesUom: sku.salesUom,
        familyCode: sku.product.family.code,
        familyName: sku.product.family.name,
        barcode: sku.barcode ?? '',
        salesMoq: sku.salesMoq ?? null,
        widthCm: sku.variant.widthCm ?? null,
        usableWidthCm: sku.variant.usableWidthCm ?? null,
        gsm: sku.variant.gsm ?? null,
        rollLengthM: sku.putUp.rollLengthM,
      };
    },
  });
}

/** Cost-bearing. The connector refuses roles without cost access; the screen asks only when allowed. */
export function useSkuSourcing(code: string, enabled: boolean) {
  return useQuery({
    queryKey: ['catalog', 'sku-sourcing', code],
    enabled,
    queryFn: async (): Promise<SkuSourcing> => {
      if (isSample) return (await sample()).skuSourcing(code);
      const { dc, sdk } = await live();
      const { data } = await sdk.getSkuSourcing(dc, { code });
      return {
        supplierItems: data.supplierItems.map((item) => ({
          id: item.id,
          supplierId: item.supplier.id,
          supplierName: item.supplier.tradingName || item.supplier.legalName,
          factoryName: item.factory ? `${item.factory.location.name}${item.factory.location.city ? `, ${item.factory.location.city}` : ''}` : '',
          supplierSku: item.supplierSku ?? '',
          moq: item.moq ?? null,
          leadTimeDays: item.leadTimeDays ?? null,
          isPreferred: item.isPreferred,
          prices: item.supplierPrices_on_supplierItem.map((price) => ({
            minQuantity: price.minQuantity,
            unitPrice: price.unitPrice,
            currency: price.currency,
          })),
        })),
      };
    },
  });
}

export function useShades() {
  return useQuery({
    queryKey: ['catalog', 'shades'],
    queryFn: async (): Promise<ShadeView[]> => {
      if (isSample) return (await sample()).shades();
      const { dc, sdk } = await live();
      const { data } = await sdk.listShades(dc);
      return data.shades.map((shade) => ({
        code: shade.code,
        name: shade.name,
        slug: shade.slug,
        hex: shade.hex ?? '#CCCCCC',
        collection: shade.collection?.name ?? '',
        sort: shade.sort,
        status: shade.status,
        availableIn: [...new Set(shade.skus_on_shade.filter((sku) => sku.status === 'active').map((sku) => sku.product.code))],
        pendingIn: [...new Set(shade.skus_on_shade.filter((sku) => sku.status !== 'active' && sku.status !== 'discontinued').map((sku) => sku.product.code))],
      }));
    },
  });
}

export function usePutUps() {
  return useQuery({
    queryKey: ['catalog', 'put-ups'],
    queryFn: async (): Promise<PutUpView[]> => {
      if (isSample) return (await sample()).putUps();
      const { dc, sdk } = await live();
      const { data } = await sdk.listPutUps(dc);
      return data.putUps.map((p) => ({
        code: p.code,
        name: p.name,
        rollLengthM: p.rollLengthM,
        widthCm: p.widthCm,
        core: p.core ?? '',
        wrap: p.wrap ?? '',
        rollsPerCarton: p.rollsPerCarton ?? null,
      }));
    },
  });
}

export interface NewProductInput {
  code: string;
  family: string;
  index: number;
  name: string;
  tagline: string;
  description: string;
  status: ProductStatus;
}

export function useCreateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewProductInput): Promise<string> => {
      if (isSample) return (await sample()).createProduct(input);
      const { dc, sdk } = await live();
      await sdk.upsertProduct(dc, {
        code: input.code,
        familyCode: input.family,
        index: input.index,
        name: input.name,
        slug: slugify(input.name),
        tagline: input.tagline || null,
        description: input.description || null,
        status: sdk.ProductStatus[input.status],
        isPublic: false,
      });
      await recordEvent('product', input.code, 'created', undefined, { summary: input.name });
      return input.code;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

// ---------------------------------------------------------------- editing

export interface UpdateProductInput {
  code: string;
  name: string;
  tagline: string;
  description: string;
  construction: string;
  care: string;
  specs: Record<string, string>;
  status: ProductStatus;
  isPublic: boolean;
}

export function useUpdateProduct() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProductInput): Promise<void> => {
      if (isSample) {
        await (await sample()).updateProduct(input);
      } else {
        const { dc, sdk } = await live();
        await sdk.updateProductDetails(dc, {
          code: input.code,
          name: input.name,
          slug: slugify(input.name),
          tagline: input.tagline || null,
          description: input.description || null,
          composition: null,
          construction: input.construction || null,
          care: input.care || null,
          specs: input.specs,
          status: sdk.ProductStatus[input.status],
          isPublic: input.isPublic,
        });
      }
      await recordEvent('product', input.code, 'updated');
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog'] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.code] });
    },
  });
}

export interface NewVariantInput {
  productCode: string;
  code: string;
  name: string;
  widthCm: number | null;
  usableWidthCm: number | null;
  gsm: number | null;
  stretchWarpPercent: number | null;
  stretchWeftPercent: number | null;
  finish: string;
}

export function useCreateVariant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewVariantInput): Promise<string> => {
      const fullCode = `${input.productCode}-${input.code}`.toUpperCase();
      if (isSample) {
        await (await sample()).createVariant(input);
      } else {
        const { dc, sdk } = await live();
        await sdk.insertVariant(dc, {
          productCode: input.productCode,
          fullCode,
          code: input.code.toUpperCase(),
          name: input.name,
          widthCm: input.widthCm,
          usableWidthCm: input.usableWidthCm,
          gsm: input.gsm,
          stretchWarpPercent: input.stretchWarpPercent,
          stretchWeftPercent: input.stretchWeftPercent,
          finish: input.finish || null,
          specs: null,
          status: sdk.ProductStatus.active,
          sort: 99,
        });
      }
      await recordEvent('product', input.productCode, 'variant_added', undefined, { summary: `${input.name} (${fullCode})` });
      return fullCode;
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog'] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}

export interface NewSkusInput {
  productCode: string;
  variantId: string;
  variantCode: string;
  shadeCodes: string[];
  putUpCode: string;
  status: SkuStatus;
  rollTracking: boolean;
}

export function useCreateSkus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSkusInput): Promise<string[]> => {
      let created: string[];
      if (isSample) {
        created = await (await sample()).createSkus(input);
      } else {
        const { dc, sdk } = await live();
        created = [];
        for (const shadeCode of input.shadeCodes) {
          const code = skuCode(input.productCode, input.variantCode, shadeCode);
          await sdk.upsertSku(dc, {
            code,
            productCode: input.productCode,
            variantId: input.variantId,
            shadeCode,
            putUpCode: input.putUpCode,
            salesUom: 'm',
            salesMoq: null,
            status: sdk.SkuStatus[input.status],
            isPublic: false,
            rollTracking: input.rollTracking,
          });
          created.push(code);
        }
      }
      if (created.length > 0) {
        await recordEvent('product', input.productCode, 'skus_added', undefined, { summary: created.join(', ') });
      }
      return created;
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog'] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}

export function useSetSkuStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; productCode: string; status: SkuStatus; previous: SkuStatus }): Promise<void> => {
      if (isSample) {
        await (await sample()).setSkuStatus(input.code, input.status);
      } else {
        const { dc, sdk } = await live();
        await sdk.setSkuStatus(dc, { code: input.code, status: sdk.SkuStatus[input.status] });
      }
      await recordEvent('product', input.productCode, 'status_changed', undefined, {
        summary: `${input.code}: ${SKU_STATUS_LABEL[input.previous]} to ${SKU_STATUS_LABEL[input.status]}`,
      });
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog'] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}

export function useSetSkuPublic() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; productCode: string; isPublic: boolean }): Promise<void> => {
      if (isSample) {
        await (await sample()).setSkuPublic(input.code, input.isPublic);
      } else {
        const { dc, sdk } = await live();
        await sdk.setSkuPublic(dc, { code: input.code, isPublic: input.isPublic });
      }
      await recordEvent('product', input.productCode, input.isPublic ? 'published' : 'unpublished', undefined, { summary: input.code });
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog'] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}

export interface NewSourcingInput {
  skuCode: string;
  productCode: string;
  supplierId: string;
  factoryId: string;
  supplierSku: string;
  /** Fixed-point thousandths of a metre, or null. */
  moq: string | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  price: { minQuantity: string; unitPrice: string; currency: string };
}

export function useAddSourcing() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewSourcingInput): Promise<void> => {
      if (isSample) {
        await (await sample()).addSourcing(input);
      } else {
        const { dc, sdk } = await live();
        const { data } = await sdk.insertSupplierItem(dc, {
          skuCode: input.skuCode,
          supplierId: input.supplierId,
          factoryId: input.factoryId || null,
          supplierSku: input.supplierSku || null,
          moq: input.moq,
          leadTimeDays: input.leadTimeDays,
          isPreferred: input.isPreferred,
          notes: null,
        });
        await sdk.insertSupplierPrice(dc, {
          supplierItemId: data.supplierItem_insert.id,
          minQuantity: input.price.minQuantity,
          unitPrice: input.price.unitPrice,
          currency: input.price.currency,
          validFrom: null,
          validTo: null,
          quotationRef: null,
        });
      }
      await recordEvent('product', input.productCode, 'sourcing_added', undefined, { summary: input.skuCode });
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog', 'sku-sourcing', input.skuCode] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}

export function useShadeStandards(productCode: string) {
  return useQuery({
    queryKey: ['catalog', 'standards', productCode],
    queryFn: async (): Promise<ShadeStandardView[]> => {
      if (isSample) return (await sample()).shadeStandards(productCode);
      const { dc, sdk } = await live();
      const { data } = await sdk.listShadeStandards(dc, { productCode });
      return data.shadeStandards.map((standard) => ({
        id: standard.id,
        shadeCode: standard.shade.code,
        shadeName: standard.shade.name,
        factoryId: standard.factory?.id ?? '',
        factoryName: standard.factory ? `${standard.factory.location.name}${standard.factory.location.city ? `, ${standard.factory.location.city}` : ''}` : '',
        reference: standard.reference ?? '',
        approvedOn: standard.approvedOn ?? '',
        toleranceDeltaE: standard.toleranceDeltaE ?? null,
        physicalLocation: standard.physicalLocation ?? '',
      }));
    },
  });
}

export interface NewStandardInput {
  productCode: string;
  shadeCode: string;
  factoryId: string;
  reference: string;
  approvedOn: string;
  toleranceDeltaE: number | null;
  physicalLocation: string;
}

export function useAddShadeStandard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewStandardInput): Promise<void> => {
      if (isSample) {
        await (await sample()).addShadeStandard(input);
      } else {
        const { dc, sdk } = await live();
        await sdk.insertShadeStandard(dc, {
          shadeCode: input.shadeCode,
          productCode: input.productCode,
          factoryId: input.factoryId || null,
          reference: input.reference || null,
          approvedOn: input.approvedOn || null,
          toleranceDeltaE: input.toleranceDeltaE,
          physicalLocation: input.physicalLocation || null,
        });
      }
      await recordEvent('product', input.productCode, 'standard_recorded', undefined, { summary: `${input.shadeCode} ${input.reference}`.trim() });
    },
    onSuccess: async (_, input) => {
      await client.invalidateQueries({ queryKey: ['catalog', 'standards', input.productCode] });
      await client.invalidateQueries({ queryKey: ['timeline', 'product', input.productCode] });
    },
  });
}
