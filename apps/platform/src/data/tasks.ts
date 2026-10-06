import { type LocalDate, isLocalDate } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSample } from './source';

// Tasks: something a person owes, optionally about a record.

export interface TaskView {
  readonly id: string;
  readonly title: string;
  readonly details: string;
  readonly dueOn: LocalDate | null;
  readonly assigneeUid: string;
  readonly assigneeName: string;
  readonly createdByName: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly createdAt: string;
}

export interface StaffOption {
  readonly uid: string;
  readonly name: string;
  readonly role: string;
}

const sampleStore = {
  staff: [
    { uid: 'sample-owner', name: 'Sample Owner', role: 'owner' },
    { uid: 'sample-purchasing', name: 'Dana Perets', role: 'purchasing' },
    { uid: 'sample-logistics', name: 'Noa Bar', role: 'logistics' },
    { uid: 'sample-qc', name: 'Wei Lan', role: 'qc' },
  ] as StaffOption[],
  tasks: [] as TaskView[],
};

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

export function useStaff() {
  return useQuery({
    queryKey: ['staff'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StaffOption[]> => {
      if (isSample) return sampleStore.staff;
      const { dc, sdk } = await live();
      const { data } = await sdk.listStaff(dc);
      return data.users.map((user) => ({ uid: user.uid, name: user.name, role: user.role }));
    },
  });
}

export async function loadOpenTasks(): Promise<TaskView[]> {
  if (isSample) return [...sampleStore.tasks];
  const { dc, sdk } = await live();
  const { data } = await sdk.listOpenTasks(dc);
  return data.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    details: task.details ?? '',
    dueOn: task.dueOn && isLocalDate(task.dueOn) ? task.dueOn : null,
    assigneeUid: task.assignee?.uid ?? '',
    assigneeName: task.assignee?.name ?? '',
    createdByName: task.createdBy?.name ?? '',
    entityType: task.entityType ?? '',
    entityId: task.entityId ?? '',
    createdAt: task.createdAt,
  }));
}

export function useOpenTasks() {
  return useQuery({ queryKey: ['tasks', 'open'], queryFn: loadOpenTasks });
}

export interface NewTaskInput {
  title: string;
  details: string;
  assigneeUid: string;
  dueOn: string;
  entityType: string;
  entityId: string;
}

export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTaskInput): Promise<string> => {
      if (isSample) {
        const id = `task-${sampleStore.tasks.length + 1}`;
        const assignee = sampleStore.staff.find((person) => person.uid === input.assigneeUid);
        sampleStore.tasks.push({
          id,
          title: input.title,
          details: input.details,
          dueOn: isLocalDate(input.dueOn) ? input.dueOn : null,
          assigneeUid: input.assigneeUid,
          assigneeName: assignee?.name ?? '',
          createdByName: 'Sample session',
          entityType: input.entityType,
          entityId: input.entityId,
          createdAt: new Date().toISOString(),
        });
        return id;
      }
      const { dc, sdk } = await live();
      const { data } = await sdk.createTask(dc, {
        title: input.title,
        details: input.details || null,
        assigneeUid: input.assigneeUid || null,
        dueOn: input.dueOn || null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
      });
      return data.task_insert.id;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
      await client.invalidateQueries({ queryKey: ['gateway'] });
    },
  });
}

export function useCompleteTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (isSample) {
        sampleStore.tasks = sampleStore.tasks.filter((task) => task.id !== id);
        return;
      }
      const { dc, sdk } = await live();
      await sdk.completeTask(dc, { id });
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
      await client.invalidateQueries({ queryKey: ['gateway'] });
    },
  });
}
