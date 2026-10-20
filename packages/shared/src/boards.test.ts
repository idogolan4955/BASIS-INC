import { describe, expect, it } from 'vitest';
import { amountFromInput, completionOf, dateAtPosition, fastenerFor, goalCheck, goalProgress, isOverdue, nextOrder, nextZ, noteCheck, reorderGoals, tiltFor, timelinePosition, timelineRange } from './boards';
import { localDate } from './local-date';

describe('bulletin board', () => {
  it('refuses blank text, unknown tones and positions off the board, never clamping', () => {
    expect(noteCheck({ text: '  ' })).toMatch(/Write/);
    expect(noteCheck({ text: 'x'.repeat(1001) })).toMatch(/1000/);
    expect(noteCheck({ color: 'lemon' })).toMatch(/paper tone/);
    expect(noteCheck({ x: 1.5 })).toMatch(/off the board/);
    expect(noteCheck({ y: 20001 })).toMatch(/off the board/);
    expect(noteCheck({ text: 'Call the mill', color: 'milk', x: 0.4, y: 120 })).toBeNull();
    expect(noteCheck({ text: 'one more' }, 300)).toMatch(/300/);
  });
  it('brings a note to the front and draws the same note the same way', () => {
    expect(nextZ([{ z: 3 }, { z: 7 }])).toBe(8);
    expect(nextZ([])).toBe(1);
    expect(tiltFor('note-1')).toBe(tiltFor('note-1'));
    expect(Math.abs(tiltFor('note-1'))).toBeLessThanOrEqual(3);
    expect(['pin', 'tape']).toContain(fastenerFor('note-1'));
  });
});

describe('goals', () => {
  it('derives progress from the amounts when both exist, else uses the manual value', () => {
    expect(goalProgress({ progress: 40, targetAmount: '1000000', currentAmount: '250000' })).toBe(25);
    expect(goalProgress({ progress: 40, targetAmount: '1000000', currentAmount: '1500000' })).toBe(100);
    expect(goalProgress({ progress: 40, targetAmount: null, currentAmount: null })).toBe(40);
    expect(goalProgress({ progress: null, targetAmount: '0', currentAmount: '5' })).toBeNull();
  });
  it('stamps completion once and lifts a money goal to its target; other statuses clear the stamp', () => {
    const goal = { completedAt: null, targetAmount: '1000000', currentAmount: '250000' };
    expect(completionOf(goal, 'achieved', '2026-10-20T10:00:00Z')).toEqual({ completedAt: '2026-10-20T10:00:00Z', currentAmount: '1000000' });
    expect(completionOf({ ...goal, completedAt: '2026-10-01T00:00:00Z' }, 'achieved', 'later')).toEqual({ completedAt: '2026-10-01T00:00:00Z', currentAmount: '1000000' });
    expect(completionOf({ ...goal, completedAt: '2026-10-01T00:00:00Z' }, 'open', 'later')).toEqual({ completedAt: null, currentAmount: '250000' });
    expect(completionOf({ completedAt: null, targetAmount: null, currentAmount: null }, 'achieved', 'now').currentAmount).toBeNull();
  });
  it('validates what a person types', () => {
    expect(goalCheck({ title: '' })).toMatch(/title/);
    expect(goalCheck({ progress: 120 })).toMatch(/0 to 100/);
    expect(goalCheck({ due: '2026-13-01' as never })).toMatch(/date/);
    expect(goalCheck({ section: 'sales' as never })).toMatch(/section/);
    expect(goalCheck({ title: 'Ship the first container', due: localDate('2026-12-15'), progress: 10 })).toBeNull();
    expect(amountFromInput('12,500.5')).toBe('125005000');
    expect(amountFromInput('abc')).toBeNull();
    expect(amountFromInput('')).toBeNull();
  });
  it('reads overdue from the date and the status', () => {
    const today = localDate('2026-10-20');
    expect(isOverdue({ due: localDate('2026-10-01'), status: 'open' }, today)).toBe(true);
    expect(isOverdue({ due: localDate('2026-10-01'), status: 'achieved' }, today)).toBe(false);
    expect(isOverdue({ due: null, status: 'open' }, today)).toBe(false);
  });
  const goals = [
    { id: 'a', section: 'ops' as const, order: 1, createdAt: '1' },
    { id: 'b', section: 'ops' as const, order: 2, createdAt: '2' },
    { id: 'c', section: 'ops' as const, order: 3, createdAt: '3' },
    { id: 'f', section: 'finance' as const, order: 1, createdAt: '4' },
  ];
  it('reorders within a section, keeping the rest in their relative order', () => {
    expect(reorderGoals(goals, ['c', 'a'])).toEqual([
      { id: 'c', section: 'ops', order: 1 },
      { id: 'a', section: 'ops', order: 2 },
      { id: 'b', section: 'ops', order: 3 },
    ]);
  });
  it('moves goals across sections and re-indexes both', () => {
    expect(reorderGoals(goals, ['b'], 'finance')).toEqual([
      { id: 'c', section: 'ops', order: 2 },
      { id: 'b', section: 'finance', order: 1 },
      { id: 'f', section: 'finance', order: 2 },
    ]);
    expect(nextOrder(goals, 'finance')).toBe(2);
    expect(nextOrder([], 'ops')).toBe(1);
  });
});

describe('timeline', () => {
  it('ranges a year or a quarter and places a pin by its day', () => {
    const year = timelineRange(2026, null);
    expect(year).toEqual({ start: '2026-01-01', end: '2026-12-31', days: 365 });
    expect(timelinePosition(localDate('2026-01-01'), year)).toBeCloseTo(0.5 / 365);
    expect(timelinePosition(localDate('2027-01-01'), year)).toBeNull();
    const q4 = timelineRange(2026, 4);
    expect(q4).toEqual({ start: '2026-10-01', end: '2026-12-31', days: 92 });
    expect(dateAtPosition(0, q4)).toBe('2026-10-01');
    expect(dateAtPosition(0.999, q4)).toBe('2026-12-31');
    expect(dateAtPosition(timelinePosition(localDate('2026-11-15'), q4)!, q4)).toBe('2026-11-15');
  });
});
