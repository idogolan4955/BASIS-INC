import { ROLE_LABELS, daysBetween, entityPath, formatLocalDate, isRole, moduleForEntity, todayIn, type AttentionItem, type GatewayData } from '@basis/shared';
import { sampleDecisions } from './alerts';
import { loadOpenTasks } from './tasks';
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
  const { data } = await listOpenAlerts(dataConnect);
  const today = todayIn(zone());
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
      orders: { count: 0, periodLabel: 'Last 30 days', changePercent: 0, comparedTo: 'previous 30 days', weekly: [] },
      production: { activeRuns: 0, onSchedule: 0 },
      transit: { shipments: 0, metres: '0', progress: [] },
      inventory: { rolls: 0, byFamily: [] },
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
    runs: [],
    shipments: [],
    orders: [],
    families: [],
  };
}

async function loadGateway(): Promise<GatewayData> {
  if (import.meta.env.MODE === 'sample') {
    const { sampleGateway } = await import('./sample');
    const tasks = await loadOpenTasks();
    const today = todayIn(zone());
    const data = sampleGateway(today);
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
