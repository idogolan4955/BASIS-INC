import { customerCan } from '@basis/shared';
import { Check } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { products, shades } from '../site/catalog';
import { Hand, Index, ShadeCircle } from '../site/ui';
import { call, read, useRead } from './data';
import { Button, Chip, Empty, Failed, Loading, PageTitle, portalMeta } from './frame';
import { Alert, Area, Choice } from './fields';
import { date } from './format';
import { useLocale, useT } from './i18n';
import { SAMPLE_STATE } from './labels';
import { useMe } from './session';
import { IN_APP } from '../native/platform';
import { Group, GroupRow } from '../native/ui';

export const meta = () => portalMeta('Samples');

export default function Samples() {
  const t = useT();
  const { locale } = useLocale();
  const { me, role } = useMe();
  const may = customerCan(role, 'request_samples');
  const loaded = useRead(async () => {
    const [requests, addresses] = await Promise.all([read((sdk, dc) => sdk.customerSampleRequestsRef(dc)), read((sdk, dc) => sdk.customerAddressesRef(dc))]);
    return { requests: requests.inquiries, addresses: addresses.customerAddresses.filter((address) => address.kind === 'ship') };
  }, [me.uid]);
  const [picked, setPicked] = useState<{ products: string[]; shades: string[] }>({ products: [], shades: [] });
  const [message, setMessage] = useState('');
  const [addressId, setAddressId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const toggle = (list: 'products' | 'shades', code: string) => setPicked((current) => ({ ...current, [list]: current[list].includes(code) ? current[list].filter((item) => item !== code) : [...current[list], code] }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const defaultAddress = loaded.data?.addresses.find((address) => address.isDefault)?.id ?? '';
      const chosen = addressId || defaultAddress;
      const { reference } = await call<object, { reference: string }>('requestCustomerSamples', { products: picked.products, shades: picked.shades, ...(message.trim() ? { message: message.trim() } : {}), ...(chosen ? { addressId: chosen } : {}) });
      setSent(reference);
      setPicked({ products: [], shades: [] });
      setMessage('');
      loaded.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('The request could not be sent.'));
    } finally {
      setBusy(false);
    }
  };

  if (IN_APP) {
    const tick = (on: boolean) => (on ? <Check aria-hidden="true" size={20} weight="bold" className="text-nude-deep" /> : undefined);
    return (
      <div>
        <PageTitle title={t('Samples')}>{t('Swatches of any fabric in any shade, labelled with product and shade codes, with their technical sheets.')}</PageTitle>
        {sent && (
          <Group>
            <GroupRow title={t('Received as')} trailing={<span className="code text-ink" dir="ltr">{sent}</span>} subtitle={t('BASIS will confirm when they leave.')} />
          </Group>
        )}
        {loaded.loading && !loaded.data ? (
          <Loading />
        ) : loaded.error ? (
          <Failed message={loaded.error} onRetry={loaded.reload} />
        ) : (
          <>
            {may ? (
              <form onSubmit={submit}>
                <Group header={t('Fabrics')}>
                  {products.map((product) => {
                    const on = picked.products.includes(product.code);
                    return <GroupRow key={product.code} onClick={() => toggle('products', product.code)} title={<span role="checkbox" aria-checked={on}>{product.name}</span>} trailing={tick(on)} chevron={false} />;
                  })}
                </Group>
                <Group header={t('Shades')}>
                  {shades.map((shade) => {
                    const on = picked.shades.includes(shade.code);
                    return <GroupRow key={shade.code} onClick={() => toggle('shades', shade.code)} leading={<ShadeCircle shade={shade} size="sm" />} title={<span role="checkbox" aria-checked={on}>{shade.name}</span>} subtitle={<span className="code" dir="ltr">{shade.code}</span>} trailing={tick(on)} chevron={false} />;
                  })}
                </Group>
                <div className="mx-4 mb-7 grid gap-5">
                  {loaded.data!.addresses.length > 0 ? (
                    <Choice label={t('Send to')} name="address" value={addressId || loaded.data!.addresses.find((address) => address.isDefault)?.id || ''} onChange={setAddressId}>
                      {loaded.data!.addresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {[address.location.name, address.location.city, address.location.country?.name].filter(Boolean).join(', ')}
                        </option>
                      ))}
                    </Choice>
                  ) : (
                    <p className="px-1 text-[13px] text-ink-muted">{t('No shipping address on the account yet: write it in the note, or ask your admin to add one under Addresses.')}</p>
                  )}
                  <Area label={t('Note')} name="message" rows={3} value={message} onChange={setMessage} />
                  {error && <Alert>{t(error)}</Alert>}
                  <Button type="submit" busy={busy} disabled={picked.products.length === 0 && picked.shades.length === 0 && !message.trim()}>
                    {busy ? t('Sending') : t('Request samples')}
                  </Button>
                </div>
              </form>
            ) : (
              <Group>
                <GroupRow title={t('A buyer or an admin of your account asks for samples.')} />
              </Group>
            )}
            <Group header={t('Your requests')}>
              {loaded.data!.requests.length === 0 ? (
                <GroupRow title={<span className="text-ink-muted">{t('None yet.')}</span>} />
              ) : (
                loaded.data!.requests.map((request) => {
                  const state = SAMPLE_STATE[request.state] ?? { label: request.state, tone: 'neutral' as const };
                  const details = (request.details ?? {}) as { products?: string[]; shades?: string[] };
                  return (
                    <GroupRow
                      key={request.reference}
                      title={<span className="code" dir="ltr">{request.reference}</span>}
                      subtitle={
                        <>
                          {date(request.createdAt, locale)} · <span dir="ltr">{[...(details.products ?? []), ...(details.shades ?? [])].join(', ') || '—'}</span>
                        </>
                      }
                      trailing={<Chip tone={state.tone}>{t(state.label)}</Chip>}
                    />
                  );
                })
              )}
            </Group>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageTitle title={t('Samples')}>{t('Swatches of any fabric in any shade, labelled with product and shade codes, with their technical sheets.')}</PageTitle>
      {sent && (
        <p role="status" className="mb-8 border-s-[3px] border-nude-deep bg-milk px-4 py-3">
          {t('Received as')}{' '}
          <span className="code" dir="ltr">
            {sent}
          </span>
          . {t('BASIS will confirm when they leave.')}
        </p>
      )}
      {loaded.loading && !loaded.data ? (
        <Loading />
      ) : loaded.error ? (
        <Failed message={loaded.error} onRetry={loaded.reload} />
      ) : (
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_22rem]">
          {may ? (
            <form onSubmit={submit} className="grid gap-6">
              <fieldset>
                <legend className="code mb-2 uppercase tracking-[0.14em] text-ink-muted">{t('Fabrics')}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products.map((product) => (
                    <label key={product.code} className="flex cursor-pointer items-center gap-3 border border-line bg-milk px-3 py-2.5 has-checked:border-charcoal">
                      <input type="checkbox" checked={picked.products.includes(product.code)} onChange={() => toggle('products', product.code)} className="size-4 accent-charcoal" />
                      <Index>{String(product.index).padStart(2, '0')}</Index>
                      <Hand className="text-lg">{product.name}</Hand>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="code mb-2 uppercase tracking-[0.14em] text-ink-muted">{t('Shades')}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {shades.map((shade) => (
                    <label key={shade.code} className="flex cursor-pointer items-center gap-3 border border-line bg-milk px-3 py-2.5 text-sm has-checked:border-charcoal">
                      <input type="checkbox" checked={picked.shades.includes(shade.code)} onChange={() => toggle('shades', shade.code)} className="size-4 accent-charcoal" />
                      <ShadeCircle shade={shade} size="sm" />
                      {shade.name}
                      <span className="code text-ink-muted" dir="ltr">
                        {shade.code}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {loaded.data!.addresses.length > 0 ? (
                <Choice label={t('Send to')} name="address" value={addressId || loaded.data!.addresses.find((address) => address.isDefault)?.id || ''} onChange={setAddressId}>
                  {loaded.data!.addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {[address.location.name, address.location.city, address.location.country?.name].filter(Boolean).join(', ')}
                    </option>
                  ))}
                </Choice>
              ) : (
                <p className="text-sm text-ink-soft">{t('No shipping address on the account yet: write it in the note, or ask your admin to add one under Addresses.')}</p>
              )}
              <Area label={t('Note')} name="message" rows={3} value={message} onChange={setMessage} />
              {error && <Alert>{error}</Alert>}
              <div>
                <Button type="submit" busy={busy} disabled={picked.products.length === 0 && picked.shades.length === 0 && !message.trim()}>
                  {busy ? t('Sending') : t('Request samples')}
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-ink-soft">{t('A buyer or an admin of your account asks for samples.')}</p>
          )}
          <aside>
            <p className="code mb-3 uppercase tracking-[0.14em] text-ink-muted">{t('Your requests')}</p>
            {loaded.data!.requests.length === 0 ? (
              <Empty>{t('None yet.')}</Empty>
            ) : (
              <ul className="border-t border-charcoal/70">
                {loaded.data!.requests.map((request) => {
                  const state = SAMPLE_STATE[request.state] ?? { label: request.state, tone: 'neutral' as const };
                  const details = (request.details ?? {}) as { products?: string[]; shades?: string[] };
                  return (
                    <li key={request.reference} className="border-b border-line py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="code" dir="ltr">
                          {request.reference}
                        </span>
                        <Chip tone={state.tone}>{t(state.label)}</Chip>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        {date(request.createdAt, locale)} · <span dir="ltr">{[...(details.products ?? []), ...(details.shades ?? [])].join(', ') || '—'}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
