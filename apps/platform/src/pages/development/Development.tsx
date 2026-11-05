import {
  DEVELOPMENT_HEALTH_LABEL,
  DEVELOPMENT_HEALTH_TONE,
  DEVELOPMENT_STAGE_LABEL,
  DEVELOPMENT_STAGE_TONE,
  MONEY_DECIMALS,
  OPEN_DEVELOPMENT_STAGES,
  PRIORITIES,
  PRIORITY_LABEL,
  SAMPLE_VERDICT_LABEL,
  canManageModule,
  formatLocalDate,
  formatMoney,
  moneyFromStored,
  parseFixed,
  stageCounts,
  type DevelopmentProductDetail,
  type DevelopmentProductSummary,
  type DevelopmentStage,
  type Priority,
} from '@basis/shared';
import { Button, Dialog, EmptyState, FigureTile, Ledger, Panel, SelectField, StatusChip, Swatch, Td, TextArea, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useCollections, useDevelopmentProducts, useProductCategories, useSaveDevelopmentProduct } from '../../data/development';
import { useOpenTasks } from '../../data/tasks';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 18 Development: the department's board, its products and the
// dossier each one keeps. A product moves through the gate; nothing here is
// a status someone types.

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ILS', 'CNY'];
const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency), 0);

export function DevelopmentTabs({ active }: { active: 'board' | 'products' | 'brand' | 'collections' | 'categories' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Development sections')} className="flex gap-6 overflow-x-auto border-b border-line bg-panel px-5 lg:px-8">
      {tab('board', '/development', t('Board'))}
      {tab('products', '/development/products', t('Products'))}
      {tab('brand', '/development/brand', t('Brand Centre'))}
      {tab('collections', '/development/collections', t('Collections'))}
      {tab('categories', '/development/categories', t('Categories'))}
    </nav>
  );
}

export function useManageDevelopment() {
  const session = useRequiredSession();
  return canManageModule(session.role, 'development');
}

/** The dossier opened or its facts changed. The stage is not here. */
export function ProductDialog({ product, open, onClose }: { product: DevelopmentProductDetail | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const save = useSaveDevelopmentProduct();
  const categories = useProductCategories();
  const collections = useCollections();
  const [form, setForm] = useState({ categoryCode: '', collectionCode: '', name: '', workingTitle: '', description: '', intent: '', priority: 'normal' as Priority, targetLaunch: '', budget: '', budgetCurrency: 'USD', specs: {} as Record<string, string> });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(product
      ? { categoryCode: product.categoryCode, collectionCode: product.collectionCode ?? '', name: product.name, workingTitle: product.workingTitle, description: product.description, intent: product.intent, priority: product.priority, targetLaunch: product.targetLaunch ?? '', budget: product.budgetAmount ? formatMoney(moneyFromStored(product.budgetAmount, product.budgetCurrency), 2).replace(/,/g, '') : '', budgetCurrency: product.budgetCurrency, specs: { ...product.specs } }
      : { categoryCode: categories.data?.[0]?.code ?? '', collectionCode: '', name: '', workingTitle: '', description: '', intent: '', priority: 'normal', targetLaunch: '', budget: '', budgetCurrency: 'USD', specs: {} });
  }, [open, product, categories.data]);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const schema = categories.data?.find((category) => category.code === form.categoryCode)?.specSchema ?? [];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.categoryCode) return setError(t('Choose the category.'));
    if (!form.name.trim()) return setError(t('Name the product.'));
    let budgetAmount: string | null = null;
    if (form.budget.trim()) {
      try {
        budgetAmount = parseFixed(form.budget, MONEY_DECIMALS).toString();
      } catch {
        return setError(t('The budget is not an amount.'));
      }
    }
    try {
      const result = await save.mutateAsync({ number: product?.number, categoryCode: form.categoryCode, collectionCode: form.collectionCode || null, name: form.name, workingTitle: form.workingTitle, description: form.description, intent: form.intent, priority: form.priority, ownerUid: null, targetLaunch: form.targetLaunch || null, budgetAmount, budgetCurrency: form.budgetCurrency, specs: Object.fromEntries(Object.entries(form.specs).filter(([, value]) => value.trim())) });
      onClose();
      if (!product) navigate(`/development/products/${result.number}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The product could not be saved.'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={product ? t('Edit product') : t('New development product')} description={t('A product starts as an idea. Only the name and the category are needed now; everything else arrives when it is known.')} className="w-[min(44rem,calc(100vw-2rem))]">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Name')} required maxLength={160} value={form.name} onChange={set('name')} placeholder="Essential Tee" />
        <TextField label={t('Working title')} maxLength={160} value={form.workingTitle} onChange={set('workingTitle')} />
        <SelectField label={t('Category')} required value={form.categoryCode} onChange={(event) => setForm((current) => ({ ...current, categoryCode: event.target.value, specs: {} }))}>
          <option value="">{t('Choose the category')}</option>
          {categories.data?.filter((category) => category.status === 'active').map((category) => (
            <option key={category.code} value={category.code}>
              {t(category.name)}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Collection')} value={form.collectionCode} onChange={set('collectionCode')}>
          <option value="">{t('No collection')}</option>
          {collections.data?.map((collection) => (
            <option key={collection.code} value={collection.code}>
              {collection.name}
            </option>
          ))}
        </SelectField>
        <TextArea label={t('Description')} rows={3} value={form.description} onChange={set('description')} className="sm:col-span-2" help={t('What it is, for whom, and what makes it ours.')} />
        <TextArea label={t('Intent')} rows={2} value={form.intent} onChange={set('intent')} className="sm:col-span-2" help={t('Why this product, in the brand\'s words.')} />
        <SelectField label={t('Priority')} value={form.priority} onChange={set('priority')}>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {t(PRIORITY_LABEL[priority])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Target launch')} type="date" value={form.targetLaunch} onChange={set('targetLaunch')} />
        <TextField label={t('Development budget')} inputMode="decimal" value={form.budget} onChange={set('budget')} placeholder="12000" />
        <SelectField label={t('Currency')} value={form.budgetCurrency} onChange={set('budgetCurrency')}>
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </SelectField>
        {schema.length > 0 && (
          <fieldset className="border-t border-line pt-4 sm:col-span-2">
            <legend className="caps mb-3 text-ink-soft">{t('Specification')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {schema.map((field) =>
                field.kind === 'select' ? (
                  <SelectField key={field.key} label={t(field.label)} value={form.specs[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, specs: { ...current.specs, [field.key]: event.target.value } }))}>
                    <option value="">{t('Not set')}</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectField>
                ) : (
                  <TextField key={field.key} label={t(field.label)} unit={field.unit} type={field.kind === 'number' ? 'number' : 'text'} value={form.specs[field.key] ?? ''} onChange={(event) => setForm((current) => ({ ...current, specs: { ...current.specs, [field.key]: event.target.value } }))} />
                ),
              )}
            </div>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{product ? t('Save') : t('Open the dossier')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function HealthChip({ health }: { health: DevelopmentProductSummary['health'] }) {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5 text-[0.8125rem]">
      <Swatch tone={DEVELOPMENT_HEALTH_TONE[health]} />
      {t(DEVELOPMENT_HEALTH_LABEL[health])}
    </span>
  );
}

export function DevelopmentBoard() {
  const t = useT();
  const manage = useManageDevelopment();
  const products = useDevelopmentProducts();
  const tasks = useOpenTasks();
  const [creating, setCreating] = useState(false);
  const all = useMemo(() => products.data ?? [], [products.data]);
  const counts = useMemo(() => stageCounts(all), [all]);
  const open = all.filter((product) => OPEN_DEVELOPMENT_STAGES.includes(product.stage));
  const awaiting = all.filter((product) => product.health === 'awaiting_verdict');
  const late = all.filter((product) => product.health === 'late' || product.health === 'quiet');
  const dueTasks = (tasks.data ?? []).filter((task) => task.entityType === 'development_product').slice(0, 8);
  const budget = open.reduce((sum, product) => sum + (product.budgetAmount && product.budgetCurrency === 'USD' ? BigInt(product.budgetAmount) : 0n), 0n);
  const launches = useMemo(() => {
    const byMonth = new Map<string, DevelopmentProductSummary[]>();
    for (const product of open) {
      if (!product.targetLaunch) continue;
      const key = product.targetLaunch.slice(0, 7);
      byMonth.set(key, [...(byMonth.get(key) ?? []), product]);
    }
    return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [open]);

  return (
    <>
      <ModuleTitle
        number="18"
        title={t('Development')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />{t('New product')}</Button>
          )
        }
      >{t('From an idea to a product ready to make and sell, under the brand. The board shows where everything stands.')}</ModuleTitle>
      <DevelopmentTabs active="board" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <section aria-label={t('Figures')} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FigureTile label={t('In development')} value={String(open.length)} note={`${all.filter((product) => product.stage === 'commercial').length} ${t('commercial')}`} />
          <FigureTile label={t('Awaiting verdict')} value={String(awaiting.length)} note={t('sample rounds received, not judged')} />
          <FigureTile label={t('Late or quiet')} value={String(late.length)} note={t('past target launch, or 21 days without a word')} />
          <FigureTile label={t('Planned budget')} value={money(budget.toString(), 'USD')} note={t('open products, USD budgets')} />
        </section>

        <Panel title={t('Pipeline')}>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {counts.map(({ stage, count }) => (
              <div key={stage} className="rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3">
                <p className="caps flex items-center gap-1.5 text-ink-muted">
                  <Swatch tone={DEVELOPMENT_STAGE_TONE[stage]} />
                  {t(DEVELOPMENT_STAGE_LABEL[stage])}
                </p>
                <p className="mt-2 font-display text-[2rem] leading-none">{count}</p>
                <ul className="mt-3 space-y-1">
                  {all.filter((product) => product.stage === stage).slice(0, 4).map((product) => (
                    <li key={product.number} className="truncate text-[0.8125rem]">
                      <Link to={`/development/products/${product.number}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-12">
          <Panel title={t('Needs attention')} count={awaiting.length + late.length} className="xl:col-span-6" flush>
            {awaiting.length + late.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">{t('Nothing is waiting or late.')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...awaiting, ...late].map((product) => (
                  <li key={product.number} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <Link to={`/development/products/${product.number}`} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {product.name}
                      </Link>
                      <p className="code text-[0.75rem] text-ink-muted">
                        {product.number} · {t(DEVELOPMENT_STAGE_LABEL[product.stage])}
                        {product.latestSample && ` · ${t('round')} ${product.latestSample.round} ${t(SAMPLE_VERDICT_LABEL[product.latestSample.verdict])}`}
                      </p>
                    </div>
                    <HealthChip health={product.health} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('Tasks due')} count={dueTasks.length} className="xl:col-span-6" flush>
            {dueTasks.length === 0 ? (
              <p className="px-5 py-6 text-ink-muted">{t('No open development tasks.')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {dueTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="min-w-0 truncate">{task.title}</span>
                    <span className="code text-[0.75rem] text-ink-muted">{task.dueOn ? formatLocalDate(task.dueOn) : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('Launches')} className="xl:col-span-12">
            {launches.length === 0 ? (
              <p className="text-ink-muted">{t('No target launch dates yet.')}</p>
            ) : (
              <ol className="flex flex-wrap gap-6">
                {launches.map(([month, list]) => (
                  <li key={month} className="min-w-40">
                    <p className="caps text-ink-muted" dir="ltr">{month}</p>
                    <ul className="mt-2 space-y-1">
                      {list.map((product) => (
                        <li key={product.number} className="flex items-center gap-2 text-[0.875rem]">
                          <Swatch tone={DEVELOPMENT_STAGE_TONE[product.stage]} />
                          <Link to={`/development/products/${product.number}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {product.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
      {manage && <ProductDialog product={null} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}

export function DevelopmentProducts() {
  const t = useT();
  const manage = useManageDevelopment();
  const products = useDevelopmentProducts();
  const categories = useProductCategories();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [stage, setStage] = useState<'' | DevelopmentStage>('');
  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (products.data ?? []).filter((product) => (!category || product.categoryCode === category) && (!stage || product.stage === stage) && (!text || product.name.toLowerCase().includes(text) || product.number.toLowerCase().includes(text) || product.workingTitle.toLowerCase().includes(text)));
  }, [products.data, query, category, stage]);

  return (
    <>
      <ModuleTitle
        number="18"
        title={t('Development')}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />{t('New product')}</Button>
          )
        }
      >{t('Every product in development, its stage and its health.')}</ModuleTitle>
      <DevelopmentTabs active="products" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Products')} count={rows.length} flush>
          <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-3">
            <TextField label={t('Search')} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Name or number')} />
            <SelectField label={t('Category')} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{t('All categories')}</option>
              {categories.data?.map((candidate) => (
                <option key={candidate.code} value={candidate.code}>
                  {candidate.name}
                </option>
              ))}
            </SelectField>
            <SelectField label={t('Stage')} value={stage} onChange={(event) => setStage(event.target.value as '' | DevelopmentStage)}>
              <option value="">{t('All stages')}</option>
              {Object.entries(DEVELOPMENT_STAGE_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(label)}
                </option>
              ))}
            </SelectField>
          </div>
          {products.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading products')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No products yet')} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>{t('New product')}</Button> : undefined}>{t('Open the first idea. A name and a category are enough to start.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Products in development')}>
              <thead>
                <tr>
                  <Th>{t('Number')}</Th>
                  <Th>{t('Product')}</Th>
                  <Th>{t('Category')}</Th>
                  <Th>{t('Collection')}</Th>
                  <Th>{t('Stage')}</Th>
                  <Th>{t('Health')}</Th>
                  <Th>{t('Owner')}</Th>
                  <Th>{t('Target launch')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <Tr key={product.number}>
                    <Td className="code">
                      <Link to={`/development/products/${product.number}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {product.number}
                      </Link>
                    </Td>
                    <Td>
                      <span className="font-medium">{product.name}</span>
                      {product.workingTitle && <span className="ms-3 text-ink-muted">{product.workingTitle}</span>}
                    </Td>
                    <Td className="text-ink-soft">{t(product.categoryName)}</Td>
                    <Td className="text-ink-soft">{product.collectionName || '—'}</Td>
                    <Td>
                      <StatusChip tone={DEVELOPMENT_STAGE_TONE[product.stage]}>{t(DEVELOPMENT_STAGE_LABEL[product.stage])}</StatusChip>
                    </Td>
                    <Td>
                      <HealthChip health={product.health} />
                    </Td>
                    <Td className="text-ink-soft">{product.ownerName}</Td>
                    <Td className="code text-ink-soft">{product.targetLaunch ? formatLocalDate(product.targetLaunch) : '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <ProductDialog product={null} open={creating} onClose={() => setCreating(false)} />}
    </>
  );
}
