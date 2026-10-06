import { eventKindLabel, type TimelineEventView } from '@basis/shared';
import { useState, type FormEvent } from 'react';
import { Button } from './Button';
import { TextArea } from './Field';

// What happened to a record, newest first, and a place to add a note.

const when = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function describe(event: TimelineEventView): string {
  const payload = event.payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record['summary'] === 'string') return record['summary'];
  }
  return '';
}

export function Timeline({
  events,
  onAddNote,
  busy = false,
  canNote = true,
}: {
  events: readonly TimelineEventView[];
  onAddNote?: (note: string) => Promise<unknown>;
  busy?: boolean;
  canNote?: boolean;
}) {
  const [note, setNote] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = note.trim();
    if (!text || !onAddNote) return;
    await onAddNote(text);
    setNote('');
  };

  return (
    <div>
      {canNote && onAddNote && (
        <form onSubmit={submit} className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextArea label="Note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} className="flex-1" placeholder="What should the next person know?" />
          <Button type="submit" variant="primary" busy={busy} busyLabel="Saving" disabled={!note.trim()}>
            Add note
          </Button>
        </form>
      )}
      {events.length === 0 ? (
        <p className="text-ink-muted">Nothing recorded yet. Changes and notes appear here as they happen.</p>
      ) : (
        <ol className="relative border-l border-line pl-5">
          {events.map((event) => (
            <li key={event.id} className="relative pb-5 last:pb-0">
              <span aria-hidden="true" className="absolute -left-[1.4375rem] top-1.5 size-2.5 rounded-full border-2 border-panel bg-cocoa" />
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="font-medium">{eventKindLabel(event.kind)}</span>
                <span className="code text-ink-muted">{when.format(new Date(event.occurredAt))}</span>
                {event.actorName && <span className="text-[0.8125rem] text-ink-muted">{event.actorName}</span>}
              </p>
              {(event.note || describe(event)) && (
                <p className="mt-1 whitespace-pre-line text-[0.9rem] text-ink-soft">{event.note || describe(event)}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
