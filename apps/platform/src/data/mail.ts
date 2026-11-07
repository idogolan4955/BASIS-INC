import { FUNCTION_NAMES, audiencesFor, isMailAudience, type MailAudience, type MailRuleView, type Role } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { useRequiredSession } from '../session';
import { isSample } from './source';

// Module 19, Mail. A role reads only the audiences it may: live mode calls
// one connector read per audience (each with its own @auth) and merges them;
// sample mode serves typed sample mail. Writes go through the mail functions.

export interface MailAddress {
  readonly name: string;
  readonly address: string;
}

export interface MailLinkView {
  readonly entityType: string;
  readonly entityId: string;
}

export interface MailRow {
  readonly id: string;
  readonly direction: 'inbound' | 'outbound';
  readonly fromAddress: string;
  readonly fromName: string;
  readonly subject: string;
  readonly snippet: string;
  readonly sentAt: string;
  readonly state: string;
  readonly category: string;
  readonly ownerRole: Role | null;
  readonly audience: MailAudience;
  readonly attachmentCount: number;
  readonly companyId: string | null;
  readonly companyName: string;
  readonly contactName: string;
  readonly threadId: string;
  readonly messageCount: number;
  readonly links: readonly MailLinkView[];
  readonly openProposals: number;
}

export interface MailAttachmentView {
  readonly id: string;
  readonly position: number;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly documentId: string | null;
  readonly documentTitle: string;
}

export interface MailClassificationView {
  readonly id: string;
  readonly method: 'rules' | 'model' | 'person';
  readonly category: string;
  readonly audience: MailAudience;
  readonly ownerRole: Role | null;
  readonly basis: string;
  readonly summary: string;
  readonly createdAt: string;
}

export interface MailActionView {
  readonly id: string;
  readonly kind: string;
  readonly targetType: string | null;
  readonly targetId: string | null;
  readonly state: string;
  readonly resultType: string | null;
  readonly resultId: string | null;
  readonly decidedAt: string | null;
}

export interface MailThreadMessage {
  readonly id: string;
  readonly direction: 'inbound' | 'outbound';
  readonly fromAddress: string;
  readonly fromName: string;
  readonly snippet: string;
  readonly sentAt: string;
}

export interface MailDetail extends MailRow {
  readonly to: readonly MailAddress[];
  readonly cc: readonly MailAddress[];
  readonly replyTo: string;
  readonly bodyText: string;
  readonly hasHtml: boolean;
  readonly receivedAt: string;
  readonly mailboxAddress: string;
  readonly mailboxProvider: string;
  readonly companyRoles: readonly string[];
  readonly contactId: string | null;
  readonly attachments: readonly MailAttachmentView[];
  readonly classifications: readonly MailClassificationView[];
  readonly actions: readonly MailActionView[];
  readonly thread: {
    readonly id: string;
    readonly subject: string;
    readonly messageCount: number;
    readonly lastInboundAt: string | null;
    readonly lastOutboundAt: string | null;
    readonly links: readonly (MailLinkView & { readonly id: string; readonly basis: string })[];
    readonly messages: readonly MailThreadMessage[];
  };
}

export interface MailThreadLinkView {
  readonly linkId: string;
  readonly basis: string;
  readonly threadId: string;
  readonly subject: string;
  readonly lastAt: string;
  readonly messageCount: number;
  readonly latest: MailThreadMessage | null;
}

export interface MailboxView {
  readonly id: string;
  readonly address: string;
  readonly provider: string;
  readonly state: string;
  readonly historyId: string;
  readonly watchExpiresAt: string | null;
  readonly lastSyncAt: string | null;
  readonly lastError: string;
}

export interface MailStatusView {
  readonly secrets: readonly { readonly name: string; readonly present: boolean }[];
  readonly topic: string;
  readonly emulator: boolean;
}

async function sample() {
  return (await import('./sample-mail')).sampleMail;
}

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}

const addresses = (value: unknown): MailAddress[] => (Array.isArray(value) ? (value as MailAddress[]).filter((entry) => entry && typeof entry.address === 'string') : []);

/* eslint-disable @typescript-eslint/no-explicit-any -- one mapper for five identically shaped generated results */
function rowOf(row: any): MailRow {
  return {
    id: row.id,
    direction: row.direction,
    fromAddress: row.fromAddress,
    fromName: row.fromName ?? '',
    subject: row.subject ?? '',
    snippet: row.snippet ?? '',
    sentAt: row.sentAt,
    state: row.state,
    category: row.category ?? 'other',
    ownerRole: row.ownerRole ?? null,
    audience: row.audience,
    attachmentCount: row.attachmentCount ?? row.mailAttachments_on_message?.length ?? 0,
    companyId: row.company?.id ?? null,
    companyName: row.company ? row.company.tradingName || row.company.legalName : '',
    contactName: row.contact?.name ?? '',
    threadId: row.thread.id,
    messageCount: row.thread.messageCount,
    links: (row.thread.mailLinks_on_thread ?? []).map((link: any) => ({ entityType: link.entityType, entityId: link.entityId })),
    openProposals: (row.mailActions_on_message ?? []).filter((action: any) => !action.state || action.state === 'proposed').length,
  };
}

function detailOf(row: any): MailDetail {
  return {
    ...rowOf(row),
    to: addresses(row.to),
    cc: addresses(row.cc),
    replyTo: row.replyTo ?? '',
    bodyText: row.bodyText ?? '',
    hasHtml: row.hasHtml,
    receivedAt: row.receivedAt,
    mailboxAddress: row.mailbox.address,
    mailboxProvider: row.mailbox.provider,
    companyRoles: row.company?.companyRoles_on_company?.map((role: any) => role.kind) ?? [],
    contactId: row.contact?.id ?? null,
    attachments: row.mailAttachments_on_message.map((attachment: any) => ({ id: attachment.id, position: attachment.position, filename: attachment.filename, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, documentId: attachment.document?.id ?? null, documentTitle: attachment.document?.title ?? '' })),
    classifications: row.mailClassifications_on_message.map((entry: any) => ({ id: entry.id, method: entry.method, category: entry.category, audience: entry.audience, ownerRole: entry.ownerRole ?? null, basis: entry.basis ?? '', summary: entry.summary ?? '', createdAt: entry.createdAt })),
    actions: row.mailActions_on_message.map((action: any) => ({ id: action.id, kind: action.kind, targetType: action.targetType ?? null, targetId: action.targetId ?? null, state: action.state, resultType: action.resultType ?? null, resultId: action.resultId ?? null, decidedAt: action.decidedAt ?? null })),
    thread: {
      id: row.thread.id,
      subject: row.thread.subject ?? '',
      messageCount: row.thread.messageCount,
      lastInboundAt: row.thread.lastInboundAt ?? null,
      lastOutboundAt: row.thread.lastOutboundAt ?? null,
      links: row.thread.mailLinks_on_thread.map((link: any) => ({ id: link.id, entityType: link.entityType, entityId: link.entityId, basis: link.basis })),
      messages: row.thread.mailMessages_on_thread.map((message: any) => ({ id: message.id, direction: message.direction, fromAddress: message.fromAddress, fromName: message.fromName ?? '', snippet: message.snippet ?? '', sentAt: message.sentAt })),
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type Live = Awaited<ReturnType<typeof live>>;

const LIST: Record<MailAudience, (l: Live) => Promise<MailRow[]>> = {
  general: async ({ dc, sdk }) => (await sdk.listMailGeneral(dc)).data.mailMessages.map(rowOf),
  commercial: async ({ dc, sdk }) => (await sdk.listMailCommercial(dc)).data.mailMessages.map(rowOf),
  supply: async ({ dc, sdk }) => (await sdk.listMailSupply(dc)).data.mailMessages.map(rowOf),
  logistics: async ({ dc, sdk }) => (await sdk.listMailLogistics(dc)).data.mailMessages.map(rowOf),
  owner: async ({ dc, sdk }) => (await sdk.listMailOwner(dc)).data.mailMessages.map(rowOf),
};

const GET: Record<MailAudience, (l: Live, id: string) => Promise<MailDetail | null>> = {
  general: async ({ dc, sdk }, id) => (await sdk.getMailGeneral(dc, { id })).data.mailMessages.map(detailOf)[0] ?? null,
  commercial: async ({ dc, sdk }, id) => (await sdk.getMailCommercial(dc, { id })).data.mailMessages.map(detailOf)[0] ?? null,
  supply: async ({ dc, sdk }, id) => (await sdk.getMailSupply(dc, { id })).data.mailMessages.map(detailOf)[0] ?? null,
  logistics: async ({ dc, sdk }, id) => (await sdk.getMailLogistics(dc, { id })).data.mailMessages.map(detailOf)[0] ?? null,
  owner: async ({ dc, sdk }, id) => (await sdk.getMailOwner(dc, { id })).data.mailMessages.map(detailOf)[0] ?? null,
};

/* eslint-disable @typescript-eslint/no-explicit-any -- same shape across the five reads */
const threadLinkOf = (link: any): MailThreadLinkView => ({
  linkId: link.id,
  basis: link.basis,
  threadId: link.thread.id,
  subject: link.thread.subject ?? '',
  lastAt: link.thread.lastAt,
  messageCount: link.thread.messageCount,
  latest: link.thread.mailMessages_on_thread[0] ? { ...link.thread.mailMessages_on_thread[0], fromName: link.thread.mailMessages_on_thread[0].fromName ?? '', snippet: link.thread.mailMessages_on_thread[0].snippet ?? '' } : null,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const FOR: Record<MailAudience, (l: Live, entityType: string, entityId: string) => Promise<MailThreadLinkView[]>> = {
  general: async ({ dc, sdk }, entityType, entityId) => (await sdk.listMailForGeneral(dc, { entityType, entityId })).data.mailLinks.map(threadLinkOf),
  commercial: async ({ dc, sdk }, entityType, entityId) => (await sdk.listMailForCommercial(dc, { entityType, entityId })).data.mailLinks.map(threadLinkOf),
  supply: async ({ dc, sdk }, entityType, entityId) => (await sdk.listMailForSupply(dc, { entityType, entityId })).data.mailLinks.map(threadLinkOf),
  logistics: async ({ dc, sdk }, entityType, entityId) => (await sdk.listMailForLogistics(dc, { entityType, entityId })).data.mailLinks.map(threadLinkOf),
  owner: async ({ dc, sdk }, entityType, entityId) => (await sdk.listMailForOwner(dc, { entityType, entityId })).data.mailLinks.map(threadLinkOf),
};

export function useMail() {
  const session = useRequiredSession();
  return useQuery({
    queryKey: ['mail', 'list', session.role],
    queryFn: async (): Promise<MailRow[]> => {
      if (isSample) return (await sample()).list(session.role);
      const l = await live();
      const parts = await Promise.all(audiencesFor(session.role).map((audience) => LIST[audience](l)));
      return parts.flat().sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    },
  });
}

export function useMailMessage(id: string) {
  const session = useRequiredSession();
  return useQuery({
    queryKey: ['mail', 'message', id, session.role],
    queryFn: async (): Promise<MailDetail | null> => {
      if (isSample) return (await sample()).get(id, session.role);
      const l = await live();
      for (const audience of audiencesFor(session.role)) {
        const found = await GET[audience](l, id);
        if (found) return found;
      }
      return null;
    },
  });
}

export function useMailFor(entityType: string, entityId: string) {
  const session = useRequiredSession();
  return useQuery({
    queryKey: ['mail', 'for', entityType, entityId, session.role],
    enabled: Boolean(entityId),
    queryFn: async (): Promise<MailThreadLinkView[]> => {
      if (isSample) return (await sample()).forRecord(entityType, entityId, session.role);
      const l = await live();
      const parts = await Promise.all(audiencesFor(session.role).map((audience) => FOR[audience](l, entityType, entityId)));
      const byThread = new Map(parts.flat().map((link) => [link.threadId, link]));
      return [...byThread.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    },
  });
}

export function useMailRules(enabled = true) {
  return useQuery({
    queryKey: ['mail', 'rules'],
    enabled,
    queryFn: async (): Promise<MailRuleView[]> => {
      if (isSample) return (await sample()).rules();
      const { dc, sdk } = await live();
      const { data } = await sdk.listMailRules(dc);
      return data.mailRules.map((rule) => ({
        id: rule.id,
        match: (rule.match ?? {}) as MailRuleView['match'],
        category: (rule.category ?? null) as MailRuleView['category'],
        audience: isMailAudience(rule.audience) ? rule.audience : null,
        ownerRole: (rule.ownerRole ?? null) as Role | null,
        skipModel: rule.skipModel,
        ignore: rule.ignore,
        sort: rule.sort,
      }));
    },
  });
}

export function useMailboxes(enabled = true) {
  return useQuery({
    queryKey: ['mail', 'mailboxes'],
    enabled,
    queryFn: async (): Promise<MailboxView[]> => {
      if (isSample) return (await sample()).mailboxes();
      const { dc, sdk } = await live();
      const { data } = await sdk.listMailMailboxes(dc);
      return data.mailMailboxes.map((mailbox) => ({ id: mailbox.id, address: mailbox.address, provider: mailbox.provider, state: mailbox.state, historyId: mailbox.historyId ?? '', watchExpiresAt: mailbox.watchExpiresAt ?? null, lastSyncAt: mailbox.lastSyncAt ?? null, lastError: mailbox.lastError ?? '' }));
    },
  });
}

export function useMailStatus(enabled = true) {
  return useQuery({
    queryKey: ['mail', 'status'],
    enabled,
    retry: false,
    queryFn: async (): Promise<MailStatusView | null> => {
      if (isSample) return { secrets: [{ name: 'GMAIL_CLIENT_SECRET', present: false }, { name: 'GMAIL_REFRESH_TOKEN', present: false }], topic: 'projects/basis-inc/topics/gmail-mail', emulator: false };
      try {
        return await callFunction<Record<string, never>, MailStatusView>(FUNCTION_NAMES.mailStatus, {});
      } catch {
        // The functions are not deployed yet: the screen says so instead of failing.
        return null;
      }
    },
  });
}

export type MailActInput =
  | { kind: 'link_record'; messageId: string; target: MailLinkView }
  | { kind: 'create_task'; messageId: string; title: string; details: string; dueOn: string | null; assigneeUid: string | null; target: MailLinkView | null }
  | { kind: 'create_inquiry'; messageId: string; inquiryKind: 'sample_request' | 'wholesale' | 'contact'; name: string; company: string; country: string }
  | { kind: 'log_interaction'; messageId: string; customerId: string; summary: string; nextStep: string; nextOn: string | null; taskForNextStep: boolean }
  | { kind: 'file_attachment'; messageId: string; attachmentId: string; documentKind: string; title: string; target: MailLinkView }
  | { kind: 'create_company'; messageId: string; legalName: string; role: string; contactName: string; countryCode: string | null }
  | { kind: 'mark_done' | 'ignore' | 'reopen'; messageId: string };

function useMailMutation<TInput>(run: (input: TInput, role: Role) => Promise<unknown>) {
  const client = useQueryClient();
  const session = useRequiredSession();
  return useMutation({
    mutationFn: (input: TInput) => run(input, session.role),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['mail'] });
      // An action may have created a task, an inquiry, a document or a company.
      await Promise.all(['tasks', 'inquiries', 'documents', 'parties', 'timeline', 'gateway', 'relationships'].map((key) => client.invalidateQueries({ queryKey: [key] })));
    },
  });
}

export function useActOnMail() {
  return useMailMutation<MailActInput>(async (input, role) => (isSample ? (await sample()).act(input, role) : callFunction(FUNCTION_NAMES.actOnMail, input)));
}

export function useSortMail() {
  return useMailMutation<{ messageId: string; category: string; audience: MailAudience; ownerRole: Role | null }>(async (input, role) => (isSample ? (await sample()).sort(input, role) : callFunction(FUNCTION_NAMES.sortMailMessage, input)));
}

export function useSaveMailRule() {
  return useMailMutation<Partial<MailRuleView> & { match: MailRuleView['match']; archive?: boolean }>(async (input) => (isSample ? (await sample()).saveRule(input) : callFunction(FUNCTION_NAMES.saveMailRule, input)));
}

export function useImportMail() {
  return useMailMutation<{ filename: string; base64: string }>(async (input, role) => (isSample ? (await sample()).importFile(input, role) : callFunction(FUNCTION_NAMES.importMailMessage, input)));
}

export function useConnectMailbox() {
  return useMailMutation<{ backfillDays: 0 | 30 | 90 }>(async (input) => {
    if (isSample) throw new Error('Sample mode has no mailbox to connect.');
    return callFunction(FUNCTION_NAMES.connectMailbox, input);
  });
}

export function useSyncMailbox() {
  return useMailMutation<Record<string, never>>(async () => {
    if (isSample) throw new Error('Sample mode has no mailbox to sync.');
    return callFunction(FUNCTION_NAMES.syncMailboxNow, {});
  });
}

export function useDisconnectMailbox() {
  return useMailMutation<Record<string, never>>(async () => {
    if (isSample) throw new Error('Sample mode has no mailbox to disconnect.');
    return callFunction(FUNCTION_NAMES.disconnectMailbox, {});
  });
}

/** An attachment's bytes after the function's audience check. */
export async function fetchMailAttachment(id: string): Promise<{ blob: Blob; filename: string }> {
  if (isSample) {
    const text = `Sample mode keeps no attachment bytes.\n`;
    return { blob: new Blob([text], { type: 'text/plain' }), filename: 'sample-attachment.txt' };
  }
  const result = await callFunction<{ id: string }, { filename: string; mimeType: string; base64: string }>(FUNCTION_NAMES.getMailAttachment, { id });
  const bytes = Uint8Array.from(atob(result.base64), (char) => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: result.mimeType }), filename: result.filename };
}
