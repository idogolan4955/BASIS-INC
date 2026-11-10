import { PLATFORM_NOTE_PREFIX, threadTitle, type AskAssistantInput, type AskAssistantResult, type AssistantActionState, type AssistantActionView, type AssistantMessageView, type AssistantThreadSummary, type AssistantThreadView, type DecideAssistantActionInput } from '@basis/shared';
import type { PendingAction } from './assistant';

// Sample BASIS AI: one conversation as the live assistant leaves it, with an
// action waiting for approval. The sample build has no model behind it, so a
// new instruction is answered with a note saying so; approving and rejecting
// work on the sample records.

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
interface Store {
  threads: Mutable<AssistantThreadView>[];
}

const store: Store = {
  threads: [
    {
      id: 'th-1',
      title: 'Which runs are late? Move the dyeing on RUN-26-0033',
      lastActivityAt: ago(12),
      messages: [
        { id: 'm-1', seq: 1, role: 'user', createdAt: ago(14), content: [{ type: 'text', text: 'Which runs are late? Move the dyeing on RUN-26-0033 to 20 November, the mill says the dye house is booked.' }] },
        { id: 'm-2', seq: 2, role: 'assistant', createdAt: ago(14), content: [{ type: 'tool_use', id: 'tu-1', name: 'read_ledger', input: { ledger: 'production-runs' } }] },
        { id: 'm-3', seq: 3, role: 'user', createdAt: ago(14), content: [{ type: 'tool_result', tool_use_id: 'tu-1', content: '[…]' }] },
        { id: 'm-4', seq: 4, role: 'assistant', createdAt: ago(13), content: [{ type: 'tool_use', id: 'tu-2', name: 'read', input: { query: 'GetProductionRun', variables: { number: 'RUN-26-0033' } } }] },
        { id: 'm-5', seq: 5, role: 'user', createdAt: ago(13), content: [{ type: 'tool_result', tool_use_id: 'tu-2', content: '{…}' }] },
        {
          id: 'm-6',
          seq: 6,
          role: 'assistant',
          createdAt: ago(12),
          content: [
            { type: 'text', text: 'Two runs are behind plan:\n\n- [RUN-26-0033](/manufacturing/runs/RUN-26-0033), Powermesh in Skin 02 for [PO-26-0041](/manufacturing/purchase-orders/PO-26-0041): dyeing was due 14 November and has not started.\n- [RUN-26-0031](/manufacturing/runs/RUN-26-0031): finishing is 3 days late; ex-factory now 2 December.\n\nI proposed moving the dyeing forecast on RUN-26-0033 to 20 November with the reason **dye house booked**. It waits for your approval below; the run\'s ex-factory will follow from it.' },
            { type: 'tool_use', id: 'tu-3', name: 'propose_action', input: { kind: 'command', name: 'updateMilestone', input: { runNumber: 'RUN-26-0033', milestoneId: 'ms-dye', forecastEnd: '2026-11-20', delayReason: 'Dye house booked' }, summary: 'Move the dyeing on RUN-26-0033 to 20 November (dye house booked).' } },
          ],
        },
      ],
      actions: [
        { id: 'a-1', toolUseId: 'tu-3', kind: 'command', name: 'updateMilestone', input: { runNumber: 'RUN-26-0033', milestoneId: 'ms-dye', forecastEnd: '2026-11-20', delayReason: 'Dye house booked' }, summary: 'Move the dyeing on RUN-26-0033 to 20 November (dye house booked).', state: 'proposed', decidedByName: '', decidedAt: null, result: null, error: '', createdAt: ago(12) },
      ],
    },
  ],
};

const summaryOf = (thread: AssistantThreadView): AssistantThreadSummary => ({ id: thread.id, title: thread.title, lastActivityAt: thread.lastActivityAt });
const nextSeq = (thread: AssistantThreadView) => thread.messages.length + 1;

export const sampleAssistant = {
  threads: (): AssistantThreadSummary[] => [...store.threads].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)).map(summaryOf),
  thread: (id: string): AssistantThreadView | null => store.threads.find((thread) => thread.id === id) ?? null,
  pending: (): PendingAction[] =>
    store.threads.flatMap((thread) => thread.actions.filter((action) => action.state === 'proposed').map((action) => ({ id: action.id, name: action.name, summary: action.summary, createdAt: action.createdAt, threadId: thread.id, threadTitle: thread.title }))),
  ask: async (input: AskAssistantInput): Promise<AskAssistantResult> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    let thread: Mutable<AssistantThreadView> | undefined = input.threadId ? store.threads.find((item) => item.id === input.threadId) : undefined;
    if (!thread) {
      thread = { id: `th-${Date.now()}`, title: threadTitle(input.text), lastActivityAt: new Date().toISOString(), messages: [], actions: [] };
      store.threads.push(thread);
    }
    const now = new Date().toISOString();
    const reply = input.locale === 'he' ? 'זו גרסת הדוגמה של הפלטפורמה, ואין מאחוריה מודל. בפלטפורמה החיה BASIS AI קורא את המערכת בהרשאות שלך ומציע פעולות לאישורך.' : 'This is the sample build of the platform, with no model behind it. In the live platform BASIS AI reads the system with your role and proposes actions for your approval.';
    const messages: AssistantMessageView[] = [
      { id: `m-${Date.now()}`, seq: nextSeq(thread), role: 'user', createdAt: now, content: [{ type: 'text', text: input.text }] },
      { id: `m-${Date.now() + 1}`, seq: nextSeq(thread) + 1, role: 'assistant', createdAt: now, content: [{ type: 'text', text: reply }] },
    ];
    thread.messages = [...thread.messages, ...messages];
    thread.lastActivityAt = now;
    return { threadId: thread.id, stopReason: 'end_turn' };
  },
  decide: async (input: DecideAssistantActionInput): Promise<{ state: AssistantActionState }> => {
    const thread = store.threads.find((item) => item.actions.some((action) => action.id === input.actionId));
    const action = thread?.actions.find((item) => item.id === input.actionId);
    if (!thread || !action || action.state !== 'proposed') throw new Error('This action has already been decided.');
    const state: AssistantActionState = input.decision === 'approve' ? 'executed' : 'rejected';
    const decided: AssistantActionView = { ...action, state, decidedByName: 'Owner', decidedAt: new Date().toISOString(), result: state === 'executed' ? { ok: true } : null };
    thread.actions = thread.actions.map((item) => (item.id === action.id ? decided : item));
    const note = state === 'executed' ? `${PLATFORM_NOTE_PREFIX} Owner approved the action "${action.summary}" (${action.name}); it ran.` : `${PLATFORM_NOTE_PREFIX} Owner rejected the proposed action "${action.summary}" (${action.name}). Nothing changed.`;
    thread.messages = [...thread.messages, { id: `m-${Date.now()}`, seq: nextSeq(thread), role: 'user', createdAt: new Date().toISOString(), content: [{ type: 'text', text: note }] }];
    thread.lastActivityAt = new Date().toISOString();
    return { state };
  },
  archive: async (id: string) => {
    store.threads = store.threads.filter((thread) => thread.id !== id);
  },
};
