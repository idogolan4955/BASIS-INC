import { MAIL_CATEGORIES, canReadAudience, combineAudiences, isMailCategory, type MailAudience, type MailRuleView, type Role } from '@basis/shared';
import type { MailActInput, MailActionView, MailDetail, MailRow, MailThreadLinkView, MailboxView } from './mail';

// Sample mail for design review: the companies, orders and shipments of the
// other sample stores, sorted the way the facts would sort them. Changes made
// in sample mode live until the page is reloaded.

const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();

interface Seed {
  readonly id: string;
  readonly threadId: string;
  readonly direction: 'inbound' | 'outbound';
  readonly fromAddress: string;
  readonly fromName: string;
  readonly to: { name: string; address: string }[];
  readonly subject: string;
  readonly body: string;
  readonly hoursAgo: number;
  readonly state: string;
  readonly category: string;
  readonly audience: MailAudience;
  readonly companyId: string | null;
  readonly companyName: string;
  readonly companyRoles: string[];
  readonly contactName: string;
  readonly attachments: { filename: string; mimeType: string; sizeBytes: number }[];
  readonly links: { entityType: string; entityId: string; basis: string }[];
  readonly basis: string;
}

const MAILBOX = 'basisinc25@gmail.com';
const ido = { name: 'BASIS INC.', address: MAILBOX };

const seeds: Seed[] = [
  {
    id: 'mail-1', threadId: 'thr-1', direction: 'inbound', fromAddress: 'mei.lin@example.invalid', fromName: 'Lin Mei', to: [ido],
    subject: 'PO-26-0041 dyeing: Skin 02 lab dip and new finish date',
    body: 'Dear Ido,\n\nThe second lab dip for Skin 02 is attached; we matched it under D65 and TL84.\n\nBecause the dyehouse is full this week, dyeing for PO-26-0041 will finish on 18 November instead of 12 November. Finishing and inspection follow the same week.\n\nPlease confirm the lab dip so we can start bulk.\n\nBest regards,\nLin Mei\nExport manager, Jinyu Knitting',
    hoursAgo: 5, state: 'sorted', category: 'supplier_correspondence', audience: 'supply', companyId: 'co-jinyu', companyName: 'Jinyu Knitting', companyRoles: ['supplier', 'factory_operator'], contactName: 'Lin Mei',
    attachments: [{ filename: 'LabDip_SK02_round2.jpg', mimeType: 'image/jpeg', sizeBytes: 412_000 }],
    links: [{ entityType: 'purchase_order', entityId: 'PO-26-0041', basis: 'reference' }, { entityType: 'supplier', entityId: 'co-jinyu', basis: 'sender' }], basis: 'sender',
  },
  {
    id: 'mail-2', threadId: 'thr-1', direction: 'outbound', fromAddress: MAILBOX, fromName: 'BASIS INC.', to: [{ name: 'Lin Mei', address: 'mei.lin@example.invalid' }],
    subject: 'Re: PO-26-0041 dyeing: Skin 02 lab dip and new finish date',
    body: 'Thank you, Lin Mei. We will review the lab dip today and answer by tomorrow morning.\n\nIdo',
    hoursAgo: 3, state: 'done', category: 'supplier_correspondence', audience: 'supply', companyId: 'co-jinyu', companyName: 'Jinyu Knitting', companyRoles: ['supplier', 'factory_operator'], contactName: 'Lin Mei',
    attachments: [], links: [], basis: 'thread',
  },
  {
    id: 'mail-3', threadId: 'thr-2', direction: 'inbound', fromAddress: 'q.sun@example.invalid', fromName: 'Sun Qing', to: [ido],
    subject: 'Booking confirmed SHP-26-0014 Ningbo to Hamburg, MSC vessel ETD 21 Nov',
    body: 'Dear customer,\n\nYour LCL booking for SHP-26-0014 is confirmed. Vessel MSC Aurora, ETD Ningbo 21 Nov, ETA Hamburg 22 Dec. Cargo cut-off 18 Nov 12:00.\n\nPlease find the draft bill of lading attached for your check.\n\nSun Qing\nMarlin Logistics',
    hoursAgo: 26, state: 'sorted', category: 'logistics', audience: 'logistics', companyId: 'co-marlin', companyName: 'Marlin Logistics', companyRoles: ['freight_forwarder'], contactName: 'Sun Qing',
    attachments: [{ filename: 'Draft_BL_SHP-26-0014.pdf', mimeType: 'application/pdf', sizeBytes: 188_000 }],
    links: [{ entityType: 'shipment', entityId: 'SHP-26-0014', basis: 'reference' }, { entityType: 'supplier', entityId: 'co-marlin', basis: 'sender' }], basis: 'sender',
  },
  {
    id: 'mail-4', threadId: 'thr-3', direction: 'inbound', fromAddress: 'claire@example.invalid', fromName: 'Claire Vautrin', to: [ido],
    subject: 'Reorder: Powermesh Skin 02, 300 m for the spring collection',
    body: 'Bonjour Ido,\n\nWe would like to reorder Powermesh in Skin 02, around 300 metres, delivered to Paris before the end of January. Could you send a quotation with the current lead time?\n\nMerci,\nClaire\nMaison Avelline',
    hoursAgo: 40, state: 'sorted', category: 'customer_correspondence', audience: 'commercial', companyId: 'co-avelline', companyName: 'Maison Avelline', companyRoles: ['customer'], contactName: 'Claire Vautrin',
    attachments: [], links: [{ entityType: 'customer', entityId: 'co-avelline', basis: 'sender' }], basis: 'sender',
  },
  {
    id: 'mail-5', threadId: 'thr-4', direction: 'inbound', fromAddress: 'studio@lumiere-bridal.example', fromName: 'Hila Ben-David', to: [ido],
    subject: 'Samples of your illusion mesh?',
    body: 'Hello,\n\nI run a bridal studio in Haifa and saw your illusion stretch mesh on Instagram. Can you send a sample card with the skin shades? We make about 40 gowns a year.\n\nThank you,\nHila Ben-David\nLumière Bridal Studio',
    hoursAgo: 8, state: 'needs_review', category: 'other', audience: 'owner', companyId: null, companyName: '', companyRoles: [], contactName: '',
    attachments: [], links: [], basis: 'none',
  },
  {
    id: 'mail-6', threadId: 'thr-5', direction: 'inbound', fromAddress: 'news@bridalfair.example', fromName: 'Bridal Fabric Fair', to: [ido],
    subject: 'Exhibitor registration for March is open',
    body: 'Registration for the spring fair is now open. Early-bird stands until 15 December.\n\nUnsubscribe: https://bridalfair.example/unsubscribe',
    hoursAgo: 30, state: 'ignored', category: 'newsletter', audience: 'general', companyId: null, companyName: '', companyRoles: [], contactName: '',
    attachments: [], links: [], basis: 'noise',
  },
  {
    id: 'mail-7', threadId: 'thr-6', direction: 'inbound', fromAddress: 'alerts@bank.example', fromName: 'Bank', to: [ido],
    subject: 'Your monthly statement is ready',
    body: 'Your statement for October is available in online banking.',
    hoursAgo: 50, state: 'sorted', category: 'finance_admin', audience: 'owner', companyId: null, companyName: '', companyRoles: [], contactName: '',
    attachments: [], links: [], basis: 'rule',
  },
];

interface Store {
  messages: MailDetail[];
  rules: MailRuleView[];
  sequence: number;
}

function build(): Store {
  const messages = seeds.map<MailDetail>((seed) => ({
    id: seed.id,
    direction: seed.direction,
    fromAddress: seed.fromAddress,
    fromName: seed.fromName,
    subject: seed.subject,
    snippet: seed.body.replace(/\s+/g, ' ').slice(0, 200),
    sentAt: ago(seed.hoursAgo),
    state: seed.state,
    category: seed.category,
    ownerRole: isMailCategory(seed.category) ? MAIL_CATEGORIES[seed.category].ownerRole : null,
    audience: seed.audience,
    attachmentCount: seed.attachments.length,
    companyId: seed.companyId,
    companyName: seed.companyName,
    contactName: seed.contactName,
    threadId: seed.threadId,
    messageCount: 0,
    links: [],
    openProposals: 0,
    to: seed.to,
    cc: [],
    replyTo: '',
    bodyText: seed.body,
    hasHtml: false,
    receivedAt: ago(seed.hoursAgo),
    mailboxAddress: MAILBOX,
    mailboxProvider: 'gmail',
    companyRoles: seed.companyRoles,
    contactId: seed.companyId ? `${seed.companyId}-contact` : null,
    attachments: seed.attachments.map((attachment, position) => ({ id: `${seed.id}-att-${position}`, position, ...attachment, documentId: null, documentTitle: '' })),
    classifications: [{ id: `${seed.id}-cls`, method: seed.basis === 'rule' ? 'rules' : 'rules', category: seed.category, audience: seed.audience, ownerRole: isMailCategory(seed.category) ? MAIL_CATEGORIES[seed.category].ownerRole : null, basis: seed.basis, summary: '', createdAt: ago(seed.hoursAgo) }],
    actions: [],
    thread: { id: seed.threadId, subject: seed.subject, messageCount: 0, lastInboundAt: null, lastOutboundAt: null, links: [], messages: [] },
  }));
  const store: Store = {
    messages,
    rules: [{ id: 'rule-bank', match: { fromDomain: 'bank.example' }, category: 'finance_admin', audience: 'owner', ownerRole: 'owner', skipModel: true, ignore: false, sort: 10 }],
    sequence: 1,
  };
  for (const seed of seeds) for (const link of seed.links) addLink(store, seed.threadId, link.entityType, link.entityId, link.basis);
  refreshThreads(store);
  return store;
}

function addLink(store: Store, threadId: string, entityType: string, entityId: string, basis: string): boolean {
  const first = store.messages.find((message) => message.threadId === threadId);
  if (!first || first.thread.links.some((link) => link.entityType === entityType && link.entityId === entityId)) return false;
  const links = [...first.thread.links, { id: `link-${store.sequence++}`, entityType, entityId, basis }];
  store.messages = store.messages.map((message) => (message.threadId === threadId ? { ...message, thread: { ...message.thread, links } } : message));
  return true;
}

function refreshThreads(store: Store): void {
  store.messages = store.messages.map((message) => {
    const thread = store.messages.filter((entry) => entry.threadId === message.threadId).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    const lastInbound = thread.filter((entry) => entry.direction === 'inbound').at(-1)?.sentAt ?? null;
    const lastOutbound = thread.filter((entry) => entry.direction === 'outbound').at(-1)?.sentAt ?? null;
    return {
      ...message,
      messageCount: thread.length,
      links: message.thread.links.map(({ entityType, entityId }) => ({ entityType, entityId })),
      thread: {
        ...message.thread,
        subject: thread[0]?.subject ?? message.subject,
        messageCount: thread.length,
        lastInboundAt: lastInbound,
        lastOutboundAt: lastOutbound,
        messages: thread.map((entry) => ({ id: entry.id, direction: entry.direction, fromAddress: entry.fromAddress, fromName: entry.fromName, snippet: entry.snippet, sentAt: entry.sentAt })),
      },
    };
  });
}

let store: Store | null = null;
const current = () => (store ??= build());

const rowOf = (message: MailDetail): MailRow => {
  const { to: _to, cc: _cc, replyTo: _replyTo, bodyText: _body, hasHtml: _html, receivedAt: _received, mailboxAddress: _box, mailboxProvider: _provider, companyRoles: _roles, contactId: _contact, attachments: _attachments, classifications: _classifications, actions: _actions, thread: _thread, ...row } = message;
  return row;
};

function update(id: string, change: (message: MailDetail) => MailDetail): void {
  const s = current();
  s.messages = s.messages.map((message) => (message.id === id ? change(message) : message));
}

function record(message: MailDetail, kind: string, target: { entityType: string; entityId: string } | null, result: { type: string; id: string } | null): MailActionView {
  return { id: `act-${current().sequence++}`, kind, targetType: target?.entityType ?? null, targetId: target?.entityId ?? null, state: 'accepted', resultType: result?.type ?? null, resultId: result?.id ?? null, decidedAt: new Date().toISOString() };
}

export const sampleMail = {
  async list(role: Role): Promise<MailRow[]> {
    return current()
      .messages.filter((message) => canReadAudience(role, message.audience))
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .map(rowOf);
  },
  async get(id: string, role: Role): Promise<MailDetail | null> {
    const message = current().messages.find((entry) => entry.id === id);
    if (!message || !canReadAudience(role, message.audience)) return null;
    return { ...message, thread: { ...message.thread, messages: message.thread.messages.filter((entry) => canReadAudience(role, current().messages.find((candidate) => candidate.id === entry.id)?.audience ?? 'owner')) } };
  },
  async forRecord(entityType: string, entityId: string, role: Role): Promise<MailThreadLinkView[]> {
    const threads = new Map<string, MailThreadLinkView>();
    for (const message of current().messages) {
      if (!canReadAudience(role, message.audience)) continue;
      const link = message.thread.links.find((entry) => entry.entityType === entityType && entry.entityId === entityId);
      if (!link || threads.has(message.threadId)) continue;
      const latest = [...message.thread.messages].at(-1) ?? null;
      threads.set(message.threadId, { linkId: link.id, basis: link.basis, threadId: message.threadId, subject: message.thread.subject, lastAt: latest?.sentAt ?? message.sentAt, messageCount: message.thread.messageCount, latest });
    }
    return [...threads.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  },
  async rules(): Promise<MailRuleView[]> {
    return [...current().rules].sort((a, b) => a.sort - b.sort);
  },
  async mailboxes(): Promise<MailboxView[]> {
    return [{ id: 'mbx-1', address: MAILBOX, provider: 'gmail', state: 'connected', historyId: '1', watchExpiresAt: new Date(now + 5 * 86_400_000).toISOString(), lastSyncAt: ago(0.1), lastError: '' }];
  },
  async act(input: MailActInput, role: Role): Promise<unknown> {
    const message = await this.get(input.messageId, role);
    if (!message) throw new Error('No such message.');
    const s = current();
    let action: MailActionView;
    switch (input.kind) {
      case 'link_record':
        addLink(s, message.threadId, input.target.entityType, input.target.entityId, 'person');
        action = record(message, input.kind, input.target, null);
        break;
      case 'create_task':
        if (input.target) addLink(s, message.threadId, input.target.entityType, input.target.entityId, 'person');
        action = record(message, input.kind, input.target, { type: 'task', id: `task-${s.sequence}` });
        break;
      case 'create_inquiry': {
        const reference = `INQ-26-${String(20 + s.sequence).padStart(4, '0')}`;
        addLink(s, message.threadId, 'inquiry', reference, 'person');
        if (message.audience === 'owner') update(message.id, (entry) => ({ ...entry, audience: 'commercial', category: 'customer_inquiry', ownerRole: 'sales', state: entry.state === 'needs_review' ? 'sorted' : entry.state }));
        action = record(message, input.kind, null, { type: 'inquiry', id: reference });
        break;
      }
      case 'log_interaction':
        addLink(s, message.threadId, 'customer', input.customerId, 'person');
        action = record(message, input.kind, { entityType: 'customer', entityId: input.customerId }, { type: 'interaction', id: `int-${s.sequence}` });
        break;
      case 'file_attachment':
        addLink(s, message.threadId, input.target.entityType, input.target.entityId, 'person');
        update(message.id, (entry) => ({ ...entry, attachments: entry.attachments.map((attachment) => (attachment.id === input.attachmentId ? { ...attachment, documentId: `doc-${s.sequence}`, documentTitle: input.title } : attachment)) }));
        action = record(message, input.kind, input.target, { type: 'document', id: `doc-${s.sequence}` });
        break;
      case 'create_company': {
        const id = `co-mail-${s.sequence}`;
        const floor = input.role === 'customer' ? 'commercial' : input.role === 'freight_forwarder' || input.role === 'customs_broker' || input.role === 'carrier' ? 'logistics' : input.role === 'inspection_agency' ? null : 'supply';
        update(message.id, (entry) => ({ ...entry, companyId: id, companyName: input.legalName, companyRoles: [input.role], contactName: input.contactName, audience: floor ? combineAudiences(entry.audience, floor) : entry.audience }));
        addLink(s, message.threadId, input.role === 'customer' ? 'customer' : 'supplier', id, 'sender');
        action = record(message, input.kind, null, { type: input.role === 'customer' ? 'customer' : 'supplier', id });
        break;
      }
      default: {
        const state = input.kind === 'mark_done' ? 'done' : input.kind === 'ignore' ? 'ignored' : message.category === 'other' ? 'needs_review' : 'sorted';
        update(message.id, (entry) => ({ ...entry, state }));
        action = record(message, input.kind, null, null);
      }
    }
    update(message.id, (entry) => ({ ...entry, actions: [action, ...entry.actions] }));
    refreshThreads(s);
    return { actionId: action.id };
  },
  async sort(input: { messageId: string; category: string; audience: MailAudience; ownerRole: Role | null }, role: Role): Promise<unknown> {
    const message = await this.get(input.messageId, role);
    if (!message) throw new Error('No such message.');
    const ownerRole = input.ownerRole ?? (isMailCategory(input.category) ? MAIL_CATEGORIES[input.category].ownerRole : null);
    update(message.id, (entry) => ({
      ...entry,
      category: input.category,
      audience: input.audience,
      ownerRole,
      state: entry.state === 'needs_review' ? 'sorted' : entry.state,
      classifications: [{ id: `cls-${current().sequence++}`, method: 'person', category: input.category, audience: input.audience, ownerRole, basis: '', summary: '', createdAt: new Date().toISOString() }, ...entry.classifications],
    }));
    return { messageId: message.id };
  },
  async saveRule(input: Partial<MailRuleView> & { match: MailRuleView['match']; archive?: boolean }): Promise<unknown> {
    const s = current();
    if (input.id && input.archive) {
      s.rules = s.rules.filter((rule) => rule.id !== input.id);
      return { id: input.id };
    }
    const rule: MailRuleView = { id: input.id ?? `rule-${s.sequence++}`, match: input.match, category: input.category ?? null, audience: input.audience ?? null, ownerRole: input.ownerRole ?? null, skipModel: input.skipModel ?? false, ignore: input.ignore ?? false, sort: input.sort ?? 100 };
    s.rules = [...s.rules.filter((entry) => entry.id !== rule.id), rule];
    return { id: rule.id };
  },
  async importFile(_input: { filename: string; base64: string }, _role: Role): Promise<unknown> {
    throw new Error('Sample mode does not read files; importing works on the live platform.');
  },
};
