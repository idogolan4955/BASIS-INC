import { FUNCTION_NAMES, isLocalDate, type ActionState, type CheckCategory, type CheckKind, type CheckOutcome, type Disposition, type InspectionResult, type InspectionState, type InspectionType, type LocalDate } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// Quality data: inspections, their checks, readings, defects and actions.
// Sample mode holds one signed-off and one running inspection in memory.

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);

export interface InspectionSummary {
  readonly id: string;
  readonly number: string;
  readonly type: InspectionType;
  readonly state: InspectionState;
  readonly entityType: string;
  readonly entityId: string;
  readonly templateName: string;
  readonly subjectTitle: string;
  readonly shadeHex: string | null;
  readonly supplierName: string;
  readonly runNumber: string | null;
  readonly inspectorName: string;
  readonly location: string;
  readonly scheduledOn: LocalDate | null;
  readonly performedOn: LocalDate | null;
  readonly result: InspectionResult | null;
  readonly disposition: Disposition | null;
  readonly createdAt: string;
}

export interface CheckView {
  readonly id: string;
  readonly key: string;
  readonly sequence: number;
  readonly category: CheckCategory;
  readonly parameter: string;
  readonly method: string;
  readonly kind: CheckKind;
  readonly unit: string;
  readonly expected: string | null;
  readonly toleranceMinus: string | null;
  readonly tolerancePlus: string | null;
  readonly isCritical: boolean;
  readonly outcome: CheckOutcome;
  readonly measured: string | null;
  readonly note: string;
}

export interface ReadingView {
  readonly id: string;
  readonly rollNumber: string | null;
  readonly illuminant: string;
  readonly lStar: number;
  readonly aStar: number;
  readonly bStar: number;
  readonly deltaE: number;
  readonly visualGrade: string;
  readonly standardRef: string;
}

export interface DefectView {
  readonly id: string;
  readonly rollNumber: string | null;
  readonly type: string;
  readonly points: number;
  readonly positionM: string | null;
  readonly sizeCm: number | null;
  readonly note: string;
}

export interface InspectionDetail extends InspectionSummary {
  readonly samplingRule: string;
  readonly maxDefectPointsPer100m: number | null;
  readonly maxDeltaE: number | null;
  readonly sampleSize: string;
  readonly concession: string;
  readonly note: string;
  readonly lotNumber: string | null;
  readonly lotQuantity: string;
  readonly lotQualityState: string | null;
  readonly rolls: readonly { number: string; rollNo: number; measuredLength: string }[];
  readonly checks: readonly CheckView[];
  readonly readings: readonly ReadingView[];
  readonly defects: readonly DefectView[];
  readonly actions: readonly { number: string; title: string; state: ActionState; dueOn: LocalDate | null; ownerName: string }[];
}

export interface ActionView {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly rootCause: string;
  readonly action: string;
  readonly ownerName: string;
  readonly dueOn: LocalDate | null;
  readonly state: ActionState;
  readonly inspectionNumber: string | null;
  readonly lotNumber: string | null;
  readonly supplierName: string;
  readonly createdAt: string;
}

export interface TemplateView {
  readonly id: string;
  readonly name: string;
  readonly type: InspectionType;
  readonly familyName: string;
  readonly samplingRule: string;
  readonly maxDefectPointsPer100m: number | null;
  readonly maxDeltaE: number | null;
  readonly checks: readonly { key: string; category: CheckCategory; parameter: string; method: string; kind: CheckKind; unit: string; isCritical: boolean }[];
}

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

type Row = {
  id: string; number: string; type: InspectionType; state: InspectionState; entityType: string; entityId: string; inspectorName?: string | null; location?: string | null; scheduledOn?: string | null; performedOn?: string | null; result?: InspectionResult | null; disposition?: Disposition | null; createdAt: string;
  template?: { id: string; name: string } | null;
  lot?: { number: string; sku: { code: string; product: { name: string }; shade: { code: string; name: string; hex?: string | null } } } | null;
  run?: { number: string; purchaseOrder: { number: string; supplier: { tradingName?: string | null; legalName: string } } } | null;
};
function summary(row: Row): InspectionSummary {
  return {
    id: row.id, number: row.number, type: row.type, state: row.state, entityType: row.entityType, entityId: row.entityId,
    templateName: row.template?.name ?? '',
    subjectTitle: row.lot ? `${row.lot.sku.product.name}, ${row.lot.sku.shade.name}` : row.run ? row.run.number : row.entityId,
    shadeHex: row.lot?.sku.shade.hex ?? null,
    supplierName: row.run ? row.run.purchaseOrder.supplier.tradingName || row.run.purchaseOrder.supplier.legalName : '',
    runNumber: row.run?.number ?? null,
    inspectorName: row.inspectorName ?? '', location: row.location ?? '',
    scheduledOn: asDate(row.scheduledOn), performedOn: asDate(row.performedOn),
    result: row.result ?? null, disposition: row.disposition ?? null, createdAt: row.createdAt,
  };
}

export function useInspections() {
  return useQuery({
    queryKey: ['quality', 'inspections'],
    queryFn: async (): Promise<InspectionSummary[]> => {
      if (isSample) return (await import('./sample-quality')).sampleQuality.inspections();
      const { dc, sdk } = await live();
      const { data } = await sdk.listInspections(dc);
      return data.inspections.map((row) => summary(row as Row));
    },
  });
}

export function useInspectionsFor(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['quality', 'inspections', entityType, entityId],
    queryFn: async (): Promise<InspectionSummary[]> => {
      if (isSample) return (await (await import('./sample-quality')).sampleQuality.inspections()).filter((inspection) => inspection.entityType === entityType && inspection.entityId === entityId);
      const { dc, sdk } = await live();
      const { data } = await sdk.listInspectionsFor(dc, { entityType, entityId });
      return data.inspections.map((row) => summary(row as Row));
    },
  });
}

export function useInspection(number: string) {
  return useQuery({
    queryKey: ['quality', 'inspection', number],
    queryFn: async (): Promise<InspectionDetail | null> => {
      if (isSample) return (await import('./sample-quality')).sampleQuality.inspection(number);
      const { dc, sdk } = await live();
      const { data } = await sdk.getInspection(dc, { number });
      const row = data.inspections[0];
      if (!row) return null;
      return {
        ...summary(row as unknown as Row),
        samplingRule: row.template?.samplingRule ?? '',
        maxDefectPointsPer100m: row.template?.maxDefectPointsPer100m ?? null,
        maxDeltaE: row.template?.maxDeltaE ?? null,
        sampleSize: row.sampleSize ?? '',
        concession: row.concession ?? '',
        note: row.note ?? '',
        lotNumber: row.lot?.number ?? null,
        lotQuantity: row.lot?.producedQuantity ?? '0',
        lotQualityState: row.lot?.qualityState ?? null,
        rolls: (row.lot?.rolls_on_lot ?? []).map((roll) => ({ number: roll.number, rollNo: roll.rollNo, measuredLength: roll.measuredLength })),
        checks: row.inspectionChecks_on_inspection.map((check) => ({ id: check.id, key: check.key, sequence: check.sequence, category: check.category, parameter: check.parameter, method: check.method ?? '', kind: check.kind, unit: check.unit ?? '', expected: check.expected ?? null, toleranceMinus: check.toleranceMinus ?? null, tolerancePlus: check.tolerancePlus ?? null, isCritical: check.isCritical, outcome: check.outcome, measured: check.measured ?? null, note: check.note ?? '' })),
        readings: row.shadeReadings_on_inspection.map((reading) => ({ id: reading.id, rollNumber: reading.roll?.number ?? null, illuminant: reading.illuminant, lStar: reading.lStar, aStar: reading.aStar, bStar: reading.bStar, deltaE: reading.deltaE, visualGrade: reading.visualGrade ?? '', standardRef: reading.standardRef ?? '' })),
        defects: row.defects_on_inspection.map((defect) => ({ id: defect.id, rollNumber: defect.roll?.number ?? null, type: defect.type, points: defect.points, positionM: defect.positionM ?? null, sizeCm: defect.sizeCm ?? null, note: defect.note ?? '' })),
        actions: row.correctiveActions_on_inspection.map((action) => ({ number: action.number, title: action.title, state: action.state, dueOn: asDate(action.dueOn), ownerName: action.ownerName ?? '' })),
      };
    },
  });
}

export function useCorrectiveActions() {
  return useQuery({
    queryKey: ['quality', 'actions'],
    queryFn: async (): Promise<ActionView[]> => {
      if (isSample) return (await import('./sample-quality')).sampleQuality.actions();
      const { dc, sdk } = await live();
      const { data } = await sdk.listCorrectiveActions(dc);
      return data.correctiveActions.map((row) => ({ id: row.id, number: row.number, title: row.title, description: row.description ?? '', rootCause: row.rootCause ?? '', action: row.action ?? '', ownerName: row.ownerName ?? '', dueOn: asDate(row.dueOn), state: row.state, inspectionNumber: row.inspection?.number ?? null, lotNumber: row.lot?.number ?? null, supplierName: row.supplier ? row.supplier.tradingName || row.supplier.legalName : '', createdAt: row.createdAt }));
    },
  });
}

export function useInspectionTemplates() {
  return useQuery({
    queryKey: ['quality', 'templates'],
    queryFn: async (): Promise<TemplateView[]> => {
      if (isSample) return (await import('./sample-quality')).sampleQuality.templates();
      const { dc, sdk } = await live();
      const { data } = await sdk.listInspectionTemplates(dc);
      return data.inspectionTemplates.map((row) => ({ id: row.id, name: row.name, type: row.type, familyName: row.family?.name ?? '', samplingRule: row.samplingRule ?? '', maxDefectPointsPer100m: row.maxDefectPointsPer100m ?? null, maxDeltaE: row.maxDeltaE ?? null, checks: row.inspectionTemplateChecks_on_template.map((check) => ({ key: check.key, category: check.category, parameter: check.parameter, method: check.method ?? '', kind: check.kind, unit: check.unit ?? '', isCritical: check.isCritical })) }));
    },
  });
}

function invalidate(client: ReturnType<typeof useQueryClient>) {
  return Promise.all([client.invalidateQueries({ queryKey: ['quality'] }), client.invalidateQueries({ queryKey: ['manufacturing'] }), client.invalidateQueries({ queryKey: ['gateway'] }), client.invalidateQueries({ queryKey: ['operations'] }), client.invalidateQueries({ queryKey: ['timeline'] })]);
}

export interface NewInspectionInput { type: InspectionType; subject: string; templateId?: string; scheduledOn?: string; location?: string; inspectorName?: string; sampleSize?: string }
export interface RecordInput {
  number: string; performedOn?: string; location?: string; sampleSize?: string; note?: string;
  checks?: { id: string; outcome?: CheckOutcome; measured?: string | null; note?: string | null }[];
  readings?: { rollNumber?: string; illuminant?: string; lStar: number; aStar: number; bStar: number; deltaE: number; visualGrade?: string; standardRef?: string }[];
  defects?: { rollNumber?: string; type: string; points: number; positionM?: string; sizeCm?: number; note?: string }[];
  removeReadings?: string[]; removeDefects?: string[];
}
export interface SignOffInput { number: string; disposition: Disposition; concession?: string; note?: string }
export interface NewActionInput { title: string; description?: string; inspectionNumber?: string; lotNumber?: string; ownerName?: string; dueOn?: string }
export interface ActionUpdate { number: string; state?: ActionState; rootCause?: string; action?: string; ownerName?: string; dueOn?: string | null; note?: string }

function command<TInput, TResult>(name: keyof typeof FUNCTION_NAMES, sampleCall: (input: TInput) => Promise<TResult>) {
  return function useCommand() {
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

const sample = async () => (await import('./sample-quality')).sampleQuality;
export const useCreateInspection = command<NewInspectionInput, { number: string }>('createInspection', async (input) => (await sample()).create(input));
export const useRecordInspection = command<RecordInput, { number: string; result: InspectionResult | null }>('recordInspection', async (input) => (await sample()).record(input));
export const useSubmitInspection = command<{ number: string }, { number: string; result: InspectionResult }>('submitInspection', async (input) => (await sample()).submit(input.number));
export const useSignOffInspection = command<SignOffInput, { number: string }>('signOffInspection', async (input) => (await sample()).signOff(input));
export const useCreateCorrectiveAction = command<NewActionInput, { number: string }>('createCorrectiveAction', async (input) => (await sample()).createAction(input));
export const useUpdateCorrectiveAction = command<ActionUpdate, { number: string }>('updateCorrectiveAction', async (input) => (await sample()).updateAction(input));
