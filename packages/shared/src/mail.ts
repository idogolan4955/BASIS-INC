import type { Role } from './access';

// Module 19, Mail: the rules that sort a message from facts alone — who sent
// it, which records it names, which thread it belongs to, whether it is a
// newsletter, and the owner's own rules. The classifier (slice 2) only ever
// adds to what these decide; it can raise an audience, never lower it.
// Designed in docs/MAIL_PLAN.md.

// ---------------------------------------------------------------- audiences

export const MAIL_AUDIENCES = ['general', 'commercial', 'supply', 'logistics', 'owner'] as const;
export type MailAudience = (typeof MAIL_AUDIENCES)[number];

/** Who may read mail of each audience. The connector's operations enforce the same table. */
export const MAIL_AUDIENCE_READERS: Record<MailAudience, readonly Role[]> = {
  general: ['owner', 'operations', 'purchasing', 'qc', 'logistics', 'sales', 'marketing', 'finance'],
  commercial: ['owner', 'operations', 'sales', 'marketing', 'finance'],
  supply: ['owner', 'operations', 'purchasing', 'finance'],
  logistics: ['owner', 'operations', 'logistics', 'purchasing', 'finance'],
  owner: ['owner'],
};

export const MAIL_AUDIENCE_LABEL: Record<MailAudience, string> = {
  general: 'Everyone',
  commercial: 'Commercial',
  supply: 'Supply',
  logistics: 'Logistics',
  owner: 'Owner only',
};

export function isMailAudience(value: unknown): value is MailAudience {
  return typeof value === 'string' && (MAIL_AUDIENCES as readonly string[]).includes(value);
}

export function canReadAudience(role: Role, audience: MailAudience): boolean {
  return MAIL_AUDIENCE_READERS[audience].includes(role);
}

/** The audiences a role reads, in the order the inbox merges them. */
export function audiencesFor(role: Role): MailAudience[] {
  return MAIL_AUDIENCES.filter((audience) => canReadAudience(role, audience));
}

/**
 * The audience that satisfies both: readers of the result read both. When no
 * audience has exactly the shared readers, the widest one inside them is
 * taken, and `owner` always fits — combining never widens.
 */
export function combineAudiences(...audiences: readonly (MailAudience | null | undefined)[]): MailAudience {
  const present = audiences.filter((audience): audience is MailAudience => audience != null);
  if (present.length === 0) return 'general';
  const shared = present.slice(1).reduce<readonly Role[]>((readers, audience) => readers.filter((role) => MAIL_AUDIENCE_READERS[audience].includes(role)), MAIL_AUDIENCE_READERS[present[0]!]);
  const fitting = MAIL_AUDIENCES.filter((audience) => MAIL_AUDIENCE_READERS[audience].every((role) => shared.includes(role)));
  return fitting.reduce((best, audience) => (MAIL_AUDIENCE_READERS[audience].length > MAIL_AUDIENCE_READERS[best].length ? audience : best), 'owner');
}

/** True when `next` lets nobody read who could not read `current`. */
export function isAtLeastAsRestrictive(next: MailAudience, current: MailAudience): boolean {
  return MAIL_AUDIENCE_READERS[next].every((role) => MAIL_AUDIENCE_READERS[current].includes(role));
}

/** The floor a sender's company sets: supplier identity and prices stay with the cost roles. */
export function audienceFloorForParty(companyRoles: readonly string[]): MailAudience | null {
  const floors: MailAudience[] = [];
  for (const role of companyRoles) {
    if (role === 'supplier' || role === 'odm' || role === 'factory_operator') floors.push('supply');
    else if (role === 'freight_forwarder' || role === 'customs_broker' || role === 'carrier' || role === 'warehouse_operator') floors.push('logistics');
    else if (role === 'customer') floors.push('commercial');
  }
  return floors.length === 0 ? null : combineAudiences(...floors);
}

// ---------------------------------------------------------------- categories

export interface MailCategoryDefinition {
  readonly label: string;
  /** The department the message belongs to; null for noise. */
  readonly ownerRole: Role | null;
  /** The least restrictive audience a message of this category may have. */
  readonly floor: MailAudience;
}

export const MAIL_CATEGORIES = {
  customer_inquiry: { label: 'Customer inquiry', ownerRole: 'sales', floor: 'commercial' },
  customer_correspondence: { label: 'Customer', ownerRole: 'sales', floor: 'commercial' },
  supplier_correspondence: { label: 'Supplier', ownerRole: 'purchasing', floor: 'supply' },
  supplier_quotation: { label: 'Supplier quotation', ownerRole: 'purchasing', floor: 'supply' },
  supplier_production: { label: 'Production update', ownerRole: 'purchasing', floor: 'supply' },
  supplier_invoice: { label: 'Supplier invoice', ownerRole: 'finance', floor: 'supply' },
  logistics: { label: 'Logistics', ownerRole: 'logistics', floor: 'logistics' },
  quality: { label: 'Quality', ownerRole: 'qc', floor: 'general' },
  development: { label: 'Development', ownerRole: 'operations', floor: 'supply' },
  marketing: { label: 'Marketing', ownerRole: 'marketing', floor: 'general' },
  finance_admin: { label: 'Finance and admin', ownerRole: 'owner', floor: 'owner' },
  notification: { label: 'Notification', ownerRole: null, floor: 'general' },
  newsletter: { label: 'Newsletter', ownerRole: null, floor: 'general' },
  spam: { label: 'Spam', ownerRole: null, floor: 'owner' },
  phishing_suspect: { label: 'Suspected phishing', ownerRole: 'owner', floor: 'owner' },
  other: { label: 'Unsorted', ownerRole: 'owner', floor: 'owner' },
} as const satisfies Record<string, MailCategoryDefinition>;

export type MailCategory = keyof typeof MAIL_CATEGORIES;
export const MAIL_CATEGORY_KEYS = Object.keys(MAIL_CATEGORIES) as MailCategory[];

export function isMailCategory(value: unknown): value is MailCategory {
  return typeof value === 'string' && value in MAIL_CATEGORIES;
}

/** Categories that are noise: they leave the queue without anyone reading them. */
export const MAIL_NOISE_CATEGORIES: readonly MailCategory[] = ['notification', 'newsletter', 'spam'];

export const MAIL_STATES = ['received', 'sorted', 'needs_review', 'done', 'ignored'] as const;
export type MailState = (typeof MAIL_STATES)[number];

// ---------------------------------------------------------------- references

/** The platform's numbers a message may name, and the record each one opens. */
export const MAIL_REFERENCE_PREFIXES = {
  PO: 'purchase_order',
  RUN: 'production_run',
  LOT: 'lot',
  INS: 'inspection',
  CAR: 'corrective_action',
  SHP: 'shipment',
  RCV: 'receipt',
  SO: 'sales_order',
  QUO: 'quote',
  DEV: 'development_product',
  INQ: 'inquiry',
} as const;

export type MailReferencePrefix = keyof typeof MAIL_REFERENCE_PREFIXES;
export type MailReferenceEntity = (typeof MAIL_REFERENCE_PREFIXES)[MailReferencePrefix];

export interface MailReference {
  readonly entityType: MailReferenceEntity;
  readonly entityId: string;
}

const NUMBER_PATTERN = new RegExp(`(?<![A-Za-z0-9])(${Object.keys(MAIL_REFERENCE_PREFIXES).join('|')})[-\\s]?(\\d{2})-(\\d{4})(?![0-9])`, 'gi');

/** Every platform number in the text, normalised (`po 26-0003` → `PO-26-0003`), once each. */
export function extractReferences(text: string): MailReference[] {
  const seen = new Map<string, MailReference>();
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const prefix = match[1]!.toUpperCase() as MailReferencePrefix;
    const entityId = `${prefix}-${match[2]}-${match[3]}`;
    if (!seen.has(entityId)) seen.set(entityId, { entityType: MAIL_REFERENCE_PREFIXES[prefix], entityId });
  }
  return [...seen.values()];
}

/** ISO 6346 check digit of a container number's first ten characters. */
export function containerCheckDigit(owner: string): number | null {
  if (!/^[A-Z]{3}[UJZ]\d{6}$/.test(owner)) return null;
  // Letters take 10–38, skipping multiples of 11.
  const value = (char: string) => {
    if (/\d/.test(char)) return Number(char);
    let n = char.charCodeAt(0) - 55;
    n += Math.floor((n - 1) / 10);
    return n;
  };
  let sum = 0;
  for (let index = 0; index < 10; index++) sum += value(owner[index]!) * 2 ** index;
  return (sum % 11) % 10;
}

/** Container numbers whose check digit holds, normalised without spaces. */
export function extractContainerNumbers(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.toUpperCase().matchAll(/(?<![A-Z0-9])([A-Z]{3}[UJZ])\s?(\d{6})\s?-?(\d)(?![0-9])/g)) {
    const head = `${match[1]}${match[2]}`;
    if (containerCheckDigit(head) === Number(match[3])) found.add(`${head}${match[3]}`);
  }
  return [...found];
}

/** Shipment references (booking, BL, AWB, container, tracking) that appear in the text as whole tokens. */
export function matchKnownReferences<T extends { readonly value: string }>(text: string, known: readonly T[]): T[] {
  const haystack = ` ${text.toUpperCase().replace(/[^A-Z0-9]+/g, ' ')} `;
  return known.filter((reference) => {
    const token = reference.value.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    return token.replace(/ /g, '').length >= 6 && haystack.includes(` ${token} `);
  });
}

/** The category a record suggests when it is all that is known about a message. */
export function categoryForEntity(entityType: string): MailCategory | null {
  switch (entityType) {
    case 'purchase_order':
    case 'production_run':
    case 'lot':
    case 'inspection':
    case 'corrective_action':
      return 'supplier_correspondence';
    case 'shipment':
    case 'receipt':
      return 'logistics';
    case 'sales_order':
    case 'quote':
    case 'inquiry':
      return 'customer_correspondence';
    case 'development_product':
      return 'development';
    default:
      return null;
  }
}

// ---------------------------------------------------------------- senders

/** Addresses at these domains belong to one person, not to a company. */
export const PUBLIC_MAIL_DOMAINS: ReadonlySet<string> = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'gmx.com', 'gmx.de', 'web.de', 'proton.me', 'protonmail.com', 'mail.ru', 'yandex.ru', 'yandex.com',
  'qq.com', 'foxmail.com', '163.com', '126.com', 'yeah.net', 'sina.com', 'sina.cn', 'sohu.com', 'aliyun.com', '139.com',
  'walla.co.il', 'walla.com', 'bezeqint.net', 'netvision.net.il', '012.net.il',
]);

export function normaliseAddress(address: string): string {
  return address.trim().toLowerCase();
}

export function domainOf(address: string): string {
  const at = address.lastIndexOf('@');
  return at < 0 ? '' : normaliseAddress(address.slice(at + 1));
}

export interface KnownAddress {
  readonly contactId: string;
  readonly companyId: string;
  readonly email: string;
}

export interface ResolvedSender {
  readonly contactId: string | null;
  readonly companyId: string | null;
  readonly basis: 'address' | 'domain' | null;
}

/**
 * The contact by exact address; failing that, the company by domain — only
 * when the domain is not a public mailbox and exactly one company has
 * contacts there.
 */
export function resolveSender(address: string, known: readonly KnownAddress[]): ResolvedSender {
  const wanted = normaliseAddress(address);
  const exact = known.find((entry) => normaliseAddress(entry.email) === wanted);
  if (exact) return { contactId: exact.contactId, companyId: exact.companyId, basis: 'address' };
  const domain = domainOf(wanted);
  if (!domain || PUBLIC_MAIL_DOMAINS.has(domain)) return { contactId: null, companyId: null, basis: null };
  const companies = new Set(known.filter((entry) => domainOf(entry.email) === domain).map((entry) => entry.companyId));
  if (companies.size !== 1) return { contactId: null, companyId: null, basis: null };
  return { contactId: null, companyId: [...companies][0]!, basis: 'domain' };
}

// ---------------------------------------------------------------- noise

export type MailHeaders = Readonly<Record<string, string>>;

const header = (headers: MailHeaders, name: string) => {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) if (key.toLowerCase() === wanted) return value;
  return undefined;
};

/** A newsletter or an automatic message, read from the headers and the sender alone. */
export function detectNoise(headers: MailHeaders, fromAddress: string): 'newsletter' | 'notification' | null {
  const precedence = header(headers, 'precedence')?.toLowerCase();
  if (header(headers, 'list-unsubscribe') || header(headers, 'list-id') || precedence === 'bulk' || precedence === 'list') return 'newsletter';
  const submitted = header(headers, 'auto-submitted')?.toLowerCase();
  if ((submitted && submitted !== 'no') || precedence === 'junk' || header(headers, 'x-autoreply') || header(headers, 'x-autorespond')) return 'notification';
  const local = normaliseAddress(fromAddress).split('@')[0] ?? '';
  if (/^(no-?reply|do-?not-?reply|noreply-.+|mailer-daemon|postmaster|notifications?|alerts?|bounce.*)$/.test(local)) return 'notification';
  return null;
}

// ---------------------------------------------------------------- the owner's rules

export interface MailRuleMatch {
  readonly fromAddress?: string;
  readonly fromDomain?: string;
  readonly subjectContains?: string;
  readonly listId?: string;
}

export interface MailRuleView {
  readonly id: string;
  readonly match: MailRuleMatch;
  readonly category: MailCategory | null;
  readonly audience: MailAudience | null;
  readonly ownerRole: Role | null;
  /** Mail matching this rule is never sent to the classifier. */
  readonly skipModel: boolean;
  readonly ignore: boolean;
  readonly sort: number;
}

export interface MailFacts {
  readonly fromAddress: string;
  readonly subject: string;
  readonly headers: MailHeaders;
}

/** True when every condition the rule names holds; a rule with no conditions matches nothing. */
export function ruleMatches(rule: MailRuleView, facts: MailFacts): boolean {
  const { fromAddress, fromDomain, subjectContains, listId } = rule.match;
  if (!fromAddress && !fromDomain && !subjectContains && !listId) return false;
  if (fromAddress && normaliseAddress(fromAddress) !== normaliseAddress(facts.fromAddress)) return false;
  if (fromDomain) {
    const domain = domainOf(facts.fromAddress);
    const wanted = normaliseAddress(fromDomain).replace(/^@/, '');
    if (domain !== wanted && !domain.endsWith(`.${wanted}`)) return false;
  }
  if (subjectContains && !facts.subject.toLowerCase().includes(subjectContains.toLowerCase())) return false;
  if (listId && !(header(facts.headers, 'list-id') ?? '').toLowerCase().includes(listId.toLowerCase())) return false;
  return true;
}

export function firstMatchingRule(rules: readonly MailRuleView[], facts: MailFacts): MailRuleView | null {
  return [...rules].sort((a, b) => a.sort - b.sort).find((rule) => ruleMatches(rule, facts)) ?? null;
}

// ---------------------------------------------------------------- sorting

export interface SortInput extends MailFacts {
  /** The roles of the sender's company, when the sender is known. */
  readonly senderCompanyRoles: readonly string[];
  readonly senderKnown: boolean;
  /** Records the message names that exist. */
  readonly references: readonly { readonly entityType: string }[];
  /** What the thread was already sorted as, when this is a reply. */
  readonly thread: { readonly category: MailCategory | null; readonly audience: MailAudience } | null;
  readonly rule: MailRuleView | null;
}

export interface SortDecision {
  readonly category: MailCategory;
  readonly audience: MailAudience;
  readonly ownerRole: Role | null;
  readonly state: Extract<MailState, 'sorted' | 'needs_review' | 'ignored'>;
  /** How the category was reached, for the message's classification record. */
  readonly basis: 'rule' | 'thread' | 'noise' | 'sender' | 'reference' | 'none';
  readonly skipModel: boolean;
}

function categoryForParty(companyRoles: readonly string[]): MailCategory | null {
  if (companyRoles.some((role) => role === 'supplier' || role === 'odm' || role === 'factory_operator')) return 'supplier_correspondence';
  if (companyRoles.some((role) => role === 'freight_forwarder' || role === 'customs_broker' || role === 'carrier' || role === 'warehouse_operator')) return 'logistics';
  if (companyRoles.includes('inspection_agency')) return 'quality';
  if (companyRoles.includes('customer')) return 'customer_correspondence';
  return null;
}

/**
 * Sort a message from facts. The order is the owner's rule, the thread, the
 * headers, the sender's company, then the records it names; nothing matched
 * leaves it unsorted and visible to the owner only.
 */
export function sortByFacts(input: SortInput): SortDecision {
  const noise = detectNoise(input.headers, input.fromAddress);
  const fromReferences = input.references.map((reference) => categoryForEntity(reference.entityType)).find((category): category is MailCategory => category !== null) ?? null;
  const fromParty = categoryForParty(input.senderCompanyRoles);
  const [category, basis]: [MailCategory, SortDecision['basis']] = input.rule?.category
    ? [input.rule.category, 'rule']
    : input.thread?.category && input.thread.category !== 'other'
      ? [input.thread.category, 'thread']
      : noise
        ? [noise, 'noise']
        : fromParty
          ? [fromParty, 'sender']
          : fromReferences
            ? [fromReferences, 'reference']
            : ['other', 'none'];
  const audience = combineAudiences(MAIL_CATEGORIES[category].floor, audienceFloorForParty(input.senderCompanyRoles), input.rule?.audience, input.thread?.audience);
  const ownerRole = input.rule?.ownerRole ?? MAIL_CATEGORIES[category].ownerRole;
  const state = input.rule?.ignore || MAIL_NOISE_CATEGORIES.includes(category) ? 'ignored' : category === 'other' ? 'needs_review' : 'sorted';
  return { category, audience, ownerRole, state, basis, skipModel: input.rule?.skipModel ?? false };
}

// ---------------------------------------------------------------- replies

const WEEKEND = new Set([0, 6]);

/** Hours between two instants that fall on Monday to Friday (UTC). */
export function workingHoursBetween(from: Date, to: Date): number {
  if (to <= from) return 0;
  let hours = 0;
  const cursor = new Date(from);
  while (cursor < to) {
    const next = new Date(Math.min(to.getTime(), Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1)));
    if (!WEEKEND.has(cursor.getUTCDay())) hours += (next.getTime() - cursor.getTime()) / 3_600_000;
    cursor.setTime(next.getTime());
  }
  return hours;
}

/** A thread waits for a reply when its last message came in and nothing went out after it for a working day. */
export function awaitingReply(thread: { readonly lastInboundAt: string | null; readonly lastOutboundAt: string | null }, now: Date, workingHours = 24): boolean {
  if (!thread.lastInboundAt) return false;
  if (thread.lastOutboundAt && thread.lastOutboundAt >= thread.lastInboundAt) return false;
  return workingHoursBetween(new Date(thread.lastInboundAt), now) >= workingHours;
}

// ---------------------------------------------------------------- bodies

const QUOTE_MARKERS = [
  /^On .{6,200}wrote:\s*$/m,
  /^-{2,}\s*Original Message\s*-{2,}/im,
  /^-{2,}\s*Forwarded message\s*-{2,}/im,
  /^From:\s.+\r?\n(?:Sent|Date):\s/im,
  /^发件人[:：]/m,
  /^在.{4,120}写道[:：]\s*$/m,
  /^ב.{4,120}כתב(?:ה)?[:：]\s*$/m,
  /^Le .{6,200}a écrit\s*:\s*$/m,
  /^Am .{6,200}schrieb .{1,200}:\s*$/m,
];

/** The new part of a reply: everything before the first quoted-history marker or `>` block. */
export function trimQuoted(text: string): string {
  let cut = text.length;
  for (const marker of QUOTE_MARKERS) {
    const found = marker.exec(text);
    if (found && found.index < cut) cut = found.index;
  }
  const quotedBlock = /^(?:>.*(?:\r?\n|$))+/m.exec(text);
  if (quotedBlock && quotedBlock.index < cut && text.slice(quotedBlock.index).trim().split(/\r?\n/).every((line) => line.startsWith('>') || line.trim() === '')) cut = quotedBlock.index;
  const trimmed = text.slice(0, cut).trimEnd();
  return trimmed.length > 0 ? trimmed : text.trim();
}

export function snippetOf(text: string, length = 240): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= length ? flat : `${flat.slice(0, length - 1).trimEnd()}…`;
}

// ---------------------------------------------------------------- actions

/** What a person can do from a message. Slice 2 adds the classifier's proposals over the same kinds. */
export const MAIL_ACTION_KINDS = ['link_record', 'create_task', 'create_inquiry', 'log_interaction', 'file_attachment', 'create_company', 'mark_done', 'ignore', 'reopen'] as const;
export type MailActionKind = (typeof MAIL_ACTION_KINDS)[number];

export function isMailActionKind(value: unknown): value is MailActionKind {
  return typeof value === 'string' && (MAIL_ACTION_KINDS as readonly string[]).includes(value);
}

export const MAIL_ACTION_LABEL: Record<MailActionKind, string> = {
  link_record: 'Link to a record',
  create_task: 'Create a task',
  create_inquiry: 'Open an inquiry',
  log_interaction: 'Log on the customer',
  file_attachment: 'File the attachment',
  create_company: 'Add the sender as a company',
  mark_done: 'Mark done',
  ignore: 'Ignore',
  reopen: 'Reopen',
};

export const MAIL_ACTION_STATES = ['proposed', 'accepted', 'dismissed', 'failed', 'superseded'] as const;
export type MailActionState = (typeof MAIL_ACTION_STATES)[number];

/** Records a message can be linked to, and where each one's number comes from. */
export const MAIL_LINKABLE_ENTITIES = ['purchase_order', 'production_run', 'lot', 'inspection', 'corrective_action', 'shipment', 'receipt', 'sales_order', 'quote', 'development_product', 'inquiry', 'supplier', 'customer'] as const;
export type MailLinkableEntity = (typeof MAIL_LINKABLE_ENTITIES)[number];

/** The entity a company's mail is linked under: customers open under 09, every other company under 03. */
export function mailCompanyEntity(companyRoles: readonly string[]): 'customer' | 'supplier' {
  return companyRoles.includes('customer') && !companyRoles.some((role) => role === 'supplier' || role === 'odm') ? 'customer' : 'supplier';
}

/** The mailbox is read over IMAP with a Google App Password, set by the owner in the terminal. */
export const MAIL_CONNECTOR_SECRETS = ['GMAIL_APP_PASSWORD'] as const;

export interface MailConnectorSettings {
  /** The mailbox the platform reads. */
  readonly address: string;
}
