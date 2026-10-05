import { MODULES, canOpenModule, type ModuleDefinition, type ModuleKey, type Role } from '@basis/shared';
import {
  Boat,
  Browser,
  Buildings,
  Calculator,
  ChartBar,
  Factory,
  Files,
  Handshake,
  Kanban,
  Megaphone,
  Package,
  Receipt,
  SealCheck,
  SlidersHorizontal,
  Swatches,
  type Icon,
} from '@phosphor-icons/react';

// The index rail: which modules sit together and which mark each carries.

export const MODULE_ICONS: Record<ModuleKey, Icon> = {
  operations: Kanban,
  products: Swatches,
  suppliers: Handshake,
  manufacturing: Factory,
  qc: SealCheck,
  inventory: Package,
  logistics: Boat,
  orders: Receipt,
  customers: Buildings,
  marketing: Megaphone,
  website: Browser,
  documents: Files,
  costing: Calculator,
  analytics: ChartBar,
  settings: SlidersHorizontal,
};

const GROUPS: readonly { readonly label: string; readonly keys: readonly ModuleKey[] }[] = [
  { label: 'Supply', keys: ['operations', 'products', 'suppliers', 'manufacturing', 'qc', 'inventory', 'logistics'] },
  { label: 'Commercial', keys: ['orders', 'customers', 'marketing', 'website'] },
  { label: 'Records', keys: ['documents', 'costing', 'analytics', 'settings'] },
];

export interface RailGroup {
  readonly label: string;
  readonly modules: readonly ModuleDefinition[];
}

export function railGroupsFor(role: Role): RailGroup[] {
  return GROUPS.map((group) => ({
    label: group.label,
    modules: group.keys
      .filter((key) => canOpenModule(role, key))
      .map((key) => MODULES.find((definition) => definition.key === key))
      .filter((definition): definition is ModuleDefinition => definition !== undefined),
  })).filter((group) => group.modules.length > 0);
}
