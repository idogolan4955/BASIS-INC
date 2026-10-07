import { CUSTOMER_TIERS, CUSTOMER_TIER_LABEL, CUSTOMER_TYPES, CUSTOMER_TYPE_LABEL, FULFILMENT_LABEL, FULFILMENT_TONE, ORDER_STATE_LABEL, ORDER_STATE_TONE, formatLocalDate, formatMoney, moneyFromStored, type CompanyDetail, type CustomerTier, type CustomerType } from '@basis/shared';
import { Button, Dialog, Ledger, Panel, SelectField, StatusChip, Td, TextArea, TextField, Th, Tr } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useCustomerOrders, useUpsertCustomerProfile } from '../../data/commercial';
import { useT } from '../../i18n';
import { NewOrderDialog, NewQuoteDialog } from '../orders/Orders';

// A customer's terms and its orders, on the company sheet.

const money = (stored: string, currency: string) => formatMoney(moneyFromStored(stored, currency));

function ProfileDialog({ company, current, open, onClose }: { company: CompanyDetail; current: { type: CustomerType | null; tier: CustomerTier; paymentTerms: string; currency: string; notes: string } | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useUpsertCustomerProfile();
  const [form, setForm] = useState({ type: current?.type ?? '', tier: current?.tier ?? ('standard' as CustomerTier), paymentTerms: current?.paymentTerms ?? '', currency: current?.currency ?? company.defaultCurrency ?? '', notes: current?.notes ?? '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ companyId: company.id, type: (form.type || null) as CustomerType | null, tier: form.tier, paymentTerms: form.paymentTerms.trim() || null, currency: form.currency.trim().toUpperCase() || null, notes: form.notes.trim() || null });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('The terms could not be saved.'));
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Customer terms')} description={t('What kind of customer, how they are treated, and the terms their quotes start from.')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <SelectField label={t('Type')} value={form.type} onChange={set('type')}>
          <option value="">{t('Not specified')}</option>
          {CUSTOMER_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(CUSTOMER_TYPE_LABEL[type])}
            </option>
          ))}
        </SelectField>
        <SelectField label={t('Tier')} value={form.tier} onChange={set('tier')}>
          {CUSTOMER_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {t(CUSTOMER_TIER_LABEL[tier])}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Payment terms')} value={form.paymentTerms} onChange={set('paymentTerms')} placeholder={t('30 days')} />
        <TextField label={t('Currency')} value={form.currency} onChange={set('currency')} placeholder="EUR" />
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} rows={3} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save terms')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CustomerOrders({ company, manage }: { company: CompanyDetail; manage: boolean }) {
  const t = useT();
  const customer = useCustomerOrders(company.id);
  const [editing, setEditing] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const orders = customer.data?.orders ?? [];
  const profile = customer.data?.profile ?? null;
  const revenue = orders.filter((order) => order.state !== 'cancelled' && order.state !== 'draft');
  const byCurrency = [...new Set(revenue.map((order) => order.currency))].map((currency) => ({ currency, total: revenue.filter((order) => order.currency === currency).reduce((sum, order) => sum + BigInt(order.total), 0n).toString() }));
  return (
    <div className="flex flex-col gap-4">
      <Panel title={t('Terms')} action={manage && <Button size="sm" onClick={() => setEditing(true)}>{profile ? t('Edit terms') : t('Set terms')}</Button>}>
        {profile ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="caps text-ink-muted">{t('Type')}</dt>
              <dd className="mt-1">{profile.type ? t(CUSTOMER_TYPE_LABEL[profile.type]) : '—'}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Tier')}</dt>
              <dd className="mt-1">{t(CUSTOMER_TIER_LABEL[profile.tier])}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Payment terms')}</dt>
              <dd className="mt-1">{profile.paymentTerms || '—'}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Currency')}</dt>
              <dd className="mt-1">{profile.currency || '—'}</dd>
            </div>
            {profile.notes && <p className="text-[0.8125rem] text-ink-soft sm:col-span-4">{profile.notes}</p>}
          </dl>
        ) : (
          <p className="text-ink-muted">{t('No terms set yet. Quotes start from the terms recorded here.')}</p>
        )}
      </Panel>
      <Panel
        title={t('Orders')}
        count={orders.length}
        flush
        action={
          manage && (
            <span className="flex gap-2">
              <Button size="sm" onClick={() => setQuoting(true)}>{t('New quote')}</Button>
              <Button size="sm" variant="primary" onClick={() => setOrdering(true)}>{t('New sales order')}</Button>
            </span>
          )
        }
      >
        {orders.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No orders yet.')}</p>
        ) : (
          <Ledger caption={t('Orders')}>
            <thead>
              <tr>
                <Th>{t('Order')}</Th>
                <Th>{t('Fabric')}</Th>
                <Th numeric>{t('Total')}</Th>
                <Th>{t('Requested')}</Th>
                <Th>{t('Fulfilment')}</Th>
                <Th>{t('State')}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Tr key={order.id}>
                  <Td>
                    <Link to={`/orders/${order.number}`} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {order.number}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">{order.products.join(', ')}</Td>
                  <Td numeric>{money(order.total, order.currency)}</Td>
                  <Td className="code whitespace-nowrap text-ink-soft">{order.requestedDelivery ? formatLocalDate(order.requestedDelivery) : '—'}</Td>
                  <Td>
                    <StatusChip tone={FULFILMENT_TONE[order.stage]}>{t(FULFILMENT_LABEL[order.stage])}</StatusChip>
                  </Td>
                  <Td>
                    <StatusChip tone={ORDER_STATE_TONE[order.state]}>{t(ORDER_STATE_LABEL[order.state])}</StatusChip>
                  </Td>
                </Tr>
              ))}
              <tr className="bg-bone">
                <Td className="font-medium" colSpan={2}>
                  {t('Ordered to date')}
                </Td>
                <Td numeric className="font-medium">
                  {byCurrency.map((entry) => money(entry.total, entry.currency)).join(' · ') || '—'}
                </Td>
                <Td colSpan={3} />
              </tr>
            </tbody>
          </Ledger>
        )}
      </Panel>
      {manage && <ProfileDialog key={editing ? 'terms-open' : 'terms-closed'} company={company} current={profile} open={editing} onClose={() => setEditing(false)} />}
      {manage && <NewQuoteDialog key={quoting ? 'quote-open' : 'quote-closed'} open={quoting} onClose={() => setQuoting(false)} customerId={company.id} />}
      {manage && <NewOrderDialog key={ordering ? 'order-open' : 'order-closed'} open={ordering} onClose={() => setOrdering(false)} customerId={company.id} />}
    </div>
  );
}
