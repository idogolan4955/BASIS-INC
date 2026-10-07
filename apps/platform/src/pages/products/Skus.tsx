import {
  SKU_STATUSES,
  SKU_STATUS_LABEL,
  SKU_STATUS_TONE,
  canViewCosts,
  formatMoney,
  formatQuantity,
  moneyFromStored,
  quantityFromStored,
  type SkuStatus,
} from '@basis/shared';
import { Button, LabelHeader, Ledger, Panel, SelectField, ShadeDot, SheetTabs, StatusChip, Td, TextField, Th, Tr, sheetTabClass } from '@basis/ui';
import { useMemo, useState } from 'react';
import { canManageModule } from '@basis/shared';
import { Link, NavLink, useParams } from 'react-router';
import { useProducts, useSku, useSkuSourcing, useSkus } from '../../data/catalog';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { ExportMenu } from '../../components/ExportMenu';
import { ModuleTitle, ProductsTabs } from './ProductsIndex';
import { SourcingDialog } from './SourcingDialog';
import { useT } from '../../i18n';

export function SkuLedger() {
  const t = useT();
  const skus = useSkus();
  const products = useProducts();
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState('');
  const [status, setStatus] = useState<'' | SkuStatus>('');

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (skus.data ?? [])
      .filter((sku) => (!product || sku.productCode === product) && (!status || sku.status === status))
      .filter((sku) => !text || sku.code.toLowerCase().includes(text) || sku.productName.toLowerCase().includes(text) || sku.shadeName.toLowerCase().includes(text))
      .sort((a, b) => a.productIndex - b.productIndex || a.variantCode.localeCompare(b.variantCode) || a.shadeSort - b.shadeSort);
  }, [skus.data, query, product, status]);

  return (
    <>
      <ModuleTitle
        number="02"
        title={t('Products')}
        actions={<ExportMenu ledger="skus" size="md" rows={rows.map((sku) => ({ code: sku.code, product: sku.productName, variant: sku.variantName, shade: sku.shadeName, shadeCode: sku.shadeCode, putUp: sku.putUpName, status: sku.status, public: sku.isPublic ? 'yes' : 'no', rollTracking: sku.rollTracking ? 'yes' : 'no' }))} />}
      >{t('Every sellable unit: a variant, in a shade, in a put-up.')}</ModuleTitle>
      <ProductsTabs active="skus" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('SKUs')} count={rows.length} flush>
          <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-3">
            <TextField label={t('Search')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Code, product or shade')} />
            <SelectField label={t('Product')} value={product} onChange={(event) => setProduct(event.target.value)}>
              <option value="">{t('All products')}</option>
              {products.data?.map((candidate) => (
                <option key={candidate.code} value={candidate.code}>
                  {candidate.name}
                </option>
              ))}
            </SelectField>
            <SelectField label={t('Status')} value={status} onChange={(event) => setStatus(event.target.value as '' | SkuStatus)}>
              <option value="">{t('All statuses')}</option>
              {SKU_STATUSES.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {t(SKU_STATUS_LABEL[candidate])}
                </option>
              ))}
            </SelectField>
          </div>
          {skus.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading SKUs')}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-8 text-ink-muted">{t('No SKUs match. Clear a filter, or create SKUs from a product sheet.')}</p>
          ) : (
            <Ledger caption={t('SKUs')}>
              <thead>
                <tr>
                  <Th>{t('SKU')}</Th>
                  <Th>{t('Product')}</Th>
                  <Th>{t('Variant')}</Th>
                  <Th>{t('Shade')}</Th>
                  <Th>{t('Put-up')}</Th>
                  <Th>{t('Status')}</Th>
                  <Th>{t('Public')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sku) => (
                  <Tr key={sku.code}>
                    <Td>
                      <Link to={`/products/skus/${sku.code}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {sku.code}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">{sku.productName}</Td>
                    <Td>{sku.variantName}</Td>
                    <Td>
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <ShadeDot hex={sku.shadeHex} name={sku.shadeName} code={sku.shadeCode} size="sm" />
                        {sku.shadeName}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-soft">{sku.putUpName}</Td>
                    <Td>
                      <StatusChip tone={SKU_STATUS_TONE[sku.status]}>{t(SKU_STATUS_LABEL[sku.status])}</StatusChip>
                    </Td>
                    <Td className="text-ink-soft">{sku.isPublic ? 'Yes' : 'No'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
    </>
  );
}

function Sourcing({ code, productCode, manage }: { code: string; productCode: string; manage: boolean }) {
  const t = useT();
  const sourcing = useSkuSourcing(code, true);
  const [adding, setAdding] = useState(false);
  if (sourcing.isPending) return <p className="text-ink-muted">{t('Loading sourcing')}</p>;
  if (sourcing.error) return <p className="text-critical">Sourcing could not be loaded. {sourcing.error.message}</p>;
  const items = sourcing.data?.supplierItems ?? [];
  const dialog = manage && <SourcingDialog skuCode={code} productCode={productCode} open={adding} onClose={() => setAdding(false)} />;
  if (items.length === 0) {
    return (
      <>
        <p className="text-ink-muted">{t('No supplier is mapped to this SKU yet.')}</p>
        {manage && (
          <Button className="mt-4" onClick={() => setAdding(true)}>{t('Add sourcing')}</Button>
        )}
        {dialog}
      </>
    );
  }
  return (
    <>
    {manage && (
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setAdding(true)}>{t('Add sourcing')}</Button>
      </div>
    )}
    {dialog}
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="rounded-[var(--radius-panel)] border border-line">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <Link to={`/suppliers/${item.supplierId}`} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                {item.supplierName}
              </Link>
              {item.factoryName && <span className="ms-3 text-[0.8125rem] text-ink-muted">{item.factoryName}</span>}
            </div>
            <div className="flex items-center gap-4 text-[0.8125rem] text-ink-soft">
              {item.isPreferred && <StatusChip tone="positive">{t('Preferred')}</StatusChip>}
              <span>{t('Supplier SKU')}<span className="code text-ink">{item.supplierSku || '—'}</span>
              </span>
              <span>MOQ {item.moq ? formatQuantity(quantityFromStored(item.moq, 'm')) : '—'}</span>
              <span>Lead time {item.leadTimeDays ?? '—'} days</span>
            </div>
          </div>
          <Ledger caption={`Purchase prices from ${item.supplierName}`}>
            <thead>
              <tr>
                <Th numeric>{t('From quantity')}</Th>
                <Th numeric>{t('Unit price')}</Th>
              </tr>
            </thead>
            <tbody>
              {item.prices.map((price, index) => (
                <Tr key={index}>
                  <Td numeric>{formatQuantity(quantityFromStored(price.minQuantity, 'm'))}</Td>
                  <Td numeric>{formatMoney(moneyFromStored(price.unitPrice, price.currency), 4)} / m</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        </li>
      ))}
    </ul>
    </>
  );
}

export function SkuSheet({ tab }: { tab: 'overview' | 'sourcing' }) {
  const t = useT();
  const session = useRequiredSession();
  const { code = '' } = useParams();
  const sku = useSku(code);
  const costs = canViewCosts(session.role);
  const manage = canManageModule(session.role, 'products');

  if (sku.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading SKU')}</p>;
  if (sku.error) return <p className="px-5 py-10 text-critical lg:px-8">The SKU could not be loaded. {sku.error.message}</p>;
  if (!sku.data) return <NotFound what={t('SKU')} />;
  const data = sku.data;
  const base = `/products/skus/${data.code}`;

  return (
    <>
      <LabelHeader
        code={data.code}
        title={`${data.productName}, ${data.shadeName}`}
        subtitle={
          <span className="flex items-center gap-3">
            <ShadeDot hex={data.shadeHex} name={data.shadeName} code={data.shadeCode} />
            {data.variantName}, {data.putUpName}
          </span>
        }
        status={
          <>
            <StatusChip tone={SKU_STATUS_TONE[data.status]}>{t(SKU_STATUS_LABEL[data.status])}</StatusChip>
            <span className="text-[0.8125rem] text-ink-muted">{data.isPublic ? 'Published' : 'Not published'}</span>
            <span className="text-[0.8125rem] text-ink-muted">{data.rollTracking ? 'Tracked by roll' : 'Tracked by lot'}</span>
          </>
        }
        facts={[
          { label: t('Product'), value: <Link to={`/products/${data.productCode}`} className="underline decoration-line-strong underline-offset-4">{data.productName}</Link> },
          { label: t('Family'), value: data.familyName },
          { label: t('Shade'), value: `${data.shadeName} (${data.shadeCode})` },
          { label: t('Width'), value: data.widthCm === null ? 'tbc' : `${data.widthCm} cm` },
          { label: t('Roll'), value: `${data.rollLengthM} m` },
          { label: t('Sales unit'), value: data.salesUom },
        ]}
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Overview')}</NavLink>
        {costs && (
          <NavLink to={`${base}/sourcing`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Sourcing')}</NavLink>
        )}
      </SheetTabs>
      <div className="px-5 py-6 lg:px-8">
        {tab === 'overview' && (
          <Panel title={t('Specification')}>
            <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="caps text-ink-muted">{t('Barcode')}</dt>
                <dd className="code mt-1">{data.barcode || <span className="text-ink-muted">{t('none')}</span>}</dd>
              </div>
              <div>
                <dt className="caps text-ink-muted">{t('Sales MOQ')}</dt>
                <dd className="mt-1 text-sm">{data.salesMoq ? formatQuantity(quantityFromStored(data.salesMoq, 'm')) : <span className="text-ink-muted">{t('none')}</span>}</dd>
              </div>
              <div>
                <dt className="caps text-ink-muted">{t('GSM')}</dt>
                <dd className="mt-1 text-sm">{data.gsm ?? <span className="text-ink-muted">{t('tbc')}</span>}</dd>
              </div>
            </dl>
          </Panel>
        )}
        {tab === 'sourcing' && (costs ? <Panel title={t('Sourcing')}><Sourcing code={data.code} productCode={data.productCode} manage={manage} /></Panel> : <NotFound what={t('page')} />)}
      </div>
    </>
  );
}
