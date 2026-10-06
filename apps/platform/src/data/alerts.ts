import { FUNCTION_NAMES, FUNCTIONS_REGION } from '@basis/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isSample } from './source';

// Acting on attention items: acknowledge, dismiss, run the checks now.
// Sample mode remembers decisions for the session only.

export const sampleDecisions = { acknowledged: new Set<string>(), resolved: new Set<string>() };

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

export function useAcknowledgeAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isSample) {
        sampleDecisions.acknowledged.add(id);
        return;
      }
      const { dc, sdk } = await live();
      await sdk.acknowledgeAlert(dc, { id });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['gateway'] }),
  });
}

export function useResolveAlert() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isSample) {
        sampleDecisions.resolved.add(id);
        return;
      }
      const { dc, sdk } = await live();
      await sdk.resolveAlert(dc, { id });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['gateway'] }),
  });
}

export interface CheckRun {
  raised: number;
  refreshed: number;
  resolved: number;
}

/** Owners and operations managers can run every rule now instead of waiting for the sweep. */
export function useRunChecks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CheckRun> => {
      if (isSample) return { raised: 0, refreshed: 0, resolved: 0 };
      const [{ app }, { getFunctions, httpsCallable, connectFunctionsEmulator }] = await Promise.all([import('../lib/firebase'), import('firebase/functions')]);
      const functions = getFunctions(app, FUNCTIONS_REGION);
      if (import.meta.env.DEV) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      const run = httpsCallable<Record<string, never>, CheckRun>(functions, FUNCTION_NAMES.evaluateAlerts);
      const result = await run({});
      return result.data;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['gateway'] }),
  });
}
