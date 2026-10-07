import { CONNECTOR_KEYS, CONNECTOR_SECRETS, isRole, type ConnectorKey, type Role } from '@basis/shared';
import { createHash, randomBytes } from 'node:crypto';
import { defineSecret } from 'firebase-functions/params';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, failure, graphql, requireRole, type Caller } from './lib';
import { renderPackingList, renderPurchaseOrder, renderRollLabels, renderShipmentPackingList } from './pdf';

// Connectors: how the platform reaches the outside (email, WhatsApp, the
// owner's assistant) and the tokens machines act with. Secrets are never
// stored here; they are Functions secrets the owner sets by name.

export const EMAIL_API_KEY = defineSecret('EMAIL_API_KEY');

// ---------------------------------------------------------------- tokens

const TOKEN_PREFIX = 'bsk';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** A token's caller, or null when the bearer is not a token. Throws when it is one but is not valid. */
export async function tokenCallerOf(bearer: string): Promise<Caller | null> {
  const match = bearer.match(/^bsk_([a-z0-9]{8})_[a-z0-9]{40}$/i);
  if (!match) return null;
  const { apiTokens } = await graphql<{ apiTokens: { id: string; hash: string; role: string; createdByUid: string; expiresAt: string | null; revokedAt: string | null }[] }>(
    `query ($prefix: String!) { apiTokens(where: { prefix: { eq: $prefix } }, limit: 1) { id hash role createdByUid expiresAt revokedAt } }`,
    { prefix: `${TOKEN_PREFIX}_${match[1]!.toLowerCase()}` },
  );
  const token = apiTokens[0];
  if (!token || token.hash !== hashToken(bearer)) throw failure('forbidden', 'This token is not recognised.');
  if (token.revokedAt) throw failure('forbidden', 'This token was revoked.');
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) throw failure('forbidden', 'This token has expired.');
  if (!isRole(token.role)) throw failure('forbidden', 'This token has no role.');
  await graphql(`mutation ($id: UUID!) { apiToken_update(id: $id, data: { lastUsedAt_expr: "request.time" }) }`, { id: token.id });
  // Actions run as the person who issued the token, with the token named on the request.
  return { uid: token.createdByUid, role: token.role, via: `token:${token.id}` };
}

const createTokenInput = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(['owner', 'operations', 'purchasing', 'qc', 'logistics', 'sales', 'marketing', 'finance', 'viewer']),
  expiresInDays: z.number().int().min(1).max(730).optional(),
});

export const createApiToken = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Issuing tokens');
  const parsed = createTokenInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'A name and a role are needed.');
  const { name, role, expiresInDays } = parsed.data;
  const short = randomBytes(6).toString('base64url').replace(/[^a-z0-9]/gi, 'x').slice(0, 8).toLowerCase();
  const secret = randomBytes(30).toString('base64url').replace(/[^a-z0-9]/gi, 'x').slice(0, 40).toLowerCase();
  const token = `${TOKEN_PREFIX}_${short}_${secret}`;
  const prefix = `${TOKEN_PREFIX}_${short}`;
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null;
  const { apiToken_insert } = await graphql<{ apiToken_insert: { id: string } }>(
    `mutation ($name: String!, $prefix: String!, $hash: String!, $role: Role!, $uid: String!, $expiresAt: Timestamp) {
      apiToken_insert(data: { name: $name, prefix: $prefix, hash: $hash, role: $role, createdByUid: $uid, expiresAt: $expiresAt }) }`,
    { name, prefix, hash: hashToken(token), role, uid: caller.uid, expiresAt },
  );
  await audit(caller.uid, 'api_token.create', 'api_token', apiToken_insert.id, null, { name, prefix, role, expiresAt });
  // The token itself leaves exactly once, here.
  return { id: apiToken_insert.id, prefix, token, role, expiresAt };
});

export const revokeApiToken = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Revoking tokens');
  const { id } = z.object({ id: z.string().min(1) }).parse(request.data);
  await graphql(`mutation ($id: UUID!) { apiToken_update(id: $id, data: { revokedAt_expr: "request.time" }) }`, { id });
  await audit(caller.uid, 'api_token.revoke', 'api_token', id, null, { revoked: true });
  return { id };
});

// ---------------------------------------------------------------- connectors

const settingsInput = z.object({
  key: z.enum(CONNECTOR_KEYS),
  settings: z.record(z.string(), z.union([z.string().max(255), z.number(), z.boolean()])),
});

export const saveConnector = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Changing connectors');
  const parsed = settingsInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Settings carry plain values only; secrets are set in the terminal.');
  const { key, settings } = parsed.data;
  if (key === 'assistant' && 'defaultRole' in settings && !isRole(settings['defaultRole'])) throw failure('validation', 'Choose a role.');
  await graphql(`mutation ($key: String!, $settings: Any, $uid: String!) { connector_upsert(data: { key: $key, settings: $settings, updatedByUid: $uid, updatedAt_expr: "request.time" }) }`, { key, settings, uid: caller.uid });
  await audit(caller.uid, 'connector.save', 'connector', key, null, settings);
  return { key };
});

const secretPresent = (name: string) => Boolean(process.env[name]);

export const connectorStatus = onCall({ region: REGION, secrets: [EMAIL_API_KEY] }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Reading connectors');
  const { connectors } = await graphql<{ connectors: { key: string; settings: unknown; updatedAt: string }[] }>(`query { connectors(limit: 20) { key settings updatedAt } }`);
  return {
    connectors: CONNECTOR_KEYS.map((key: ConnectorKey) => {
      const row = connectors.find((candidate) => candidate.key === key);
      return { key, settings: row?.settings ?? null, updatedAt: row?.updatedAt ?? null, secrets: CONNECTOR_SECRETS[key].map((name) => ({ name, present: secretPresent(name) })) };
    }),
    emulator: Boolean(process.env['FUNCTIONS_EMULATOR']),
  };
});

// ---------------------------------------------------------------- email

interface EmailSettingsRow {
  provider?: string;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
}

async function emailSettings(): Promise<EmailSettingsRow> {
  const { connector } = await graphql<{ connector: { settings: EmailSettingsRow | null } | null }>(`query { connector(key: { key: "email" }) { settings } }`);
  return connector?.settings ?? {};
}

async function deliver(settings: EmailSettingsRow, to: string, subject: string, text: string, attachment: { filename: string; content: Buffer }): Promise<string> {
  const key = EMAIL_API_KEY.value();
  if (!key) throw failure('invariant_violation', 'The email connector has no API key. Set EMAIL_API_KEY with `firebase functions:secrets:set EMAIL_API_KEY`.');
  if (!settings.provider || !settings.fromAddress) throw failure('invariant_violation', 'The email connector needs a provider and a from address in Settings.');
  const from = settings.fromName ? `${settings.fromName} <${settings.fromAddress}>` : settings.fromAddress;
  if (settings.provider === 'resend') {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, ...(settings.replyTo ? { reply_to: settings.replyTo } : {}), attachments: [{ filename: attachment.filename, content: attachment.content.toString('base64') }] }),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!response.ok) throw failure('external_failure', `Resend refused the message: ${body.message ?? response.status}`);
    return body.id ?? '';
  }
  if (settings.provider === 'postmark') {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ From: from, To: to, Subject: subject, TextBody: text, ...(settings.replyTo ? { ReplyTo: settings.replyTo } : {}), Attachments: [{ Name: attachment.filename, Content: attachment.content.toString('base64'), ContentType: 'application/pdf' }] }),
    });
    const body = (await response.json().catch(() => ({}))) as { MessageID?: string; Message?: string };
    if (!response.ok) throw failure('external_failure', `Postmark refused the message: ${body.Message ?? response.status}`);
    return body.MessageID ?? '';
  }
  throw failure('invariant_violation', `Unknown email provider ${settings.provider}.`);
}

const RENDERERS = {
  'purchase-order': { render: renderPurchaseOrder, entityType: 'purchase_order', roles: ['owner', 'operations', 'purchasing', 'finance'] as readonly Role[] },
  'packing-list': { render: renderPackingList, entityType: 'production_run', roles: ['owner', 'operations', 'purchasing', 'qc', 'logistics'] as readonly Role[] },
  'roll-labels': { render: renderRollLabels, entityType: 'lot', roles: ['owner', 'operations', 'purchasing', 'qc', 'logistics'] as readonly Role[] },
  'shipment-packing-list': { render: renderShipmentPackingList, entityType: 'shipment', roles: ['owner', 'operations', 'purchasing', 'qc', 'logistics'] as readonly Role[] },
} as const;

const sendInput = z.object({
  kind: z.enum(['purchase-order', 'packing-list', 'roll-labels', 'shipment-packing-list']),
  number: z.string().regex(/^[A-Z]{2,4}-\d{2}-\d{4}$/),
  to: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().max(4000).default(''),
});

export const sendDocumentEmail = onCall({ region: REGION, secrets: [EMAIL_API_KEY], memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  const parsed = sendInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'A recipient address and a subject are needed.');
  const input = parsed.data;
  const spec = RENDERERS[input.kind];
  requireRole(caller, spec.roles, 'Sending this document');
  const { pdf, filename } = await spec.render(input.number);
  const settings = await emailSettings();
  const log = async (status: string, providerRef: string | null, error: string | null) => {
    await graphql(
      `mutation ($to: String!, $subject: String!, $body: String, $entityType: String!, $entityId: String!, $status: String!, $ref: String, $error: String, $uid: String!) {
        message_insert(data: { channel: "email", recipient: $to, subject: $subject, body: $body, entityType: $entityType, entityId: $entityId, status: $status, providerRef: $ref, error: $error, sentByUid: $uid }) }`,
      { to: input.to, subject: input.subject, body: input.message, entityType: spec.entityType, entityId: input.number, status, ref: providerRef, error, uid: caller.uid },
    );
  };
  try {
    const ref = await deliver(settings, input.to, input.subject, input.message || `Please find ${filename} attached.`, { filename, content: pdf });
    await log('sent', ref || null, null);
    await graphql(
      `mutation ($entityType: String!, $entityId: String!, $actorUid: String!, $payload: Any) {
        timelineEvent_insert(data: { entityType: $entityType, entityId: $entityId, kind: "sent", actorUid: $actorUid, payload: $payload }) }`,
      { entityType: spec.entityType, entityId: input.number, actorUid: caller.uid, payload: { summary: `${filename} emailed to ${input.to}` } },
    );
    await audit(caller.uid, 'message.send', spec.entityType, input.number, null, { channel: 'email', to: input.to, subject: input.subject, filename });
    return { status: 'sent', providerRef: ref };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The message could not be sent.';
    await log('failed', null, message);
    throw error;
  }
});
