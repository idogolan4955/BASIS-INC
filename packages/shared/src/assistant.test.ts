import { describe, expect, it } from 'vitest';
import { PLATFORM_NOTE_PREFIX, assistantItems, assistantMayPropose, threadTitle } from './assistant';

describe('BASIS AI', () => {
  it('keeps accounts, roles, tokens and connectors away from the assistant', () => {
    expect(assistantMayPropose('command', 'updateMilestone')).toBe(true);
    expect(assistantMayPropose('command', 'setUserRole')).toBe(false);
    expect(assistantMayPropose('command', 'createApiToken')).toBe(false);
    expect(assistantMayPropose('command', 'decideAssistantAction')).toBe(false);
    expect(assistantMayPropose('mutation', 'CreateTask')).toBe(true);
    expect(assistantMayPropose('mutation', 'ArchiveAssistantThread')).toBe(false);
  });

  it('shows prose, reads and proposals, never thinking or raw tool results', () => {
    const items = assistantItems({
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text: 'Two runs are late.' },
        { type: 'tool_use', id: 'a', name: 'read', input: { query: 'ListProductionRuns' } },
        { type: 'tool_use', id: 'b', name: 'read_ledger', input: { ledger: 'lots' } },
        { type: 'tool_use', id: 'c', name: 'propose_action', input: { kind: 'command', name: 'updateMilestone' } },
      ],
    });
    expect(items).toEqual([
      { kind: 'text', role: 'assistant', text: 'Two runs are late.' },
      { kind: 'read', name: 'read', detail: 'ListProductionRuns' },
      { kind: 'read', name: 'read_ledger', detail: 'lots' },
      { kind: 'action', toolUseId: 'c' },
    ]);
    expect(assistantItems({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'a', content: '[]' }] })).toEqual([]);
  });

  it('tells the platform\'s notes from the person\'s words', () => {
    expect(assistantItems({ role: 'user', content: [{ type: 'text', text: `${PLATFORM_NOTE_PREFIX} Owner approved the action.` }] })).toEqual([{ kind: 'note', text: 'Owner approved the action.' }]);
    expect(assistantItems({ role: 'user', content: [{ type: 'text', text: 'Move the dyeing.' }] })).toEqual([{ kind: 'text', role: 'user', text: 'Move the dyeing.' }]);
  });

  it('titles a thread from the first line of its first instruction', () => {
    expect(threadTitle('Which runs are late?\nAnd why?')).toBe('Which runs are late?');
    expect(threadTitle('x'.repeat(100))).toHaveLength(80);
    expect(threadTitle('   ')).toBe('New conversation');
  });
});
