import { Panel, PanelEmpty } from '@basis/ui';
import { Link } from 'react-router';
import { useMailFor } from '../data/mail';
import { useLocale, useT } from '../i18n';
import { formatMailDate } from '../pages/mail/Mail';

// The mail about a record: the threads linked to it that the signed-in role
// may read, newest first. The same audience rule as the inbox applies.

export function MailPanel({ entityType, entityId }: { entityType: string; entityId: string }) {
  const t = useT();
  const { locale } = useLocale();
  const mail = useMailFor(entityType, entityId);
  const threads = mail.data ?? [];
  return (
    <Panel title={t('Mail')} count={threads.length} flush>
      {mail.isPending ? (
        <PanelEmpty>{t('Loading mail')}</PanelEmpty>
      ) : threads.length === 0 ? (
        <PanelEmpty>{t('No mail about this record yet. A message that names its number, or comes from its company, appears here by itself.')}</PanelEmpty>
      ) : (
        <ul className="divide-y divide-line">
          {threads.map((thread) => (
            <li key={thread.threadId}>
              <Link to={thread.latest ? `/mail/${thread.latest.id}` : '/mail'} className="block px-5 py-3 text-sm hover:bg-bone">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 truncate font-medium" dir="auto">{thread.subject || t('(no subject)')}</span>
                  <span className="code shrink-0 text-[0.8125rem] text-ink-muted">{formatMailDate(thread.lastAt, locale)}</span>
                </span>
                <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-muted" dir="auto">
                  {thread.latest ? `${thread.latest.direction === 'outbound' ? t('BASIS') : thread.latest.fromName || thread.latest.fromAddress}: ${thread.latest.snippet}` : ''}
                  {thread.messageCount > 1 && <span className="code ms-2">×{thread.messageCount}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
