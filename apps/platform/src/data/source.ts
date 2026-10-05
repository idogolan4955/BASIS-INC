import { ROLE_LABELS, entityPath, isRole, moduleForEntity, todayIn, type GatewayData } from '@basis/shared';
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
  const [{ dataConnect }, { listOpenAlerts }] = await Promise.all([
    import('../lib/firebase'),
    import('@basis/shared/dataconnect/platform'),
  ]);
  const { data } = await listOpenAlerts(dataConnect);
  return {
    asOf: todayIn(zone()),
    figures: {
      orders: { count: 0, periodLabel: 'Last 30 days', changePercent: 0, comparedTo: 'previous 30 days', weekly: [] },
      production: { activeRuns: 0, onSchedule: 0 },
      transit: { shipments: 0, metres: '0', progress: [] },
      inventory: { rolls: 0, byFamily: [] },
      quality: { firstPassPercent: 0, inspections: 0, windowLabel: 'last 90 days', monthly: [] },
    },
    attention: data.alerts.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      module: moduleForEntity(alert.entityType),
      title: alert.title,
      subject: alert.entityId,
      path: entityPath(alert.entityType, alert.entityId),
      detail: alert.detail ?? '',
      owner: isRole(alert.ownerRole) ? ROLE_LABELS[alert.ownerRole] : '',
    })),
    runs: [],
    shipments: [],
    orders: [],
    families: [],
  };
}

async function loadGateway(): Promise<GatewayData> {
  if (import.meta.env.MODE === 'sample') {
    const { sampleGateway } = await import('./sample');
    return sampleGateway(todayIn(zone()));
  }
  return loadLiveGateway();
}

export function useGateway() {
  return useQuery({ queryKey: ['gateway'], queryFn: loadGateway, staleTime: 60_000, retry: false });
}
