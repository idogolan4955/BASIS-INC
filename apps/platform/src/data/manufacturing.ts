import {
  FUNCTION_NAMES,
  isLocalDate,
  runProgress,
  type Health,
  type LocalDate,
  type MilestoneRecord,
  type MilestoneState,
  type ProcessTemplateView,
  type PurchaseOrderCosts,
  type PurchaseOrderDetail,
  type PurchaseOrderSummary,
  type RunDetail,
  type RunSummary,
} from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Purchasing and manufacturing data. Reads map the connector onto the view
// models; commands go through the manufacturing functions.

async function sample() {
  return (await import('./sample-manufacturing')).sampleManufacturing;
}

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);
const sum = (values: readonly string[]) => values.reduce((total, value) => total + BigInt(value), 0n).toString();

type MilestoneRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  sequence: number;
  dependsOnKey?: string | null;
  gate: 'none' | 'approval' | 'inspection';
  plannedStart: string;
  plannedEnd: string;
  forecastEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  state: MilestoneState;
  delayReason?: string | null;
  note?: string | null;
};

function milestoneRecord(row: MilestoneRow): MilestoneRecord {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    category: row.category,
    sequence: row.sequence,
    dependsOnKey: row.dependsOnKey ?? null,
    gate: row.gate,
    state: row.state,
    plannedStart: row.plannedStart as LocalDate,
    plannedEnd: row.plannedEnd as LocalDate,
    forecastEnd: asDate(row.forecastEnd),
    actualStart: asDate(row.actualStart),
    actualEnd: asDate(row.actualEnd),
    delayReason: row.delayReason ?? '',
    note: row.note ?? '',
  };
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['manufacturing', 'purchase-orders'],
    queryFn: async (): Promise<PurchaseOrderSummary[]> => {
      if (isSample) return (await sample()).purchaseOrders();
      const { dc, sdk } = await live();
      const { data } = await sdk.listPurchaseOrders(dc);
      return data.purchaseOrders.map((po) => ({
        id: po.id,
        number: po.number,
        state: po.state,
        supplierId: po.supplier.id,
        supplierName: po.supplier.tradingName || po.supplier.legalName,
        factoryName: po.factory?.location.name ?? '',
        currency: po.currency,
        issuedOn: asDate(po.issuedOn),
        requestedExFactory: asDate(po.requestedExFactory),
        totalQuantity: sum(po.purchaseOrderLines_on_purchaseOrder.map((line) => line.quantity)),
        lineCount: po.purchaseOrderLines_on_purchaseOrder.length,
        products: [...new Set(po.purchaseOrderLines_on_purchaseOrder.map((line) => line.sku.product.name))],
        runs: po.productionRuns_on_purchaseOrder.map((run) => ({ number: run.number, state: run.state, health: run.health })),
        createdAt: po.createdAt,
      }));
    },
  });
}

export function usePurchaseOrder(number: string) {
  return useQuery({
    queryKey: ['manufacturing', 'purchase-order', number],
    queryFn: async (): Promise<PurchaseOrderDetail | null> => {
      if (isSample) return (await sample()).purchaseOrder(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getPurchaseOrder(dc, { number });
      const po = data.purchaseOrders[0];
      if (!po) return null;
      const lines = po.purchaseOrderLines_on_purchaseOrder.map((line) => ({
        id: line.id,
        lineNo: line.lineNo,
        skuCode: line.sku.code,
        productCode: line.sku.product.code,
        productName: line.sku.product.name,
        variantName: line.sku.variant.name,
        shadeCode: line.sku.shade.code,
        shadeName: line.sku.shade.name,
        shadeHex: line.sku.shade.hex ?? '#CCCCCC',
        quantity: line.quantity,
        uom: line.uom,
        overTolerancePercent: line.overTolerancePercent ?? null,
        underTolerancePercent: line.underTolerancePercent ?? null,
        requestedExFactory: asDate(line.requestedExFactory),
      }));
      return {
        id: po.id,
        number: po.number,
        state: po.state,
        supplierId: po.supplier.id,
        supplierName: po.supplier.tradingName || po.supplier.legalName,
        factoryName: po.factory ? `${po.factory.location.name}${po.factory.location.city ? `, ${po.factory.location.city}` : ''}` : '',
        currency: po.currency,
        issuedOn: asDate(po.issuedOn),
        requestedExFactory: asDate(po.requestedExFactory),
        totalQuantity: sum(lines.map((line) => line.quantity)),
        lineCount: lines.length,
        products: [...new Set(lines.map((line) => line.productName))],
        runs: po.productionRuns_on_purchaseOrder.map((run) => ({ number: run.number, state: run.state, health: run.health })),
        createdAt: po.createdAt,
        legalEntityName: po.legalEntity?.name ?? '',
        incoterm: po.incoterm?.code ?? '',
        namedPlace: po.namedPlace ?? '',
        paymentTerms: po.paymentTerms ?? '',
        confirmedOn: asDate(po.confirmedOn),
        notes: po.notes ?? '',
        version: po.version,
        lines,
        runDetails: po.productionRuns_on_purchaseOrder.map((run) => ({
          number: run.number,
          state: run.state,
          health: run.health,
          plannedEnd: run.plannedEnd as LocalDate,
          forecastEnd: asDate(run.forecastEnd),
        })),
      };
    },
  });
}

export function usePurchaseOrderCosts(number: string, enabled: boolean) {
  return useQuery({
    queryKey: ['manufacturing', 'purchase-order-costs', number],
    enabled,
    queryFn: async (): Promise<PurchaseOrderCosts | null> => {
      if (isSample) return (await sample()).purchaseOrderCosts(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getPurchaseOrderCosts(dc, { number });
      const po = data.purchaseOrders[0];
      if (!po) return null;
      return {
        currency: po.currency,
        lines: po.purchaseOrderLines_on_purchaseOrder.map((line) => ({ id: line.id, lineNo: line.lineNo, quantity: line.quantity, unitPrice: line.unitPrice })),
        payments: po.paymentMilestones_on_purchaseOrder.map((payment) => ({
          id: payment.id,
          label: payment.label,
          percent: payment.percent ?? null,
          amount: payment.amount ?? null,
          trigger: payment.trigger as PurchaseOrderCosts['payments'][number]['trigger'],
          dueOn: asDate(payment.dueOn),
          paidOn: asDate(payment.paidOn),
          paidAmount: payment.paidAmount ?? null,
          reference: payment.reference ?? '',
        })),
      };
    },
  });
}

export function useProductionRuns() {
  return useQuery({
    queryKey: ['manufacturing', 'runs'],
    queryFn: async (): Promise<RunSummary[]> => {
      if (isSample) return (await sample()).runs();
      const { dc, sdk } = await live();
      const { data } = await sdk.listProductionRuns(dc);
      return data.productionRuns.map((run) => {
        const milestones = run.productionMilestones_on_run.map(milestoneRecord);
        return {
          id: run.id,
          number: run.number,
          state: run.state,
          health: run.health as Health,
          purchaseOrderNumber: run.purchaseOrder.number,
          supplierName: run.purchaseOrder.supplier.tradingName || run.purchaseOrder.supplier.legalName,
          factoryName: run.factory?.location.name ?? '',
          templateName: run.templateName ?? '',
          plannedStart: run.plannedStart as LocalDate,
          plannedEnd: run.plannedEnd as LocalDate,
          forecastEnd: asDate(run.forecastEnd),
          actualEnd: asDate(run.actualEnd),
          products: [...new Set(run.productionRunLines_on_run.map((line) => `${line.purchaseOrderLine.sku.product.name}, ${line.purchaseOrderLine.sku.shade.name}`))],
          totalQuantity: sum(run.productionRunLines_on_run.map((line) => line.plannedQuantity)),
          progress: runProgress(milestones),
          milestones,
        };
      });
    },
  });
}

export function useProductionRun(number: string) {
  return useQuery({
    queryKey: ['manufacturing', 'run', number],
    queryFn: async (): Promise<RunDetail | null> => {
      if (isSample) return (await sample()).run(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getProductionRun(dc, { number });
      const run = data.productionRuns[0];
      if (!run) return null;
      const milestones = run.productionMilestones_on_run.map(milestoneRecord);
      const lines = run.productionRunLines_on_run.map((line) => ({
        id: line.id,
        skuCode: line.purchaseOrderLine.sku.code,
        productName: line.purchaseOrderLine.sku.product.name,
        variantName: line.purchaseOrderLine.sku.variant.name,
        shadeCode: line.purchaseOrderLine.sku.shade.code,
        shadeName: line.purchaseOrderLine.sku.shade.name,
        shadeHex: line.purchaseOrderLine.sku.shade.hex ?? '#CCCCCC',
        plannedQuantity: line.plannedQuantity,
        producedQuantity: line.producedQuantity,
        uom: line.purchaseOrderLine.uom,
      }));
      return {
        id: run.id,
        number: run.number,
        state: run.state,
        health: run.health as Health,
        purchaseOrderNumber: run.purchaseOrder.number,
        purchaseOrderState: run.purchaseOrder.state,
        supplierId: run.purchaseOrder.supplier.id,
        supplierName: run.purchaseOrder.supplier.tradingName || run.purchaseOrder.supplier.legalName,
        factoryName: run.factory ? `${run.factory.location.name}${run.factory.location.city ? `, ${run.factory.location.city}` : ''}` : '',
        templateName: run.templateName ?? '',
        plannedStart: run.plannedStart as LocalDate,
        plannedEnd: run.plannedEnd as LocalDate,
        forecastEnd: asDate(run.forecastEnd),
        actualEnd: asDate(run.actualEnd),
        notes: run.notes ?? '',
        products: [...new Set(lines.map((line) => `${line.productName}, ${line.shadeName}`))],
        totalQuantity: sum(lines.map((line) => line.plannedQuantity)),
        progress: runProgress(milestones),
        milestones,
        lines,
        lots: run.lots_on_run.map((lot) => ({
          id: lot.id,
          number: lot.number,
          skuCode: lot.sku.code,
          millLotRef: lot.millLotRef ?? '',
          producedQuantity: lot.producedQuantity,
          producedOn: asDate(lot.producedOn),
          qualityState: lot.qualityState,
        })),
      };
    },
  });
}

export function useProcessTemplates() {
  return useQuery({
    queryKey: ['manufacturing', 'templates'],
    queryFn: async (): Promise<ProcessTemplateView[]> => {
      if (isSample) return (await sample()).templates();
      const { dc, sdk } = await live();
      const { data } = await sdk.listProcessTemplates(dc);
      return data.processTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        familyCode: template.family?.code ?? '',
        familyName: template.family?.name ?? 'Any family',
        supplierName: template.supplier ? template.supplier.tradingName || template.supplier.legalName : '',
        isDefault: template.isDefault,
        steps: template.processTemplateSteps_on_template.map((step) => ({
          key: step.key,
          name: step.name,
          category: step.category,
          sequence: step.sequence,
          durationDays: step.durationDays,
          dependsOnKey: step.dependsOnKey ?? null,
          gate: step.gate,
        })),
      }));
    },
  });
}

// ---------------------------------------------------------------- commands

export interface NewPurchaseOrderInput {
  supplierId: string;
  factoryId?: string;
  currency: string;
  incotermCode?: string;
  namedPlace?: string;
  paymentTerms?: string;
  requestedExFactory?: string;
  notes?: string;
  depositPercent: number;
  lines: { skuCode: string; quantity: string; uom: string; unitPrice: string; overTolerancePercent?: number; underTolerancePercent?: number }[];
}

function invalidateManufacturing(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['manufacturing'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
}

export function useCreatePurchaseOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewPurchaseOrderInput): Promise<string> => {
      if (isSample) return (await sample()).createPurchaseOrder(input);
      const result = await callFunction<NewPurchaseOrderInput, { number: string }>(FUNCTION_NAMES.createPurchaseOrder, input);
      return result.number;
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}

function useTransition(name: 'issuePurchaseOrder' | 'confirmPurchaseOrder' | 'cancelPurchaseOrder') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { number: string; reason?: string }): Promise<void> => {
      if (isSample) {
        await (await sample()).transition(name, input.number, input.reason);
        return;
      }
      await callFunction(FUNCTION_NAMES[name], input);
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}

export const useIssuePurchaseOrder = () => useTransition('issuePurchaseOrder');
export const useConfirmPurchaseOrder = () => useTransition('confirmPurchaseOrder');
export const useCancelPurchaseOrder = () => useTransition('cancelPurchaseOrder');

export interface NewRunInput {
  purchaseOrderNumber: string;
  templateId?: string;
  plannedStart: string;
  factoryId?: string;
  notes?: string;
}

export function useCreateProductionRun() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewRunInput): Promise<string> => {
      if (isSample) return (await sample()).createRun(input);
      const result = await callFunction<NewRunInput, { number: string }>(FUNCTION_NAMES.createProductionRun, input);
      return result.number;
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}

export interface MilestoneUpdateInput {
  runNumber: string;
  milestoneId: string;
  state?: MilestoneState;
  forecastEnd?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  delayReason?: string | null;
  note?: string | null;
}

export function useUpdateMilestone() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: MilestoneUpdateInput): Promise<void> => {
      if (isSample) {
        await (await sample()).updateMilestone(input);
        return;
      }
      await callFunction(FUNCTION_NAMES.updateMilestone, input);
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}
