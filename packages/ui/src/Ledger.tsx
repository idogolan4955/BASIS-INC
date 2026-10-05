import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from './cn';

// The ledger: hairline rows, column heads in tracked capitals over a strong
// rule, numbers right-aligned in tabular figures. No zebra striping.

export function Ledger({ caption, children, className }: { caption: string; children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-[0.8125rem]', className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Th({
  numeric,
  className,
  children,
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'caps h-10 whitespace-nowrap border-b border-line-strong px-3 font-semibold text-ink-soft first:pl-5 last:pr-5',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-bone', className)}>
      {children}
    </tr>
  );
}

export function Td({
  numeric,
  className,
  children,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'h-11 px-3 align-middle first:pl-5 last:pr-5',
        numeric && 'tabular whitespace-nowrap text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
