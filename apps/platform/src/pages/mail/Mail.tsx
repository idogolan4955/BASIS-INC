import { MAIL_ACTION_LABEL, MAIL_AUDIENCES, MAIL_AUDIENCE_LABEL, MAIL_CATEGORIES, MAIL_CATEGORY_KEYS, ROLES, ROLE_LABELS, entityPath, isMailActionKind, isMailCategory, isRole, type MailAudience, type MailCategory, type MailRuleView, type Role } from '@basis/shared';
import { Button, CheckField, Dialog, Ledger, Panel, PanelEmpty, SelectField, StatusChip, Td, TextField, Th, Tr, sheetTabClass } from '@basis/ui';
import { Paperclip } from '@phosphor-icons/react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { useDecideProposal, useImportMail, useMail, useMailProposals, useMailRules, useSaveMailRule, type MailProposalView, type MailRow } from '../../data/mail';
import { useLocale, useT } from '../../i18n';
import { useRequiredSession } from '../../session';
import { ModuleTitle } from '../products/ProductsIndex';

// Module 19, Mail: the inbox as a ledger, sorted by facts (docs/MAIL_PLAN.md).
// A role sees only the audiences it may read; what is unsorted waits for the owner.

export const ENTITY_LABEL: Record<string, string> = {
  purchase_order: 'Purchase order',
  production_run: 'Production run',
  lot: 'Lot',
  inspection: 'Inspection',
  corrective_action: 'Corrective action',
  shipment: 'Shipment',
  receipt: 'Receipt',
  sales_order: 'Sales order',
  quote: 'Quote',
  development_product: 'Development product',
  inquiry: 'Inquiry',
  supplier: 'Company',
  customer: 'Customer',
};

export function categoryLabel(category: string): string {
  return isMailCategory(category) ? MAIL_CATEGORIES[category].label : category;
}

export function formatMailDate(iso: string, locale: string): string {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  return sameDay
    ? date.toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short' });
}

/** One proposal in words: what would be done, on which record, and why. */
export function ProposalLine({ kind, payload, targetType, targetId, attachments = [] }: { kind: string; payload: Record<string, unknown>; targetType: string | null; targetId: string | null; attachments?: readonly { id: string; filename: string }[] }) {
  const t = useT();
  const value = (key: string) => (typeof payload[key] === 'string' ? (payload[key] as string) : '');
  const target =
    targetType && targetId ? (
      <Link to={entityPath(targetType, targetId)} className="underline decoration-line-strong underline-offset-4 hover:decoration-ink" onClick={(event) => event.stopPropagation()}>
        {targetType === 'supplier' || targetType === 'customer' ? t(ENTITY_LABEL[targetType] ?? targetType) : <span className="code" dir="ltr">{targetId}</span>}
      </Link>
    ) : null;
  const what = (() => {
    switch (kind) {
      case 'create_task':
        return (
          <>
            {t('Task')}: <span className="font-medium" dir="auto">{value('title')}</span>
            {value('dueOn') && <span className="code ms-2 text-ink-muted">{value('dueOn')}</span>}
          </>
        );
      case 'file_attachment':
        return (
          <>
            {t('File')} <span className="code" dir="ltr">{attachments.find((attachment) => attachment.id === value('attachmentId'))?.filename ?? value('title')}</span>
          </>
        );
      case 'create_inquiry':
        return <>{t('Open an inquiry')}: <span className="font-medium" dir="auto">{value('name')}</span></>;
      case 'log_interaction':
        return <>{t('Log on the customer')}</>;
      case 'create_company':
        return (
          <>
            {t('Add the sender as a company')}: <span className="font-medium" dir="auto">{value('legalName')}</span>
          </>
        );
      default:
        return <>{t(isMailActionKind(kind) ? MAIL_ACTION_LABEL[kind] : kind)}</>;
    }
  })();
  return (
    <div>
      <p>
        {what}
        {target && (
          <>
            {' · '}
            {target}
          </>
        )}
      </p>
      {value('reason') && <p className="mt-0.5 text-[0.8125rem] text-ink-muted" dir="auto">{value('reason')}</p>}
    </div>
  );
}

export function MailTabs({ active }: { active: 'inbox' | 'actions' | 'rules' }) {
  const t = useT();
  const session = useRequiredSession();
  return (
    <nav aria-label={t('Mail sections')} className="flex gap-6 border-b border-line bg-panel px-5 lg:px-8">
      <NavLink to="/mail" end className={() => sheetTabClass(active === 'inbox')}>{t('Inbox')}</NavLink>
      <NavLink to="/mail/actions" className={() => sheetTabClass(active === 'actions')}>{t('Suggested actions')}</NavLink>
      {session.role === 'owner' && <NavLink to="/mail/rules" className={() => sheetTabClass(active === 'rules')}>{t('Rules')}</NavLink>}
    </nav>
  );
}

type View = 'decide' | 'new' | 'done' | 'ignored';

const viewOf = (row: MailRow): View | null => {
  if (row.direction === 'outbound') return null;
  if (row.state === 'needs_review' || row.openProposals > 0) return 'decide';
  if (row.state === 'done') return 'done';
  if (row.state === 'ignored') return 'ignored';
  return 'new';
};

function ImportButton() {
  const t = useT();
  const importMail = useImportMail();
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const choose = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError(t('The file is larger than 10 MB.'));
      return;
    }
    const buffer = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let index = 0; index < buffer.length; index += 0x8000) binary += String.fromCharCode(...buffer.subarray(index, index + 0x8000));
    importMail.mutate(
      { filename: file.name, base64: btoa(binary) },
      {
        onSuccess: (result) => navigate(`/mail/${(result as { messageId: string }).messageId}`),
        onError: (failure) => setError(failure.message),
      },
    );
  };
  return (
    <div className="flex flex-col items-end gap-1">
      <input ref={input} type="file" accept=".eml,message/rfc822" className="sr-only" onChange={(event) => void choose(event.target.files?.[0])} aria-label={t('Import a saved message')} />
      <Button onClick={() => input.current?.click()} busy={importMail.isPending} busyLabel={t('Importing')}>{t('Import .eml')}</Button>
      {error && <p role="alert" className="text-[0.8125rem] text-critical">{error}</p>}
    </div>
  );
}

function References({ row }: { row: MailRow }) {
  const records = row.links.filter((link) => link.entityType !== 'supplier' && link.entityType !== 'customer');
  if (records.length === 0) return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {records.slice(0, 3).map((link) => (
        <Link key={`${link.entityType}:${link.entityId}`} to={entityPath(link.entityType, link.entityId)} onClick={(event) => event.stopPropagation()} className="code whitespace-nowrap underline decoration-line-strong underline-offset-4 hover:decoration-ink" dir="ltr">
          {link.entityId}
        </Link>
      ))}
      {records.length > 3 && <span className="code text-ink-muted">+{records.length - 3}</span>}
    </span>
  );
}

export function Inbox() {
  const t = useT();
  const { view: initialView } = useParams();
  const { locale } = useLocale();
  const session = useRequiredSession();
  const mail = useMail();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(initialView === 'new' || initialView === 'done' || initialView === 'ignored' ? initialView : 'decide');
  const [department, setDepartment] = useState<Role | ''>('');
  const [category, setCategory] = useState<MailCategory | ''>('');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => mail.data ?? [], [mail.data]);
  const counts = useMemo(() => {
    const result: Record<View, number> = { decide: 0, new: 0, done: 0, ignored: 0 };
    for (const row of rows) {
      const current = viewOf(row);
      if (current) result[current] += 1;
    }
    return result;
  }, [rows]);
  const needle = search.trim().toLowerCase();
  const shown = rows.filter(
    (row) =>
      viewOf(row) === view &&
      (!department || row.ownerRole === department) &&
      (!category || row.category === category) &&
      (!needle || [row.subject, row.fromAddress, row.fromName, row.companyName, row.snippet, ...row.links.map((link) => link.entityId)].some((value) => value.toLowerCase().includes(needle))),
  );
  const canImport = session.role === 'owner' || session.role === 'operations';
  const views: { key: View; label: string }[] = [
    { key: 'decide', label: t('Needs a decision') },
    { key: 'new', label: t('Sorted') },
    { key: 'done', label: t('Done') },
    { key: 'ignored', label: t('Ignored') },
  ];
  return (
    <>
      <ModuleTitle number="19" title={t('Mail')} actions={canImport ? <ImportButton /> : undefined}>
        {t('The company mailbox, sorted into the records and work it concerns. You see the mail your role may read.')}
      </ModuleTitle>
      <MailTabs active="inbox" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-end gap-4">
          <div role="tablist" aria-label={t('Inbox sections')} className="flex flex-wrap gap-5 border-b border-line">
            {views.map((entry) => (
              <button key={entry.key} type="button" role="tab" aria-selected={view === entry.key} onClick={() => setView(entry.key)} className={sheetTabClass(view === entry.key)}>
                {entry.label}
                <span className="code ms-2 text-ink-muted">{String(counts[entry.key]).padStart(2, '0')}</span>
              </button>
            ))}
          </div>
          <div className="ms-auto flex flex-wrap items-end gap-3">
            <TextField label={t('Search')} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Sender, subject, number')} className="w-56" />
            <SelectField label={t('Department')} value={department} onChange={(event) => setDepartment(event.target.value as Role | '')} className="w-44">
              <option value="">{t('All')}</option>
              {ROLES.filter((role) => role !== 'viewer').map((role) => (
                <option key={role} value={role}>{t(ROLE_LABELS[role])}</option>
              ))}
            </SelectField>
            <SelectField label={t('Category')} value={category} onChange={(event) => setCategory(event.target.value as MailCategory | '')} className="w-48">
              <option value="">{t('All')}</option>
              {MAIL_CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>{t(MAIL_CATEGORIES[key].label)}</option>
              ))}
            </SelectField>
          </div>
        </div>
        <Panel title={views.find((entry) => entry.key === view)!.label} count={shown.length} flush>
          {mail.isPending ? (
            <PanelEmpty>{t('Loading mail')}</PanelEmpty>
          ) : mail.error ? (
            <PanelEmpty>{t('Mail could not be loaded.')} {mail.error.message}</PanelEmpty>
          ) : shown.length === 0 ? (
            <PanelEmpty>{view === 'decide' ? t('Nothing waits for a decision.') : rows.length === 0 ? t('No mail yet. Connect the mailbox in Settings › Connectors › Mail, or import a saved message.') : t('Nothing here.')}</PanelEmpty>
          ) : (
            <Ledger caption={t('Mail')}>
              <thead>
                <tr>
                  <Th>{t('Received')}</Th>
                  <Th>{t('From')}</Th>
                  <Th>{t('Subject')}</Th>
                  <Th>{t('Category')}</Th>
                  <Th>{t('Records')}</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <Tr key={row.id} onClick={() => navigate(`/mail/${row.id}`)} className="cursor-pointer">
                    <Td className="code whitespace-nowrap align-top text-ink-soft">{formatMailDate(row.sentAt, locale)}</Td>
                    <Td className="align-top">
                      <span className="block font-medium">{row.companyName || row.fromName || row.fromAddress}</span>
                      <span className="block truncate text-[0.8125rem] text-ink-muted" dir="ltr">{row.companyName ? row.fromName || row.fromAddress : row.fromName ? row.fromAddress : ''}</span>
                    </Td>
                    <Td className="max-w-[28rem] align-top">
                      <Link to={`/mail/${row.id}`} className="block truncate font-medium hover:underline" dir="auto">
                        {row.subject || t('(no subject)')}
                      </Link>
                      <span className="block truncate text-[0.8125rem] text-ink-muted" dir="auto">
                        {row.attachmentCount > 0 && <Paperclip aria-label={t('{count} attachments', { count: row.attachmentCount })} className="me-1 inline size-3.5 align-[-2px]" />}
                        {(locale === 'he' ? row.summaryHe : row.summary) || row.snippet}
                      </span>
                    </Td>
                    <Td className="align-top">
                      {row.state === 'needs_review' ? <StatusChip tone="caution">{t('Unsorted')}</StatusChip> : <span className="text-ink-soft">{t(categoryLabel(row.category))}</span>}
                      {row.urgency === 'high' && <StatusChip tone="critical" className="ms-2">{t('Urgent')}</StatusChip>}
                      {row.openProposals > 0 && <span className="code ms-2 text-ink-muted">{t('{count} suggested', { count: row.openProposals })}</span>}
                      {row.messageCount > 1 && <span className="code ms-2 text-ink-muted">×{row.messageCount}</span>}
                    </Td>
                    <Td className="align-top">
                      <References row={row} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- suggested actions

function ProposalRow({ proposal }: { proposal: MailProposalView }) {
  const t = useT();
  const { locale } = useLocale();
  const decide = useDecideProposal();
  const [error, setError] = useState<string | null>(null);
  const run = (decision: 'accept' | 'dismiss') => {
    setError(null);
    decide.mutate({ actionId: proposal.id, decision }, { onError: (failure) => setError(failure.message) });
  };
  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-3 text-[0.8125rem] text-ink-muted">
          <span className="font-medium text-ink">{proposal.message.from}</span>
          <Link to={`/mail/${proposal.message.id}`} className="truncate underline decoration-line-strong underline-offset-4 hover:decoration-ink" dir="auto">{proposal.message.subject || t('(no subject)')}</Link>
          <span className="code">{formatMailDate(proposal.message.sentAt, locale)}</span>
          {proposal.message.urgency === 'high' && <StatusChip tone="critical">{t('Urgent')}</StatusChip>}
        </p>
        {(proposal.message.summary || proposal.message.summaryHe) && <p className="mt-1 text-[0.8125rem] text-ink-soft" dir="auto">{locale === 'he' && proposal.message.summaryHe ? proposal.message.summaryHe : proposal.message.summary}</p>}
        <div className="mt-2 text-sm">
          <ProposalLine kind={proposal.kind} payload={proposal.payload} targetType={proposal.targetType} targetId={proposal.targetId} />
        </div>
        {error && <p role="alert" className="mt-1 text-[0.8125rem] font-medium text-critical">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="primary" busy={decide.isPending && decide.variables?.decision === 'accept'} busyLabel={t('Saving')} onClick={() => run('accept')}>{t('Approve')}</Button>
        <Link to={`/mail/${proposal.message.id}`} className="inline-flex h-8 items-center border border-line-strong px-3 text-[0.8125rem] hover:border-charcoal">{t('Edit')}</Link>
        <Button size="sm" variant="quiet" busy={decide.isPending && decide.variables?.decision === 'dismiss'} busyLabel={t('Saving')} onClick={() => run('dismiss')}>{t('Reject')}</Button>
      </div>
    </li>
  );
}

/** Every open proposal the role may read, by department, oldest first: the morning's mail cleared in one place. */
export function MailActions() {
  const t = useT();
  const { filter } = useParams();
  const proposals = useMailProposals();
  const department = filter && isRole(filter) ? filter : '';
  const rows = (proposals.data ?? []).filter((proposal) => !department || (proposal.message.ownerRole ?? 'owner') === department);
  const groups = new Map<string, MailProposalView[]>();
  for (const proposal of rows) {
    const key = proposal.message.ownerRole ?? 'owner';
    groups.set(key, [...(groups.get(key) ?? []), proposal]);
  }
  return (
    <>
      <ModuleTitle number="19" title={t('Mail')}>{t('What Claude suggests doing with the mail. Approve does it as you, Reject drops it, Edit opens the message.')}</ModuleTitle>
      <MailTabs active="actions" />
      <div className="flex flex-col gap-4 px-5 py-6 lg:px-8">
        {department && (
          <p className="text-sm text-ink-soft">
            {t('Showing {department} only.', { department: t(ROLE_LABELS[department]) })} <Link to="/mail/actions" className="underline underline-offset-4">{t('Show all')}</Link>
          </p>
        )}
        {proposals.isPending ? (
          <p className="text-ink-muted">{t('Loading suggestions')}</p>
        ) : proposals.error ? (
          <p className="text-critical">{t('Suggestions could not be loaded.')} {proposals.error.message}</p>
        ) : rows.length === 0 ? (
          <Panel title={t('Suggested actions')} count={0}>
            <p className="text-ink-muted">{t('Nothing waits for a decision. New mail is read every five minutes.')}</p>
          </Panel>
        ) : (
          [...groups.entries()].map(([role, list]) => (
            <Panel key={role} title={t(isRole(role) ? ROLE_LABELS[role] : role)} count={list.length} flush>
              <ul className="divide-y divide-line">
                {list.map((proposal) => (
                  <ProposalRow key={proposal.id} proposal={proposal} />
                ))}
              </ul>
            </Panel>
          ))
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- rules

function RuleDialog({ rule, open, onClose }: { rule: MailRuleView | null; open: boolean; onClose: () => void }) {
  const t = useT();
  const save = useSaveMailRule();
  const [form, setForm] = useState({
    fromAddress: rule?.match.fromAddress ?? '',
    fromDomain: rule?.match.fromDomain ?? '',
    subjectContains: rule?.match.subjectContains ?? '',
    listId: rule?.match.listId ?? '',
    category: (rule?.category ?? '') as MailCategory | '',
    audience: (rule?.audience ?? '') as MailAudience | '',
    ownerRole: (rule?.ownerRole ?? '') as Role | '',
    skipModel: rule?.skipModel ?? false,
    ignore: rule?.ignore ?? false,
    sort: String(rule?.sort ?? 100),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    save.mutate(
      {
        ...(rule ? { id: rule.id } : {}),
        match: { fromAddress: form.fromAddress.trim() || undefined, fromDomain: form.fromDomain.trim() || undefined, subjectContains: form.subjectContains.trim() || undefined, listId: form.listId.trim() || undefined },
        category: form.category || null,
        audience: form.audience || null,
        ownerRole: form.ownerRole || null,
        skipModel: form.skipModel,
        ignore: form.ignore,
        sort: Number(form.sort) || 100,
      },
      { onSuccess: onClose, onError: (failure) => setError(failure.message) },
    );
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={rule ? t('Edit rule') : t('New rule')}
      description={t('Rules are checked in order, before anything else sorts a message. A rule can only keep mail closer; the sender’s company still decides the least it stays with.')}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" form="mail-rule" busy={save.isPending} busyLabel={t('Saving')}>{t('Save rule')}</Button>
        </>
      }
    >
      <form id="mail-rule" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <TextField label={t('From address')} value={form.fromAddress} onChange={set('fromAddress')} dir="ltr" />
        <TextField label={t('From domain')} value={form.fromDomain} onChange={set('fromDomain')} placeholder="bank.co.il" dir="ltr" />
        <TextField label={t('Subject contains')} value={form.subjectContains} onChange={set('subjectContains')} />
        <TextField label={t('Mailing list')} value={form.listId} onChange={set('listId')} dir="ltr" />
        <SelectField label={t('Category')} value={form.category} onChange={set('category')}>
          <option value="">{t('Leave as sorted')}</option>
          {MAIL_CATEGORY_KEYS.map((key) => (
            <option key={key} value={key}>{t(MAIL_CATEGORIES[key].label)}</option>
          ))}
        </SelectField>
        <SelectField label={t('Who may read it')} value={form.audience} onChange={set('audience')}>
          <option value="">{t('As the category says')}</option>
          {MAIL_AUDIENCES.map((audience) => (
            <option key={audience} value={audience}>{t(MAIL_AUDIENCE_LABEL[audience])}</option>
          ))}
        </SelectField>
        <SelectField label={t('Department')} value={form.ownerRole} onChange={set('ownerRole')}>
          <option value="">{t('As the category says')}</option>
          {ROLES.filter((role) => role !== 'viewer').map((role) => (
            <option key={role} value={role}>{t(ROLE_LABELS[role])}</option>
          ))}
        </SelectField>
        <TextField label={t('Order')} type="number" min={0} max={10000} value={form.sort} onChange={set('sort')} dir="ltr" />
        <CheckField label={t('Never send to the classifier')} help={t('For bank, tax and legal mail that must not leave Google.')} checked={form.skipModel} onChange={(event) => setForm((current) => ({ ...current, skipModel: event.target.checked }))} />
        <CheckField label={t('Ignore')} help={t('Matching mail goes straight to Ignored.')} checked={form.ignore} onChange={(event) => setForm((current) => ({ ...current, ignore: event.target.checked }))} />
        {error && <p role="alert" className="text-[0.8125rem] font-medium text-critical sm:col-span-2">{error}</p>}
      </form>
    </Dialog>
  );
}

const conditionOf = (rule: MailRuleView, t: (text: string) => string) =>
  [
    rule.match.fromAddress && `${t('from')} ${rule.match.fromAddress}`,
    rule.match.fromDomain && `${t('from')} @${rule.match.fromDomain.replace(/^@/, '')}`,
    rule.match.subjectContains && `${t('subject has')} “${rule.match.subjectContains}”`,
    rule.match.listId && `${t('list')} ${rule.match.listId}`,
  ]
    .filter(Boolean)
    .join(' · ');

export function MailRules() {
  const t = useT();
  const session = useRequiredSession();
  const rules = useMailRules(session.role === 'owner');
  const save = useSaveMailRule();
  const [editing, setEditing] = useState<MailRuleView | null | 'new'>(null);
  if (session.role !== 'owner') {
    return (
      <>
        <ModuleTitle number="19" title={t('Mail')} />
        <MailTabs active="rules" />
        <p className="px-5 py-6 text-ink-muted lg:px-8">{t('Only the owner keeps the sorting rules.')}</p>
      </>
    );
  }
  return (
    <>
      <ModuleTitle number="19" title={t('Mail')} actions={<Button variant="primary" onClick={() => setEditing('new')}>{t('New rule')}</Button>}>
        {t('Your own sorting rules, checked before anything else.')}
      </ModuleTitle>
      <MailTabs active="rules" />
      <div className="px-5 py-6 lg:px-8">
        <Panel title={t('Rules')} count={rules.data?.length ?? 0} flush>
          {rules.isPending ? (
            <PanelEmpty>{t('Loading rules')}</PanelEmpty>
          ) : (rules.data ?? []).length === 0 ? (
            <PanelEmpty>{t('No rules yet. Mail is sorted by its sender, the records it names and its thread.')}</PanelEmpty>
          ) : (
            <Ledger caption={t('Rules')}>
              <thead>
                <tr>
                  <Th numeric>{t('Order')}</Th>
                  <Th>{t('When')}</Th>
                  <Th>{t('Then')}</Th>
                  <Th>{t('Actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {(rules.data ?? []).map((rule) => (
                  <Tr key={rule.id}>
                    <Td numeric className="code">{rule.sort}</Td>
                    <Td dir="auto">{conditionOf(rule, t)}</Td>
                    <Td className="text-ink-soft">
                      {[
                        rule.category && t(categoryLabel(rule.category)),
                        rule.audience && `${t('read by')} ${t(MAIL_AUDIENCE_LABEL[rule.audience])}`,
                        rule.ownerRole && t(ROLE_LABELS[rule.ownerRole]),
                        rule.skipModel && t('never to the classifier'),
                        rule.ignore && t('ignored'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Td>
                    <Td>
                      <span className="flex gap-3">
                        <Button size="sm" variant="quiet" onClick={() => setEditing(rule)}>{t('Edit')}</Button>
                        <Button size="sm" variant="quiet" onClick={() => save.mutate({ id: rule.id, match: rule.match, archive: true })}>{t('Remove')}</Button>
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Ledger>
          )}
        </Panel>
      </div>
      {editing && <RuleDialog key={editing === 'new' ? 'new' : editing.id} rule={editing === 'new' ? null : editing} open onClose={() => setEditing(null)} />}
    </>
  );
}

export const mailStateTone = (state: string) => (state === 'needs_review' ? 'caution' : state === 'done' ? 'positive' : state === 'ignored' ? 'neutral' : 'transit');
export const mailStateLabel = (state: string) => (state === 'needs_review' ? 'Unsorted' : state === 'done' ? 'Done' : state === 'ignored' ? 'Ignored' : state === 'sorted' ? 'Sorted' : 'Received');
