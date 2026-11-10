import { assistantItems, type AssistantActionState, type AssistantActionView, type AssistantItem, type AssistantProgress, type AssistantThreadView, type StatusTone } from '@basis/shared';
import { Button, StatusChip, cn } from '@basis/ui';
import { ArrowUp, Check, MagnifyingGlass, Plus, Sparkle, X } from '@phosphor-icons/react';
import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useArchiveAssistantThread, useAskAssistant, useAssistantThread, useAssistantThreads, useDecideAssistantAction, usePendingAssistantActions } from '../../data/assistant';
import { useLocale, useT } from '../../i18n';
import { ModuleTitle } from '../products/ProductsIndex';

// BASIS AI: instructions in plain words. The assistant reads the system as
// the person and proposes actions; each waits here for approval and then runs
// the platform's own function as the person. Nothing changes without a click.

const STATE_TONE: Record<AssistantActionState, StatusTone> = { proposed: 'caution', executed: 'positive', rejected: 'neutral', failed: 'critical' };
const STATE_LABEL: Record<AssistantActionState, string> = { proposed: 'Waiting for approval', executed: 'Done', rejected: 'Rejected', failed: 'Failed' };

const EXAMPLES = ['What needs my attention today?', 'Which production runs are late, and why?', 'Which customers have quotes waiting for an answer?', 'Open a task for me to call the mill about the Skin 02 lab dips on Thursday.'];

// ---------------------------------------------------------------- prose

/** The assistant writes short markdown: paragraphs, lists, bold, code and links. Platform links stay in the app. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${match.index}`;
    if (token.startsWith('**')) parts.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith('`')) parts.push(<code key={key} className="code text-[0.8125rem]" dir="ltr">{token.slice(1, -1)}</code>);
    else {
      const [, label = '', href = ''] = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      const className = 'underline decoration-line-strong underline-offset-4 hover:decoration-ink';
      parts.push(href.startsWith('/') ? <Link key={key} to={href} className={className}>{label}</Link> : <a key={key} href={href} target="_blank" rel="noreferrer" className={className}>{label}</a>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 text-[0.9375rem] leading-relaxed text-ink">
      {blocks.map((block, index) => {
        const lines = block.split('\n');
        if (lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line))) {
          const ordered = /^\s*\d+\./.test(lines[0] ?? '');
          const Tag = ordered ? 'ol' : 'ul';
          return (
            <Tag key={index} className={cn('space-y-1 ps-5', ordered ? 'list-decimal' : 'list-disc marker:text-ink-muted')}>
              {lines.map((line, item) => (
                <li key={item} dir="auto">{inline(line.replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={index} dir="auto">
            {lines.map((line, item) => (
              <Fragment key={item}>
                {item > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- an action

function value(input: unknown): string {
  if (input === null || input === undefined) return '—';
  if (typeof input === 'string') return input;
  return JSON.stringify(input);
}

function ActionCard({ action }: { action: AssistantActionView }) {
  const t = useT();
  const decide = useDecideAssistantAction();
  const [error, setError] = useState('');
  const run = (decision: 'approve' | 'reject') => {
    setError('');
    decide.mutate({ actionId: action.id, decision }, { onError: (caught) => setError(caught instanceof Error ? caught.message : t('The request failed.')) });
  };
  const busy = decide.isPending ? decide.variables?.decision : undefined;
  return (
    <div className={cn('rounded-[var(--radius-panel)] border bg-panel', action.state === 'proposed' ? 'border-charcoal' : 'border-line')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="caps text-[0.625rem] text-ink-muted">{t('Proposed action')}</p>
          <p className="mt-1 font-medium text-ink" dir="auto">{action.summary}</p>
        </div>
        <StatusChip tone={STATE_TONE[action.state]}>{t(STATE_LABEL[action.state])}</StatusChip>
      </div>
      <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 px-4 py-3 text-[0.8125rem]" dir="ltr">
        <dt className="text-ink-muted">{action.kind}</dt>
        <dd className="code break-all text-ink">{action.name}</dd>
        {Object.entries(action.input).map(([key, input]) => (
          <Fragment key={key}>
            <dt className="text-ink-muted">{key}</dt>
            <dd className="code break-all text-ink">{value(input)}</dd>
          </Fragment>
        ))}
      </dl>
      {action.state === 'proposed' ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
          <Button variant="primary" size="sm" onClick={() => run('approve')} disabled={decide.isPending} busy={busy === 'approve'}>
            <Check size={14} aria-hidden="true" />
            {t('Approve and run')}
          </Button>
          <Button size="sm" onClick={() => run('reject')} disabled={decide.isPending} busy={busy === 'reject'}>
            <X size={14} aria-hidden="true" />
            {t('Reject')}
          </Button>
          <span className="text-[0.8125rem] text-ink-muted">{t('Runs as you, with your role.')}</span>
        </div>
      ) : (
        <p className="border-t border-line px-4 py-2.5 text-[0.8125rem] text-ink-soft">
          {action.decidedByName && `${action.decidedByName} · `}
          {action.decidedAt && new Date(action.decidedAt).toLocaleString()}
          {action.error && <span className="mt-1 block text-critical">{action.error}</span>}
        </p>
      )}
      {error && <p role="alert" className="border-t border-line px-4 py-2.5 text-[0.8125rem] text-critical">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- the transcript

type Row = { kind: 'items'; role: 'user' | 'assistant'; items: AssistantItem[]; key: string };

function Transcript({ thread }: { thread: AssistantThreadView }) {
  const t = useT();
  const actions = new Map(thread.actions.map((action) => [action.toolUseId, action]));
  const rows: Row[] = thread.messages
    .map((message) => ({ kind: 'items' as const, role: message.role, items: assistantItems(message), key: message.id }))
    .filter((row) => row.items.length > 0);
  return (
    <ol className="space-y-6">
      {rows.map((row) => {
        const reads = row.items.filter((item): item is Extract<AssistantItem, { kind: 'read' }> => item.kind === 'read');
        return (
          <li key={row.key} className="space-y-3">
            {row.items.map((item, index) => {
              if (item.kind === 'text' && item.role === 'user') {
                return (
                  <div key={index} className="border-s-2 border-charcoal ps-4">
                    <p className="caps text-[0.625rem] text-ink-muted">{t('You')}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] text-ink" dir="auto">{item.text}</p>
                  </div>
                );
              }
              if (item.kind === 'text') {
                return (
                  <div key={index}>
                    <p className="caps flex items-center gap-1.5 text-[0.625rem] text-nude-deep">
                      <Sparkle size={11} weight="fill" aria-hidden="true" />
                      BASIS AI
                    </p>
                    <div className="mt-1.5">
                      <Prose text={item.text} />
                    </div>
                  </div>
                );
              }
              if (item.kind === 'note') return <p key={index} dir="auto" className="text-[0.8125rem] text-ink-muted">{item.text}</p>;
              if (item.kind === 'action') {
                const action = actions.get(item.toolUseId);
                return action ? <ActionCard key={index} action={action} /> : null;
              }
              return null;
            })}
            {reads.length > 0 && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-ink-muted">
                <MagnifyingGlass size={12} aria-hidden="true" />
                <span>{t('Read')}</span>
                {reads.map((read, index) => (
                  <code key={index} className="code" dir="ltr">
                    {read.name === 'read' ? read.detail : read.name === 'read_ledger' ? `ledger ${read.detail}` : read.detail || read.name}
                  </code>
                ))}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function progressText(progress: AssistantProgress | null, t: (text: string) => string): string {
  if (!progress || progress.kind === 'thinking') return t('Thinking…');
  if (progress.kind === 'reading') return `${t('Reading')} ${progress.name}…`;
  return `${t('Preparing an action:')} ${progress.name}…`;
}

// ---------------------------------------------------------------- the page

export function BasisAi() {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { threadId } = useParams();
  const threads = useAssistantThreads();
  const thread = useAssistantThread(threadId);
  const pending = usePendingAssistantActions();
  const ask = useAskAssistant();
  const archive = useArchiveAssistantThread();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [asked, setAsked] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const messageCount = thread.data?.messages.length ?? 0;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, ask.isPending]);

  const send = (instruction: string) => {
    const trimmed = instruction.trim();
    if (!trimmed || ask.isPending) return;
    setError('');
    setAsked(trimmed);
    setText('');
    ask.mutate(
      { text: trimmed, locale, ...(threadId ? { threadId } : {}) },
      {
        onSuccess: (result) => {
          setAsked('');
          if (result.threadId !== threadId) navigate(`/ai/${result.threadId}`);
        },
        onError: (caught) => {
          setAsked('');
          setText(trimmed);
          setError(caught instanceof Error ? caught.message : t('The request failed.'));
        },
      },
    );
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(text);
    }
  };

  const waiting = pending.data ?? [];
  const elsewhere = waiting.filter((action) => action.threadId !== threadId);

  return (
    <div className="flex min-h-full flex-col">
      <ModuleTitle number="20" title="BASIS AI">
        {t('Give an instruction in plain words. BASIS AI reads the system with your role and proposes actions; nothing changes until you approve.')}
      </ModuleTitle>

      <div className="grid flex-1 gap-0 border-t border-line lg:grid-cols-[17rem_1fr]">
        <aside className="border-b border-line bg-panel lg:border-b-0 lg:border-e">
          <div className="flex items-center justify-between gap-2 px-5 py-4">
            <p className="caps text-[0.625rem] text-ink-muted">{t('Conversations')}</p>
            <Button size="sm" onClick={() => navigate('/ai')}>
              <Plus size={14} aria-hidden="true" />
              {t('New')}
            </Button>
          </div>
          <nav aria-label={t('Conversations')} className="max-h-48 overflow-y-auto pb-3 lg:max-h-none">
            {(threads.data ?? []).map((item) => (
              <Link
                key={item.id}
                to={`/ai/${item.id}`}
                className={cn('block border-s-2 px-5 py-2 text-[0.875rem] leading-snug', item.id === threadId ? 'border-charcoal bg-surface text-ink' : 'border-transparent text-ink-soft hover:text-ink')}
              >
                <span className="line-clamp-2" dir="auto">{item.title}</span>
                <span className="mt-0.5 block text-[0.75rem] text-ink-muted">{new Date(item.lastActivityAt).toLocaleDateString()}</span>
              </Link>
            ))}
            {threads.data?.length === 0 && <p className="px-5 text-[0.8125rem] text-ink-muted">{t('No conversations yet.')}</p>}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-col">
          {elsewhere.length > 0 && (
            <div className="border-b border-line bg-panel px-5 py-3 lg:px-8">
              <p className="caps text-[0.625rem] text-ink-muted">
                {t('Waiting for your approval')} <span className="code ms-1">{elsewhere.length}</span>
              </p>
              <ul className="mt-2 space-y-1">
                {elsewhere.slice(0, 5).map((action) => (
                  <li key={action.id} className="text-[0.875rem]">
                    <Link to={`/ai/${action.threadId}`} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {action.summary}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 px-5 py-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              {threadId && thread.data === null && <p className="text-ink-muted">{t('This conversation is not available.')}</p>}
              {threadId && thread.data && <Transcript thread={thread.data} />}
              {!threadId && !ask.isPending && (
                <div>
                  <p className="font-display text-[1.75rem] leading-tight text-ink">{t('What should be done?')}</p>
                  <p className="mt-2 max-w-xl text-ink-soft">{t('Ask about anything in the system, or tell it what to change. It shows what it read, and every change waits for your approval.')}</p>
                  <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                    {EXAMPLES.map((example) => (
                      <li key={example}>
                        <button type="button" onClick={() => send(t(example))} className="w-full rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3 text-start text-[0.875rem] text-ink-soft hover:border-charcoal hover:text-ink">
                          {t(example)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {ask.isPending && (
                <div className="mt-6 space-y-3">
                  {asked && (!thread.data || !thread.data.messages.some((message) => message.role === 'user' && JSON.stringify(message.content).includes(JSON.stringify(asked).slice(1, -1)))) && (
                    <div className="border-s-2 border-charcoal ps-4">
                      <p className="caps text-[0.625rem] text-ink-muted">{t('You')}</p>
                      <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] text-ink" dir="auto">{asked}</p>
                    </div>
                  )}
                  <p className="flex items-center gap-2 text-[0.875rem] text-nude-deep" role="status">
                    <Sparkle size={13} weight="fill" aria-hidden="true" className="animate-pulse" />
                    {progressText(ask.progress, t)}
                  </p>
                </div>
              )}
              <div ref={end} />
            </div>
          </div>

          <div className="sticky bottom-0 border-t border-line bg-surface px-5 py-4 lg:px-8">
            <div className="mx-auto max-w-3xl">
              {error && <p role="alert" className="mb-2 text-[0.8125rem] text-critical">{error}</p>}
              <div className="flex items-end gap-2 rounded-[var(--radius-panel)] border border-line-strong bg-panel p-2 focus-within:border-charcoal">
                <label htmlFor="ai-instruction" className="sr-only">{t('Instruction')}</label>
                <textarea
                  id="ai-instruction"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={onKey}
                  rows={2}
                  placeholder={t('Write an instruction… (Enter sends, Shift+Enter for a new line)')}
                  dir="auto"
                  className="max-h-48 min-h-[2.75rem] flex-1 resize-y bg-transparent px-2 py-1.5 text-[0.9375rem] text-ink outline-none placeholder:text-ink-muted"
                />
                <Button variant="primary" onClick={() => send(text)} disabled={!text.trim() || ask.isPending} aria-label={t('Send')}>
                  <ArrowUp size={16} aria-hidden="true" />
                </Button>
              </div>
              {threadId && (
                <div className="mt-2 flex justify-end">
                  <Button variant="quiet" size="sm" onClick={() => archive.mutate(threadId, { onSuccess: () => navigate('/ai') })}>
                    {t('Archive this conversation')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
