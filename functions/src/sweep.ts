import { visitorConversationCutoff } from '@basis/shared';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { evaluateRules } from './alerts';
import { REGION, graphql } from './lib';
import { NOTIFY_HANDLERS } from './notify';

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

const HANDLERS: Record<string, Handler> = {
  // Customers' phones hear about a sent quote and a delivered shipment.
  ...NOTIFY_HANDLERS,
};

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

/** Visitors' conversations with the site assistant are kept 90 days after their last message. */
export async function pruneVisitorConversations(now: Date = new Date()): Promise<number> {
  const { siteConversation_deleteMany } = await graphql<{ siteConversation_deleteMany: number }>(
    `mutation ($cutoff: Timestamp!) { siteConversation_deleteMany(where: { audience: { eq: anonymous }, lastActivityAt: { lt: $cutoff } }) }`,
    { cutoff: visitorConversationCutoff(now) },
  );
  return siteConversation_deleteMany;
}

export const sweepEvents = onSchedule({ region: REGION, schedule: 'every 10 minutes' }, async () => {
  await sweepOnce();
  await evaluateRules();
  await pruneVisitorConversations();
});
