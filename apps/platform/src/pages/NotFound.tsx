import { ArrowLeft } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { useT } from '../i18n';

export function NotFound({ what }: { what: string }) {
  const t = useT();
  return (
    <div className="max-w-2xl px-5 py-10 lg:px-8 lg:py-14">
      <h1 className="font-display text-[2.75rem] font-medium leading-none tracking-[-0.01em]">No such {what}</h1>
      <p className="mt-4 text-base text-ink-soft">{t('Nothing is recorded under this address. It may have been archived, or the link is wrong.')}</p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 font-medium underline decoration-line-strong underline-offset-4 hover:decoration-ink">
        <ArrowLeft size={16} aria-hidden="true" />{t('Back to the Gateway')}</Link>
    </div>
  );
}
