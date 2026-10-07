import { MONEY_DECIMALS, QUANTITY_DECIMALS, parseFixed } from '@basis/shared';
import { Button, CheckField, Dialog, SelectField, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useAddSourcing } from '../../data/catalog';
import { useCompanies, useFactories } from '../../data/parties';
import { useT } from '../../i18n';

// Where a SKU is bought: the supplier, its factory, their code for it, the
// minimum, the lead time and the first price tier. Cost roles only.

export function SourcingDialog({ skuCode, productCode, open, onClose }: { skuCode: string; productCode: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const companies = useCompanies();
  const factories = useFactories();
  const add = useAddSourcing();
  const [form, setForm] = useState({ supplierId: '', factoryId: '', supplierSku: '', moq: '', leadTimeDays: '', minQuantity: '', unitPrice: '', currency: 'USD' });
  const [preferred, setPreferred] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const suppliers = (companies.data ?? []).filter((company) => company.roles.includes('supplier'));
  const supplierFactories = (factories.data ?? []).filter((factory) => factory.companyId === form.supplierId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.supplierId) return setError('Choose the supplier.');
    let moq: string | null;
    let minQuantity: string;
    let unitPrice: string;
    try {
      moq = form.moq.trim() ? parseFixed(form.moq, QUANTITY_DECIMALS).toString() : null;
      minQuantity = parseFixed(form.minQuantity || '0', QUANTITY_DECIMALS).toString();
      unitPrice = parseFixed(form.unitPrice, MONEY_DECIMALS).toString();
    } catch {
      return setError('Quantities take up to 3 decimals and the price up to 4, such as 1.2345.');
    }
    if (!/^[A-Z]{3}$/.test(form.currency.trim().toUpperCase())) return setError('The currency is a three-letter code, such as USD.');
    try {
      await add.mutateAsync({
        skuCode,
        productCode,
        supplierId: form.supplierId,
        factoryId: form.factoryId,
        supplierSku: form.supplierSku.trim(),
        moq,
        leadTimeDays: form.leadTimeDays.trim() ? Number(form.leadTimeDays) : null,
        isPreferred: preferred,
        price: { minQuantity, unitPrice, currency: form.currency.trim().toUpperCase() },
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Sourcing could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('Add sourcing')} description={`Where ${skuCode} is bought, and the first price tier.`}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Supplier')} required value={form.supplierId} onChange={set('supplierId')}>
          <option value="">{t('Choose a supplier')}</option>
          {suppliers.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Factory')} value={form.factoryId} onChange={set('factoryId')}>
          <option value="">{t('Not specified')}</option>
          {supplierFactories.map((factory) => (
            <option key={factory.id} value={factory.id}>
              {factory.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Supplier\'s code')} value={form.supplierSku} onChange={set('supplierSku')} />
        <TextField label={t('Lead time')} type="number" unit="days" value={form.leadTimeDays} onChange={set('leadTimeDays')} />
        <TextField label={t('Minimum order')} unit="m" value={form.moq} onChange={set('moq')} placeholder="1000" />
        <CheckField label={t('Preferred source')} checked={preferred} onChange={(event) => setPreferred(event.target.checked)} className="sm:self-end" />
        <fieldset className="grid gap-4 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="caps mb-1 text-ink-soft">{t('First price tier')}</legend>
          <TextField label={t('From quantity')} unit="m" value={form.minQuantity} onChange={set('minQuantity')} placeholder="1000" />
          <TextField label={t('Unit price')} required value={form.unitPrice} onChange={set('unitPrice')} placeholder="2.8500" help={t('Per metre, up to 4 decimals.')} />
          <TextField label={t('Currency')} required value={form.currency} onChange={set('currency')} placeholder={t('USD')} />
        </fieldset>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={add.isPending} busyLabel={t('Saving')}>{t('Add sourcing')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
