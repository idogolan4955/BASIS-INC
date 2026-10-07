import { Panel, cn } from '@basis/ui';
import { NavLink } from 'react-router';
import { EtaRail } from '../../components/EtaRail';
import { Pipeline } from '../../components/Pipeline';
import { useOperations } from '../../data/operations';
import { ModuleTitle } from '../products/ProductsIndex';
import { useT } from '../../i18n';

// Module 01: the pipeline of goods and the calendar of what is coming,
// read from runs, lots, payments and tasks.

export function OperationsTabs({ active }: { active: 'pipeline' | 'tasks' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Operations sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('pipeline', '/operations', t('Pipeline and calendar'))}
      {tab('tasks', '/operations/tasks', t('Tasks'))}
    </nav>
  );
}

export function Operations() {
  const t = useT();
  const operations = useOperations();
  const data = operations.data;
  return (
    <>
      <ModuleTitle number="01" title={t('Operations')}>
        {t('Goods in motion, dates coming up, work owed. Nothing here is set by hand.')}
      </ModuleTitle>
      <OperationsTabs active="pipeline" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {operations.isPending ? (
          <p className="text-ink-muted">{t('Reading the pipeline')}</p>
        ) : operations.error ? (
          <p className="text-critical">Operations could not be loaded. {operations.error.message}</p>
        ) : data ? (
          <>
            <Panel title={t('In motion')}>
              <Pipeline cells={data.pipeline} />
              <p className="mt-3 text-[0.8125rem] text-ink-muted">{t('Metres by stage. Production counts what is planned and not yet produced; QC the lots awaiting inspection; ready to ship what is released, packed and not yet loaded; transit and customs what booked shipments carry.')}</p>
            </Panel>
            <Panel title={t('Next 30 days')} count={data.calendar.length}>
              <EtaRail entries={data.calendar} asOf={data.asOf} />
            </Panel>
          </>
        ) : null}
      </div>
    </>
  );
}
