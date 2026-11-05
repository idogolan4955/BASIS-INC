import data from './development-catalog.json';
import type { SpecField } from './catalog';
import type { CollectionView, Priority } from './development';

// The brand's consumer line from the owner's concept boards, typed. Used by
// the emulator seed, the production seed and the sample fixtures, so all
// three agree. Dossiers open at the idea stage and take their number from
// the DEV sequence in the order they are listed.

export interface DevelopmentCatalogCategory {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly parent: string | null;
  readonly sort: number;
  readonly specSchema: readonly SpecField[];
}

export interface DevelopmentCatalogCollection {
  readonly code: string;
  readonly name: string;
  readonly season: string;
  readonly year: number | null;
  readonly theme: string;
  readonly targetLaunch: string | null;
  readonly status: CollectionView['status'];
}

export interface DevelopmentCatalogProduct {
  /** Stable across seeds, so a renamed dossier is never seeded twice. */
  readonly id: string;
  readonly name: string;
  readonly workingTitle: string;
  readonly category: string;
  readonly collection: string | null;
  readonly priority: Priority;
  readonly description: string;
  readonly intent: string;
  readonly specs: Readonly<Record<string, string>>;
  readonly materials: readonly { readonly role: string; readonly name: string; readonly specification: string; readonly notes: string }[];
  readonly variants: readonly { readonly code: string; readonly name: string; readonly colourHex: string | null; readonly colourName: string; readonly sizeLabel: string; readonly dimensions: Readonly<Record<string, string>> }[];
  readonly packaging: readonly { readonly component: string; readonly specification: string; readonly material: string; readonly dimensions: Readonly<Record<string, string>> }[];
}

export const DEVELOPMENT_CATALOG: {
  readonly categories: readonly DevelopmentCatalogCategory[];
  readonly collections: readonly DevelopmentCatalogCollection[];
  readonly products: readonly DevelopmentCatalogProduct[];
} = data as never;
