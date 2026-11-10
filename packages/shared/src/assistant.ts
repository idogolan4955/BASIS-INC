// BASIS AI: the staff assistant inside the platform. It reads the system
// through the platform connector as the person asking, and every change it
// wants is an action that waits for that person's approval on the BASIS AI
// page; the approved action runs the platform's own function or connector
// mutation as them, with their role checks. Nothing here grants a right the
// person does not already have.

/** The model and how hard it thinks. Opus 5.5 at medium effort: planning across modules, not chat. */
export const ASSISTANT_MODEL = 'claude-opus-5-5';
export const ASSISTANT_EFFORT = 'medium' as const;

/** Model calls in one turn before the assistant stops and says where it got to. */
export const ASSISTANT_MAX_STEPS = 16;
/** Rows of one query handed to the model; the rest are counted, not sent. */
export const ASSISTANT_MAX_ROWS = 200;

/**
 * Commands the assistant may never propose: accounts, roles, credentials,
 * connectors and the mailbox connection stay with a person at a screen, and
 * the assistant's own functions and scheduled jobs are not commands.
 */
export const ASSISTANT_EXCLUDED_COMMANDS = [
  'api',
  'sweepEvents',
  'syncMail',
  'askAssistant',
  'decideAssistantAction',
  'inviteUser',
  'setUserRole',
  'createApiToken',
  'revokeApiToken',
  'saveConnector',
  'connectorStatus',
  'connectMailbox',
  'disconnectMailbox',
  'mailStatus',
  'getMailAttachment',
  // Customer accounts are opened and changed by a person at a screen; the rest are the customer's own.
  'inviteCustomerUser',
  'revokeCustomerInvitation',
  'setCustomerUser',
  'customerInvitationInfo',
  'acceptCustomerInvitation',
  'customerSignedIn',
  'respondToQuote',
  'requestCustomerSamples',
  'saveCustomerAddress',
  'removeCustomerAddress',
  'customerDocuments',
] as const;

/** Connector mutations the assistant may never propose. */
export const ASSISTANT_EXCLUDED_MUTATIONS = ['ArchiveAssistantThread', 'UpdateMyPreferences'] as const;

export function assistantMayPropose(kind: 'command' | 'mutation', name: string): boolean {
  if (kind === 'command') return !(ASSISTANT_EXCLUDED_COMMANDS as readonly string[]).includes(name);
  return !(ASSISTANT_EXCLUDED_MUTATIONS as readonly string[]).includes(name);
}

export type AssistantActionState = 'proposed' | 'rejected' | 'executed' | 'failed';
export type AssistantActionKind = 'command' | 'mutation';

export interface AssistantActionView {
  readonly id: string;
  readonly toolUseId: string;
  readonly kind: AssistantActionKind;
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly summary: string;
  readonly state: AssistantActionState;
  readonly decidedByName: string;
  readonly decidedAt: string | null;
  readonly result: unknown;
  readonly error: string;
  readonly createdAt: string;
}

/** What the page shows of a stored message: prose, the reads it made, the actions it proposed. */
export type AssistantItem =
  | { readonly kind: 'text'; readonly role: 'user' | 'assistant'; readonly text: string }
  | { readonly kind: 'read'; readonly name: string; readonly detail: string }
  | { readonly kind: 'action'; readonly toolUseId: string }
  | { readonly kind: 'note'; readonly text: string };

export interface AssistantMessageView {
  readonly id: string;
  readonly seq: number;
  readonly role: 'user' | 'assistant';
  readonly content: readonly unknown[];
  readonly createdAt: string;
}

export interface AssistantThreadSummary {
  readonly id: string;
  readonly title: string;
  readonly lastActivityAt: string;
}

export interface AssistantThreadView extends AssistantThreadSummary {
  readonly messages: readonly AssistantMessageView[];
  readonly actions: readonly AssistantActionView[];
}

export interface AskAssistantInput {
  readonly threadId?: string;
  readonly text: string;
  readonly locale: 'en' | 'he';
}

export interface AskAssistantResult {
  readonly threadId: string;
  readonly stopReason: string;
}

/** Streamed while the assistant works, so the page can say what it is doing. */
export type AssistantProgress = { readonly kind: 'reading'; readonly name: string } | { readonly kind: 'proposing'; readonly name: string } | { readonly kind: 'thinking' };

export interface DecideAssistantActionInput {
  readonly actionId: string;
  readonly decision: 'approve' | 'reject';
  /** Corrections the person made to the proposed input before approving. */
  readonly input?: Record<string, unknown>;
}

/** Marks a user message the platform wrote (an action's outcome), not the person. */
export const PLATFORM_NOTE_PREFIX = '[BASIS platform]';

/** Turns stored content blocks into what the page draws. Thinking stays private; tool results show as one line. */
export function assistantItems(message: Pick<AssistantMessageView, 'role' | 'content'>): AssistantItem[] {
  const items: AssistantItem[] = [];
  for (const raw of message.content) {
    if (!raw || typeof raw !== 'object') continue;
    const block = raw as { type?: string; text?: string; name?: string; id?: string; input?: Record<string, unknown> };
    if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
      if (message.role === 'user' && block.text.startsWith(PLATFORM_NOTE_PREFIX)) items.push({ kind: 'note', text: block.text.slice(PLATFORM_NOTE_PREFIX.length).trim() });
      else items.push({ kind: 'text', role: message.role, text: block.text });
    } else if (block.type === 'tool_use' && block.name === 'propose_action' && block.id) {
      items.push({ kind: 'action', toolUseId: block.id });
    } else if (block.type === 'tool_use' && block.name) {
      const input = block.input ?? {};
      const detail = ['query', 'ledger', 'name'].map((key) => input[key]).find((value): value is string => typeof value === 'string') ?? '';
      items.push({ kind: 'read', name: block.name, detail });
    }
  }
  return items;
}

/** A thread's title from its first instruction: the first line, at most 80 characters. */
export function threadTitle(text: string): string {
  const line = text.trim().split('\n')[0] ?? '';
  return line.length > 80 ? `${line.slice(0, 79).trimEnd()}…` : line || 'New conversation';
}
