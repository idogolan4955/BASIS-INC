import {
  BRAND_ASSET_KINDS,
  BRAND_ASSET_KIND_LABEL,
  BRAND_ASSET_STATUSES,
  COLLECTION_STATUSES,
  COLLECTION_STATUS_LABEL,
  COLLECTION_STATUS_TONE,
  DEVELOPMENT_STAGE_LABEL,
  DEVELOPMENT_STAGE_TONE,
  formatLocalDate,
  type BrandAssetKind,
  type BrandAssetStatus,
  type BrandAssetView,
  type CollectionView,
  type ProductCategoryView,
  type SpecField,
} from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useBrandAssets, useCollections, useDevelopmentProducts, useProductCategories, useSaveBrandAsset, useSaveCategory, useSaveCollection } from '../../data/development';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';
import { DevelopmentTabs, useManageDevelopment } from './Development';

// The Brand Centre, the collections and the categories: the shared reference
// every product in development draws on.

const BRAND_ROLES = ['owner', 'marketing'];

function AssetDialog({ asset, kind, open, onClose }: { asset: BrandAssetView | null; kind: BrandAssetKind; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveBrandAsset();
  const collections = useCollections();
  const [form, setForm] = useState({ kind, title: '', summary: '', colourHex: '', colourName: '', paletteNumber: '', tags: '', collectionCode: '', status: 'draft' as BrandAssetStatus, sort: '0' });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(asset ? { kind: asset.kind, title: asset.title, summary: asset.summary, colourHex: asset.colourHex ?? '', colourName: asset.colourName, paletteNumber: asset.paletteNumber, tags: asset.tags.join(', '), collectionCode: asset.collectionCode ?? '', status: asset.status, sort: String(asset.sort) } : { kind, title: '', summary: '', colourHex: '', colourName: '', paletteNumber: '', tags: '', collectionCode: '', status: 'draft', sort: '0' });
  }, [open, asset, kind]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError(t('Give the asset a title.'));
    if (form.kind === 'colour' && !/^#[0-9A-Fa-f]{6}$/.test(form.colourHex.trim())) return setError(t('A colour needs a six-digit hex.'));
    try {
      await save.mutateAsync({ id: asset?.id, kind: form.kind, title: form.title, summary: form.summary, documentId: asset?.document?.id ?? null, colourHex: form.kind === 'colour' ? form.colourHex.trim().toUpperCase() : null, colourName: form.colourName, paletteNumber: form.paletteNumber, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), collectionCode: form.collectionCode || null, status: form.status, sort: Number(form.sort) || 0 });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The asset could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={asset ? t('Brand asset') : t('New brand asset')} description={t('What the brand is, written down once: the story, the palette, the type, the materials, the approved designs and what inspired them.')} className="w-[min(40rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          {BRAND_ASSET_KINDS.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(BRAND_ASSET_KIND_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {BRAND_ASSET_STATUSES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(candidate === 'draft' ? 'Draft' : candidate === 'approved' ? 'Approved' : 'Retired')}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Title')} required maxLength={160} value={form.title} onChange={set('title')} className="sm:col-span-2" />
        <TextArea label={form.kind === 'story' ? t('The story') : t('Summary')} rows={form.kind === 'story' ? 8 : 3} value={form.summary} onChange={set('summary')} className="sm:col-span-2" />
        {form.kind === 'colour' && (
          <>
            <TextField label={t('Hex')} required value={form.colourHex} onChange={set('colourHex')} placeholder="#F0DFD5" className="font-mono" />
            <TextField label={t('Palette number')} value={form.paletteNumber} onChange={set('paletteNumber')} placeholder="05" className="font-mono" />
            <TextField label={t('Colour name')} value={form.colourName} onChange={set('colourName')} className="sm:col-span-2" />
          </>
        )}
        <TextField label={t('Tags')} value={form.tags} onChange={set('tags')} placeholder={t('robe, fw27')} help={t('Comma-separated.')} />
        <SelectField label={t('Collection')} value={form.collectionCode} onChange={set('collectionCode')}>
          <option value="">{t('The brand')}</option>
          {collections.data?.map((collection) => (
            <option key={collection.code} value={collection.code}>
              {collection.name}
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
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function BrandCentre() {
  const t = useT();
  const session = useRequiredSession();
  const manage = BRAND_ROLES.includes(session.role);
  const assets = useBrandAssets();
  const collections = useCollections();
  const [dialog, setDialog] = useState<{ asset: BrandAssetView | null; kind: BrandAssetKind } | null>(null);
  const [tag, setTag] = useState('');
  const all = useMemo(() => assets.data ?? [], [assets.data]);
  const tags = useMemo(() => [...new Set(all.flatMap((asset) => asset.tags))].sort(), [all]);
  const shown = tag ? all.filter((asset) => asset.tags.includes(tag)) : all;
  const byKind = (kind: BrandAssetKind) => shown.filter((asset) => asset.kind === kind).sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title));
  const story = byKind('story')[0];
  const colours = byKind('colour');
  const collectionName = (code: string | null) => (code ? (collections.data?.find((collection) => collection.code === code)?.name ?? code) : '');

  return (
    <>
      <ModuleTitle
        number="18"
        title={t('Development')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setDialog({ asset: null, kind: 'inspiration' })}>
              <Plus size={16} aria-hidden="true" />{t('New asset')}</Button>
          )
        }
      >{t('The Brand Centre: the story, the palette, the type, the materials, the approved designs and what inspires them. Every product draws on it.')}</ModuleTitle>
      <DevelopmentTabs active="brand" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Filter by tag')}>
            <button type="button" aria-pressed={tag === ''} onClick={() => setTag('')} className={cn('h-8 rounded-xs border px-3 text-[0.8125rem]', tag === '' ? 'border-charcoal bg-charcoal text-milk' : 'border-line-strong bg-panel hover:border-charcoal')}>{t('All')}</button>
            {tags.map((candidate) => (
              <button key={candidate} type="button" aria-pressed={tag === candidate} onClick={() => setTag(candidate)} className={cn('h-8 rounded-xs border px-3 text-[0.8125rem]', tag === candidate ? 'border-charcoal bg-charcoal text-milk' : 'border-line-strong bg-panel hover:border-charcoal')}>
                {candidate}
              </button>
            ))}
          </div>
        )}
        {assets.isPending ? (
          <p className="text-ink-muted">{t('Loading the Brand Centre')}</p>
        ) : (
          <>
            <Panel title={t('Brand story')} action={manage && <Button size="sm" onClick={() => setDialog({ asset: story ?? null, kind: 'story' })}>{story ? t('Edit') : t('Write it')}</Button>}>
              {story ? (
                <div className="max-w-prose">
                  <h3 className="font-display text-[1.75rem] font-medium leading-tight">{story.title}</h3>
                  <p className="mt-3 whitespace-pre-wrap text-[1rem] leading-relaxed">{story.summary}</p>
                </div>
              ) : (
                <p className="text-ink-muted">{t('The story is not written here yet.')}</p>
              )}
            </Panel>

            <Panel title={t('Palette')} count={colours.length} action={manage && <Button size="sm" onClick={() => setDialog({ asset: null, kind: 'colour' })}>{t('Add colour')}</Button>}>
              {colours.length === 0 ? (
                <p className="text-ink-muted">{t('No colours yet.')}</p>
              ) : (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                  {colours.map((asset) => (
                    <li key={asset.id}>
                      <button type="button" onClick={() => manage && setDialog({ asset, kind: 'colour' })} className="w-full overflow-hidden rounded-[6px] border border-line bg-panel text-start hover:border-line-strong">
                        <span className="relative block h-16" style={{ backgroundColor: asset.colourHex ?? '#CCCCCC' }}>
                          {asset.paletteNumber && <span className="code absolute start-2 top-2 rounded-[3px] bg-milk/90 px-1.5 py-0.5 text-[0.6875rem] text-charcoal">{asset.paletteNumber}</span>}
                        </span>
                        <span className="block px-2.5 pb-2.5 pt-2">
                          <span className="block truncate text-sm font-medium">{asset.title}</span>
                          <span className="code block text-ink-muted">{asset.colourHex?.toUpperCase()}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {(['logo', 'typeface', 'material', 'guideline', 'approved_design', 'imagery', 'inspiration'] as const).map((kind) => {
              const own = byKind(kind);
              return (
                <Panel key={kind} title={t(BRAND_ASSET_KIND_LABEL[kind])} count={own.length} flush action={manage && <Button size="sm" onClick={() => setDialog({ asset: null, kind })}>{t('Add')}</Button>}>
                  {own.length === 0 ? (
                    <p className="px-5 py-5 text-ink-muted">{t('Nothing here yet.')}</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {own.map((asset) => (
                        <li key={asset.id} className="flex items-start justify-between gap-4 px-5 py-3">
                          <div className="min-w-0">
                            <p className="font-medium">{asset.title}</p>
                            {asset.summary && <p className="mt-0.5 max-w-prose text-[0.875rem] text-ink-soft">{asset.summary}</p>}
                            <p className="mt-1 flex flex-wrap gap-x-3 text-[0.75rem] text-ink-muted">
                              {asset.collectionCode && <span>{collectionName(asset.collectionCode)}</span>}
                              {asset.tags.map((candidate) => (
                                <span key={candidate} className="code">#{candidate}</span>
                              ))}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-3">
                            <StatusChip tone={asset.status === 'approved' ? 'positive' : asset.status === 'retired' ? 'neutral' : 'caution'}>{t(asset.status === 'approved' ? 'Approved' : asset.status === 'retired' ? 'Retired' : 'Draft')}</StatusChip>
                            {manage && <Button size="sm" variant="quiet" onClick={() => setDialog({ asset, kind })}>{t('Edit')}</Button>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              );
            })}
          </>
        )}
      </div>
      {manage && <AssetDialog asset={dialog?.asset ?? null} kind={dialog?.kind ?? 'inspiration'} open={dialog !== null} onClose={() => setDialog(null)} />}
    </>
  );
}

function CollectionDialog({ collection, open, onClose }: { collection: CollectionView | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveCollection();
  const [form, setForm] = useState({ code: '', name: '', season: '', year: '', theme: '', targetLaunch: '', status: 'planning' as CollectionView['status'] });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(collection ? { code: collection.code, name: collection.name, season: collection.season, year: collection.year === null ? '' : String(collection.year), theme: collection.theme, targetLaunch: collection.targetLaunch ?? '', status: collection.status } : { code: '', name: '', season: '', year: '', theme: '', targetLaunch: '', status: 'planning' });
  }, [open, collection]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9-]{2,16}$/.test(code)) return setError(t('A code of 2 to 16 capitals, digits or hyphens.'));
    if (!form.name.trim()) return setError(t('Name the collection.'));
    try {
      await save.mutateAsync({ code, name: form.name, season: form.season, year: form.year ? Number(form.year) : null, theme: form.theme, targetLaunch: form.targetLaunch || null, status: form.status, moodDocumentId: null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The collection could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={collection ? t('Collection') : t('New collection')} description={t('A season or a theme that groups products across categories.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Code')} required value={form.code} onChange={set('code')} placeholder="FW27" disabled={collection !== null} className="font-mono" />
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} placeholder={t('Autumn Winter 2027')} />
        <TextField label={t('Season')} value={form.season} onChange={set('season')} placeholder="FW" />
        <TextField label={t('Year')} type="number" value={form.year} onChange={set('year')} placeholder="2027" />
        <TextField label={t('Target launch')} type="date" value={form.targetLaunch} onChange={set('targetLaunch')} />
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {COLLECTION_STATUSES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t(COLLECTION_STATUS_LABEL[candidate])}
            </option>
          ))}
        </SelectField>
        <TextArea label={t('Theme')} rows={3} value={form.theme} onChange={set('theme')} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Collections() {
  const t = useT();
  const manage = useManageDevelopment();
  const collections = useCollections();
  const products = useDevelopmentProducts();
  const [dialog, setDialog] = useState<{ collection: CollectionView | null } | null>(null);
  const rows = collections.data ?? [];
  return (
    <>
      <ModuleTitle number="18" title={t('Development')} actions={manage && <Button variant="primary" onClick={() => setDialog({ collection: null })}><Plus size={16} aria-hidden="true" />{t('New collection')}</Button>}>{t('Collections: the seasons and themes that group the products.')}</ModuleTitle>
      <DevelopmentTabs active="collections" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {collections.isPending ? (
          <p className="text-ink-muted">{t('Loading collections')}</p>
        ) : rows.length === 0 ? (
          <EmptyState title={t('No collections yet')} action={manage ? <Button variant="primary" onClick={() => setDialog({ collection: null })}>{t('New collection')}</Button> : undefined}>{t('A collection groups products across categories for a season.')}</EmptyState>
        ) : (
          rows.map((collection) => {
            const own = (products.data ?? []).filter((product) => product.collectionCode === collection.code);
            return (
              <Panel
                key={collection.code}
                title={collection.name}
                count={own.length}
                flush
                action={
                  <span className="flex items-center gap-3">
                    <span className="code text-ink-muted">{collection.code}</span>
                    <StatusChip tone={COLLECTION_STATUS_TONE[collection.status]}>{t(COLLECTION_STATUS_LABEL[collection.status])}</StatusChip>
                    {collection.targetLaunch && <span className="code text-[0.8125rem] text-ink-soft">{formatLocalDate(collection.targetLaunch)}</span>}
                    {manage && <Button size="sm" onClick={() => setDialog({ collection })}>{t('Edit')}</Button>}
                  </span>
                }
              >
                {collection.theme && <p className="max-w-prose border-b border-line px-5 py-4 text-[0.9375rem] leading-relaxed">{collection.theme}</p>}
                {own.length === 0 ? (
                  <p className="px-5 py-4 text-ink-muted">{t('No products in this collection yet.')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {own.map((product) => (
                      <li key={product.number} className="flex items-center justify-between gap-4 px-5 py-3">
                        <span>
                          <Link to={`/development/products/${product.number}`} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {product.name}
                          </Link>
                          <span className="ms-3 text-[0.8125rem] text-ink-muted">{product.categoryName}</span>
                        </span>
                        <StatusChip tone={DEVELOPMENT_STAGE_TONE[product.stage]}>{t(DEVELOPMENT_STAGE_LABEL[product.stage])}</StatusChip>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            );
          })
        )}
      </div>
      {manage && <CollectionDialog collection={dialog?.collection ?? null} open={dialog !== null} onClose={() => setDialog(null)} />}
    </>
  );
}

function CategoryDialog({ category, categories, open, onClose }: { category: ProductCategoryView | null; categories: readonly ProductCategoryView[]; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveCategory();
  const [form, setForm] = useState({ code: '', name: '', description: '', parentCode: '', sort: '0', status: 'active' as ProductCategoryView['status'] });
  const [fields, setFields] = useState<{ key: string; label: string; kind: SpecField['kind']; unit: string; options: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(category ? { code: category.code, name: category.name, description: category.description, parentCode: category.parentCode ?? '', sort: String(category.sort), status: category.status } : { code: '', name: '', description: '', parentCode: '', sort: String((categories.length + 1) * 1), status: 'active' });
    setFields(category ? category.specSchema.map((field) => ({ key: field.key, label: field.label, kind: field.kind, unit: field.unit ?? '', options: (field.options ?? []).join(', ') })) : []);
  }, [open, category, categories.length]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const setField = (index: number, key: keyof (typeof fields)[number], value: string) => setFields((current) => current.map((field, i) => (i === index ? { ...field, [key]: value } : field)));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{2,16}$/.test(code)) return setError(t('A code of 2 to 16 capitals or digits.'));
    if (!form.name.trim()) return setError(t('Name the category.'));
    const specSchema: SpecField[] = fields
      .filter((field) => field.label.trim())
      .map((field) => ({ key: field.key.trim() || field.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'), label: field.label.trim(), kind: field.kind, ...(field.unit.trim() ? { unit: field.unit.trim() } : {}), ...(field.kind === 'select' ? { options: field.options.split(',').map((option) => option.trim()).filter(Boolean) } : {}) }));
    try {
      await save.mutateAsync({ code, name: form.name, description: form.description, parentCode: form.parentCode || null, specSchema, sort: Number(form.sort) || 0, status: form.status });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The category could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={category ? t('Category') : t('New category')} description={t('A product domain and the specification fields its products carry. Adding a domain is adding a row, not a release.')} className="w-[min(44rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <TextField label={t('Code')} required value={form.code} onChange={set('code')} placeholder="APP" disabled={category !== null} className="font-mono" />
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} placeholder={t('Apparel')} className="sm:col-span-2" />
        <SelectField label={t('Parent')} value={form.parentCode} onChange={set('parentCode')}>
          <option value="">{t('Top level')}</option>
          {categories.filter((candidate) => candidate.code !== category?.code && candidate.parentCode === null).map((candidate) => (
            <option key={candidate.code} value={candidate.code}>
              {candidate.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Order')} type="number" value={form.sort} onChange={set('sort')} />
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          <option value="active">{t('Active')}</option>
          <option value="archived">{t('Archived')}</option>
        </SelectField>
        <TextArea label={t('Description')} rows={2} value={form.description} onChange={set('description')} className="sm:col-span-3" />
        <fieldset className="border-t border-line pt-4 sm:col-span-3">
          <legend className="caps mb-3 text-ink-soft">{t('Specification fields')}</legend>
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={index} className="grid items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_5rem_minmax(0,2fr)_2.5rem]">
                <TextField label={t('Label')} value={field.label} onChange={(event) => setField(index, 'label', event.target.value)} placeholder={t('Composition')} />
                <SelectField label={t('Kind')} value={field.kind} onChange={(event) => setField(index, 'kind', event.target.value)}>
                  <option value="text">{t('Text')}</option>
                  <option value="number">{t('Number')}</option>
                  <option value="select">{t('Choice')}</option>
                </SelectField>
                <TextField label={t('Unit')} value={field.unit} onChange={(event) => setField(index, 'unit', event.target.value)} placeholder="gsm" />
                <TextField label={t('Choices')} value={field.options} onChange={(event) => setField(index, 'options', event.target.value)} placeholder={t('EDT, EDP, Extrait')} disabled={field.kind !== 'select'} />
                <button type="button" aria-label={`${t('Remove field')} ${index + 1}`} onClick={() => setFields((current) => current.filter((_, i) => i !== index))} className="grid h-10 place-items-center rounded-xs text-ink-muted hover:bg-sunken hover:text-ink">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-3" onClick={() => setFields((current) => [...current, { key: '', label: '', kind: 'text', unit: '', options: '' }])}>
            <Plus size={14} aria-hidden="true" />
            {t('Add field')}
          </Button>
        </fieldset>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-3">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Categories() {
  const t = useT();
  const manage = useManageDevelopment();
  const categories = useProductCategories();
  const products = useDevelopmentProducts();
  const [dialog, setDialog] = useState<{ category: ProductCategoryView | null } | null>(null);
  const rows = categories.data ?? [];
  const count = (code: string) => (products.data ?? []).filter((product) => product.categoryCode === code).length;
  return (
    <>
      <ModuleTitle number="18" title={t('Development')} actions={manage && <Button variant="primary" onClick={() => setDialog({ category: null })}><Plus size={16} aria-hidden="true" />{t('New category')}</Button>}>{t('Categories: the product domains and the specification each one carries.')}</ModuleTitle>
      <DevelopmentTabs active="categories" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Categories')} count={rows.length} flush>
          {categories.isPending ? (
            <p className="px-5 py-6 text-ink-muted">{t('Loading categories')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No categories yet')} action={manage ? <Button variant="primary" onClick={() => setDialog({ category: null })}>{t('New category')}</Button> : undefined}>{t('Apparel, fragrance, home scent, bags, shoes, accessories: each with the fields its products carry.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Categories')}>
              <thead>
                <tr>
                  <Th>{t('Code')}</Th>
                  <Th>{t('Category')}</Th>
                  <Th>{t('Specification fields')}</Th>
                  <Th numeric>{t('Products')}</Th>
                  <Th>{t('Status')}</Th>
                  {manage && <Th>{''}</Th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((category) => (
                  <Tr key={category.code}>
                    <Td className="code">{category.code}</Td>
                    <Td>
                      <span className={cn('font-medium', category.parentCode && 'ps-4')}>{category.name}</span>
                      {category.description && <span className="ms-3 text-ink-muted">{category.description}</span>}
                    </Td>
                    <Td className="text-[0.8125rem] text-ink-soft">{category.specSchema.map((field) => field.label).join(' · ') || '—'}</Td>
                    <Td numeric>{count(category.code)}</Td>
                    <Td>
                      <StatusChip tone={category.status === 'active' ? 'positive' : 'neutral'}>{t(category.status === 'active' ? 'Active' : 'Archived')}</StatusChip>
                    </Td>
                    {manage && (
                      <Td>
                        <Button size="sm" variant="quiet" onClick={() => setDialog({ category })}>{t('Edit')}</Button>
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <CategoryDialog category={dialog?.category ?? null} categories={rows} open={dialog !== null} onClose={() => setDialog(null)} />}
    </>
  );
}
