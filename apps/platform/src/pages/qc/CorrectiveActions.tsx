import { ACTION_STATES, ACTION_STATE_LABEL, ACTION_STATE_TONE, formatLocalDate, type ActionState } from '@basis/shared';
import { Button, Dialog, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { useCorrectiveActions, useUpdateCorrectiveAction, type ActionView } from '../../data/quality';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';
import { QcTabs } from './Qc';

// Corrective actions across inspections: owned, dated, verified before closing.

function UpdateDialog({ action, open, onClose, canClose }: { action: ActionView; open: boolean; onClose: () => void; canClose: boolean }) {
  const t = useT();
  const update = useUpdateCorrectiveAction();
  const [form, setForm] = useState({ state: action.state, rootCause: action.rootCause, action: action.action, ownerName: action.ownerName, dueOn: action.dueOn ?? '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await update.mutateAsync({ number: action.number, state: form.state as ActionState, rootCause: form.rootCause, action: form.action, ownerName: form.ownerName, dueOn: form.dueOn || null, note: form.note.trim() || undefined });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('Could not save.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={`${action.number} · ${action.title}`} description={action.description || undefined}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('State')} value={form.state} onChange={set('state')}>
          {ACTION_STATES.filter((state) => state !== 'closed' || canClose).map((state) => (
            <option key={state} value={state}>
              {t(ACTION_STATE_LABEL[state])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Due on')} type="date" value={form.dueOn} onChange={set('dueOn')} />
        <TextField label={t('Owner')} value={form.ownerName} onChange={set('ownerName')} className="sm:col-span-2" />
        <TextArea label={t('Root cause')} value={form.rootCause} onChange={set('rootCause')} rows={2} className="sm:col-span-2" />
        <TextArea label={t('Action taken')} value={form.action} onChange={set('action')} rows={2} className="sm:col-span-2" />
        <TextArea label={t('Note')} value={form.note} onChange={set('note')} rows={2} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel={t('Saving')}>
            {t('Save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CorrectiveActions() {
  const t = useT();
  const session = useRequiredSession();
  const { number } = useParams();
  const actions = useCorrectiveActions();
  const [editing, setEditing] = useState<string | null>(number ?? null);
  const canRecord = ['owner', 'operations', 'qc'].includes(session.role);
  const canClose = session.role === 'owner' || session.role === 'qc';
  const rows = actions.data ?? [];
  const order = { open: 0, in_progress: 1, verification: 2, closed: 3 } as const;
  const sorted = [...rows].sort((a, b) => order[a.state] - order[b.state] || (a.dueOn ?? '9999').localeCompare(b.dueOn ?? '9999'));
  const current = rows.find((action) => action.number === editing);
  return (
    <>
      <ModuleTitle number="05" title={t('QC')}>
        {t('What follows a finding: owned, dated, verified before it closes.')}
      </ModuleTitle>
      <QcTabs active="actions" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Corrective actions')} count={rows.filter((action) => action.state !== 'closed').length} flush>
          {actions.isPending ? (
            <p className="px-5 py-6 text-ink-muted">{t('Loading actions')}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">{t('No corrective actions. They open from an inspection’s findings.')}</p>
          ) : (
            <Ledger caption={t('Corrective actions')}>
              <thead>
                <tr>
                  <Th>{t('Action')}</Th>
                  <Th>{t('Title')}</Th>
                  <Th>{t('From')}</Th>
                  <Th>{t('Owner')}</Th>
                  <Th>{t('Due on')}</Th>
                  <Th>{t('State')}</Th>
                  {canRecord && <Th>{t('Update')}</Th>}
                </tr>
              </thead>
              <tbody>
                {sorted.map((action) => (
                  <Tr key={action.id}>
                    <Td className="code whitespace-nowrap">{action.number}</Td>
                    <Td className="min-w-56 font-medium">{action.title}</Td>
                    <Td>
                      {action.inspectionNumber && (
                        <Link to={`/qc/inspections/${action.inspectionNumber}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {action.inspectionNumber}
                        </Link>
                      )}
                      {action.lotNumber && (
                        <Link to={`/inventory/lots/${action.lotNumber}`} className="code ms-3 underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {action.lotNumber}
                        </Link>
                      )}
                    </Td>
                    <Td className="text-ink-soft">{action.ownerName || action.supplierName || '\u2014'}</Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{action.dueOn ? formatLocalDate(action.dueOn) : '\u2014'}</Td>
                    <Td>
                      <StatusChip tone={ACTION_STATE_TONE[action.state]}>{t(ACTION_STATE_LABEL[action.state])}</StatusChip>
                    </Td>
                    {canRecord && (
                      <Td>
                        <Button size="sm" variant="quiet" onClick={() => setEditing(action.number)}>
                          {t('Update')}
                        </Button>
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {current && canRecord && <UpdateDialog key={current.number} action={current} open onClose={() => setEditing(null)} canClose={canClose} />}
    </>
  );
}
