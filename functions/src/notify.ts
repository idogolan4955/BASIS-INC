import { portalPush, type PortalPushKind, type PushLocale } from '@basis/shared';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { graphql } from './lib';

// Notifications on customers' phones (the BASIS app for iPhone,
// docs/APP_STORE.md): the sweep hands two facts to these handlers, a quote
// sent to a customer and a shipment delivered to one, and every active person
// of that customer's account hears about it on the phones they registered,
// in the language their app is set to. Firebase Cloud Messaging carries it to
// Apple's push service with the APNs key the owner uploaded to Firebase. No
// handler ever throws into the sweep: a failed notification is logged and
// the outbox moves on.

interface OutboxEvent {
  readonly type: string;
  readonly aggregateId: string;
  readonly occurredAt: string;
}

/** Tokens FCM says will never work again; they are forgotten. */
const GONE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);
/** A sweep that catches up after an outage does not wake phones about old news. */
const FRESH_MS = 48 * 3_600_000;

interface Device {
  readonly token: string;
  readonly locale: string;
}

/** The phones of the active people in the active account of a customer company. */
async function devicesOf(companyId: string): Promise<Device[]> {
  const { pushDevices } = await graphql<{ pushDevices: Device[] }>(
    `query ($companyId: UUID!) {
      pushDevices(where: { customerUser: { status: { eq: active }, account: { status: { eq: active }, company: { id: { eq: $companyId } } } } }, limit: 500) { token locale }
    }`,
    { companyId },
  );
  return pushDevices;
}

/** Sends one notification to every phone of a customer company; returns how many phones took it. */
export async function notifyCustomer(companyId: string, kind: PortalPushKind, facts: { number: string; place?: string | null }): Promise<number> {
  const devices = await devicesOf(companyId);
  let delivered = 0;
  for (const locale of ['en', 'he'] as const satisfies readonly PushLocale[]) {
    const tokens = devices.filter((device) => (device.locale === 'he' ? 'he' : 'en') === locale).map((device) => device.token);
    if (tokens.length === 0) continue;
    const message = portalPush(kind, facts, locale);
    const result = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: message.title, body: message.body },
      data: { path: message.path },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    delivered += result.successCount;
    const gone = result.responses.flatMap((response, index) => (!response.success && GONE.has(response.error?.code ?? '') ? [tokens[index]!] : []));
    if (gone.length > 0) await graphql(`mutation ($tokens: [String!]!) { pushDevice_deleteMany(where: { token: { in: $tokens } }) }`, { tokens: gone });
    for (const response of result.responses) {
      if (!response.success && !GONE.has(response.error?.code ?? '')) logger.warn('notify: a phone did not take the notification', { kind, code: response.error?.code, message: response.error?.message });
    }
  }
  return delivered;
}

function guarded(name: string, handler: (event: OutboxEvent) => Promise<void>): (event: OutboxEvent) => Promise<void> {
  return async (event) => {
    if (Date.now() - Date.parse(event.occurredAt) > FRESH_MS) return;
    try {
      await handler(event);
    } catch (error) {
      logger.error(`notify: ${name} failed`, { event: event.aggregateId, error: String(error) });
    }
  };
}

/** Registered in the sweep (functions/src/sweep.ts) by event type. */
export const NOTIFY_HANDLERS: Record<string, (event: OutboxEvent) => Promise<void>> = {
  'quote.sent': guarded('quote.sent', async (event) => {
    const { quotes } = await graphql<{ quotes: { number: string; state: string; customer: { id: string } }[] }>(
      `query ($number: String!) { quotes(where: { number: { eq: $number } }, limit: 1) { number state customer { id } } }`,
      { number: event.aggregateId },
    );
    const quote = quotes[0];
    if (!quote || quote.state !== 'sent') return;
    await notifyCustomer(quote.customer.id, 'quote_sent', { number: quote.number });
  }),
  'shipment.delivered': guarded('shipment.delivered', async (event) => {
    const { shipments } = await graphql<{ shipments: { number: string; consignee: { id: string } | null; destination: { city: string | null } }[] }>(
      `query ($number: String!) { shipments(where: { number: { eq: $number } }, limit: 1) { number consignee { id } destination { city } } }`,
      { number: event.aggregateId },
    );
    const shipment = shipments[0];
    // Only a shipment consigned to a customer is theirs to hear about; its place is the city, never a name.
    if (!shipment?.consignee) return;
    await notifyCustomer(shipment.consignee.id, 'shipment_arrived', { number: shipment.number, place: shipment.destination.city });
  }),
};
