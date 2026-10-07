import {
  MOVEMENT_REASON_LABEL,
  MOVEMENT_REASON_TONE,
  QUANTITY_DECIMALS,
  STOCK_LOCATION_KINDS,
  STOCK_LOCATION_KIND_LABEL,
  canViewCosts,
  formatLocalDate,
  formatMoney,
  formatQuantity,
  lowStock,
  metresNumber,
  moneyFromStored,
  parseFixed,
  quantityFromStored,
  stockValue,
  type StockLocationKind,
} from '@basis/shared';
import { Button, Dialog, EmptyState, Ledger, Panel, SelectField, ShadeDot, StatusChip, Td, TextField, Th, Tr, cn } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink } from 'react-router';
import { ExportMenu } from '../../components/ExportMenu';
import { useLotCosts } from '../../data/costing';
import { useCreateStockLocation, useMovements, useReceipts, useReorderPolicies, useSetReorderPolicy, useStockBalances, useStockLocations } from '../../data/inventory';
import { useSkus } from '../../data/catalog';
import { useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 06 Inventory: what is in the warehouses by SKU and lot, every
// movement, every receipt, the places stock can be and the reorder points.
// Balances are the ledger summed; nothing here is typed in.

const metres = (stored: string) => formatQuantity(quantityFromStored(stored, 'm'));
const short = (iso: string) => (iso ? formatLocalDate(iso.slice(0, 10) as never) : '—');

export function InventoryTabs({ active }: { active: 'stock' | 'movements' | 'receipts' | 'places' }) {
  const t = useT();
  const tab = (key: typeof active, to: string, label: string) => (
    <NavLink key={key} to={to} end className={cn('-mb-px flex h-11 items-center border-b-2 text-sm transition-colors duration-150', active === key ? 'border-charcoal font-medium text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
      {label}
    </NavLink>
  );
  return (
    <nav aria-label={t('Inventory sections')} className="flex gap-6 overflow-x-auto border-b border-line bg-panel px-5 lg:px-8">
      {tab('stock', '/inventory', t('Stock'))}
      {tab('movements', '/inventory/movements', t('Movements'))}
      {tab('receipts', '/inventory/receipts', t('Receipts'))}
      {tab('places', '/inventory/places', t('Places and reorder'))}
    </nav>
  );
}

export function Stock() {
  const t = useT();
  const session = useRequiredSession();
  const balances = useStockBalances();
  const policies = useReorderPolicies();
  const costRole = canViewCosts(session.role);
  const lotCosts = useLotCosts(costRole);
  const rows = (balances.data ?? []).filter((balance) => balance.locationKind === 'physical');
  const virtual = (balances.data ?? []).filter((balance) => balance.locationKind !== 'physical');
  const landed = new Map((lotCosts.data ?? []).map((cost) => [cost.lotNumber, cost.landedUnitCost]));
  const value = costRole ? stockValue(rows, landed) : null;
  const currency = lotCosts.data?.[0]?.currency ?? 'USD';
  const low = lowStock(rows.map((balance) => ({ ...balance, physical: true })), policies.data ?? []);
  // Grouped by SKU, lots beneath, soonest-moved first.
  const skus = [...new Set(rows.map((balance) => balance.skuCode))].map((code) => {
    const own = rows.filter((balance) => balance.skuCode === code);
    const first = own[0]!;
    return { code, first, lots: own, onHand: own.reduce((sum, balance) => sum + BigInt(balance.onHand), 0n).toString(), rolls: own.reduce((sum, balance) => sum + balance.rolls, 0), low: low.find((item) => item.skuCode === code) ?? null };
  }).sort((a, b) => (a.low ? 0 : 1) - (b.low ? 0 : 1) || a.first.productName.localeCompare(b.first.productName));
  const totalMetres = rows.reduce((sum, balance) => sum + BigInt(balance.onHand), 0n).toString();
  const totalRolls = rows.reduce((sum, balance) => sum + balance.rolls, 0);

  return (
    <>
      <ModuleTitle
        number="06"
        title={t('Inventory')}
        actions={<ExportMenu ledger="stock" size="md" rows={rows.map((balance) => ({ sku: balance.skuCode, product: balance.productName, shade: balance.shadeName, lot: balance.lotNumber, location: balance.locationName, quantityM: metresNumber(balance.onHand), rolls: balance.rolls, landedUnitCost: landed.has(balance.lotNumber) ? Number(landed.get(balance.lotNumber)) / 10000 : null, updated: balance.updatedAt.slice(0, 10) }))} />}
      >
        {t('What is in the warehouses, by SKU and lot, with every roll placed. A balance is the ledger summed; nothing here is typed in.')}
      </ModuleTitle>
      <InventoryTabs active="stock" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            { label: t('On hand'), value: metres(totalMetres) },
            { label: t('Rolls'), value: String(totalRolls) },
            { label: t('Below reorder point'), value: String(low.length), tone: low.length > 0 ? 'text-caution' : '' },
            ...(value ? [{ label: t('At landed cost'), value: `${formatMoney(moneyFromStored(value.value, currency))}${value.unvaluedMetres !== '0' ? ` · ${metres(value.unvaluedMetres)} ${t('unvalued')}` : ''}` }] : []),
          ].map((figure) => (
            <div key={figure.label} className="bg-panel px-5 py-4">
              <dt className="caps text-ink-muted">{figure.label}</dt>
              <dd className={cn('mt-1 font-display text-[1.75rem] leading-none tracking-[-0.01em]', figure.tone)}>{figure.value}</dd>
            </div>
          ))}
        </dl>
        <Panel title={t('Stock by SKU')} count={skus.length} flush>
          {balances.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Reading the ledger')}</p>
          ) : skus.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('Nothing in stock yet')}>{t('Stock arrives when a shipment is received into a warehouse; every roll is then placed and every lot has a balance.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Stock by SKU')}>
              <thead>
                <tr>
                  <Th>{t('SKU')}</Th>
                  <Th>{t('Product')}</Th>
                  <Th>{t('Lot')}</Th>
                  <Th>{t('Place')}</Th>
                  <Th numeric>{t('Rolls')}</Th>
                  <Th numeric>{t('On hand')}</Th>
                  {costRole && <Th numeric>{t('Landed /m')}</Th>}
                  {costRole && <Th numeric>{t('Value')}</Th>}
                  <Th>{t('Reorder')}</Th>
                </tr>
              </thead>
              <tbody>
                {skus.flatMap((sku) => [
                  <Tr key={sku.code} className="bg-bone">
                    <Td className="code whitespace-nowrap font-medium">
                      <Link to={`/products/skus/${sku.code}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {sku.code}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap font-medium">
                      <span className="flex items-center gap-2.5">
                        <ShadeDot hex={sku.first.shadeHex} name={sku.first.shadeName} code={sku.first.shadeCode} size="sm" />
                        {sku.first.productName}, {sku.first.shadeName}
                      </span>
                    </Td>
                    <Td className="text-ink-muted">{sku.lots.length} {sku.lots.length === 1 ? t('lot') : t('lots')}</Td>
                    <Td />
                    <Td numeric className="font-medium">{sku.rolls || '—'}</Td>
                    <Td numeric className="font-medium">{metres(sku.onHand)}</Td>
                    {costRole && <Td />}
                    {costRole && <Td numeric className="font-medium">{stockValue(sku.lots, landed).valuedMetres === '0' ? <span className="font-normal text-ink-muted">—</span> : formatMoney(moneyFromStored(stockValue(sku.lots, landed).value, currency))}</Td>}
                    <Td>{sku.low ? <StatusChip tone="caution">{t('{metres} short', { metres: metres(sku.low.shortfall) })}</StatusChip> : <span className="text-ink-muted">{(policies.data ?? []).some((policy) => policy.skuCode === sku.code) ? t('Above point') : '—'}</span>}</Td>
                  </Tr>,
                  ...sku.lots.map((balance) => (
                    <Tr key={balance.id}>
                      <Td />
                      <Td />
                      <Td>
                        <Link to={`/inventory/lots/${balance.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                          {balance.lotNumber}
                        </Link>
                      </Td>
                      <Td className="text-ink-soft">{balance.locationName}</Td>
                      <Td numeric className="text-ink-soft">{balance.rolls || '—'}</Td>
                      <Td numeric>{metres(balance.onHand)}</Td>
                      {costRole && <Td numeric className="text-ink-soft">{landed.has(balance.lotNumber) ? formatMoney(moneyFromStored(landed.get(balance.lotNumber)!, currency), 4) : <span className="text-ink-muted">{t('not yet')}</span>}</Td>}
                      {costRole && <Td numeric className="text-ink-soft">{landed.has(balance.lotNumber) ? formatMoney(moneyFromStored(stockValue([balance], landed).value, currency)) : '—'}</Td>}
                      <Td />
                    </Tr>
                  )),
                ])}
              </tbody>
            </Ledger>
          )}
        </Panel>
        {virtual.length > 0 && (
          <Panel title={t('Outside the warehouses')} count={virtual.length} flush>
            <Ledger caption={t('Outside the warehouses')}>
              <thead>
                <tr>
                  <Th>{t('Place')}</Th>
                  <Th>{t('SKU')}</Th>
                  <Th>{t('Lot')}</Th>
                  <Th numeric>{t('Metres')}</Th>
                </tr>
              </thead>
              <tbody>
                {virtual.map((balance) => (
                  <Tr key={balance.id}>
                    <Td className="font-medium">{balance.locationName}</Td>
                    <Td className="code">{balance.skuCode}</Td>
                    <Td>
                      <Link to={`/inventory/lots/${balance.lotNumber}`} className="code underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {balance.lotNumber}
                      </Link>
                    </Td>
                    <Td numeric className={cn(BigInt(balance.onHand) < 0n && 'text-critical')}>{metres(balance.onHand)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          </Panel>
        )}
      </div>
    </>
  );
}

export function MovementsLedger({ lotNumber, limit }: { lotNumber?: string; limit?: number }) {
  const t = useT();
  const movements = useMovements(lotNumber, limit);
  const rows = movements.data ?? [];
  return (
    <Panel title={t('Movements')} count={rows.length} flush>
      {movements.isPending ? (
        <p className="px-5 py-6 text-ink-muted">{t('Reading the ledger')}</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-ink-muted">{t('No movements yet. The first is the receipt of a shipment.')}</p>
      ) : (
        <Ledger caption={t('Movements')}>
          <thead>
            <tr>
              <Th>{t('When')}</Th>
              <Th>{t('Reason')}</Th>
              {!lotNumber && <Th>{t('Lot')}</Th>}
              <Th>{t('Roll')}</Th>
              <Th numeric>{t('Metres')}</Th>
              <Th>{t('From')}</Th>
              <Th>{t('To')}</Th>
              <Th>{t('Source')}</Th>
              <Th>{t('Note')}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((movement) => (
              <Tr key={movement.id}>
                <Td className="code whitespace-nowrap text-ink-soft">{short(movement.occurredAt)}</Td>
                <Td>
                  <StatusChip tone={MOVEMENT_REASON_TONE[movement.reason]}>{t(MOVEMENT_REASON_LABEL[movement.reason])}</StatusChip>
                </Td>
                {!lotNumber && (
                  <Td>
                    <Link to={`/inventory/lots/${movement.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {movement.lotNumber}
                    </Link>
                    <span className="code block text-ink-muted">{movement.skuCode}</span>
                  </Td>
                )}
                <Td className="code whitespace-nowrap text-ink-soft">{movement.rollNumber ? movement.rollNumber.slice(-2) : '—'}</Td>
                <Td numeric>{metres(movement.quantity)}</Td>
                <Td className="text-ink-soft">{movement.fromLocationName || '—'}</Td>
                <Td className="text-ink-soft">{movement.toLocationName || <span className="text-ink-muted">{t('consumed')}</span>}</Td>
                <Td className="code whitespace-nowrap text-ink-soft">{movement.sourceId || '—'}</Td>
                <Td className="text-ink-soft">{movement.note || '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Ledger>
      )}
    </Panel>
  );
}

export function Movements() {
  const t = useT();
  return (
    <>
      <ModuleTitle number="06" title={t('Inventory')}>
        {t('The ledger: every receipt, transfer, cut, adjustment and shipment, newest first. Balances are its sum.')}
      </ModuleTitle>
      <InventoryTabs active="movements" />
      <div className="px-5 py-6 lg:px-8">
        <MovementsLedger limit={300} />
      </div>
    </>
  );
}

export function Receipts() {
  const t = useT();
  const receipts = useReceipts();
  const rows = receipts.data ?? [];
  return (
    <>
      <ModuleTitle number="06" title={t('Inventory')}>
        {t('What came in from each shipment, counted against what was loaded. A line off count is a discrepancy to settle with the forwarder or the mill.')}
      </ModuleTitle>
      <InventoryTabs active="receipts" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Receipts')} count={rows.length} flush>
          {receipts.isPending ? (
            <p className="px-5 py-8 text-ink-muted">{t('Loading receipts')}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={t('No receipts yet')}>{t('A shipment is received from its sheet once its main carriage has arrived.')}</EmptyState>
            </div>
          ) : (
            <Ledger caption={t('Receipts')}>
              <thead>
                <tr>
                  <Th>{t('Receipt')}</Th>
                  <Th>{t('Shipment')}</Th>
                  <Th>{t('Received')}</Th>
                  <Th>{t('Into')}</Th>
                  <Th>{t('Lines')}</Th>
                  <Th numeric>{t('Metres')}</Th>
                  <Th>{t('Count')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((receipt) => (
                  <Tr key={receipt.id}>
                    <Td className="code whitespace-nowrap font-medium">{receipt.number}</Td>
                    <Td>
                      <Link to={`/logistics/shipments/${receipt.shipmentNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {receipt.shipmentNumber}
                      </Link>
                    </Td>
                    <Td className="code whitespace-nowrap text-ink-soft">{formatLocalDate(receipt.receivedOn)}</Td>
                    <Td className="text-ink-soft">{receipt.locationName}</Td>
                    <Td>
                      <span className="flex flex-wrap gap-x-3">
                        {receipt.lines.map((line) => (
                          <Link key={line.lotNumber} to={`/inventory/lots/${line.lotNumber}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                            {line.lotNumber}
                          </Link>
                        ))}
                      </span>
                    </Td>
                    <Td numeric>{metres(receipt.lines.reduce((sum, line) => sum + BigInt(line.received), 0n).toString())}</Td>
                    <Td>{receipt.discrepancies > 0 ? <StatusChip tone="caution">{t('{count} off count', { count: receipt.discrepancies })}</StatusChip> : <StatusChip tone="positive">{t('As loaded')}</StatusChip>}</Td>
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

function PlaceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const create = useCreateStockLocation();
  const [form, setForm] = useState({ name: '', kind: 'physical' as StockLocationKind, zone: '', isDefault: false });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ name: form.name.trim(), kind: form.kind, zone: form.zone.trim() || undefined, isDefault: form.isDefault });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The place could not be added.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('New place')} description={t('A warehouse, a zone in one, or a virtual place that balances the ledger.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} placeholder={t('Showroom')} className="sm:col-span-2" />
        <SelectField label={t('Kind')} value={form.kind} onChange={set('kind')}>
          {STOCK_LOCATION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(STOCK_LOCATION_KIND_LABEL[kind])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Zone')} value={form.zone} onChange={set('zone')} placeholder="A1" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel={t('Saving')}>{t('Add place')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function ReorderDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const set_ = useSetReorderPolicy();
  const skus = useSkus();
  const [form, setForm] = useState({ skuCode: '', reorderPoint: '', targetLevel: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.skuCode) return setError(t('Choose the SKU.'));
    try {
      await set_.mutateAsync({ skuCode: form.skuCode, reorderPoint: parseFixed(form.reorderPoint, QUANTITY_DECIMALS).toString(), targetLevel: parseFixed(form.targetLevel, QUANTITY_DECIMALS).toString() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The reorder point could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Reorder point')} description={t('When the metres available across the warehouses fall below the point, the Gateway raises it; the target is what to order up to.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('SKU')} required value={form.skuCode} onChange={set('skuCode')} className="sm:col-span-2">
          <option value="">{t('Choose a SKU')}</option>
          {(skus.data ?? []).map((sku) => (
            <option key={sku.code} value={sku.code}>
              {sku.code} · {sku.productName}, {sku.shadeName}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Reorder point')} required unit="m" value={form.reorderPoint} onChange={set('reorderPoint')} placeholder="5000" inputMode="decimal" />
        <TextField label={t('Target level')} required unit="m" value={form.targetLevel} onChange={set('targetLevel')} placeholder="12000" inputMode="decimal" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={set_.isPending} busyLabel={t('Saving')}>{t('Save point')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Places() {
  const t = useT();
  const session = useRequiredSession();
  const locations = useStockLocations();
  const policies = useReorderPolicies();
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const manage = ['owner', 'operations', 'logistics'].includes(session.role);
  const buyer = ['owner', 'operations', 'purchasing'].includes(session.role);
  return (
    <>
      <ModuleTitle
        number="06"
        title={t('Inventory')}
        actions={
          <>
            {buyer && <Button onClick={() => setReordering(true)}>{t('Reorder point')}</Button>}
            {manage && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <Plus size={16} aria-hidden="true" />
                {t('New place')}
              </Button>
            )}
          </>
        }
      >
        {t('Where stock can be, and the point at which each SKU is reordered.')}
      </ModuleTitle>
      <InventoryTabs active="places" />
      <div className="grid gap-4 px-5 py-6 lg:grid-cols-2 lg:px-8">
        <Panel title={t('Places')} count={locations.data?.length} flush>
          <Ledger caption={t('Places')}>
            <thead>
              <tr>
                <Th>{t('Place')}</Th>
                <Th>{t('Kind')}</Th>
                <Th>{t('Zone')}</Th>
                <Th>{t('Where')}</Th>
              </tr>
            </thead>
            <tbody>
              {(locations.data ?? []).map((location) => (
                <Tr key={location.id}>
                  <Td className="font-medium">
                    {location.name}
                    {location.isDefault && <span className="code ms-2 text-ink-muted">{t('DEFAULT')}</span>}
                  </Td>
                  <Td className="text-ink-soft">{t(STOCK_LOCATION_KIND_LABEL[location.kind])}</Td>
                  <Td className="code text-ink-soft">{location.zone || '—'}</Td>
                  <Td className="text-ink-soft">{location.placeName || '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        </Panel>
        <Panel title={t('Reorder points')} count={policies.data?.length} flush>
          {(policies.data ?? []).length === 0 ? (
            <p className="px-5 py-6 text-ink-muted">{t('No reorder points yet. Set one per SKU; low stock then appears on the Gateway.')}</p>
          ) : (
            <Ledger caption={t('Reorder points')}>
              <thead>
                <tr>
                  <Th>{t('SKU')}</Th>
                  <Th>{t('Product')}</Th>
                  <Th numeric>{t('Reorder point')}</Th>
                  <Th numeric>{t('Target level')}</Th>
                </tr>
              </thead>
              <tbody>
                {(policies.data ?? []).map((policy) => (
                  <Tr key={policy.id}>
                    <Td className="code whitespace-nowrap">{policy.skuCode}</Td>
                    <Td className="whitespace-nowrap">
                      {policy.productName} <span className="text-ink-muted">{policy.shadeName}</span>
                    </Td>
                    <Td numeric>{metres(policy.reorderPoint)}</Td>
                    <Td numeric className="text-ink-soft">{metres(policy.targetLevel)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {manage && <PlaceDialog key={adding ? 'place-open' : 'place-closed'} open={adding} onClose={() => setAdding(false)} />}
      {buyer && <ReorderDialog key={reordering ? 'reorder-open' : 'reorder-closed'} open={reordering} onClose={() => setReordering(false)} />}
    </>
  );
}
