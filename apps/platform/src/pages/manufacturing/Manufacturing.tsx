import {
  HEALTH_LABEL,
  HEALTH_TONE,
  PO_STATE_LABEL,
  PO_STATE_TONE,
  RUN_STATE_LABEL,
  RUN_STATE_TONE,
  canManageModule,
  formatLocalDate,
  formatQuantity,
  metresNumber,
  quantityFromStored,
} from '@basis/shared';
import { Button, EmptyState, Ledger, Meter, Panel, StatusChip, Td, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { ExportMenu } from '../../components/ExportMenu';
import { useProcessTemplates, useProductionRuns, usePurchaseOrders } from '../../data/manufacturing';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';
import { NewPurchaseOrderDialog } from './NewPurchaseOrderDialog';
import { useT } from '../../i18n';

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const dateOrDash = (value: string | null) => (value ? formatLocalDate(value as never) : '—');

export function ManufacturingTabs({ active }: { active: 'orders' | 'runs' | 'templates' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink
      key={key}
      to={to}
      end
      className={cn(
        '-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150',
        active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink',
      )}
    >
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Manufacturing sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('orders', '/manufacturing', t('Purchase orders'))}
      {tab('runs', '/manufacturing/runs', t('Production runs'))}
      {tab('templates', '/manufacturing/templates', t('Process templates'))}
    </nav>
  );
}

export function PurchaseOrders() {
  const t = useT();
  const session = useRequiredSession();
  const orders = usePurchaseOrders();
  const [creating, setCreating] = useState(false);
  const manage = canManageModule(session.role, 'manufacturing');
  const rows = orders.data ?? [];

  return (
    <>
      <ModuleTitle
        number="04"
        title={t('Manufacturing')}
        actions={
          <>
            <ExportMenu
              ledger="purchase-orders"
              size="md"
              rows={rows.map((po) => ({ number: po.number, supplier: po.supplierName, state: po.state, currency: po.currency, incoterm: null, namedPlace: null, issuedOn: po.issuedOn, confirmedOn: null, requestedExFactory: po.requestedExFactory, lines: po.lineCount, quantityM: metresNumber(po.totalQuantity), amount: null, paymentTerms: null }))}
            />
            {manage && (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus size={16} aria-hidden="true" />
                {t('New purchase order')}
              </Button>
            )}
          </>
        }
      >
        {t('Purchase orders, production runs and their milestones.')}
      </ModuleTitle>
      <ManufacturingTabs active="orders" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Purchase orders')} count={rows.length} flush>
          {orders.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading purchase orders')}</p>
          ) : orders.error ? (
            <p className="px-5 py-8 text-critical">Purchase orders could not be loaded. {orders.error.message}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No purchase orders yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New purchase order')}</Button> : undefined}>{t('A purchase order commits quantities of SKUs to a supplier. Issue it, confirm it, then open a production run on it.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Purchase orders')}>
              <thead>
                <tr>
                  <Th>{t('Order')}</Th>
                  <Th>{t('Supplier')}</Th>
                  <Th>{t('Products')}</Th>
                  <Th numeric>{t('Quantity')}</Th>
                  <Th>{t('Ex-factory')}</Th>
                  <Th>{t('Production')}</Th>
                  <Th>{t('Status')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((po) => (
                  <Tr key={po.number}>
                    <Td>
                      <Link to={`/manufacturing/purchase-orders/${po.number}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {po.number}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">{po.supplierName}</Td>
                    <Td className="text-ink-soft">{po.products.join(', ')}</Td>
                    <Td numeric>{metres(po.totalQuantity)}</Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{dateOrDash(po.requestedExFactory)}</Td>
                    <Td>
                      {po.runs.length === 0 ? (
                        <span className="text-ink-muted">{po.state === 'confirmed' ? t('No run yet') : '—'}</span>
                      ) : (
                        <span className="flex flex-wrap gap-3">
                          {po.runs.map((run) => (
                            <StatusChip key={run.number} tone={HEALTH_TONE[run.health]}>
                              {run.number} {t(HEALTH_LABEL[run.health]).toLowerCase()}
                            </StatusChip>
                          ))}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <StatusChip tone={PO_STATE_TONE[po.state]}>{t(PO_STATE_LABEL[po.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <NewPurchaseOrderDialog open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

export function ProductionRuns() {
  const t = useT();
  const runs = useProductionRuns();
  const rows = runs.data ?? [];
  return (
    <>
      <ModuleTitle
        number="04"
        title={t('Manufacturing')}
        actions={
          <ExportMenu
            ledger="production-runs"
            size="md"
            rows={rows.map((run) => ({ number: run.number, order: run.purchaseOrderNumber, supplier: run.supplierName, template: run.templateName, state: run.state, health: run.health, plannedStart: run.plannedStart, plannedEnd: run.plannedEnd, forecastEnd: run.forecastEnd, actualEnd: run.actualEnd, progress: Math.round(run.progress * 100), quantityM: metresNumber(run.totalQuantity), producedM: null, readyM: null }))}
          />
        }
      >
        {t('Every run, soonest finish first. Health is read from the milestones.')}
      </ModuleTitle>
      <ManufacturingTabs active="runs" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Production runs')} count={rows.length} flush>
          {runs.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading runs')}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-ink-muted">{t('No production runs. A run opens from a confirmed purchase order.')}</p>
          ) : (
            <Ledger caption={t('Production runs')}>
              <thead>
                <tr>
                  <Th>{t('Run')}</Th>
                  <Th>{t('Order')}</Th>
                  <Th>{t('Products')}</Th>
                  <Th numeric>{t('Quantity')}</Th>
                  <Th>{t('Progress')}</Th>
                  <Th>{t('Planned end')}</Th>
                  <Th>{t('Expected')}</Th>
                  <Th>{t('Health')}</Th>
                  <Th>{t('State')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((run) => (
                  <Tr key={run.number}>
                    <Td>
                      <Link to={`/manufacturing/runs/${run.number}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {run.number}
                      </Link>
                    </Td>
                    <Td>
                      <Link to={`/manufacturing/purchase-orders/${run.purchaseOrderNumber}`} className="code text-ink-soft underline decoration-line-strong underline-offset-4">
                        {run.purchaseOrderNumber}
                      </Link>
                    </Td>
                    <Td className="text-ink-soft">{run.products.join('; ')}</Td>
                    <Td numeric>{metres(run.totalQuantity)}</Td>
                    <Td>
                      <Meter value={run.progress} />
                    </Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{formatLocalDate(run.plannedEnd)}</Td>
                    <Td className={cn('code whitespace-nowrap', run.forecastEnd && run.forecastEnd !== run.plannedEnd ? 'text-critical' : 'text-ink-soft')}>
                      {dateOrDash(run.forecastEnd ?? run.plannedEnd)}
                    </Td>
                    <Td>
                      <StatusChip tone={HEALTH_TONE[run.health]}>{t(HEALTH_LABEL[run.health])}</StatusChip>
                    </Td>
                    <Td>
                      <StatusChip tone={RUN_STATE_TONE[run.state]}>{t(RUN_STATE_LABEL[run.state])}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
    </>
  );
}

export function ProcessTemplates() {
  const t = useT();
  const templates = useProcessTemplates();
  return (
    <>
      <ModuleTitle number="04" title={t('Manufacturing')}>
        {t('Process templates: the steps a run is planned from, by family and supplier.')}
      </ModuleTitle>
      <ManufacturingTabs active="templates" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {templates.data?.map((template) => (
          <Panel key={template.id} title={template.name} count={template.steps.length} flush action={<span className="text-[0.8125rem] text-ink-muted">{template.familyName}{template.supplierName ? ` · ${template.supplierName}` : ''}{template.isDefault ? ' · default' : ''}</span>}>
            <Ledger caption={`Steps of ${template.name}`}>
              <thead>
                <tr>
                  <Th className="w-14">{t('No.')}</Th>
                  <Th>{t('Step')}</Th>
                  <Th>{t('Category')}</Th>
                  <Th numeric>{t('Days')}</Th>
                  <Th>{t('Starts after')}</Th>
                  <Th>{t('Gate')}</Th>
                </tr>
              </thead>
              <tbody>
                {template.steps.map((step) => (
                  <Tr key={step.key}>
                    <Td className="code text-ink-muted">{String(step.sequence).padStart(2, '0')}</Td>
                    <Td className="font-medium">{step.name}</Td>
                    <Td className="text-ink-soft">{step.category}</Td>
                    <Td numeric>{step.durationDays}</Td>
                    <Td className="text-ink-soft">{step.dependsOnKey ? template.steps.find((s) => s.key === step.dependsOnKey)?.name ?? step.dependsOnKey : 'Previous step'}</Td>
                    <Td className="text-ink-soft">{step.gate === 'none' ? '—' : step.gate === 'inspection' ? 'Inspection must pass' : 'Approval required'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          </Panel>
        ))}
        {templates.data?.length === 0 && <EmptyState title={t('No process templates')}>{t('Templates are seeded with the reference data; add one in Settings.')}</EmptyState>}
      </div>
    </>
  );
}
