import { ROLE_LABELS, daysBetween, entityPath, formatLocalDate, isRole, moduleForEntity, todayIn, type AttentionItem, type GatewayData, type ShipmentLane } from '@basis/shared';
import { sampleDecisions } from './alerts';
import { loadOpenTasks } from './tasks';
import { daysBetween as between, type RunTimeline } from '@basis/shared';
import { useQuery } from '@tanstack/react-query';

// Where screens get their data. `vite --mode sample` serves typed sample
// records so the interface can be reviewed without a backend; the sample module
// is never part of a production build. Every other mode reads the Data Connect
// platform connector, which is wired in with the data foundation.

export const isSample = import.meta.env.MODE === 'sample';

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Live mode reads what the foundation records so far: open alerts and the
// date. Figures, runs, shipments and orders fill in as their modules land and
// show their true empty states until then.
async function loadLiveGateway(): Promise<GatewayData> {
  const [{ dataConnect }, { listOpenAlerts }, tasks] = await Promise.all([
    import('../lib/firebase'),
    import('@basis/shared/dataconnect/platform'),
    loadOpenTasks(),
  ]);
  const [{ data }, runRows, lanes, stock, orderFacts] = await Promise.all([listOpenAlerts(dataConnect), loadLiveRuns(), loadLanes(), loadStockFigure(), loadOrderFacts()]);
  const today = todayIn(zone());
  const openRuns = runRows.filter((run) => run.state === 'planned' || run.state === 'active');
  const runs: RunTimeline[] = openRuns
    .filter((run) => run.state === 'active' || between(today, run.plannedStart) <= 14)
    .sort((a, b) => String(a.forecastEnd ?? a.plannedEnd).localeCompare(String(b.forecastEnd ?? b.plannedEnd)))
    .slice(0, 4)
    .map((run) => ({
      number: run.number,
      path: `/manufacturing/runs/${run.number}`,
      product: run.products[0]?.split(',')[0] ?? run.templateName,
      shade: run.products.length > 1 ? `${run.products.length} lines` : (run.products[0]?.split(', ')[1] ?? ''),
      metres: run.totalQuantity,
      health: run.health,
      exFactory: run.forecastEnd ?? run.plannedEnd,
      milestones: run.milestones.map((milestone) => ({
        key: milestone.key,
        name: milestone.name,
        state: milestone.state === 'done' || milestone.state === 'skipped' ? 'done' : milestone.state === 'in_progress' ? 'active' : milestone.state === 'blocked' ? 'blocked' : 'pending',
        plannedEnd: milestone.plannedEnd,
        ...(milestone.forecastEnd ? { forecastEnd: milestone.forecastEnd } : {}),
        ...(milestone.actualEnd ? { actualEnd: milestone.actualEnd } : {}),
      })),
    }));
  // Tasks join the attention ledger when they are due within a week or late.
  const dueTasks: AttentionItem[] = tasks
    .filter((task) => task.dueOn && daysBetween(today, task.dueOn) <= 7)
    .map((task) => {
      const late = task.dueOn ? daysBetween(task.dueOn, today) : 0;
      return {
        id: task.id,
        kind: 'task',
        state: 'open',
        severity: late > 7 ? 'critical' : late > 0 ? 'caution' : 'info',
        module: task.entityType ? moduleForEntity(task.entityType) : 'operations',
        title: task.title,
        subject: task.entityId || 'Task',
        path: task.entityId ? entityPath(task.entityType, task.entityId) : '/operations/tasks',
        detail: task.dueOn ? (late > 0 ? `${late} day${late === 1 ? '' : 's'} overdue` : late === 0 ? 'Due today' : `Due ${formatLocalDate(task.dueOn)}`) : '',
        owner: task.assigneeName,
      };
    });
  return {
    asOf: today,
    figures: {
      orders: orderFacts.figure,
      production: { activeRuns: openRuns.length, onSchedule: openRuns.filter((run) => run.health === 'on_track').length },
      transit: lanes.transit,
      inventory: stock,
      quality: { firstPassPercent: 0, inspections: 0, windowLabel: 'last 90 days', monthly: [] },
    },
    attention: [
      ...data.alerts.map<AttentionItem>((alert) => ({
      id: alert.id,
      kind: 'alert',
      state: alert.state === 'acknowledged' ? 'acknowledged' : 'open',
      severity: alert.severity,
      module: moduleForEntity(alert.entityType),
      title: alert.title,
      subject: alert.entityId,
      path: entityPath(alert.entityType, alert.entityId),
      detail: alert.detail ?? '',
      owner: isRole(alert.ownerRole) ? ROLE_LABELS[alert.ownerRole] : '',
      })),
      ...dueTasks,
    ],
    runs,
    shipments: lanes.shipments,
    orders: orderFacts.recent,
    families: [],
  };
}

// Orders confirmed in the last 30 days against the 30 before, by week, and the five most recent.
async function loadOrderFacts(): Promise<{ figure: GatewayData['figures']['orders']; recent: GatewayData['orders'] }> {
  const today = todayIn(zone());
  const orders = import.meta.env.MODE === 'sample'
    ? await (await import('./sample-commercial')).sampleCommercial.orders()
    : await (async () => {
        const [{ dataConnect }, sdk, { orderSummary }] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform'), import('./commercial')]);
        const { data } = await sdk.listSalesOrders(dataConnect);
        return data.salesOrders.map((row) => orderSummary(row as never));
      })();
  const live = orders.filter((order) => order.state !== 'draft' && order.state !== 'cancelled');
  const age = (order: (typeof live)[number]) => (order.confirmedOn ? between(order.confirmedOn, today) : between(order.createdAt.slice(0, 10) as never, today));
  const recent30 = live.filter((order) => age(order) <= 30).length;
  const previous30 = live.filter((order) => age(order) > 30 && age(order) <= 60).length;
  const weekly = Array.from({ length: 12 }, (_, index) => live.filter((order) => Math.floor(age(order) / 7) === 11 - index).length);
  const stageOf = (order: (typeof live)[number]): GatewayData['orders'][number]['stage'] => (order.state === 'closed' || order.stage === 'delivered' ? 'delivered' : order.stage === 'shipped' ? 'shipped' : order.stage === 'allocated' || order.stage === 'partly_allocated' ? 'in_production' : 'confirmed');
  return {
    figure: { count: recent30, periodLabel: 'Last 30 days', changePercent: previous30 === 0 ? (recent30 > 0 ? 100 : 0) : Math.round(((recent30 - previous30) / previous30) * 1000) / 10, comparedTo: 'previous 30 days', weekly },
    recent: live.slice(0, 5).map((order) => ({ number: order.number, path: `/orders/${order.number}`, customer: order.customerName, fabric: order.products.join(', '), metres: order.metres, fulfilment: order.progress, shipDate: order.requestedDelivery ?? today, stage: stageOf(order) })),
  };
}

// Rolls in the warehouses, by family: read from the balances the ledger produced.
async function loadStockFigure(): Promise<GatewayData['figures']['inventory']> {
  const balances = import.meta.env.MODE === 'sample'
    ? await (await import('./sample-inventory')).sampleInventory.balances()
    : await (async () => {
        const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
        const { data } = await sdk.listStockBalances(dataConnect);
        return data.stockBalances.map((row) => ({ rolls: row.rolls, familyCode: row.sku.product.family.code, familyName: row.sku.product.family.name, locationKind: row.location.kind }));
      })();
  const physical = balances.filter((balance) => balance.locationKind === 'physical');
  const families = new Map<string, { code: string; name: string; rolls: number }>();
  for (const balance of physical) {
    const current = families.get(balance.familyCode) ?? { code: balance.familyCode, name: balance.familyName, rolls: 0 };
    current.rolls += balance.rolls;
    families.set(balance.familyCode, current);
  }
  return { rolls: physical.reduce((sum, balance) => sum + balance.rolls, 0), byFamily: [...families.values()].sort((a, b) => a.code.localeCompare(b.code)) };
}

// Booked shipments on their lanes, soonest arrival first, and the in-transit
// figure: what is on the water, in the air or in customs right now.
async function loadLanes(): Promise<{ shipments: ShipmentLane[]; transit: GatewayData['figures']['transit'] }> {
  const { laneOf } = await import('../pages/logistics/Logistics');
  const today = todayIn(zone());
  const all = await (async () => {
    if (import.meta.env.MODE === 'sample') return (await import('./sample-logistics')).sampleLogistics.shipments();
    const [{ dataConnect }, sdk, { summaryOf }] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform'), import('./logistics')]);
    const { data } = await sdk.listShipments(dataConnect);
    return data.shipments.map((row) => summaryOf(row as never, today));
  })();
  const booked = all.filter((shipment) => shipment.state === 'booked');
  const open = booked.filter((shipment) => shipment.stage !== 'delivered').sort((a, b) => (a.eta ?? '').localeCompare(b.eta ?? ''));
  const recent = booked.filter((shipment) => shipment.stage === 'delivered' && shipment.eta && between(shipment.eta, today) <= 7);
  const moving = booked.filter((shipment) => shipment.stage === 'in_transit' || shipment.stage === 'arrived' || shipment.stage === 'customs');
  return {
    shipments: [...open, ...recent].slice(0, 5).map((shipment) => laneOf(shipment, today)),
    transit: { shipments: moving.length, metres: moving.reduce((sum, shipment) => sum + BigInt(shipment.totals.metres), 0n).toString(), progress: moving.map((shipment) => shipment.progress) },
  };
}

async function loadLiveRuns() {
  const [{ dataConnect }, { listProductionRuns }] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  const { data } = await listProductionRuns(dataConnect);
  const { runProgress } = await import('@basis/shared');
  return data.productionRuns.map((run) => {
    const milestones = run.productionMilestones_on_run.map((m) => ({
      id: m.id, key: m.key, name: m.name, category: m.category, sequence: m.sequence, dependsOnKey: null, gate: m.gate, state: m.state,
      plannedStart: m.plannedStart as never, plannedEnd: m.plannedEnd as never, forecastEnd: (m.forecastEnd ?? null) as never, actualStart: (m.actualStart ?? null) as never, actualEnd: (m.actualEnd ?? null) as never, delayReason: m.delayReason ?? '', note: '',
    }));
    return {
      number: run.number, state: run.state, health: run.health, templateName: run.templateName ?? '', plannedStart: run.plannedStart as never, plannedEnd: run.plannedEnd as never,
      forecastEnd: (run.forecastEnd ?? null) as never, totalQuantity: run.productionRunLines_on_run.reduce((sum, line) => sum + BigInt(line.plannedQuantity), 0n).toString(),
      products: [...new Set(run.productionRunLines_on_run.map((line) => `${line.purchaseOrderLine.sku.product.name}, ${line.purchaseOrderLine.sku.shade.name}`))],
      progress: runProgress(milestones), milestones,
    };
  });
}

async function loadGateway(): Promise<GatewayData> {
  if (import.meta.env.MODE === 'sample') {
    const [{ sampleGateway }, { sampleManufacturing }, tasks, lanes, stock, orderFacts] = await Promise.all([import('./sample'), import('./sample-manufacturing'), loadOpenTasks(), loadLanes(), loadStockFigure(), loadOrderFacts()]);
    const today = todayIn(zone());
    const data = sampleGateway(today);
    // The run the manufacturing sample store holds is the one the Gateway shows,
    // so a milestone updated in the sheet changes the timeline here too.
    const storeRuns = (await sampleManufacturing.runs()).filter((run) => run.state === 'active' || run.state === 'planned');
    const runs: RunTimeline[] = [
      ...storeRuns.map((run) => ({
        number: run.number,
        path: `/manufacturing/runs/${run.number}`,
        product: run.products[0]?.split(',')[0] ?? run.templateName,
        shade: run.products.length > 1 ? `${run.products.length} lines` : (run.products[0]?.split(', ')[1] ?? ''),
        metres: run.totalQuantity,
        health: run.health,
        exFactory: run.forecastEnd ?? run.plannedEnd,
        milestones: run.milestones.map((milestone) => ({
          key: milestone.key,
          name: milestone.name,
          state: (milestone.state === 'done' || milestone.state === 'skipped' ? 'done' : milestone.state === 'in_progress' ? 'active' : milestone.state === 'blocked' ? 'blocked' : 'pending') as RunTimeline['milestones'][number]['state'],
          plannedEnd: milestone.plannedEnd,
          ...(milestone.forecastEnd ? { forecastEnd: milestone.forecastEnd } : {}),
          ...(milestone.actualEnd ? { actualEnd: milestone.actualEnd } : {}),
        })),
      })),
      ...data.runs.filter((run) => !storeRuns.some((candidate) => candidate.number === run.number)),
    ];
    const dueTasks: AttentionItem[] = tasks
      .filter((task) => task.dueOn && daysBetween(today, task.dueOn) <= 7)
      .map((task) => ({
        id: task.id,
        kind: 'task',
        state: 'open',
        severity: task.dueOn && daysBetween(task.dueOn, today) > 0 ? 'caution' : 'info',
        module: 'operations',
        title: task.title,
        subject: task.entityId || 'Task',
        path: '/operations/tasks',
        detail: task.dueOn ? `Due ${formatLocalDate(task.dueOn)}` : '',
        owner: task.assigneeName,
      }));
    return {
      ...data,
      figures: { ...data.figures, transit: lanes.transit, inventory: stock, orders: orderFacts.figure },
      shipments: lanes.shipments,
      orders: orderFacts.recent,
      runs,
      attention: [
        ...data.attention
          .filter((item) => !sampleDecisions.resolved.has(item.id))
          .map((item) => (sampleDecisions.acknowledged.has(item.id) ? { ...item, state: 'acknowledged' as const } : item)),
        ...dueTasks,
      ],
    };
  }
  return loadLiveGateway();
}

export function useGateway() {
  return useQuery({ queryKey: ['gateway'], queryFn: loadGateway, staleTime: 60_000, retry: false });
}
