import { calendarFrom, isLocalDate, lotQuantities, pipelineFrom, todayIn, type CalendarEntry, type LocalDate, type OperationsRun, type OperationsShipment, type OperationsTask, type PipelineCell, type ShipmentSummary } from '@basis/shared';
import { useQuery } from '@tanstack/react-query';
import { isSample } from './source';
import { loadOpenTasks } from './tasks';

// Operations: the pipeline and the calendar, derived in the browser from the
// facts the connector (or the sample store) returns.

const asDate = (value: string | null | undefined): LocalDate | null => (value && isLocalDate(value) ? value : null);
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export interface OperationsView {
  readonly asOf: LocalDate;
  readonly runs: readonly OperationsRun[];
  readonly pipeline: readonly PipelineCell[];
  readonly calendar: readonly CalendarEntry[];
}

async function sampleRuns(): Promise<OperationsRun[]> {
  const { sampleManufacturing } = await import('./sample-manufacturing');
  const runs = await sampleManufacturing.runs();
  return Promise.all(
    runs
      .filter((run) => run.state === 'planned' || run.state === 'active')
      .map(async (run) => {
        const [detail, po, costs] = await Promise.all([sampleManufacturing.run(run.number), sampleManufacturing.purchaseOrder(run.purchaseOrderNumber), sampleManufacturing.purchaseOrderCosts(run.purchaseOrderNumber)]);
        return {
          number: run.number,
          state: run.state,
          health: run.health,
          plannedEnd: run.plannedEnd,
          forecastEnd: run.forecastEnd,
          products: run.products,
          supplierName: run.supplierName,
          purchaseOrderNumber: run.purchaseOrderNumber,
          requestedExFactory: po?.requestedExFactory ?? null,
          plannedQuantity: run.totalQuantity,
          milestones: run.milestones.map((milestone) => ({ key: milestone.key, name: milestone.name, state: milestone.state, plannedEnd: milestone.plannedEnd, forecastEnd: milestone.forecastEnd, actualEnd: milestone.actualEnd })),
          lots: (detail?.lots ?? []).map((lot) => ({ number: lot.number, qualityState: lot.qualityState, measuredQuantity: lot.measuredQuantity, packedQuantity: lot.packedQuantity, producedQuantity: lot.producedQuantity })),
          payments: (costs?.payments ?? []).map((payment) => ({ label: payment.label, dueOn: payment.dueOn, paidOn: payment.paidOn })),
        };
      }),
  );
}

async function liveRuns(): Promise<OperationsRun[]> {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  const { data } = await sdk.operationsFacts(dataConnect);
  return data.productionRuns.map((run) => ({
    number: run.number,
    state: run.state,
    health: run.health,
    plannedEnd: run.plannedEnd as LocalDate,
    forecastEnd: asDate(run.forecastEnd),
    products: [...new Set(run.productionRunLines_on_run.map((line) => `${line.purchaseOrderLine.sku.product.name}, ${line.purchaseOrderLine.sku.shade.name}`))],
    supplierName: run.purchaseOrder.supplier.tradingName || run.purchaseOrder.supplier.legalName,
    purchaseOrderNumber: run.purchaseOrder.number,
    requestedExFactory: asDate(run.purchaseOrder.requestedExFactory),
    plannedQuantity: run.productionRunLines_on_run.reduce((sum, line) => sum + BigInt(line.plannedQuantity), 0n).toString(),
    milestones: run.productionMilestones_on_run.map((milestone) => ({ key: milestone.key, name: milestone.name, state: milestone.state, plannedEnd: milestone.plannedEnd as LocalDate, forecastEnd: asDate(milestone.forecastEnd), actualEnd: asDate(milestone.actualEnd) })),
    lots: run.lots_on_run.map((lot) => {
      const facts = lotQuantities(
        lot.rolls_on_lot.map((roll) => ({ measuredLength: roll.measuredLength, packedIn: roll.handlingUnitContents_on_roll[0]?.handlingUnit.number ?? null })),
        lot.handlingUnitContents_on_lot.map((content) => content.quantity ?? '0'),
      );
      return { number: lot.number, qualityState: lot.qualityState, measuredQuantity: facts.measuredQuantity, packedQuantity: facts.packedQuantity, producedQuantity: lot.producedQuantity };
    }),
    payments: run.purchaseOrder.paymentMilestones_on_purchaseOrder.map((payment) => ({ label: payment.label, dueOn: asDate(payment.dueOn), paidOn: asDate(payment.paidOn) })),
  }));
}

const shipmentFacts = (shipment: ShipmentSummary): OperationsShipment => ({ number: shipment.number, stage: shipment.stage, health: shipment.health, metres: shipment.totals.metres, etd: shipment.etd, eta: shipment.eta, plannedEta: shipment.plannedEta, originName: shipment.originName, destinationName: shipment.destinationName });

/** Booked shipments, as the pipeline and the calendar read them. */
export async function loadShipmentFacts(): Promise<OperationsShipment[]> {
  if (isSample) return (await (await import('./sample-logistics')).sampleLogistics.shipments()).filter((shipment) => shipment.state === 'booked').map(shipmentFacts);
  const [{ dataConnect }, sdk, { summaryOf }] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform'), import('./logistics')]);
  const { data } = await sdk.listShipments(dataConnect);
  const today = todayIn(zone());
  return data.shipments.filter((shipment) => shipment.state === 'booked').map((row) => shipmentFacts(summaryOf(row as never, today)));
}

export async function loadOperations(): Promise<OperationsView> {
  const asOf = todayIn(zone());
  const [runs, tasks, shipments] = await Promise.all([isSample ? sampleRuns() : liveRuns(), loadOpenTasks(), loadShipmentFacts()]);
  const taskFacts: OperationsTask[] = tasks.map((task) => ({ id: task.id, title: task.title, dueOn: task.dueOn, entityType: task.entityType ?? '', entityId: task.entityId ?? '', assigneeName: task.assigneeName ?? '' }));
  return { asOf, runs, pipeline: pipelineFrom(runs, shipments), calendar: calendarFrom(runs, taskFacts, asOf, 30, shipments) };
}

export function useOperations() {
  return useQuery({ queryKey: ['operations'], queryFn: loadOperations, staleTime: 60_000 });
}
