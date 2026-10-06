import { MONEY_DECIMALS, QUANTITY_DECIMALS, parseFixed } from '@basis/shared';
import { Button, Dialog, SelectField, ShadeDot, TextArea, TextField } from '@basis/ui';
import { Plus, X } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useSkus } from '../../data/catalog';
import { useCreatePurchaseOrder } from '../../data/manufacturing';
import { useCompanies, useFactories } from '../../data/parties';

// A purchase order: who, under what terms, and exactly which SKUs in what
// quantity at what price. Prices are typed here by cost roles only; the
// payment schedule follows from the deposit share.

interface LineDraft {
  skuCode: string;
  quantity: string;
  unitPrice: string;
  over: string;
  under: string;
}

const INCOTERMS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];

export function NewPurchaseOrderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const companies = useCompanies();
  const factories = useFactories();
  const skus = useSkus();
  const create = useCreatePurchaseOrder();
  const [form, setForm] = useState({ supplierId: '', factoryId: '', currency: 'USD', incotermCode: 'FOB', namedPlace: '', paymentTerms: '30% deposit, 70% before shipment', depositPercent: '30', requestedExFactory: '', notes: '' });
  const [lines, setLines] = useState<LineDraft[]>([{ skuCode: '', quantity: '', unitPrice: '', over: '5', under: '5' }]);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const setLine = (index: number, key: keyof LineDraft, value: string) => setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));

  const suppliers = (companies.data ?? []).filter((company) => company.roles.includes('supplier'));
  const supplierFactories = (factories.data ?? []).filter((factory) => factory.companyId === form.supplierId);
  const skuOptions = (skus.data ?? []).filter((sku) => sku.status !== 'discontinued');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.supplierId) return setError('Choose the supplier.');
    const deposit = Number(form.depositPercent);
    if (!Number.isInteger(deposit) || deposit < 0 || deposit > 100) return setError('The deposit is a whole percentage from 0 to 100.');
    const prepared: { skuCode: string; quantity: string; uom: string; unitPrice: string; overTolerancePercent: number; underTolerancePercent: number }[] = [];
    for (const [index, line] of lines.entries()) {
      if (!line.skuCode) return setError(`Line ${index + 1}: choose the SKU.`);
      try {
        const quantity = parseFixed(line.quantity, QUANTITY_DECIMALS);
        const unitPrice = parseFixed(line.unitPrice, MONEY_DECIMALS);
        if (quantity <= 0n) return setError(`Line ${index + 1}: the quantity must be more than zero.`);
        prepared.push({ skuCode: line.skuCode, quantity: quantity.toString(), uom: 'm', unitPrice: unitPrice.toString(), overTolerancePercent: Number(line.over || 0), underTolerancePercent: Number(line.under || 0) });
      } catch {
        return setError(`Line ${index + 1}: quantity in metres (up to 3 decimals) and a unit price (up to 4 decimals).`);
      }
    }
    try {
      const number = await create.mutateAsync({
        supplierId: form.supplierId,
        factoryId: form.factoryId || undefined,
        currency: form.currency.trim().toUpperCase(),
        incotermCode: form.incotermCode || undefined,
        namedPlace: form.namedPlace.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        requestedExFactory: form.requestedExFactory || undefined,
        notes: form.notes.trim() || undefined,
        depositPercent: deposit,
        lines: prepared,
      });
      onClose();
      navigate(`/manufacturing/purchase-orders/${number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The purchase order could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New purchase order" description="Saved as a draft. Issue it when it is ready to send to the supplier." className="w-[min(48rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Supplier" required value={form.supplierId} onChange={(event) => setForm((f) => ({ ...f, supplierId: event.target.value, factoryId: '' }))} className="sm:col-span-2">
          <option value="">Choose a supplier</option>
          {suppliers.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Factory" value={form.factoryId} onChange={set('factoryId')}>
          <option value="">Not specified</option>
          {supplierFactories.map((factory) => (
            <option key={factory.id} value={factory.id}>
              {factory.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Currency" required value={form.currency} onChange={set('currency')} placeholder="USD" />
        <SelectField label="Incoterm" value={form.incotermCode} onChange={set('incotermCode')}>
          {INCOTERMS.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        <TextField label="Named place" value={form.namedPlace} onChange={set('namedPlace')} placeholder="Ningbo" />
        <TextField label="Payment terms" value={form.paymentTerms} onChange={set('paymentTerms')} className="sm:col-span-2" />
        <TextField label="Deposit" type="number" min={0} max={100} unit="%" value={form.depositPercent} onChange={set('depositPercent')} help="The balance falls due before shipment." />
        <TextField label="Requested ex-factory" type="date" value={form.requestedExFactory} onChange={set('requestedExFactory')} />
        <TextArea label="Notes" value={form.notes} onChange={set('notes')} rows={2} className="sm:col-span-2" />

        <fieldset className="border-t border-line pt-4 sm:col-span-3">
          <legend className="caps mb-3 text-ink-soft">Lines</legend>
          <div className="space-y-3">
            {lines.map((line, index) => {
              const sku = skuOptions.find((candidate) => candidate.code === line.skuCode);
              return (
                <div key={index} className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_5rem_2.5rem]">
                  <SelectField label={`SKU ${index + 1}`} required value={line.skuCode} onChange={(event) => setLine(index, 'skuCode', event.target.value)}>
                    <option value="">Choose a SKU</option>
                    {skuOptions.map((candidate) => (
                      <option key={candidate.code} value={candidate.code}>
                        {candidate.code} · {candidate.productName}, {candidate.shadeName}
                      </option>
                    ))}
                  </SelectField>
                  <TextField label="Quantity" required unit="m" value={line.quantity} onChange={(event) => setLine(index, 'quantity', event.target.value)} placeholder="6400" />
                  <TextField label="Unit price" required value={line.unitPrice} onChange={(event) => setLine(index, 'unitPrice', event.target.value)} placeholder="2.8500" />
                  <TextField label="Over" type="number" unit="%" value={line.over} onChange={(event) => setLine(index, 'over', event.target.value)} />
                  <TextField label="Under" type="number" unit="%" value={line.under} onChange={(event) => setLine(index, 'under', event.target.value)} />
                  <button
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    className="grid h-10 place-items-center rounded-xs text-ink-muted hover:bg-sunken hover:text-ink disabled:opacity-40"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                  {sku && (
                    <p className="flex items-center gap-2 text-[0.8125rem] text-ink-muted sm:col-span-6">
                      <ShadeDot hex={sku.shadeHex} name={sku.shadeName} code={sku.shadeCode} size="sm" />
                      {sku.productName}, {sku.variantName}, {sku.shadeName} · {sku.putUpName}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <Button size="sm" className="mt-3" onClick={() => setLines((current) => [...current, { skuCode: '', quantity: '', unitPrice: '', over: '5', under: '5' }])}>
            <Plus size={14} aria-hidden="true" />
            Add line
          </Button>
        </fieldset>

        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel="Saving">
            Create draft
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
