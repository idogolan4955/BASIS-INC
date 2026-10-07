import {
  FUNCTION_NAMES,
  cubicMetresMilli,
  isLocalDate,
  legStatus,
  forecastLegs,
  shipmentDates,
  shipmentProgress,
  shipmentStage,
  shipmentTotals,
  placeCode,
  todayIn,
  type DocumentRequirementRule,
  type HandlingUnitView,
  type Health,
  type LegView,
  type LoadType,
  type LocalDate,
  type PlaceOption,
  type ReferenceType,
  type ShipmentDetail,
  type ShipmentFlow,
  type ShipmentState,
  type ShipmentSummary,
  type TransportMode,
} from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Logistics data: shipments with their legs, lines and packages. Stage,
// progress and dates are derived here from the legs with the same rules the
// functions use; commands go through the logistics functions.

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

type PlaceRow = { name: string; city?: string | null; locationCode?: string | null; country?: { code: string } | null };
type LegRow = { id?: string; type: LegView['type']; sequence: number; mode?: TransportMode; vessel?: string | null; voyage?: string | null; plannedEtd?: string | null; plannedEta?: string | null; etd?: string | null; eta?: string | null; atd?: string | null; ata?: string | null; note?: string | null; fromLocation?: PlaceRow | null; toLocation?: PlaceRow | null; provider?: { legalName: string; tradingName?: string | null } | null };
type UnitRow = { id?: string; number?: string; kind: HandlingUnitView['kind']; marks?: string | null; lengthCm?: number | null; widthCm?: number | null; heightCm?: number | null; grossWeightG?: number | null; netWeightG?: number | null; packedOn?: string | null; parent?: { number: string } | null; run?: { number: string } | null; handlingUnitContents_on_handlingUnit: { quantity?: string | null; roll?: { number?: string; measuredLength: string; lot?: { number: string; sku: { code: string } } } | null; lot?: { number: string; sku: { code: string } } | null }[] };
type ShipmentRow = {
  id: string; number: string; flow: ShipmentFlow; mode: TransportMode; loadType: LoadType; state: ShipmentState; health: Health; namedPlace?: string | null; bookedOn?: string | null; createdAt: string;
  incoterm?: { code: string } | null; origin: PlaceRow & { id?: string }; destination: PlaceRow & { id?: string }; forwarder?: { id?: string; legalName: string; tradingName?: string | null } | null;
  shipmentLegs_on_shipment: LegRow[];
  shipmentLines_on_shipment: { id?: string; quantity: string; uom?: string; purchaseOrderLine: { lineNo?: number; purchaseOrder: { number: string }; sku: { code?: string; product: { name: string }; shade?: { code: string; name: string; hex?: string | null } } }; lot?: { number: string } }[];
  handlingUnits_on_shipment: UnitRow[];
};

function legFacts(row: LegRow) {
  return { type: row.type, sequence: row.sequence, plannedEtd: asDate(row.plannedEtd), plannedEta: asDate(row.plannedEta), etd: asDate(row.etd), eta: asDate(row.eta), atd: asDate(row.atd), ata: asDate(row.ata) };
}

export function unitView(row: UnitRow): HandlingUnitView & { runNumber: string } {
  const contents = row.handlingUnitContents_on_handlingUnit.flatMap((content) => {
    if (content.roll) return [{ rollNumber: content.roll.number ?? null, lotNumber: content.roll.lot?.number ?? '', skuCode: content.roll.lot?.sku.code ?? '', quantity: content.roll.measuredLength }];
    if (content.lot) return [{ rollNumber: null, lotNumber: content.lot.number, skuCode: content.lot.sku.code, quantity: content.quantity ?? '0' }];
    return [];
  });
  return {
    id: row.id ?? row.number ?? '',
    number: row.number ?? '',
    kind: row.kind,
    marks: row.marks ?? '',
    parentNumber: row.parent?.number ?? null,
    lengthCm: row.lengthCm ?? null,
    widthCm: row.widthCm ?? null,
    heightCm: row.heightCm ?? null,
    grossWeightG: row.grossWeightG ?? null,
    netWeightG: row.netWeightG ?? null,
    packedOn: asDate(row.packedOn),
    contents,
    quantity: contents.reduce((sum, content) => sum + BigInt(content.quantity), 0n).toString(),
    cbmMilli: cubicMetresMilli(row.lengthCm ?? null, row.widthCm ?? null, row.heightCm ?? null),
    runNumber: row.run?.number ?? '',
  };
}

const place = (row: PlaceRow) => ({ name: row.city || row.name, code: placeCode({ locationCode: row.locationCode ?? '', name: row.name, city: row.city ?? '' }) });

export function summaryOf(row: ShipmentRow, today: LocalDate): ShipmentSummary {
  const legs = row.shipmentLegs_on_shipment.map(legFacts);
  const dates = shipmentDates(legs);
  const origin = place(row.origin);
  const destination = place(row.destination);
  return {
    id: row.id,
    number: row.number,
    flow: row.flow,
    mode: row.mode,
    loadType: row.loadType,
    state: row.state,
    stage: shipmentStage(row.state, legs),
    health: row.health,
    incoterm: row.incoterm?.code ?? '',
    namedPlace: row.namedPlace ?? '',
    originName: origin.name,
    originCode: origin.code,
    destinationName: destination.name,
    destinationCode: destination.code,
    destinationCountry: row.destination.country?.code ?? null,
    forwarderName: row.forwarder ? row.forwarder.tradingName || row.forwarder.legalName : '',
    etd: dates.etd,
    eta: dates.eta,
    plannedEta: dates.plannedEta,
    progress: shipmentProgress(legs, today),
    totals: shipmentTotals(row.handlingUnits_on_shipment.map(unitView)),
    purchaseOrderNumbers: [...new Set(row.shipmentLines_on_shipment.map((line) => line.purchaseOrderLine.purchaseOrder.number))],
    products: [...new Set(row.shipmentLines_on_shipment.map((line) => line.purchaseOrderLine.sku.product.name))],
    bookedOn: asDate(row.bookedOn),
    createdAt: row.createdAt,
  };
}

export function detailOf(row: ShipmentRow & { notes?: string | null; consigneeName?: string | null; consignee?: { legalName: string; tradingName?: string | null } | null; shipmentReferences_on_shipment: { id: string; type: ReferenceType; value: string }[] }, today: LocalDate): ShipmentDetail {
  const summary = summaryOf(row, today);
  const forecast = forecastLegs(row.shipmentLegs_on_shipment.map((leg, index) => ({ ...legFacts(leg), index })));
  return {
    ...summary,
    originId: row.origin.id ?? '',
    destinationId: row.destination.id ?? '',
    forwarderId: row.forwarder?.id ?? '',
    consigneeName: row.consigneeName || (row.consignee ? row.consignee.tradingName || row.consignee.legalName : ''),
    notes: row.notes ?? '',
    legs: forecast.map((facts) => {
      const leg = row.shipmentLegs_on_shipment[facts.index]!;
      const from = leg.fromLocation ? place(leg.fromLocation) : null;
      const to = leg.toLocation ? place(leg.toLocation) : null;
      return {
        ...facts,
        id: leg.id ?? `${row.number}-${leg.sequence}`,
        mode: leg.mode ?? row.mode,
        fromName: from?.name ?? '',
        fromCode: from?.code ?? '',
        toName: to?.name ?? '',
        toCode: to?.code ?? '',
        providerName: leg.provider ? leg.provider.tradingName || leg.provider.legalName : '',
        vessel: leg.vessel ?? '',
        voyage: leg.voyage ?? '',
        note: leg.note ?? '',
      };
    }),
    lines: row.shipmentLines_on_shipment.map((line, index) => ({
      id: line.id ?? String(index),
      purchaseOrderNumber: line.purchaseOrderLine.purchaseOrder.number,
      purchaseOrderLineNo: line.purchaseOrderLine.lineNo ?? 0,
      lotNumber: line.lot?.number ?? '',
      skuCode: line.purchaseOrderLine.sku.code ?? '',
      productName: line.purchaseOrderLine.sku.product.name,
      shadeCode: line.purchaseOrderLine.sku.shade?.code ?? '',
      shadeName: line.purchaseOrderLine.sku.shade?.name ?? '',
      shadeHex: line.purchaseOrderLine.sku.shade?.hex ?? '#CCCCCC',
      quantity: line.quantity,
      uom: line.uom ?? 'm',
    })),
    units: row.handlingUnits_on_shipment.map(unitView),
    references: row.shipmentReferences_on_shipment.map((reference) => ({ id: reference.id, type: reference.type, value: reference.value })),
  };
}

export { legStatus };

// ---------------------------------------------------------------- reads

export function useShipments() {
  return useQuery({
    queryKey: ['logistics', 'shipments'],
    queryFn: async (): Promise<ShipmentSummary[]> => {
      if (isSample) return (await import('./sample-logistics')).sampleLogistics.shipments();
      const { dc, sdk } = await live();
      const { data } = await sdk.listShipments(dc);
      const today = todayIn(zone());
      return data.shipments.map((row) => summaryOf(row as ShipmentRow, today));
    },
  });
}

export function useShipment(number: string) {
  return useQuery({
    queryKey: ['logistics', 'shipment', number],
    queryFn: async (): Promise<ShipmentDetail | null> => {
      if (isSample) return (await import('./sample-logistics')).sampleLogistics.shipment(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getShipment(dc, { number });
      const row = data.shipments[0];
      return row ? detailOf(row as never, todayIn(zone())) : null;
    },
  });
}

export interface ShippableUnit extends HandlingUnitView {
  readonly runNumber: string;
  readonly purchaseOrderNumber: string;
  readonly supplierName: string;
  readonly products: readonly string[];
  readonly lots: readonly string[];
  /** Every lot inside is released. */
  readonly released: boolean;
}

/** Cartons and pallets packed and not yet on a shipment; those with an unreleased lot are shown but cannot go. */
export function useShippableUnits(enabled = true) {
  return useQuery({
    queryKey: ['logistics', 'shippable'],
    enabled,
    queryFn: async (): Promise<ShippableUnit[]> => {
      if (isSample) return (await import('./sample-logistics')).sampleLogistics.shippableUnits();
      const { dc, sdk } = await live();
      const { data } = await sdk.listShippableUnits(dc);
      return data.handlingUnits.map((row) => {
        const lots = row.handlingUnitContents_on_handlingUnit.map((content) => content.roll?.lot ?? content.lot).filter((lot): lot is NonNullable<typeof lot> => Boolean(lot));
        return {
          ...unitView(row as never),
          runNumber: row.run?.number ?? '',
          purchaseOrderNumber: row.run?.purchaseOrder.number ?? '',
          supplierName: row.run ? row.run.purchaseOrder.supplier.tradingName || row.run.purchaseOrder.supplier.legalName : '',
          products: [...new Set(lots.map((lot) => `${lot.sku.product.name}, ${lot.sku.shade.name}`))],
          lots: [...new Set(lots.map((lot) => lot.number))],
          released: lots.length > 0 && lots.every((lot) => lot.qualityState === 'released'),
        };
      });
    },
  });
}

export function usePlaces() {
  return useQuery({
    queryKey: ['logistics', 'places'],
    queryFn: async (): Promise<PlaceOption[]> => {
      if (isSample) return (await import('./sample-logistics')).sampleLogistics.places();
      const { dc, sdk } = await live();
      const { data } = await sdk.listLocations(dc);
      return data.locations.map((row) => ({ id: row.id, type: row.type, name: row.name, city: row.city ?? '', countryCode: row.country?.code ?? null, countryName: row.country?.name ?? '', locationCode: row.locationCode ?? '', companyName: row.company ? row.company.tradingName || row.company.legalName : '' }));
    },
  });
}

export interface RequirementView extends DocumentRequirementRule {
  readonly id: string;
  readonly destinationCountryName: string;
  readonly note: string;
}

export function useDocumentRequirements() {
  return useQuery({
    queryKey: ['logistics', 'requirements'],
    queryFn: async (): Promise<RequirementView[]> => {
      if (isSample) return (await import('./sample-logistics')).sampleLogistics.requirements();
      const { dc, sdk } = await live();
      const { data } = await sdk.listDocumentRequirements(dc);
      return data.documentRequirements.map((row) => ({ id: row.id, mode: (row.mode ?? null) as RequirementView['mode'], flow: (row.flow ?? null) as RequirementView['flow'], destinationCountry: row.destinationCountry?.code ?? null, destinationCountryName: row.destinationCountry?.name ?? '', documentKind: row.documentKind, daysBeforeEtd: row.daysBeforeEtd, note: row.note ?? '' }));
    },
  });
}

// ---------------------------------------------------------------- commands

export interface NewShipmentInput {
  flow: ShipmentFlow;
  mode: TransportMode;
  loadType: LoadType;
  incotermCode?: string;
  namedPlace?: string;
  originId: string;
  destinationId: string;
  forwarderId?: string;
  consigneeName?: string;
  notes?: string;
  departure?: string;
  legs?: { type: LegView['type']; plannedEtd: string; plannedEta: string }[];
}
export interface ShipmentDetailsInput { number: string; incotermCode?: string | null; namedPlace?: string | null; forwarderId?: string | null; consigneeName?: string | null; notes?: string | null; references?: { type: ReferenceType; value: string }[] }
export interface UnitsInput { number: string; unitNumbers: string[] }
export interface LegUpdateInput { number: string; legId: string; etd?: string | null; eta?: string | null; atd?: string | null; ata?: string | null; vessel?: string | null; voyage?: string | null; note?: string | null }

function invalidate(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['logistics'] }), client.invalidateQueries({ queryKey: ['manufacturing'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['operations'] }), client.invalidateQueries({ queryKey: ['timeline'] }), client.invalidateQueries({ queryKey: ['documents'] })]);
}

function command<TInput, TResult>(name: keyof typeof FUNCTION_NAMES, sampleCall: (input: TInput) => Promise<TResult>) {
  return () => {
    const client = useQueryClient();
    return useMutation({
      mutationFn: async (input: TInput): Promise<TResult> => {
        if (isSample) return sampleCall(input);
        return callFunction<TInput, TResult>(FUNCTION_NAMES[name], input);
      },
      onSuccess: () => invalidate(client),
    });
  };
}

const sample = async () => (await import('./sample-logistics')).sampleLogistics;

export const useCreateShipment = command<NewShipmentInput, { number: string }>('createShipment', async (input) => (await sample()).createShipment(input));
export const useUpdateShipment = command<ShipmentDetailsInput, { number: string }>('updateShipment', async (input) => (await sample()).updateShipment(input));
export const useAssignUnits = command<UnitsInput, { number: string; assigned: number }>('assignHandlingUnits', async (input) => (await sample()).assignUnits(input));
export const useRemoveUnits = command<UnitsInput, { number: string; removed: number }>('removeHandlingUnits', async (input) => (await sample()).removeUnits(input));
export const useBookShipment = command<{ number: string }, { number: string; state: string }>('bookShipment', async (input) => (await sample()).book(input.number));
export const useCancelShipment = command<{ number: string; reason?: string }, { number: string; state: string }>('cancelShipment', async (input) => (await sample()).cancel(input.number));
export const useUpdateLeg = command<LegUpdateInput, { number: string; health: Health; stage: string }>('updateLeg', async (input) => (await sample()).updateLeg(input));
