// The two boards: the bulletin board, where anyone pins a note anywhere, and
// the goals board, where the owner keeps the company's goals in order. Both
// draw paper notes; the rules below are everything a note or a goal must obey,
// written once for the functions, the interface and the sample data.

import { MONEY_SCALE } from './money';
import type { LocalDate } from './local-date';
import { isLocalDate } from './local-date';
import type { StatusTone } from './status';

// ---------------------------------------------------------------- paper

/** Paper tones are the first six material tones of the palette, by number. */
export const PAPER_TONES = ['milk', 'bone', 'linen', 'sand', 'powder', 'powder-deep'] as const;
export type PaperTone = (typeof PAPER_TONES)[number];
export const PAPER_TONE_LABEL: Record<PaperTone, string> = { milk: 'Milk', bone: 'Bone', linen: 'Linen', sand: 'Sand', powder: 'Powder', 'powder-deep': 'Deep powder' };
export const PAPER_TONE_NUMBER: Record<PaperTone, string> = { milk: '01', bone: '02', linen: '03', sand: '04', powder: '05', 'powder-deep': '06' };
export const isPaperTone = (value: unknown): value is PaperTone => typeof value === 'string' && (PAPER_TONES as readonly string[]).includes(value);

export const FASTENERS = ['pin', 'tape'] as const;
export type Fastener = (typeof FASTENERS)[number];

/** A small, stable number from a string: the same id always draws the same note. */
export function hashOf(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

/** A fixed tilt between −3 and 3 degrees, chosen by the id. */
export function tiltFor(id: string): number {
  return Math.round(((hashOf(id) % 601) / 100 - 3) * 10) / 10;
}

/** Pin or tape, about one note in three taped, chosen by the id. */
export function fastenerFor(id: string): Fastener {
  return hashOf(`${id}:fix`) % 3 === 0 ? 'tape' : 'pin';
}

// ---------------------------------------------------------------- bulletin board

export const NOTE_TEXT_MAX = 1000;
export const BOARD_CAP = 300;
export const BOARD_HEIGHT_MAX = 20000;

export interface BoardNoteView {
  readonly id: string;
  readonly text: string;
  readonly color: PaperTone;
  /** Horizontal position as a fraction of the board width, 0 to 1. */
  readonly x: number;
  /** Vertical position in pixels from the top of the board. */
  readonly y: number;
  readonly z: number;
  readonly authorUid: string;
  readonly authorName: string;
  readonly editedByName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NoteInput {
  readonly text: string;
  readonly color: PaperTone;
  readonly x: number;
  readonly y: number;
}

/** Why a note cannot be saved, or null. Invalid positions are refused, never clamped. */
export function noteCheck(input: { text?: string; color?: string; x?: number; y?: number }, count = 0): string | null {
  if (input.text !== undefined) {
    const text = input.text.trim();
    if (!text) return 'Write something on the note.';
    if (text.length > NOTE_TEXT_MAX) return `A note holds up to ${NOTE_TEXT_MAX} characters.`;
  }
  if (input.color !== undefined && !isPaperTone(input.color)) return 'That is not a paper tone.';
  if (input.x !== undefined && !(Number.isFinite(input.x) && input.x >= 0 && input.x <= 1)) return 'The note is off the board.';
  if (input.y !== undefined && !(Number.isFinite(input.y) && input.y >= 0 && input.y <= BOARD_HEIGHT_MAX)) return 'The note is off the board.';
  if (count >= BOARD_CAP) return `The board holds ${BOARD_CAP} notes. Take one down first.`;
  return null;
}

/** The stacking order a note gets when brought to the front. */
export function nextZ(notes: readonly { readonly z: number }[]): number {
  return notes.reduce((top, note) => Math.max(top, note.z), 0) + 1;
}

/** Where a new note lands when nobody placed it: the upper-left area, spread so notes do not stack. */
export function freeSpot(seed: string): { x: number; y: number } {
  const hash = hashOf(seed);
  return { x: ((hash % 1000) / 1000) * 0.35, y: 24 + ((hash >>> 10) % 200) };
}

/** Phones show the board as a list: top to bottom, then start to end. */
export function stacked<T extends { readonly x: number; readonly y: number }>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => a.y - b.y || a.x - b.x);
}

// ---------------------------------------------------------------- goals

export const GOAL_STATUSES = ['open', 'in_progress', 'achieved', 'paused'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = { open: 'Open', in_progress: 'In progress', achieved: 'Achieved', paused: 'Paused' };
export const GOAL_STATUS_TONE: Record<GoalStatus, StatusTone> = { open: 'neutral', in_progress: 'transit', achieved: 'positive', paused: 'caution' };

export const GOAL_SECTIONS = ['ops', 'finance'] as const;
export type GoalSection = (typeof GOAL_SECTIONS)[number];
export const GOAL_SECTION_LABEL: Record<GoalSection, string> = { ops: 'Operations', finance: 'Financial targets' };

export const GOAL_CURRENCIES = ['USD', 'ILS', 'EUR'] as const;
export type GoalCurrency = (typeof GOAL_CURRENCIES)[number];

export const GOAL_TITLE_MAX = 140;
export const GOAL_BODY_MAX = 4000;

export interface GoalFacts {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly color: PaperTone;
  readonly status: GoalStatus;
  readonly section: GoalSection;
  readonly order: number;
  readonly due: LocalDate | null;
  /** Manual progress, 0 to 100, when the goal has no money target. */
  readonly progress: number | null;
  /** Fixed-point money, ten-thousandths. */
  readonly targetAmount: string | null;
  readonly currentAmount: string | null;
  readonly currency: GoalCurrency;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly createdByName: string;
}

export interface GoalView extends GoalFacts {
  /** Derived: from the amounts when both exist and the target is positive, else the manual progress. */
  readonly progressPct: number | null;
  readonly overdue: boolean;
}

export interface GoalInput {
  readonly title: string;
  readonly body: string;
  readonly color: PaperTone;
  readonly status: GoalStatus;
  readonly section: GoalSection;
  readonly due: LocalDate | null;
  readonly progress: number | null;
  readonly targetAmount: string | null;
  readonly currentAmount: string | null;
  readonly currency: GoalCurrency;
}

const isStored = (value: string) => /^\d+$/.test(value);

/** Why a goal cannot be saved, or null. */
export function goalCheck(input: Partial<GoalInput>): string | null {
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return 'Give the goal a title.';
    if (title.length > GOAL_TITLE_MAX) return `A title holds up to ${GOAL_TITLE_MAX} characters.`;
  }
  if (input.body !== undefined && input.body.length > GOAL_BODY_MAX) return `The text holds up to ${GOAL_BODY_MAX} characters.`;
  if (input.color !== undefined && !isPaperTone(input.color)) return 'That is not a paper tone.';
  if (input.status !== undefined && !(GOAL_STATUSES as readonly string[]).includes(input.status)) return 'That is not a goal status.';
  if (input.section !== undefined && !(GOAL_SECTIONS as readonly string[]).includes(input.section)) return 'That is not a section.';
  if (input.currency !== undefined && !(GOAL_CURRENCIES as readonly string[]).includes(input.currency)) return 'That is not a currency the goals use.';
  if (input.due !== undefined && input.due !== null && !isLocalDate(input.due)) return 'The due date is not a date.';
  if (input.progress !== undefined && input.progress !== null && !(Number.isInteger(input.progress) && input.progress >= 0 && input.progress <= 100)) return 'Progress is a whole number from 0 to 100.';
  if (input.targetAmount !== undefined && input.targetAmount !== null && !isStored(input.targetAmount)) return 'The target is not an amount.';
  if (input.currentAmount !== undefined && input.currentAmount !== null && !isStored(input.currentAmount)) return 'The current amount is not an amount.';
  return null;
}

/** Progress in percent: from the amounts when both exist and the target is positive, else the manual value. */
export function goalProgress(goal: Pick<GoalFacts, 'progress' | 'targetAmount' | 'currentAmount'>): number | null {
  if (goal.targetAmount !== null && goal.currentAmount !== null && BigInt(goal.targetAmount) > 0n) {
    const pct = Number((BigInt(goal.currentAmount) * 100n + BigInt(goal.targetAmount) / 2n) / BigInt(goal.targetAmount));
    return Math.min(100, Math.max(0, pct));
  }
  return goal.progress;
}

/**
 * What a status change does to the completion facts: achieving stamps the
 * date (once) and lifts a money goal's current amount to its target; any
 * other status clears the stamp.
 */
export function completionOf(goal: Pick<GoalFacts, 'completedAt' | 'targetAmount' | 'currentAmount'>, status: GoalStatus, now: string): { completedAt: string | null; currentAmount: string | null } {
  if (status !== 'achieved') return { completedAt: null, currentAmount: goal.currentAmount };
  const lifted = goal.targetAmount !== null && (goal.currentAmount === null || BigInt(goal.currentAmount) < BigInt(goal.targetAmount)) ? goal.targetAmount : goal.currentAmount;
  return { completedAt: goal.completedAt ?? now, currentAmount: lifted };
}

/** A goal is overdue when its date has passed and it is not achieved. */
export function isOverdue(goal: Pick<GoalFacts, 'due' | 'status'>, today: LocalDate): boolean {
  return goal.due !== null && goal.status !== 'achieved' && goal.due < today;
}

export function goalView(goal: GoalFacts, today: LocalDate): GoalView {
  return { ...goal, progressPct: goalProgress(goal), overdue: isOverdue(goal, today) };
}

/** Goals in board order: section, then order, then creation. */
export function sortGoals<T extends Pick<GoalFacts, 'section' | 'order' | 'createdAt'>>(goals: readonly T[]): T[] {
  return [...goals].sort((a, b) => GOAL_SECTIONS.indexOf(a.section) - GOAL_SECTIONS.indexOf(b.section) || a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

/**
 * The new order after a reorder: the given ids come first in their given
 * order (moved into `section` when one is named), the rest keep their relative
 * order, and every section is re-indexed 1..n. Returns only what changed.
 */
export function reorderGoals(goals: readonly Pick<GoalFacts, 'id' | 'section' | 'order' | 'createdAt'>[], ids: readonly string[], section?: GoalSection): { id: string; section: GoalSection; order: number }[] {
  const known = new Set(goals.map((goal) => goal.id));
  const moving = ids.filter((id) => known.has(id));
  const changes: { id: string; section: GoalSection; order: number }[] = [];
  for (const current of GOAL_SECTIONS) {
    const targetHere = section === undefined ? moving.filter((id) => goals.find((goal) => goal.id === id)?.section === current) : section === current ? moving : [];
    const rest = sortGoals(goals.filter((goal) => goal.section === current && !moving.includes(goal.id)));
    const ordered = [...targetHere, ...rest.map((goal) => goal.id)];
    ordered.forEach((id, index) => {
      const goal = goals.find((candidate) => candidate.id === id)!;
      if (goal.section !== current || goal.order !== index + 1) changes.push({ id, section: current, order: index + 1 });
    });
  }
  return changes;
}

/** Where a new goal lands in its section: after the last one. */
export function nextOrder(goals: readonly Pick<GoalFacts, 'section' | 'order'>[], section: GoalSection): number {
  return goals.filter((goal) => goal.section === section).reduce((top, goal) => Math.max(top, goal.order), 0) + 1;
}

/** Fixed-point money from what a person types, or null for nothing. */
export function amountFromInput(text: string): string | null {
  const trimmed = text.trim().replace(/,/g, '');
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ''] = trimmed.split('.');
  return (BigInt(whole!) * MONEY_SCALE + BigInt(fraction.padEnd(4, '0'))).toString();
}

// ---------------------------------------------------------------- timeline

export interface TimelineRange {
  readonly start: LocalDate;
  readonly end: LocalDate;
  readonly days: number;
}

const dayIndex = (date: string) => Math.floor(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86400000);
const pad2 = (value: number) => String(value).padStart(2, '0');

/** A whole year, or one of its quarters. */
export function timelineRange(year: number, quarter: 1 | 2 | 3 | 4 | null): TimelineRange {
  const startMonth = quarter === null ? 1 : (quarter - 1) * 3 + 1;
  const endMonth = quarter === null ? 12 : startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const start = `${year}-${pad2(startMonth)}-01` as LocalDate;
  const end = `${year}-${pad2(endMonth)}-${pad2(lastDay)}` as LocalDate;
  return { start, end, days: dayIndex(end) - dayIndex(start) + 1 };
}

/** The pin's position across the range, 0 to 1, or null when the date is outside it. */
export function timelinePosition(date: LocalDate, range: TimelineRange): number | null {
  const index = dayIndex(date) - dayIndex(range.start);
  if (index < 0 || index >= range.days) return null;
  return (index + 0.5) / range.days;
}

/** The date at a position across the range, for dragging a pin. */
export function dateAtPosition(position: number, range: TimelineRange): LocalDate {
  const index = Math.min(range.days - 1, Math.max(0, Math.floor(position * range.days)));
  const date = new Date((dayIndex(range.start) + index) * 86400000);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` as LocalDate;
}

/** The date a goal is pinned by: achieved goals by their completion, the rest by their due date. */
export function pinDate(goal: Pick<GoalFacts, 'due' | 'status' | 'completedAt'>): LocalDate | null {
  if (goal.status === 'achieved' && goal.completedAt) return goal.completedAt.slice(0, 10) as LocalDate;
  return goal.due;
}
