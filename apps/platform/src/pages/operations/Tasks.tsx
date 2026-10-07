import { daysBetween, entityPath, formatLocalDate, todayIn } from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useCompleteTask, useCreateTask, useOpenTasks, useStaff, type TaskView } from '../../data/tasks';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';
import { OperationsTabs } from './Operations';
import { useT } from '../../i18n';

// What people owe. A task can point at a record; the Gateway lists what is
// due and the overdue rule raises what is late.

export function NewTaskDialog({ open, onClose, entityType = '', entityId = '' }: { open: boolean; onClose: () => void; entityType?: string; entityId?: string }) {
  const t = useT();
  const session = useRequiredSession();
  const staff = useStaff();
  const create = useCreateTask();
  const [form, setForm] = useState({ title: '', details: '', assigneeUid: session.uid, dueOn: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError('Say what needs doing.');
    try {
      await create.mutateAsync({ title: form.title.trim(), details: form.details.trim(), assigneeUid: form.assigneeUid, dueOn: form.dueOn, entityType, entityId });
      setForm({ title: '', details: '', assigneeUid: session.uid, dueOn: '' });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The task could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('New task')} description={entityId ? `About ${entityId}.` : undefined}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('What needs doing')} required value={form.title} onChange={set('title')} className="sm:col-span-2" />
        <TextArea label={t('Details')} value={form.details} onChange={set('details')} className="sm:col-span-2" />
        <SelectField label={t('Assigned to')} value={form.assigneeUid} onChange={set('assigneeUid')}>
          <option value="">{t('Unassigned')}</option>
          {staff.data?.map((person) => (
            <option key={person.uid} value={person.uid}>
              {person.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Due')} type="date" value={form.dueOn} onChange={set('dueOn')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Create task')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Due({ task, today }: { task: TaskView; today: string }) {
  const t = useT();
  if (!task.dueOn) return <span className="text-ink-muted">{t('No date')}</span>;
  const late = daysBetween(task.dueOn, today as never);
  if (late > 0) return <StatusChip tone="critical">{formatLocalDate(task.dueOn)}</StatusChip>;
  if (late === 0) return <StatusChip tone="caution">{t('Today')}</StatusChip>;
  return <span className="code text-ink-soft">{formatLocalDate(task.dueOn)}</span>;
}

export function Tasks() {
  const t = useT();
  const tasks = useOpenTasks();
  const complete = useCompleteTask();
  const [creating, setCreating] = useState(false);
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const rows = tasks.data ?? [];

  return (
    <>
      <ModuleTitle
        number="01"
        title={t('Operations')}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden="true" />
            {t('New task')}
          </Button>
        }
      >
        {t('Open tasks across the company, soonest due first.')}
      </ModuleTitle>
      <OperationsTabs active="tasks" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Open tasks')} count={rows.length} flush>
          {tasks.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading tasks')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('Nothing open')} action={<Button variant="primary" onClick={() => setCreating(true)}>{t('New task')}</Button>}>{t('Tasks are what people owe: a lab dip to approve, a document to chase, a supplier to answer.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Open tasks')}>
              <thead>
                <tr>
                  <Th>{t('Task')}</Th>
                  <Th>{t('About')}</Th>
                  <Th>{t('Assigned to')}</Th>
                  <Th>{t('Due')}</Th>
                  <Th>{t('Done')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => (
                  <Tr key={task.id}>
                    <Td>
                      <p className="font-medium">{task.title}</p>
                      {task.details && <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{task.details}</p>}
                    </Td>
                    <Td>
                      {task.entityId ? (
                        <Link to={entityPath(task.entityType, task.entityId)} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {task.entityId}
                        </Link>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-soft">{task.assigneeName || 'Unassigned'}</Td>
                    <Td className="whitespace-nowrap">
                      <Due task={task} today={today} />
                    </Td>
                    <Td>
                      <Button size="sm" onClick={() => complete.mutate(task.id)} disabled={complete.isPending}>{t('Mark done')}</Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      <NewTaskDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
