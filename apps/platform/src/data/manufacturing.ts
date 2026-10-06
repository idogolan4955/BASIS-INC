import {
  FUNCTION_NAMES,
  availableToShip,
  cubicMetresMilli,
  isLocalDate,
  lotQuantities,
  runProgress,
  type HandlingUnitContentView,
  type HandlingUnitKind,
  type HandlingUnitView,
  type Health,
  type LocalDate,
  type LotDetail,
  type LotQualityState,
  type LotView,
  type MilestoneRecord,
  type MilestoneState,
  type ProcessTemplateView,
  type PurchaseOrderCosts,
  type PurchaseOrderDetail,
  type PurchaseOrderSummary,
  type PutUpFacts,
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

type PutUpRow = { rollLengthM: number; rollsPerCarton?: number | null; cartonLengthCm?: number | null; cartonWidthCm?: number | null; cartonHeightCm?: number | null } | null | undefined;
const putUpFacts = (row: PutUpRow): PutUpFacts | null =>
  row ? { rollLengthM: row.rollLengthM, rollsPerCarton: row.rollsPerCarton ?? null, cartonLengthCm: row.cartonLengthCm ?? null, cartonWidthCm: row.cartonWidthCm ?? null, cartonHeightCm: row.cartonHeightCm ?? null } : null;

type LotRow = {
  id: string;
  number: string;
  millLotRef?: string | null;
  producedQuantity: string;
  producedOn?: string | null;
  qualityState: LotQualityState;
  sku: { code: string; rollTracking: boolean; product: { name: string }; variant: { name: string }; shade: { code: string; name: string; hex?: string | null }; putUp: NonNullable<PutUpRow> };
  rolls_on_lot: { id: string; number: string; rollNo: number; measuredLength: string; usableWidthCm?: number | null; weightG?: number | null; grade?: string | null; defectPoints?: number | null; handlingUnitContents_on_roll: { handlingUnit: { number: string } }[] }[];
  handlingUnitContents_on_lot: { quantity?: string | null; handlingUnit: { number: string } }[];
};

function lotView(row: LotRow): LotView {
  const rolls = row.rolls_on_lot.map((roll) => ({
    id: roll.id,
    number: roll.number,
    rollNo: roll.rollNo,
    measuredLength: roll.measuredLength,
    usableWidthCm: roll.usableWidthCm ?? null,
    weightG: roll.weightG ?? null,
    grade: roll.grade ?? '',
    defectPoints: roll.defectPoints ?? null,
    packedIn: roll.handlingUnitContents_on_roll[0]?.handlingUnit.number ?? null,
  }));
  return {
    id: row.id,
    number: row.number,
    skuCode: row.sku.code,
    productName: row.sku.product.name,
    variantName: row.sku.variant.name,
    shadeCode: row.sku.shade.code,
    shadeName: row.sku.shade.name,
    shadeHex: row.sku.shade.hex ?? '#CCCCCC',
    rollTracking: row.sku.rollTracking,
    putUp: putUpFacts(row.sku.putUp),
    millLotRef: row.millLotRef ?? '',
    producedQuantity: row.producedQuantity,
    producedOn: asDate(row.producedOn),
    qualityState: row.qualityState,
    ...lotQuantities(rolls, row.handlingUnitContents_on_lot.map((content) => content.quantity ?? '0')),
    rolls,
  };
}

type HandlingUnitRow = {
  id: string;
  number: string;
  kind: HandlingUnitKind;
  marks?: string | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  grossWeightG?: number | null;
  netWeightG?: number | null;
  packedOn?: string | null;
  parent?: { number: string } | null;
  handlingUnitContents_on_handlingUnit: { quantity?: string | null; roll?: { number: string; measuredLength: string; lot: { number: string; sku: { code: string } } } | null; lot?: { number: string; sku: { code: string } } | null }[];
};

function handlingUnitView(row: HandlingUnitRow): HandlingUnitView {
  const contents: HandlingUnitContentView[] = [];
  for (const content of row.handlingUnitContents_on_handlingUnit) {
    if (content.roll) contents.push({ rollNumber: content.roll.number, lotNumber: content.roll.lot.number, skuCode: content.roll.lot.sku.code, quantity: content.roll.measuredLength });
    else if (content.lot) contents.push({ rollNumber: null, lotNumber: content.lot.number, skuCode: content.lot.sku.code, quantity: content.quantity ?? '0' });
  }
  return {
    id: row.id,
    number: row.number,
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
    quantity: sum(contents.map((content) => content.quantity)),
    cbmMilli: cubicMetresMilli(row.lengthCm ?? null, row.widthCm ?? null, row.heightCm ?? null),
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
        rollTracking: line.purchaseOrderLine.sku.rollTracking,
        putUp: putUpFacts(line.purchaseOrderLine.sku.putUp),
      }));
      const lots = run.lots_on_run.map(lotView);
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
        lots,
        handlingUnits: run.handlingUnits_on_run.map(handlingUnitView),
        availableToShip: availableToShip(lots),
      };
    },
  });
}

export function useLot(number: string) {
  return useQuery({
    queryKey: ['manufacturing', 'lot', number],
    queryFn: async (): Promise<LotDetail | null> => {
      if (isSample) return (await sample()).lot(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getLot(dc, { number });
      const lot = data.lots[0];
      if (!lot) return null;
      return {
        ...lotView(lot),
        runNumber: lot.run.number,
        purchaseOrderNumber: lot.run.purchaseOrder.number,
        supplierName: lot.run.purchaseOrder.supplier.tradingName || lot.run.purchaseOrder.supplier.legalName,
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

export interface NewLotInput {
  runNumber: string;
  skuCode: string;
  millLotRef?: string;
  producedOn?: string;
  producedQuantity?: string;
  rolls?: { measuredLength: string; usableWidthCm?: number; weightG?: number; grade?: string; defectPoints?: number }[];
}

export function useRecordLot() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewLotInput): Promise<string> => {
      if (isSample) return (await sample()).recordLot(input);
      const result = await callFunction<NewLotInput, { number: string }>(FUNCTION_NAMES.recordLot, input);
      return result.number;
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}

export interface PackInput {
  runNumber: string;
  kind: 'carton' | 'pallet';
  rollNumbers: string[];
  loose?: { lotNumber: string; quantity: string }[];
  marks?: string;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  grossWeightG?: number;
  netWeightG?: number;
  packedOn?: string;
  parentNumber?: string;
}

export function usePackHandlingUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: PackInput): Promise<string> => {
      if (isSample) return (await sample()).pack(input);
      const result = await callFunction<PackInput, { number: string }>(FUNCTION_NAMES.packHandlingUnit, input);
      return result.number;
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}

export function useSetLotQuality() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { number: string; state: LotQualityState; note: string }): Promise<void> => {
      if (isSample) {
        await (await sample()).setLotQuality(input);
        return;
      }
      await callFunction(FUNCTION_NAMES.setLotQuality, input);
    },
    onSuccess: () => invalidateManufacturing(client),
  });
}
