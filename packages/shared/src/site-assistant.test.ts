import { describe, expect, it } from 'vitest';
import { VISITOR_CONVERSATION_DAYS, visitorConversationCutoff } from './site-assistant';

describe('site assistant', () => {
  it('keeps a visitor conversation for 90 days after its last message', () => {
    expect(VISITOR_CONVERSATION_DAYS).toBe(90);
    expect(visitorConversationCutoff(new Date('2026-11-11T12:00:00Z'))).toBe('2026-08-13T12:00:00.000Z');
  });
});
