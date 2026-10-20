import { NOTE_TEXT_MAX, PAPER_TONES, PAPER_TONE_LABEL, fastenerFor, freeSpot, nextZ, noteCheck, stacked, tiltFor, type BoardNoteView, type PaperTone } from '@basis/shared';
import { Button, cn } from '@basis/ui';
import { Plus, X } from '@phosphor-icons/react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useBoardNotes, useEditNote, useMoveNote, usePinNote, useTakeDownNote } from '../../data/boards';
import { useT } from '../../i18n';
import { ModuleTitle } from '../products/ProductsIndex';
import { useRequiredSession } from '../../session';

// The bulletin board: one shared surface where anyone pins a note anywhere,
// moves it, edits it in place and takes it down. No statuses, no sections,
// no sorting. The looseness is the feature.

export const NOTE_WIDTH = 224;
const DRAG_THRESHOLD = 4;
const LONG_PRESS_MS = 250;

export const PAPER_CLASS: Record<PaperTone, string> = {
  milk: 'bg-milk',
  bone: 'bg-bone',
  linen: 'bg-linen',
  sand: 'bg-sand',
  powder: 'bg-powder',
  'powder-deep': 'bg-powder-deep',
};

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** The paper itself: tone, tilt, fastener and shadow. Shared with the goals board. */
export function Paper({ id, tone, className, style, children, ref, ...rest }: { id: string; tone: PaperTone; className?: string; style?: React.CSSProperties; children: React.ReactNode; ref?: React.Ref<HTMLElement> } & Omit<React.HTMLAttributes<HTMLElement>, 'style'>) {
  const tilt = tiltFor(id);
  const fastener = fastenerFor(id);
  return (
    <article
      ref={ref}
      {...rest}
      style={{ ...style, transform: `rotate(${tilt}deg)` }}
      className={cn(
        'paper relative rounded-[2px] border border-charcoal/10 text-ink shadow-[0_14px_34px_-20px_rgb(43_39_36/0.55)] transition-[box-shadow,transform] duration-150 motion-reduce:transition-none',
        PAPER_CLASS[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[2px] bg-[linear-gradient(160deg,rgb(255_255_255/0.45),transparent_55%)]" />
      {fastener === 'pin' ? (
        <span aria-hidden="true" className="absolute start-1/2 top-2 size-3 -translate-x-1/2 rounded-full bg-nude-deep shadow-[inset_0_-1px_2px_rgb(23_19_16/0.4),0_1px_2px_rgb(23_19_16/0.3)] rtl:translate-x-1/2" />
      ) : (
        <span aria-hidden="true" style={{ transform: `translateX(-50%) rotate(${-tilt * 1.6}deg)` }} className="absolute start-1/2 -top-2 h-5 w-16 border border-line/70 bg-milk/55 backdrop-blur-[1px] rtl:translate-x-1/2" />
      )}
      {children}
    </article>
  );
}

interface Draft {
  id: string | null;
  text: string;
  x: number;
  y: number;
  color: PaperTone;
}

function Note({
  note,
  boardWidth,
  editing,
  onEdit,
  onCancel,
  onSave,
  onMove,
  onColor,
  onTakeDown,
  canTakeDown,
  stackedList,
}: {
  note: BoardNoteView;
  boardWidth: number;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (text: string) => void;
  onMove: (x: number, y: number) => void;
  onColor: (color: PaperTone) => void;
  onTakeDown: () => void;
  canTakeDown: boolean;
  stackedList: boolean;
}) {
  const t = useT();
  const [text, setText] = useState(note.text);
  const [confirming, setConfirming] = useState(false);
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  // The drag lives in a ref: pointer events can arrive before React renders the state they set.
  const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number; active: boolean; timer: number | null; suppressClickUntil: number; at: { x: number; y: number } | null }>({ pointerId: -1, startX: 0, startY: 0, originX: 0, originY: 0, active: false, timer: null, suppressClickUntil: 0, at: null });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const element = useRef<HTMLElement>(null);

  useEffect(() => setText(note.text), [note.text]);
  useLayoutEffect(() => {
    if (!editing || !textarea.current) return;
    textarea.current.focus();
    textarea.current.style.height = 'auto';
    textarea.current.style.height = `${textarea.current.scrollHeight}px`;
  }, [editing, text]);

  const pixelX = note.x * (boardWidth - NOTE_WIDTH);
  const left = dragging ? dragging.x : pixelX;
  const top = dragging ? dragging.y : note.y;

  // The drag follows the window, not the note: a pointer that cannot be
  // captured (synthetic, stale) still ends the drag wherever it is released.
  const begin = (event: PointerEvent<HTMLElement>) => {
    if (editing || stackedList || (event.target as HTMLElement).closest('[data-tool]')) return;
    const state = drag.current;
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.originX = pixelX;
    state.originY = note.y;
    state.at = null;
    state.active = event.pointerType === 'mouse';
    const rtl = document.documentElement.dir === 'rtl';
    const follow = (move: globalThis.PointerEvent) => {
      if (move.pointerId !== state.pointerId) return;
      const dx = move.clientX - state.startX;
      const dy = move.clientY - state.startY;
      if (!state.active) {
        if (state.timer !== null && Math.hypot(dx, dy) > DRAG_THRESHOLD) finish(move);
        return;
      }
      if (!state.at && Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      const x = Math.min(boardWidth - NOTE_WIDTH, Math.max(0, state.originX + (rtl ? -dx : dx)));
      const y = Math.max(0, state.originY + dy);
      state.at = { x, y };
      setDragging({ x, y });
    };
    const finish = (up: globalThis.PointerEvent) => {
      if (up.pointerId !== state.pointerId) return;
      window.removeEventListener('pointermove', follow);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (state.timer !== null) {
        window.clearTimeout(state.timer);
        state.timer = null;
      }
      state.pointerId = -1;
      state.active = false;
      if (state.at) {
        state.suppressClickUntil = Date.now() + 50;
        const width = Math.max(1, boardWidth - NOTE_WIDTH);
        onMove(Math.min(1, Math.max(0, state.at.x / width)), Math.round(state.at.y));
        state.at = null;
        setDragging(null);
      }
    };
    window.addEventListener('pointermove', follow);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    if (!state.active) {
      // Touch: a long press starts the drag; movement before that is a scroll.
      state.timer = window.setTimeout(() => {
        state.active = true;
        state.timer = null;
        setDragging({ x: pixelX, y: note.y });
      }, LONG_PRESS_MS);
    }
  };

  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (editing || stackedList || event.target !== event.currentTarget) return;
    const width = Math.max(1, boardWidth - NOTE_WIDTH);
    const step = 10 / width;
    if (event.key === 'Enter') {
      event.preventDefault();
      onEdit();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const rtl = document.documentElement.dir === 'rtl';
      const towardsEnd = (event.key === 'ArrowRight') !== rtl;
      onMove(Math.min(1, Math.max(0, note.x + (towardsEnd ? step : -step))), note.y);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      onMove(note.x, Math.max(0, note.y + (event.key === 'ArrowDown' ? 10 : -10)));
    }
  };

  const save = () => {
    if (!text.trim()) {
      onCancel();
      return;
    }
    onSave(text);
  };

  return (
    <Paper
      ref={element}
      id={note.id}
      tone={note.color}
      tabIndex={0}
      aria-label={`${t('Note by')} ${note.authorName}`}
      onPointerDown={begin}
      onKeyDown={keys}
      onClick={() => {
        if (Date.now() < drag.current.suppressClickUntil || editing) return;
        onEdit();
      }}
      style={stackedList ? undefined : { insetInlineStart: left, top, zIndex: 10 + note.z, width: NOTE_WIDTH }}
      className={cn('group flex flex-col px-4 pb-3 pt-6 [touch-action:pan-y]', stackedList ? 'w-full' : 'absolute cursor-grab select-none', dragging && 'cursor-grabbing shadow-[0_28px_50px_-24px_rgb(43_39_36/0.6)]', editing && 'cursor-text')}
    >
      {editing ? (
        <textarea
          ref={textarea}
          value={text}
          maxLength={NOTE_TEXT_MAX}
          onChange={(event) => setText(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setText(note.text);
              onCancel();
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              save();
            }
          }}
          aria-label={t('Note text')}
          className="min-h-20 w-full resize-none bg-transparent font-display text-[1.0625rem] leading-snug text-ink outline-none"
        />
      ) : (
        <p className="min-h-20 whitespace-pre-wrap break-words font-display text-[1.0625rem] leading-snug [&::first-line]:font-semibold">{note.text}</p>
      )}
      <footer className="mt-3 flex items-center gap-2 text-[0.75rem] text-ink-soft">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-charcoal/10 text-[0.625rem] font-semibold text-ink">{initialsOf(note.authorName)}</span>
        <span className="truncate">{note.authorName}</span>
        <span className="code ms-auto text-ink-muted" dir="ltr">{shortDate(note.updatedAt)}</span>
      </footer>
      <div data-tool className={cn('mt-2 flex items-center gap-1.5', stackedList ? '' : 'opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100')}>
        {PAPER_TONES.map((tone) => (
          <button
            key={tone}
            type="button"
            data-tool
            aria-label={t(PAPER_TONE_LABEL[tone])}
            aria-pressed={tone === note.color}
            onClick={(event) => {
              event.stopPropagation();
              onColor(tone);
            }}
            className={cn('size-4 rounded-full border border-charcoal/20', PAPER_CLASS[tone], tone === note.color && 'ring-2 ring-charcoal ring-offset-1')}
          />
        ))}
        {canTakeDown && !confirming && (
          <button type="button" data-tool aria-label={t('Take down')} onClick={(event) => { event.stopPropagation(); setConfirming(true); }} className="ms-auto grid size-6 place-items-center rounded-full text-ink-soft hover:bg-charcoal/10 hover:text-ink">
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {confirming && (
        <div data-tool className="mt-2 flex items-center justify-between gap-2 border-t border-charcoal/10 pt-2 text-[0.75rem]" onClick={(event) => event.stopPropagation()}>
          <span>{t('Take this note down?')}</span>
          <span className="flex gap-1">
            <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>{t('Keep')}</Button>
            <Button size="sm" variant="primary" onClick={onTakeDown}>{t('Take down')}</Button>
          </span>
        </div>
      )}
    </Paper>
  );
}

export function Board() {
  const t = useT();
  const session = useRequiredSession();
  const notes = useBoardNotes();
  const pin = usePinNote();
  const edit = useEditNote();
  const move = useMoveNote();
  const takeDown = useTakeDownNote();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(1000);
  const [narrow, setNarrow] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      setBoardWidth(board.current?.clientWidth ?? 1000);
      setNarrow(window.innerWidth < 700);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const rows = useMemo(() => notes.data ?? [], [notes.data]);
  const height = useMemo(() => Math.max(560, rows.reduce((top, note) => Math.max(top, note.y), 0) + 320), [rows]);
  const manager = session.role === 'owner';

  const fail = (failure: unknown) => setError(failure instanceof Error ? failure.message : 'The board could not be updated.');

  const startNew = (x: number, y: number) => {
    const problem = noteCheck({ x, y });
    if (problem) return setError(problem);
    setDraft({ id: `draft-${Date.now()}`, text: '', x, y, color: 'milk' });
    setEditingId(null);
    setError(null);
  };

  const newAtButton = () => {
    const spot = freeSpot(`${Date.now()}`);
    startNew(spot.x, spot.y);
  };

  const onBoardDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (narrow || event.target !== event.currentTarget || !board.current) return;
    const rect = board.current.getBoundingClientRect();
    const rtl = document.documentElement.dir === 'rtl';
    const offset = rtl ? rect.right - event.clientX : event.clientX - rect.left;
    const x = Math.min(1, Math.max(0, (offset - NOTE_WIDTH / 2) / Math.max(1, boardWidth - NOTE_WIDTH)));
    startNew(x, Math.max(0, event.clientY - rect.top - 24));
  };

  const draftNote: BoardNoteView | null = draft ? { id: draft.id!, text: draft.text, color: draft.color, x: draft.x, y: draft.y, z: nextZ(rows), authorUid: session.uid, authorName: session.name, editedByName: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : null;
  const list = narrow ? stacked(rows) : rows;

  return (
    <>
      <ModuleTitle
        number="16"
        title={t('Board')}
        actions={
          <Button variant="primary" onClick={newAtButton}>
            <Plus size={16} aria-hidden="true" />{t('New note')}</Button>
        }
      >{t('The team\'s bulletin board. Pin a note anywhere, move it, edit it in place, take it down. Double-click the board to start one where you are.')}</ModuleTitle>
      <div className="px-5 py-6 lg:px-8">
        {error && (
          <p role="alert" className="mb-4 text-[0.8125rem] font-medium text-critical">
            {error}
          </p>
        )}
        {notes.isPending ? (
          <p className="text-ink-muted">{t('Loading the board')}</p>
        ) : (
          <div
            ref={board}
            onDoubleClick={onBoardDoubleClick}
            style={narrow ? undefined : { minHeight: height }}
            className={cn(
              'relative rounded-[6px] border border-dashed border-line-strong bg-[radial-gradient(var(--color-line-strong)_0.8px,transparent_0.8px)] [background-size:22px_22px]',
              narrow ? 'flex flex-col gap-5 p-4' : 'min-h-[70vh]',
            )}
          >
            {rows.length === 0 && !draft && (
              <Paper id="empty" tone="milk" className={cn('px-5 pb-4 pt-7', narrow ? 'w-full' : 'absolute start-1/2 top-24 w-[224px] -translate-x-1/2 rtl:translate-x-1/2')}>
                <p className="font-display text-[1.0625rem] leading-snug [&::first-line]:font-semibold">{t('Nothing pinned yet.')}{'\n'}{t('Double-click the board, or press New note.')}</p>
              </Paper>
            )}
            {list.map((note) => (
              <Note
                key={note.id}
                note={note}
                boardWidth={boardWidth}
                editing={editingId === note.id}
                stackedList={narrow}
                onEdit={() => setEditingId(note.id)}
                onCancel={() => setEditingId(null)}
                onSave={(text) => {
                  const problem = noteCheck({ text });
                  if (problem) return setError(problem);
                  setEditingId(null);
                  edit.mutateAsync({ id: note.id, text, color: note.color }).catch(fail);
                }}
                onMove={(x, y) => move.mutateAsync({ id: note.id, x, y, z: nextZ(rows) }).catch(fail)}
                onColor={(color) => edit.mutateAsync({ id: note.id, text: note.text, color }).catch(fail)}
                onTakeDown={() => takeDown.mutateAsync({ id: note.id, own: note.authorUid === session.uid }).catch(fail)}
                canTakeDown={manager || note.authorUid === session.uid}
              />
            ))}
            {draftNote && (
              <Note
                key={draftNote.id}
                note={draftNote}
                boardWidth={boardWidth}
                editing
                stackedList={narrow}
                onEdit={() => undefined}
                onCancel={() => setDraft(null)}
                onSave={(text) => {
                  const problem = noteCheck({ text, x: draftNote.x, y: draftNote.y, color: draftNote.color }, rows.length);
                  if (problem) return setError(problem);
                  setDraft(null);
                  pin.mutateAsync({ text, color: draftNote.color, x: draftNote.x, y: draftNote.y, z: draftNote.z }).catch(fail);
                }}
                onMove={() => undefined}
                onColor={(color) => setDraft((current) => (current ? { ...current, color } : current))}
                onTakeDown={() => setDraft(null)}
                canTakeDown
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
