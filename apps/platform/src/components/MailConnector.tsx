import type { MailConnectorSettings } from '@basis/shared';
import { Button, Panel, SelectField, StatusChip, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useConnectMailbox, useDisconnectMailbox, useMailStatus, useMailboxes, useSyncMailbox } from '../data/mail';
import { useSaveConnector } from '../data/settings';
import { useLocale, useT } from '../i18n';

// Settings › Connectors › Mail: the company mailbox, read-only through the
// Gmail API (docs/MAIL_PLAN.md §2). The OAuth client id is a setting; the
// client secret and the token are secrets the owner sets in the terminal.

const when = (iso: string | null, locale: string) => (iso ? new Date(iso).toLocaleString(locale === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export function MailConnector({ settings, canEdit }: { settings: MailConnectorSettings | null; canEdit: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const save = useSaveConnector();
  const status = useMailStatus(canEdit);
  const mailboxes = useMailboxes(canEdit);
  const connect = useConnectMailbox();
  const sync = useSyncMailbox();
  const disconnect = useDisconnectMailbox();
  const [form, setForm] = useState<MailConnectorSettings>({ clientId: settings?.clientId ?? '', address: settings?.address ?? 'basisinc25@gmail.com' });
  const [backfill, setBackfill] = useState<'0' | '30' | '90'>('30');
  const [message, setMessage] = useState<{ tone: 'positive' | 'critical'; text: string } | null>(null);
  const mailbox = (mailboxes.data ?? []).find((entry) => entry.provider === 'gmail');
  const connected = mailbox?.state === 'connected';
  const secrets = status.data?.secrets ?? [];
  const secretsReady = secrets.length > 0 && secrets.every((secret) => secret.present);
  const report = (text: string) => setMessage({ tone: 'positive', text });
  const fail = (failure: Error) => setMessage({ tone: 'critical', text: failure.message });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ key: 'mail', settings: { clientId: form.clientId.trim(), address: form.address.trim().toLowerCase() } });
  };
  return (
    <Panel title={t('Mail')} action={<StatusChip tone={connected && !mailbox?.lastError ? 'positive' : connected ? 'caution' : 'neutral'}>{connected ? (mailbox?.lastError ? t('Needs attention') : t('Connected')) : t('Not connected')}</StatusChip>}>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        {t('The company mailbox is read into module 19, read-only: the platform cannot send, delete or change mail in Gmail. Every message is sorted by its sender, the records it names and its thread, and only the roles its audience allows can read it.')}
      </p>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('Mailbox')} type="email" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} disabled={!canEdit} dir="ltr" />
        <TextField label={t('OAuth client id')} value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} disabled={!canEdit} placeholder="…apps.googleusercontent.com" help={t('From Google Cloud › APIs & Services › Credentials, a client of type Desktop app. Not a secret.')} dir="ltr" />
        {canEdit && (
          <div className="sm:col-span-2">
            <Button type="submit" variant="secondary" busy={save.isPending} busyLabel={t('Saving')}>{t('Save mail settings')}</Button>
          </div>
        )}
      </form>

      <div className="mt-6 grid gap-2 border-t border-line pt-4 text-sm">
        {status.data === null ? (
          <p className="text-ink-muted">{t('The mail functions are not deployed yet, so the secrets cannot be checked from here.')}</p>
        ) : (
          secrets.map((secret) => (
            <div key={secret.name} className="flex flex-wrap items-center gap-3">
              <span className="code">{secret.name}</span>
              <StatusChip tone={secret.present ? 'positive' : 'caution'}>{secret.present ? t('Set') : t('Not set')}</StatusChip>
            </div>
          ))
        )}
        {mailbox && (
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-[0.8125rem] sm:grid-cols-3">
            <div>
              <dt className="caps text-ink-muted">{t('Last sync')}</dt>
              <dd className="code">{when(mailbox.lastSyncAt, locale)}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('Gmail sends changes until')}</dt>
              <dd className="code">{when(mailbox.watchExpiresAt, locale)}</dd>
            </div>
            <div>
              <dt className="caps text-ink-muted">{t('State')}</dt>
              <dd>{t(mailbox.state === 'connected' ? 'Connected' : mailbox.state === 'paused' ? 'Paused' : 'Disconnected')}</dd>
            </div>
            {mailbox.lastError && (
              <div className="sm:col-span-3">
                <dt className="caps text-ink-muted">{t('Last error')}</dt>
                <dd className="text-critical">{mailbox.lastError}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {canEdit && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="caps mb-2 text-ink-muted">{t('Connecting, once')}</p>
          <ol className="mb-4 grid max-w-3xl list-decimal gap-1 ps-5 text-[0.8125rem] text-ink-soft">
            <li>{t('Google Cloud, project basis-inc: enable the Gmail API; consent screen External with the scope gmail.readonly, published In production; a Desktop app client. Put its id above.')}</li>
            <li>
              {t('In your terminal:')} <span className="code" dir="ltr">firebase functions:secrets:set GMAIL_CLIENT_SECRET</span>
            </li>
            <li>
              {t('Then:')} <span className="code" dir="ltr">pnpm mail:connect --client-id {form.clientId || '<id>'}</span> {t('and allow access in the browser, signed in as the mailbox. The token goes straight into a secret.')}
            </li>
            <li>{t('Deploy the functions, then connect here.')}</li>
          </ol>
          <div className="flex flex-wrap items-end gap-3">
            {!connected && (
              <SelectField label={t('Bring in earlier mail')} value={backfill} onChange={(event) => setBackfill(event.target.value as typeof backfill)} className="w-56">
                <option value="0">{t('None, from now on')}</option>
                <option value="30">{t('The last 30 days')}</option>
                <option value="90">{t('The last 90 days')}</option>
              </SelectField>
            )}
            {!connected && (
              <Button
                variant="primary"
                disabled={!secretsReady || !settings?.clientId}
                busy={connect.isPending}
                busyLabel={t('Connecting')}
                onClick={() => connect.mutate({ backfillDays: Number(backfill) as 0 | 30 | 90 }, { onSuccess: (result) => report(t('Connected. {count} messages brought in.', { count: (result as { stored: number }).stored })), onError: fail })}
              >
                {t('Connect')}
              </Button>
            )}
            {connected && (
              <Button busy={sync.isPending} busyLabel={t('Syncing')} onClick={() => sync.mutate({}, { onSuccess: (result) => report(t('{count} new messages.', { count: (result as { stored: number }).stored })), onError: fail })}>
                {t('Sync now')}
              </Button>
            )}
            {connected && (
              <Button variant="destructive" busy={disconnect.isPending} busyLabel={t('Disconnecting')} onClick={() => disconnect.mutate({}, { onSuccess: () => report(t('Disconnected. The mail already in the platform stays.')), onError: fail })}>
                {t('Disconnect')}
              </Button>
            )}
          </div>
          {message && (
            <p role={message.tone === 'critical' ? 'alert' : 'status'} className={message.tone === 'critical' ? 'mt-3 text-[0.8125rem] font-medium text-critical' : 'mt-3 text-[0.8125rem] text-positive'}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
