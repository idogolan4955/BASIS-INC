import { cn } from './cn';

// One timeline for anything that moves through steps: production milestones
// and shipment legs alike. Nodes are swatches; a late step is a diamond.

export type TrackState = 'done' | 'active' | 'pending' | 'blocked';

export interface TrackStep {
  readonly key: string;
  readonly label: string;
  readonly state: TrackState;
  readonly caption: string;
  /** The step is running later than planned. */
  readonly late?: boolean;
}

const STATE_WORD: Record<TrackState, string> = {
  done: 'Completed',
  active: 'In progress',
  pending: 'Pending',
  blocked: 'Blocked',
};

function Node({ state, late }: { state: TrackState; late?: boolean }) {
  if (state === 'blocked' || (late && state !== 'done')) {
    return <span className="block size-[11px] rotate-45 bg-critical" />;
  }
  if (state === 'done') return <span className="block size-[11px] bg-ink" />;
  if (state === 'active') {
    return <span className="block size-[11px] bg-accent outline outline-1 outline-offset-2 outline-accent" />;
  }
  return <span className="block size-[11px] border border-line-strong bg-panel" />;
}

export function Track({ steps, className }: { steps: readonly TrackStep[]; className?: string }) {
  return (
    <div className="overflow-x-auto">
    <ol
      className={cn('grid min-w-[30rem] px-[3px] pb-1 pt-[3px] sm:min-w-0', className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const next = steps[index + 1];
        const reached = step.state === 'done' && next !== undefined && next.state !== 'pending';
        const late = step.late && step.state !== 'done';
        return (
          <li key={step.key} className="relative min-w-0 pr-2">
            <p
              className={cn(
                'truncate text-[0.8125rem] font-medium',
                step.state === 'pending' ? 'text-ink-muted' : 'text-ink',
              )}
            >
              {step.label}
            </p>
            <div className="relative my-2.5 flex h-[11px] items-center">
              {next !== undefined && (
                <span
                  className={cn(
                    'absolute left-[11px] right-[-0.5rem] top-1/2 h-px -translate-y-1/2',
                    reached ? 'bg-ink' : 'bg-line-strong',
                  )}
                />
              )}
              <Node state={step.state} late={step.late} />
            </div>
            <p className="code truncate text-ink-soft">{step.caption}</p>
            <p className={cn('mt-0.5 truncate text-xs', late ? 'font-medium text-critical' : 'text-ink-muted')}>
              {late ? 'Late' : STATE_WORD[step.state]}
            </p>
          </li>
        );
      })}
    </ol>
    </div>
  );
}
