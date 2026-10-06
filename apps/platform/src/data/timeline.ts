import type { TimelineEventView } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSample } from './source';

// A record's timeline. Commands record their events here after they succeed;
// people add notes. Sample mode keeps the events in memory for the session.

const sampleEvents = new Map<string, TimelineEventView[]>();
const key = (entityType: string, entityId: string) => `${entityType}:${entityId}`;

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

export async function recordEvent(entityType: string, entityId: string, kind: string, note?: string, payload?: unknown): Promise<void> {
  if (isSample) {
    const list = sampleEvents.get(key(entityType, entityId)) ?? [];
    list.unshift({
      id: `${Date.now()}-${list.length}`,
      kind,
      occurredAt: new Date().toISOString(),
      note: note ?? '',
      actorName: 'Sample session',
      payload: payload ?? null,
    });
    sampleEvents.set(key(entityType, entityId), list);
    return;
  }
  const { dc, sdk } = await live();
  await sdk.recordEvent(dc, { entityType, entityId, kind, note: note ?? null, payload: payload ?? null });
}

export function useTimeline(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['timeline', entityType, entityId],
    queryFn: async (): Promise<TimelineEventView[]> => {
      if (isSample) return [...(sampleEvents.get(key(entityType, entityId)) ?? [])];
      const { dc, sdk } = await live();
      const { data } = await sdk.listTimeline(dc, { entityType, entityId });
      return data.timelineEvents.map((event) => ({
        id: event.id,
        kind: event.kind,
        occurredAt: event.occurredAt,
        note: event.note ?? '',
        actorName: event.actor?.name ?? '',
        payload: event.payload ?? null,
      }));
    },
  });
}

export function useRecordNote(entityType: string, entityId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (note: string) => recordEvent(entityType, entityId, 'note', note),
    onSuccess: () => client.invalidateQueries({ queryKey: ['timeline', entityType, entityId] }),
  });
}
