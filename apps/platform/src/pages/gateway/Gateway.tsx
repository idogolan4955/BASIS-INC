import {
  HEALTH_LABEL,
  HEALTH_TONE,
  ORDER_STAGE_LABEL,
  ORDER_STAGE_TONE,
  SEVERITY_LABEL,
  SEVERITY_TONE,
  SHIPMENT_STAGE_LABEL,
  SHIPMENT_STAGE_TONE,
  canOpenModule,
  daysBetween,
  formatLocalDate,
  formatQuantity,
  isoWeekOf,
  quantityFromStored,
  todayIn,
  weekdayOf,
  type GatewayData,
  type LocalDate,
  type ModuleKey,
  type RunTimeline,
  type ShipmentLane,
} from '@basis/shared';
import {
  Bars,
  Button,
  FigureTile,
  FigureTileSkeleton,
  Lanes,
  Ledger,
  Meter,
  Panel,
  PanelEmpty,
  Ring,
  Sparkline,
  StatusChip,
  Structure,
  Td,
  Th,
  Tr,
  Track,
  cn,
  type TrackStep,
} from '@basis/ui';
import { ArrowRight, Plus } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useAcknowledgeAlert, useResolveAlert, useRunChecks } from '../../data/alerts';
import { isSample, useGateway } from '../../data/source';
import { useCompleteTask } from '../../data/tasks';
import { useRequiredSession } from '../../session';
import { NewTaskDialog } from '../operations/Tasks';

const whole = new Intl.NumberFormat('en-US');
const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const shortDate = (date: LocalDate) => formatLocalDate(date).slice(0, 6);

function RecordLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="code whitespace-nowrap text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-150 hover:decoration-ink"
    >
      {children}
    </Link>
  );
}

function ViewAll({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-soft transition-colors duration-150 hover:text-ink"
    >
      {children}
      <ArrowRight size={14} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5" />
    </Link>
  );
}

function Band({ asOf }: { asOf: LocalDate }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-sunken">
      {/* Powermesh at macro scale, fading into the paper. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[72%] text-nude [mask-image:linear-gradient(to_left,black_8%,transparent_92%)]"
      >
        <Structure kind="mesh" scale={2.4} />
      </div>
      <div className="relative flex items-end justify-between gap-6 px-5 py-8 lg:px-8 lg:py-10">
        <div>
          <h1 className="font-display text-[2.875rem] font-medium leading-none tracking-[-0.01em] text-ink lg:text-[3.5rem]">Gateway</h1>
          <p className="caps mt-3 text-ink-soft">Bridal fabric supply chain</p>
        </div>
        <div className="hidden flex-col items-end gap-2 sm:flex">
          <p className="code bg-sunken px-2 py-1 uppercase text-ink">
            {weekdayOf(asOf)} {formatLocalDate(asOf)}
          </p>
          <p className="code bg-sunken px-2 py-1 uppercase text-ink-soft">Week {isoWeekOf(asOf)}</p>
          {isSample && (
            <p className="bg-sunken px-2 py-1">
              <StatusChip tone="neutral">Sample data</StatusChip>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Figures({ data, can }: { data: GatewayData; can: (module: ModuleKey) => boolean }) {
  const { orders, production, transit, inventory, quality } = data.figures;
  const onSchedule = production.activeRuns === 0 ? 0 : Math.round((production.onSchedule / production.activeRuns) * 100);
  const rising = orders.changePercent >= 0;
  const firstWeek = orders.weekly[0] ?? 0;
  const lastWeek = orders.weekly[orders.weekly.length - 1] ?? 0;

  return (
    <section aria-label="Figures" className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-4">
      {can('orders') && (
        <FigureTile
          label="Orders"
          value={whole.format(orders.count)}
          note={
            <>
              {orders.periodLabel},{' '}
              <span className={cn('font-medium', rising ? 'text-positive' : 'text-critical')}>
                {rising ? 'up' : 'down'} {Math.abs(orders.changePercent)}%
              </span>
            </>
          }
          visual={
            <Sparkline
              values={orders.weekly}
              label={`Orders per week over ${orders.weekly.length} weeks, from ${firstWeek} to ${lastWeek}`}
              className="hidden @[10rem]:block"
            />
          }
        />
      )}
      {can('manufacturing') && (
        <FigureTile
          label="Production"
          value={`${onSchedule}%`}
          note={`${production.onSchedule} of ${production.activeRuns} runs on schedule`}
          visual={<Ring percent={onSchedule} label={`${onSchedule} percent of runs on schedule`} className="hidden @[10rem]:block" />}
        />
      )}
      {can('logistics') && (
        <FigureTile
          label="In transit"
          value={whole.format(transit.shipments)}
          note={`shipments, ${metres(transit.metres)}`}
          visual={
            <Lanes
              progress={transit.progress}
              label={`Position of ${transit.progress.length} shipments along their routes`}
              className="hidden @[10rem]:flex"
            />
          }
        />
      )}
      {can('inventory') && (
        <FigureTile
          label="Inventory"
          value={whole.format(inventory.rolls)}
          note="rolls in stock"
          visual={
            <Bars
              items={inventory.byFamily.map((family) => ({
                code: family.code,
                value: family.rolls,
                title: `${family.name}: ${whole.format(family.rolls)} rolls`,
              }))}
              label={inventory.byFamily.map((family) => `${family.name} ${family.rolls} rolls`).join(', ')}
              className="hidden @[10rem]:flex"
            />
          }
        />
      )}
      {can('qc') && (
        <FigureTile
          label="QC first pass"
          value={`${quality.firstPassPercent}%`}
          note={`${quality.inspections} inspections, ${quality.windowLabel}`}
          visual={
            <Sparkline
              values={quality.monthly}
              label={`First-pass rate by month, from ${quality.monthly[0]} to ${quality.monthly[quality.monthly.length - 1]} percent`}
              className="hidden @[10rem]:block"
            />
          }
        />
      )}
    </section>
  );
}

function ItemActions({ item }: { item: GatewayData['attention'][number] }) {
  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const complete = useCompleteTask();
  if (item.kind === 'task') {
    return (
      <Button size="sm" variant="quiet" onClick={() => complete.mutate(item.id)} disabled={complete.isPending}>
        Mark done
      </Button>
    );
  }
  return (
    <span className="flex items-center gap-4">
      {item.state === 'open' ? (
        <Button size="sm" variant="quiet" onClick={() => acknowledge.mutate(item.id)} disabled={acknowledge.isPending}>
          Acknowledge
        </Button>
      ) : (
        <span className="text-[0.8125rem] text-ink-muted">Acknowledged</span>
      )}
      <Button size="sm" variant="quiet" onClick={() => resolve.mutate(item.id)} disabled={resolve.isPending}>
        Dismiss
      </Button>
    </span>
  );
}

function Attention({ items, canRun }: { items: GatewayData['attention']; canRun: boolean }) {
  const run = useRunChecks();
  const [creating, setCreating] = useState(false);
  const sorted = [...items].sort((a, b) => (a.state === b.state ? 0 : a.state === 'open' ? -1 : 1));
  return (
    <Panel
      id="attention"
      title="Requires attention"
      count={items.length}
      flush
      className="scroll-mt-20 max-lg:order-first"
      action={
        <span className="flex items-center gap-4">
          {run.data && (
            <span className="text-[0.8125rem] text-ink-muted">
              {run.data.raised} raised, {run.data.resolved} resolved
            </span>
          )}
          {canRun && !isSample && (
            <Button size="sm" variant="quiet" onClick={() => run.mutate()} busy={run.isPending} busyLabel="Checking">
              Run checks
            </Button>
          )}
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden="true" />
            New task
          </Button>
        </span>
      }
    >
      <NewTaskDialog open={creating} onClose={() => setCreating(false)} />
      {items.length === 0 ? (
        <PanelEmpty>
          Nothing needs a decision right now. Delays, pending inspections and missing documents appear here as they arise.
        </PanelEmpty>
      ) : (
        <>
          {/* Phones read each item as a block; wider screens get the ledger. */}
          <ul className="md:hidden">
            {sorted.map((item) => (
              <li key={item.id} className="border-b border-line px-5 py-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{item.title}</p>
                  <StatusChip tone={SEVERITY_TONE[item.severity]}>{SEVERITY_LABEL[item.severity]}</StatusChip>
                </div>
                <p className="mt-1 text-[0.8125rem] text-ink-soft">{item.detail}</p>
                <p className="mt-2.5 flex items-center justify-between gap-3">
                  <RecordLink to={item.path}>{item.subject}</RecordLink>
                  <span className="text-[0.8125rem] text-ink-muted">{item.owner}</span>
                </p>
                <p className="mt-2">
                  <ItemActions item={item} />
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
          <Ledger caption="Items that require attention">
            <thead>
              <tr>
                <Th className="w-32">Severity</Th>
                <Th>What</Th>
                <Th>Record</Th>
                <Th>Detail</Th>
                <Th>Owner</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item) => (
                <Tr key={item.id} className={item.state === 'acknowledged' ? 'opacity-60' : undefined}>
                  <Td>
                    <StatusChip tone={item.kind === 'task' ? 'transit' : SEVERITY_TONE[item.severity]}>
                      {item.kind === 'task' ? 'Task' : SEVERITY_LABEL[item.severity]}
                    </StatusChip>
                  </Td>
                  <Td className="min-w-56 font-medium">{item.title}</Td>
                  <Td>
                    <RecordLink to={item.path}>{item.subject}</RecordLink>
                  </Td>
                  <Td className="min-w-64 text-ink-soft">{item.detail}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">{item.owner}</Td>
                  <Td className="whitespace-nowrap">
                    <ItemActions item={item} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
          </div>
        </>
      )}
    </Panel>
  );
}

function runSteps(run: RunTimeline, asOf: LocalDate): TrackStep[] {
  return run.milestones.map((milestone) => {
    const expected = milestone.forecastEnd ?? milestone.plannedEnd;
    const slipped = daysBetween(milestone.plannedEnd, expected) > 0;
    const overdue = milestone.state !== 'done' && daysBetween(expected, asOf) > 0;
    const caption = milestone.actualEnd
      ? shortDate(milestone.actualEnd)
      : slipped
        ? `${shortDate(milestone.plannedEnd)} → ${shortDate(expected)}`
        : shortDate(milestone.plannedEnd);
    return {
      key: milestone.key,
      label: milestone.name,
      state: milestone.state,
      caption,
      // The step that is running late is flagged; later steps only show their moved date.
      late: milestone.state === 'pending' ? overdue : milestone.state !== 'done' && (slipped || overdue),
    };
  });
}

function Production({ runs, asOf }: { runs: readonly RunTimeline[]; asOf: LocalDate }) {
  return (
    <Panel id="production" title="Production timeline" action={<ViewAll to="/manufacturing/runs">All runs</ViewAll>} className="scroll-mt-20 xl:col-span-7">
      {runs.length === 0 ? (
        <p className="text-ink-muted">No production runs are active. A run opens when a purchase order is confirmed.</p>
      ) : (
        <ul>
          {runs.map((run) => (
            <li key={run.number} className="border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                <RecordLink to={run.path}>{run.number}</RecordLink>
                <span className="font-medium">{run.product}</span>
                <span className="text-[0.8125rem] text-ink-muted">{run.shade}</span>
                <span className="code text-ink-muted">{metres(run.metres)}</span>
                <span className="ml-auto flex items-center gap-4">
                  <span className="code text-ink-muted">Ex-factory {shortDate(run.exFactory)}</span>
                  <StatusChip tone={HEALTH_TONE[run.health]}>{HEALTH_LABEL[run.health]}</StatusChip>
                </span>
              </div>
              <Track steps={runSteps(run, asOf)} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Lane({ shipment }: { shipment: ShipmentLane }) {
  const position = `${Math.max(0, Math.min(1, shipment.progress)) * 100}%`;
  const late = shipment.health === 'delayed' || shipment.health === 'blocked';
  return (
    <li className="border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-baseline gap-3">
          <RecordLink to={shipment.path}>{shipment.number}</RecordLink>
          <span className="text-[0.8125rem] text-ink-muted">{shipment.mode}</span>
        </div>
        <div className="flex items-center gap-4">
          {shipment.health !== 'on_track' && (
            <StatusChip tone={HEALTH_TONE[shipment.health]}>{HEALTH_LABEL[shipment.health]}</StatusChip>
          )}
          <StatusChip tone={SHIPMENT_STAGE_TONE[shipment.stage]}>{SHIPMENT_STAGE_LABEL[shipment.stage]}</StatusChip>
        </div>
      </div>
      <div
        role="img"
        aria-label={`${Math.round(shipment.progress * 100)} percent of the way from ${shipment.origin.name} to ${shipment.destination.name}`}
        className="mt-3 flex items-center gap-3"
      >
        <span className="code text-ink">{shipment.origin.code}</span>
        <span className="relative h-px flex-1 bg-line-strong">
          <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: position }} />
          <span
            className={cn(
              'absolute top-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2',
              late ? 'rotate-45 bg-critical' : 'bg-ink',
            )}
            style={{ left: position }}
          />
        </span>
        <span className="code text-ink">{shipment.destination.code}</span>
      </div>
      <div className="code mt-2 flex justify-between gap-4 text-ink-muted">
        <span>
          {shipment.origin.name}, ETD {shortDate(shipment.etd)}
        </span>
        <span className="text-right">
          ETA {shortDate(shipment.eta)}, {shipment.destination.name}
        </span>
      </div>
    </li>
  );
}

function Shipments({ shipments }: { shipments: readonly ShipmentLane[] }) {
  return (
    <Panel id="shipments" title="Shipment status" action={<ViewAll to="/logistics/shipments">All shipments</ViewAll>} className="scroll-mt-20 xl:col-span-5">
      {shipments.length === 0 ? (
        <p className="text-ink-muted">No shipments are booked. Goods ready to ship can be assigned to a shipment in Logistics.</p>
      ) : (
        <ul>
          {shipments.map((shipment) => (
            <Lane key={shipment.number} shipment={shipment} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Orders({ orders }: { orders: GatewayData['orders'] }) {
  return (
    <Panel id="orders" title="Recent orders" action={<ViewAll to="/orders">All orders</ViewAll>} flush className="scroll-mt-20 xl:col-span-12 2xl:col-span-8">
      {orders.length === 0 ? (
        <PanelEmpty>No orders yet. Confirmed sales orders appear here, newest first.</PanelEmpty>
      ) : (
        <Ledger caption="Recent sales orders">
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Fabric</Th>
              <Th numeric>Quantity</Th>
              <Th>Fulfilment</Th>
              <Th>Ship date</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <Tr key={order.number}>
                <Td>
                  <RecordLink to={order.path}>{order.number}</RecordLink>
                </Td>
                <Td className="whitespace-nowrap font-medium">{order.customer}</Td>
                <Td className="whitespace-nowrap text-ink-soft">{order.fabric}</Td>
                <Td numeric>{metres(order.metres)}</Td>
                <Td>
                  <Meter value={order.fulfilment} />
                </Td>
                <Td className="code whitespace-nowrap text-ink-soft">{shortDate(order.shipDate)}</Td>
                <Td>
                  <StatusChip tone={ORDER_STAGE_TONE[order.stage]}>{ORDER_STAGE_LABEL[order.stage]}</StatusChip>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Ledger>
      )}
    </Panel>
  );
}

function Families({ families }: { families: GatewayData['families'] }) {
  return (
    <Panel id="families" title="Fabric families" action={<ViewAll to="/products">All products</ViewAll>} className="scroll-mt-20 xl:col-span-12 2xl:col-span-4">
      {families.length === 0 ? (
        <p className="text-ink-muted">No fabric families yet. Add the first family in Products.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {families.map((family) => (
            <li key={family.code}>
              <Link to={family.path} className="group block">
                <div className="aspect-[3/1] overflow-hidden rounded-xs sm:aspect-[4/3] md:aspect-[3/1] 2xl:aspect-[4/3] border border-line bg-sunken text-nude-deep transition-colors duration-150 group-hover:border-line-strong">
                  <Structure kind={family.structure} scale={1.15} label={`${family.name} structure`} />
                </div>
                <p className="mt-2.5 flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{family.name}</span>
                  <span className="code text-ink-muted">{family.code}</span>
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                  {family.products} products, {family.skus} SKUs
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Loading() {
  return (
    <div className="space-y-4 px-5 py-6 lg:px-8" aria-busy="true" aria-label="Loading the Gateway">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))] gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <FigureTileSkeleton key={index} />
        ))}
      </div>
      <div className="h-56 rounded-[var(--radius-panel)] border border-line bg-panel" />
    </div>
  );
}

function Unavailable({ message }: { message: string }) {
  return (
    <div className="px-5 py-10 lg:px-8">
      <div className="max-w-xl rounded-[var(--radius-panel)] border border-line bg-panel p-6">
        <h2 className="text-base font-semibold">The Gateway could not load</h2>
        <p className="mt-2 text-ink-soft">{message}</p>
        <p className="mt-4 text-ink-muted">Reload the page to try again. If it keeps failing, the data connection needs attention.</p>
      </div>
    </div>
  );
}

export function Gateway() {
  const session = useRequiredSession();
  const { data, isPending, error } = useGateway();
  const location = useLocation();
  const can = (module: ModuleKey) => canOpenModule(session.role, module);

  useEffect(() => {
    if (!data || !location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [data, location.hash, location.key]);

  const asOf = data?.asOf ?? todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <>
      <Band asOf={asOf} />
      {isPending && <Loading />}
      {error && <Unavailable message={error.message} />}
      {data && (
        <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
          <Figures data={data} can={can} />
          <Attention items={data.attention.filter((item) => can(item.module))} canRun={session.role === 'owner' || session.role === 'operations'} />
          <div className="grid gap-4 *:min-w-0 xl:grid-cols-12">
            {can('manufacturing') && <Production runs={data.runs} asOf={data.asOf} />}
            {can('logistics') && <Shipments shipments={data.shipments} />}
            {can('orders') && <Orders orders={data.orders} />}
            {can('products') && <Families families={data.families} />}
          </div>
        </div>
      )}
    </>
  );
}
