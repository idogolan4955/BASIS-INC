// Read models for the Gateway. Every value here is derived from facts recorded
// in the modules; nothing on the Gateway is entered by hand.
// Quantities travel as stored fixed-point strings (see quantity.ts).

import type { ModuleKey } from './access';
import type { LocalDate } from './local-date';
import type { AlertSeverity, Health, StatusTone } from './status';

export interface GatewayFigures {
  readonly orders: {
    readonly count: number;
    readonly periodLabel: string;
    readonly changePercent: number;
    readonly comparedTo: string;
    /** Orders per week, oldest first. */
    readonly weekly: readonly number[];
  };
  readonly production: {
    readonly activeRuns: number;
    readonly onSchedule: number;
  };
  readonly transit: {
    readonly shipments: number;
    readonly metres: string;
    /** Progress of each shipment in transit, 0 to 1. */
    readonly progress: readonly number[];
  };
  readonly inventory: {
    readonly rolls: number;
    readonly byFamily: readonly { readonly code: string; readonly name: string; readonly rolls: number }[];
  };
  readonly quality: {
    readonly firstPassPercent: number;
    readonly inspections: number;
    readonly windowLabel: string;
    /** First-pass rate per month, oldest first. */
    readonly monthly: readonly number[];
  };
}

export interface AttentionItem {
  readonly id: string;
  /** An alert raised by a rule, or a task someone owes. */
  readonly kind: 'alert' | 'task';
  readonly state: 'open' | 'acknowledged';
  readonly severity: AlertSeverity;
  readonly module: ModuleKey;
  readonly title: string;
  /** The record the alert is about: its business number and where it opens. */
  readonly subject: string;
  readonly path: string;
  readonly detail: string;
  readonly owner: string;
}

export type MilestoneViewState = 'done' | 'active' | 'pending' | 'blocked';

export interface MilestoneView {
  readonly key: string;
  readonly name: string;
  readonly state: MilestoneViewState;
  readonly plannedEnd: LocalDate;
  /** Present when the current expectation differs from the plan. */
  readonly forecastEnd?: LocalDate;
  readonly actualEnd?: LocalDate;
}

export interface RunTimeline {
  readonly number: string;
  readonly path: string;
  readonly product: string;
  readonly shade: string;
  readonly metres: string;
  readonly health: Health;
  readonly exFactory: LocalDate;
  readonly milestones: readonly MilestoneView[];
}

export type ShipmentStage = 'booked' | 'in_transit' | 'arrived' | 'customs' | 'delivered';

export const SHIPMENT_STAGE_LABEL: Record<ShipmentStage, string> = {
  booked: 'Booked',
  in_transit: 'In transit',
  arrived: 'Arrived',
  customs: 'In customs',
  delivered: 'Delivered',
};

export const SHIPMENT_STAGE_TONE: Record<ShipmentStage, StatusTone> = {
  booked: 'neutral',
  in_transit: 'transit',
  arrived: 'transit',
  customs: 'caution',
  delivered: 'positive',
};

export interface ShipmentLane {
  readonly number: string;
  readonly path: string;
  readonly mode: string;
  readonly origin: { readonly code: string; readonly name: string };
  readonly destination: { readonly code: string; readonly name: string };
  readonly stage: ShipmentStage;
  readonly health: Health;
  readonly etd: LocalDate;
  readonly eta: LocalDate;
  /** Position along the route, 0 to 1, derived from leg actuals. */
  readonly progress: number;
}

export type OrderStage = 'confirmed' | 'in_production' | 'shipped' | 'delivered';

export const ORDER_STAGE_LABEL: Record<OrderStage, string> = {
  confirmed: 'Confirmed',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

export const ORDER_STAGE_TONE: Record<OrderStage, StatusTone> = {
  confirmed: 'neutral',
  in_production: 'transit',
  shipped: 'transit',
  delivered: 'positive',
};

export interface OrderRow {
  readonly number: string;
  readonly path: string;
  readonly customer: string;
  readonly fabric: string;
  readonly metres: string;
  /** Share of the ordered quantity produced and released, 0 to 1. */
  readonly fulfilment: number;
  readonly shipDate: LocalDate;
  readonly stage: OrderStage;
}

export type FabricStructure = 'mesh' | 'lining' | 'tulle';

export interface FabricFamilyCard {
  readonly code: string;
  readonly name: string;
  readonly path: string;
  readonly structure: FabricStructure;
  readonly products: number;
  readonly skus: number;
}

export interface GatewayData {
  readonly asOf: LocalDate;
  readonly figures: GatewayFigures;
  readonly attention: readonly AttentionItem[];
  readonly runs: readonly RunTimeline[];
  readonly shipments: readonly ShipmentLane[];
  readonly orders: readonly OrderRow[];
  readonly families: readonly FabricFamilyCard[];
}
