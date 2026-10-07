import { COMPANY_STATUSES, COMPANY_STATUS_LABEL, type CompanyDetail, type CompanyStatus } from '@basis/shared';
import { Button, Dialog, SelectField, TextArea, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useCountries, useUpdateCompany } from '../../data/parties';
import { useT } from '../../i18n';

export function EditCompanyDialog({ company, open, onClose }: { company: CompanyDetail; open: boolean; onClose: () => void }) {
  const t = useT();
  const countries = useCountries();
  const update = useUpdateCompany();
  const [form, setForm] = useState({
    legalName: company.legalName,
    tradingName: company.tradingName,
    countryCode: company.countryCode,
    website: company.website,
    status: company.status as string,
    notes: company.notes,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.legalName.trim()) return setError('The legal name is required.');
    const country = countries.data?.find((c) => c.code === form.countryCode);
    try {
      await update.mutateAsync({
        id: company.id,
        legalName: form.legalName.trim(),
        tradingName: form.tradingName.trim(),
        countryCode: form.countryCode,
        countryName: country?.name ?? '',
        website: form.website.trim(),
        status: form.status as CompanyStatus,
        notes: form.notes.trim(),
      });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The company could not be saved.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${company.name}`}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Legal name')} required value={form.legalName} onChange={set('legalName')} className="sm:col-span-2" />
        <TextField label={t('Trading name')} value={form.tradingName} onChange={set('tradingName')} />
        <SelectField label={t('Country')} value={form.countryCode} onChange={set('countryCode')}>
          <option value="">{t('Not set')}</option>
          {countries.data?.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </SelectField>
        <TextField label={t('Website')} type="url" value={form.website} onChange={set('website')} />
        <SelectField label={t('Status')} value={form.status} onChange={set('status')}>
          {COMPANY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(COMPANY_STATUS_LABEL[status])}
            </option>
          ))}
        </SelectField>
        <TextArea label={t('Notes')} value={form.notes} onChange={set('notes')} className="sm:col-span-2" />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 sm:col-span-2">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={update.isPending} busyLabel={t('Saving')}>{t('Save changes')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
