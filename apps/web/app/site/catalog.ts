import { LAUNCH_CATALOG } from '@basis/shared';

// The site reads the launch range until the publishing workflow (B4) feeds
// it from the platform's published tables. Slugs and index numbers come from
// the catalog; nothing on the site is typed in by hand.

export type Family = (typeof LAUNCH_CATALOG.families)[number];
export type Product = (typeof LAUNCH_CATALOG.products)[number];
export type Shade = (typeof LAUNCH_CATALOG.shades)[number];

export const FAMILY_SLUG: Record<string, string> = { MSH: 'mesh', LIN: 'lining', TUL: 'tulle' };
export const FAMILY_STRUCTURE: Record<string, 'mesh' | 'lining' | 'tulle'> = { MSH: 'mesh', LIN: 'lining', TUL: 'tulle' };

/** What each family does in a gown, in the brand's own words. */
export const FAMILY_ROLE: Record<string, { lead: string; body: string }> = {
  MSH: { lead: 'The structure under the dress.', body: 'Three meshes, one family: shaping, illusion and controlled support. Each is defined by what it does in construction, so the right one is a decision, not a guess.' },
  LIN: { lead: 'The layer against the skin.', body: 'A smooth, soft, breathable foundation that lets the outer fabric fall as it should, in shades that disappear.' },
  TUL: { lead: 'Volume, layering, veils.', body: 'A fine bridal tulle, lightweight and ethereal, made to be layered and to hold air.' },
};

export const PRODUCT_NUMBER = (product: Product) => String(product.index).padStart(2, '0');

export const families = LAUNCH_CATALOG.families.map((family) => ({
  ...family,
  slug: family.slug || FAMILY_SLUG[family.code] || family.code.toLowerCase(),
  structure: FAMILY_STRUCTURE[family.code] ?? 'mesh',
  role: FAMILY_ROLE[family.code] ?? { lead: family.name, body: '' },
  products: LAUNCH_CATALOG.products.filter((product) => product.family === family.code).sort((a, b) => a.index - b.index),
}));

export const products = LAUNCH_CATALOG.products.map((product) => ({
  ...product,
  familySlug: LAUNCH_CATALOG.families.find((family) => family.code === product.family)?.slug || FAMILY_SLUG[product.family] || product.family.toLowerCase(),
  familyName: LAUNCH_CATALOG.families.find((family) => family.code === product.family)?.name ?? product.family,
  structure: FAMILY_STRUCTURE[product.family] ?? 'mesh',
  variants: LAUNCH_CATALOG.variants.filter((variant) => variant.product === product.code),
}));

export const shades = [...LAUNCH_CATALOG.shades].sort((a, b) => a.sort - b.sort);
export const shadeCollections = [...LAUNCH_CATALOG.shadeCollections].sort((a, b) => a.sort - b.sort);
export const putUp = LAUNCH_CATALOG.putUps[0]!;

export const familyBySlug = (slug: string) => families.find((family) => family.slug === slug);
export const productBySlug = (familySlug: string, slug: string) => products.find((product) => product.familySlug === familySlug && product.slug === slug);
export const shadeBySlug = (slug: string) => shades.find((shade) => shade.slug === slug);

/** Applications start from the garment problem and point at the fabrics that solve it. */
export const applications = [
  { slug: 'corsetry', name: 'Corsetry and support', problem: 'A bodice that holds its shape through a long day, without a visible foundation.', fabrics: ['PWM', 'N58'], notes: 'Powermesh carries the load in support zones; N58 where control must stay soft and the surface quiet. Cut with the stretch running around the body.' },
  { slug: 'illusion', name: 'Illusion and second skin', problem: 'Lace and embroidery that appear to sit on the skin.', fabrics: ['ILM', 'N58'], notes: 'Illusion Stretch Mesh in the shade closest to the wearer; the Shade System exists for this. N58 where an illusion panel also carries weight.' },
  { slug: 'lining', name: 'Lining', problem: 'A foundation layer that lets the outer fabric fall as designed and feels like nothing.', fabrics: ['SHL'], notes: 'Shanel Lining in a shade that disappears under the outer fabric. Breathable, smooth, with enough body not to cling.' },
  { slug: 'veils', name: 'Veils, layering and volume', problem: 'Volume that holds air and light without weight.', fabrics: ['BTL'], notes: 'Bridal Tulle layered in two or three plies; Milk and Pure for white gowns, Skin tones under coloured embroidery.' },
] as const;
export const applicationBySlug = (slug: string) => applications.find((application) => application.slug === slug);
export const productByCode = (code: string) => products.find((product) => product.code === code);

/** Every static path the site prerenders. */
export function sitePaths(): string[] {
  return [
    '/',
    '/fabrics',
    ...families.map((family) => `/fabrics/${family.slug}`),
    ...products.map((product) => `/fabrics/${product.familySlug}/${product.slug}`),
    '/shades',
    ...shades.map((shade) => `/shades/${shade.slug}`),
    '/applications',
    ...applications.map((application) => `/applications/${application.slug}`),
    '/material',
    '/about',
    '/wholesale',
    '/samples',
    '/samples/confirmation',
    '/contact',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
  ];
}

export const SITE = {
  name: 'BASIS INC.',
  tagline: 'Foundation fabrics for bridal construction',
  description: 'BASIS INC. supplies the fabrics a bridal gown is built on: Powermesh, Illusion Stretch Mesh, N58 Semi-Stretch Mesh, Shanel Lining and Bridal Tulle, in one Shade System.',
  url: 'https://basis-inc.web.app',
};
