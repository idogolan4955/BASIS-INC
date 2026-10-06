import { onSchedule } from 'firebase-functions/v2/scheduler';
import { evaluateRules } from './alerts';
import { REGION, graphql } from './lib';

// The sweep consumes the outbox. Each handler is a small pure decision over
// an event; alert rules, read-model refreshes and notifications register here
// as the modules that produce their facts are built.

interface OutboxEvent {
  readonly id: string;
  readonly type: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly payload: unknown;
  readonly occurredAt: string;
}

type Handler = (event: OutboxEvent) => Promise<void>;

const HANDLERS: Record<string, Handler> = {};

export async function sweepOnce(): Promise<{ processed: number }> {
  const { domainEvents } = await graphql<{ domainEvents: OutboxEvent[] }>(
    `query Unprocessed {
      domainEvents(where: { processedAt: { isNull: true } }, orderBy: { occurredAt: ASC }, limit: 200) {
        id type aggregateType aggregateId payload occurredAt
      }
    }`,
  );

  for (const event of domainEvents) {
    await HANDLERS[event.type]?.(event);
    await graphql(
      `mutation MarkProcessed($id: UUID!) {
        domainEvent_update(id: $id, data: { processedAt_expr: "request.time" })
      }`,
      { id: event.id },
    );
  }
  return { processed: domainEvents.length };
}

export const sweepEvents = onSchedule({ region: REGION, schedule: 'every 10 minutes' }, async () => {
  await sweepOnce();
  await evaluateRules();
});
