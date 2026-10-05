import { todayIn, type GatewayData } from '@basis/shared';
import { useQuery } from '@tanstack/react-query';

// Where screens get their data. `vite --mode sample` serves typed sample
// records so the interface can be reviewed without a backend; the sample module
// is never part of a production build. Every other mode reads the Data Connect
// platform connector, which is wired in with the data foundation.

export const isSample = import.meta.env.MODE === 'sample';

export class NotConnectedError extends Error {
  constructor() {
    super('The data connection is not set up yet.');
    this.name = 'NotConnectedError';
  }
}

async function loadGateway(): Promise<GatewayData> {
  if (import.meta.env.MODE === 'sample') {
    const { sampleGateway } = await import('./sample');
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return sampleGateway(todayIn(zone));
  }
  throw new NotConnectedError();
}

export function useGateway() {
  return useQuery({ queryKey: ['gateway'], queryFn: loadGateway, staleTime: 60_000, retry: false });
}
