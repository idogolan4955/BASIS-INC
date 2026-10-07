import {
  COMPANY_ROLE_LABEL,
  COMPANY_STATUS_LABEL,
  COMPANY_STATUS_TONE,
  LOCATION_TYPE_LABEL,
  canManageModule,
  type CompanyDetail,
} from '@basis/shared';
import { Button, CheckField, Dialog, LabelHeader, Ledger, Panel, SheetTabs, StatusChip, Td, TextField, Th, Timeline, Tr, sheetTabClass } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useState, type FormEvent } from 'react';
import { NavLink, useParams } from 'react-router';
import { useAddContact, useCompany } from '../../data/parties';
import { useRecordNote, useTimeline } from '../../data/timeline';
import { EditCompanyDialog } from './EditCompanyDialog';
import { useRequiredSession } from '../../session';
import { NotFound } from '../NotFound';
import { useT } from '../../i18n';

function NewContactDialog({ companyId, open, onClose }: { companyId: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const add = useAddContact(companyId);
  const [form, setForm] = useState({ name: '', title: '', email: '', phone: '', messaging: '', language: '', isPrimary: false });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('The contact needs a name.');
    try {
      await add.mutateAsync({ ...form, name: form.name.trim() });
      setForm({ name: '', title: '', email: '', phone: '', messaging: '', language: '', isPrimary: false });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The contact could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('New contact')}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Name')} required value={form.name} onChange={set('name')} className="sm:col-span-2" />
        <TextField label={t('Title')} value={form.title} onChange={set('title')} />
        <TextField label={t('Language')} value={form.language} onChange={set('language')} placeholder={t('en, zh, fr')} />
        <TextField label={t('Email')} type="email" value={form.email} onChange={set('email')} />
        <TextField label={t('Phone')} type="tel" value={form.phone} onChange={set('phone')} />
        <TextField label={t('Messaging')} value={form.messaging} onChange={set('messaging')} placeholder={t('WeChat, WhatsApp')} className="sm:col-span-2" />
        <CheckField label={t('Primary contact')} checked={form.isPrimary} onChange={(event) => setForm((f) => ({ ...f, isPrimary: event.target.checked }))} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={add.isPending} busyLabel={t('Saving')}>{t('Add contact')}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function CompanyTimeline({ id }: { id: string }) {
  const t = useT();
  const timeline = useTimeline('company', id);
  const note = useRecordNote('company', id);
  return (
    <Panel title={t('Timeline')} count={timeline.data?.length} className="xl:col-span-12">
      <Timeline events={timeline.data ?? []} onAddNote={(text) => note.mutateAsync(text)} busy={note.isPending} />
    </Panel>
  );
}

function Overview({ company }: { company: CompanyDetail }) {
  const t = useT();
  const profile = company.supplierProfile;
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={t('Company')} className="xl:col-span-7">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {[
            ['Legal name', company.legalName],
            ['Trading name', company.tradingName],
            ['Country', company.countryName],
            ['Website', company.website],
            ['Registration', company.registrationId],
            ['Tax id', company.taxId],
            ['Default currency', company.defaultCurrency],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="caps text-ink-muted">{label}</dt>
              <dd className="mt-1 text-sm">{value || <span className="text-ink-muted">{t('Not recorded')}</span>}</dd>
            </div>
          ))}
        </dl>
        {company.notes && <p className="mt-6 whitespace-pre-line border-t border-line pt-4 text-sm text-ink-soft">{company.notes}</p>}
      </Panel>
      <Panel title={t('Supplier terms')} className="xl:col-span-5">
        {profile ? (
          <dl className="grid gap-4">
            {[
              ['Payment terms', profile.paymentTerms],
              ['Incoterm', [profile.defaultIncoterm, profile.namedPlace].filter(Boolean).join(' ')],
              ['Standard lead time', profile.standardLeadTimeDays === null ? '' : `${profile.standardLeadTimeDays} days`],
              ['Onboarding', profile.onboardingStatus],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="caps text-ink-muted">{label}</dt>
                <dd className="mt-1 text-sm">{value || <span className="text-ink-muted">{t('Not recorded')}</span>}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-ink-muted">
            {company.roles.includes('supplier') ? 'No supplier terms recorded yet.' : 'This company is not a supplier.'}
          </p>
        )}
      </Panel>
      <CompanyTimeline id={company.id} />
    </div>
  );
}

function Contacts({ company, manage }: { company: CompanyDetail; manage: boolean }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Panel
        title={t('Contacts')}
        count={company.contacts.length}
        flush
        action={
          manage && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden="true" />{t('New contact')}</Button>
          )
        }
      >
        {company.contacts.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No contacts recorded.')}</p>
        ) : (
          <Ledger caption={`Contacts at ${company.name}`}>
            <thead>
              <tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Title')}</Th>
                <Th>{t('Email')}</Th>
                <Th>{t('Phone')}</Th>
                <Th>{t('Messaging')}</Th>
                <Th>{t('Language')}</Th>
              </tr>
            </thead>
            <tbody>
              {company.contacts.map((contact) => (
                <Tr key={contact.id}>
                  <Td className="font-medium">
                    {contact.name}
                    {contact.isPrimary && <span className="code ms-2 text-ink-muted">{t('PRIMARY')}</span>}
                  </Td>
                  <Td className="text-ink-soft">{contact.title || '—'}</Td>
                  <Td>{contact.email ? <a href={`mailto:${contact.email}`} className="underline decoration-line-strong underline-offset-4">{contact.email}</a> : '—'}</Td>
                  <Td className="code">{contact.phone || '—'}</Td>
                  <Td className="text-ink-soft">{contact.messaging || '—'}</Td>
                  <Td className="code uppercase">{contact.language || '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>
      <NewContactDialog companyId={company.id} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function Places({ company }: { company: CompanyDetail }) {
  const t = useT();
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <Panel title={t('Factories')} count={company.factories.length} className="xl:col-span-5">
        {company.factories.length === 0 ? (
          <p className="text-ink-muted">{t('No factories recorded.')}</p>
        ) : (
          <ul className="divide-y divide-line">
            {company.factories.map((factory) => (
              <li key={factory.id} className="py-3 first:pt-0 last:pb-0">
                <p className="font-medium">{factory.name}</p>
                <p className="text-[0.8125rem] text-ink-muted">{[factory.city, factory.countryName].filter(Boolean).join(', ')}</p>
                <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
                  {factory.capabilities.map((capability) => `${capability.familyCode}: ${capability.processes.join(', ')}`).join(' · ') || 'Capabilities not recorded'}
                </p>
                {factory.auditStatus && <p className="code mt-1 text-ink-muted">{factory.auditStatus}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title={t('Locations')} count={company.locations.length} className="xl:col-span-7" flush>
        {company.locations.length === 0 ? (
          <p className="px-5 py-6 text-ink-muted">{t('No locations recorded.')}</p>
        ) : (
          <Ledger caption={`Locations of ${company.name}`}>
            <thead>
              <tr>
                <Th>{t('Name')}</Th>
                <Th>{t('Type')}</Th>
                <Th>{t('City')}</Th>
                <Th>{t('Country')}</Th>
                <Th>{t('Code')}</Th>
                <Th>{t('Time zone')}</Th>
              </tr>
            </thead>
            <tbody>
              {company.locations.map((location) => (
                <Tr key={location.id}>
                  <Td className="font-medium">{location.name}</Td>
                  <Td className="text-ink-soft">{t(LOCATION_TYPE_LABEL[location.type])}</Td>
                  <Td>{[location.city, location.region].filter(Boolean).join(', ') || '—'}</Td>
                  <Td className="text-ink-soft">{location.countryName || '—'}</Td>
                  <Td className="code">{location.locationCode || '—'}</Td>
                  <Td className="code text-ink-muted">{location.timeZone || '—'}</Td>
                </Tr>
              ))}
            </tbody>
          </Ledger>
        )}
      </Panel>
    </div>
  );
}

export function CompanySheet({ tab, base }: { tab: 'overview' | 'contacts' | 'places'; base: '/suppliers' | '/customers' }) {
  const t = useT();
  const session = useRequiredSession();
  const { id = '' } = useParams();
  const company = useCompany(id);
  const manage = canManageModule(session.role, base === '/suppliers' ? 'suppliers' : 'customers');
  const [editing, setEditing] = useState(false);

  if (company.isPending) return <p className="px-5 py-10 text-ink-muted lg:px-8">{t('Loading company')}</p>;
  if (company.error) return <p className="px-5 py-10 text-critical lg:px-8">The company could not be loaded. {company.error.message}</p>;
  if (!company.data) return <NotFound what={t('company')} />;
  const data = company.data;
  const path = `${base}/${data.id}`;

  return (
    <>
      <LabelHeader
        code={data.countryCode ? `${data.countryCode} · ${data.roles.map((role) => COMPANY_ROLE_LABEL[role]).join(', ')}` : data.roles.map((role) => COMPANY_ROLE_LABEL[role]).join(', ')}
        title={data.name}
        subtitle={data.tradingName && data.tradingName !== data.legalName ? data.legalName : undefined}
        status={<StatusChip tone={COMPANY_STATUS_TONE[data.status]}>{t(COMPANY_STATUS_LABEL[data.status])}</StatusChip>}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setEditing(true)}>{t('Edit')}</Button>
          )
        }
        facts={[
          { label: t('Country'), value: data.countryName || '—' },
          { label: t('Contacts'), value: data.contactCount },
          { label: t('Factories'), value: data.factories.length },
          { label: t('Locations'), value: data.locations.length },
          { label: t('Currency'), value: data.defaultCurrency || '—' },
          { label: t('Website'), value: data.website ? <a href={data.website} className="underline decoration-line-strong underline-offset-4" target="_blank" rel="noreferrer">{data.website.replace(/^https?:\/\//, '')}</a> : '—' },
        ]}
      />
      <SheetTabs>
        <NavLink to={path} end className={({ isActive }) => sheetTabClass(isActive)}>{t('Overview')}</NavLink>
        <NavLink to={`${path}/contacts`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Contacts')}</NavLink>
        <NavLink to={`${path}/places`} className={({ isActive }) => sheetTabClass(isActive)}>{t('Factories and locations')}</NavLink>
      </SheetTabs>
      <div className="px-5 py-6 lg:px-8">
        {tab === 'overview' && <Overview company={data} />}
        {tab === 'contacts' && <Contacts company={data} manage={manage} />}
        {tab === 'places' && <Places company={data} />}
      </div>
      {manage && <EditCompanyDialog key={`${data.id}-${editing}`} company={data} open={editing} onClose={() => setEditing(false)} />}
    </>
  );
}
