// The assistant on the brand site (docs/CUSTOMER_PORTAL_PLAN.md §9). One
// core, two audiences: anonymous visitors, who get the catalogue and the
// public intake, and signed-in customers, who also get their own account
// read through the customer connector as themselves. Anything that changes
// a record is an action the visitor confirms with a click.

export type SiteAudience = 'anonymous' | 'customer';

export const SITE_ASSISTANT_MODEL = 'claude-opus-5-5';
/** Catalogue questions are routine; a customer's questions cross several records. */
export const SITE_ASSISTANT_EFFORT: Record<SiteAudience, 'low' | 'medium'> = { anonymous: 'low', customer: 'medium' };

/** The limits that keep the assistant's spend bounded without App Check. */
export const SITE_LIMITS = {
  /** Visitor messages in one conversation. */
  turnsPerConversation: 20,
  /** Visitor messages from one address in an hour. */
  turnsPerAddressPerHour: 40,
  /** Anonymous visitor messages across the whole site in a day. */
  anonymousTurnsPerDay: 600,
  /** A signed-in customer's messages in a day. */
  customerTurnsPerDay: 200,
  /** Characters in one message. */
  messageLength: { anonymous: 2000, customer: 4000 },
  /** Model calls in one answer. */
  steps: { anonymous: 4, customer: 8 },
} as const;

/** What a signed-in customer's assistant may read: the portal's own queries, run as the customer. */
export const SITE_CUSTOMER_READS = ['CustomerMe', 'CustomerQuotes', 'CustomerQuote', 'CustomerOrders', 'CustomerOrder', 'CustomerShipments', 'CustomerShipment', 'CustomerShipmentLines', 'CustomerInvoices', 'CustomerSampleRequests', 'CustomerAddresses'] as const;
export type SiteCustomerRead = (typeof SITE_CUSTOMER_READS)[number];

export const SITE_ACTIONS = ['request_samples', 'talk_to_sales', 'answer_quote'] as const;
export type SiteActionKind = (typeof SITE_ACTIONS)[number];

export type SiteActionState = 'proposed' | 'rejected' | 'executed' | 'failed';

export interface SiteActionView {
  readonly id: string;
  readonly toolUseId: string;
  readonly kind: SiteActionKind;
  readonly summary: string;
  readonly input: Record<string, unknown>;
  readonly state: SiteActionState;
  readonly result: unknown;
  readonly error: string;
}

export type SiteItem = { readonly kind: 'text'; readonly role: 'user' | 'assistant'; readonly text: string } | { readonly kind: 'action'; readonly toolUseId: string } | { readonly kind: 'reading' };

export interface SiteTurnView {
  readonly seq: number;
  readonly role: 'user' | 'assistant';
  readonly items: readonly SiteItem[];
}

export interface SiteConversationView {
  readonly conversationId: string;
  /** Anonymous only: the key the browser keeps to continue the conversation; returned once, when it starts. */
  readonly sessionKey?: string;
  readonly audience: SiteAudience;
  readonly turns: readonly SiteTurnView[];
  readonly actions: readonly SiteActionView[];
  readonly handedOff: boolean;
}

/** What the widget draws of a stored turn: prose, a quiet "looked it up", and action cards. Thinking and tool results stay out. */
export function siteItems(role: 'user' | 'assistant', content: readonly unknown[]): SiteItem[] {
  const items: SiteItem[] = [];
  let read = false;
  for (const raw of content) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as { type?: string; text?: string; name?: string; id?: string };
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      if (role === 'user' && block.text.startsWith('[BASIS site]')) continue;
      items.push({ kind: 'text', role, text: block.text });
    } else if (block.type === 'tool_use' && block.id && (SITE_ACTIONS as readonly string[]).includes(block.name ?? '')) {
      items.push({ kind: 'action', toolUseId: block.id });
    } else if (block.type === 'tool_use' && block.name === 'read' && !read) {
      read = true;
      items.push({ kind: 'reading' });
    }
  }
  return items;
}

/** A note the site writes into the conversation (an action's outcome); the widget does not show it as the visitor's words. */
export const SITE_NOTE_PREFIX = '[BASIS site]';
