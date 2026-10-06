import { Button, Dialog, TextArea, TextField } from '@basis/ui';
import { useState, type FormEvent } from 'react';
import { useSendDocumentEmail } from '../data/settings';
import type { DocumentKind } from '../lib/documents';

// A generated document leaves by email through the email connector, with
// the message logged on the record.

export function EmailDialog({ kind, number, open, onClose, suggestedTo = '', subject: initialSubject }: { kind: DocumentKind; number: string; open: boolean; onClose: () => void; suggestedTo?: string; subject: string }) {
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
    <Dialog open={open} onClose={onClose} title="Send by email" description="The PDF goes as an attachment from the address set in Settings › Connectors; the message is kept on the record.">
      <form onSubmit={submit} className="grid gap-4">
        <TextField label="To" type="email" required value={form.to} onChange={set('to')} placeholder="orders@mill.example" />
        <TextField label="Subject" required value={form.subject} onChange={set('subject')} />
        <TextArea label="Message" value={form.message} onChange={set('message')} rows={4} placeholder="Please confirm receipt." />
        {error && (
          <p role="alert" className="text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" busy={send.isPending} busyLabel="Sending">
            Send
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
