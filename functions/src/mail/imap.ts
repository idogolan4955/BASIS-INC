import { defineSecret } from 'firebase-functions/params';
import { ImapFlow } from 'imapflow';
import { failure, graphql } from '../lib';

// The company mailbox over IMAP, signed in with a Google App Password, the
// way the owner's other systems read Gmail. The address is a connector
// setting; the App Password is a Functions secret the owner sets in the
// terminal. The folder read is Gmail's "All Mail", opened read-only, so the
// platform never changes, moves or deletes a message. Nothing here is logged.

export const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
export const MAIL_SECRETS = [GMAIL_APP_PASSWORD];

// `unset` is the placeholder the CLI needs at a deploy before the owner has
// created the App Password; it counts as absent.
const secret = (name: string) => {
  const value = process.env[name]?.replace(/\s+/g, '') ?? '';
  return value === 'unset' ? '' : value;
};

export function mailSecretsPresent(): { name: string; present: boolean }[] {
  return MAIL_SECRETS.map((entry) => ({ name: entry.name, present: Boolean(secret(entry.name)) }));
}

export interface MailConnectorRow {
  readonly address?: string;
}

export async function mailSettings(): Promise<MailConnectorRow> {
  const { connector } = await graphql<{ connector: { settings: MailConnectorRow | null } | null }>(`query { connector(key: { key: "mail" }) { settings } }`);
  return connector?.settings ?? {};
}

async function withMailbox<T>(address: string, run: (client: ImapFlow, folder: { uidValidity: string; uidNext: number }) => Promise<T>): Promise<T> {
  const password = secret(GMAIL_APP_PASSWORD.name);
  if (!password) throw failure('invariant_violation', 'The mailbox has no App Password. Create one in the Google account and set it with `firebase functions:secrets:set GMAIL_APP_PASSWORD`.');
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: address, pass: password }, logger: false });
  try {
    await client.connect();
  } catch (error) {
    const authentication = (error as { authenticationFailed?: boolean }).authenticationFailed;
    throw failure('external_failure', authentication ? `Gmail refused the App Password for ${address}. Create a new one and set GMAIL_APP_PASSWORD again.` : `Gmail could not be reached: ${(error as Error).message}`);
  }
  try {
    // "All Mail" holds both what came in and what was sent; spam and trash are not in it.
    const folders = await client.list();
    const all = folders.find((folder) => folder.specialUse === '\\All')?.path ?? '[Gmail]/All Mail';
    const opened = await client.mailboxOpen(all, { readOnly: true });
    return await run(client, { uidValidity: String(opened.uidValidity), uidNext: opened.uidNext });
  } finally {
    await client.logout().catch(() => undefined);
  }
}

export interface ImapMessage {
  /** Gmail's message id (X-GM-MSGID) in hex: the same id the Gmail API uses. */
  readonly id: string;
  readonly threadId: string;
  readonly labelIds: readonly string[];
  readonly internalDate: string | null;
  readonly raw: Buffer;
}

const hex = (decimal: string | undefined) => (decimal ? BigInt(decimal).toString(16) : '');

/** Signs in once to prove the address and the App Password belong together. */
export async function checkMailbox(address: string): Promise<{ uidNext: number }> {
  return withMailbox(address, async (_client, folder) => ({ uidNext: folder.uidNext }));
}

/**
 * Reads what arrived after the cursor (`<uidValidity>:<last uid>`), oldest
 * first, up to a limit per run. Without a cursor, or when Gmail renumbered
 * the folder, it reads the last `days` by date. The cursor moves only past
 * messages that were stored, so a failure is read again next time.
 */
export async function readSince(
  address: string,
  cursor: string | null,
  days: number,
  limit: number,
  store: (message: ImapMessage) => Promise<void>,
): Promise<{ cursor: string; seen: number; failed: number }> {
  return withMailbox(address, async (client, folder) => {
    const [validity, last] = (cursor ?? '').split(':');
    const continuing = validity === folder.uidValidity && last !== undefined && /^\d+$/.test(last);
    let uids: number[];
    if (continuing) {
      const from = Number(last) + 1;
      uids = from >= folder.uidNext ? [] : ((await client.search({ uid: `${from}:*` }, { uid: true })) || []).filter((uid) => uid >= from);
    } else if (days > 0) {
      uids = (await client.search({ since: new Date(Date.now() - days * 86_400_000) }, { uid: true })) || [];
    } else {
      // From now on: nothing earlier is read.
      return { cursor: `${folder.uidValidity}:${folder.uidNext - 1}`, seen: 0, failed: 0 };
    }
    uids.sort((a, b) => a - b);
    const batch = uids.slice(0, limit);
    let position = continuing ? Number(last) : (batch[0] ?? folder.uidNext) - 1;
    let failed = 0;
    if (batch.length > 0) {
      for await (const message of client.fetch(batch, { uid: true, source: true, emailId: true, threadId: true, labels: true, internalDate: true }, { uid: true })) {
        if (failed > 0) continue;
        const labels = message.labels ?? new Set<string>();
        try {
          if (!labels.has('\\Draft') && message.source) {
            await store({
              id: hex(message.emailId) || `uid-${folder.uidValidity}-${message.uid}`,
              threadId: hex(message.threadId) || hex(message.emailId),
              labelIds: labels.has('\\Sent') ? ['SENT'] : [],
              internalDate: message.internalDate ? String(new Date(message.internalDate).getTime()) : null,
              raw: message.source,
            });
          }
          position = message.uid;
        } catch (error) {
          failed += 1;
          console.error('mail: a message could not be stored', message.uid, (error as Error).message);
        }
      }
    }
    if (!continuing && batch.length === 0) position = folder.uidNext - 1;
    return { cursor: `${folder.uidValidity}:${position}`, seen: batch.length, failed };
  });
}

/** One message's raw bytes, found again by its Gmail id; used when Storage does not hold it. */
export async function rawMessage(address: string, idHex: string): Promise<Buffer | null> {
  return withMailbox(address, async (client) => {
    const found = (await client.search({ emailId: BigInt(`0x${idHex}`).toString() }, { uid: true })) || [];
    if (!found[0]) return null;
    const message = await client.fetchOne(String(found[0]), { source: true }, { uid: true });
    return message ? (message.source ?? null) : null;
  });
}
