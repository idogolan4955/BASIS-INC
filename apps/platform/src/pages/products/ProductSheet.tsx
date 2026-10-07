import {
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  SKU_STATUSES,
  SKU_STATUS_LABEL,
  SKU_STATUS_TONE,
  canManageModule,
  formatLocalDate,
  isLocalDate,
  type ProductDetail,
  type ShadeView,
  type SkuStatus,
} from '@basis/shared';
import { Button, EmptyState, LabelHeader, Ledger, Panel, ShadeDot, SheetTabs, StatusChip, Structure, Td, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router';
import { useProduct, useSetSkuPublic, useSetSkuStatus, useShadeStandards, useShades } from '../../data/catalog';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { EditProductDialog, NewSkusDialog, NewVariantDialog, StandardDialog } from './ProductDialogs';

function ProductTimeline({ code }: { code: string }) {
  const timeline = useTimeline('product', code);
  const note = useRecordNote('product', code);
  return (
    <Panel title="Timeline" count={timeline.data?.length} className="xl:col-span-12">
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

const STRUCTURE: Record<string, 'mesh' | 'lining' | 'tulle'> = { MSH: 'mesh', LIN: 'lining', TUL: 'tulle' };
const pad = (index: number) => String(index).padStart(2, '0');

function Overview({ product }: { product: ProductDetail }) {
  const specRows = product.specSchema.map((field) => ({ field, value: product.specs[field.key] ?? '' }));
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title="About" className="xl:col-span-7">
        {product.description ? <p className="max-w-prose text-[0.9375rem] leading-relaxed">{product.description}</p> : <p className="text-ink-muted">No description yet.</p>}
        <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="caps text-ink-muted">Composition</dt>
            <dd className="mt-1 text-sm">
              {product.composition.length > 0
                ? product.composition.map((part) => `${part.percent}% ${part.fibre}`).join(', ')
                : <span className="text-ink-muted">To be confirmed per production standard</span>}
            </dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">Construction</dt>
            <dd className="mt-1 text-sm">{product.construction || <span className="text-ink-muted">Not recorded</span>}</dd>
          </div>
          <div>
            <dt className="caps text-ink-muted">Care</dt>
            <dd className="mt-1 text-sm">{product.care || <span className="text-ink-muted">Not recorded</span>}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title={`${product.familyName} specification`} className="xl:col-span-5" flush>
        {specRows.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">This family has no specification schema yet.</p>
        ) : (
          <dl>
            {specRows.map(({ field, value }) => (
              <div key={field.key} className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3 last:border-b-0">
                <dt className="text-[0.8125rem] text-ink-muted">{field.label}</dt>
                <dd className="text-end text-sm">
                  {value || <span className="text-ink-muted">Not set</span>}
                  {value && field.unit && <span className="code ms-1 text-ink-muted">{field.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Panel>

      <Panel title="Variants" count={product.variants.length} className="xl:col-span-12" flush>
        {product.variants.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">No variants yet. A variant is a width, weight or finish version of the product.</p>
        ) : (
          <Ledger caption="Variants">
            <thead>
              <tr>
                <Th>Variant</Th>
                <Th>Code</Th>
                <Th numeric>Width</Th>
                <Th numeric>Usable width</Th>
                <Th numeric>GSM</Th>
                <Th numeric>Stretch warp</Th>
                <Th numeric>Stretch weft</Th>
                <Th>Finish</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <Tr key={variant.id}>
                  <Td className="font-medium">{variant.name}</Td>
                  <Td className="code">{variant.fullCode}</Td>
                  <Td numeric>{variant.widthCm === null ? <span className="text-ink-muted">tbc</span> : `${variant.widthCm} cm`}</Td>
                  <Td numeric>{variant.usableWidthCm === null ? <span className="text-ink-muted">tbc</span> : `${variant.usableWidthCm} cm`}</Td>
                  <Td numeric>{variant.gsm === null ? <span className="text-ink-muted">tbc</span> : variant.gsm}</Td>
                  <Td numeric>{variant.stretchWarpPercent === null ? <span className="text-ink-muted">tbc</span> : `${variant.stretchWarpPercent}%`}</Td>
                  <Td numeric>{variant.stretchWeftPercent === null ? <span className="text-ink-muted">tbc</span> : `${variant.stretchWeftPercent}%`}</Td>
                  <Td className="text-ink-soft">{variant.finish || '—'}</Td>
                  <Td>
                    <StatusChip tone={PRODUCT_STATUS_TONE[variant.status]}>{PRODUCT_STATUS_LABEL[variant.status]}</StatusChip>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>

      <ProductTimeline code={product.code} />
    </div>
  );
}

function Skus({ product, manage }: { product: ProductDetail; manage: boolean }) {
  const skus = [...product.skus].sort((a, b) => a.variantCode.localeCompare(b.variantCode) || a.shadeSort - b.shadeSort);
  const setStatus = useSetSkuStatus();
  const setPublic = useSetSkuPublic();
  return (
    <Panel title="SKUs" count={skus.length} flush>
      {skus.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">No SKUs yet. A SKU is a variant in a shade, in a put-up.</p>
      ) : (
        <Ledger caption={`SKUs of ${product.name}`}>
          <thead>
            <tr>
              <Th>SKU</Th>
              <Th>Variant</Th>
              <Th>Shade</Th>
              <Th>Put-up</Th>
              <Th>Status</Th>
              <Th>Public</Th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <Tr key={sku.code}>
                <Td>
                  <Link to={`/products/skus/${sku.code}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                    {sku.code}
                  </Link>
                </Td>
                <Td>{sku.variantName}</Td>
                <Td>
                  <span className="flex items-center gap-2.5">
                    <ShadeDot hex={sku.shadeHex} name={sku.shadeName} code={sku.shadeCode} size="sm" />
                    {sku.shadeName}
                    <span className="code text-ink-muted">{sku.shadeCode}</span>
                  </span>
                </Td>
                <Td className="text-ink-soft">{sku.putUpName}</Td>
                <Td>
                  {manage ? (
                    <label className="flex items-center gap-2">
                      <StatusChip tone={SKU_STATUS_TONE[sku.status]}>{''}</StatusChip>
                      <select
                        aria-label={`Status of ${sku.code}`}
                        value={sku.status}
                        disabled={setStatus.isPending}
                        onChange={(event) => setStatus.mutate({ code: sku.code, productCode: product.code, status: event.target.value as SkuStatus, previous: sku.status })}
                        className="-ms-2 h-8 rounded-xs border border-transparent bg-transparent pe-1 text-[0.875rem] font-medium hover:border-line-strong focus:border-charcoal"
                      >
                        {SKU_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {SKU_STATUS_LABEL[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <StatusChip tone={SKU_STATUS_TONE[sku.status]}>{SKU_STATUS_LABEL[sku.status]}</StatusChip>
                  )}
                </Td>
                <Td>
                  {manage ? (
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={!sku.isPublic && sku.status !== 'active'}
                      title={!sku.isPublic && sku.status !== 'active' ? 'Only active SKUs can be published' : undefined}
                      onClick={() => setPublic.mutate({ code: sku.code, productCode: product.code, isPublic: !sku.isPublic })}
                    >
                      {sku.isPublic ? 'Published' : 'Publish'}
                    </Button>
                  ) : (
                    <span className="text-ink-soft">{sku.isPublic ? 'Published' : 'Not published'}</span>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Ledger>
      )}
    </Panel>
  );
}

function Standards({ product, shades, manage }: { product: ProductDetail; shades: readonly ShadeView[]; manage: boolean }) {
  const standards = useShadeStandards(product.code);
  const [recording, setRecording] = useState(false);
  const rows = standards.data ?? [];
  return (
    <>
      <Panel
        title="Shade standards"
        count={rows.length}
        flush
        action={
          manage && (
            <Button size="sm" onClick={() => setRecording(true)}>
              <Plus size={14} aria-hidden="true" />
              Record standard
            </Button>
          )
        }
      >
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">No approved standards yet. A standard is the lab dip a lot is matched against, per shade and factory.</p>
        ) : (
          <Ledger caption={`Shade standards of ${product.name}`}>
            <thead>
              <tr>
                <Th>Shade</Th>
                <Th>Factory</Th>
                <Th>Reference</Th>
                <Th>Approved</Th>
                <Th numeric>Tolerance</Th>
                <Th>Kept at</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((standard) => {
                const shade = shades.find((candidate) => candidate.code === standard.shadeCode);
                return (
                  <Tr key={standard.id}>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        {shade && <ShadeDot hex={shade.hex} name={shade.name} code={shade.code} size="sm" />}
                        {standard.shadeName}
                      </span>
                    </Td>
                    <Td className="text-ink-soft">{standard.factoryName || 'Any'}</Td>
                    <Td className="code">{standard.reference || '\u2014'}</Td>
                    <Td className="code text-ink-soft">{isLocalDate(standard.approvedOn) ? formatLocalDate(standard.approvedOn) : '\u2014'}</Td>
                    <Td numeric>{standard.toleranceDeltaE === null ? '\u2014' : `ΔE ${standard.toleranceDeltaE}`}</Td>
                    <Td className="text-ink-soft">{standard.physicalLocation || '\u2014'}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Ledger>
        )}
      </Panel>
      <StandardDialog product={product} shades={shades} open={recording} onClose={() => setRecording(false)} />
    </>
  );
}

function ShadeAvailability({ product, shades }: { product: ProductDetail; shades: readonly ShadeView[] }) {
  const byShade = new Map<string, ProductDetail['skus'][number][]>();
  for (const sku of product.skus) byShade.set(sku.shadeCode, [...(byShade.get(sku.shadeCode) ?? []), sku]);
  return (
    <Panel title="Shade availability">
      <p className="mb-5 max-w-prose text-[0.8125rem] text-ink-muted">
        A shade exists once in the Shade System. It is available for this product when one of its SKUs is active; until then it is listed, not offered.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {shades.map((shade) => {
          const skus = byShade.get(shade.code) ?? [];
          const active = skus.some((sku) => sku.status === 'active');
          const state = active ? 'Available' : skus.length > 0 ? SKU_STATUS_LABEL[skus[0]!.status] : 'Not offered';
          return (
            <li key={shade.code} className="flex items-center gap-4 rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3">
              <ShadeDot hex={shade.hex} name={shade.name} code={shade.code} size="lg" className={active ? '' : 'opacity-50'} />
              <div className="min-w-0">
                <p className="font-medium">{shade.name}</p>
                <p className="code text-ink-muted">{shade.code}</p>
                <p className={`mt-1 text-xs ${active ? 'text-positive' : 'text-ink-muted'}`}>{state}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function ProductSheet({ tab }: { tab: 'overview' | 'skus' | 'shades' }) {
  const session = useRequiredSession();
  const { code = '' } = useParams();
  const product = useProduct(code);
  const shades = useShades();
  const [dialog, setDialog] = useState<'edit' | 'variant' | 'skus' | null>(null);
  const manage = canManageModule(session.role, 'products');

  if (product.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">Loading product</p>;
  if (product.error) return <p className="px-5 py-10 text-critical lg:px-8">The product could not be loaded. {product.error.message}</p>;
  if (!product.data) return <NotFound what="product" />;
  const data = product.data;
  const base = `/products/${data.code}`;

  return (
    <>
      <LabelHeader
        code={data.code}
        index={pad(data.index)}
        title={data.name}
        subtitle={data.tagline}
        status={
          <>
            <StatusChip tone={PRODUCT_STATUS_TONE[data.status]}>{PRODUCT_STATUS_LABEL[data.status]}</StatusChip>
            <span className="text-[0.8125rem] text-ink-muted">{data.isPublic ? 'Published on the website' : 'Not published'}</span>
          </>
        }
        facts={[
          { label: 'Family', value: data.familyName },
          { label: 'Variants', value: data.variants.length },
          { label: 'SKUs', value: data.skuCount },
          { label: 'Shades available', value: data.availableShades.length },
          { label: 'Slug', value: <span className="code">/{data.familyCode.toLowerCase()}/{data.slug}</span> },
        ]}
        visual={
          <div className="size-full bg-sunken text-nude-deep">
            <Structure kind={STRUCTURE[data.familyCode] ?? 'mesh'} scale={0.8} />
          </div>
        }
        actions={
          manage && (
            <>
              <Button onClick={() => setDialog('variant')}>New variant</Button>
              <Button onClick={() => setDialog('skus')}>New SKUs</Button>
              <Button variant="primary" onClick={() => setDialog('edit')}>
                Edit
              </Button>
            </>
          )
        }
      />
      <SheetTabs>
        <NavLink to={base} end className={({ isActive }) => sheetTabClass(isActive)}>
          Overview
        </NavLink>
        <NavLink to={`${base}/skus`} className={({ isActive }) => sheetTabClass(isActive)}>
          SKUs
        </NavLink>
        <NavLink to={`${base}/shades`} className={({ isActive }) => sheetTabClass(isActive)}>
          Shades
        </NavLink>
      </SheetTabs>
      <div className="px-5 py-6 lg:px-8">
        {tab === 'overview' && <Overview product={data} />}
        {tab === 'skus' && <Skus product={data} manage={manage} />}
        {tab === 'shades' && (
          <div className="flex flex-col gap-4">
            {shades.data ? <ShadeAvailability product={data} shades={shades.data} /> : <EmptyState title="Loading shades" />}
            <Standards product={data} shades={shades.data ?? []} manage={manage || session.role === 'qc'} />
          </div>
        )}
      </div>
      {manage && (
        <>
          <EditProductDialog key={`edit-${data.name}-${data.status}-${String(dialog === 'edit')}`} product={data} open={dialog === 'edit'} onClose={() => setDialog(null)} />
          <NewVariantDialog product={data} open={dialog === 'variant'} onClose={() => setDialog(null)} />
          <NewSkusDialog product={data} shades={shades.data ?? []} open={dialog === 'skus'} onClose={() => setDialog(null)} />
        </>
      )}
    </>
  );
}
