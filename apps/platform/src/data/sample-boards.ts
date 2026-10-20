import { completionOf, nextOrder, noteCheck, reorderGoals, type BoardNoteView, type GoalFacts, type GoalInput, type GoalSection, type NoteInput, type PaperTone } from '@basis/shared';
import { localDate } from '@basis/shared';

// SAMPLE DATA for `--mode sample`: a few notes the team pinned this week and
// the owner's goals for the launch season. The same rules as the functions
// apply here; nothing is accepted that the server would refuse.

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const now = () => new Date().toISOString();
const ago = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

const store = {
  notes: [
    { id: 'note-1', text: 'Lab dips for Skin 02\nQianfang sends the second round Thursday. Check under D65 before anyone says yes.', color: 'milk', x: 0.04, y: 32, z: 1, authorUid: 'sample-owner', authorName: 'Owner', editedByName: '', createdAt: ago(3), updatedAt: ago(3) },
    { id: 'note-2', text: 'Ashdod pickup\nForwarder confirmed Tuesday 08:00. Pallets 1–4 only; the fifth waits for customs.', color: 'powder', x: 0.36, y: 60, z: 2, authorUid: 'sample-logistics', authorName: 'Logistics coordinator', editedByName: '', createdAt: ago(2), updatedAt: ago(2) },
    { id: 'note-3', text: 'Milk is "off-white" at the mill\nColour no. 01 on every PO line. Never write "white".', color: 'sand', x: 0.62, y: 20, z: 3, authorUid: 'sample-purchasing', authorName: 'Purchasing', editedByName: '', createdAt: ago(1), updatedAt: ago(1) },
    { id: 'note-4', text: 'Showroom Friday\nTwo ateliers coming at 11:00. Bring the tulle swatch book.', color: 'linen', x: 0.2, y: 300, z: 4, authorUid: 'sample-sales', authorName: 'Sales', editedByName: 'Owner', createdAt: ago(1), updatedAt: ago(0) },
  ] as Mutable<BoardNoteView>[],
  goals: [
    { id: 'goal-1', title: 'First container received and released', body: 'PO-26-0001 through QC and into the warehouse before the atelier season opens.', color: 'bone', status: 'in_progress', section: 'ops', order: 1, due: localDate('2026-11-30'), progress: 60, targetAmount: null, currentAmount: null, currency: 'USD', completedAt: null, createdAt: ago(40), updatedAt: ago(2), createdByName: 'Owner' },
    { id: 'goal-2', title: 'Shade standards approved for every launch shade', body: 'A physical standard per shade and product, kept in the cabinet, referenced on every lot.', color: 'powder', status: 'open', section: 'ops', order: 2, due: localDate('2026-12-15'), progress: 25, targetAmount: null, currentAmount: null, currency: 'USD', completedAt: null, createdAt: ago(35), updatedAt: ago(35), createdByName: 'Owner' },
    { id: 'goal-3', title: 'Website live with the sample kit request', body: '', color: 'milk', status: 'achieved', section: 'ops', order: 3, due: localDate('2026-10-10'), progress: 100, targetAmount: null, currentAmount: null, currency: 'USD', completedAt: ago(9), createdAt: ago(60), updatedAt: ago(9), createdByName: 'Owner' },
    { id: 'goal-4', title: 'Q4 wholesale revenue', body: 'Ateliers and salons, first orders from the launch range.', color: 'sand', status: 'in_progress', section: 'finance', order: 1, due: localDate('2026-12-31'), progress: null, targetAmount: '1200000000', currentAmount: '292250000', currency: 'USD', completedAt: null, createdAt: ago(50), updatedAt: ago(1), createdByName: 'Owner' },
    { id: 'goal-5', title: 'Landed cost under 2.40 USD/m on Powermesh', body: 'Sea freight consolidated, duty classified, no air.', color: 'linen', status: 'paused', section: 'finance', order: 2, due: null, progress: null, targetAmount: null, currentAmount: null, currency: 'USD', completedAt: null, createdAt: ago(20), updatedAt: ago(5), createdByName: 'Owner' },
  ] as Mutable<GoalFacts>[],
  sequence: { note: 4, goal: 5 },
};

export const sampleBoards = {
  async notes(): Promise<BoardNoteView[]> {
    return structuredClone(store.notes);
  },
  async pin(input: NoteInput & { z: number }): Promise<string> {
    const problem = noteCheck(input, store.notes.length);
    if (problem) throw new Error(problem);
    store.sequence.note += 1;
    const id = `note-${store.sequence.note}`;
    store.notes.push({ id, text: input.text.trim(), color: input.color, x: input.x, y: input.y, z: input.z, authorUid: 'sample-owner', authorName: 'Owner', editedByName: '', createdAt: now(), updatedAt: now() });
    return id;
  },
  async edit(input: { id: string; text: string; color: PaperTone }): Promise<void> {
    const note = store.notes.find((candidate) => candidate.id === input.id);
    if (!note) throw new Error('No such note.');
    const problem = noteCheck(input);
    if (problem) throw new Error(problem);
    note.text = input.text.trim();
    note.color = input.color;
    note.editedByName = 'Owner';
    note.updatedAt = now();
  },
  async move(input: { id: string; x: number; y: number; z: number }): Promise<void> {
    const note = store.notes.find((candidate) => candidate.id === input.id);
    if (!note) throw new Error('No such note.');
    const problem = noteCheck(input);
    if (problem) throw new Error(problem);
    note.x = input.x;
    note.y = input.y;
    note.z = input.z;
  },
  async takeDown(id: string): Promise<void> {
    store.notes = store.notes.filter((note) => note.id !== id);
  },

  async goals(): Promise<GoalFacts[]> {
    return structuredClone(store.goals);
  },
  async saveGoal(input: GoalInput & { id?: string }): Promise<{ id: string }> {
    const existing = input.id ? store.goals.find((goal) => goal.id === input.id) : undefined;
    const completion = completionOf(existing ?? { completedAt: null, targetAmount: input.targetAmount, currentAmount: input.currentAmount }, input.status, now());
    const order = existing && existing.section === input.section ? existing.order : nextOrder(store.goals, input.section);
    const facts = { ...input, title: input.title.trim(), order, currentAmount: input.status === 'achieved' ? completion.currentAmount : input.currentAmount, completedAt: completion.completedAt, updatedAt: now() };
    if (existing) {
      const left = existing.section !== input.section ? existing.section : null;
      Object.assign(existing, facts);
      if (left) for (const change of reorderGoals(store.goals.filter((goal) => goal.id !== existing.id), [])) Object.assign(store.goals.find((goal) => goal.id === change.id)!, change);
      return { id: existing.id };
    }
    store.sequence.goal += 1;
    const id = `goal-${store.sequence.goal}`;
    store.goals.push({ ...facts, id, createdAt: now(), createdByName: 'Owner' });
    return { id };
  },
  async reorder(input: { ids: string[]; section?: GoalSection }): Promise<{ changed: number }> {
    const changes = reorderGoals(store.goals, input.ids, input.section);
    for (const change of changes) Object.assign(store.goals.find((goal) => goal.id === change.id)!, change, { updatedAt: now() });
    return { changed: changes.length };
  },
  async deleteGoal(id: string): Promise<{ id: string }> {
    store.goals = store.goals.filter((goal) => goal.id !== id);
    for (const change of reorderGoals(store.goals, [])) Object.assign(store.goals.find((goal) => goal.id === change.id)!, change);
    return { id };
  },
};
