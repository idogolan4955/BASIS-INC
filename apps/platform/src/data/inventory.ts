import { FUNCTION_NAMES, isLocalDate, receiptCheck, type LocalDate, type ManualMovement, type MovementReason, type MovementView, type ReceiptView, type ReorderPolicyView, type StockBalanceView, type StockLocationKind, type StockLocationView } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Inventory data: places, balances, the movement ledger, receipts and
// reorder points. Balances are read as the functions wrote them from the
// ledger; nothing here is edited.

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-inventory')).sampleInventory;

type MovementRow = { id: string; quantity: string; reason: MovementReason; sourceType?: string | null; sourceId?: string | null; note?: string | null; occurredAt: string; actorUid?: string | null; sku: { code: string }; lot: { number: string }; roll?: { number: string } | null; fromLocation?: { id: string; name: string } | null; toLocation?: { id: string; name: string } | null };
const movementView = (row: MovementRow): MovementView => ({ id: row.id, skuCode: row.sku.code, lotNumber: row.lot.number, rollNumber: row.roll?.number ?? null, quantity: row.quantity, fromLocationId: row.fromLocation?.id ?? null, toLocationId: row.toLocation?.id ?? null, reason: row.reason, fromLocationName: row.fromLocation?.name ?? '', toLocationName: row.toLocation?.name ?? '', sourceType: row.sourceType ?? '', sourceId: row.sourceId ?? '', note: row.note ?? '', occurredAt: row.occurredAt, actorName: '' });

export function useStockLocations() {
  return useQuery({
    queryKey: ['inventory', 'locations'],
    queryFn: async (): Promise<StockLocationView[]> => {
      if (isSample) return (await sample()).locations();
      const { dc, sdk } = await live();
      const { data } = await sdk.listStockLocations(dc);
      return data.stockLocations.map((row) => ({ id: row.id, name: row.name, kind: row.kind as StockLocationKind, zone: row.zone ?? '', placeName: row.place ? row.place.city || row.place.name : '', isDefault: row.isDefault }));
    },
  });
}

export function useStockBalances() {
  return useQuery({
    queryKey: ['inventory', 'balances'],
    queryFn: async (): Promise<StockBalanceView[]> => {
      if (isSample) return (await sample()).balances();
      const { dc, sdk } = await live();
      const { data } = await sdk.listStockBalances(dc);
      return data.stockBalances.map((row) => ({ id: row.id, skuCode: row.sku.code, lotNumber: row.lot.number, locationId: row.location.id, onHand: row.onHand, locationName: row.location.name, locationKind: row.location.kind as StockLocationKind, productName: row.sku.product.name, variantName: row.sku.variant.name, shadeCode: row.sku.shade.code, shadeName: row.sku.shade.name, shadeHex: row.sku.shade.hex ?? '#CCCCCC', familyCode: row.sku.product.family.code, familyName: row.sku.product.family.name, rolls: row.rolls, updatedAt: row.updatedAt }));
    },
  });
}

export function useMovements(lotNumber?: string, limit = 200) {
  return useQuery({
    queryKey: ['inventory', 'movements', lotNumber ?? 'all', limit],
    queryFn: async (): Promise<MovementView[]> => {
      if (isSample) return (await sample()).movements(lotNumber);
      const { dc, sdk } = await live();
      if (lotNumber) {
        const { data } = await sdk.listStockMovements(dc, { lotNumber, limit });
        return data.stockMovements.map((row) => movementView(row as MovementRow));
      }
      const { data } = await sdk.listRecentMovements(dc, { limit });
      return data.stockMovements.map((row) => movementView(row as MovementRow));
    },
  });
}

export function useReceipts() {
  return useQuery({
    queryKey: ['inventory', 'receipts'],
    queryFn: async (): Promise<ReceiptView[]> => {
      if (isSample) return (await sample()).receipts();
      const { dc, sdk } = await live();
      const { data } = await sdk.listReceipts(dc);
      return data.receipts.map((row) => {
        const lines = row.receiptLines_on_receipt.map((line) => ({ lotNumber: line.lot.number, skuCode: line.lot.sku.code, expected: line.expectedQuantity, received: line.receivedQuantity, rollsExpected: line.rollsExpected, rollsReceived: line.rollsReceived, note: line.note ?? '' }));
        const off = receiptCheck(lines.map((line, index) => ({ shipmentLineId: String(index), lotNumber: line.lotNumber, expected: line.expected, received: line.received }))).filter((check) => check.short || check.over).length;
        return { id: row.id, number: row.number, shipmentNumber: row.shipment.number, locationName: row.location.name, receivedOn: row.receivedOn as LocalDate, receivedByName: '', note: row.note ?? '', lines, discrepancies: off, createdAt: row.createdAt };
      });
    },
  });
}

export function useReorderPolicies() {
  return useQuery({
    queryKey: ['inventory', 'reorder'],
    queryFn: async (): Promise<ReorderPolicyView[]> => {
      if (isSample) return (await sample()).reorderPolicies();
      const { dc, sdk } = await live();
      const { data } = await sdk.listReorderPolicies(dc);
      return data.reorderPolicies.map((row) => ({ id: row.id, skuCode: row.sku.code, reorderPoint: row.reorderPoint, targetLevel: row.targetLevel, productName: row.sku.product.name, shadeName: row.sku.shade.name, locationName: row.location?.name ?? '' }));
    },
  });
}

export interface RollPosition {
  readonly number: string;
  readonly remainingLength: string | null;
  readonly locationId: string | null;
  readonly locationName: string;
}

export function useRollPositions(lotNumber: string) {
  return useQuery({
    queryKey: ['inventory', 'rolls', lotNumber],
    queryFn: async (): Promise<RollPosition[]> => {
      if (isSample) return (await sample()).rollPositions(lotNumber);
      const { dc, sdk } = await live();
      const { data } = await sdk.listRollPositions(dc, { lotNumber });
      return data.rolls.map((row) => ({ number: row.number, remainingLength: row.remainingLength ?? null, locationId: row.stockLocation?.id ?? null, locationName: row.stockLocation?.name ?? '' }));
    },
  });
}

export { asDate };

// ---------------------------------------------------------------- commands

export interface NewLocationInput { name: string; kind?: StockLocationKind; placeId?: string; zone?: string; isDefault?: boolean }
export interface ReceiveInput { number: string; locationId: string; receivedOn?: string; note?: string; lines: { shipmentLineId: string; receivedQuantity?: string; rollNumbers?: string[]; note?: string }[] }
export interface MovementInput { kind: ManualMovement; lotNumber: string; rollNumber?: string; quantity?: string; fromLocationId?: string; toLocationId?: string; note: string }
export interface ReorderInput { skuCode: string; locationId?: string | null; reorderPoint: string; targetLevel: string }

function invalidate(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['inventory'] }), client.invalidateQueries({ queryKey: ['logistics'] }), client.invalidateQueries({ queryKey: ['manufacturing'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['operations'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
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

export const useCreateStockLocation = command<NewLocationInput, { id: string }>('createStockLocation', async (input) => (await sample()).createLocation(input));
export const useReceiveShipment = command<ReceiveInput, { receipt: string; received: string; rolls: number; discrepancies: number; closed: boolean }>('receiveShipment', async (input) => (await sample()).receive(input));
export const useRecordMovement = command<MovementInput, { lotNumber: string; quantity: string }>('recordStockMovement', async (input) => (await sample()).move(input));
export const useSetReorderPolicy = command<ReorderInput, { skuCode: string }>('setReorderPolicy', async (input) => (await sample()).setReorder(input));
