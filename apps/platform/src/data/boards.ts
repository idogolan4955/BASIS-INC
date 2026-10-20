import { FUNCTION_NAMES, goalView, isLocalDate, todayIn, type BoardNoteView, type GoalFacts, type GoalInput, type GoalSection, type GoalView, type NoteInput, type PaperTone } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// The boards' data. Bulletin notes go straight through the connector, so a
// drag lands as fast as the network allows; goals go through the functions,
// which keep the order and the completion rule.

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('../lib/connector').then((m) => m.platform())]);
  return { dc: dataConnect, sdk };
}
const sample = async () => (await import('./sample-boards')).sampleBoards;
const today = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

// The enum spells the deep powder with an underscore; the interface with a hyphen.
const toneIn = (tone: string): PaperTone => tone.replace('_', '-') as PaperTone;
const toneOut = (tone: PaperTone) => tone.replace('-', '_');

// ---------------------------------------------------------------- bulletin board

export function useBoardNotes() {
  return useQuery({
    queryKey: ['board', 'notes'],
    queryFn: async (): Promise<BoardNoteView[]> => {
      if (isSample) return (await sample()).notes();
      const { dc, sdk } = await live();
      const { data } = await sdk.listBoardNotes(dc);
      return data.boardNotes.map((row) => ({ id: row.id, text: row.text, color: toneIn(row.color), x: row.x, y: row.y, z: row.z, authorUid: row.author.uid, authorName: row.author.name, editedByName: row.editedBy?.name ?? '', createdAt: row.createdAt, updatedAt: row.updatedAt }));
    },
  });
}

function useBoardMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

export function usePinNote() {
  return useBoardMutation(async (input: NoteInput & { z: number }) => {
    if (isSample) return (await sample()).pin(input);
    const { dc, sdk } = await live();
    const { data } = await sdk.insertBoardNote(dc, { text: input.text.trim(), color: sdk.PaperTone[toneOut(input.color) as keyof typeof sdk.PaperTone], x: input.x, y: input.y, z: input.z });
    return data.boardNote_insert.id;
  });
}

export function useEditNote() {
  return useBoardMutation(async (input: { id: string; text: string; color: PaperTone }) => {
    if (isSample) return (await sample()).edit(input);
    const { dc, sdk } = await live();
    await sdk.editBoardNote(dc, { id: input.id, text: input.text.trim(), color: sdk.PaperTone[toneOut(input.color) as keyof typeof sdk.PaperTone] });
  });
}

export function useMoveNote() {
  return useBoardMutation(async (input: { id: string; x: number; y: number; z: number }) => {
    if (isSample) return (await sample()).move(input);
    const { dc, sdk } = await live();
    await sdk.moveBoardNote(dc, input);
  });
}

export function useTakeDownNote() {
  return useBoardMutation(async (input: { id: string; own: boolean }) => {
    if (isSample) return (await sample()).takeDown(input.id);
    const { dc, sdk } = await live();
    if (input.own) await sdk.deleteOwnBoardNote(dc, { id: input.id });
    else await sdk.deleteBoardNote(dc, { id: input.id });
  });
}

// ---------------------------------------------------------------- goals

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<GoalView[]> => {
      const day = today();
      if (isSample) return (await sample()).goals().then((goals) => goals.map((goal) => goalView(goal, day)));
      const { dc, sdk } = await live();
      const { data } = await sdk.listGoals(dc);
      return data.goals.map((row) => {
        const facts: GoalFacts = {
          id: row.id,
          title: row.title,
          body: row.body ?? '',
          color: toneIn(row.color),
          status: row.status,
          section: row.section as GoalSection,
          order: row.order,
          due: row.due && isLocalDate(row.due) ? row.due : null,
          progress: row.progress ?? null,
          targetAmount: row.targetAmount ?? null,
          currentAmount: row.currentAmount ?? null,
          currency: row.currency as GoalFacts['currency'],
          completedAt: row.completedAt ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          createdByName: row.createdBy?.name ?? '',
        };
        return goalView(facts, day);
      });
    },
  });
}

function useGoalMutation<TInput>(run: (input: TInput) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useSaveGoal() {
  return useGoalMutation(async (input: GoalInput & { id?: string }) => {
    if (isSample) return (await sample()).saveGoal(input);
    return callFunction<typeof input, { id: string }>(FUNCTION_NAMES.saveGoal, input);
  });
}

export function useReorderGoals() {
  return useGoalMutation(async (input: { ids: string[]; section?: GoalSection }) => {
    if (isSample) return (await sample()).reorder(input);
    return callFunction<typeof input, { changed: number }>(FUNCTION_NAMES.reorderGoals, input);
  });
}

export function useDeleteGoal() {
  return useGoalMutation(async (id: string) => {
    if (isSample) return (await sample()).deleteGoal(id);
    return callFunction<{ id: string }, { id: string }>(FUNCTION_NAMES.deleteGoal, { id });
  });
}
