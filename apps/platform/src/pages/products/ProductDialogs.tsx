import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABEL,
  SKU_STATUSES,
  SKU_STATUS_LABEL,
  skuCode,
  type ProductDetail,
  type ProductStatus,
  type ShadeView,
  type SkuStatus,
} from '@basis/shared';
import { Button, CheckField, Dialog, SelectField, ShadeDot, TextArea, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useAddShadeStandard, useCreateSkus, useCreateVariant, usePutUps, useUpdateProduct } from '../../data/catalog';
import { useFactories } from '../../data/parties';
import { useT } from '../../i18n';

// The forms that change a product: its details and specification, a new
// variant, SKUs for a variant across shades, and an approved shade standard.

type Setter<T> = (key: keyof T) => (event: { target: { value: string } }) => void;

function useForm<T extends Record<string, string | boolean>>(initial: T) {
  const [form, setForm] = useState<T>(initial);
  const set: Setter<T> = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return { form, setForm, set };
}

function Problem({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
      {message}
    </p>
  ) : null;
}

const numberOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value));

export function EditProductDialog({ product, open, onClose }: { product: ProductDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const update = useUpdateProduct();
  const { form, setForm, set } = useForm({
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    construction: product.construction,
    care: product.care,
    status: product.status as string,
    isPublic: product.isPublic,
  });
  const [specs, setSpecs] = useState<Record<string, string>>({ ...product.specs });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('The product needs a name.');
    try {
      await update.mutateAsync({
        code: product.code,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        construction: form.construction.trim(),
        care: form.care.trim(),
        specs,
        status: form.status as ProductStatus,
        isPublic: form.isPublic,
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The product could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${product.name}`} description={t('Details and the family\'s specification. Variants and SKUs are edited on their own.')} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} />
        <TextField label={t('Tagline')} value={form.tagline} onChange={set('tagline')} />
        <TextArea label={t('Description')} value={form.description} onChange={set('description')} className="sm:col-span-2" />
        <TextField label={t('Construction')} value={form.construction} onChange={set('construction')} placeholder={t('Warp knit')} />
        <TextField label={t('Care')} value={form.care} onChange={set('care')} />
        {product.specSchema.length > 0 && (
          <fieldset className="grid gap-4 border-t border-line pt-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="caps mb-1 text-ink-soft">{product.familyName} specification</legend>
            {product.specSchema.map((field) =>
              field.kind === 'select' ? (
                <SelectField key={field.key} label={field.label} value={specs[field.key] ?? ''} onChange={(event) => setSpecs((s) => ({ ...s, [field.key]: event.target.value }))}>
                  <option value="">{t('Not set')}</option>
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <TextField
                  key={field.key}
                  label={field.label}
                  unit={field.unit}
                  type={field.kind === 'number' ? 'number' : 'text'}
                  value={specs[field.key] ?? ''}
                  onChange={(event) => setSpecs((s) => ({ ...s, [field.key]: event.target.value }))}
                />
              ),
            )}
          </fieldset>
        )}
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {PRODUCT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(PRODUCT_STATUS_LABEL[status])}
            </option>
          ))}
        </SelectField>
        <CheckField
          label={t('Published on the website')}
          help={t('Only active products with at least one published SKU appear.')}
          checked={form.isPublic}
          onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
          className="sm:self-end"
        />
        <Problem message={error} />
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel={t('Saving')}>{t('Save changes')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function NewVariantDialog({ product, open, onClose }: { product: ProductDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const create = useCreateVariant();
  const { form, set } = useForm({ code: '', name: '', widthCm: '', usableWidthCm: '', gsm: '', stretchWarpPercent: '', stretchWeftPercent: '', finish: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{1,16}$/.test(code)) return setError('The variant code is letters or digits, such as 160.');
    if (!form.name.trim()) return setError('Give the variant a name, such as 160 cm.');
    try {
      await create.mutateAsync({
        productCode: product.code,
        code,
        name: form.name.trim(),
        widthCm: numberOrNull(form.widthCm),
        usableWidthCm: numberOrNull(form.usableWidthCm),
        gsm: numberOrNull(form.gsm),
        stretchWarpPercent: numberOrNull(form.stretchWarpPercent),
        stretchWeftPercent: numberOrNull(form.stretchWeftPercent),
        finish: form.finish.trim(),
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The variant could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('New variant')} description={`A width, weight or finish version of ${product.name}. Its code joins the SKU code: ${product.code}-160-SK02.`}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Code')} required value={form.code} onChange={set('code')} placeholder="160" />
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} placeholder={t('160 cm')} />
        <TextField label={t('Width')} type="number" unit="cm" value={form.widthCm} onChange={set('widthCm')} />
        <TextField label={t('Usable width')} type="number" unit="cm" value={form.usableWidthCm} onChange={set('usableWidthCm')} />
        <TextField label={t('Weight')} type="number" unit="gsm" value={form.gsm} onChange={set('gsm')} />
        <TextField label={t('Finish')} value={form.finish} onChange={set('finish')} />
        <TextField label={t('Stretch, warp')} type="number" unit="%" value={form.stretchWarpPercent} onChange={set('stretchWarpPercent')} />
        <TextField label={t('Stretch, weft')} type="number" unit="%" value={form.stretchWeftPercent} onChange={set('stretchWeftPercent')} />
        <Problem message={error} />
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Create variant')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function NewSkusDialog({ product, shades, open, onClose }: { product: ProductDetail; shades: readonly ShadeView[]; open: boolean; onClose: () => void }) {
  const t = useT();
  const create = useCreateSkus();
  const putUps = usePutUps();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [putUpCode, setPutUpCode] = useState('');
  const [status, setStatus] = useState<SkuStatus>('development');
  const [rollTracking, setRollTracking] = useState(true);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  const existing = new Set(product.skus.filter((sku) => sku.variantCode === variant?.code).map((sku) => sku.shadeCode));
  const putUp = putUpCode || putUps.data?.[0]?.code || '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!variant) return setError('Create a variant first; a SKU is a variant in a shade.');
    if (!putUp) return setError('Choose the put-up.');
    if (chosen.length === 0) return setError('Choose at least one shade.');
    try {
      await create.mutateAsync({ productCode: product.code, variantId: variant.id, variantCode: variant.code, shadeCodes: chosen, putUpCode: putUp, status, rollTracking });
      setChosen([]);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The SKUs could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('New SKUs')} description={t('One SKU per chosen shade: the variant, in the shade, in the put-up.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Variant')} required value={variantId} onChange={(event) => setVariantId(event.target.value)}>
          {product.variants.length === 0 && <option value="">{t('No variants yet')}</option>}
          {product.variants.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} ({candidate.fullCode})
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Put-up')} required value={putUp} onChange={(event) => setPutUpCode(event.target.value)}>
          {putUps.data?.map((candidate) => (
            <option key={candidate.code} value={candidate.code}>
              {candidate.name}
            </option>
          ))}
        </SelectField>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-xs font-medium text-ink-soft">{t('Shades')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {shades.map((shade) => {
              const taken = existing.has(shade.code);
              return (
                <label key={shade.code} className={`flex items-center gap-3 rounded-xs border px-3 py-2 ${taken ? 'border-line text-ink-muted' : 'cursor-pointer border-line-strong'}`}>
                  <input
                    type="checkbox"
                    disabled={taken}
                    checked={chosen.includes(shade.code)}
                    onChange={() => setChosen((current) => (current.includes(shade.code) ? current.filter((c) => c !== shade.code) : [...current, shade.code]))}
                    className="size-4 accent-charcoal"
                  />
                  <ShadeDot hex={shade.hex} name={shade.name} code={shade.code} size="sm" />
                  <span className="flex-1 text-sm">{shade.name}</span>
                  <span className="code text-ink-muted">{taken ? 'exists' : variant ? skuCode(product.code, variant.code, shade.code) : shade.code}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <SelectField label={t('Starting status')} value={status} onChange={(event) => setStatus(event.target.value as SkuStatus)}>
          {SKU_STATUSES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(SKU_STATUS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <CheckField label={t('Track by roll')} help={t('Each roll gets its own identity, length and location.')} checked={rollTracking} onChange={(event) => setRollTracking(event.target.checked)} className="sm:self-end" />
        <Problem message={error} />
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>
            Create {chosen.length > 0 ? `${chosen.length} ` : ''}SKU{chosen.length === 1 ? '' : 's'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function StandardDialog({ product, shades, open, onClose }: { product: ProductDetail; shades: readonly ShadeView[]; open: boolean; onClose: () => void }) {
  const t = useT();
  const add = useAddShadeStandard();
  const factories = useFactories();
  const { form, set } = useForm({ shadeCode: shades[0]?.code ?? '', factoryId: '', reference: '', approvedOn: '', toleranceDeltaE: '', physicalLocation: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.shadeCode) return setError('Choose the shade.');
    try {
      await add.mutateAsync({
        productCode: product.code,
        shadeCode: form.shadeCode,
        factoryId: form.factoryId,
        reference: form.reference.trim(),
        approvedOn: form.approvedOn,
        toleranceDeltaE: numberOrNull(form.toleranceDeltaE),
        physicalLocation: form.physicalLocation.trim(),
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The standard could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('Record a shade standard')} description={t('The approved reference a lot of this product is matched against, for one shade at one factory.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Shade')} required value={form.shadeCode} onChange={set('shadeCode')}>
          {shades.map((shade) => (
            <option key={shade.code} value={shade.code}>
              {shade.name} ({shade.code})
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Factory')} value={form.factoryId} onChange={set('factoryId')}>
          <option value="">{t('Any factory')}</option>
          {factories.data?.map((factory) => (
            <option key={factory.id} value={factory.id}>
              {factory.name} · {factory.companyName}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Lab-dip reference')} value={form.reference} onChange={set('reference')} placeholder="LD-26-0031" />
        <TextField label={t('Approved on')} type="date" value={form.approvedOn} onChange={set('approvedOn')} />
        <TextField label={t('Tolerance')} type="number" step="0.1" unit="ΔE" value={form.toleranceDeltaE} onChange={set('toleranceDeltaE')} />
        <TextField label={t('Physical standard kept at')} value={form.physicalLocation} onChange={set('physicalLocation')} placeholder={t('Shade cabinet, drawer 2')} />
        <Problem message={error} />
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={add.isPending} busyLabel={t('Saving')}>{t('Record standard')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
