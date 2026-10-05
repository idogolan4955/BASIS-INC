import data from './launch-catalog.json';
import type { SpecField } from './catalog';

// The launch range from the brand booklet, typed. Used by the emulator seed,
// the first production seed and the sample fixtures, so all three agree.

export interface LaunchShade {
  readonly code: string;
  readonly collection: string;
  readonly name: string;
  readonly slug: string;
  readonly hex: string;
  readonly sort: number;
}

export interface LaunchFamily {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly sort: number;
  readonly description: string;
  readonly specSchema: readonly SpecField[];
}

export interface LaunchProduct {
  readonly code: string;
  readonly family: string;
  readonly index: number;
  readonly name: string;
  readonly slug: string;
  readonly tagline: string;
  readonly description: string;
  readonly specs: Readonly<Record<string, string>>;
}

export interface LaunchVariant {
  readonly product: string;
  readonly code: string;
  readonly name: string;
  readonly widthCm: number;
}

export interface LaunchPutUp {
  readonly code: string;
  readonly name: string;
  readonly rollLengthM: number;
  readonly widthCm: number;
  readonly core: string;
  readonly wrap: string;
  readonly rollsPerCarton: number | null;
}

export const LAUNCH_CATALOG: {
  readonly putUps: readonly LaunchPutUp[];
  readonly shadeCollections: readonly { readonly code: string; readonly name: string; readonly sort: number }[];
  readonly shades: readonly LaunchShade[];
  readonly families: readonly LaunchFamily[];
  readonly products: readonly LaunchProduct[];
  readonly variants: readonly LaunchVariant[];
} = data as never;
