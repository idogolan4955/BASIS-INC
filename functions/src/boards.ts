import { GOAL_CURRENCIES, GOAL_SECTIONS, GOAL_STATUSES, PAPER_TONES, completionOf, goalCheck, nextOrder, reorderGoals as reorderPlan, type GoalSection, type GoalStatus } from '@basis/shared';
import { onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { REGION, audit, callerOf, failure, graphql, requireRole } from './lib';

// The goals board. Bulletin notes are written through the connector by
// anyone; goals come through here because the order within a section and the
// completion rule are kept on the server, and every change is audited.

const OWNER = ['owner'] as const;
const stored = z.string().regex(/^\d+$/, 'Fixed-point amount expected');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date expected');

function validationFailure(error: z.ZodError): never {
  const details: Record<string, string> = {};
  for (const issue of error.issues) details[issue.path.join('.') || 'input'] = issue.message;
  throw failure('validation', 'Check the details.', details);
}

// The PaperTone enum spells the deep powder with an underscore.
const toneOut = (tone: string) => tone.replace('-', '_');

const goalInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(140),
  body: z.string().max(4000).default(''),
  color: z.enum(PAPER_TONES).default('bone'),
  status: z.enum(GOAL_STATUSES).default('open'),
  section: z.enum(GOAL_SECTIONS).default('ops'),
  due: date.nullable().default(null),
  progress: z.number().int().min(0).max(100).nullable().default(null),
  targetAmount: stored.nullable().default(null),
  currentAmount: stored.nullable().default(null),
  currency: z.enum(GOAL_CURRENCIES).default('USD'),
});

interface GoalRow {
  id: string;
  section: GoalSection;
  order: number;
  status: GoalStatus;
  completedAt: string | null;
  targetAmount: string | null;
  currentAmount: string | null;
  createdAt: string;
}

async function loadGoals(): Promise<GoalRow[]> {
  const { goals } = await graphql<{ goals: GoalRow[] }>(`query { goals(limit: 500) { id section order status completedAt targetAmount currentAmount createdAt } }`);
  return goals;
}

const GOAL_FIELDS = `$title: String!, $body: String, $color: PaperTone!, $status: GoalStatus!, $section: GoalSection!, $order: Int!, $due: Date, $progress: Int, $targetAmount: Int64, $currentAmount: Int64, $currency: String!, $completedAt: Timestamp`;
const GOAL_DATA = `title: $title, body: $body, color: $color, status: $status, section: $section, order: $order, due: $due, progress: $progress, targetAmount: $targetAmount, currentAmount: $currentAmount, currency: $currency, completedAt: $completedAt`;

/** A goal created or changed. The completion rule and the section order are applied here, never trusted from the form. */
export const saveGoal = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, OWNER, 'Keeping the goals board');
  const parsed = goalInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const input = parsed.data;
  const problem = goalCheck({ ...input, due: input.due as never });
  if (problem) throw failure('validation', problem);

  const goals = await loadGoals();
  const existing = input.id ? goals.find((goal) => goal.id === input.id) : undefined;
  if (input.id && !existing) throw failure('not_found', 'No such goal.');
  const now = new Date().toISOString();
  const completion = completionOf(existing ?? { completedAt: null, targetAmount: input.targetAmount, currentAmount: input.currentAmount }, input.status, now);
  // A goal that changes section goes to the end of the new one.
  const order = existing && existing.section === input.section ? existing.order : nextOrder(goals, input.section);
  const variables = {
    title: input.title.trim(),
    body: input.body,
    color: toneOut(input.color),
    status: input.status,
    section: input.section,
    order,
    due: input.due,
    progress: input.progress,
    targetAmount: input.targetAmount,
    currentAmount: input.status === 'achieved' ? completion.currentAmount : input.currentAmount,
    currency: input.currency,
    completedAt: completion.completedAt,
  };
  let id: string;
  if (existing) {
    await graphql(`mutation ($id: UUID!, ${GOAL_FIELDS}) { goal_update(id: $id, data: { ${GOAL_DATA}, updatedAt_expr: "request.time" }) }`, { id: existing.id, ...variables });
    id = existing.id;
    if (existing.section !== input.section) {
      // The section it left closes its gap.
      for (const change of reorderPlan(goals.filter((goal) => goal.id !== existing.id), [])) await graphql(`mutation ($id: UUID!, $order: Int!) { goal_update(id: $id, data: { order: $order }) }`, change);
    }
  } else {
    const { goal_insert } = await graphql<{ goal_insert: { id: string } }>(`mutation (${GOAL_FIELDS}, $uid: String!) { goal_insert(data: { ${GOAL_DATA}, createdByUid: $uid }) }`, { ...variables, uid: caller.uid });
    id = goal_insert.id;
  }
  await audit(caller.uid, existing ? 'goal.update' : 'goal.create', 'goal', id, existing ?? null, variables);
  return { id };
});

const reorderInput = z.object({ ids: z.array(z.string()).min(1).max(500), section: z.enum(GOAL_SECTIONS).optional() });

/** The given goals first, in their given order, moved into a section when one is named; every section re-indexed. */
export const reorderGoals = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, OWNER, 'Keeping the goals board');
  const parsed = reorderInput.safeParse(request.data);
  if (!parsed.success) validationFailure(parsed.error);
  const goals = await loadGoals();
  const changes = reorderPlan(goals, parsed.data.ids, parsed.data.section);
  for (const change of changes) {
    await graphql(`mutation ($id: UUID!, $section: GoalSection!, $order: Int!) { goal_update(id: $id, data: { section: $section, order: $order, updatedAt_expr: "request.time" }) }`, change);
  }
  await audit(caller.uid, 'goal.reorder', 'goal', parsed.data.section ?? 'board', null, { ids: parsed.data.ids, section: parsed.data.section ?? null, changed: changes.length });
  return { changed: changes.length };
});

export const deleteGoal = onCall({ region: REGION }, async (request) => {
  const caller = callerOf(request);
  requireRole(caller, OWNER, 'Keeping the goals board');
  const { id } = z.object({ id: z.string().min(1) }).parse(request.data);
  const goals = await loadGoals();
  const goal = goals.find((candidate) => candidate.id === id);
  if (!goal) throw failure('not_found', 'No such goal.');
  await graphql(`mutation ($id: UUID!) { goal_delete(id: $id) }`, { id });
  for (const change of reorderPlan(goals.filter((candidate) => candidate.id !== id), [])) await graphql(`mutation ($id: UUID!, $order: Int!) { goal_update(id: $id, data: { order: $order }) }`, change);
  await audit(caller.uid, 'goal.delete', 'goal', id, goal, null);
  return { id };
});

