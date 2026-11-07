import {
  combineAudiences,
  extractContainerNumbers,
  extractReferences,
  firstMatchingRule,
  isMailAudience,
  isMailCategory,
  mailCompanyEntity,
  matchKnownReferences,
  normaliseAddress,
  resolveSender,
  snippetOf,
  trimQuoted,
  sortByFacts,
  type MailAudience,
  type MailCategory,
  type MailHeaders,
  type MailReferenceEntity,
  type MailRuleView,
  type Role,
  type SortDecision,
} from '@basis/shared';
import { createHash } from 'node:crypto';
import { getStorage } from 'firebase-admin/storage';
import PostalMime, { type Address, type Email } from 'postal-mime';
import { emit, graphql } from '../lib';

// A message becomes a record exactly once: parsed, stored with its thread and
// attachments, sorted from facts, linked to the records it names. Sorting
// never blocks storing: if it fails, the message is kept for the owner.

export interface Mailbox {
  readonly id: string;
  readonly address: string;
  readonly provider: string;
}

export interface IncomingMessage {
  readonly providerMessageId: string;
  /** Gmail's thread id; null for an imported file, which is threaded by its headers. */
  readonly providerThreadId: string | null;
  readonly labelIds: readonly string[];
  readonly internalDate: string | null;
  readonly raw: Buffer;
}

export interface IngestResult {
  readonly messageId: string;
  readonly created: boolean;
  readonly state: string;
}

const KEPT_HEADERS = ['list-id', 'list-unsubscribe', 'precedence', 'auto-submitted', 'x-autoreply', 'x-autorespond'];

const storageReachable = () => !process.env['FUNCTIONS_EMULATOR'] || Boolean(process.env['FIREBASE_STORAGE_EMULATOR_HOST']);

async function store(path: string, bytes: Buffer | Uint8Array, contentType: string): Promise<string | null> {
  if (!storageReachable()) return null;
  try {
    await getStorage().bucket().file(path).save(Buffer.from(bytes), { contentType, resumable: false });
    return path;
  } catch (error) {
    // Storage not enabled yet: the message is still stored; Gmail keeps the bytes.
    console.warn('mail: storage unavailable', (error as Error).message);
    return null;
  }
}

const mailboxesOf = (addresses: readonly Address[] | undefined) =>
  (addresses ?? []).flatMap((entry) => (entry.address ? [{ name: entry.name, address: normaliseAddress(entry.address) }] : (entry.group ?? []).map((member) => ({ name: member.name, address: normaliseAddress(member.address) }))));

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const NUMBER_TABLES: Record<MailReferenceEntity, { readonly field: string; readonly key: 'number' | 'reference' }> = {
  purchase_order: { field: 'purchaseOrders', key: 'number' },
  production_run: { field: 'productionRuns', key: 'number' },
  lot: { field: 'lots', key: 'number' },
  inspection: { field: 'inspections', key: 'number' },
  corrective_action: { field: 'correctiveActions', key: 'number' },
  shipment: { field: 'shipments', key: 'number' },
  receipt: { field: 'receipts', key: 'number' },
  sales_order: { field: 'salesOrders', key: 'number' },
  quote: { field: 'quotes', key: 'number' },
  development_product: { field: 'developmentProducts', key: 'number' },
  inquiry: { field: 'inquiries', key: 'reference' },
};

/** The numbers among `ids` that exist as records of that type. */
export async function existingNumbers(entityType: MailReferenceEntity, ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { field, key } = NUMBER_TABLES[entityType];
  const data = await graphql<Record<string, Record<string, string>[]>>(`query ($ids: [String!]) { ${field}(where: { ${key}: { in: $ids } }, limit: 50) { ${key} } }`, { ids: [...ids] });
  return new Set((data[field] ?? []).map((row) => row[key]!));
}

/** The records a text names that exist: platform numbers, then shipment references and containers. */
export async function referencesIn(text: string): Promise<{ entityType: string; entityId: string }[]> {
  const found = extractReferences(text);
  const byType = new Map<MailReferenceEntity, string[]>();
  for (const reference of found) byType.set(reference.entityType, [...(byType.get(reference.entityType) ?? []), reference.entityId]);
  const existing: { entityType: string; entityId: string }[] = [];
  for (const [entityType, ids] of byType) {
    const present = await existingNumbers(entityType, ids);
    for (const id of ids) if (present.has(id)) existing.push({ entityType, entityId: id });
  }
  const { shipmentReferences } = await graphql<{ shipmentReferences: { value: string; shipment: { number: string; state: string } }[] }>(`query { shipmentReferences(limit: 5000) { value shipment { number state } } }`);
  const live = shipmentReferences.filter((reference) => reference.shipment.state !== 'cancelled');
  const containers = new Set(extractContainerNumbers(text));
  const matched = [...matchKnownReferences(text, live), ...live.filter((reference) => containers.has(reference.value.toUpperCase().replace(/[^A-Z0-9]/g, '')))];
  for (const reference of matched) {
    if (!existing.some((entry) => entry.entityType === 'shipment' && entry.entityId === reference.shipment.number)) existing.push({ entityType: 'shipment', entityId: reference.shipment.number });
  }
  return existing;
}

interface KnownContact {
  readonly id: string;
  readonly email: string | null;
  readonly company: { readonly id: string; readonly legalName: string; readonly archivedAt: string | null; readonly companyRoles_on_company: { readonly kind: string }[] };
}

export async function knownContacts(): Promise<KnownContact[]> {
  const { contacts } = await graphql<{ contacts: KnownContact[] }>(`query { contacts(where: { email: { isNull: false } }, limit: 5000) { id email company { id legalName archivedAt companyRoles_on_company { kind } } } }`);
  return contacts.filter((contact) => contact.email && !contact.company.archivedAt);
}

export async function mailRules(): Promise<MailRuleView[]> {
  const { mailRules: rows } = await graphql<{ mailRules: { id: string; match: MailRuleView['match']; category: string | null; audience: string | null; ownerRole: Role | null; skipModel: boolean; ignore: boolean; sort: number }[] }>(
    `query { mailRules(where: { archivedAt: { isNull: true } }, orderBy: { sort: ASC }, limit: 500) { id match category audience ownerRole skipModel ignore sort } }`,
  );
  return rows.map((row) => ({ ...row, category: isMailCategory(row.category) ? row.category : null, audience: isMailAudience(row.audience) ? row.audience : null }));
}

export const companyEntity = mailCompanyEntity;

interface ThreadRow {
  readonly id: string;
  readonly audience: MailAudience;
  readonly category: string | null;
  readonly messageCount: number;
  readonly firstAt: string;
  readonly lastAt: string;
  readonly lastInboundAt: string | null;
  readonly lastOutboundAt: string | null;
}

const THREAD_FIELDS = 'id audience category messageCount firstAt lastAt lastInboundAt lastOutboundAt';

async function threadFor(mailbox: Mailbox, message: IncomingMessage, parsed: Email, sentAt: string, subject: string): Promise<{ thread: ThreadRow; created: boolean }> {
  let providerKey: string | null = message.providerThreadId ? `${mailbox.id}:${message.providerThreadId}` : null;
  if (!providerKey) {
    // An imported file joins the thread of the message it answers, when that message is here.
    const ids = [parsed.inReplyTo, ...(parsed.references ?? '').split(/\s+/)].map((id) => id?.trim()).filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      const { mailMessages } = await graphql<{ mailMessages: { thread: ThreadRow }[] }>(`query ($ids: [String!]) { mailMessages(where: { internetMessageId: { in: $ids } }, limit: 1) { thread { ${THREAD_FIELDS} } } }`, { ids });
      if (mailMessages[0]) return { thread: mailMessages[0].thread, created: false };
    }
    providerKey = `${mailbox.id}:import-${createHash('sha256').update(parsed.messageId ?? message.raw).digest('hex').slice(0, 32)}`;
  }
  const { mailThreads } = await graphql<{ mailThreads: ThreadRow[] }>(`query ($key: String!) { mailThreads(where: { providerKey: { eq: $key } }, limit: 1) { ${THREAD_FIELDS} } }`, { key: providerKey });
  if (mailThreads[0]) return { thread: mailThreads[0], created: false };
  const { mailThread_insert } = await graphql<{ mailThread_insert: { id: string } }>(
    `mutation ($mailboxId: UUID!, $key: String!, $subject: String, $at: Timestamp!) { mailThread_insert(data: { mailboxId: $mailboxId, providerKey: $key, subject: $subject, firstAt: $at, lastAt: $at, audience: owner, messageCount: 0 }) }`,
    { mailboxId: mailbox.id, key: providerKey, subject: subject.slice(0, 300) || null, at: sentAt },
  );
  return { thread: { id: mailThread_insert.id, audience: 'owner', category: null, messageCount: 0, firstAt: sentAt, lastAt: sentAt, lastInboundAt: null, lastOutboundAt: null }, created: true };
}

/** Links a thread (and message) to a record once; returns whether a link was added. */
export async function linkThread(threadId: string, messageId: string | null, entityType: string, entityId: string, basis: 'reference' | 'thread' | 'sender' | 'model' | 'person', uid: string | null): Promise<boolean> {
  const { mailLinks } = await graphql<{ mailLinks: { id: string }[] }>(
    `query ($threadId: UUID!, $entityType: String!, $entityId: String!) { mailLinks(where: { thread: { id: { eq: $threadId } }, entityType: { eq: $entityType }, entityId: { eq: $entityId } }, limit: 1) { id } }`,
    { threadId, entityType, entityId },
  );
  if (mailLinks[0]) return false;
  await graphql(
    `mutation ($threadId: UUID!, $messageId: UUID, $entityType: String!, $entityId: String!, $basis: MailLinkBasis!, $uid: String) { mailLink_insert(data: { threadId: $threadId, messageId: $messageId, entityType: $entityType, entityId: $entityId, basis: $basis, createdByUid: $uid }) }`,
    { threadId, messageId, entityType, entityId, basis, uid },
  );
  return true;
}

/** A timeline entry on a record; mail written by nobody in the platform has no actor. */
export async function recordTimeline(entityType: string, entityId: string, kind: string, summary: string, actorUid: string | null): Promise<void> {
  await graphql(
    `mutation ($entityType: String!, $entityId: String!, $kind: String!, $actorUid: String, $payload: Any) {
      timelineEvent_insert(data: { entityType: $entityType, entityId: $entityId, kind: $kind, actorUid: $actorUid, payload: $payload }) }`,
    { entityType, entityId, kind, actorUid, payload: { summary } },
  );
}

export async function ingestMessage(mailbox: Mailbox, message: IncomingMessage): Promise<IngestResult> {
  const providerKey = `${mailbox.id}:${message.providerMessageId}`;
  const { mailMessages: already } = await graphql<{ mailMessages: { id: string; state: string }[] }>(`query ($key: String!) { mailMessages(where: { providerKey: { eq: $key } }, limit: 1) { id state } }`, { key: providerKey });
  if (already[0]) return { messageId: already[0].id, created: false, state: already[0].state };

  const parsed = await PostalMime.parse(message.raw, { attachmentEncoding: 'arraybuffer' });
  const from = mailboxesOf(parsed.from ? [parsed.from] : [])[0] ?? { name: '', address: 'unknown@invalid' };
  const to = mailboxesOf(parsed.to);
  const cc = mailboxesOf(parsed.cc);
  const subject = (parsed.subject ?? '').trim();
  const parsedDate = parsed.date ? new Date(parsed.date) : null;
  const sentAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
  const outbound = message.labelIds.includes('SENT') || from.address === normaliseAddress(mailbox.address);
  const bodyText = (parsed.text?.trim() || (parsed.html ? htmlToText(parsed.html) : '')).slice(0, 200_000);
  const headers: Record<string, string> = {};
  for (const entry of parsed.headers) if (KEPT_HEADERS.includes(entry.key)) headers[entry.key] = entry.value.slice(0, 500);
  const attachments = parsed.attachments.filter((attachment) => attachment.disposition !== 'inline' || !attachment.related);

  const { thread, created: threadCreated } = await threadFor(mailbox, message, parsed, sentAt, subject);

  // Who the message is with: the sender when it came in, the first recipient when it went out.
  const counterpart = outbound ? (to[0]?.address ?? '') : from.address;
  let decision: SortDecision;
  let sender: { contactId: string | null; companyId: string | null; roles: string[]; name: string } = { contactId: null, companyId: null, roles: [], name: '' };
  let references: { entityType: string; entityId: string }[] = [];
  try {
    const contacts = await knownContacts();
    const resolved = resolveSender(counterpart, contacts.map((contact) => ({ contactId: contact.id, companyId: contact.company.id, email: contact.email! })));
    const company = resolved.companyId ? contacts.find((contact) => contact.company.id === resolved.companyId)?.company : undefined;
    sender = { contactId: resolved.contactId, companyId: resolved.companyId, roles: company?.companyRoles_on_company.map((role) => role.kind) ?? [], name: company?.legalName ?? '' };
    references = await referencesIn([subject, bodyText, ...attachments.map((attachment) => attachment.filename ?? '')].join('\n'));
    const rule = firstMatchingRule(await mailRules(), { fromAddress: counterpart, subject, headers: headers as MailHeaders });
    decision = sortByFacts({
      fromAddress: from.address,
      subject,
      headers: headers as MailHeaders,
      senderCompanyRoles: sender.roles,
      senderKnown: Boolean(resolved.companyId),
      references,
      thread: threadCreated ? null : { category: isMailCategory(thread.category) ? thread.category : null, audience: thread.audience },
      rule,
    });
  } catch (error) {
    console.error('mail: sorting failed, kept for the owner', error);
    decision = { category: 'other', audience: 'owner', ownerRole: 'owner', state: 'needs_review', basis: 'none', skipModel: false };
  }
  // A message never opens its thread wider than the thread already is.
  const audience = threadCreated ? decision.audience : combineAudiences(decision.audience, thread.audience);
  const state = outbound ? 'done' : decision.state;

  const { mailMessage_insert } = await graphql<{ mailMessage_insert: { id: string } }>(
    `mutation ($data: MailMessage_Data!) { mailMessage_insert(data: $data) }`,
    {
      data: {
        mailboxId: mailbox.id,
        threadId: thread.id,
        providerKey,
        providerMessageId: message.providerMessageId.slice(0, 40),
        internetMessageId: parsed.messageId?.slice(0, 300) ?? null,
        inReplyTo: parsed.inReplyTo?.slice(0, 300) ?? null,
        direction: outbound ? 'outbound' : 'inbound',
        fromAddress: from.address.slice(0, 255),
        fromName: from.name?.slice(0, 200) || null,
        to,
        cc,
        replyTo: mailboxesOf(parsed.replyTo)[0]?.address.slice(0, 255) ?? null,
        subject: subject.slice(0, 300) || null,
        sentAt,
        snippet: snippetOf(trimQuoted(bodyText), 290) || null,
        bodyText: bodyText || null,
        hasHtml: Boolean(parsed.html),
        headers,
        contactId: sender.contactId,
        companyId: sender.companyId,
        audience,
        state,
        category: decision.category,
        ownerRole: decision.ownerRole,
        flags: { skipModel: decision.skipModel },
        attachmentCount: attachments.length,
      },
    },
  );
  const messageId = mailMessage_insert.id;

  // Bytes go to Storage where it is enabled; Gmail keeps them either way.
  const rawPath = await store(`mail/${mailbox.id}/${messageId}.eml`, message.raw, 'message/rfc822');
  if (rawPath) await graphql(`mutation ($id: UUID!, $path: String!) { mailMessage_update(id: $id, data: { rawPath: $path }) }`, { id: messageId, path: rawPath });
  for (const [position, attachment] of attachments.entries()) {
    const bytes = attachment.content instanceof ArrayBuffer ? new Uint8Array(attachment.content) : typeof attachment.content === 'string' ? Buffer.from(attachment.content) : attachment.content;
    const filename = (attachment.filename ?? `attachment-${position + 1}`).replace(/[\\/]/g, '_').slice(0, 255);
    const storagePath = await store(`mail/${mailbox.id}/${messageId}/${position}-${filename}`, bytes, attachment.mimeType || 'application/octet-stream');
    await graphql(
      `mutation ($messageId: UUID!, $position: Int!, $filename: String!, $mimeType: String!, $size: Int!, $checksum: String!, $path: String) {
        mailAttachment_insert(data: { messageId: $messageId, position: $position, filename: $filename, mimeType: $mimeType, sizeBytes: $size, checksum: $checksum, storagePath: $path }) }`,
      { messageId, position, filename, mimeType: (attachment.mimeType || 'application/octet-stream').slice(0, 120), size: bytes.byteLength, checksum: createHash('sha256').update(bytes).digest('hex'), path: storagePath },
    );
  }

  await graphql(
    `mutation ($messageId: UUID!, $category: String!, $audience: MailAudience!, $ownerRole: Role, $basis: String!) {
      mailClassification_insert(data: { messageId: $messageId, method: rules, category: $category, audience: $audience, ownerRole: $ownerRole, basis: $basis }) }`,
    { messageId, category: decision.category, audience, ownerRole: decision.ownerRole, basis: decision.basis },
  );

  // Links: every record the message names, and the sender's company.
  const linked: { entityType: string; entityId: string }[] = [];
  for (const reference of references) if (await linkThread(thread.id, messageId, reference.entityType, reference.entityId, 'reference', null)) linked.push(reference);
  if (sender.companyId) await linkThread(thread.id, messageId, companyEntity(sender.roles), sender.companyId, 'sender', null);
  for (const reference of linked) {
    await recordTimeline(reference.entityType, reference.entityId, outbound ? 'mail_sent' : 'mail_received', `Mail ${outbound ? 'sent' : 'received'}: ${subject.slice(0, 160) || '(no subject)'}`, null);
  }

  const threadCategory = thread.category && thread.category !== 'other' ? thread.category : decision.category;
  const later = (a: string | null, b: string) => (!a || b > a ? b : a);
  await graphql(
    `mutation ($id: UUID!, $lastAt: Timestamp!, $lastInboundAt: Timestamp, $lastOutboundAt: Timestamp, $audience: MailAudience!, $category: String, $count: Int!) {
      mailThread_update(id: $id, data: { lastAt: $lastAt, lastInboundAt: $lastInboundAt, lastOutboundAt: $lastOutboundAt, audience: $audience, category: $category, messageCount: $count }) }`,
    {
      id: thread.id,
      lastAt: later(thread.lastAt, sentAt),
      lastInboundAt: outbound ? thread.lastInboundAt : later(thread.lastInboundAt, sentAt),
      lastOutboundAt: outbound ? later(thread.lastOutboundAt, sentAt) : thread.lastOutboundAt,
      audience: threadCreated ? audience : combineAudiences(thread.audience, audience),
      category: threadCategory,
      count: thread.messageCount + 1,
    },
  );
  await emit('mail.received', 'mail_message', messageId, { direction: outbound ? 'outbound' : 'inbound', category: decision.category as MailCategory, audience, references: linked.length });
  return { messageId, created: true, state };
}

