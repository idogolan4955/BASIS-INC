import { PIPELINE_STAGE_LABEL, formatQuantity, quantityFromStored, type PipelineCell } from '@basis/shared';
import { cn } from '@basis/ui';

// The pipeline of goods as one horizontal strip: six stages, metres and
// records per stage. Stages whose module has not landed say so.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));

export function Pipeline({ cells }: { cells: readonly PipelineCell[] }) {
  const max = cells.reduce((largest, cell) => (BigInt(cell.metres) > largest ? BigInt(cell.metres) : largest), 0n);
  return (
    <div className="@container overflow-x-auto">
      <ol className="grid min-w-[36rem] grid-cols-6 gap-px border border-line bg-line @[36rem]:min-w-0">
        {cells.map((cell) => {
          const share = max === 0n ? 0 : Number((BigInt(cell.metres) * 1000n) / max) / 1000;
          return (
            <li key={cell.stage} className={cn('relative flex min-h-28 flex-col justify-between bg-panel px-4 py-3', cell.pending && 'text-ink-muted')}>
              <span className="caps text-ink-soft">{PIPELINE_STAGE_LABEL[cell.stage]}</span>
              <span className="mt-3 font-display text-[1.75rem] leading-none tracking-[-0.01em] text-ink">{cell.pending ? '—' : metres(cell.metres)}</span>
              <span className="code mt-2 text-ink-muted">{cell.pending ? 'with logistics' : `${cell.records} ${cell.stage === 'in_production' ? (cell.records === 1 ? 'run' : 'runs') : cell.records === 1 ? 'lot' : 'lots'}`}</span>
              {/* The bar carries the metres behind the figure. */}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-sunken">
                <span className="block h-full bg-nude-deep transition-[width] duration-700 ease-[var(--ease-soft)]" style={{ width: `${Math.round(share * 100)}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
