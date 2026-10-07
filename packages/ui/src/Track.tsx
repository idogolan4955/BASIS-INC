import { cn } from './cn';

// One timeline for anything that moves through steps: production milestones
// and shipment legs alike. Completed steps are solid, the current step is
// warm, pending steps are hollow; a late step turns to the critical pigment.

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
    return <span className="block size-4 rounded-full border-[3px] border-critical bg-panel" />;
  }
  if (state === 'done') return <span className="block size-4 rounded-full bg-cocoa" />;
  if (state === 'active') return <span className="block size-4 rounded-full bg-nude-deep ring-[3px] ring-nude/40" />;
  return <span className="block size-4 rounded-full border-2 border-line-strong bg-panel" />;
}

export function Track({ steps, className }: { steps: readonly TrackStep[]; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <ol
        className={cn('grid min-w-[30rem] px-1 pb-1 pt-1 sm:min-w-0', className)}
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, index) => {
          const next = steps[index + 1];
          const late = step.late && step.state !== 'done';
          const connector = next === undefined ? null : step.state === 'done' && next.state === 'done' ? 'done' : step.state === 'done' ? 'reaching' : 'ahead';
          return (
            <li key={step.key} className="relative min-w-0 pe-2">
              <p className={cn('truncate text-[0.9375rem] font-medium', step.state === 'pending' ? 'text-ink-muted' : 'text-ink')}>{step.label}</p>
              <div className="relative my-2.5 flex h-4 items-center">
                {connector && (
                  <span
                    className={cn('absolute start-4 end-[-0.5rem] top-1/2 -translate-y-1/2 rounded-full', connector === 'ahead' ? 'h-[2px] bg-sand' : 'h-[3px]')}
                    style={
                      connector === 'done'
                        ? { background: 'var(--color-cocoa)' }
                        : connector === 'reaching'
                          ? { background: 'linear-gradient(90deg, var(--color-cocoa), var(--color-sand))' }
                          : undefined
                    }
                  />
                )}
                <Node state={step.state} late={step.late} />
              </div>
              <p className="code truncate text-ink-soft">{step.caption}</p>
              <p className={cn('mt-0.5 truncate text-[0.8125rem]', late ? 'font-medium text-critical' : step.state === 'active' ? 'font-medium text-cocoa' : 'text-ink-muted')}>
                {late ? 'Late' : STATE_WORD[step.state]}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
