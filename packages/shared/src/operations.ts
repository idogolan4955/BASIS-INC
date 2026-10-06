import { addDays, daysBetween, type LocalDate } from './local-date';
import { availableToShip, lotQuantities, runProgress, type LotQualityState, type MilestoneFacts, type RunState } from './manufacturing';
import type { Health } from './status';

// Operations: the pipeline of goods as one strip, and the calendar of dates
// that are coming. Both are derived from runs, lots, payments and tasks;
// nothing here is a status anyone sets.

export const PIPELINE_STAGES = ['in_production', 'in_qc', 'ready_to_ship', 'in_transit', 'in_customs', 'in_stock'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  in_production: 'In production',
  in_qc: 'In QC',
  ready_to_ship: 'Ready to ship',
  in_transit: 'In transit',
  in_customs: 'In customs',
  in_stock: 'In stock',
};

export interface PipelineCell {
  readonly stage: PipelineStage;
  /** Fixed-point metres. */
  readonly metres: string;
  readonly records: number;
  /** Which modules feed it; `pending` while that module has not landed. */
  readonly pending?: boolean;
}

export interface OperationsRun {
  readonly number: string;
  readonly state: RunState;
  readonly health: Health;
  readonly plannedEnd: LocalDate;
  readonly forecastEnd: LocalDate | null;
  readonly products: readonly string[];
  readonly supplierName: string;
  readonly purchaseOrderNumber: string;
  readonly requestedExFactory: LocalDate | null;
  /** Planned metres across lines. */
  readonly plannedQuantity: string;
  readonly milestones: readonly (MilestoneFacts & { readonly name: string })[];
  readonly lots: readonly { readonly number: string; readonly qualityState: LotQualityState; readonly measuredQuantity: string; readonly packedQuantity: string; readonly producedQuantity: string }[];
  readonly payments: readonly { readonly label: string; readonly dueOn: LocalDate | null; readonly paidOn: LocalDate | null }[];
}

export interface OperationsTask {
  readonly id: string;
  readonly title: string;
  readonly dueOn: LocalDate | null;
  readonly entityType: string;
  readonly entityId: string;
  readonly assigneeName: string;
}

/**
 * What is where, in metres: planned metres still in production, lots awaiting
 * quality, released metres already packed. Transit, customs and stock arrive
 * with the logistics and inventory modules and are reported as pending.
 */
export function pipelineFrom(runs: readonly OperationsRun[]): PipelineCell[] {
  let production = 0n;
  let productionRuns = 0;
  let qc = 0n;
  let qcLots = 0;
  let ready = 0n;
  let readyLots = 0;
  for (const run of runs) {
    if (run.state !== 'planned' && run.state !== 'active') continue;
    const readyHere = BigInt(availableToShip(run.lots));
    const produced = run.lots.reduce((sum, lot) => sum + BigInt(lot.producedQuantity), 0n);
    const planned = BigInt(run.plannedQuantity);
    const stillInProduction = planned > produced ? planned - produced : 0n;
    if (stillInProduction > 0n) {
      production += stillInProduction;
      productionRuns += 1;
    }
    for (const lot of run.lots) {
      if (lot.qualityState === 'pending' || lot.qualityState === 'on_hold') {
        qc += BigInt(lot.measuredQuantity !== '0' ? lot.measuredQuantity : lot.producedQuantity);
        qcLots += 1;
      }
      if (lot.qualityState === 'released' && lot.packedQuantity !== '0') readyLots += 1;
    }
    ready += readyHere;
  }
  return [
    { stage: 'in_production', metres: production.toString(), records: productionRuns },
    { stage: 'in_qc', metres: qc.toString(), records: qcLots },
    { stage: 'ready_to_ship', metres: ready.toString(), records: readyLots },
    { stage: 'in_transit', metres: '0', records: 0, pending: true },
    { stage: 'in_customs', metres: '0', records: 0, pending: true },
    { stage: 'in_stock', metres: '0', records: 0, pending: true },
  ];
}

export type CalendarKind = 'milestone' | 'run_end' | 'ex_factory' | 'payment' | 'task';

export interface CalendarEntry {
  readonly date: LocalDate;
  readonly kind: CalendarKind;
  readonly title: string;
  readonly detail: string;
  readonly entityType: string;
  readonly entityId: string;
  /** The date is already behind today. */
  readonly overdue: boolean;
  /** The date moved from where it was planned. */
  readonly moved: boolean;
}

const expected = (milestone: MilestoneFacts) => milestone.actualEnd ?? milestone.forecastEnd ?? milestone.plannedEnd;

/** Every date that falls within the horizon, soonest first; overdue open items lead. */
export function calendarFrom(runs: readonly OperationsRun[], tasks: readonly OperationsTask[], today: LocalDate, horizonDays = 30): CalendarEntry[] {
  const until = addDays(today, horizonDays);
  const within = (date: LocalDate) => daysBetween(date, until) >= 0;
  const entries: CalendarEntry[] = [];
  for (const run of runs) {
    if (run.state !== 'planned' && run.state !== 'active') continue;
    for (const milestone of run.milestones) {
      if (milestone.state === 'done' || milestone.state === 'skipped') continue;
      const date = expected(milestone);
      if (!within(date)) continue;
      entries.push({
        date,
        kind: 'milestone',
        title: `${milestone.name} · ${run.number}`,
        detail: `${run.products[0] ?? ''}${run.products.length > 1 ? ` +${run.products.length - 1}` : ''}, ${run.supplierName}`,
        entityType: 'production_run',
        entityId: run.number,
        overdue: daysBetween(date, today) > 0,
        moved: Boolean(milestone.forecastEnd && milestone.forecastEnd !== milestone.plannedEnd),
      });
    }
    if (run.requestedExFactory && within(run.requestedExFactory)) {
      entries.push({ date: run.requestedExFactory, kind: 'ex_factory', title: `Requested ex-factory · ${run.purchaseOrderNumber}`, detail: run.supplierName, entityType: 'purchase_order', entityId: run.purchaseOrderNumber, overdue: daysBetween(run.requestedExFactory, today) > 0, moved: false });
    }
    for (const payment of run.payments) {
      if (!payment.dueOn || payment.paidOn || !within(payment.dueOn)) continue;
      entries.push({ date: payment.dueOn, kind: 'payment', title: `${payment.label} · ${run.purchaseOrderNumber}`, detail: run.supplierName, entityType: 'purchase_order', entityId: run.purchaseOrderNumber, overdue: daysBetween(payment.dueOn, today) > 0, moved: false });
    }
  }
  for (const task of tasks) {
    if (!task.dueOn || !within(task.dueOn)) continue;
    entries.push({ date: task.dueOn, kind: 'task', title: task.title, detail: task.assigneeName || 'Unassigned', entityType: task.entityType || 'task', entityId: task.entityId || task.id, overdue: daysBetween(task.dueOn, today) > 0, moved: false });
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Days of the rail with what falls on each, for the next `horizonDays`. */
export function railFrom(entries: readonly CalendarEntry[], today: LocalDate, horizonDays = 30): { date: LocalDate; count: number; overdue: boolean }[] {
  const days = Array.from({ length: horizonDays + 1 }, (_, offset) => addDays(today, offset));
  return days.map((date) => ({ date, count: entries.filter((entry) => entry.date === date).length, overdue: false }));
}

export { lotQuantities, runProgress };
