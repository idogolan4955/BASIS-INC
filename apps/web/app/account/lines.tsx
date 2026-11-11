import { portalLineTotal } from '@basis/shared';
import type { ReactNode } from 'react';
import { Hand } from '../site/ui';
import { money, qty } from './format';
import { useT } from './i18n';
import { IN_APP } from '../native/platform';
import { Group } from '../native/ui';

// The lines of a quote or an order as the customer reads them: the product
// in the hand, its width, the shade as a swatch, metres and their price.

export interface SkuView {
  readonly code: string;
  readonly salesUom: string;
  readonly product: { readonly name: string };
  readonly variant: { readonly name: string; readonly widthCm?: number | null };
  readonly shade: { readonly code: string; readonly name: string; readonly hex?: string | null };
}

export interface LineView {
  readonly key: string | number;
  readonly sku: SkuView;
  readonly quantity: string;
  readonly unitPrice: string;
  readonly uom?: string;
  readonly extra?: ReactNode;
}

export function Lines({ lines, currency, totalLabel, total }: { lines: readonly LineView[]; currency: string; totalLabel: string; total: string }) {
  const t = useT();
  if (IN_APP) {
    return (
      <Group header={t('Lines')}>
        {lines.map((line) => (
          <div key={line.key} className="app-row items-start">
            <span aria-hidden="true" className="mt-1 inline-block size-7 shrink-0 rounded-full border border-charcoal/10" style={{ backgroundColor: line.sku.shade.hex ?? '#E6DBC8' }} />
            <span className="min-w-0 flex-1">
              <span className="app-row-title font-semibold">{line.sku.product.name}</span>
              <span className="app-row-subtitle">
                {line.sku.shade.name}{' '}
                <span className="code" dir="ltr">
                  {line.sku.code}
                  {line.sku.variant.widthCm ? ` · ${line.sku.variant.widthCm} cm` : ''}
                </span>
              </span>
              <span className="app-row-subtitle">
                <span className="code" dir="ltr">
                  {qty(line.quantity, line.uom ?? line.sku.salesUom)} × {money(line.unitPrice, currency)}
                </span>
              </span>
              {line.extra}
            </span>
            <span className="app-row-value code pt-0.5" dir="ltr">
              {money(portalLineTotal(line), currency)}
            </span>
          </div>
        ))}
        <div className="app-row">
          <span className="flex-1 font-semibold">{totalLabel}</span>
          <span className="app-row-value code font-semibold" dir="ltr">
            {money(total, currency)}
          </span>
        </div>
      </Group>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-[0.9375rem]">
        <thead>
          <tr className="border-y border-charcoal/70">
            {[t('Fabric'), t('Shade'), t('Quantity'), t('Price'), t('Amount')].map((cell, index) => (
              <th key={cell} scope="col" className={`code px-3 py-2.5 font-normal uppercase tracking-[0.14em] text-ink-muted first:ps-0 ${index >= 2 ? 'text-end' : 'text-start'}`}>
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.key} className="border-b border-line align-top">
              <td className="py-3 pe-3">
                <Hand className="text-xl">{line.sku.product.name}</Hand>
                <span className="code mt-1 block text-ink-muted" dir="ltr">
                  {line.sku.code}
                  {line.sku.variant.widthCm ? ` · ${line.sku.variant.widthCm} cm` : ''}
                </span>
                {line.extra}
              </td>
              <td className="px-3 py-3">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block size-5 shrink-0 rounded-full border border-charcoal/10" style={{ backgroundColor: line.sku.shade.hex ?? '#E6DBC8' }} />
                  {line.sku.shade.name}
                  <span className="code text-ink-muted" dir="ltr">
                    {line.sku.shade.code}
                  </span>
                </span>
              </td>
              <td className="code whitespace-nowrap px-3 py-3 text-end" dir="ltr">
                {qty(line.quantity, line.uom ?? line.sku.salesUom)}
              </td>
              <td className="code whitespace-nowrap px-3 py-3 text-end" dir="ltr">
                {money(line.unitPrice, currency)}
              </td>
              <td className="code whitespace-nowrap py-3 ps-3 text-end" dir="ltr">
                {money(portalLineTotal(line), currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-b border-charcoal/70">
            <td colSpan={4} className="code py-3 pe-3 text-end uppercase tracking-[0.14em] text-ink-muted">
              {totalLabel}
            </td>
            <td className="code whitespace-nowrap py-3 ps-3 text-end text-lg" dir="ltr">
              {money(total, currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
