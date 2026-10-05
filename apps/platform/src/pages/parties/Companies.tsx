import {
  COMPANY_ROLE_KINDS,
  COMPANY_ROLE_LABEL,
  COMPANY_STATUS_LABEL,
  COMPANY_STATUS_TONE,
  canManageModule,
  type CompanyRoleKind,
  type CompanySummary,
} from '@basis/shared';
import { Button, CheckField, Dialog, EmptyState, Ledger, Panel, SelectField, StatusChip, Td, TextField, Th, Tr } from '@basis/ui';
import { Plus } from '@phosphor-icons/react';
import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useCompanies, useCountries, useCreateCompany } from '../../data/parties';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// One register of companies, seen through two doors: suppliers (and the
// partners that move their goods) and customers.

type Door = 'suppliers' | 'customers';

const DOOR: Record<Door, { number: string; title: string; summary: string; roles: readonly CompanyRoleKind[]; module: 'suppliers' | 'customers'; base: string }> = {
  suppliers: {
    number: '03',
    title: 'Suppliers',
    summary: 'Supplier companies, their factories, and the partners that move the goods.',
    roles: ['supplier', 'factory_operator', 'freight_forwarder', 'customs_broker', 'carrier', 'inspection_agency', 'warehouse_operator'],
    module: 'suppliers',
    base: '/suppliers',
  },
  customers: {
    number: '09',
    title: 'Customers',
    summary: 'Designers, salons, ateliers, manufacturers, distributors and wholesalers.',
    roles: ['customer'],
    module: 'customers',
    base: '/customers',
  },
};

function NewCompanyDialog({ open, onClose, door }: { open: boolean; onClose: () => void; door: Door }) {
  const countries = useCountries();
  const create = useCreateCompany();
  const [form, setForm] = useState({ legalName: '', tradingName: '', countryCode: '', website: '' });
  const [roles, setRoles] = useState<CompanyRoleKind[]>([door === 'customers' ? 'customer' : 'supplier']);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const toggle = (kind: CompanyRoleKind) => setRoles((current) => (current.includes(kind) ? current.filter((r) => r !== kind) : [...current, kind]));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.legalName.trim()) return setError('The legal name is required.');
    if (roles.length === 0) return setError('Choose at least one role.');
    const country = countries.data?.find((c) => c.code === form.countryCode);
    try {
      await create.mutateAsync({
        legalName: form.legalName.trim(),
        tradingName: form.tradingName.trim(),
        countryCode: form.countryCode,
        countryName: country?.name ?? '',
        website: form.website.trim(),
        roles,
      });
      setForm({ legalName: '', tradingName: '', countryCode: '', website: '' });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The company could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="New company" description="One record per organisation. What it is to BASIS is a role; a company can hold several.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label="Legal name" required value={form.legalName} onChange={set('legalName')} className="sm:col-span-2" />
        <TextField label="Trading name" value={form.tradingName} onChange={set('tradingName')} help="Shown in place of the legal name when set." />
        <SelectField label="Country" value={form.countryCode} onChange={set('countryCode')}>
          <option value="">Not set</option>
          {countries.data?.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </SelectField>
        <TextField label="Website" type="url" value={form.website} onChange={set('website')} placeholder="https://" className="sm:col-span-2" />
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-xs font-medium text-ink-soft">Roles</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMPANY_ROLE_KINDS.map((kind) => (
              <CheckField key={kind} label={COMPANY_ROLE_LABEL[kind]} checked={roles.includes(kind)} onChange={() => toggle(kind)} />
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={create.isPending} busyLabel="Saving">
            Create company
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function Companies({ door }: { door: Door }) {
  const session = useRequiredSession();
  const config = DOOR[door];
  const companies = useCompanies();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const manage = canManageModule(session.role, config.module);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return (companies.data ?? [])
      .filter((company) => company.roles.some((role) => config.roles.includes(role)))
      .filter((company) => !text || company.name.toLowerCase().includes(text) || company.legalName.toLowerCase().includes(text) || company.countryName.toLowerCase().includes(text));
  }, [companies.data, config.roles, query]);

  return (
    <>
      <ModuleTitle
        number={config.number}
        title={config.title}
        actions={
          manage && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={16} aria-hidden="true" />
              New company
            </Button>
          )
        }
      >
        {config.summary}
      </ModuleTitle>
      <div className="px-5 py-6 lg:px-8">
        <Panel title="Companies" count={rows.length} flush>
          <div className="border-b border-line px-5 py-4 sm:max-w-sm">
            <TextField label="Search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or country" />
          </div>
          {companies.isPending ? (
            <p className="px-5 py-8 text-ink-muted">Loading companies</p>
          ) : companies.error ? (
            <p className="px-5 py-8 text-critical">Companies could not be loaded. {companies.error.message}</p>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title={`No ${door} yet`} action={manage ? <Button variant="primary" onClick={() => setCreating(true)}>New company</Button> : undefined}>
                {door === 'suppliers'
                  ? 'Record the mills BASIS buys from and the forwarders and brokers that move the goods.'
                  : 'Customers arrive from leads and sample requests, or are recorded here directly.'}
              </EmptyState>
            </div>
          ) : (
            <Ledger caption={config.title}>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Country</Th>
                  <Th>Roles</Th>
                  <Th numeric>Contacts</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((company: CompanySummary) => (
                  <Tr key={company.id}>
                    <Td>
                      <Link to={`${config.base}/${company.id}`} className="font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                        {company.name}
                      </Link>
                      {company.tradingName && company.tradingName !== company.legalName && (
                        <span className="ml-3 text-ink-muted">{company.legalName}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-soft">{company.countryName || '—'}</Td>
                    <Td className="text-ink-soft">{company.roles.map((role) => COMPANY_ROLE_LABEL[role]).join(', ')}</Td>
                    <Td numeric>{company.contactCount}</Td>
                    <Td>
                      <StatusChip tone={COMPANY_STATUS_TONE[company.status]}>{COMPANY_STATUS_LABEL[company.status]}</StatusChip>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      <NewCompanyDialog open={creating} onClose={() => setCreating(false)} door={door} />
    </>
  );
}
