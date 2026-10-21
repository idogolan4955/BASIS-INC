import { CUSTOMER_TIERS, CUSTOMER_TIER_LABEL, MONEY_DECIMALS, QUANTITY_DECIMALS, canManageModule, formatLocalDate, formatMoney, formatQuantity, moneyFromStored, parseFixed, quantityFromStored, type CustomerTier, type PriceListView } from '@basis/shared';
import { Button, CheckField, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus, X } from '@phosphor-icons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useProducts, useSkus } from '../../data/catalog';
import { usePriceLists, useSavePriceList } from '../../data/relationships';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';
import { CostingTabs } from './Costing';

// Price lists: the selling prices a quote starts from. A list is for one
// tier or for every customer; a line prices a product, or one SKU above it,
// from a quantity break upwards. One list per currency may be the default.

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ILS', 'CHF'];
const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency), 2);
const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));

interface LineDraft {
  target: string;
  minQuantity: string;
  unitPrice: string;
}

function ListDialog({ list, open, onClose }: { list: PriceListView | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSavePriceList();
  const products = useProducts();
  const skus = useSkus();
  const [form, setForm] = useState({ code: '', name: '', currency: 'EUR', tier: '', validFrom: '', validTo: '', isDefault: false, notes: '' });
  const [lines, setLines] = useState<LineDraft[]>([{ target: '', minQuantity: '', unitPrice: '' }]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(list ? { code: list.id, name: list.name, currency: list.currency, tier: list.tier ?? '', validFrom: list.validFrom ?? '', validTo: list.validTo ?? '', isDefault: list.isDefault, notes: '' } : { code: '', name: '', currency: 'EUR', tier: '', validFrom: '', validTo: '', isDefault: false, notes: '' });
    setLines(list && list.lines.length > 0 ? list.lines.map((line) => ({ target: line.skuCode ? `sku:${line.skuCode}` : `product:${line.productCode}`, minQuantity: line.minQuantity === '0' ? '' : formatQuantity(quantityFromStored(line.minQuantity, 'm')).replace(/[^\d.]/g, ''), unitPrice: formatMoney(moneyFromStored(line.unitPrice, list.currency), 4).replace(/,/g, '') })) : [{ target: '', minQuantity: '', unitPrice: '' }]);
  }, [open, list]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setLine = (index: number, key: keyof LineDraft, value: string) => setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,16}$/.test(code)) return setError(t('A code of 2 to 16 capitals, digits or hyphens.'));
    if (!form.name.trim()) return setError(t('Name the list.'));
    try {
      const parsed = lines
        .filter((line) => line.target || line.unitPrice)
        .map((line, index) => {
          if (!line.target) throw new Error(t('Line {n}: choose a product or a SKU.', { n: index + 1 }));
          const [kind, code] = line.target.split(':') as ['sku' | 'product', string];
          let unitPrice: bigint;
          let minQuantity = 0n;
          try {
            unitPrice = parseFixed(line.unitPrice, MONEY_DECIMALS);
            if (line.minQuantity.trim()) minQuantity = parseFixed(line.minQuantity, QUANTITY_DECIMALS);
          } catch {
            throw new Error(t('Line {n}: a price per metre (up to 4 decimals) and metres (up to 3).', { n: index + 1 }));
          }
          if (unitPrice <= 0n) throw new Error(t('Line {n}: the price must be above zero.', { n: index + 1 }));
          return { ...(kind === 'sku' ? { skuCode: code } : { productCode: code }), minQuantity: minQuantity.toString(), unitPrice: unitPrice.toString() };
        });
      if (parsed.length === 0) throw new Error(t('A price list needs at least one line.'));
      await save.mutateAsync({ code, name: form.name.trim(), currency: form.currency, tier: (form.tier || null) as CustomerTier | null, validFrom: form.validFrom || null, validTo: form.validTo || null, isDefault: form.isDefault, notes: form.notes, lines: parsed });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The price list could not be saved.'));
    }
  };

  const productOptions = (products.data ?? []).map((product) => ({ value: `product:${product.code}`, label: `${product.code} · ${product.name} (${t('every shade')})` }));
  const skuOptions = (skus.data ?? []).filter((sku) => sku.status !== 'discontinued').map((sku) => ({ value: `sku:${sku.code}`, label: `${sku.code} · ${sku.productName}, ${sku.shadeName}` }));

  return (
    <Dialog open={open} onClose={onClose} title={list ? t('Price list') : t('New price list')} description={t('The prices a quote starts from. A product line covers every shade; a SKU line overrides it. Quantity breaks apply from the metres given.')} className="w-[min(52rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-4">
        <TextField label={t('Code')} required value={form.code} onChange={set('code')} placeholder="WS-2026" disabled={list !== null} className="font-mono" />
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} placeholder={t('Wholesale 2026')} className="sm:col-span-2" />
        <SelectField label={t('Currency')} value={form.currency} onChange={set('currency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Tier')} value={form.tier} onChange={set('tier')} help={t('Empty: every customer.')}>
          <option value="">{t('Every customer')}</option>
          {CUSTOMER_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {t(CUSTOMER_TIER_LABEL[tier])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Valid from')} type="date" value={form.validFrom} onChange={set('validFrom')} />
        <TextField label={t('Valid to')} type="date" value={form.validTo} onChange={set('validTo')} />
        <CheckField label={t('Default for this currency')} checked={form.isDefault} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} className="self-end" />
        <fieldset className="border-t border-line pt-4 sm:col-span-4">
          <legend className="caps mb-3 text-ink-soft">{t('Lines')}</legend>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem]">
                <SelectField label={`${t('Line')} ${index + 1}`} value={line.target} onChange={(event) => setLine(index, 'target', event.target.value)}>
                  <option value="">{t('Choose a product or a SKU')}</option>
                  <optgroup label={t('Products')}>
                    {productOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('SKUs')}>
                    {skuOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                </SelectField>
                <TextField label={t('From quantity')} unit="m" value={line.minQuantity} onChange={(event) => setLine(index, 'minQuantity', event.target.value)} placeholder="0" inputMode="decimal" />
                <TextField label={t('Price per metre')} required unit={form.currency} value={line.unitPrice} onChange={(event) => setLine(index, 'unitPrice', event.target.value)} placeholder="6.80" inputMode="decimal" />
                <button type="button" aria-label={`${t('Remove line')} ${index + 1}`} disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="grid h-10 place-items-center rounded-xs text-ink-muted hover:bg-sunken hover:text-ink disabled:opacity-40">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-3" onClick={() => setLines((current) => [...current, { target: '', minQuantity: '', unitPrice: '' }])}>
            <Plus size={14} aria-hidden="true" />
            {t('Add line')}
          </Button>
        </fieldset>
        <TextArea label={t('Notes')} rows={2} value={form.notes} onChange={set('notes')} className="sm:col-span-4" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-4">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-4">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function PriceLists() {
  const t = useT();
  const session = useRequiredSession();
  const lists = usePriceLists();
  const products = useProducts();
  const [dialog, setDialog] = useState<{ list: PriceListView | null } | null>(null);
  const manage = canManageModule(session.role, 'costing') || session.role === 'sales';
  const productName = new Map((products.data ?? []).map((product) => [product.code, product.name]));
  const rows = lists.data ?? [];

  return (
    <>
      <ModuleTitle
        number="13"
        title={t('Costing')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setDialog({ list: null })}>
              <Plus size={16} aria-hidden="true" />{t('New price list')}</Button>
          )
        }
      >{t('Selling prices by list: the default for every customer, and the lists a tier earns. A quote starts from them.')}</ModuleTitle>
      <CostingTabs active="prices" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {lists.isPending ? (
          <p className="text-ink-muted">{t('Loading price lists')}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t('No price lists yet')} action={manage ? <Button variant="primary" onClick={() => setDialog({ list: null })}>{t('New price list')}</Button> : undefined}>{t('Until a list exists, every quote price is typed by hand.')}</EmptyState>
        ) : (
          rows.map((list) => (
            <Panel
              key={list.id}
              title={list.name}
              count={list.lines.length}
              flush
              action={
                <span className="flex items-center gap-3">
                  <span className="code text-ink-muted">{list.id}</span>
                  <StatusChip tone={list.isDefault ? 'positive' : 'neutral'}>{list.isDefault ? t('Default') : list.tier ? t(CUSTOMER_TIER_LABEL[list.tier]) : t('Every customer')}</StatusChip>
                  <span className="text-[0.8125rem] text-ink-soft">
                    {list.currency}
                    {list.validFrom || list.validTo ? ` · ${list.validFrom ? formatLocalDate(list.validFrom) : '…'} – ${list.validTo ? formatLocalDate(list.validTo) : '…'}` : ''}
                  </span>
                  {manage && <Button size="sm" onClick={() => setDialog({ list })}>{t('Edit')}</Button>}
                </span>
              }
            >
              <Ledger caption={list.name}>
                <thead>
                  <tr>
                    <Th>{t('Applies to')}</Th>
                    <Th numeric>{t('From quantity')}</Th>
                    <Th numeric>{t('Price per metre')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {[...list.lines].sort((a, b) => (a.productCode ?? a.skuCode ?? '').localeCompare(b.productCode ?? b.skuCode ?? '') || Number(BigInt(a.minQuantity) - BigInt(b.minQuantity))).map((line) => (
                    <Tr key={line.id}>
                      <Td>
                        {line.skuCode ? (
                          <span className={cn('code')}>{line.skuCode}</span>
                        ) : (
                          <>
                            <span className="font-medium">{productName.get(line.productCode ?? '') ?? line.productCode}</span>
                            <span className="code ms-3 text-ink-muted">{line.productCode}</span>
                            <span className="ms-3 text-[0.8125rem] text-ink-muted">{t('every shade')}</span>
                          </>
                        )}
                      </Td>
                      <Td numeric className="text-ink-soft">{line.minQuantity === '0' ? '—' : metres(line.minQuantity)}</Td>
                      <Td numeric>{money(line.unitPrice, list.currency)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Ledger>
            </Panel>
          ))
        )}
      </div>
      {manage && <ListDialog list={dialog?.list ?? null} open={dialog !== null} onClose={() => setDialog(null)} />}
    </>
  );
}
