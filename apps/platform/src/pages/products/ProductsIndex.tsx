import {
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  canManageModule,
  type ProductStatus,
  type ProductSummary,
} from '@basis/shared';
import {
  Button,
  Dialog,
  EmptyState,
  Ledger,
  Panel,
  SelectField,
  ShadeDot,
  StatusChip,
  Structure,
  Td,
  TextArea,
  TextField,
  Th,
  Tr,
  cn,
} from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { useCreateProduct, useFamilies, useProducts, useShades } from '../../data/catalog';
import { useRequiredSession } from '../../session';
import { useT } from '../../i18n';

const STRUCTURE: Record<string, 'mesh' | 'lining' | 'tulle'> = { MSH: 'mesh', LIN: 'lining', TUL: 'tulle' };
const pad = (index: number) => String(index).padStart(2, '0');

export function ProductsTabs({ active }: { active: 'products' | 'skus' | 'shades' | 'put-ups' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink
      key={key}
      to={to}
      end
      className={cn(
        '-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150',
        active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink',
      )}
    >
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Catalog sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      {tab('products', '/products', t('Products'))}
      {tab('skus', '/products/skus', t('SKUs'))}
      {tab('shades', '/products/shades', t('Shade System'))}
    </nav>
  );
}

export function ModuleTitle({ number, title, children, actions }: { number: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 bg-panel px-5 pb-5 pt-7 lg:px-8">
      <div>
        <h1 className="font-display text-[2.375rem] font-medium leading-none tracking-[-0.01em] lg:text-[2.75rem]">
          {title}
          <span className="code ms-3 align-top text-ink-muted">{number}</span>
        </h1>
        {children && <p className="mt-2 text-ink-soft">{children}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function NewProductDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const families = useFamilies();
  const create = useCreateProduct();
  const [form, setForm] = useState({ code: '', family: '', index: '', name: '', tagline: '', description: '', status: 'draft' as ProductStatus });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) return setError('The product code is 2 to 8 letters or digits, such as PWM.');
    if (!form.family) return setError('Choose the fabric family.');
    const index = Number(form.index);
    if (!Number.isInteger(index) || index < 1) return setError('The index is the product’s number in the range, 1 or more.');
    if (!form.name.trim()) return setError('Give the product its name.');
    try {
      await create.mutateAsync({ code, family: form.family, index, name: form.name.trim(), tagline: form.tagline.trim(), description: form.description.trim(), status: form.status });
      setForm({ code: '', family: '', index: '', name: '', tagline: '', description: '', status: 'draft' });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The product could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('New product')} description={t('A named fabric within a family. Variants, shades and SKUs are added on its sheet.')}>
      <form id="new-product" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Code')} required value={form.code} onChange={set('code')} placeholder={t('PWM')} help={t('Short, upper case; becomes part of every SKU code.')} />
        <TextField label={t('Index')} required type="number" min={1} value={form.index} onChange={set('index')} placeholder="6" help={t('Position in the range.')} />
        <SelectField label={t('Family')} required value={form.family} onChange={set('family')} className="sm:col-span-2">
          <option value="">{t('Choose a family')}</option>
          {families.data?.map((family) => (
            <option key={family.code} value={family.code}>
              {family.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} className="sm:col-span-2" />
        <TextField label={t('Tagline')} value={form.tagline} onChange={set('tagline')} placeholder={t('Shaping / support mesh')} className="sm:col-span-2" />
        <TextArea label={t('Description')} value={form.description} onChange={set('description')} className="sm:col-span-2" />
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {PRODUCT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(PRODUCT_STATUS_LABEL[status])}
            </option>
          ))}
        </SelectField>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Create product')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ProductRow({ product, shadeHex }: { product: ProductSummary; shadeHex: Map<string, { hex: string; name: string }> }) {
  const t = useT();
  return (
    <Tr>
      <Td className="code text-ink-muted">{pad(product.index)}</Td>
      <Td>
        <Link to={`/products/${product.code}`} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          {product.name}
        </Link>
        {product.tagline && <span className="ms-3 text-ink-muted">{product.tagline}</span>}
      </Td>
      <Td className="code">{product.code}</Td>
      <Td className="text-ink-soft">{product.familyName}</Td>
      <Td>
        <span className="flex items-center gap-1">
          {product.availableShades.map((code) => {
            const shade = shadeHex.get(code);
            return shade ? <ShadeDot key={code} hex={shade.hex} name={shade.name} code={code} size="sm" /> : null;
          })}
          {product.availableShades.length === 0 && <span className="text-ink-muted">{t('none yet')}</span>}
        </span>
      </Td>
      <Td numeric>{product.skuCount}</Td>
      <Td>
        <StatusChip tone={PRODUCT_STATUS_TONE[product.status]}>{t(PRODUCT_STATUS_LABEL[product.status])}</StatusChip>
      </Td>
    </Tr>
  );
}

export function ProductsIndex() {
  const t = useT();
  const session = useRequiredSession();
  const families = useFamilies();
  const products = useProducts();
  const shades = useShades();
  const [creating, setCreating] = useState(false);
  const manage = canManageModule(session.role, 'products');
  const shadeHex = new Map((shades.data ?? []).map((shade) => [shade.code, { hex: shade.hex, name: shade.name }]));

  return (
    <>
      <ModuleTitle
        number="02"
        title={t('Products')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />{t('New product')}</Button>
          )
        }
      >{t('The range: families, products, variants, shades and SKUs.')}</ModuleTitle>
      <ProductsTabs active="products" />

      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {families.data && families.data.length > 0 && (
          <section aria-label={t('Fabric families')} className="grid gap-4 sm:grid-cols-3">
            {families.data.map((family) => (
              <div key={family.code} className="rounded-[var(--radius-panel)] border border-line bg-panel">
                <div className="aspect-[3/1] overflow-hidden border-b border-line bg-sunken text-nude-deep">
                  <Structure kind={STRUCTURE[family.code] ?? 'mesh'} scale={1.1} label={`${family.name} structure`} />
                </div>
                <div className="px-5 py-4">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{family.name}</span>
                    <span className="code text-ink-muted">{family.code}</span>
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-ink-muted">
                    {family.products.length} {family.products.length === 1 ? 'product' : 'products'}
                  </p>
                  <p className="mt-2 text-[0.8125rem] text-ink-soft">{family.description}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        <Panel title={t('Products')} count={products.data?.length} flush>
          {products.isPending ? (
            <p className="px-5 py-8 text-ink-muted" aria-busy="true">{t('Loading products')}</p>
          ) : products.error ? (
            <p className="px-5 py-8 text-critical">The products could not be loaded. {products.error.message}</p>
          ) : products.data && products.data.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={t('No products yet')}
                action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New product')}</Button> : undefined}
              >{t('A product is a named fabric within a family. Create the first one, then add its variants, shades and SKUs.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Products in the range')}>
              <thead>
                <tr>
                  <Th className="w-14">{t('No.')}</Th>
                  <Th>{t('Product')}</Th>
                  <Th>{t('Code')}</Th>
                  <Th>{t('Family')}</Th>
                  <Th>{t('Available shades')}</Th>
                  <Th numeric>{t('SKUs')}</Th>
                  <Th>{t('Status')}</Th>
                </tr>
              </thead>
              <tbody>
                {products.data?.map((product) => (
                  <ProductRow key={product.code} product={product} shadeHex={shadeHex} />
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>

      <NewProductDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
