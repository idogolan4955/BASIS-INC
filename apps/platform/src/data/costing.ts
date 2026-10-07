import { FUNCTION_NAMES, type AllocationRules, type AllocationRunView, type CostCategory, type CostKind, type CustomsEntryView, type CustomsState, type FxRateView, type LotCostView, type ShipmentCostView } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Costing data: what a shipment cost, its customs entry, the allocation runs
// and every lot's landed cost. Shipment costs are for the logistics cost
// roles; landed costs carry purchase prices and are for the cost roles only.
// The connector enforces both; the hooks are called only where allowed.

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-costing')).sampleCosting;

export interface ShipmentCosting {
  readonly costs: readonly ShipmentCostView[];
  readonly customs: CustomsEntryView | null;
  readonly runs: readonly { id: string; version: number; kind: 'estimate' | 'final'; baseCurrency: string; rules: AllocationRules; totalBase: string; performedAt: string }[];
}

type CostRow = { id: string; category: CostCategory; kind: CostKind; amount: string; currency: string; fxRateToBase: string; amountBase: string; invoiceRef?: string | null; invoiceDate?: string | null; isRecoverable: boolean; note?: string | null; vendor?: { legalName: string; tradingName?: string | null } | null };
const costView = (row: CostRow): ShipmentCostView => ({ id: row.id, category: row.category, kind: row.kind, amount: row.amount, currency: row.currency, fxRateToBase: row.fxRateToBase, amountBase: row.amountBase, vendorName: row.vendor ? row.vendor.tradingName || row.vendor.legalName : '', invoiceRef: row.invoiceRef ?? '', invoiceDate: row.invoiceDate ?? null, isRecoverable: row.isRecoverable, note: row.note ?? '' });

type CustomsRow = { id: string; entryNumber?: string | null; declaredValue?: string | null; declaredCurrency?: string | null; duties?: string | null; taxes?: string | null; state: CustomsState; submittedOn?: string | null; clearedOn?: string | null; note?: string | null; country?: { code: string; name: string } | null; broker?: { legalName: string; tradingName?: string | null } | null };
const customsView = (row: CustomsRow): CustomsEntryView => ({ id: row.id, countryCode: row.country?.code ?? '', countryName: row.country?.name ?? '', brokerName: row.broker ? row.broker.tradingName || row.broker.legalName : '', entryNumber: row.entryNumber ?? '', declaredValue: row.declaredValue ?? null, declaredCurrency: row.declaredCurrency ?? '', duties: row.duties ?? null, taxes: row.taxes ?? null, state: row.state, submittedOn: row.submittedOn ?? null, clearedOn: row.clearedOn ?? null, note: row.note ?? '' });

export function useShipmentCosts(number: string, enabled: boolean) {
  return useQuery({
    queryKey: ['costing', 'shipment', number],
    enabled,
    queryFn: async (): Promise<ShipmentCosting | null> => {
      if (isSample) return (await sample()).shipmentCosts(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getShipmentCosts(dc, { number });
      const row = data.shipments[0];
      if (!row) return null;
      return {
        costs: row.shipmentCosts_on_shipment.map((cost) => costView(cost as CostRow)),
        customs: row.customsEntries_on_shipment[0] ? customsView(row.customsEntries_on_shipment[0] as CustomsRow) : null,
        runs: row.costAllocationRuns_on_shipment.map((run) => ({ id: run.id, version: run.version, kind: run.kind, baseCurrency: run.baseCurrency, rules: run.rules as AllocationRules, totalBase: run.totalBase, performedAt: run.performedAt })),
      };
    },
  });
}

export function useAllocationRun(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['costing', 'run', id],
    enabled: enabled && Boolean(id),
    queryFn: async (): Promise<AllocationRunView | null> => {
      if (!id) return null;
      if (isSample) return (await sample()).allocationRun(id);
      const { dc, sdk } = await live();
      const { data } = await sdk.getAllocationRun(dc, { id });
      const run = data.costAllocationRun;
      if (!run) return null;
      const lines = new Map<string, { lineId: string; lotNumber: string; skuCode: string; quantity: string; byCategory: Record<string, bigint>; allocatedBase: bigint }>();
      for (const line of run.costAllocationLines_on_run) {
        const key = line.shipmentLine.id;
        const current = lines.get(key) ?? { lineId: key, lotNumber: line.shipmentLine.lot.number, skuCode: line.shipmentLine.lot.sku.code, quantity: line.shipmentLine.quantity, byCategory: {}, allocatedBase: 0n };
        current.byCategory[line.shipmentCost.category] = (current.byCategory[line.shipmentCost.category] ?? 0n) + BigInt(line.amountBase);
        current.allocatedBase += BigInt(line.amountBase);
        lines.set(key, current);
      }
      const lotCost = new Map(run.lotCosts_on_run.map((cost) => [cost.lot.number, cost]));
      return {
        id: run.id,
        version: run.version,
        kind: run.kind,
        baseCurrency: run.baseCurrency,
        rules: run.rules as AllocationRules,
        performedByName: '',
        performedAt: run.performedAt,
        totalBase: run.totalBase,
        lines: [...lines.values()].map((line) => ({
          lineId: line.lineId,
          lotNumber: line.lotNumber,
          skuCode: line.skuCode,
          quantity: line.quantity,
          valueBase: '0',
          byCategory: Object.fromEntries(Object.entries(line.byCategory).map(([category, amount]) => [category, amount.toString()])) as Partial<Record<CostCategory, string>>,
          allocatedBase: line.allocatedBase.toString(),
          landedUnitCostBase: lotCost.get(line.lotNumber)?.landedUnitCost ?? '0',
          purchaseUnitCostBase: lotCost.get(line.lotNumber)?.purchaseUnitCost ?? '0',
        })),
      };
    },
  });
}

type LotCostRow = { id: string; version: number; currency: string; quantity: string; purchaseUnitCost: string; allocated?: unknown; allocatedUnit: string; landedUnitCost: string; isFinal: boolean; computedAt: string; lot: { number: string; sku: { code: string; product: { name: string }; shade: { name: string } } }; shipment?: { number: string } | null };
const lotCostView = (row: LotCostRow): LotCostView => ({ id: row.id, lotNumber: row.lot.number, skuCode: row.lot.sku.code, productName: row.lot.sku.product.name, shadeName: row.lot.sku.shade.name, shipmentNumber: row.shipment?.number ?? '', version: row.version, currency: row.currency, quantity: row.quantity, purchaseUnitCost: row.purchaseUnitCost, allocated: (row.allocated ?? {}) as Partial<Record<CostCategory, string>>, allocatedUnit: row.allocatedUnit, landedUnitCost: row.landedUnitCost, isFinal: row.isFinal, computedAt: row.computedAt });

export function useLotCosts(enabled = true) {
  return useQuery({
    queryKey: ['costing', 'lots'],
    enabled,
    queryFn: async (): Promise<LotCostView[]> => {
      if (isSample) return (await sample()).lotCosts();
      const { dc, sdk } = await live();
      const { data } = await sdk.listLotCosts(dc);
      return data.lotCosts.map((row) => lotCostView(row as LotCostRow));
    },
  });
}

export function useLotCostsFor(lotNumber: string, enabled: boolean) {
  return useQuery({
    queryKey: ['costing', 'lot', lotNumber],
    enabled,
    queryFn: async (): Promise<LotCostView[]> => {
      if (isSample) return (await sample()).lotCosts().then((all) => all.filter((cost) => cost.lotNumber === lotNumber));
      const { dc, sdk } = await live();
      const { data } = await sdk.listLotCostsFor(dc, { lotNumber });
      return data.lotCosts.map((row) => lotCostView(row as LotCostRow));
    },
  });
}

export function useFxRates() {
  return useQuery({
    queryKey: ['costing', 'fx'],
    queryFn: async (): Promise<FxRateView[]> => {
      if (isSample) return (await sample()).fxRates();
      const { dc, sdk } = await live();
      const { data } = await sdk.listFxRates(dc);
      return data.fxRates.map((row) => ({ id: row.id, base: row.base, quote: row.quote, rateDate: row.rateDate, rate: row.rate, source: row.source ?? '' }));
    },
  });
}

// ---------------------------------------------------------------- commands

export interface CostInput { number: string; id?: string; remove?: boolean; category?: CostCategory; kind?: CostKind; amount?: string; currency?: string; fxRateToBase?: string; vendorId?: string | null; invoiceRef?: string | null; invoiceDate?: string | null; isRecoverable?: boolean; note?: string | null }
export interface CustomsInput { number: string; state: CustomsState; countryCode?: string | null; brokerId?: string | null; entryNumber?: string | null; declaredValue?: string | null; declaredCurrency?: string | null; duties?: string | null; taxes?: string | null; submittedOn?: string | null; clearedOn?: string | null; note?: string | null }
export interface FxInput { base: string; quote: string; rateDate: string; rate: string; source?: string }
export interface AllocateInput { number: string; kind: 'estimate' | 'final'; rules?: Partial<AllocationRules> }

function invalidate(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['costing'] }), client.invalidateQueries({ queryKey: ['logistics'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
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

export const useRecordShipmentCost = command<CostInput, { number: string }>('recordShipmentCost', async (input) => (await sample()).recordCost(input));
export const useRecordCustomsEntry = command<CustomsInput, { number: string; state: CustomsState }>('recordCustomsEntry', async (input) => (await sample()).recordCustoms(input));
export const useSetFxRate = command<FxInput, { rate: string }>('setFxRate', async (input) => (await sample()).setFxRate(input));
export const useAllocateCosts = command<AllocateInput, { runId: string; version: number; kind: string; totalBase: string }>('allocateShipmentCosts', async (input) => (await sample()).allocate(input));
