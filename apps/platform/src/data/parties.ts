import type { CompanyDetail, CompanyRoleKind, CompanySummary, ContactView, FactoryView } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isSample } from './source';

// Companies, contacts, locations and factories for the screens.

async function sample() {
  return (await import('./sample-catalog')).sampleCatalog;
}

async function live() {
  const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
  return { dc: dataConnect, sdk };
}

const capabilities = (value: unknown): FactoryView['capabilities'] => (Array.isArray(value) ? (value as FactoryView['capabilities']) : []);

export function useCompanies() {
  return useQuery({
    queryKey: ['parties', 'companies'],
    queryFn: async (): Promise<CompanySummary[]> => {
      if (isSample) return (await sample()).companies();
      const { dc, sdk } = await live();
      const { data } = await sdk.listCompanies(dc);
      return data.companies.map((c) => ({
        id: c.id,
        legalName: c.legalName,
        tradingName: c.tradingName ?? '',
        name: c.tradingName || c.legalName,
        countryCode: c.country?.code ?? '',
        countryName: c.country?.name ?? '',
        website: c.website ?? '',
        status: c.status,
        roles: c.companyRoles_on_company.map((role) => role.kind),
        contactCount: c.contacts_on_company.length,
      }));
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['parties', 'company', id],
    queryFn: async (): Promise<CompanyDetail | null> => {
      if (isSample) return (await sample()).company(id);
      const { dc, sdk } = await live();
      const { data } = await sdk.getCompany(dc, { id });
      const c = data.company;
      if (!c) return null;
      const profile = c.supplierProfiles_on_company[0];
      return {
        id: c.id,
        legalName: c.legalName,
        tradingName: c.tradingName ?? '',
        name: c.tradingName || c.legalName,
        countryCode: c.country?.code ?? '',
        countryName: c.country?.name ?? '',
        website: c.website ?? '',
        status: c.status,
        roles: c.companyRoles_on_company.map((role) => role.kind),
        contactCount: c.contacts_on_company.filter((contact) => contact.status === 'active').length,
        registrationId: c.registrationId ?? '',
        taxId: c.taxId ?? '',
        defaultCurrency: c.defaultCurrency?.code ?? '',
        notes: c.notes ?? '',
        supplierProfile: profile
          ? {
              paymentTerms: profile.paymentTerms ?? '',
              defaultIncoterm: profile.defaultIncoterm?.code ?? '',
              namedPlace: profile.namedPlace ?? '',
              standardLeadTimeDays: profile.standardLeadTimeDays ?? null,
              onboardingStatus: profile.onboardingStatus ?? '',
            }
          : null,
        contacts: c.contacts_on_company.map((contact) => ({
          id: contact.id,
          name: contact.name,
          title: contact.title ?? '',
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          messaging: contact.messaging ?? '',
          language: contact.language ?? '',
          isPrimary: contact.isPrimary,
          status: contact.status,
        })),
        locations: c.locations_on_company.map((location) => ({
          id: location.id,
          type: location.type,
          name: location.name,
          addressLine1: location.addressLine1 ?? '',
          city: location.city ?? '',
          region: location.region ?? '',
          postalCode: location.postalCode ?? '',
          countryCode: location.country?.code ?? '',
          countryName: location.country?.name ?? '',
          timeZone: location.timeZone ?? '',
          locationCode: location.locationCode ?? '',
        })),
        factories: c.factories_on_operator.map((factory) => ({
          id: factory.id,
          name: factory.location.name,
          city: factory.location.city ?? '',
          countryName: factory.location.country?.name ?? '',
          capabilities: capabilities(factory.capabilities),
          auditStatus: factory.auditStatus ?? '',
        })),
      };
    },
  });
}

export interface CountryOption {
  readonly code: string;
  readonly name: string;
}

export function useCountries() {
  return useQuery({
    queryKey: ['reference', 'countries'],
    staleTime: Infinity,
    queryFn: async (): Promise<CountryOption[]> => {
      if (isSample) {
        return [
          { code: 'CN', name: 'China' }, { code: 'DE', name: 'Germany' }, { code: 'ES', name: 'Spain' }, { code: 'FR', name: 'France' },
          { code: 'GB', name: 'United Kingdom' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' },
          { code: 'US', name: 'United States' },
        ];
      }
      const { dc, sdk } = await live();
      const { data } = await sdk.listCountries(dc);
      return data.countries.map((country) => ({ code: country.code, name: country.name }));
    },
  });
}

export interface NewCompanyInput {
  legalName: string;
  tradingName: string;
  countryCode: string;
  countryName: string;
  website: string;
  roles: CompanyRoleKind[];
}

export function useCreateCompany() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewCompanyInput): Promise<string> => {
      if (isSample) return (await sample()).createCompany(input);
      const { dc, sdk } = await live();
      const { data } = await sdk.insertCompany(dc, {
        legalName: input.legalName,
        tradingName: input.tradingName || null,
        countryCode: input.countryCode || null,
        website: input.website || null,
        status: sdk.CompanyStatus.prospect,
        notes: null,
      });
      const id = data.company_insert.id;
      for (const kind of input.roles) await sdk.addCompanyRole(dc, { companyId: id, kind: sdk.CompanyRoleKind[kind], since: null });
      return id;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['parties'] }),
  });
}

export type NewContactInput = Omit<ContactView, 'id' | 'status'>;

export function useAddContact(companyId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewContactInput): Promise<string> => {
      if (isSample) return (await sample()).addContact(companyId, input);
      const { dc, sdk } = await live();
      const { data } = await sdk.insertContact(dc, {
        companyId,
        name: input.name,
        title: input.title || null,
        email: input.email || null,
        phone: input.phone || null,
        messaging: input.messaging || null,
        language: input.language || null,
        isPrimary: input.isPrimary,
        notes: null,
      });
      return data.contact_insert.id;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['parties', 'company', companyId] }),
  });
}
