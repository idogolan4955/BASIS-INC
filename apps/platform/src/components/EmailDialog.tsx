import { Button, Dialog, TextArea, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useSendDocumentEmail } from '../data/settings';
import type { DocumentKind } from '../lib/documents';
import { useT } from '../i18n';

// A generated document leaves by email through the email connector, with
// the message logged on the record.

export function EmailDialog({ kind, number, open, onClose, suggestedTo = '', subject: initialSubject }: { kind: DocumentKind; number: string; open: boolean; onClose: () => void; suggestedTo?: string; subject: string }) {
  const t = useT();
  const send = useSendDocumentEmail();
  const [form, setForm] = useState({ to: suggestedTo, subject: initialSubject, message: '' });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await send.mutateAsync({ kind, number, to: form.to.trim(), subject: form.subject.trim(), message: form.message.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The message could not be sent.');
    }
  };
  return (
    <Dialog open={open} onClose={onClose} title={t('Send by email')} description={t('The PDF goes as an attachment from the address set in Settings › Connectors; the message is kept on the record.')}>
      <form onSubmit={submit} className="grid gap-4">
        <TextField label={t('To')} type="email" required value={form.to} onChange={set('to')} placeholder={t('orders@mill.example')} />
        <TextField label={t('Subject')} required value={form.subject} onChange={set('subject')} />
        <TextArea label={t('Message')} value={form.message} onChange={set('message')} rows={4} placeholder={t('Please confirm receipt.')} />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>{t('Cancel')}</Button>
          <Button type="submit" variant="primary" busy={send.isPending} busyLabel={t('Sending')}>{t('Send')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
