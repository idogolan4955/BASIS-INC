import {
  ENTITY_MODULE,
  MAIL_AUDIENCES,
  MAIL_CATEGORY_KEYS,
  MAIL_CATEGORIES,
  ROLES,
  audienceFloorForParty,
  canReadAudience,
  combineAudiences,
  isAtLeastAsRestrictive,
  moduleAccess,
  normaliseAddress,
  sortByFacts,
  type MailAudience,
  type Role,
} from '@basis/shared';
import { getStorage } from 'firebase-admin/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, type CallableFunction, type CallableRequest } from 'firebase-functions/v2/https';
import PostalMime from 'postal-mime';
import { z } from 'zod';
import { REGION, audit, callerOf, failure, graphql, requireRole, type Caller } from './lib';
import { createInquiryRecord } from './intake';
import { MAIL_SECRETS, checkMailbox, mailSecretsPresent, mailSettings, rawMessage, readSince } from './mail/imap';
import { companyEntity, existingNumbers, ingestMessage, linkThread, recordTimeline, type Mailbox } from './mail/ingest';

// Module 19, Mail (docs/MAIL_PLAN.md, slice 1): the mailbox connection and
// its sync, imports of saved messages, and what a person does from a message.
// Every read of a message checks its audience first; every action runs with
// the caller's role, through the same paths the rest of the platform uses.

const IMPORT_ADDRESS = 'imported@mail.basis';

// ---------------------------------------------------------------- mailboxes

interface MailboxRow extends Mailbox {
  readonly state: string;
  /** The IMAP cursor, `<uidValidity>:<last uid read>`. */
  readonly historyId: string | null;
}

const MAILBOX_FIELDS = 'id address provider state historyId';

async function mailboxByAddress(address: string): Promise<MailboxRow | null> {
  const { mailMailboxes } = await graphql<{ mailMailboxes: MailboxRow[] }>(`query ($address: String!) { mailMailboxes(where: { address: { eq: $address } }, limit: 1) { ${MAILBOX_FIELDS} } }`, { address: normaliseAddress(address) });
  return mailMailboxes[0] ?? null;
}

async function syncedMailbox(): Promise<MailboxRow | null> {
  const { mailMailboxes } = await graphql<{ mailMailboxes: MailboxRow[] }>(`query { mailMailboxes(where: { provider: { eq: "gmail" }, state: { eq: connected } }, limit: 1) { ${MAILBOX_FIELDS} } }`);
  return mailMailboxes[0] ?? null;
}

async function importMailbox(uid: string): Promise<Mailbox> {
  const existing = await mailboxByAddress(IMPORT_ADDRESS);
  if (existing) return existing;
  const { mailMailbox_insert } = await graphql<{ mailMailbox_insert: { id: string } }>(`mutation ($address: String!, $uid: String!) { mailMailbox_insert(data: { address: $address, provider: "import", state: connected, connectedByUid: $uid }) }`, { address: IMPORT_ADDRESS, uid });
  return { id: mailMailbox_insert.id, address: IMPORT_ADDRESS, provider: 'import' };
}

async function recordSync(mailboxId: string, data: { historyId?: string; lastError: string | null }): Promise<void> {
  await graphql(
    data.historyId
      ? `mutation ($id: UUID!, $historyId: String, $lastError: String) { mailMailbox_update(id: $id, data: { historyId: $historyId, lastError: $lastError, lastSyncAt_expr: "request.time" }) }`
      : `mutation ($id: UUID!, $lastError: String) { mailMailbox_update(id: $id, data: { lastError: $lastError, lastSyncAt_expr: "request.time" }) }`,
    { id: mailboxId, lastError: data.lastError, ...(data.historyId ? { historyId: data.historyId } : {}) },
  );
}

/** Messages read per run; a longer history is read over the following runs. */
const PER_RUN = 400;

/** Reads what arrived after the cursor and stores it; the cursor moves only past what was stored. */
async function syncMailbox(mailbox: MailboxRow, days = 7): Promise<{ stored: number; seen: number }> {
  let stored = 0;
  const result = await readSince(mailbox.address, mailbox.historyId, days, PER_RUN, async (message) => {
    const ingested = await ingestMessage(mailbox, { providerMessageId: message.id, providerThreadId: message.threadId, labelIds: message.labelIds, internalDate: message.internalDate, raw: message.raw });
    if (ingested.created) stored += 1;
  });
  await recordSync(mailbox.id, { historyId: result.cursor, lastError: result.failed === 0 ? null : 'A message could not be stored; the next sync tries it again.' });
  return { stored, seen: result.seen };
}

const connectInput = z.object({ backfillDays: z.union([z.literal(0), z.literal(30), z.literal(90)]).default(30) });

export const connectMailbox = onCall({ region: REGION, secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Connecting the mailbox');
  const { backfillDays } = connectInput.parse(request.data ?? {});
  const settings = await mailSettings();
  if (!settings.address) throw failure('validation', 'Enter the mailbox address in Settings › Connectors › Mail first.');
  const address = normaliseAddress(settings.address);
  await checkMailbox(address);
  let mailbox = await mailboxByAddress(address);
  if (!mailbox) {
    const { mailMailbox_insert } = await graphql<{ mailMailbox_insert: { id: string } }>(`mutation ($address: String!, $uid: String!) { mailMailbox_insert(data: { address: $address, provider: "gmail", state: connected, connectedByUid: $uid }) }`, { address, uid: caller.uid });
    mailbox = { id: mailMailbox_insert.id, address, provider: 'gmail', state: 'connected', historyId: null };
  } else {
    await graphql(`mutation ($id: UUID!) { mailMailbox_update(id: $id, data: { state: connected }) }`, { id: mailbox.id });
  }
  // The first run brings in the history asked for; the scheduled sync reads the rest of it and everything after.
  const { stored, seen } = await syncMailbox(mailbox, backfillDays);
  await audit(caller.uid, 'mail.connect', 'mail_mailbox', mailbox.id, null, { address, backfillDays, stored });
  return { mailboxId: mailbox.id, address, stored, more: seen >= PER_RUN };
});

export const disconnectMailbox = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Disconnecting the mailbox');
  const mailbox = await syncedMailbox();
  if (!mailbox) throw failure('not_found', 'No mailbox is connected.');
  await graphql(`mutation ($id: UUID!) { mailMailbox_update(id: $id, data: { state: disconnected }) }`, { id: mailbox.id });
  await audit(caller.uid, 'mail.disconnect', 'mail_mailbox', mailbox.id, { state: 'connected' }, { state: 'disconnected' });
  return { mailboxId: mailbox.id };
});

export const syncMailboxNow = onCall({ region: REGION, secrets: MAIL_SECRETS, timeoutSeconds: 540, memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Syncing the mailbox');
  const mailbox = await syncedMailbox();
  if (!mailbox) throw failure('not_found', 'No mailbox is connected.');
  try {
    return await syncMailbox(mailbox);
  } catch (error) {
    await recordSync(mailbox.id, { lastError: (error as Error).message.slice(0, 500) });
    throw error;
  }
});

export const mailStatus = onCall({ region: REGION, secrets: MAIL_SECRETS }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Reading the mailbox status');
  return { secrets: mailSecretsPresent(), emulator: Boolean(process.env['FUNCTIONS_EMULATOR']) };
});

/** Every five minutes: read what arrived since the last run. */
export const syncMail = onSchedule({ region: REGION, schedule: 'every 5 minutes', secrets: MAIL_SECRETS, timeoutSeconds: 300, memory: '512MiB' }, async () => {
  const mailbox = await syncedMailbox();
  if (!mailbox) return;
  try {
    await syncMailbox(mailbox);
  } catch (error) {
    await recordSync(mailbox.id, { lastError: (error as Error).message.slice(0, 500) });
  }
});

const importInput = z.object({ filename: z.string().max(255).default('message.eml'), base64: z.string().min(1).max(14_000_000) });

/** A message saved from another mailbox, as an .eml file: stored and sorted like synced mail. */
export const importMailMessage = onCall({ region: REGION, timeoutSeconds: 120, memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Importing mail');
  const parsed = importInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Choose an .eml file of at most 10 MB.');
  const raw = Buffer.from(parsed.data.base64, 'base64');
  const probe = await PostalMime.parse(raw).catch(() => null);
  if (!probe || !probe.from) throw failure('validation', 'That file is not an email message.');
  const mailbox = await importMailbox(caller.uid);
  const { createHash } = await import('node:crypto');
  const providerMessageId = createHash('sha256').update(probe.messageId ?? raw).digest('hex').slice(0, 40);
  const result = await ingestMessage(mailbox, { providerMessageId, providerThreadId: null, labelIds: [], internalDate: null, raw });
  if (result.created) await audit(caller.uid, 'mail.import', 'mail_message', result.messageId, null, { filename: parsed.data.filename });
  return result;
});

// ---------------------------------------------------------------- reading a message the caller may see

interface MessageRow {
  readonly id: string;
  readonly audience: MailAudience;
  readonly state: string;
  readonly category: string | null;
  readonly direction: string;
  readonly fromAddress: string;
  readonly fromName: string | null;
  readonly subject: string | null;
  readonly sentAt: string;
  readonly bodyText: string | null;
  readonly providerMessageId: string;
  readonly mailbox: { readonly id: string; readonly provider: string; readonly address: string };
  readonly thread: { readonly id: string; readonly audience: MailAudience };
  readonly contact: { readonly id: string } | null;
  readonly company: { readonly id: string; readonly legalName: string; readonly companyRoles_on_company: { readonly kind: string }[] } | null;
}

async function readableMessage(caller: Caller, id: string): Promise<MessageRow> {
  const { mailMessage } = await graphql<{ mailMessage: MessageRow | null }>(
    `query ($id: UUID!) { mailMessage(id: $id) { id audience state category direction fromAddress fromName subject sentAt bodyText providerMessageId mailbox { id provider address } thread { id audience } contact { id } company { id legalName companyRoles_on_company { kind } } } }`,
    { id },
  );
  // A message outside the caller's audience does not exist for them.
  if (!mailMessage || !canReadAudience(caller.role, mailMessage.audience)) throw failure('not_found', 'No such message.');
  return mailMessage;
}

const canAct = (role: Role) => moduleAccess(role, 'mail') === 'manage' || moduleAccess(role, 'mail') === 'limited';

async function recordAction(messageId: string, audience: MailAudience, kind: string, uid: string, target: { type: string; id: string } | null, payload: unknown, result: { type: string; id: string } | null): Promise<string> {
  const { mailAction_insert } = await graphql<{ mailAction_insert: { id: string } }>(
    `mutation ($messageId: UUID!, $kind: String!, $targetType: String, $targetId: String, $payload: Any, $audience: MailAudience!, $resultType: String, $resultId: String, $uid: String!) {
      mailAction_insert(data: { messageId: $messageId, kind: $kind, targetType: $targetType, targetId: $targetId, payload: $payload, audience: $audience, state: accepted, resultType: $resultType, resultId: $resultId, decidedByUid: $uid, decidedAt_expr: "request.time", version: 1 }) }`,
    { messageId, kind, targetType: target?.type ?? null, targetId: target?.id ?? null, payload: payload ?? null, audience, resultType: result?.type ?? null, resultId: result?.id ?? null, uid },
  );
  return mailAction_insert.id;
}

/** True when the record exists: platform numbers by number, companies by id. */
async function recordExists(entityType: string, entityId: string): Promise<boolean> {
  if (entityType === 'supplier' || entityType === 'customer') {
    const { company } = await graphql<{ company: { id: string } | null }>(`query ($id: UUID!) { company(id: $id) { id } }`, { id: entityId }).catch(() => ({ company: null }));
    return Boolean(company);
  }
  if (!(entityType in TARGETS)) return false;
  return (await existingNumbers(entityType as keyof typeof TARGETS, [entityId])).has(entityId);
}

const TARGETS = {
  purchase_order: 1,
  production_run: 1,
  lot: 1,
  inspection: 1,
  corrective_action: 1,
  shipment: 1,
  receipt: 1,
  sales_order: 1,
  quote: 1,
  development_product: 1,
  inquiry: 1,
} as const;

const target = z.object({ entityType: z.enum(['purchase_order', 'production_run', 'lot', 'inspection', 'corrective_action', 'shipment', 'receipt', 'sales_order', 'quote', 'development_product', 'inquiry', 'supplier', 'customer']), entityId: z.string().trim().min(1).max(80) });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const actInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('link_record'), messageId: z.string().min(1), target }),
  z.object({ kind: z.literal('create_task'), messageId: z.string().min(1), title: z.string().trim().min(1).max(200), details: z.string().max(2000).default(''), dueOn: date.nullable().default(null), assigneeUid: z.string().max(128).nullable().default(null), target: target.nullable().default(null) }),
  z.object({ kind: z.literal('create_inquiry'), messageId: z.string().min(1), inquiryKind: z.enum(['sample_request', 'wholesale', 'contact']), name: z.string().trim().min(1).max(160), company: z.string().trim().max(200).default(''), country: z.string().trim().max(120).default('') }),
  z.object({ kind: z.literal('log_interaction'), messageId: z.string().min(1), customerId: z.string().min(1), summary: z.string().trim().min(1).max(4000), nextStep: z.string().max(200).default(''), nextOn: date.nullable().default(null), taskForNextStep: z.boolean().default(false) }),
  z.object({ kind: z.literal('file_attachment'), messageId: z.string().min(1), attachmentId: z.string().min(1), documentKind: z.enum(['commercial_invoice', 'packing_list', 'bill_of_lading', 'air_waybill', 'certificate_of_origin', 'certificate', 'inspection_report', 'technical_sheet', 'quotation', 'purchase_order', 'contract', 'photo', 'other']), title: z.string().trim().min(1).max(200), target }),
  z.object({ kind: z.literal('create_company'), messageId: z.string().min(1), legalName: z.string().trim().min(1).max(200), role: z.enum(['supplier', 'odm', 'customer', 'freight_forwarder', 'customs_broker', 'carrier', 'inspection_agency']), contactName: z.string().trim().min(1).max(160), countryCode: z.string().length(2).nullable().default(null) }),
  z.object({ kind: z.literal('mark_done'), messageId: z.string().min(1) }),
  z.object({ kind: z.literal('ignore'), messageId: z.string().min(1) }),
  z.object({ kind: z.literal('reopen'), messageId: z.string().min(1) }),
]);


/** The callable functions run as the caller, with their own role checks. */
async function runAs<T>(caller: Caller, name: string, data: unknown): Promise<T> {
  const functions = (await import('./index')) as unknown as Record<string, CallableFunction<unknown, unknown>>;
  const synthetic = { data, auth: { uid: caller.uid, token: { role: caller.role, ...(caller.email ? { email: caller.email } : {}) } }, acceptsStreaming: false } as unknown as CallableRequest<unknown>;
  return (await functions[name]!.run(synthetic)) as T;
}

function requireModule(caller: Caller, entityType: string, action: string): void {
  const module = ENTITY_MODULE[entityType];
  const level = module ? moduleAccess(caller.role, module) : 'none';
  if (level !== 'manage' && level !== 'limited') throw failure('forbidden', `${action} is not available to the ${caller.role} role.`);
}

export const actOnMail = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  if (!canAct(caller.role)) throw failure('forbidden', `Acting on mail is not available to the ${caller.role} role.`);
  const parsed = actInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', parsed.error.issues[0]?.message ?? 'Check the fields.');
  const input = parsed.data;
  const message = await readableMessage(caller, input.messageId);
  const subject = message.subject ?? '(no subject)';

  switch (input.kind) {
    case 'link_record': {
      requireModule(caller, input.target.entityType, 'Linking mail to this record');
      if (!(await recordExists(input.target.entityType, input.target.entityId))) throw failure('not_found', `No ${input.target.entityType.replace(/_/g, ' ')} ${input.target.entityId}.`);
      const added = await linkThread(message.thread.id, message.id, input.target.entityType, input.target.entityId, 'person', caller.uid);
      if (added) await recordTimeline(input.target.entityType, input.target.entityId, 'mail_linked', `Mail linked: ${subject.slice(0, 160)}`, caller.uid);
      const id = await recordAction(message.id, message.audience, input.kind, caller.uid, { type: input.target.entityType, id: input.target.entityId }, null, null);
      await audit(caller.uid, 'mail.link', 'mail_message', message.id, null, input.target);
      return { actionId: id, linked: added };
    }
    case 'create_task': {
      requireRole(caller, ['owner', 'operations', 'purchasing', 'qc', 'logistics', 'sales', 'marketing', 'finance'], 'Creating tasks');
      if (input.target) {
        if (!(await recordExists(input.target.entityType, input.target.entityId))) throw failure('not_found', 'That record does not exist.');
      }
      if (input.assigneeUid) {
        const { user } = await graphql<{ user: { uid: string; role: Role } | null }>(`query ($uid: String!) { user(key: { uid: $uid }) { uid role } }`, { uid: input.assigneeUid });
        if (!user) throw failure('not_found', 'No such person.');
        // A task must not point someone at mail they may not read.
        if (!canReadAudience(user.role, message.audience) && !input.target) throw failure('invariant_violation', 'That person cannot read this message; attach the task to a record they can open.');
      }
      const { task_insert } = await graphql<{ task_insert: { id: string } }>(
        `mutation ($title: String!, $details: String, $assigneeUid: String, $dueOn: Date, $entityType: String, $entityId: String, $uid: String!) {
          task_insert(data: { title: $title, details: $details, assigneeUid: $assigneeUid, dueOn: $dueOn, state: open, entityType: $entityType, entityId: $entityId, createdByUid: $uid }) }`,
        { title: input.title, details: [input.details.trim(), `From mail: ${subject}`].filter(Boolean).join('\n\n'), assigneeUid: input.assigneeUid, dueOn: input.dueOn, entityType: input.target?.entityType ?? 'mail_message', entityId: input.target?.entityId ?? message.id, uid: caller.uid },
      );
      if (input.target) {
        await linkThread(message.thread.id, message.id, input.target.entityType, input.target.entityId, 'person', caller.uid);
        await recordTimeline(input.target.entityType, input.target.entityId, 'task_created', `Task from mail: ${input.title}`, caller.uid);
      }
      const id = await recordAction(message.id, message.audience, input.kind, caller.uid, input.target ? { type: input.target.entityType, id: input.target.entityId } : null, { title: input.title, dueOn: input.dueOn }, { type: 'task', id: task_insert.id });
      await audit(caller.uid, 'mail.task', 'mail_message', message.id, null, { taskId: task_insert.id, title: input.title });
      return { actionId: id, taskId: task_insert.id };
    }
    case 'create_inquiry': {
      requireRole(caller, ['owner', 'operations', 'sales', 'marketing'], 'Opening inquiries');
      const reference = await createInquiryRecord(
        { kind: input.inquiryKind, name: input.name, company: input.company || null, email: message.fromAddress, phone: null, country: input.country || null, customerType: null, topic: subject.slice(0, 80), message: (message.bodyText ?? '').slice(0, 4000) || null, details: {}, context: { page: 'mail' } },
        'email',
        message.id,
      );
      await linkThread(message.thread.id, message.id, 'inquiry', reference, 'person', caller.uid);
      // An inquiry is commercial mail: the message and its thread open to the commercial roles at least as far as they are already open.
      const audience = message.audience === 'owner' ? 'commercial' : message.audience;
      if (audience !== message.audience) await setAudience(message, audience, 'customer_inquiry');
      await graphql(
        `mutation ($messageId: UUID!, $audience: MailAudience!, $uid: String!) { mailClassification_insert(data: { messageId: $messageId, method: person, category: "customer_inquiry", audience: $audience, ownerRole: sales, basis: "inquiry", createdByUid: $uid }) }`,
        { messageId: message.id, audience, uid: caller.uid },
      );
      await graphql(`mutation ($id: UUID!) { mailMessage_update(id: $id, data: { category: "customer_inquiry", ownerRole: sales, state: sorted }) }`, { id: message.id });
      // Replies in the thread now inherit the inquiry's category.
      await graphql(`mutation ($id: UUID!) { mailThread_update(id: $id, data: { category: "customer_inquiry" }) }`, { id: message.thread.id });
      const id = await recordAction(message.id, audience, input.kind, caller.uid, null, { inquiryKind: input.inquiryKind }, { type: 'inquiry', id: reference });
      await audit(caller.uid, 'mail.inquiry', 'mail_message', message.id, null, { reference });
      return { actionId: id, reference };
    }
    case 'log_interaction': {
      const result = await runAs<{ id: string; taskId: string | null }>(caller, 'logInteraction', {
        customerId: input.customerId,
        ...(message.contact && message.company?.id === input.customerId ? { contactId: message.contact.id } : {}),
        kind: 'email',
        occurredAt: new Date(message.sentAt).toISOString(),
        summary: input.summary,
        nextStep: input.nextStep,
        nextOn: input.nextOn,
        taskForNextStep: input.taskForNextStep,
      });
      await linkThread(message.thread.id, message.id, 'customer', input.customerId, 'person', caller.uid);
      const id = await recordAction(message.id, message.audience, input.kind, caller.uid, { type: 'customer', id: input.customerId }, { summary: input.summary.slice(0, 200) }, { type: 'interaction', id: result.id });
      return { actionId: id, interactionId: result.id, taskId: result.taskId };
    }
    case 'file_attachment': {
      const documents = moduleAccess(caller.role, 'documents');
      if (documents !== 'manage' && documents !== 'limited') throw failure('forbidden', `Filing documents is not available to the ${caller.role} role.`);
      requireModule(caller, input.target.entityType, 'Filing on this record');
      if (!(await recordExists(input.target.entityType, input.target.entityId))) throw failure('not_found', 'That record does not exist.');
      const { mailAttachment } = await graphql<{ mailAttachment: { id: string; filename: string; mimeType: string; sizeBytes: number; checksum: string | null; storagePath: string | null; message: { id: string }; document: { id: string } | null } | null }>(
        `query ($id: UUID!) { mailAttachment(id: $id) { id filename mimeType sizeBytes checksum storagePath message { id } document { id } } }`,
        { id: input.attachmentId },
      );
      if (!mailAttachment || mailAttachment.message.id !== message.id) throw failure('not_found', 'No such attachment on this message.');
      if (mailAttachment.document) throw failure('conflict', 'This attachment is already filed.');
      const { document_insert } = await graphql<{ document_insert: { id: string } }>(
        `mutation ($kind: DocumentKind!, $title: String!, $issuedOn: Date!, $storagePath: String!, $mimeType: String!, $size: Int!, $checksum: String, $uid: String!) {
          document_insert(data: { kind: $kind, title: $title, issuedOn: $issuedOn, storagePath: $storagePath, mimeType: $mimeType, sizeBytes: $size, checksum: $checksum, uploadedByUid: $uid }) }`,
        { kind: input.documentKind, title: input.title, issuedOn: message.sentAt.slice(0, 10), storagePath: mailAttachment.storagePath ?? `mail://attachment/${mailAttachment.id}`, mimeType: mailAttachment.mimeType, size: mailAttachment.sizeBytes, checksum: mailAttachment.checksum, uid: caller.uid },
      );
      await graphql(`mutation ($documentId: UUID!, $entityType: String!, $entityId: String!) { documentLink_insert(data: { documentId: $documentId, entityType: $entityType, entityId: $entityId, role: "mail" }) }`, { documentId: document_insert.id, ...input.target });
      await graphql(`mutation ($id: UUID!, $documentId: UUID!) { mailAttachment_update(id: $id, data: { documentId: $documentId }) }`, { id: mailAttachment.id, documentId: document_insert.id });
      await linkThread(message.thread.id, message.id, input.target.entityType, input.target.entityId, 'person', caller.uid);
      await recordTimeline(input.target.entityType, input.target.entityId, 'document_filed', `${input.title} filed from mail`, caller.uid);
      const id = await recordAction(message.id, message.audience, input.kind, caller.uid, { type: input.target.entityType, id: input.target.entityId }, { attachmentId: mailAttachment.id, documentKind: input.documentKind }, { type: 'document', id: document_insert.id });
      await audit(caller.uid, 'document.file', 'document', document_insert.id, null, { from: 'mail', messageId: message.id, ...input.target });
      return { actionId: id, documentId: document_insert.id };
    }
    case 'create_company': {
      requireRole(caller, ['owner', 'operations', 'purchasing', 'sales'], 'Adding companies');
      if (message.company) throw failure('conflict', `The sender already belongs to ${message.company.legalName}.`);
      const { contacts: existing } = await graphql<{ contacts: { company: { legalName: string } }[] }>(`query ($email: String!) { contacts(where: { email: { eq: $email } }, limit: 1) { company { legalName } } }`, { email: message.fromAddress });
      if (existing[0]) throw failure('conflict', `${message.fromAddress} is already a contact of ${existing[0].company.legalName}.`);
      const { company_insert } = await graphql<{ company_insert: { id: string } }>(`mutation ($legalName: String!, $countryCode: String) { company_insert(data: { legalName: $legalName, countryCode: $countryCode, status: prospect }) }`, { legalName: input.legalName, countryCode: input.countryCode });
      await graphql(`mutation ($companyId: UUID!, $kind: CompanyRoleKind!) { companyRole_insert(data: { companyId: $companyId, kind: $kind }) }`, { companyId: company_insert.id, kind: input.role });
      const { contact_insert } = await graphql<{ contact_insert: { id: string } }>(
        `mutation ($companyId: UUID!, $name: String!, $email: String!) { contact_insert(data: { companyId: $companyId, name: $name, email: $email, isPrimary: true, status: active }) }`,
        { companyId: company_insert.id, name: input.contactName, email: message.fromAddress },
      );
      // Every message from this address now belongs to the company, and its floor applies to them.
      const floor = audienceFloorForParty([input.role]);
      const { mailMessages } = await graphql<{ mailMessages: MessageRow[] }>(
        `query ($address: String!) { mailMessages(where: { fromAddress: { eq: $address }, companyId: { isNull: true } }, limit: 500) { id audience state category direction fromAddress fromName subject sentAt bodyText providerMessageId mailbox { id provider address } thread { id audience } contact { id } company { id legalName companyRoles_on_company { kind } } } }`,
        { address: message.fromAddress },
      );
      // Knowing the company sorts what was unsorted: only the owner opens such mail
      // to the company's department; anyone else can only keep mail closer.
      const bySender = sortByFacts({ fromAddress: message.fromAddress, subject: '', headers: {}, senderCompanyRoles: [input.role], senderKnown: true, references: [], thread: null, rule: null });
      for (const row of mailMessages) {
        await graphql(`mutation ($id: UUID!, $companyId: UUID!, $contactId: UUID!) { mailMessage_update(id: $id, data: { companyId: $companyId, contactId: $contactId }) }`, { id: row.id, companyId: company_insert.id, contactId: contact_insert.id });
        if (row.category === 'other' && caller.role === 'owner') {
          await graphql(
            `mutation ($id: UUID!, $category: String!, $ownerRole: Role, $state: MailState!) { mailMessage_update(id: $id, data: { category: $category, ownerRole: $ownerRole, state: $state }) }`,
            { id: row.id, category: bySender.category, ownerRole: bySender.ownerRole, state: row.state === 'needs_review' ? 'sorted' : row.state },
          );
          await graphql(
            `mutation ($messageId: UUID!, $category: String!, $audience: MailAudience!, $ownerRole: Role, $uid: String!) { mailClassification_insert(data: { messageId: $messageId, method: person, category: $category, audience: $audience, ownerRole: $ownerRole, basis: "sender", createdByUid: $uid }) }`,
            { messageId: row.id, category: bySender.category, audience: bySender.audience, ownerRole: bySender.ownerRole, uid: caller.uid },
          );
          await graphql(`mutation ($id: UUID!, $category: String!) { mailThread_update(id: $id, data: { category: $category }) }`, { id: row.thread.id, category: bySender.category });
          await setAudience(row, bySender.audience, null);
        } else if (floor) {
          const next = combineAudiences(row.audience, floor);
          if (next !== row.audience) await setAudience(row, next, null);
        }
        await linkThread(row.thread.id, row.id, companyEntity([input.role]), company_insert.id, 'sender', caller.uid);
      }
      const id = await recordAction(message.id, message.category === 'other' && caller.role === 'owner' ? bySender.audience : floor ? combineAudiences(message.audience, floor) : message.audience, input.kind, caller.uid, null, { legalName: input.legalName, role: input.role }, { type: companyEntity([input.role]), id: company_insert.id });
      await audit(caller.uid, 'company.create', 'company', company_insert.id, null, { legalName: input.legalName, role: input.role, from: 'mail' });
      return { actionId: id, companyId: company_insert.id };
    }
    case 'mark_done':
    case 'ignore':
    case 'reopen': {
      const state = input.kind === 'mark_done' ? 'done' : input.kind === 'ignore' ? 'ignored' : message.category === 'other' ? 'needs_review' : 'sorted';
      await graphql(
        state === 'done' || state === 'ignored'
          ? `mutation ($id: UUID!, $state: MailState!, $uid: String!) { mailMessage_update(id: $id, data: { state: $state, handledByUid: $uid, handledAt_expr: "request.time" }) }`
          : `mutation ($id: UUID!, $state: MailState!, $uid: String!) { mailMessage_update(id: $id, data: { state: $state, handledByUid: $uid, handledAt: null }) }`,
        { id: message.id, state, uid: caller.uid },
      );
      const id = await recordAction(message.id, message.audience, input.kind, caller.uid, null, null, null);
      await audit(caller.uid, `mail.${input.kind}`, 'mail_message', message.id, { state: message.state }, { state });
      return { actionId: id, state };
    }
  }
});

// ---------------------------------------------------------------- sorting by a person

async function setAudience(message: Pick<MessageRow, 'id' | 'thread'>, audience: MailAudience, category: string | null): Promise<void> {
  await graphql(
    category
      ? `mutation ($id: UUID!, $audience: MailAudience!, $category: String) { mailMessage_update(id: $id, data: { audience: $audience, category: $category }) }`
      : `mutation ($id: UUID!, $audience: MailAudience!) { mailMessage_update(id: $id, data: { audience: $audience }) }`,
    { id: message.id, audience, ...(category ? { category } : {}) },
  );
  const { mailThread } = await graphql<{ mailThread: { audience: MailAudience; mailMessages_on_thread: { audience: MailAudience }[] } | null }>(`query ($id: UUID!) { mailThread(id: $id) { audience mailMessages_on_thread(limit: 500) { audience } } }`, { id: message.thread.id });
  if (mailThread) {
    const threadAudience = combineAudiences(...mailThread.mailMessages_on_thread.map((row) => row.audience));
    await graphql(`mutation ($id: UUID!, $audience: MailAudience!) { mailThread_update(id: $id, data: { audience: $audience }) }`, { id: message.thread.id, audience: threadAudience });
  }
}

const sortInput = z.object({
  messageId: z.string().min(1),
  category: z.enum(MAIL_CATEGORY_KEYS as [string, ...string[]]),
  audience: z.enum(MAIL_AUDIENCES),
  ownerRole: z.enum(ROLES).nullable().default(null),
});

export const sortMailMessage = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner', 'operations'], 'Sorting mail');
  const parsed = sortInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', 'Choose a category and who may read it.');
  const input = parsed.data;
  const message = await readableMessage(caller, input.messageId);
  // Only the owner opens mail wider; anyone else may only narrow it, and never past what the sender's company requires.
  const floor = audienceFloorForParty(message.company?.companyRoles_on_company.map((role) => role.kind) ?? []);
  if (caller.role !== 'owner' && !isAtLeastAsRestrictive(input.audience, message.audience)) throw failure('forbidden', 'Only the owner can open a message to more people.');
  if (caller.role !== 'owner' && !canReadAudience(caller.role, input.audience)) throw failure('forbidden', 'You could no longer read the message with that audience.');
  if (floor && !isAtLeastAsRestrictive(input.audience, floor) && caller.role !== 'owner') throw failure('invariant_violation', 'The sender is a company whose mail stays with its department.');
  const ownerRole = input.ownerRole ?? MAIL_CATEGORIES[input.category as keyof typeof MAIL_CATEGORIES].ownerRole;
  await graphql(
    `mutation ($messageId: UUID!, $category: String!, $audience: MailAudience!, $ownerRole: Role, $uid: String!) {
      mailClassification_insert(data: { messageId: $messageId, method: person, category: $category, audience: $audience, ownerRole: $ownerRole, createdByUid: $uid }) }`,
    { messageId: message.id, category: input.category, audience: input.audience, ownerRole, uid: caller.uid },
  );
  const state = message.state === 'needs_review' || message.state === 'received' ? 'sorted' : message.state;
  await graphql(`mutation ($id: UUID!, $category: String!, $ownerRole: Role, $state: MailState!) { mailMessage_update(id: $id, data: { category: $category, ownerRole: $ownerRole, state: $state }) }`, { id: message.id, category: input.category, ownerRole, state });
  await graphql(`mutation ($id: UUID!, $category: String!) { mailThread_update(id: $id, data: { category: $category }) }`, { id: message.thread.id, category: input.category });
  await setAudience(message, input.audience, null);
  await audit(caller.uid, 'mail.sort', 'mail_message', message.id, { category: message.category, audience: message.audience }, { category: input.category, audience: input.audience, ownerRole });
  return { messageId: message.id, audience: input.audience, category: input.category };
});

// ---------------------------------------------------------------- the owner's rules

const ruleInput = z.object({
  id: z.string().optional(),
  match: z
    .object({ fromAddress: z.string().trim().max(255).optional(), fromDomain: z.string().trim().max(255).optional(), subjectContains: z.string().trim().max(200).optional(), listId: z.string().trim().max(255).optional() })
    .refine((match) => Object.values(match).some((value) => value), 'A rule needs at least one condition.'),
  category: z.enum(MAIL_CATEGORY_KEYS as [string, ...string[]]).nullable().default(null),
  audience: z.enum(MAIL_AUDIENCES).nullable().default(null),
  ownerRole: z.enum(ROLES).nullable().default(null),
  skipModel: z.boolean().default(false),
  ignore: z.boolean().default(false),
  sort: z.number().int().min(0).max(10_000).default(100),
  archive: z.boolean().default(false),
});

export const saveMailRule = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, ['owner'], 'Changing mail rules');
  const parsed = ruleInput.safeParse(request.data);
  if (!parsed.success) throw failure('validation', parsed.error.issues[0]?.message ?? 'Check the rule.');
  const { id, archive, ...rule } = parsed.data;
  const match = Object.fromEntries(Object.entries(rule.match).filter(([, value]) => value));
  if (id && archive) {
    await graphql(`mutation ($id: UUID!) { mailRule_update(id: $id, data: { archivedAt_expr: "request.time" }) }`, { id });
    await audit(caller.uid, 'mail.rule.archive', 'mail_rule', id, null, null);
    return { id };
  }
  const variables = { match, category: rule.category, audience: rule.audience, ownerRole: rule.ownerRole, skipModel: rule.skipModel, ignore: rule.ignore, sort: rule.sort };
  if (id) {
    await graphql(`mutation ($id: UUID!, $match: Any!, $category: String, $audience: MailAudience, $ownerRole: Role, $skipModel: Boolean!, $ignore: Boolean!, $sort: Int!) { mailRule_update(id: $id, data: { match: $match, category: $category, audience: $audience, ownerRole: $ownerRole, skipModel: $skipModel, ignore: $ignore, sort: $sort }) }`, { id, ...variables });
    await audit(caller.uid, 'mail.rule.update', 'mail_rule', id, null, variables);
    return { id };
  }
  const { mailRule_insert } = await graphql<{ mailRule_insert: { id: string } }>(
    `mutation ($match: Any!, $category: String, $audience: MailAudience, $ownerRole: Role, $skipModel: Boolean!, $ignore: Boolean!, $sort: Int!, $uid: String!) { mailRule_insert(data: { match: $match, category: $category, audience: $audience, ownerRole: $ownerRole, skipModel: $skipModel, ignore: $ignore, sort: $sort, createdByUid: $uid }) }`,
    { ...variables, uid: caller.uid },
  );
  await audit(caller.uid, 'mail.rule.create', 'mail_rule', mailRule_insert.id, null, variables);
  return { id: mailRule_insert.id };
});

// ---------------------------------------------------------------- attachments

/** An attachment's bytes, after the same audience check as the message: from Storage when kept there, otherwise read again from Gmail. */
export const getMailAttachment = onCall({ region: REGION, secrets: MAIL_SECRETS, memory: '512MiB' }, async (request) => {
  const caller = callerOf(request);
  const { id } = z.object({ id: z.string().min(1) }).parse(request.data);
  const { mailAttachment } = await graphql<{ mailAttachment: { id: string; position: number; filename: string; mimeType: string; storagePath: string | null; message: { id: string } } | null }>(
    `query ($id: UUID!) { mailAttachment(id: $id) { id position filename mimeType storagePath message { id } } }`,
    { id },
  );
  if (!mailAttachment) throw failure('not_found', 'No such attachment.');
  const message = await readableMessage(caller, mailAttachment.message.id);
  let bytes: Buffer;
  if (mailAttachment.storagePath) {
    [bytes] = await getStorage().bucket().file(mailAttachment.storagePath).download();
  } else if (message.mailbox.provider === 'gmail') {
    const raw = await rawMessage(message.mailbox.address, message.providerMessageId);
    if (!raw) throw failure('not_found', 'Gmail no longer has this message.');
    const parsed = await PostalMime.parse(raw, { attachmentEncoding: 'arraybuffer' });
    const attachments = parsed.attachments.filter((attachment) => attachment.disposition !== 'inline' || !attachment.related);
    const found = attachments[mailAttachment.position];
    if (!found) throw failure('not_found', 'Gmail no longer has this attachment.');
    bytes = Buffer.from(found.content instanceof ArrayBuffer ? new Uint8Array(found.content) : (found.content as Uint8Array));
  } else {
    throw failure('invariant_violation', 'This message was imported before Storage was enabled, so its attachments were not kept. Import the file again once Storage is on.');
  }
  if (bytes.length > 9_000_000) throw failure('invariant_violation', 'The attachment is larger than the platform can hand over; open it in Gmail.');
  return { filename: mailAttachment.filename, mimeType: mailAttachment.mimeType, base64: bytes.toString('base64') };
});
