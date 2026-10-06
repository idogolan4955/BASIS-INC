import {
  LAUNCH_CATALOG,
  skuCode,
  slugify,
  type CompanyDetail,
  type CompanyRoleKind,
  type CompanyStatus,
  type CompanySummary,
  type ContactView,
  type FactoryOption,
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
  type VariantView,
} from '@basis/shared';

// SAMPLE DATA for `--mode sample`. The catalog is the real launch range from
// the brand booklet; SKU statuses, companies, contacts, prices and standards
// are invented so the screens can be reviewed. Writes change this in-memory
// store for the session and nothing else.

interface SkuRecord {
  code: string;
  productCode: string;
  variantCode: string;
  shadeCode: string;
  status: SkuStatus;
  isPublic: boolean;
}

interface ProductRecord {
  code: string;
  family: string;
  index: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  composition: ProductDetail['composition'];
  construction: string;
  care: string;
  specs: Record<string, string>;
  status: ProductStatus;
  isPublic: boolean;
}

interface VariantRecord extends VariantView {
  productCode: string;
}

interface CompanyRecord extends Omit<CompanyDetail, 'name' | 'contactCount' | 'contacts'> {
  contacts: ContactView[];
}

type SourcingItem = SkuSourcing['supplierItems'][number];

const putUp = LAUNCH_CATALOG.putUps[0]!;

// A believable availability picture: meshes approved in skin tones, neutrals
// and the non-mesh products still being sampled or developed.
function sampleStatus(product: string, shade: string): SkuStatus {
  const skin = shade.startsWith('SK');
  if (product === 'PWM') return 'active';
  if (product === 'ILM') return skin ? 'active' : 'sampling';
  if (product === 'N58') return shade === 'SK02' ? 'active' : skin ? 'sampling' : 'development';
  if (product === 'SHL') return skin || shade === 'MLK' ? 'active' : 'sampling';
  return shade === 'MLK' || shade === 'PUR' ? 'active' : shade === 'BNE' ? 'sampling' : 'development';
}

const store = {
  products: LAUNCH_CATALOG.products.map<ProductRecord>((product) => ({
    ...product,
    specs: { ...product.specs },
    composition: [],
    construction: '',
    care: '',
    status: 'active',
    isPublic: true,
  })),
  variants: LAUNCH_CATALOG.variants.map<VariantRecord>((variant) => ({
    id: `${variant.product}-${variant.code}`,
    productCode: variant.product,
    fullCode: `${variant.product}-${variant.code}`,
    code: variant.code,
    name: variant.name,
    widthCm: variant.widthCm,
    usableWidthCm: null,
    gsm: null,
    stretchWarpPercent: null,
    stretchWeftPercent: null,
    finish: '',
    status: 'active',
  })),
  skus: LAUNCH_CATALOG.products.flatMap((product) =>
    LAUNCH_CATALOG.shades.map<SkuRecord>((shade) => ({
      code: skuCode(product.code, '160', shade.code),
      productCode: product.code,
      variantCode: '160',
      shadeCode: shade.code,
      status: sampleStatus(product.code, shade.code),
      isPublic: sampleStatus(product.code, shade.code) === 'active',
    })),
  ),
  companies: [] as CompanyRecord[],
  sourcing: new Map<string, SourcingItem[]>(),
  standards: [] as ShadeStandardView[],
};

function company(
  id: string,
  legalName: string,
  tradingName: string,
  countryCode: string,
  countryName: string,
  roles: CompanyRoleKind[],
  contacts: Omit<ContactView, 'id' | 'status'>[],
  extra: Partial<CompanyRecord> = {},
): CompanyRecord {
  return {
    id,
    legalName,
    tradingName,
    countryCode,
    countryName,
    website: '',
    status: 'active',
    roles,
    registrationId: '',
    taxId: '',
    defaultCurrency: countryCode === 'CN' ? 'USD' : 'EUR',
    notes: '',
    supplierProfile: null,
    contacts: contacts.map((contact, index) => ({ ...contact, id: `${id}-c${index + 1}`, status: 'active' })),
    locations: [],
    factories: [],
    ...extra,
  };
}

store.companies = [
  company('co-jinyu', 'Haining Jinyu Warp Knitting Co., Ltd.', 'Jinyu Knitting', 'CN', 'China', ['supplier', 'factory_operator'], [
    { name: 'Lin Mei', title: 'Export manager', email: 'mei.lin@example.invalid', phone: '+86 573 0000 0000', messaging: 'WeChat', language: 'zh', isPrimary: true },
    { name: 'Zhou Wen', title: 'Dyehouse lead', email: '', phone: '', messaging: 'WeChat', language: 'zh', isPrimary: false },
  ], {
    supplierProfile: { paymentTerms: '30% deposit, 70% before shipment', defaultIncoterm: 'FOB', namedPlace: 'Ningbo', standardLeadTimeDays: 45, onboardingStatus: 'approved' },
    locations: [
      { id: 'loc-jinyu-1', type: 'factory', name: 'Jinyu mill', addressLine1: '', city: 'Haining', region: 'Zhejiang', postalCode: '', countryCode: 'CN', countryName: 'China', timeZone: 'Asia/Shanghai', locationCode: '' },
    ],
    factories: [{ id: 'fac-jinyu-1', name: 'Jinyu mill', city: 'Haining', countryName: 'China', capabilities: [{ familyCode: 'MSH', processes: ['warp knitting', 'dyeing', 'finishing'] }], auditStatus: 'audited 2026' }],
  }),
  company('co-lanrui', 'Shaoxing Lanrui Textile Co., Ltd.', 'Lanrui Textile', 'CN', 'China', ['supplier', 'factory_operator'], [
    { name: 'Chen Yao', title: 'Sales director', email: 'yao.chen@example.invalid', phone: '', messaging: 'WeChat', language: 'zh', isPrimary: true },
  ], {
    supplierProfile: { paymentTerms: '30% deposit, 70% against BL copy', defaultIncoterm: 'FOB', namedPlace: 'Ningbo', standardLeadTimeDays: 35, onboardingStatus: 'approved' },
    locations: [
      { id: 'loc-lanrui-1', type: 'factory', name: 'Lanrui weaving mill', addressLine1: '', city: 'Shaoxing', region: 'Zhejiang', postalCode: '', countryCode: 'CN', countryName: 'China', timeZone: 'Asia/Shanghai', locationCode: '' },
    ],
    factories: [{ id: 'fac-lanrui-1', name: 'Lanrui weaving mill', city: 'Shaoxing', countryName: 'China', capabilities: [{ familyCode: 'LIN', processes: ['weaving', 'dyeing'] }, { familyCode: 'TUL', processes: ['knitting', 'finishing'] }], auditStatus: 'audit due' }],
  }),
  company('co-marlin', 'Marlin Global Logistics Co., Ltd.', 'Marlin Logistics', 'CN', 'China', ['freight_forwarder'], [
    { name: 'Sun Qing', title: 'Account manager', email: 'q.sun@example.invalid', phone: '', messaging: 'WhatsApp', language: 'en', isPrimary: true },
  ], {
    locations: [
      { id: 'loc-marlin-1', type: 'consolidation_hub', name: 'Marlin Ningbo CFS', addressLine1: '', city: 'Ningbo', region: 'Zhejiang', postalCode: '', countryCode: 'CN', countryName: 'China', timeZone: 'Asia/Shanghai', locationCode: 'CNNGB' },
    ],
  }),
  company('co-kessler', 'Kessler & Partner Zollservice GmbH', 'Kessler Zollservice', 'DE', 'Germany', ['customs_broker'], [
    { name: 'Anke Reimers', title: 'Customs declarant', email: 'a.reimers@example.invalid', phone: '', messaging: '', language: 'de', isPrimary: true },
  ]),
  company('co-avelline', 'Maison Avelline SAS', 'Maison Avelline', 'FR', 'France', ['customer'], [
    { name: 'Claire Vautrin', title: 'Head of atelier', email: 'claire@example.invalid', phone: '', messaging: '', language: 'fr', isPrimary: true },
  ]),
  company('co-solenne', 'Atelier Solenne S.r.l.', 'Atelier Solenne', 'IT', 'Italy', ['customer'], [
    { name: 'Giulia Ferrante', title: 'Founder', email: 'giulia@example.invalid', phone: '', messaging: 'WhatsApp', language: 'it', isPrimary: true },
  ]),
  company('co-novia', 'Novia Estudio S.L.', 'Novia Estudio', 'ES', 'Spain', ['customer'], [
    { name: 'Marta Oliván', title: 'Buyer', email: 'marta@example.invalid', phone: '', messaging: '', language: 'es', isPrimary: true },
  ]),
  company('co-halden', 'Halden Bridal Ltd', 'Halden Bridal', 'GB', 'United Kingdom', ['customer'], [
    { name: 'Priya Dhillon', title: 'Production manager', email: 'priya@example.invalid', phone: '', messaging: '', language: 'en', isPrimary: true },
  ]),
  company('co-lorena', 'Casa Lorena Atelier LLC', 'Casa Lorena Atelier', 'US', 'United States', ['customer'], [
    { name: 'Lorena Castañeda', title: 'Owner', email: 'lorena@example.invalid', phone: '', messaging: '', language: 'es', isPrimary: true },
  ]),
];

// Sourcing for the sample: meshes from Jinyu, lining and tulle from Lanrui.
for (const sku of store.skus) {
  const mesh = ['PWM', 'ILM', 'N58'].includes(sku.productCode);
  const supplier = store.companies.find((c) => c.id === (mesh ? 'co-jinyu' : 'co-lanrui'))!;
  store.sourcing.set(sku.code, [
    {
      id: `si-${sku.code}`,
      supplierId: supplier.id,
      supplierName: supplier.tradingName,
      factoryName: supplier.factories[0]?.name ?? '',
      supplierSku: `${mesh ? 'JY' : 'LR'}-${sku.productCode}-${sku.shadeCode}`,
      moq: '1000000',
      leadTimeDays: mesh ? 45 : 35,
      isPreferred: true,
      prices: [
        { minQuantity: '1000000', unitPrice: mesh ? '28500' : '19800', currency: 'USD' },
        { minQuantity: '5000000', unitPrice: mesh ? '26900' : '18400', currency: 'USD' },
      ],
    },
  ]);
}

store.standards = store.skus
  .filter((sku) => sku.status === 'active' && sku.productCode === 'PWM')
  .map((sku, index) => ({
    id: `std-${sku.code}`,
    shadeCode: sku.shadeCode,
    shadeName: LAUNCH_CATALOG.shades.find((shade) => shade.code === sku.shadeCode)?.name ?? sku.shadeCode,
    factoryId: 'fac-jinyu-1',
    factoryName: 'Jinyu mill',
    reference: `LD-26-0${31 + index}`,
    approvedOn: '2026-09-18',
    toleranceDeltaE: 0.8,
    physicalLocation: 'Shade cabinet, drawer PWM',
  }));

const shadeByCode = new Map(LAUNCH_CATALOG.shades.map((shade) => [shade.code, shade]));
const familyByCode = new Map(LAUNCH_CATALOG.families.map((family) => [family.code, family]));

function skuRow(sku: SkuRecord): SkuRow {
  const product = store.products.find((candidate) => candidate.code === sku.productCode)!;
  const shade = shadeByCode.get(sku.shadeCode)!;
  const variant = store.variants.find((candidate) => candidate.productCode === sku.productCode && candidate.code === sku.variantCode);
  return {
    code: sku.code,
    productCode: product.code,
    productName: product.name,
    productIndex: product.index,
    variantCode: sku.variantCode,
    variantName: variant?.name ?? sku.variantCode,
    shadeCode: shade.code,
    shadeName: shade.name,
    shadeHex: shade.hex,
    shadeSort: shade.sort,
    putUpName: putUp.name,
    status: sku.status,
    isPublic: sku.isPublic,
    rollTracking: true,
    salesUom: 'm',
  };
}

function productSummary(product: ProductRecord): ProductSummary {
  const skus = store.skus.filter((sku) => sku.productCode === product.code);
  const family = familyByCode.get(product.family)!;
  return {
    code: product.code,
    index: product.index,
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    familyCode: family.code,
    familyName: family.name,
    status: product.status,
    isPublic: product.isPublic,
    skuCount: skus.length,
    availableShades: skus.filter((sku) => sku.status === 'active').map((sku) => sku.shadeCode),
  };
}

const toSummary = (c: CompanyRecord): CompanySummary => ({ ...c, name: c.tradingName || c.legalName, contactCount: c.contacts.length });

export const sampleCatalog = {
  async families(): Promise<FamilyView[]> {
    return LAUNCH_CATALOG.families.map((family) => ({
      ...family,
      products: store.products.filter((product) => product.family === family.code).map(productSummary),
    }));
  },
  async products(): Promise<ProductSummary[]> {
    return store.products.map(productSummary);
  },
  async product(code: string): Promise<ProductDetail | null> {
    const product = store.products.find((candidate) => candidate.code === code);
    if (!product) return null;
    const family = familyByCode.get(product.family)!;
    return {
      ...productSummary(product),
      description: product.description,
      composition: product.composition,
      construction: product.construction,
      care: product.care,
      specs: product.specs,
      specSchema: family.specSchema,
      variants: store.variants.filter((variant) => variant.productCode === product.code).map(({ productCode: _p, ...variant }) => variant),
      skus: store.skus.filter((sku) => sku.productCode === product.code).map(skuRow),
    };
  },
  async skus(): Promise<SkuRow[]> {
    return store.skus.map(skuRow);
  },
  async sku(code: string): Promise<SkuDetail | null> {
    const record = store.skus.find((candidate) => candidate.code === code);
    if (!record) return null;
    const row = skuRow(record);
    const family = familyByCode.get(store.products.find((p) => p.code === record.productCode)!.family)!;
    const variant = store.variants.find((candidate) => candidate.productCode === record.productCode && candidate.code === record.variantCode);
    return {
      ...row,
      familyCode: family.code,
      familyName: family.name,
      barcode: '',
      salesMoq: null,
      widthCm: variant?.widthCm ?? null,
      usableWidthCm: variant?.usableWidthCm ?? null,
      gsm: variant?.gsm ?? null,
      rollLengthM: putUp.rollLengthM,
    };
  },
  async skuSourcing(code: string): Promise<SkuSourcing> {
    return { supplierItems: store.sourcing.get(code) ?? [] };
  },
  async shades(): Promise<ShadeView[]> {
    return LAUNCH_CATALOG.shades.map((shade) => {
      const collection = LAUNCH_CATALOG.shadeCollections.find((c) => c.code === shade.collection);
      const skus = store.skus.filter((sku) => sku.shadeCode === shade.code);
      return {
        ...shade,
        collection: collection?.name ?? '',
        status: 'active',
        availableIn: [...new Set(skus.filter((sku) => sku.status === 'active').map((sku) => sku.productCode))],
        pendingIn: [...new Set(skus.filter((sku) => sku.status !== 'active' && sku.status !== 'discontinued').map((sku) => sku.productCode))],
      };
    });
  },
  async putUps(): Promise<PutUpView[]> {
    return LAUNCH_CATALOG.putUps.map((p) => ({ ...p, rollsPerCarton: p.rollsPerCarton }));
  },
  async createProduct(input: { code: string; family: string; index: number; name: string; tagline: string; description: string; status: ProductStatus }): Promise<string> {
    if (store.products.some((product) => product.code === input.code)) throw new Error(`Product code ${input.code} already exists.`);
    store.products.push({ ...input, slug: slugify(input.name), specs: {}, composition: [], construction: '', care: '', isPublic: false });
    return input.code;
  },
  async updateProduct(input: {
    code: string;
    name: string;
    tagline: string;
    description: string;
    construction: string;
    care: string;
    specs: Record<string, string>;
    status: ProductStatus;
    isPublic: boolean;
  }): Promise<void> {
    const product = store.products.find((candidate) => candidate.code === input.code);
    if (!product) throw new Error('No such product.');
    Object.assign(product, { ...input, slug: slugify(input.name), specs: { ...input.specs } });
  },
  async createVariant(input: {
    productCode: string;
    code: string;
    name: string;
    widthCm: number | null;
    usableWidthCm: number | null;
    gsm: number | null;
    stretchWarpPercent: number | null;
    stretchWeftPercent: number | null;
    finish: string;
  }): Promise<string> {
    const fullCode = `${input.productCode}-${input.code}`.toUpperCase();
    if (store.variants.some((variant) => variant.fullCode === fullCode)) throw new Error(`Variant ${fullCode} already exists.`);
    store.variants.push({ id: fullCode, fullCode, status: 'active', ...input, code: input.code.toUpperCase() });
    return fullCode;
  },
  async createSkus(input: { productCode: string; variantCode: string; shadeCodes: string[]; status: SkuStatus; rollTracking: boolean }): Promise<string[]> {
    const created: string[] = [];
    for (const shadeCode of input.shadeCodes) {
      const code = skuCode(input.productCode, input.variantCode, shadeCode);
      if (store.skus.some((sku) => sku.code === code)) continue;
      store.skus.push({ code, productCode: input.productCode, variantCode: input.variantCode, shadeCode, status: input.status, isPublic: false });
      created.push(code);
    }
    return created;
  },
  async setSkuStatus(code: string, status: SkuStatus): Promise<void> {
    const sku = store.skus.find((candidate) => candidate.code === code);
    if (!sku) throw new Error('No such SKU.');
    sku.status = status;
    if (status !== 'active') sku.isPublic = false;
  },
  async setSkuPublic(code: string, isPublic: boolean): Promise<void> {
    const sku = store.skus.find((candidate) => candidate.code === code);
    if (!sku) throw new Error('No such SKU.');
    sku.isPublic = isPublic;
  },
  async addSourcing(input: {
    skuCode: string;
    supplierId: string;
    factoryId: string;
    supplierSku: string;
    moq: string | null;
    leadTimeDays: number | null;
    isPreferred: boolean;
    price: { minQuantity: string; unitPrice: string; currency: string };
  }): Promise<string> {
    const supplier = store.companies.find((c) => c.id === input.supplierId);
    if (!supplier) throw new Error('No such supplier.');
    const factory = store.companies.flatMap((c) => c.factories).find((f) => f.id === input.factoryId);
    const list = store.sourcing.get(input.skuCode) ?? [];
    const id = `si-${input.skuCode}-${list.length + 1}`;
    list.push({
      id,
      supplierId: supplier.id,
      supplierName: supplier.tradingName || supplier.legalName,
      factoryName: factory?.name ?? '',
      supplierSku: input.supplierSku,
      moq: input.moq,
      leadTimeDays: input.leadTimeDays,
      isPreferred: input.isPreferred,
      prices: [input.price],
    });
    store.sourcing.set(input.skuCode, list);
    return id;
  },
  async shadeStandards(productCode: string): Promise<ShadeStandardView[]> {
    return store.standards.filter((standard) => store.skus.some((sku) => sku.productCode === productCode && sku.shadeCode === standard.shadeCode) && (productCode === 'PWM' || standard.id.includes(`-${productCode}-`)));
  },
  async addShadeStandard(input: { productCode: string; shadeCode: string; factoryId: string; reference: string; approvedOn: string; toleranceDeltaE: number | null; physicalLocation: string }): Promise<string> {
    const factory = store.companies.flatMap((c) => c.factories).find((f) => f.id === input.factoryId);
    const id = `std-${input.productCode}-${input.shadeCode}-${store.standards.length + 1}`;
    store.standards.push({
      id,
      shadeCode: input.shadeCode,
      shadeName: shadeByCode.get(input.shadeCode)?.name ?? input.shadeCode,
      factoryId: input.factoryId,
      factoryName: factory?.name ?? '',
      reference: input.reference,
      approvedOn: input.approvedOn,
      toleranceDeltaE: input.toleranceDeltaE,
      physicalLocation: input.physicalLocation,
    });
    return id;
  },
  async companies(): Promise<CompanySummary[]> {
    return store.companies.map(toSummary);
  },
  async company(id: string): Promise<CompanyDetail | null> {
    const record = store.companies.find((candidate) => candidate.id === id);
    return record ? { ...record, name: record.tradingName || record.legalName, contactCount: record.contacts.length } : null;
  },
  async factories(): Promise<FactoryOption[]> {
    return store.companies.flatMap((c) => c.factories.map((factory) => ({ id: factory.id, name: factory.name, companyId: c.id, companyName: c.tradingName || c.legalName })));
  },
  async createCompany(input: { legalName: string; tradingName: string; countryCode: string; countryName: string; roles: CompanyRoleKind[]; website: string }): Promise<string> {
    const id = `co-${slugify(input.tradingName || input.legalName)}-${store.companies.length + 1}`;
    store.companies.push(company(id, input.legalName, input.tradingName, input.countryCode, input.countryName, input.roles, [], { website: input.website, status: 'prospect' }));
    return id;
  },
  async updateCompany(input: { id: string; legalName: string; tradingName: string; countryCode: string; countryName: string; website: string; status: CompanyStatus; notes: string }): Promise<void> {
    const record = store.companies.find((candidate) => candidate.id === input.id);
    if (!record) throw new Error('No such company.');
    Object.assign(record, input);
  },
  async addContact(companyId: string, input: Omit<ContactView, 'id' | 'status'>): Promise<string> {
    const record = store.companies.find((candidate) => candidate.id === companyId);
    if (!record) throw new Error('No such company.');
    const id = `${companyId}-c${record.contacts.length + 1}`;
    record.contacts = [...record.contacts, { ...input, id, status: 'active' }];
    return id;
  },
};
