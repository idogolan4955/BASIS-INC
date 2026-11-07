import { defineSecret } from 'firebase-functions/params';
import { failure, graphql } from '../lib';

// The Gmail API over plain HTTPS, read-only (`gmail.readonly`). The OAuth
// client id is a connector setting; the client secret and the refresh token
// are Functions secrets the owner sets in the terminal (`pnpm mail:connect`
// writes the token). Nothing here is ever logged.

export const GMAIL_CLIENT_SECRET = defineSecret('GMAIL_CLIENT_SECRET');
export const GMAIL_REFRESH_TOKEN = defineSecret('GMAIL_REFRESH_TOKEN');
export const MAIL_SECRETS = [GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN];

/** The Pub/Sub topic Gmail publishes changes to, in project basis-inc. */
export const GMAIL_TOPIC = 'gmail-mail';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// `unset` is the placeholder the CLI needs at the first deploy before the
// owner connects the mailbox; it counts as absent.
const secret = (name: string) => {
  const value = process.env[name]?.trim() ?? '';
  return value === 'unset' ? '' : value;
};

export function mailSecretsPresent(): { name: string; present: boolean }[] {
  return MAIL_SECRETS.map((entry) => ({ name: entry.name, present: Boolean(secret(entry.name)) }));
}

export interface MailConnectorRow {
  readonly clientId?: string;
  readonly address?: string;
}

export async function mailSettings(): Promise<MailConnectorRow> {
  const { connector } = await graphql<{ connector: { settings: MailConnectorRow | null } | null }>(`query { connector(key: { key: "mail" }) { settings } }`);
  return connector?.settings ?? {};
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { clientId } = await mailSettings();
  const clientSecret = secret(GMAIL_CLIENT_SECRET.name);
  const refreshToken = secret(GMAIL_REFRESH_TOKEN.name);
  if (!clientId) throw failure('invariant_violation', 'The mail connector has no OAuth client id. Add it in Settings › Connectors › Mail.');
  if (!clientSecret || !refreshToken) throw failure('invariant_violation', 'The mailbox is not connected. Set GMAIL_CLIENT_SECRET, then run `pnpm mail:connect` in the terminal.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const body = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    // invalid_grant: the owner revoked access, or the app was left in Testing and the token expired.
    throw failure('external_failure', `Google refused the mailbox credentials (${body.error ?? response.status}). Run \`pnpm mail:connect\` again.`);
  }
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

export class GmailError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function gmail<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GmailError(response.status, body.error?.message ?? `Gmail answered ${response.status}`);
  }
  return (await response.json()) as T;
}

export function profile(): Promise<{ emailAddress: string; historyId: string; messagesTotal: number }> {
  return gmail('/profile');
}

// Every label is watched; spam, trash, drafts and chats are dropped when the history is read.
export function watch(project: string): Promise<{ historyId: string; expiration: string }> {
  return gmail('/watch', { method: 'POST', body: { topicName: `projects/${project}/topics/${GMAIL_TOPIC}` } });
}

export async function stopWatch(): Promise<void> {
  await gmail('/stop', { method: 'POST', body: {} });
}

export interface HistoryPage {
  readonly history?: readonly { readonly messagesAdded?: readonly { readonly message: { readonly id: string; readonly threadId: string; readonly labelIds?: readonly string[] } }[] }[];
  readonly historyId: string;
  readonly nextPageToken?: string;
}

/** Message ids added since a history id; a 404 means the cursor is too old and the caller re-reads by date. */
export async function messagesAddedSince(startHistoryId: string): Promise<{ ids: { id: string; threadId: string }[]; historyId: string }> {
  const ids = new Map<string, { id: string; threadId: string }>();
  let pageToken: string | undefined;
  let historyId: string;
  do {
    const query = new URLSearchParams({ startHistoryId, historyTypes: 'messageAdded', maxResults: '500', ...(pageToken ? { pageToken } : {}) });
    const page = await gmail<HistoryPage>(`/history?${query}`);
    for (const entry of page.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        const labels = added.message.labelIds ?? [];
        if (labels.includes('SPAM') || labels.includes('TRASH') || labels.includes('DRAFT') || labels.includes('CHAT')) continue;
        ids.set(added.message.id, { id: added.message.id, threadId: added.message.threadId });
      }
    }
    historyId = page.historyId;
    pageToken = page.nextPageToken;
  } while (pageToken);
  return { ids: [...ids.values()], historyId };
}

/** Message ids matching a Gmail search, newest first, up to a limit. */
export async function searchMessages(q: string, limit: number): Promise<{ id: string; threadId: string }[]> {
  const found: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ q, maxResults: String(Math.min(500, limit - found.length)), ...(pageToken ? { pageToken } : {}) });
    const page = await gmail<{ messages?: { id: string; threadId: string }[]; nextPageToken?: string }>(`/messages?${query}`);
    found.push(...(page.messages ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken && found.length < limit);
  return found;
}

export interface RawMessage {
  readonly id: string;
  readonly threadId: string;
  readonly labelIds: readonly string[];
  readonly internalDate: string;
  readonly raw: Buffer;
}

export async function rawMessage(id: string): Promise<RawMessage> {
  const message = await gmail<{ id: string; threadId: string; labelIds?: string[]; internalDate: string; raw: string }>(`/messages/${encodeURIComponent(id)}?format=raw`);
  return { id: message.id, threadId: message.threadId, labelIds: message.labelIds ?? [], internalDate: message.internalDate, raw: Buffer.from(message.raw, 'base64url') };
}
