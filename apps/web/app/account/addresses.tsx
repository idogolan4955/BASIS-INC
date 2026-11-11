import { customerCan } from '@basis/shared';
import { useState, type FormEvent } from 'react';
import { call, read, useRead } from './data';
import { Button, Empty, Failed, Loading, PageTitle, portalMeta } from './frame';
import { Alert, Choice, Field } from './fields';
import { useT } from './i18n';
import { useMe } from './session';
import { IN_APP } from '../native/platform';
import { Group, GroupRow } from '../native/ui';

export const meta = () => portalMeta('Addresses');

interface Draft {
  id?: string;
  kind: 'ship' | 'bill';
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  isDefault: boolean;
}

const EMPTY: Draft = { kind: 'ship', name: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', countryCode: '', isDefault: false };

export default function Addresses() {
  const t = useT();
  const { me, role } = useMe();
  const admin = customerCan(role, 'manage_addresses');
  const loaded = useRead(async () => {
    const [addresses, countries] = await Promise.all([read((sdk, dc) => sdk.customerAddressesRef(dc)), read((sdk, dc) => sdk.customerCountriesRef(dc))]);
    return { addresses: addresses.customerAddresses, countries: countries.countries };
  }, [me.uid]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      await call('saveCustomerAddress', { ...(draft.id ? { id: draft.id } : {}), kind: draft.kind, name: draft.name, addressLine1: draft.addressLine1, addressLine2: draft.addressLine2 || undefined, city: draft.city, region: draft.region || undefined, postalCode: draft.postalCode || undefined, countryCode: draft.countryCode, isDefault: draft.isDefault });
      setDraft(null);
      loaded.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The address could not be saved.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError('');
    try {
      await call('removeCustomerAddress', { id });
      loaded.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The address could not be removed.'));
    }
  };

  // In the app an address opens the system's action sheet: edit it, or remove it.
  type Listed = NonNullable<typeof loaded.data>['addresses'][number];
  const manage = async (address: Listed) => {
    const { chooseAction } = await import('../native/bridge');
    const index = await chooseAction(address.location.name, [{ title: t('Edit') }, { title: t('Remove'), destructive: true }], t('Cancel'));
    if (index === 0) setDraft({ id: address.id, kind: address.kind === 'bill' ? 'bill' : 'ship', name: address.location.name, addressLine1: address.location.addressLine1 ?? '', addressLine2: address.location.addressLine2 ?? '', city: address.location.city ?? '', region: address.location.region ?? '', postalCode: address.location.postalCode ?? '', countryCode: address.location.country?.code ?? '', isDefault: address.isDefault });
    if (index === 1) await remove(address.id);
  };
  const groups = (['ship', 'bill'] as const).map((kind) => ({ kind, items: (loaded.data?.addresses ?? []).filter((address) => address.kind === kind) }));

  return (
    <div>
      <PageTitle title={t('Addresses')} action={admin && !draft ? <Button onClick={() => setDraft({ ...EMPTY })}>{t('Add an address')}</Button> : undefined}>
        {t('Where BASIS ships your goods and samples, and where invoices go.')}
      </PageTitle>
      {draft && (
        <form onSubmit={save} className={IN_APP ? 'mx-4 mb-8 grid gap-5' : 'mb-10 grid gap-5 border border-charcoal/70 bg-milk p-5 md:grid-cols-2'}>
          <Choice label={t('For')} name="kind" value={draft.kind} onChange={(value) => set({ kind: value as Draft['kind'] })}>
            <option value="ship">{t('Shipping')}</option>
            <option value="bill">{t('Invoices')}</option>
          </Choice>
          <Field label={t('Name of the place')} name="name" required value={draft.name} onChange={(value) => set({ name: value })} />
          <Field label={t('Address')} name="addressLine1" required autoComplete="address-line1" value={draft.addressLine1} onChange={(value) => set({ addressLine1: value })} />
          <Field label={t('Address, second line')} name="addressLine2" autoComplete="address-line2" value={draft.addressLine2} onChange={(value) => set({ addressLine2: value })} />
          <Field label={t('City')} name="city" required autoComplete="address-level2" value={draft.city} onChange={(value) => set({ city: value })} />
          <Field label={t('Postal code')} name="postalCode" autoComplete="postal-code" value={draft.postalCode} onChange={(value) => set({ postalCode: value })} dir="ltr" />
          <Field label={t('Region')} name="region" autoComplete="address-level1" value={draft.region} onChange={(value) => set({ region: value })} />
          <Choice label={t('Country')} name="countryCode" required value={draft.countryCode} onChange={(value) => set({ countryCode: value })}>
            <option value="">{t('Choose')}</option>
            {(loaded.data?.countries ?? []).map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Choice>
          <label className="flex items-center gap-3 md:col-span-2">
            <input type="checkbox" checked={draft.isDefault} onChange={(event) => set({ isDefault: event.target.checked })} className={IN_APP ? 'app-switch order-last ms-auto' : 'size-4 accent-charcoal'} />
            {t('Use this one unless I choose another')}
          </label>
          {error && (
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
          )}
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <Button type="submit" busy={busy}>
              {t('Save the address')}
            </Button>
            <Button variant="quiet" onClick={() => setDraft(null)}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      )}
      {!draft && error && (
        <div className={IN_APP ? 'mx-4 mb-6' : 'mb-6'}>
          <Alert>{IN_APP ? t(error) : error}</Alert>
        </div>
      )}
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : loaded.data!.addresses.length === 0 ? (
        <Empty>{admin ? t('No addresses yet. Add where you want goods and samples sent.') : t('No addresses yet. Your account admin adds them.')}</Empty>
      ) : IN_APP ? (
        groups.map((group) => (
          <Group key={group.kind} header={group.kind === 'ship' ? t('Shipping') : t('Invoices')}>
            {group.items.length === 0 ? (
              <GroupRow title={<span className="text-ink-muted">{t('None.')}</span>} />
            ) : (
              group.items.map((address) => (
                <GroupRow
                  key={address.id}
                  onClick={admin ? () => void manage(address) : undefined}
                  title={address.location.name}
                  subtitle={
                    <>
                      {/* Each line keeps its own direction (a Latin street inside a Hebrew screen) and the screen's alignment. */}
                      <span className="block">
                        <bdi>{[address.location.addressLine1, address.location.addressLine2].filter(Boolean).join(', ')}</bdi>
                      </span>
                      <bdi>{[address.location.postalCode, address.location.city, address.location.region, address.location.country?.name].filter(Boolean).join(', ')}</bdi>
                    </>
                  }
                  trailing={address.isDefault ? <span className="text-[15px] text-nude-deep">{t('Default')}</span> : undefined}
                  chevron={false}
                />
              ))
            )}
          </Group>
        ))
      ) : (
        <div className="grid gap-10 md:grid-cols-2">
          {groups.map((group) => (
            <section key={group.kind}>
              <p className="code mb-3 uppercase tracking-[0.14em] text-ink-muted">{group.kind === 'ship' ? t('Shipping') : t('Invoices')}</p>
              {group.items.length === 0 ? (
                <p className="border-t border-line py-4 text-sm text-ink-muted">{t('None.')}</p>
              ) : (
                <ul className="border-t border-charcoal/70">
                  {group.items.map((address) => (
                    <li key={address.id} className="border-b border-line py-4">
                      <p className="font-medium">
                        {address.location.name}
                        {address.isDefault && <span className="code ms-3 text-sm text-nude-deep uppercase tracking-[0.14em]">{t('Default')}</span>}
                      </p>
                      <p className="mt-1 text-ink-soft">{[address.location.addressLine1, address.location.addressLine2].filter(Boolean).join(', ')}</p>
                      <p className="text-ink-soft">{[address.location.postalCode, address.location.city, address.location.region, address.location.country?.name].filter(Boolean).join(', ')}</p>
                      {admin && (
                        <div className="mt-2 flex gap-4 text-sm">
                          <button type="button" className="underline underline-offset-4" onClick={() => setDraft({ id: address.id, kind: address.kind === 'bill' ? 'bill' : 'ship', name: address.location.name, addressLine1: address.location.addressLine1 ?? '', addressLine2: address.location.addressLine2 ?? '', city: address.location.city ?? '', region: address.location.region ?? '', postalCode: address.location.postalCode ?? '', countryCode: address.location.country?.code ?? '', isDefault: address.isDefault })}>
                            {t('Edit')}
                          </button>
                          <button type="button" className="text-ink-muted underline underline-offset-4" onClick={() => void remove(address.id)}>
                            {t('Remove')}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
